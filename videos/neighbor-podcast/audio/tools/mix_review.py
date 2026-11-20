"""Temp motion-review mix for My Neighbor Has a Podcast (48 kHz mono, exactly 1530 frames = 51.0 s).

usage: python mix_review.py <episode_dir>
in : audio/voice/narrator.wav, audio/voice/host.wav, remotion/src/voice.json (line placements),
     audio/sfx/cc0/*.mp3 + SOURCES.json (CC0 Freesound clips), remotion/src/shots.ts CUE values (mirrored below)
out: audio/mix/motion_review_mix.wav (+ copy in assets/audio/ for Remotion), audio/mix/stems/*.wav,
     audio/mix/CUES.md (every placed sound, frame, gain, source + licence)
Device coloration: the host is heard through the device on screen (doorbell, baby monitor, safe webcam, trail cam);
the cheer gets the same monitor filter as H02. The narrator stays dry. Synthesised Foley is original (no licence).
Silence rules: after the bat crack (frame 345) everything cuts to silence until S03; the episode ends in silence
at frame 1525 (cut with picture).
"""
import sys, os, json, subprocess
import numpy as np, soundfile as sf
from scipy import signal

ep = sys.argv[1]
SR, FPS, TOTAL = 48000, 30, 1530
N = round(TOTAL / FPS * SR)
F = lambda f: int(round(f / FPS * SR))
rng = np.random.default_rng(46)

# ---- cues mirrored from remotion/src/shots.ts (checked by check_sync below) ----
CUE = dict(glassRelease=34, hostSits=92, doorOpen=214, fisheyeCut=322, swingStart=330, impact=345, monitorOn=384,
           cribCut=420, babyGrab=474, stand=510, sitStart=530, sitDown=542, monitorRelease=640, doorPushStart=676,
           clunk=722, safeCrack=742, safeOpen=772, roadCut=1004, shouldersDrop=1112, sipStart=1174, sipEnd=1194,
           bearEnter=1234, footfalls=(1240, 1256, 1268), bearSitStart=1272, chairCreak=1300, bearLean=1446,
           breath=1478, black=1525)

def check_sync():
    src = open(os.path.join(ep, "remotion", "src", "shots.ts")).read()
    for k, v in CUE.items():
        if isinstance(v, tuple):
            continue
        import re
        m = re.search(rf"\b{k}: (\d+)", src)
        assert m and int(m.group(1)) == v, f"CUE {k} out of sync with shots.ts"
check_sync()

def load(path):
    if path.endswith(".mp3"):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        return np.frombuffer(raw, np.float32).copy()
    y, sr = sf.read(path, dtype="float32")
    y = y if y.ndim == 1 else y.mean(1)
    assert sr == SR, path
    return y

def bp(y, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, y).astype(np.float32)
def lp(y, hi, order=4):
    return signal.sosfilt(signal.butter(order, hi, btype="low", fs=SR, output="sos"), y).astype(np.float32)
def hp(y, lo, order=4):
    return signal.sosfilt(signal.butter(order, lo, btype="high", fs=SR, output="sos"), y).astype(np.float32)
def env(n, a=0.005, r=0.1):
    e = np.ones(n, np.float32)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e
def db(x): return 10 ** (x / 20)
def norm(y, peak=0.9): return y / max(1e-9, np.abs(y).max()) * peak

DEVICE = {  # host / cheer coloration per device
    "doorbell": dict(lo=280, hi=4800, drive=1.6, hiss=-52),
    "monitor": dict(lo=380, hi=3300, drive=2.2, hiss=-46),
    "webcam": dict(lo=240, hi=5200, drive=1.4, hiss=-50, box=True),
    "trailcam": dict(lo=330, hi=3900, drive=1.8, hiss=-48),
}
def device(y, kind):
    d = DEVICE[kind]
    z = bp(y, d["lo"], d["hi"])
    z = np.tanh(z * d["drive"]) / np.tanh(d["drive"])
    if d.get("box"):
        for ms, g in ((6.5, 0.35), (11.0, 0.22), (17.0, 0.12)):
            k = int(ms / 1000 * SR)
            z[k:] += z[:-k] * g
    z += (rng.standard_normal(len(z)).astype(np.float32) * db(d["hiss"])) * (np.abs(z).max() > 0)
    return z.astype(np.float32)

