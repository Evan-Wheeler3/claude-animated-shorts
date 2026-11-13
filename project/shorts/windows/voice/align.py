import json, re, sys, soundfile as sf, numpy as np
from scipy.signal import resample_poly
x, sr = sf.read("voice/voice.wav"); x16 = resample_poly(x, 2, 3).astype(np.float32)
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(x16, word_timestamps=True, beam_size=5)
ws = [{"w": w.word.strip(), "a": round(w.start, 3), "b": round(w.end, 3)} for s in segs for w in s.words]
json.dump(ws, open("voice/whisper_raw.json", "w"), indent=0)
print(len(ws), " ".join(w["w"] for w in ws))
