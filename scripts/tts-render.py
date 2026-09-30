"""Render m4a files for one voice. argv: voice JSON {engine, model} (openai: model is the voice), language. stdin: JSON lines {"text", "cut"?, "out"}; `cut` seconds come off the end after trimming. Each file is trimmed, loudness-matched, padded, then encoded by afconvert (macOS)."""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

voice = json.loads(sys.argv[1])
language = sys.argv[2]

TARGET_RMS = 0.08  # about -22 dBFS over the voiced part, so voices and engines play at the same loudness
PEAK = 0.95
PAD_SECONDS = 0.15
SILENCE = 0.01

if voice["engine"] == "abair":
    # ABAIR (Trinity College Dublin) serves this free endpoint for its web reader. Be a polite guest:
    # one request at a time (build-audio.ts runs abair voices sequentially) with a pause after each, and an honest
    # User-Agent (Cloudflare rejects Python's default one with error 1010).
    import base64
    import io
    import time
    import urllib.error
    import urllib.parse
    import urllib.request

    def synth(text: str) -> tuple[np.ndarray, int]:
        query = urllib.parse.urlencode({"input": text, "voice": voice["model"], "normalise": "true"})
        req = urllib.request.Request(f"https://synthesis.abair.ie/api/synthesise?{query}", headers={"Accept": "application/json", "User-Agent": "Ditto/1.0 (dictation trainer; +https://github.com/topherhunt/ditto)"})
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                wav_bytes = base64.b64decode(json.load(res)["audioContent"])
        except urllib.error.HTTPError as e:
            sys.exit(f"ABAIR {e.code} for {text!r}: {e.read().decode()}")
        finally:
            time.sleep(1)
        with wave.open(io.BytesIO(wav_bytes)) as w:
            if w.getnchannels() != 1 or w.getsampwidth() != 2:
                sys.exit(f"expected 16-bit mono from ABAIR, got {w.getnchannels()} channels, {w.getsampwidth()} bytes")
            return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768, w.getframerate()
elif voice["engine"] == "openai":
    # gpt-4o-mini-tts. Naming the language stops it guessing one from a bare word; it has no reliable pace control
    # (docs/plan.md, Audio). It occasionally returns silence or stalls past the timeout, and parallel workers can hit
    # the rate limit, so all three retry.
    import os
    import time
    import urllib.error
    import urllib.request

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise SystemExit("OPENAI_API_KEY is not set (put it in .env)")
    name = {"it": "Italian", "en": "American English", "es": "Latin American Spanish", "nl": "Dutch", "fr": "French", "ga": "Irish Gaelic"}[language]

    def synth(text: str) -> tuple[np.ndarray, int]:
        kind = "word" if len(text.split()) == 1 else "sentence" if text.rstrip()[-1] in ".!?" else "phrase"
        instructions = f"Say this {name} {kind} in {name} with a native {name} accent, at a normal conversational pace, the way a native speaker says it to a friend"
        body = {"model": "gpt-4o-mini-tts", "input": text, "voice": voice["model"], "response_format": "pcm", "instructions": instructions}
        req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=json.dumps(body).encode(),
                                     headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=60) as res:
                    samples = np.frombuffer(res.read(), dtype="<i2").astype(np.float32) / 32768  # pcm is 24 kHz 16-bit mono
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503) and attempt < 4:
                    time.sleep(2 ** attempt)
                    continue
                sys.exit(f"OpenAI {e.code} for {text!r}: {e.read().decode()}")
            except (TimeoutError, urllib.error.URLError) as e:
                if attempt < 4:
                    continue
                sys.exit(f"OpenAI unreachable for {text!r}: {e}")
            if samples.size and np.max(np.abs(samples)) > SILENCE:
                return samples, 24000
        sys.exit(f"OpenAI rendered silence 5 times for {text!r}")
else:
    raise SystemExit(f"unknown engine {voice['engine']}")


def finish(samples: np.ndarray, rate: int, cut: float) -> np.ndarray:
    voiced = np.flatnonzero(np.abs(samples) > SILENCE)
    if voiced.size == 0:
        raise SystemExit("rendered silence")
    samples = samples[voiced[0] : voiced[-1] + 1]
    if cut:
        samples = samples[: len(samples) - int(rate * cut)].copy()
        fade = min(len(samples), int(rate * 0.03))
        samples[len(samples) - fade :] *= np.linspace(1, 0, fade, dtype=np.float32)
    rms = np.sqrt(np.mean(samples[np.abs(samples) > SILENCE] ** 2))
    samples = samples * min(TARGET_RMS / rms, PEAK / np.max(np.abs(samples)))
    pad = np.zeros(int(rate * PAD_SECONDS), dtype=np.float32)
    return np.concatenate([pad, samples, pad])


with tempfile.TemporaryDirectory() as tmp:
    wav_path = Path(tmp) / "out.wav"
    for line in sys.stdin:
        job = json.loads(line)
        samples, rate = synth(job["text"])
        pcm = (finish(np.asarray(samples, dtype=np.float32), rate, job.get("cut") or 0) * 32767).astype(np.int16)
        with wave.open(str(wav_path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(rate)
            wav.writeframes(pcm.tobytes())
        out = Path(job["out"])
        out.parent.mkdir(parents=True, exist_ok=True)
        # Encode beside the target and rename, so an interrupted run never leaves a truncated file that counts as rendered.
        part = out.with_name(out.name + ".part")
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", str(wav_path), str(part)], check=True)
        part.replace(out)
        print(job["out"], flush=True)
