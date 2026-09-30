"""Speech for conversation mode (server/speech.ts), one long-lived process.

Usage: speech-worker.py. stdin: JSON lines {id, op, ...}; stdout: one line {id, ...} or {id, error} each.
- say {text, language, voice, pace, out}: renders the text to a 16-bit WAV at `out` -> {seconds}. `pace` asks for a slower voice: 1 is as is, 1.3 is 30% slower.
- `language` names the language for gpt-4o-mini-tts, which otherwise guesses it from the text and can read a short one with the wrong accent.
`voice` is {engine, model}: engine "openai" is a gpt-4o-mini-tts voice rendered by OpenAI (OPENAI_API_KEY), which ignores `speed`, so it is asked for the pace.
"""
import json
import os
import sys
import urllib.error
import urllib.request
import wave

import numpy as np

LANGUAGE_NAMES = {"it": "Italian", "en": "English", "nl": "Dutch", "es": "Latin American Spanish"}


def openai(text, voice, pace, language):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    name = LANGUAGE_NAMES[language]
    speed = "slowly and very clearly, for a beginner" if pace >= 1.2 else "a little slowly and clearly, for a learner" if pace > 1 else "at a natural pace"
    body = {"model": "gpt-4o-mini-tts", "input": text, "voice": voice["model"], "response_format": "pcm",
            "instructions": f"Read this {name} text aloud in {name} with a native {name} accent, {speed}."}
    req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            pcm = res.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"OpenAI {e.code}: {e.read().decode()}") from None
    return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768, 24000  # pcm is 24 kHz 16-bit mono


def synth(text, language, voice, pace, out):
    if voice["engine"] != "openai":
        raise ValueError(f"unknown engine {voice['engine']}")
    audio, rate = openai(text, voice, pace, language)
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
    return len(audio) / rate


def handle(req):
    if req["op"] == "say":
        return {"seconds": synth(req["text"], req["language"], req["voice"], req["pace"], req["out"])}
    raise ValueError(f"unknown op {req['op']}")


print(json.dumps({"ready": True}), flush=True)
for line in sys.stdin:
    req = json.loads(line)
    try:
        res = {"id": req["id"], **handle(req)}
    except Exception as e:  # reported to the caller, which fails that request loudly
        res = {"id": req["id"], "error": f"{type(e).__name__}: {e}"}
    print(json.dumps(res, ensure_ascii=False), flush=True)
