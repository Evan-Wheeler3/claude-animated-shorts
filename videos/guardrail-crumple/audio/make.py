# Sound for "Why Guardrails Crumple": the narration (untouched) + a small original background score, all numpy.
# Owner direction (2026-11-22): music only, no sound effects, no chord hits / stabs / cymbals. v3: one driving
# pluck-and-bass bed (128 bpm), D minor -> D major at the new head, a half-second drop-out on the spear.
# House mix: music 10 LU under the voice and ducked 3 dB under speech, -15 LUFS integrated, true peak <= -1 dBTP.
# build_sfx() is kept for reference but is not mixed (SFX_ON = False).
# Every cue sits on a picture time read from the story module (timing.json from remotion/scripts/timing.mts).
# usage: (cd remotion && npx tsx scripts/timing.mts > ../audio/timing.json); python3 audio/make.py
import os, sys, json
import numpy as np
from scipy import signal, ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "templates", "audio"))
from dsp import (SR, TAU, ns, dbg, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, true_peak, norm_to, read_wav, write_wav)
import instruments as I
import sfx_gen as G

T = json.load(open(os.path.join(HERE, "timing.json")))
FPS, TOTAL = T["FPS"], T["TOTAL"]
DUR = TOTAL / FPS
N = ns(DUR)
B = T["BEAT"]
SH = {s.get("key", s.get("id")): (s["a"], s["b"]) for s in T["SHOTS"]}
TRAVEL = np.array(T["travel"])
W = {}
for w in T["words"]:
    W.setdefault(w["w"].strip(".,'’").lower(), []).append(w["a"])
wd = lambda w, k=0: W[w][k]
R = rng(2027)
CUES = []
VREF = -20.0
SFX_ON = False
STEEL = [(410, 1.0, .25), (1130, .7, .18), (2240, .5, .12), (3420, .35, .08), (5100, .2, .05)]


def cue(buf, x, t, db, name, mode="momentary", p=None):
    """place sound x at time t (s), at `db` LU relative to the voice (momentary max, or integrated for beds)"""
    x = st(x) if p is None else pan(x if x.ndim == 1 else x.mean(0), p)
    place(buf, norm_to(x, VREF + db, mode), t)
    CUES.append((t, name, db))


# ---------------------------------------------------------------- sound makers
def thump(r, f0=55, d=0.6):
    n = ns(d); t = np.arange(n) / SR
    return fades(np.sin(phase(f0 * (1 + 0.8 * np.exp(-t / 0.03)))) * np.exp(-t / 0.18) * 1.3 + lp(r.standard_normal(n), 900) * np.exp(-t / 0.02) * 0.6, 0.0005, 0.05)


def tire_squeal(dur, r, f=1350, wob=0.06):
    n = ns(dur); t = np.arange(n) / SR
    f0 = f * (1 + wob * smooth_noise(n, r, 3.0)) * (1 + 0.02 * np.sin(TAU * 7 * t))
    y = np.sin(phase(f0)) + 0.35 * np.sin(2 * phase(f0)) + 0.4 * bp(r.standard_normal(n), f * .8, f * 2.2)
    return fades(y * (0.7 + 0.3 * smooth_noise(n, r, 9.0)), 0.06, 0.2)


def engine(dur, r, rpm=2400):
    n = ns(dur); t = np.arange(n) / SR
    f0 = rpm / 60 * 2 * (1 + 0.01 * smooth_noise(n, r, 1.0))
    ph = phase(f0)
    y = sum(np.sin(k * ph) / k for k in range(1, 7)) + 0.3 * lp(r.standard_normal(n), 300)
    return fades(lp(y, 900), 0.3, 0.3)


