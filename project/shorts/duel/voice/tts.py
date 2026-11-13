import sys, re, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = "/home/user/claude-animated-shorts/project/models/"
voice, speed, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
lines = [l.strip() for l in open("SCRIPT.md").read().split("\n\n")[-1].strip().split("\n") if l.strip()]
k = Kokoro(M + "kokoro-v1.0.onnx", M + "voices-v1.0.bin")
if "+" in voice:
    a, b = voice.split("+"); v = (k.get_voice_style(a) + k.get_voice_style(b)) / 2
else: v = voice
sr = 24000; parts = []; sents = []; t = 0.0
def trim(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - 240): idx[-1] + 720] if len(idx) else x
for i, l in enumerate(lines):
    x, sr = k.create(l.replace("A LOT", "a lot").replace("IS one", "is one"), voice=v, speed=speed, lang="en-us"); x = trim(x.astype(np.float32))
    gap = np.zeros(int(sr * 0.22), np.float32)
    sents.append({"i": i, "a": round(t, 3), "b": round(t + len(x) / sr, 3), "text": l})
    parts += [x, gap]; t += (len(x) + len(gap)) / sr
y = np.concatenate(parts[:-1]); y = y / np.abs(y).max() * 0.89
sf.write(out, y, sr); json.dump(sents, open(out.replace(".wav", "_sents.json"), "w"), indent=1)
print(voice, speed, "dur", round(len(y) / sr, 2), "words", sum(len(s["text"].split()) for s in sents))
