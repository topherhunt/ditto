"""Render WAVs with Piper. stdin: JSON lines {"voice", "text", "wav"}. Each voice model loads once."""
import json
import sys
import wave
from pathlib import Path

from piper import PiperVoice

voices_dir = Path(sys.argv[1])
voices: dict[str, PiperVoice] = {}

for line in sys.stdin:
    job = json.loads(line)
    voice = voices.get(job["voice"])
    if voice is None:
        voice = voices[job["voice"]] = PiperVoice.load(voices_dir / f"{job['voice']}.onnx")
    with wave.open(job["wav"], "wb") as wav:
        voice.synthesize_wav(job["text"], wav)
    print(job["wav"], flush=True)
