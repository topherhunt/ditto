"""Render m4a files for one voice. argv: tools dir, voice JSON {engine, model, speaker?}, language.
The elevenlabs engine calls the paid API with ELEVENLABS_API_KEY from the environment.
stdin: JSON lines {"text", "out"}. Each file is trimmed, loudness-matched, padded, then encoded by afconvert (macOS)."""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

tools = Path(sys.argv[1])
voice = json.loads(sys.argv[2])
language = sys.argv[3]

TARGET_RMS = 0.08  # about -22 dBFS over the voiced part, so voices and engines play at the same loudness
PEAK = 0.95
PAD_SECONDS = 0.15
SILENCE = 0.01

if voice["engine"] == "piper":
    from piper import PiperVoice, SynthesisConfig

    model = PiperVoice.load(tools / "piper-voices" / f"{voice['model']}.onnx")
    config = SynthesisConfig(speaker_id=voice.get("speaker"))

    def synth(text: str) -> tuple[np.ndarray, int]:
        chunks = list(model.synthesize(text, config))
        return np.concatenate([c.audio_float_array for c in chunks]), chunks[0].sample_rate
elif voice["engine"] == "kokoro":
    from kokoro_onnx import Kokoro

    model = Kokoro(str(tools / "kokoro" / "kokoro-v1.0.onnx"), str(tools / "kokoro" / "voices-v1.0.bin"))

    def synth(text: str) -> tuple[np.ndarray, int]:
        return model.create(text, voice=voice["model"], lang=language)
elif voice["engine"] == "elevenlabs":
    import os
    import urllib.error
    import urllib.request

    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY is not set (put it in .env)")

    def synth(text: str) -> tuple[np.ndarray, int]:
        # MP3 because PCM output needs a Pro plan; afconvert decodes it.
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice['model']}?output_format=mp3_44100_128",
            data=json.dumps({"text": text, "model_id": "eleven_v3", "language_code": language, "seed": 1}).encode(),
            headers={"xi-api-key": key, "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req) as res:
                mp3 = res.read()
        except urllib.error.HTTPError as e:
            sys.exit(f"ElevenLabs {e.code} for {text!r}: {e.read().decode()}")
        with tempfile.TemporaryDirectory() as tmp:
            src, dst = Path(tmp) / "in.mp3", Path(tmp) / "in.wav"
            src.write_bytes(mp3)
            subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16", str(src), str(dst)], check=True)
            with wave.open(str(dst)) as w:
                if w.getnchannels() != 1:
                    sys.exit(f"expected mono from ElevenLabs, got {w.getnchannels()} channels")
                return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768, w.getframerate()
else:
    raise SystemExit(f"unknown engine {voice['engine']}")


def finish(samples: np.ndarray, rate: int) -> np.ndarray:
    voiced = np.flatnonzero(np.abs(samples) > SILENCE)
    if voiced.size == 0:
        raise SystemExit("rendered silence")
    samples = samples[voiced[0] : voiced[-1] + 1]
    rms = np.sqrt(np.mean(samples[np.abs(samples) > SILENCE] ** 2))
    samples = samples * min(TARGET_RMS / rms, PEAK / np.max(np.abs(samples)))
    pad = np.zeros(int(rate * PAD_SECONDS), dtype=np.float32)
    return np.concatenate([pad, samples, pad])


with tempfile.TemporaryDirectory() as tmp:
    wav_path = Path(tmp) / "out.wav"
    for line in sys.stdin:
        job = json.loads(line)
        samples, rate = synth(job["text"])
        pcm = (finish(np.asarray(samples, dtype=np.float32), rate) * 32767).astype(np.int16)
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
