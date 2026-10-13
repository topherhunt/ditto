"""Render m4a files for one voice. argv: voice JSON {engine, model, voice}. stdin: JSON lines {"text", "cut"?, "out"}; `text` is sent to the engine verbatim (scripts/audio-jobs.ts adds any language tag), and `cut` seconds come off the end after trimming. Each file is trimmed, loudness-matched, padded, then encoded by afconvert (macOS)."""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

voice = json.loads(sys.argv[1])

TARGET_RMS = 0.08  # about -22 dBFS over the voiced part, so voices and engines play at the same loudness
PEAK = 0.95
PAD_SECONDS = 0.15
SILENCE = 0.01


class Silent(Exception):
    """One text the engine won't voice: skipped, so it stays missing and build-audio lists it, rather than ending the run."""

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
        query = urllib.parse.urlencode({"input": text, "voice": voice["voice"], "normalise": "true"})
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
elif voice["engine"] == "elevenlabs":
    # Eleven v4 Turbo on OpenRouter, the same request as server/speech.ts. Parallel workers can hit the rate limit and a
    # request can stall or return silence, so all three retry.
    import os
    import time
    import urllib.error
    import urllib.request

    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise SystemExit("OPENROUTER_API_KEY is not set (put it in .env)")
    PCM_TYPE = "audio/pcm;rate=24000;channels=1"

    def synth(text: str) -> tuple[np.ndarray, int]:
        body = {"model": voice["model"], "input": text, "voice": voice["voice"],
                "response_format": "pcm", "provider": {"zdr": True}}
        req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", data=json.dumps(body).encode(),
                                     headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=60) as res:
                    if res.headers["Content-Type"] != PCM_TYPE:
                        sys.exit(f"OpenRouter returned {res.headers['Content-Type']}, not {PCM_TYPE}, for {text!r}")
                    samples = np.frombuffer(res.read(), dtype="<i2").astype(np.float32) / 32768
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503) and attempt < 4:
                    time.sleep(2 ** attempt)
                    continue
                sys.exit(f"OpenRouter {e.code} for {text!r}: {e.read().decode()}")
            except (TimeoutError, urllib.error.URLError) as e:
                if attempt < 4:
                    continue
                sys.exit(f"OpenRouter unreachable for {text!r}: {e}")
            if samples.size and np.max(np.abs(samples)) > SILENCE:
                return samples, 24000
        raise Silent(f"OpenRouter rendered silence 5 times for {text!r}")
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
        try:
            samples, rate = synth(job["text"])
        except Silent as e:
            print(f"SKIPPED: {e}", file=sys.stderr, flush=True)
            continue
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
