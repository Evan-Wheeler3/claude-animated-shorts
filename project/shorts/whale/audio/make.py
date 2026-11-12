# Sound for "A Whale of a Deal": the narration (untouched) + synthesized SFX + a small original score, all numpy.
# Every cue sits on a picture frame from src/videos/whale/story.ts (30 fps). Output: mix.wav (48 kHz stereo, exact
# length), stems, cues.md.  usage: python make.py   (run from this folder; needs numpy + scipy)
import os, json, math
import numpy as np
from scipy import signal, ndimage
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, peq, colored, smooth_noise, fades, phase, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, momentary_max, true_peak, norm_to, read_wav, write_wav)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 2106
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
# beats (frames) from story.ts
HOOK_PUSH, HOOK_BOOM, FLASH = 123, 131, 139
BOULDER, CRATES0, CRATES1 = 548, 702, 760
PLUNGE, BLAST, SHOCK = 1079, 1096, 1194
HIT1, HIT2, HIT3, SLAB = 1331, 1349, 1366, 1481
POOF, REPLAY, STOMP = 1577, 1618, 1704
R = rng(1970)
CUES = []


def cue(buf, x, f, db, name, mode="momentary", p=None):
    """place sound x at frame f, at `db` LU relative to the voice (momentary max, or integrated for beds)"""
    x = st(x) if p is None else pan(x if x.ndim == 1 else x.mean(0), p)
    x = norm_to(x, VREF + db, mode)
    place(buf, x, F(f))
    CUES.append((f, name, db))


# ---------------------------------------------------------------- sound makers
def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.clip(t / a, 0, 1) * np.exp(-np.maximum(t - a, 0) / d)


def boom(r, big=1.0, dur=3.2):
    """dynamite in wet sand: crack, chest thump sweeping down, roar, crackle"""
    n = ns(dur); t = np.arange(n) / SR
    sub = np.sin(phase(34 + 90 * np.exp(-t / 0.07))) * np.exp(-t / (0.5 * big)) * 1.4
    crack = hp(r.standard_normal(n), 1800) * np.exp(-t / 0.012) * 1.2
    cn = colored(n, r, 1.0); kb = np.exp(-t / 0.25); roar = (lp(cn, 900) * (1 - kb) + lp(cn, 3400) * kb) * np.exp(-t / (0.75 * big)) * 1.6
    crackle = bp(r.standard_normal(n), 900, 5000) * (r.random(n) > 0.9992).astype(float)
    crackle = signal.lfilter([1], [1, -0.995], crackle) * 0.5 * np.exp(-t / 1.2)
    y = np.tanh(1.6 * (sub + crack + roar)) + crackle
    return widen(fades(y, 0.0005, 0.4), r, 14, 0.6)


def splat(r, size=1.0):
    """wet blubber on sand / on a person: slap + squelch + a few drips"""
    d = 0.5 + 0.25 * size; n = ns(d); t = np.arange(n) / SR
    slap = lp(r.standard_normal(n), 2600) * np.exp(-t / 0.018)
    thud = np.sin(phase((70 + 60 / size) * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / (0.07 * size))
    sq = bp(r.standard_normal(n), 500, 1900) * smooth_noise(n, r, 38) ** 2 * np.clip(t / 0.02, 0, 1) * np.exp(-t / 0.13) * 1.6
    y = slap * 0.9 + thud * 1.1 + sq
    y += G.bubbles(d, r, 26, 300, 1400, env=np.exp(-t / 0.2)) * 0.5 if hasattr(G, "bubbles") else 0
    return fades(y, 0.0005, 0.05)


def crunch(r):
    """a car roof folding: sheet-metal modes, crumple noise, glass"""
    d = 2.0; n = ns(d); t = np.arange(n) / SR
    metal = modal(d, [(140, 1.0, 0.35), (233, 0.9, 0.3), (410, 0.8, 0.25), (690, 0.6, 0.2), (1130, 0.5, 0.16), (1900, 0.35, 0.12), (3100, 0.25, 0.1)], r)
    crump = bp(r.standard_normal(n), 250, 3500) * smooth_noise(n, r, 55) ** 2 * np.exp(-t / 0.16) * 2.2
    thud = np.sin(phase(52 * (1 + 0.8 * np.exp(-t / 0.03)))) * np.exp(-t / 0.16) * 1.6
    glass = np.zeros(n)
    for k in range(34):
        t0 = 0.02 + r.exponential(0.22); i = ns(t0)
        if i >= n - 10: continue
        L = min(n - i, ns(0.25)); tl = np.arange(L) / SR
        glass[i:i + L] += np.sin(TAU * r.uniform(2800, 9000) * tl) * np.exp(-tl / r.uniform(0.01, 0.05)) * r.uniform(0.2, 0.7)
    return widen(fades(np.tanh(metal[:n] * 0.8 + crump + thud) + glass * 0.5, 0.0005, 0.2), r, 9, 0.5)


def horn(dur=1.5):
    """the car's horn, stuck on and dying"""
    n = ns(dur); t = np.arange(n) / SR
    cents = -500 * np.clip((t - 0.35) / (dur - 0.35), 0, 1) ** 1.6
    y = sum(np.sign(np.sin(phase(f0 * 2 ** (cents / 1200)))) for f0 in (392.0, 494.0)) * 0.5
    y = lp(bp(y, 300, 3800), 3200) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.5, 0, 1) ** 1.2
    return y * (1 + 0.25 * np.sin(TAU * 11 * t) * np.clip(t / dur, 0, 1))


