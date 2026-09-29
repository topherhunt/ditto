"""Speech for conversation mode (server/speech.ts), one long-lived process.

Usage: speech-worker.py <tools_dir>. stdin: JSON lines {id, op, ...}; stdout: one line {id, ...} or {id, error} each.
- say {text, language, voice, pace, out}: renders the text to a 16-bit WAV at `out` -> {seconds}. `pace` stretches the voice's own speed: 1 is as is, 1.3 is 30% slower.
- `language` names the language for gpt-4o-mini-tts, which otherwise guesses it from the text and can read a short one with the wrong accent.
`voice` is {engine, model, speaker?}: "piper" renders here with a file in <tools>/piper-voices; "kokoro" is a Kokoro voice rendered by OpenRouter
(OPENROUTER_API_KEY); "openai" is a gpt-4o-mini-tts voice rendered by OpenAI (OPENAI_API_KEY), which ignores `speed`, so it is asked for the pace.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
import wave

import numpy as np

tools = sys.argv[1]
piper_voices = {}
KOKORO_MODEL = "hexgrad/kokoro-82m"  # the same as KOKORO_MODEL in server/speech.ts, which records its cost
LANGUAGE_NAMES = {"it": "Italian", "en": "English", "nl": "Dutch"}


def piper(text, voice, pace):
    from piper import PiperVoice, SynthesisConfig

    if voice["model"] not in piper_voices:  # kept, 60-120 MB each; the server asks for one voice per language (PARTNER_VOICES)
        piper_voices[voice["model"]] = PiperVoice.load(f"{tools}/piper-voices/{voice['model']}.onnx")
    chunks = list(piper_voices[voice["model"]].synthesize(text, SynthesisConfig(speaker_id=voice.get("speaker"), length_scale=pace)))
    return np.concatenate([c.audio_float_array for c in chunks]), chunks[0].sample_rate


def kokoro(text, voice, pace):
    body = {"model": KOKORO_MODEL, "input": text, "voice": voice["model"], "response_format": "pcm", "speed": 1 / pace}
    req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            kind, pcm = res.headers["Content-Type"], res.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"OpenRouter {e.code}: {e.read().decode()}") from None
    rate = re.search(r"rate=(\d+)", kind)
    if not kind.startswith("audio/pcm") or not rate or "channels=1" not in kind:
        raise RuntimeError(f"expected mono PCM from OpenRouter, got {kind}")
    return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768, int(rate.group(1))


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
    if voice["engine"] == "openai":
        audio, rate = openai(text, voice, pace, language)
    else:
        audio, rate = {"piper": piper, "kokoro": kokoro}[voice["engine"]](text, voice, pace)
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
