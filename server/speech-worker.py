"""Local speech for conversation mode (server/speech.ts), one long-lived process.

Usage: speech-worker.py <tools_dir>. stdin: JSON lines {id, op, ...}; stdout: one line {id, ...} or {id, error} each.
- duration {file}: the length of any audio ffmpeg reads, by decoding it (MediaRecorder's webm has no duration header) -> {seconds}.
- say {text, voice, out}: renders the text with a Piper voice to a 16-bit WAV at `out` -> {seconds}.
`voice` is {model, speaker?}, a file in <tools>/piper-voices.
"""
import json
import subprocess
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

tools = sys.argv[1]
voices = {}


def duration(path):
    res = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ar", "8000", "-ac", "1", "-f", "s16le", "-"], capture_output=True)
    if res.returncode:
        raise RuntimeError(f"ffmpeg could not read {path}: {res.stderr.decode().strip()}")
    return len(res.stdout) / 2 / 8000


def synth(text, voice, out):
    if voice["model"] not in voices:
        voices[voice["model"]] = PiperVoice.load(f"{tools}/piper-voices/{voice['model']}.onnx")
    chunks = list(voices[voice["model"]].synthesize(text, SynthesisConfig(speaker_id=voice.get("speaker"))))
    audio = np.concatenate([c.audio_float_array for c in chunks])
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(chunks[0].sample_rate)
        w.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
    return len(audio) / chunks[0].sample_rate


def handle(req):
    if req["op"] == "duration":
        return {"seconds": duration(req["file"])}
    if req["op"] == "say":
        return {"seconds": synth(req["text"], req["voice"], req["out"])}
    raise ValueError(f"unknown op {req['op']}")


print(json.dumps({"ready": True}), flush=True)
for line in sys.stdin:
    req = json.loads(line)
    try:
        res = {"id": req["id"], **handle(req)}
    except Exception as e:  # reported to the caller, which fails that request loudly
        res = {"id": req["id"], "error": f"{type(e).__name__}: {e}"}
    print(json.dumps(res, ensure_ascii=False), flush=True)