def crunch(r, big=1.0, d=0.9):
    """metal on metal: a hard transient, ringing steel modes and a short tearing rattle"""
    n = ns(d); t = np.arange(n) / SR
    hit = hp(r.standard_normal(n), 600) * np.exp(-t / (0.02 + 0.015 * big))
    ring = modal(d, [(f * r.uniform(.95, 1.05), a, dk * big) for f, a, dk in STEEL], r) * 0.6
    rat = G.rattle(d, r, density=40 * big, heavy=True)
    rat = rat if rat.ndim == 1 else rat.mean(0)
    rat = rat[:n] if len(rat) >= n else np.pad(rat, (0, n - len(rat)))
    y = hit * 1.2 + ring + 0.5 * rat * np.exp(-t / 0.25) + 0.9 * thump(r, 48, d)[:n]
    return fades(y, 0.0005, 0.08)


def scrape(dur, r, amt=None):
    """steel dragged on steel; amt = per-sample intensity 0..1"""
    n = ns(dur)
    a = np.ones(n) if amt is None else amt[:n]
    y = G.stick_slip(dur, 90, r, jitter=0.3)
    y = y if y.ndim == 1 else y.mean(0)
    y = y[:n] if len(y) >= n else np.pad(y, (0, n - len(y)))
    y = bp(y, 300, 6000) + 0.5 * bp(r.standard_normal(n), 1800, 5200) * smooth_noise(n, r, 14)
    return fades(y * a, 0.02, 0.08)


def grind(dur, r, speed):
    """the extruder: the beam squealing through the throat; pitch and level follow head speed"""
    n = ns(dur); t = np.arange(n) / SR
    sp = np.interp(t, np.linspace(0, dur, len(speed)), speed)
    lvl = np.clip(sp / 2.0, 0, 1) ** 0.6
    f0 = 140 + 220 * np.clip(sp / 4, 0, 1)
    y = signal.sawtooth(phase(f0 * (1 + 0.04 * smooth_noise(n, r, 11)))) * 0.5
    y = lp(y, 1600) + 0.6 * bp(r.standard_normal(n), 900, 4200) * smooth_noise(n, r, 25)
    y += 0.4 * modal(dur, [(f, .25, 9.0) for f, _, _ in STEEL[:3]], r) * 0
    ss = G.stick_slip(dur, 60, r, jitter=0.25)
    ss = ss if ss.ndim == 1 else ss.mean(0)
    ss = ss[:n] if len(ss) >= n else np.pad(ss, (0, n - len(ss)))
    return fades((y + 0.8 * bp(ss, 200, 3000)) * lvl, 0.01, 0.15)


def pop(f0=500, f1=1100, d=0.09):
    n = ns(d); t = np.arange(n) / SR
    return fades(np.sin(phase(f0 * (f1 / f0) ** (t / d))) * np.exp(-t / 0.04), 0.001, 0.02)


def clank(r, f=900):
    return modal(0.6, [(f, 1, .12), (f * 2.7, .6, .07), (f * 5.1, .3, .04)], r) + hp(r.standard_normal(ns(0.6)), 2000)[: ns(0.6)] * np.exp(-np.arange(ns(0.6)) / SR / 0.01)


