"""Hold Up narrator (established voice: Kokoro ONNX `am_michael`, speed 1.32; same recipe as the troy/eiffel/emu shorts
on branch claude/sleepy-brown-kbctlr, generalised). One line of the script per sentence; 0.1 s gaps; peak 0.89.
usage: python3 scripts/voice/tts.py <lines.txt> <out.wav> [voice=am_michael] [speed=1.32]
  lines.txt: one spoken sentence per line (no stage directions). Pronunciation fixes go in SAY below.
  writes out.wav (24 kHz mono) and out_sents.json (sentence start/end seconds)."""
import sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = "models/"
src, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "am_michael"
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.32
SAY = {"1901": "nineteen-oh-one", "167": "one hundred and sixty-seven"}
lines = [l.strip() for l in open(src).read().split("\n") if l.strip()]
k = Kokoro(M + "kokoro-v1.0.onnx", M + "voices-v1.0.bin")
v = (k.get_voice_style(voice.split("+")[0]) + k.get_voice_style(voice.split("+")[1])) / 2 if "+" in voice else voice
def trim(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - 240): idx[-1] + 720] if len(idx) else x
sr = 24000; parts = []; sents = []; t = 0.0
for i, l in enumerate(lines):
    say = l
    for a, b in SAY.items(): say = say.replace(a, b)
    x, sr = k.create(say.replace('"', ""), voice=v, speed=speed, lang="en-us"); x = trim(x.astype(np.float32))
    gap = np.zeros(int(sr * 0.1), np.float32)
    sents.append({"i": i, "a": round(t, 3), "b": round(t + len(x) / sr, 3), "text": l})
    parts += [x, gap]; t += (len(x) + len(gap)) / sr
y = np.concatenate(parts[:-1]); y = y / np.abs(y).max() * 0.89
sf.write(out, y, sr); json.dump(sents, open(out.replace(".wav", "_sents.json"), "w"), indent=1)
print(voice, speed, "dur", round(len(y) / sr, 2), "s, words", sum(len(s["text"].split()) for s in sents))
