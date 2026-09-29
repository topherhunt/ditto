"""Local speech for conversation mode (server/speech.ts), one long-lived process.

Usage: speech-worker.py <tools_dir>. stdin: JSON lines {id, op, ...}; stdout: one line {id, ...} or {id, error} each.
- say {text, voice, out}: renders the text with a Piper voice to a 16-bit WAV at `out` -> {seconds}.
`voice` is {model, speaker?}, a file in <tools>/piper-voices.
"""
import json
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

tools = sys.argv[1]
voices = {}


def synth(text, voice, out):
    if voice["model"] not in voices:
        voices.clear()  # one voice at a time: each holds 60-120 MB and reloads in ~0.5 s, and a conversation speaks in one
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
