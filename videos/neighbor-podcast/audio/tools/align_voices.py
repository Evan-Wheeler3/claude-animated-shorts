"""Pick, fit and place the temp voice takes; write aligned dry tracks + timing data for the picture.

usage: python align_voices.py <raw_take_dir> <episode_dir>
in : <raw>/N01_t0.wav ... H05_t2.wav (gen_voices.py)
out: <episode>/audio/voice/narrator.wav, host.wav      48 kHz mono, exactly 51.0 s, separate dry tracks
     <episode>/audio/voice/words.json                  per-word absolute timings (faster-whisper small.en)
     <episode>/audio/voice/takes.md                    chosen take, stretch, score per cue
     <episode>/remotion/src/voice.json                 measured in/out frames per line + host lip-sync envelope
Rules (SHOTLIST.md / owner brief): each line starts at its window's in-point unless noted, must end before the
window's out-point; tempo nudge <= 1.12x when a take overruns; every spoken cue disjoint; H02 ends before frame
507 (baby stand + cheer at 510 stays clear); N02 ends before the swing (frame 330).
"""
import sys, os, json, re
import numpy as np, soundfile as sf, librosa
from faster_whisper import WhisperModel

raw, ep = sys.argv[1], sys.argv[2]
SR, FPS, TOTAL = 48000, 30, 1530
CUES = [  # id, who, window in, window out (exclusive), text
    ("N01", "narrator", 0, 105, "Your neighbor thinks your doorbell camera is his podcast studio."),
    ("H01", "host", 120, 180, "Welcome back. Episode forty-six."),
    ("N02", "narrator", 210, 330, "No camera, no show. So destroy the doorbell camera!"),
    ("N03", "narrator", 366, 435, "And that night, he's on the baby monitor."),
    ("H02", "host", 450, 507, "Tonight's guest just learned to stand."),
    ("N04", "narrator", 585, 720, "This needs to stop. So you lock every camera in the house in a safe."),
    ("N05", "narrator", 735, 795, "His next guest is a locksmith."),
    ("H03", "host", 810, 870, "So how'd you get into this?"),
    ("N06", "narrator", 900, 1080, "So you sell the house and move so deep into the woods the road gives up before you get there."),
    ("N07", "narrator", 1095, 1170, "Three weeks. You haven't heard his voice once."),
    ("H04", "host", 1200, 1230, "Welcome back."),
    ("H05", "host", 1320, 1470, "So when did you know it was time to move out of your parents' cave?"),
]
LEAD = {"N01": 4}  # small lead-in frames so the first word is not on frame 0
GAP = 4
# hard limits tied to picture beats: (earliest start, latest end exclusive)
HARD = {"N01": (4, 117), "H01": (119, 207), "N02": (212, 329), "N03": (368, 438), "H02": (0, 507),
        "N04": (587, 718), "N05": (737, 800), "H03": (0, 872), "N06": (902, 1092), "N07": (1097, 1172),
        "H04": (1201, 1233), "H05": (1320, 1472)}

model = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ").replace("’", "'").replace("'", "")).split()
NUM = {"46": ["forty", "six"]}

def words_of(seg_words):
    out = []
    for w in seg_words:
        for t in norm(w.word):
            out.extend(NUM.get(t, [t]))
    return out

def score(ref, hyp):
    import difflib
    return difflib.SequenceMatcher(None, ref, hyp).ratio()

def trim(y, sr, top_db=38):
    idx = librosa.effects.split(y, top_db=top_db, frame_length=1024, hop_length=256)
    if len(idx) == 0:
        return y
    a, b = idx[0][0], idx[-1][1]
    a = max(0, a - int(0.03 * sr)); b = min(len(y), b + int(0.06 * sr))
    return y[a:b]

def shrink_pauses(y, sr, max_gap=0.3, keep=0.2):
    """series narrator house style (Phil Bathroom voice B): internal silences > 0.3 s shrink to 0.2 s"""
    idx = librosa.effects.split(y, top_db=38, frame_length=1024, hop_length=256)
    if len(idx) < 2:
        return y
    out = [y[idx[0][0]:idx[0][1]]]
    for (a0, a1), (b0, b1) in zip(idx, idx[1:]):
        gap = b0 - a1
        g = gap if gap <= max_gap * sr else int(keep * sr)
        out.append(np.zeros(g, np.float32) if gap > max_gap * sr else y[a1:b0])
        out.append(y[b0:b1])
    return np.concatenate(out)

BASE_TEMPO = {"narrator": 1.1, "host": 1.0}

def transcribe(path):
    y, sr = sf.read(path, dtype="float32")
    y = librosa.resample(y if y.ndim == 1 else y.mean(1), orig_sr=sr, target_sr=16000)
    segs, _ = model.transcribe(y, language="en", word_timestamps=True, beam_size=5)
    ws = [w for s in segs for w in s.words]
    return ws