def belt_snap(r):
    n = ns(0.25); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 800, 5000) * np.exp(-t / 0.03) * 1.2 + np.sin(phase(np.full(n, 180.0))) * np.exp(-t / 0.05), 0.0005, 0.03)


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    cue(b, G.breeze(DUR + .5, r, 1.0), 0, -30, "cliff-top breeze (whole film)", "integrated")
    # 1. hook: engine + squeal through the skid, whoosh over the edge, the squeal cut off in the air
    cue(b, engine(B["edge"] + .3, r, 2800), 0, -22, "engine (hook)", "integrated")
    cue(b, tire_squeal(B["edge"] + .1, r, 1350), 0, -14, "tyres squeal (hook)", p=-.1)
    cue(b, G.whoosh(1.1, r, .35), B["edge"] - .2, -14, "over the edge")
    # 2. posts pop up, beam slides in, end cap clicks on
    n_posts = 15
    for i in range(n_posts):
        cue(b, pop(220 + 12 * i, 520 + 20 * i, 0.07) + 0.4 * thump(r, 90 + 4 * i, 0.15)[: ns(0.07)], B["posts"] + i * .06 + .05, -16, f"post pop {i}", p=-.4 + .05 * i)
    cue(b, G.whoosh(.6, r, .3, 700, 3500), B["beam"], -16, "beam slides in")
    cue(b, clank(r, 1100), B["beam"] + .55, -12, "end clicks on")
    # 3. replay: engine and squeal, then the glancing hit and the scrape along the rail
    a, e = SH[3]
    cue(b, engine(e - a, r, 2600), a, -24, "engine (replay)", "integrated")
    cue(b, tire_squeal(B["sideHit"] - a + .4, r, 1250), a, -16, "squeal (replay)", p=.1)
    cue(b, crunch(r, .8, 1.0), B["sideHit"], -6, "glancing hit")
    cue(b, scrape(.9, r, np.linspace(1, 0, ns(.9)) ** .7), B["sideHit"] + .05, -12, "scrape along the beam")
    # 4. slow-motion flex: everything low and stretched
    a, e = SH[4]
    cue(b, G.whoosh(.5, r, .3), a - .15, -22, "cut")
    groan = G.creak(1.6, r, 30, 55, modes=[(f / 3, a_, d_ * 3) for f, a_, d_ in STEEL], rough=0.3)
    cue(b, groan, B["bend"] - .5, -10, "beam groans (slow motion)")
    cue(b, thump(r, 38, 1.4), B["bend"] - .1, -12, "slow thud")
    # 5. the old end: engine approach, then the spear
    a, e = SH[5]
    cue(b, engine(B["spear"] - a, r, 3000), a, -20, "engine approach", "integrated")
    cue(b, crunch(r, 1.6, 1.4), B["spear"], -2, "SPEAR: blunt end punches into the car")
    cue(b, G.rattle(1.0, r, 50, heavy=True), B["spear"] + .05, -14, "debris")
    # 6. cabin: belt snaps, a grunt
    cue(b, belt_snap(r), SH[6][0] + .26, -10, "seat belt snaps taut")
    cue(b, G.oof(r, "oof"), SH[6][0] + .32, -14, "driver grunt")
    cue(b, crunch(r, .6, .8), SH[6][0] + .26, -16, "impact heard from inside")
    # 7. the new end: old cap pops off, the head pops on
    cue(b, pop(700, 300, 0.1), B["swap"], -12, "old end pops off")
    cue(b, pop(300, 900, 0.14), B["swap"] + .15, -10, "head pops on")
    cue(b, clank(r, 700), B["swap"] + .45, -14, "head lands")
    # 8-10. the hit and the long extrusion grind, following head speed; posts snapping as the head passes
    cue(b, engine(B["hit"] - SH[8][0], r, 2600), SH[8][0], -22, "engine approach (new end)", "integrated")
    cue(b, crunch(r, 1.0, 1.0), B["hit"], -5, "bumper hits the head")
    t0 = B["hit"]
    sp = np.gradient(TRAVEL) * FPS
    seg = sp[int(t0 * FPS):]
    cue(b, grind(DUR - t0, r, seg), t0, -9, "extrusion grind (speed-driven)")
    tr = TRAVEL
    for zpost in np.arange(1, 28, 1.9):
        hit = np.argmax(tr > zpost - .3)
        if hit > 0: cue(b, G.wood_crack(r)[: ns(.3)] * .5 + clank(r, 420)[: ns(.3)] * .5, hit / FPS, -14, f"post snaps z={zpost:.1f}")
    cue(b, G.creak(.8, r, 40, 25, modes=STEEL, rough=.2), B["stop"] - .3, -14, "last creak as it stops")
    cue(b, clank(r, 1500)[: ns(.3)] * .4, B["stop"] + .5, -22, "tick of cooling steel")
    for t in [SH[5][0] + 1.37, SH[6][0], SH[8][0], SH[9][0], SH[10][0] + 4.6]:
        cue(b, G.whoosh(.4, r, .4), t - .15, -22, "cut whoosh")
    return b + 0.08 * convolve_st(b, make_ir(0.8, 7, hf=1.4))


# ---------------------------------------------------------------- score (original)
M = I.m2f


