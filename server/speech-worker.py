"""Speech for conversation mode (server/speech.ts), one long-lived process.

Usage: speech-worker.py <tools_dir>. stdin: JSON lines {id, op, ...}; stdout: one line {id, ...} or {id, error} each.
- say {text, voice, pace, out}: renders the text to a 16-bit WAV at `out` -> {seconds}. `pace` stretches the voice's own speed: 1 is as is, 1.3 is 30% slower.
`voice` is {engine, model, speaker?}: "piper" renders here with a file in <tools>/piper-voices; "kokoro" is a Kokoro voice rendered by OpenRouter (OPENROUTER_API_KEY).
Kokoro says questions like statements, so a Kokoro line ending in "?" gets its last RISE_SECONDS bent up RISE_SEMITONES (Praat PSOLA).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
import wave

import numpy as np
import parselmouth
from parselmouth.praat import call

tools = sys.argv[1]
piper_voices = {}
KOKORO_MODEL = "hexgrad/kokoro-82m"  # the same as KOKORO_MODEL in server/speech.ts, which records its cost
RISE_SEMITONES, RISE_SECONDS = 4, 0.4


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
    audio, rate = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768, int(rate.group(1))
    return (rise(audio, rate) if re.search(r"\?\W*$", text) else audio), rate


def rise(audio, rate):
    """Replaces the pitch over the last RISE_SECONDS of voicing with a glide up from where it was, steepening toward the end."""
    sound = parselmouth.Sound(audio.astype(np.float64), sampling_frequency=rate)
    manip = call(sound, "To Manipulation", 0.01, 75, 500)
    tier = call(manip, "Extract pitch tier")
    points = [(call(tier, "Get time from index", i), call(tier, "Get value at index", i)) for i in range(1, call(tier, "Get number of points") + 1)]
    if not points:  # nothing voiced, nothing to bend
        return audio
    end = points[-1][0]
    start = max(end - RISE_SECONDS, points[0][0])
    base = call(tier, "Get value at time", start)
    new = call("Create PitchTier", "rise", sound.xmin, sound.xmax)
    for t, f in points:
        if t < start:
            call(new, "Add point", t, f)
    for t in np.arange(start, end + 0.005, 0.01):
        call(new, "Add point", t, base * 2 ** (RISE_SEMITONES / 12 * ((t - start) / (end - start or 1)) ** 1.5))
    call([new, manip], "Replace pitch tier")
    return call(manip, "Get resynthesis (overlap-add)").values[0].astype(np.float32)


def synth(text, voice, pace, out):
    engines = {"piper": piper, "kokoro": kokoro}
    audio, rate = engines[voice["engine"]](text, voice, pace)
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
    return len(audio) / rate


def handle(req):
    if req["op"] == "say":
        return {"seconds": synth(req["text"], req["voice"], req["pace"], req["out"])}
    raise ValueError(f"unknown op {req['op']}")


print(json.dumps({"ready": True}), flush=True)
for line in sys.stdin:
    req = json.loads(line)
    try:
        res = {"id": req["id"], **handle(req)}
    except Exception as e:  # reported to the caller, which fails that request loudly
        res = {"id": req["id"], "error": f"{type(e).__name__}: {e}"}
    print(json.dumps(res, ensure_ascii=False), flush=True)