# ---------------- synthesis (original) ----------------
def noise(n): return rng.standard_normal(n).astype(np.float32)
def s_click(dur=0.03, f0=3500): n = int(dur * SR); return bp(noise(n), f0 * 0.6, min(f0 * 1.6, 20000)) * np.exp(-np.linspace(0, 9, n)).astype(np.float32)
def s_glass_tap():
    n = int(0.45 * SR); t = np.arange(n) / SR
    tone = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((2630, 1), (4180, 0.5), (6120, 0.25))) * np.exp(-t * 14)
    return norm((tone + bp(noise(n), 2000, 9000) * np.exp(-t * 90) * 0.6).astype(np.float32), 0.6)
def s_thud(dur=0.25, f0=70, bright=900):
    n = int(dur * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f0 * t * (1 - 0.25 * t / dur)) * np.exp(-t * 18)
    return norm((body + lp(noise(n), bright) * np.exp(-t * 40) * 0.8).astype(np.float32))
def s_crack():
    n = int(0.6 * SR); t = np.arange(n) / SR
    snap = hp(noise(n), 1500) * np.exp(-t * 60)
    wood = bp(noise(n), 500, 2600) * np.exp(-t * 25) * 0.8
    knock = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 30) * 0.9
    shards = np.zeros(n, np.float32)
    for k in range(14):
        i = int(rng.uniform(0.01, 0.25) * SR); m = int(0.012 * SR)
        shards[i:i + m] += bp(noise(m), 3000, 11000) * rng.uniform(0.2, 0.6)
    return norm((snap * 1.2 + wood + knock + shards).astype(np.float32), 0.98)
def s_whoosh(dur=0.32):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    y = bp(noise(n), 400, 2500) * (t ** 2.5) * np.exp(-((t - 0.9) ** 2) * 30)
    return norm(y.astype(np.float32), 0.7)
def s_clunk():
    n = int(0.9 * SR); t = np.arange(n) / SR
    body = (np.sin(2 * np.pi * 52 * t) * 1.0 + np.sin(2 * np.pi * 118 * t) * 0.5) * np.exp(-t * 9)
    ring = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((610, 0.12), (1340, 0.06))) * np.exp(-t * 6)
    hit = lp(noise(n), 1600) * np.exp(-t * 55)
    latch = np.zeros(n, np.float32); i = int(0.11 * SR); c = s_click(0.04, 2500); latch[i:i + len(c)] += c * 0.5
    return norm((body + ring + hit * 0.9 + latch).astype(np.float32), 0.98)
def s_creak(dur=0.6, f0=180, f1=260, rough=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.linspace(f0, f1, n) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))
    ph = np.cumsum(f) / SR
    saw = (2 * (ph % 1) - 1) * (1 + rough * noise(n) * 0.3)
    y = bp(saw.astype(np.float32), 300, 3000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
    return norm(y.astype(np.float32), 0.7)
def s_ratchet(dur=0.35, rate=26):
    n = int(dur * SR); y = np.zeros(n, np.float32)
    for k in range(int(dur * rate)):
        c = s_click(0.015, 4200); i = int(k / rate * SR); y[i:i + len(c)] += c * (0.6 + 0.4 * rng.random())
    return norm(y, 0.6)
def s_jingle(dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n, np.float32)
    for k in range(9):
        i = int(rng.uniform(0, dur * 0.6) * SR); m = int(0.15 * SR); tt = np.arange(m) / SR
        f = rng.uniform(3200, 7600)
        y[i:i + m] += (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 40) * rng.uniform(0.3, 0.8))[: n - i]
    return norm(y, 0.5)
def s_breath(dur=1.2, inhale=True, low=True):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    shape = np.sin(np.pi * t) ** (0.8 if inhale else 1.4) * (t ** 0.3 if inhale else 1)
    y = bp(noise(n), 120 if low else 400, 1400 if low else 3800) * shape
    if low:  # chest resonance + slight snout whistle
        y += bp(noise(n), 60, 220) * shape * 1.6
        y += bp(noise(n), 1800, 2400) * shape * 0.15
    return norm(y.astype(np.float32), 0.8)