def gull(r, far=False):
    """a herring gull's 'kyow kyow kyow': falling harmonic notes"""
    k = int(r.integers(2, 5)); out = np.zeros(ns(0.34 * k + 0.2)); base = r.uniform(900, 1250)
    for i in range(k):
        d = r.uniform(0.2, 0.3); n = ns(d); t = np.arange(n) / SR
        f = base * (1.25 - 0.55 * (t / d) ** 0.7) * (1 - 0.04 * i)
        ph = phase(f)
        y = (np.sin(ph) + 0.55 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.12 * np.sin(4 * ph)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6
        y *= 1 + 0.3 * np.sin(TAU * 28 * t)
        a = ns(0.33 * i); out[a:a + n] += y * (1 - 0.12 * i)
    return lp(out, 2200) if far else out


def surf(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    swell = 0.5 + 0.5 * np.sin(TAU * t / 7.3 + 1) ** 2
    cn = colored(n, r, 0.8); wash = (lp(cn, 1400) * (1 - swell) + lp(cn, 4000) * swell) * (0.35 + 0.65 * swell)
    hiss = hp(r.standard_normal(n), 3500) * swell ** 3 * 0.05
    return widen(wash + hiss, r, 17, 0.8)


def thunk(r, f0=120):
    n = ns(0.3); t = np.arange(n) / SR
    y = modal(0.3, [(f0, 1.0, 0.05), (f0 * 2.3, 0.7, 0.035), (f0 * 4.1, 0.4, 0.025), (f0 * 7.2, 0.25, 0.015)], r)[:n]
    return fades(y + lp(r.standard_normal(n), 1500) * np.exp(-t / 0.008) * 0.5, 0.0003, 0.03)


def blip(f0, f1, d=0.12, vib=0.0):
    n = ns(d); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / d) * (1 + vib * np.sin(TAU * 30 * t))
    return fades(np.sin(phase(f)) * np.sin(np.pi * t / d) ** 0.5, 0.002, 0.02)


def slide(f0, f1, d):
    """slide-whistle fall for something coming down"""
    n = ns(d); t = np.arange(n) / SR
    ph = phase(f0 * (f1 / f0) ** ((t / d) ** 1.3) * (1 + 0.012 * np.sin(TAU * 6 * t)))
    y = np.sin(ph) + 0.25 * np.sin(2 * ph) + bp(np.random.default_rng(int(f0)).standard_normal(n), 2000, 6000) * 0.04
    return fades(y * np.clip(t / 0.05, 0, 1), 0.01, 0.03)


def buzz(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    f = 190 * (1 + 0.12 * smooth_noise(n, r, 5) - 0.06)
    y = np.sign(np.sin(phase(f))) * (0.4 + 0.6 * smooth_noise(n, r, 7))
    return fades(bp(y, 300, 2600) * 0.5, 0.05, 0.05)


def whirr(dur, r):
    """a 16 mm news camera rolling"""
    n = ns(dur); t = np.arange(n) / SR
    clicks = (np.sin(TAU * 24 * t) > 0.96).astype(float)
    y = bp(clicks * r.standard_normal(n), 1200, 6000) * 0.8 + bp(colored(n, r, 0.3), 300, 1800) * 0.12
    return fades(y * np.clip(t / 0.4, 0, 1), 0.01, 0.1)


def squirt(r):
    n = ns(0.45); t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 700 + 2600 * np.exp(-t / 0.1).mean(), 5200) * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.1)
    y += bp(r.standard_normal(n), 400, 1600) * smooth_noise(n, r, 45) ** 2 * np.exp(-t / 0.12) * 1.3
    return fades(y, 0.001, 0.05)