tracks = {"narrator": np.zeros(int(TOTAL / FPS * SR), np.float32), "host": np.zeros(int(TOTAL / FPS * SR), np.float32)}
lines, words_out, report = [], [], ["| Cue | Take | Match | Take s | Stretch | In | Out | Window |", "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |"]
for cid, who, win_in, win_out, text in CUES:
    ref = norm(text)
    cands = []
    for t in range(3):
        p = os.path.join(raw, f"{cid}_t{t}.wav")
        if not os.path.exists(p):
            continue
        y, sr = sf.read(p, dtype="float32")
        y = y if y.ndim == 1 else y.mean(1)
        y = librosa.resample(y, orig_sr=sr, target_sr=SR)
        y = trim(y, SR)
        y = shrink_pauses(y, SR)
        if BASE_TEMPO[who] != 1.0:
            y = librosa.effects.time_stretch(y, rate=BASE_TEMPO[who])
        tmp = os.path.join(raw, f"_{cid}_t{t}_48k.wav")
        sf.write(tmp, y, SR)
        sc = score(ref, words_of(transcribe(tmp)))
        cands.append((sc, t, y))
    lo, hi = HARD[cid]
    lo = max(lo, (lines[-1]["out"] + GAP) if lines else 0)
    pref = max(lo, win_in + LEAD.get(cid, 0))
    budget = (hi - lo) / FPS
    def rank(c):
        sc, t, y = c
        need = len(y) / SR / budget
        return (sc >= 0.9, need <= 1.12, sc, -need)
    sc, t, y = max(cands, key=rank)
    stretch = max(1.0, len(y) / SR / budget)
    if stretch > 1.0:
        assert stretch <= 1.12, f"{cid}: needs {stretch:.2f}x"
        y = librosa.effects.time_stretch(y, rate=stretch + 0.005)
    dur_f = int(np.ceil(len(y) / SR * FPS))
    start_f = pref if pref + dur_f <= hi else max(lo, hi - dur_f)
    y = y / max(1e-6, np.abs(y).max()) * 0.7
    a = int(start_f / FPS * SR)
    tracks[who][a:a + len(y)] += y[: len(tracks[who]) - a]
    end_f = start_f + int(np.ceil(len(y) / SR * FPS))
    # final word timings from the placed audio
    tmp = os.path.join(raw, f"_{cid}_placed.wav")
    sf.write(tmp, y, SR)
    for w in transcribe(tmp):
        words_out.append({"cue": cid, "who": who, "word": w.word.strip(), "start": round(start_f / FPS + w.start, 3), "end": round(start_f / FPS + w.end, 3)})
    lines.append({"id": cid, "who": who, "in": start_f, "out": end_f, "text": text, "take": t, "match": round(sc, 3), "stretch": round(stretch, 3)})
    report.append(f"| {cid} | t{t} | {sc:.2f} | {len(y)/SR:.2f} | {stretch:.2f} | {start_f} | {end_f} | {win_in}-{win_out} |")

# ---- checks
spoken = sorted(lines, key=lambda l: l["in"])
for a, b in zip(spoken, spoken[1:]):
    assert a["out"] <= b["in"], f"overlap {a['id']} {b['id']}"
h02 = next(l for l in lines if l["id"] == "H02"); assert h02["out"] <= 507, f"H02 ends {h02['out']}"
n02 = next(l for l in lines if l["id"] == "N02"); assert n02["out"] <= 330, f"N02 ends {n02['out']}"
for l in lines:
    assert HARD[l["id"]][0] <= l["in"] and l["out"] <= HARD[l["id"]][1], f"{l['id']} outside its hard range"

# ---- loudness: -18 LUFS dry per track (mix sets final levels)
import pyloudnorm as pyln
meter = pyln.Meter(SR)
os.makedirs(os.path.join(ep, "audio", "voice"), exist_ok=True)
for who, y in tracks.items():
    l = meter.integrated_loudness(y)
    y = pyln.normalize.loudness(y, l, -18.0)
    y = np.clip(y, -0.98, 0.98)
    tracks[who] = y
    sf.write(os.path.join(ep, "audio", "voice", f"{who}.wav"), y.astype(np.float32), SR, subtype="PCM_24")

# ---- host lip-sync envelope: RMS per frame -> 0..1 mouth open
hy = tracks["host"]
hop = SR // FPS
env = []
for f in range(TOTAL):
    seg = hy[f * hop:(f + 1) * hop]
    env.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
env = np.array(env); env = env / max(1e-6, np.percentile(env[env > 0], 95) if (env > 0).any() else 1)
env = np.clip(env, 0, 1)
env = np.where(env < 0.08, 0, env)
env = np.round(np.convolve(env, [0.25, 0.5, 0.25], mode="same"), 3)

json.dump({"source": "audio/tools/align_voices.py (temp TTS takes, see audio/voice/takes.md)", "lines": lines, "hostEnv": env.tolist()},
          open(os.path.join(ep, "remotion", "src", "voice.json"), "w"))
json.dump(words_out, open(os.path.join(ep, "audio", "voice", "words.json"), "w"), indent=1)
open(os.path.join(ep, "audio", "voice", "takes.md"), "w").write(
    "# Temp voice takes — selection and placement\n\nGenerated by `audio/tools/align_voices.py`. Frames at 30 fps, out exclusive. "
    "Match = word-sequence similarity of the faster-whisper small.en transcript to the script.\n\n" + "\n".join(report) + "\n")
print("\n".join(report))