def s_idle(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    fire = 27.0
    y = sum(np.sin(2 * np.pi * fire * k * t + k) / k for k in range(1, 9)) * (1 + 0.3 * np.sin(2 * np.pi * fire / 2 * t))
    y = lp(y.astype(np.float32), 600) + lp(noise(n), 300) * 0.4
    return norm(y.astype(np.float32), 0.7)
def s_tone(dur, lo=60, hi=400, hum=None):
    n = int(dur * SR); y = bp(noise(n), lo, hi) * 0.6
    if hum: y += np.sin(2 * np.pi * hum * np.arange(n) / SR).astype(np.float32) * 0.15
    return norm(y.astype(np.float32), 0.5)
def s_footfall_heavy():
    n = int(0.5 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 48 * t) * np.exp(-t * 14) + lp(noise(n), 500) * np.exp(-t * 22) * 0.7
    leaves = bp(noise(n), 1500, 7000) * np.exp(-t * 18) * 0.35
    return norm((y + leaves).astype(np.float32), 0.95)
def s_plastic_set():
    n = int(0.18 * SR); t = np.arange(n) / SR
    return norm((bp(noise(n), 800, 5000) * np.exp(-t * 60) + np.sin(2 * np.pi * 420 * t) * np.exp(-t * 50) * 0.5).astype(np.float32), 0.6)

# ---------------- CC0 clips ----------------
cc = json.load(open(os.path.join(ep, "audio", "sfx", "cc0", "SOURCES.json")))
src = {c["file"].split("/")[-1].split("_", 1)[1].rsplit(".", 1)[0]: c for c in cc}
clip = {k: load(os.path.join(ep, c["file"])) for k, c in src.items()}

def rms_win(y, win):
    k = int(win * SR); e = np.convolve(y ** 2, np.ones(k) / k, mode="valid"); return e
# cheer: the 0.8 s window with the most energy (owner: audition 0.7-0.9 s)
e = rms_win(clip["cheer"], 0.8); i = int(np.argmax(e))
cheer = clip["cheer"][i:i + int(0.8 * SR)] * env(int(0.8 * SR), 0.008, 0.22)
cheer_note = f"763830 window {i / SR:.2f}-{i / SR + 0.8:.2f} s of the preview (0.80 s), fade 8 ms in / 220 ms out"
# chair creaks: pick distinct loud events from the 58 s file
ce = rms_win(clip["chair_creak"], 0.5)
creaks = []
for _ in range(4):
    j = int(np.argmax(ce)); creaks.append(clip["chair_creak"][j:j + int(0.5 * SR)] * env(int(0.5 * SR), 0.01, 0.15)); ce[max(0, j - SR):j + SR] = 0
# footsteps: onsets from the gravel walk
fy = clip["footsteps"]; fe = rms_win(fy, 0.03); thr = np.percentile(fe, 92)
steps, last = [], -SR
for j in np.where(fe > thr)[0]:
    if j - last > int(0.35 * SR):
        steps.append(fy[max(0, j - 400): j + int(0.28 * SR)] * env(int(0.28 * SR) + min(400, j), 0.003, 0.12)); last = j
forest = clip["forest"]

# ---------------- build ----------------
stems = {k: np.zeros(N, np.float32) for k in ("narrator", "host", "sfx", "amb")}
rows = []
def place(stem, y, frame, gain_db, name, source, dev=None, mute_after=None):
    y = device(y, dev) if dev else y
    a = F(frame); y = y * db(gain_db)
    b = min(N, a + len(y))
    if mute_after is not None:
        b = min(b, F(mute_after))
    if b > a:
        stems[stem][a:b] += y[: b - a]
    rows.append((frame, stem, name, gain_db, dev or "dry", source))

SYN = "Original synthesis (mix_review.py) / no third-party licence"
def cc_src(k): c = src[k]; return f"Freesound #{c['id']} '{c['title']}' by {c['author']}, CC0 1.0 ({c['page']})"

# voices
lines = json.load(open(os.path.join(ep, "remotion", "src", "voice.json")))["lines"]
narr = load(os.path.join(ep, "audio", "voice", "narrator.wav")); host = load(os.path.join(ep, "audio", "voice", "host.wav"))
stems["narrator"] += narr[:N] * db(2.0)
rows.append((0, "narrator", "narrator.wav (N01-N07)", 2.0, "dry", "Temp TTS: Qwen3-TTS 0.6B Base clone of series narrator voice B"))
HOST_DEV = {"H01": "doorbell", "H02": "monitor", "H03": "webcam", "H04": "trailcam", "H05": "trailcam"}
for l in lines:
    if l["who"] != "host":
        continue
    a, b = F(l["in"]) - int(0.05 * SR), F(l["out"]) + int(0.1 * SR)
    seg = host[a:b] * db(1.0)
    stems["host"][a:b] += device(seg, HOST_DEV[l["id"]])
    rows.append((l["in"], "host", f"{l['id']} '{l['text']}'", 1.0, HOST_DEV[l["id"]], "Temp TTS: Qwen3-TTS 0.6B CustomVoice 'Ryan'"))

# S01-S02 porch (heard through the doorbell until the side view)
place("amb", hp(lp(forest[:F(345)], 5000), 200), 0, -30, "suburban air (forest bed, high birds)", cc_src("forest"), "doorbell", mute_after=210)
place("amb", hp(lp(forest[F(10):F(10) + F(140)], 6000), 150), 210, -28, "porch air (side view)", cc_src("forest"), mute_after=CUE["fisheyeCut"])
place("amb", hp(lp(forest[F(20):F(60)], 5000), 200), CUE["fisheyeCut"], -30, "porch air (fisheye)", cc_src("forest"), "doorbell", mute_after=CUE["impact"])
place("sfx", s_glass_tap(), CUE["glassRelease"] - 1, -14, "glass set on table", SYN, "doorbell")
place("sfx", creaks[0], CUE["hostSits"] - 3, -16, "host chair takes weight", cc_src("chair_creak"), "doorbell")
place("sfx", lp(creaks[1], 2500), 150, -18, "guest chair sinks into the bed", cc_src("chair_creak"), "doorbell")
place("sfx", s_click(0.05, 2200), CUE["doorOpen"], -14, "door latch", SYN)
place("sfx", s_creak(0.5, 140, 120, 0.3), CUE["doorOpen"] + 2, -22, "door swing", SYN)
for k, f in enumerate((232, 248, 276, 292)):
    place("sfx", lp(steps[k % len(steps)], 3500), f, -16, "homeowner steps on the porch", cc_src("footsteps"))
place("sfx", s_whoosh(0.34), CUE["impact"] - 10, -17, "bat swing", SYN, "doorbell")
place("sfx", s_crack(), CUE["impact"], 0, "BAT CRACK (contact, cut to black)", SYN, mute_after=366)
# S03-S04 night
place("amb", s_tone(1.85, 50, 300, hum=60), 366, -34, "bedroom tone", SYN, mute_after=CUE["cribCut"])
place("sfx", s_click(0.03, 3000), CUE["monitorOn"], -18, "monitor power tick", SYN)
place("amb", s_tone(5.5, 200, 2500), CUE["cribCut"], -36, "nursery feed hiss", SYN, "monitor", mute_after=585)
place("sfx", s_thud(0.15, 160, 2500), 428, -20, "tiny chair set down", SYN, "monitor")
place("sfx", cheer, CUE["stand"], -4, "CROWD CHEER (baby stands)", cc_src("cheer") + "; " + cheer_note, "monitor")
place("sfx", s_creak(0.35, 260, 300, 0.6), CUE["sitDown"] + 4, -20, "crib creak after the plop", SYN, "monitor")
place("sfx", s_thud(0.12, 110, 900), CUE["sitDown"], -18, "baby plops onto the mattress", SYN, "monitor")
# S05-S06 safe
place("amb", s_tone(5.0, 60, 400), 585, -34, "room tone", SYN, mute_after=735)
place("sfx", s_plastic_set(), CUE["monitorRelease"] - 2, -14, "monitor set on the pile", SYN)
place("sfx", s_creak(1.1, 70, 95, 0.8), CUE["doorPushStart"] + 8, -18, "safe door hinge under push", SYN)
place("sfx", s_clunk(), CUE["clunk"], -2, "SAFE DOOR CLUNK", SYN)
place("sfx", s_ratchet(0.32), CUE["clunk"] + 4, -14, "bolt wheel spin", SYN)
place("amb", s_tone(1.0, 40, 200), 735, -40, "inside the safe (dark)", SYN, "webcam", mute_after=CUE["safeCrack"])
place("sfx", lp(s_clunk(), 900) * 0.6, CUE["safeCrack"], -12, "bolt release (inside)", SYN, "webcam")
place("sfx", s_creak(1.0, 90, 70, 0.7), CUE["safeCrack"] + 4, -18, "safe door hinge opening", SYN, "webcam")
place("amb", s_tone(5.0, 80, 900), CUE["safeCrack"] + 6, -36, "room tone through the webcam", SYN, "webcam", mute_after=900)
place("sfx", s_jingle(0.6), 778, -18, "locksmith key ring", SYN, "webcam")
# S07-S08 woods (day)
idle = s_idle(3.4); idle[F(40):] *= np.linspace(1, 0, len(idle) - F(40)) ** 2  # idle drops out into the woods
place("sfx", idle, 900, -18, "truck idle (drops out by ~1003)", SYN, mute_after=1004)
place("amb", forest[F(5):F(5) + F(300)], 900, -22, "forest bed", cc_src("forest"))
for k, f in enumerate(range(905, 1068, 15)):
    place("sfx", lp(steps[(k + 1) % len(steps)], 4000), f, -20 if f < CUE["roadCut"] else -16, "footsteps with the box", cc_src("footsteps"))
place("sfx", s_thud(0.3, 85, 1100), 1082, -14, "box set on the porch", SYN)
place("sfx", s_breath(1.1, inhale=False, low=False), CUE["shouldersDrop"], -24, "homeowner exhale (shoulders drop)", SYN)
place("sfx", s_click(0.04, 1800), CUE["sipStart"] - 2, -22, "mug handling", SYN)
place("sfx", bp(noise(int(0.35 * SR)), 900, 4000) * env(int(0.35 * SR), 0.05, 0.15), CUE["sipStart"] + 9, -32, "quiet sip", SYN)
# S09-S10 trail cam (night)
night = lp(hp(forest[F(40):F(40) + F(330)], 120), 1800)
place("amb", night, 1200, -30, "night woods through the trail cam", cc_src("forest") + " (low-passed)", "trailcam", mute_after=CUE["black"])
for f in CUE["footfalls"]:
    place("sfx", s_footfall_heavy(), f, -6, "BEAR FOOTFALL", SYN, "trailcam")
for f in (1248, 1262):
    place("sfx", s_footfall_heavy(), f, -16, "bear front paw", SYN, "trailcam")
slow = signal.resample(creaks[2], int(len(creaks[2]) * 1.35)).astype(np.float32)
place("sfx", slow, CUE["chairCreak"] - 4, -6, "FOLDING CHAIR CREAK under the bear (pitched down)", cc_src("chair_creak"), "trailcam")
place("sfx", s_breath(1.25, inhale=True, low=True), CUE["breath"], -4, "BEAR BREATH (one inhale)", SYN, "trailcam", mute_after=CUE["black"])

# ---------------- master ----------------
mix = stems["narrator"] + stems["host"] + stems["sfx"] + stems["amb"]
# hard silences with picture
for a, b in ((CUE["impact"] + 9, 366), (CUE["black"], TOTAL)):
    tail = F(a)
    mix[tail:F(b)] = 0
    for s in stems.values():
        s[tail:F(b)] = 0
pk = np.abs(mix).max()
if pk > 0.97:
    mix *= 0.97 / pk
import pyloudnorm as pyln
lufs = pyln.Meter(SR).integrated_loudness(mix)
out = os.path.join(ep, "audio", "mix"); os.makedirs(os.path.join(out, "stems"), exist_ok=True)
sf.write(os.path.join(out, "motion_review_mix.wav"), mix.astype(np.float32), SR, subtype="PCM_24")
for k, s in stems.items():
    sf.write(os.path.join(out, "stems", f"{k}.flac"), s.astype(np.float32), SR, subtype="PCM_24")
os.makedirs(os.path.join(ep, "assets", "audio"), exist_ok=True)
sf.write(os.path.join(ep, "assets", "audio", "motion_review_mix.wav"), mix.astype(np.float32), SR, subtype="PCM_16")
rows.sort(key=lambda r: r[0])
md = ["# Motion-review temp mix — cue sheet", "", f"Generated by `audio/tools/mix_review.py`. 48 kHz mono, {N / SR:.2f} s, integrated {lufs:.1f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS.",
      "Silence: frames 354-365 (after the crack) and 1525-1529 (final black).", "",
      "| Frame | Time | Stem | Sound | Gain dB | Device | Source / licence |", "| ---: | ---: | --- | --- | ---: | --- | --- |"]
md += [f"| {f} | {f / FPS:.2f} | {st} | {n} | {g:+.0f} | {d} | {s} |" for f, st, n, g, d, s in rows]
open(os.path.join(out, "CUES.md"), "w").write("\n".join(md) + "\n")
print(f"mix {N / SR:.2f}s  {lufs:.1f} LUFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  cues {len(rows)}  cheer: {cheer_note}")
