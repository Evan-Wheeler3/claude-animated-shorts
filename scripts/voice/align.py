"""Word timings for the narration (established recipe: faster-whisper small.en, word timestamps).
usage: python3 scripts/voice/align.py <voice.wav> <words.json>
  words.json: [{"w": word, "a": start_s, "b": end_s}, ...]; hand-fix any misheard word against the script."""
import sys, json, soundfile as sf, numpy as np
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
x, sr = sf.read(sys.argv[1]); x = x if x.ndim == 1 else x.mean(1)
x16 = resample_poly(x, 16000, sr).astype(np.float32)
m = WhisperModel("small.en", device="cpu", compute_type="int8", download_root="models/whisper")
segs, _ = m.transcribe(x16, word_timestamps=True, beam_size=5)
ws = [{"w": w.word.strip(), "a": round(w.start, 3), "b": round(w.end, 3)} for s in segs for w in s.words]
json.dump(ws, open(sys.argv[2], "w"), indent=0)
print(len(ws), "words:", " ".join(w["w"] for w in ws))