def build_music():
    """v3: a driving pluck-and-bass bed at 128 bpm, D minor -> D major when the new head arrives. The bed drops out
    for the old-end spear (a half-second of silence is the hardest hit in the edit) and comes back after it."""
    b = np.zeros((2, N)); r = rng(1987)
    pl = lambda t, m, v=0.45, p=0.15: place(b, pan(I.pluck(M(m), v, r, 0.7, 0.65), p), t)
    bass = lambda t, m, v=0.5: place(b, pan(I.pluck(M(m), v, r, 1.0, 0.3), -0.2), t)
    BT = 60 / 128
    MINOR = [(50, [62, 65, 69]), (46, [62, 65, 70]), (48, [60, 64, 67]), (45, [61, 64, 69])]
    MAJOR = [(50, [62, 66, 69]), (55, [62, 67, 71]), (57, [61, 64, 69]), (50, [62, 66, 69])]
    hole = (B["spear"] - .3, B["spear"] + .55)

    def bed(t0, t1, prog, vel=0.4, k0=0):
        k = k0
        while t0 + (k - k0) * BT / 2 < t1 - 0.1:
            t = t0 + (k - k0) * BT / 2; root, ch = prog[(k // 8) % 4]
            if not (hole[0] <= t < hole[1]):
                fade = min(1.0, (t1 - t) / 1.5)
                pl(t, ch[k % 3] + (12 if k % 4 == 3 else 0), vel * fade * (1.0 if k % 2 == 0 else 0.72), 0.25 if k % 2 else -0.15)
                if k % 2 == 0: bass(t, root - 12, vel * fade * (1.1 if k % 4 == 0 else .7))
            k += 1
        return k
    switch = SH["head"][0]
    k = bed(0.0, switch, MINOR, 0.42)
    k = (k + 7) // 8 * 8
    bed(switch, DUR - .05, MAJOR, 0.4, k)
    return b + 0.12 * convolve_st(b, make_ir(0.9, 3, hf=1.3))


# ---------------------------------------------------------------- mix (house standard)
def limiter(x, ceil_db=-1.6, look=0.003, rel=0.08):
    c = dbg(ceil_db); n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12)); La = max(1, ns(look))
    g = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g = np.minimum(ndimage.uniform_filter1d(ndimage.minimum_filter1d(g, ns(rel / 4), mode="nearest"), ns(rel / 2), mode="nearest"), 1.0)
    return x * g[None, :]


def main():
    global VREF
    v, sr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
    v = signal.resample_poly(v.mean(0) if v.ndim == 2 else v, SR, sr)
    voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]; voice = st(voice)
    VREF = integrated(voice)
    sfx = build_sfx() * dbg(-6.0) if SFX_ON else np.zeros((2, N))
    mus = build_music()
    ctrl = np.zeros(N)
    for w in T["words"]: ctrl[max(0, ns(w["a"] - 0.08)): ns(w["b"] + 0.12)] = 1.0
    env = ndimage.uniform_filter1d(ctrl, ns(0.25))
    mus = mus * dbg(-3.0 * env)[None, :]
    mus = mus * dbg((VREF - 10.0) - integrated(mus))
    mix = voice + sfx + mus
    mix = mix * dbg(-15.0 - integrated(mix))
    mix = limiter(mix, -1.6)
    tp = true_peak(mix)
    if tp > -1.0: mix = mix * dbg(-1.0 - tp)
    for name, x in [("mix", mix), ("stem_voice", voice), ("stem_music", mus)]: write_wav(os.path.join(HERE, name + ".wav"), x)
    with open(os.path.join(HERE, "cues.md"), "w") as f:
        f.write(f"# Sound cues (time, cue, level vs voice in LU)\n\nvoice {VREF:.1f} LUFS, mix {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP, {N / SR:.3f} s\n\n")
        f.write("Music only (owner direction): one pluck-and-bass bed, D minor to D major at the new-end shot, no sound effects.\n")
    print(f"voice {VREF:.1f} LUFS | mix {integrated(mix):.1f} LUFS | peak {true_peak(mix):.1f} dBTP | music {integrated(mus):.1f} | {N / SR:.3f} s")


if __name__ == "__main__":
    main()