def steps(dur, r, rate):
    n = ns(dur); y = np.zeros(n); tm = 0.0
    while tm < dur - 0.2:
        L = ns(0.14); tl = np.arange(L) / SR; i = ns(tm)
        y[i:i + L] += lp(r.standard_normal(L), r.uniform(900, 1700)) * np.sin(np.pi * tl / 0.14) ** 2 * r.uniform(0.4, 1.0)
        tm += r.exponential(1 / rate)
    return y


def crowd(dur, r, voices=10, rate=4.2):
    out = np.zeros((2, ns(dur)))
    for i in range(voices):
        y = G.babble(dur, r, r.uniform(95, 230), r.uniform(0.9, 1.2), rate=rate)
        out += pan(y[: out.shape[1]], r.uniform(-0.8, 0.8))
    return out


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    # beds: surf + breeze wherever we are on the beach or the dune
    beach = [(0, 143), (143, 771), (771, 1095), (1827, 1928)]
    for a, e in beach:
        cue(b, fades(surf(F(e - a) + 0.3, r), 0.25, 0.3), a, -21 if a < 771 else -24, "surf", "integrated")
    for a, e, db in [(771, 1095, -27), (1095, 1538, -26), (1928, 2017, -28)]:
        cue(b, fades(G.breeze(F(e - a) + 0.2, r), 0.3, 0.3), a, db, "breeze", "integrated")
    for f in [18, 150, 196, 320, 372, 588, 946, 980]:
        cue(b, gull(r), f, -17, "gull", p=float(r.uniform(-0.7, 0.7)))
    for f in [656, 663, 670, 676, 683]:
        cue(b, gull(r), f, -13, "gulls, hungry", p=float(r.uniform(-0.5, 0.5)))
    cue(b, buzz(F(22), r), 86, -20, "flies", "integrated")
    cue(b, buzz(F(70), r), 318, -27, "flies", "integrated")
    cue(b, buzz(F(50), r), 1829, -24, "flies", "integrated")
    # hook
    cue(b, thunk(r, 180), HOOK_PUSH + 3, -9, "plunger")
    cue(b, boom(r, 0.9, 2.2), HOOK_BOOM, +1, "hook boom")
    # the smell
    for k, f in enumerate([240, 252, 262, 271, 283, 291, 298]):
        cue(b, G.oof(r, "ugh" if k % 2 else "ow", base=float(r.uniform(100, 220))), f, -14, "ugh", p=float(r.uniform(-0.6, 0.6)))
    cue(b, crowd(F(143 - 0) * 0 + F(95), r, 8), 143, -25, "murmur", "integrated")
    # the department arrives, the boulder idea
    cue(b, blip(500, 1100, 0.14), 486, -12, "idea")
    cue(b, blip(300, 900, 0.1), BOULDER, -9, "pop")
    cue(b, thunk(r, 70), BOULDER + 1, -9, "boulder thud")
    for f in [574, 606, 638]:
        cue(b, thunk(r, 420), f, -15, "pointer tap")
    # twenty cases
    for k in range(20):
        f = CRATES0 + (CRATES1 - CRATES0) * k / 20
        cue(b, thunk(r, float(r.uniform(95, 140))), f, -10 + (k % 3), "crate", p=(k % 5 - 2) * 0.25)
    # the man who knows
    cue(b, crowd(F(160), r, 6, 3.4), 771, -28, "murmur", "integrated")
    wh = np.concatenate([blip(1250, 1250, 0.22, 0.004), np.zeros(ns(0.04)), blip(1500, 1400, 0.2, 0.004), np.zeros(ns(0.04)), blip(1250, 1180, 0.3, 0.004)])
    cue(b, wh, 862, -15, "engineer whistles", p=-0.4)
    # everyone walks off
    cue(b, steps(F(60), r, 14), 933, -19, "feet on sand", "integrated")
    cue(b, crowd(F(60), r, 9), 933, -24, "murmur", "integrated")
    cue(b, whirr(F(1095 - 1012), r), 1012, -22, "film camera", "integrated")
    cue(b, thunk(r, 210), PLUNGE + 3, -7, "plunger")
    cue(b, squirt(r)[::-1].copy(), PLUNGE - 8, -15, "plunger zip")
    # THE BLAST
    cue(b, boom(r, 1.4, 4.0), BLAST, +4, "the blast")
    deb = np.zeros(ns(3.5))
    for k in range(60):
        t0 = 0.3 + r.exponential(0.9)
        if t0 < 3.2: deb[ns(t0): ns(t0) + ns(0.12)] += lp(r.standard_normal(ns(0.12)), 1800) * np.exp(-np.arange(ns(0.12)) / SR / 0.02) * r.uniform(0.2, 0.8)
    cue(b, widen(deb, r, 13, 0.8), BLAST, -12, "sand and bits raining")
    for f in [1100, 1104, 1109]:
        cue(b, gull(r), f, -14, "gulls flee", p=float(r.uniform(-0.8, 0.8)))
    # cheer, then the look up
    nA = ns(F(SHOCK - 1128)); envA = np.clip(np.arange(nA) / SR / 0.6, 0, 1) * np.clip((nA - np.arange(nA)) / SR / 0.35, 0, 1)
    cue(b, G.applause(F(SHOCK - 1128), r, 30, envA), 1128, -15, "applause", "integrated")
    for k in range(9):
        cue(b, G.hurrah(r, float(r.uniform(110, 260)), float(r.uniform(0.9, 1.15)), kid=k % 4 == 0), 1132 + k * 6 + int(r.integers(0, 4)), -13, "hurrah", p=float(r.uniform(-0.7, 0.7)))
    for k in range(5):
        cue(b, G.whoa(r), SHOCK + k * 3, -13, "uh-oh", p=float(r.uniform(-0.6, 0.6)))
    # the fall: slide whistles through "starts coming down" and the Luckily line
    for f, f0, d in [(1196, 2100, 1.2), (1205, 1700, 1.0), (1296, 1500, 1.15), (1318, 1800, 1.0), (1336, 1300, 0.95)]:
        cue(b, slide(f0, f0 * 0.3, d), f, -17, "falling", p=float(r.uniform(-0.5, 0.5)))
    # landing
    for f, sz, db in [(HIT1, 1.0, -5), (HIT2, 0.9, -6), (HIT3, 1.4, -2)]:
        cue(b, splat(r, sz), f, db, "SPLAT")
    for k, f in enumerate([HIT1 + 3, HIT2 + 3, HIT3 + 2, HIT3 + 6, HIT3 + 11]):
        cue(b, G.oof(r, ["oh", "ow", "oof", "ugh", "ow"][k], base=float(r.uniform(110, 240))), f, -9, "oof", p=float(r.uniform(-0.6, 0.6)))
    for k in range(22):   # the rain of chunks (shot 18 and under the car line)
        f = 1380 + int(r.uniform(0, 92))
        cue(b, splat(r, float(r.uniform(0.6, 1.1))), f, float(r.uniform(-13, -8)), "splat", p=float(r.uniform(-0.9, 0.9)))
    for k in range(10):
        f = 1384 + int(r.uniform(0, 50))
        cue(b, G.whoa(r, base=float(r.uniform(180, 330)), dur=float(r.uniform(0.3, 0.5))), f, -13, "scream", p=float(r.uniform(-0.8, 0.8)))
    cue(b, steps(F(50), r, 16), 1384, -18, "running", "integrated")
    # the car
    cue(b, slide(1500, 380, 1.3), 1441, -13, "slab falling")
    cue(b, crunch(r), SLAB, +2, "CRUNCH")
    cue(b, splat(r, 1.5), SLAB + 1, -4, "slab splat")
    cue(b, horn(1.5), SLAB + 4, -11, "horn dying", p=0.15)
    hub = np.zeros(ns(1.5))
    for k in range(9):
        t0 = 0.1 + 1.25 * (1 - 0.82 ** k) / (1 - 0.82 ** 9); y = G.clink(r, f0=2100, dur=0.1)
        hub[ns(t0): ns(t0) + len(y)] += y * 0.9 ** k
    cue(b, hub, SLAB + 6, -15, "hub cap", p=-0.5)
    # the explanation
    cue(b, blip(500, 1100, 0.14), 1545, -13, "idea")
    pf = lp(R.standard_normal(ns(0.5)), 2500) * env_ad(ns(0.5), 0.01, 0.12)
    cue(b, pf, POOF, -11, "poof")
    for k, m in enumerate([84, 88, 91, 96]):
        cue(b, I.glock(I.m2f(m), 0.5, r, 1.0), POOF + 2 + 2 * k, -15, "sparkle")
    cue(b, boom(r, 0.8, 2.0), REPLAY, -3, "replay boom")
    cue(b, G.whoosh(1.2, r, 0.15), REPLAY, -10, "everything outward")
    # ketchup
    cue(b, thunk(r, 85), STOMP, -5, "stomp")
    cue(b, squirt(r), STOMP, -6, "squirt")
    for f in [1716, 1722, 1741, 1760, 1792]:
        cue(b, blip(900, 500, 0.06), f, -20, "drip", p=float(r.uniform(-0.5, 0.5)))
    # after
    cue(b, gull(r, True), 1893, -24, "one far gull", p=-0.6)
    cue(b, blip(700, 420, 0.05), 1958, -21, "drip")
    # the sale: till bell on "Get a"
    cue(b, I.triangle(0.8, r, 1.4, 2100.0), 2058, -9, "ka-ching")
    cue(b, thunk(r, 150), 2060, -11, "till drawer")
    # camera moves (whooshes peak on the glide centres) and cuts on big jumps
    for f in [114, 195, 352, 609, 641, 747, 1193, 1314, 1513, 1643, 1789, 1968, 2056]:
        cue(b, G.whoosh(0.5, r, 0.45), f - 7, -19, "whoosh")
    # one short room for everything, wide and dry enough to stay cartoon
    ir = make_ir(0.9, 7, hf=1.4)
    return b + 0.12 * convolve_st(b, ir)


