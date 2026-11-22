"""Narration in the owner's cloned voice (Qwen3-TTS voice clone), read 1.18x faster for energy.

Runs on the owner's Mac (Apple-silicon `mps`, or CPU). One take per line of lines.txt; each spoken take is sped up
1.18x with pitch kept (ffmpeg atempo), trimmed, and joined with a 0.1 s gap plus any "[pause s]" beat from lines.txt
(beats are NOT sped up). Writes voice.wav (48 kHz mono, peak 0.89) and voice_sents.json (sentence start/end seconds).

Default reference: ref_owner_voice.wav = the first 4.95 s of the owner's cloned-voice Niagara narration
(commit d20aa8e, "In 1901, a 63-year-old woman decided to go over Niagara Falls. Inside a wooden barrel.").
If you have your own enrolment sample, pass it with --ref and its exact words with --ref-text.

usage: python3 make_voice.py [--model Qwen/Qwen3-TTS-12Hz-1.7B-Base] [--tempo 1.18] [--seed 7] [--ref ...] [--ref-text ...]
"""
import argparse, json, os, re, subprocess, tempfile
import numpy as np, soundfile as sf, torch
from scipy.signal import resample_poly
from qwen_tts import Qwen3TTSModel

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--model", default="Qwen/Qwen3-TTS-12Hz-1.7B-Base")
ap.add_argument("--ref", default=os.path.join(HERE, "ref_owner_voice.wav"))
ap.add_argument("--ref-text", default="In nineteen-oh-one, a sixty-three-year-old woman decided to go over Niagara Falls. Inside a wooden barrel.")
ap.add_argument("--lines", default=os.path.join(HERE, "lines.txt"))
ap.add_argument("--out", default=os.path.join(HERE, "voice.wav"))
ap.add_argument("--tempo", type=float, default=1.18)
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--only", type=int, nargs="*", help="re-generate only these line numbers (0-based), keep the rest from takes/")
a = ap.parse_args()

dev = "mps" if torch.backends.mps.is_available() else "cpu"
try:
    m = Qwen3TTSModel.from_pretrained(a.model, device_map=dev, dtype=torch.float32)
except Exception as e:  # some torch/qwen-tts builds can't place the model on mps: fall back to the CPU
    print("mps load failed, using cpu:", e, flush=True)
    dev = "cpu"
    m = Qwen3TTSModel.from_pretrained(a.model, device_map=dev, dtype=torch.float32)
print("device", dev, "model", a.model, flush=True)
prompt = m.create_voice_clone_prompt(ref_audio=a.ref, ref_text=a.ref_text)

SR = 48000
takes = os.path.join(HERE, "takes"); os.makedirs(takes, exist_ok=True)
lines = [l.strip() for l in open(a.lines, encoding="utf-8") if l.strip()]


def speed_up(x, sr, tempo):
    with tempfile.TemporaryDirectory() as d:
        i, o = os.path.join(d, "i.wav"), os.path.join(d, "o.wav")
        sf.write(i, x, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", i, "-af", f"atempo={tempo}", "-ar", str(SR), o], check=True)
        y, _ = sf.read(o, dtype="float32")
    return y


def trim(x, thr=0.006):
    idx = np.where(np.abs(x) > thr * np.abs(x).max())[0]
    return x[max(0, idx[0] - int(.012 * SR)): idx[-1] + int(.04 * SR)] if len(idx) else x


parts, sents, t = [], [], 0.0
for i, l in enumerate(lines):
    mm = re.search(r"\s*\[pause ([0-9.]+)\]$", l)
    extra = float(mm.group(1)) if mm else 0.0
    text = l[: mm.start()] if mm else l
    path = os.path.join(takes, f"line{i:02d}.wav")
    if a.only is None or i in a.only or not os.path.exists(path):
        torch.manual_seed(a.seed + i)
        wavs, sr = m.generate_voice_clone(text=text.replace("’", "'"), language="English", voice_clone_prompt=prompt)
        x = np.asarray(wavs[0], dtype=np.float32).reshape(-1)
        x = trim(speed_up(x, sr, a.tempo))
        sf.write(path, x, SR)
        print(f"line {i:2d}: {len(x) / SR:5.2f} s  {text}", flush=True)
    x, _ = sf.read(path, dtype="float32")
    gap = np.zeros(int(SR * (0.1 + extra)), np.float32)
    sents.append({"i": i, "a": round(t, 3), "b": round(t + len(x) / SR, 3), "text": text})
    parts += [x, gap]; t += (len(x) + len(gap)) / SR
y = np.concatenate(parts[:-1]); y = y / np.abs(y).max() * 0.89
sf.write(a.out, y, SR)
json.dump(sents, open(a.out.replace(".wav", "_sents.json"), "w"), indent=1)
print("voice", a.out, f"{len(y) / SR:.2f} s, {sum(len(s['text'].split()) for s in sents)} words")
