"""Render m4a files for one voice. argv: tools dir, voice JSON {engine, model, speaker?}, language.
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