# ---------------------------------------------------------------- score
M = I.m2f
Q = 0.5  # 120 bpm: one beat = 15 frames


def build_music():
    b = np.zeros((2, N)); r = rng(12)
    def note(fn, t, m, vel, p=0.0, **kw):
        y = fn(M(m), **kw) if "dur" in kw and fn is I.brass else fn(M(m), vel, r, **kw) if fn is not I.brass else None
        place(b, pan(y, p), t)
    tuba = lambda t, m, d=0.36, v=0.6: place(b, pan(I.brass(M(m), d, v, r, "tuba"), -0.15), t)
    horn_ = lambda t, m, d=0.2, v=0.4, p=0.3: place(b, pan(I.brass(M(m), d, v, r, "horn"), p), t)
    stab = lambda t, ms, d=0.3, v=0.8: [place(b, pan(I.brass(M(m), d, v, r, "stab"), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    pl = lambda t, m, v=0.6, p=0.25: place(b, pan(I.pluck(M(m), v, r), p), t)
    gl = lambda t, m, v=0.45: place(b, pan(I.glock(M(m), v, r, 1.2), -0.3), t)
    vib = lambda t, m, v=0.4, d=1.6: place(b, pan(I.vibes(M(m), v, r, d), 0.1), t)
    sn = lambda t, v=0.5: place(b, pan(I.snare(v, r), 0.1), t)
    # chords (root midi for the tuba, triad for the after-beats): C F G7 C | Am Dm G7 C
    PROG = [(36, [60, 64, 67]), (41, [60, 65, 69]), (43, [59, 62, 65]), (36, [60, 64, 67]), (45, [60, 64, 69]), (38, [62, 65, 69]), (43, [59, 62, 67]), (36, [60, 64, 67])]
    TUNE = [  # our own little seaside tune, one bar per row: (beat, midi)
        [(0, 72), (1, 76), (2, 79), (3, 76)], [(0, 77), (1.5, 76), (2, 74), (3, 72)], [(0, 74), (1, 71), (2, 67), (3, 71)], [(0, 72), (2, 67)],
        [(0, 76), (1, 72), (2, 69), (3, 72)], [(0, 74), (1.5, 77), (2, 74), (3, 69)], [(0, 71), (1, 74), (2, 79), (3, 77)], [(0, 76), (1, 72), (2, 72)]]
    def oompah(t0, bars, vel=0.55, tune=True, fn=pl, start=0, double=False):
        for k in range(bars):
            root, tri = PROG[(start + k) % 8]; t = t0 + k * 4 * Q
            for beat in range(4):
                if beat % 2 == 0: tuba(t + beat * Q, root + (7 if beat == 2 else 0), 0.34, vel)
                else: [horn_(t + beat * Q, m, 0.16, vel * 0.55, 0.3) for m in tri]
                if double: sn(t + beat * Q + Q / 2, 0.3)
            if tune:
                for beat, m in TUNE[(start + k) % 8]: fn(t + beat * Q, m, vel + 0.1)
    # --- hook: three rising stabs and a roll into the bang
    for k, ms in enumerate([[60, 64, 67], [62, 65, 69], [64, 67, 71]]): stab(0.1 + k * 1.0, ms, 0.35, 0.6 + 0.1 * k)
    for k in range(4): pl(0.6 + k * 1.0, 48 + 2 * k, 0.5)
    for tt_, vv in I.snare_roll(3.0, F(HOOK_BOOM), 0.2, 0.9, r): place(b, pan(I.snare(min(1.0, vv), r, 0.2, buzz=True), 0.1), tt_)
    place(b, st(I.cymbal(0.8, r, 2.4)), F(HOOK_BOOM))
    # --- the story: jaunty seaside two-step from the beach to the dynamite (4.8 s .. 25.6 s = 10 bars + 2 beats)
    t0 = F(146)
    oompah(t0, 10, 0.5)
    # --- the man who knows: the band drops out, a lone plucked bass walks, and stops dead on "Nobody listens"
    for k, m in enumerate([36, 43, 40, 43, 36, 43, 41, 38]): pl(F(771) + k * Q * 1.25, m, 0.45, -0.1)
    # --- backing off, the crew, the plunger: snare and timpani build
    tb = F(933)
    for k in range(int((F(BLAST) - tb) / Q)):
        t = tb + k * Q; v = 0.25 + 0.6 * k / 11
        place(b, pan(I.timpani(M(36 if k % 2 == 0 else 43), v, r, 1.0), -0.2), t)
        for s in range(4): sn(t + s * Q / 4, v * (0.9 if s == 0 else 0.5))
    stab(F(PLUNGE) - 0.02, [55, 59, 62, 65], 0.5, 0.8)
    # --- the blast: nothing but the bang, then a proud fanfare ... that droops when the whale turns round
    tf = F(1128)
    for k, (ms, d) in enumerate([([60, 64, 67], 0.25), ([60, 64, 67], 0.25), ([65, 69, 72], 0.25), ([67, 71, 74], 0.9)]):
        stab(tf + [0, 0.33, 0.66, 1.0][k], ms, d, 0.85)
    place(b, st(I.cymbal(0.6, r, 2.0)), tf + 1.0)
    for i, m in enumerate([67, 71, 74]): place(b, pan(I.brass(M(m), 1.3, 0.7, r, "horn", fall=-7.0), 0.2 * (i - 1)), F(1191))
    # --- luckily: one sweet chord; unluckily: nothing (the splats play it)
    for m in [60, 64, 67, 72]: vib(F(1236), m, 0.45, 2.2)
    for m in [65, 69, 72, 76]: vib(F(1270), m, 0.4, 1.6)
    # --- the rain: the two-step again at double speed, snare chattering, until the roof goes
    tr = F(1384)
    for k in range(int((F(SLAB) - tr) / (2 * Q))):
        root, tri = PROG[k % 8]; t = tr + k * 2 * Q
        tuba(t, root, 0.2, 0.7); [horn_(t + Q / 2, m, 0.1, 0.4) for m in tri]; tuba(t + Q, root + 7, 0.2, 0.7); [horn_(t + 1.5 * Q, m, 0.1, 0.4) for m in tri]
        for s in range(4): sn(t + s * Q / 2, 0.45 if s % 2 else 0.3)
        gl(t, TUNE[k % 8][0][1] + 12, 0.4); gl(t + Q, TUNE[k % 8][-1][1] + 12, 0.35)
    # --- "You see": warm and slow, vibes over a pad
    te = F(1540)
    for k, tri in enumerate([[57, 60, 64], [53, 57, 60], [55, 59, 62], [48, 55, 64]]):
        place(b, st(I.pad([M(m) for m in tri], 2.4, 0.4, r)), te + k * 2.5) if hasattr(I, "pad") else None
        for i, m in enumerate(tri): vib(te + k * 2.5 + i * 0.4, m + 12, 0.35, 1.8)
    # --- ketchup: pizzicato tiptoe
    tk = F(1694)
    for k, m in enumerate([60, 64, 67, 64, 65, 69, 72, 69, 67, 71, 74, 71, 72, 67, 64, 60]): pl(tk + k * Q / 2 * 1.08, m, 0.5, 0.3 * math.sin(k))
    # --- what is left: the saddest tuba, three notes down
    for k, m in enumerate([55, 54, 53, 52]): place(b, pan(I.brass(M(m), 0.62 if k < 3 else 1.5, 0.6, r, "tuba", fall=-1.5 if k == 3 else 0.0), 0), F(1834) + k * 0.68)
    # --- the owner: one bass note per blink
    for k, m in enumerate([36, 36, 43]): pl(F(1932) + k * 1.0, m, 0.45, 0)
    # --- the sale: a cheesy showroom jingle, and a button on the last word
    tj = F(2018)
    for k, m in enumerate([72, 76, 79, 84, 79, 76, 77, 81, 84, 81]): gl(tj + k * Q / 2, m, 0.5)
    oompah(tj, 1, 0.5, tune=False)
    stab(F(2083), [60, 64, 67, 72], 0.5, 0.9); tuba(F(2083), 36, 0.6, 0.8); place(b, st(I.cymbal(0.5, r, 1.2)), F(2083))
    return b + 0.18 * convolve_st(b, make_ir(1.3, 3, hf=1.2))


# ---------------------------------------------------------------- mix
def limiter(x, ceil_db=-1.2, look=0.003, rel=0.08):
    c = dbg(ceil_db); n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12)); La = max(1, ns(look))
    g = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g = ndimage.minimum_filter1d(g, ns(rel), mode="nearest", origin=-(ns(rel) // 2) + 1) if False else g
    g = np.minimum(ndimage.uniform_filter1d(ndimage.minimum_filter1d(g, ns(rel / 4), mode="nearest"), ns(rel / 2), mode="nearest"), 1.0)
    return x * g[None, :]


def main():
    global VREF
    v, sr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
    v = signal.resample_poly(v.mean(0), SR, sr)
    voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]; voice = st(voice)
    VREF = integrated(voice)
    words = json.load(open(os.path.join(HERE, "..", "voice", "whisper_raw.json")))
    sfx = build_sfx() * dbg(-6.0)                     # house standard: SFX -6 dB
    mus = build_music()
    # duck the band under speech (key = the word timings), then set it 10 LU under the voice (+3 dB house standard)
    ctrl = np.zeros(N)
    for w in words: ctrl[max(0, ns(w["a"] - 0.08)): ns(w["b"] + 0.12)] = 1.0
    env = ndimage.uniform_filter1d(ctrl, ns(0.25))
    mus = mus * dbg(-3.0 * env)[None, :]
    mus = mus * dbg((VREF - 10.0) - integrated(mus))
    mix = voice + sfx + mus
    mix = mix * dbg(-15.0 - integrated(mix))
    mix = limiter(mix, -1.6)
    tp = true_peak(mix)
    if tp > -1.0: mix = mix * dbg(-1.0 - tp)
    for name, x in [("mix", mix), ("stem_voice", voice), ("stem_music", mus), ("stem_sfx", sfx)]:
        write_wav(os.path.join(HERE, name + ".wav"), x)
    with open(os.path.join(HERE, "cues.md"), "w") as f:
        f.write(f"# Sound cues (frame, time, cue, level vs voice in LU)\n\nvoice {VREF:.1f} LUFS, mix {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP, {N / SR:.3f} s\n\n")
        for fr_, name, db in sorted(CUES): f.write(f"- {int(fr_):5d}  {fr_ / FPS:6.2f} s  {name}  ({db:+.0f})\n")
    print(f"voice {VREF:.1f} LUFS | mix {integrated(mix):.1f} LUFS | peak {true_peak(mix):.1f} dBTP | music {integrated(mus):.1f} | sfx {integrated(sfx):.1f} | {N / SR:.3f} s")


if __name__ == "__main__":
    main()
