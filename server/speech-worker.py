"""Local speech for conversation mode (server/speech.ts), one long-lived process.

Usage: speech-worker.py <tools_dir>. stdin: JSON lines {id, op, ...}; stdout: one line {id, ...} or {id, error} each.
- listen {file}: what facebook/wav2vec2-xlsr-53-espeak-cv-ft (a language-independent phoneme recognizer) hears in
  any audio ffmpeg reads -> {heard, seconds}.
- reference {text, lang, voice}: espeak's IPA for the text (via Kokoro's phonemizer) and what the recognizer hears
  when a Piper voice says it -> {want, native}. `native` shares the recognizer's blind spots, so it is the fairer yardstick.
- say {text, voice, out}: renders the text with a Piper voice to a 16-bit WAV at `out` -> {seconds}.
`voice` is {model, speaker?}, a file in <tools>/piper-voices.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np
import torch
from kokoro_onnx import Kokoro
from piper import PiperVoice, SynthesisConfig
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
ESPEAK = {"it": "it", "en": "en-us", "nl": "nl"}

tools = sys.argv[1]
# Constructing Kokoro points phonemizer at its bundled espeak-ng; the recognizer's tokenizer fails
# with "espeak not installed" if it loads first.
phonemize = Kokoro(f"{tools}/kokoro/kokoro-v1.0.onnx", f"{tools}/kokoro/voices-v1.0.bin").tokenizer.phonemize
device = "mps" if torch.backends.mps.is_available() else "cpu"
processor = Wav2Vec2Processor.from_pretrained(MODEL)
model = Wav2Vec2ForCTC.from_pretrained(MODEL).to(device).eval()
voices = {}


def load16k(path):
    res = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"], capture_output=True)
    if res.returncode:
        raise RuntimeError(f"ffmpeg could not read {path}: {res.stderr.decode().strip()}")
    return np.frombuffer(res.stdout, dtype=np.float32)


def hear(audio):
    values = processor(audio, sampling_rate=16000, return_tensors="pt").input_values.to(device)
    with torch.no_grad():
        return processor.batch_decode(model(values).logits.argmax(-1).cpu())[0]


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
    if req["op"] == "listen":
        audio = load16k(req["file"])
        return {"heard": hear(audio), "seconds": len(audio) / 16000}
    if req["op"] == "reference":
        with tempfile.TemporaryDirectory() as tmp:
            path = f"{tmp}/native.wav"
            synth(req["text"], req["voice"], path)
            native = hear(load16k(path))
        return {"want": phonemize(req["text"], ESPEAK[req["lang"]]), "native": native}
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

# With torch and onnxruntime both loaded, interpreter teardown can abort ("recursive_mutex lock failed").
os._exit(0)
