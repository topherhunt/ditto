"""Hears rendered clips as phonemes, for scripts/check-audio.ts.

Usage: audio-phonemes.py <tools_dir> <audio_dir>. stdin: JSON lines {file, text, lang} with `file`
relative to audio_dir; stdout: one line {file, heard, want} each, where `heard` is what
facebook/wav2vec2-xlsr-53-espeak-cv-ft (a language-independent phoneme recognizer) hears, and `want`
is espeak's IPA for the text, via Kokoro's phonemizer. Both are raw IPA; the caller compares them.
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
from kokoro_onnx import Kokoro
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
ESPEAK = {"it": "it", "en": "en-us", "nl": "nl", "ga": "ga"}

tools, audio_dir = sys.argv[1], sys.argv[2]
# Constructing Kokoro points phonemizer at its bundled espeak-ng; the recognizer's tokenizer fails
# with "espeak not installed" if it loads first.
phonemize = Kokoro(f"{tools}/kokoro/kokoro-v1.0.onnx", f"{tools}/kokoro/voices-v1.0.bin").tokenizer.phonemize
device = "mps" if torch.backends.mps.is_available() else "cpu"
processor = Wav2Vec2Processor.from_pretrained(MODEL)
model = Wav2Vec2ForCTC.from_pretrained(MODEL).to(device).eval()


def load(job):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f"{audio_dir}/{job['file']}", "-ar", "16000", "-ac", "1", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return job, np.frombuffer(raw, dtype=np.float32)


jobs = [json.loads(line) for line in sys.stdin]
with ThreadPoolExecutor(4) as pool:
    # Chunked so decoding runs only a little ahead of the model, not the whole list into memory.
    for job, audio in (r for i in range(0, len(jobs), 64) for r in pool.map(load, jobs[i:i + 64])):
        values = processor(audio, sampling_rate=16000, return_tensors="pt").input_values.to(device)
        with torch.no_grad():
            heard = processor.batch_decode(model(values).logits.argmax(-1).cpu())[0]
        want = phonemize(job["text"], ESPEAK[job["lang"]])
        print(json.dumps({"file": job["file"], "heard": heard, "want": want}, ensure_ascii=False), flush=True)

# With torch and onnxruntime both loaded, interpreter teardown can abort ("recursive_mutex lock failed").
os._exit(0)
