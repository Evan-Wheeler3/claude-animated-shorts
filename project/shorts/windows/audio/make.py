# Sound for "Why Plane Windows Are Round": the narration (untouched) + synthesized SFX + a small original score, all numpy.
# Every cue sits on a picture frame from src/videos/windows/story.ts (30 fps). Output: mix.wav (48 kHz stereo, exact
# length), stems, cues.md.  usage: python make.py   (run from this folder; needs numpy + scipy)
import os, json, math
import numpy as np
from scipy import signal, ndimage
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, peq, colored, smooth_noise, fades, phase, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, momentary_max, true_peak, norm_to, read_wav, write_wav)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 1986
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
# beats (frames) from story.ts
CRACK1, CRACK2, WINDOWS, FAST, QUIET, SQUARE, TWO = 111, 122, 193, 304, 319, 357, 423
LOWER, PUMP, FLIGHTS0, FLIGHTS1, SPLIT, CORNER, WHY = 565, 622, 682, 745, 778, 818, 851
BREATHE, SWELL, SHRINK, LAND, FLOW, ROCK, ROUND, SQ, SHARP = 946, 1047, 1124, 1158, 1202, 1270, 1322, 1411, 1459
EVERY, CLIP, NOTFIRST, SNAP, TODAY, HOLE, DING, ATTEND, STOP = 1501, 1561, 1620, 1682, 1763, 1809, 1840, 1887, 1896
R = rng(1954)
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


def shot(r, big=1.0):
    n = ns(0.22); t = np.arange(n) / SR
    crack = hp(r.standard_normal(n), 1400) * np.exp(-t / 0.006) * 1.3
    body = lp(r.standard_normal(n), 900) * np.exp(-t / 0.03) * 1.2 + np.sin(phase(95 * (1 + 0.8 * np.exp(-t / 0.01)))) * np.exp(-t / 0.035) * 1.1
    return np.tanh(1.5 * big * (crack + body))


def burst(r, dur, rate=9.2):
    """Lewis gun: about 550 rounds a minute, with its ratchety magazine"""
    out = np.zeros(ns(dur + 0.4)); k = 0
    while k / rate < dur:
        y = shot(r, r.uniform(0.85, 1.0)); a = ns(k / rate + r.normal(0, 0.003)); a = max(0, a); out[a:a + len(y)] += y
        c = G.clink(r, f0=2600, dur=0.05); b = a + ns(0.04); out[b:b + len(c)] += 0.12 * c
        k += 1
    return out


def ricochet(r):
    d = r.uniform(0.35, 0.55); n = ns(d); t = np.arange(n) / SR
    f = r.uniform(2600, 3600) * (0.45 + 0.55 * np.exp(-t / 0.12)) * (1 + 0.03 * np.sin(TAU * 38 * t))
    return fades(np.sin(phase(f)) * np.exp(-t / 0.16) + hp(r.standard_normal(n), 3000) * np.exp(-t / 0.004) * 0.6, 0.0005, 0.05)


def patter(dur, r, rate, bright=1300):
    n = ns(dur); y = np.zeros(n); tm = 0.0
    while tm < dur - 0.15:
        L = ns(0.07); tl = np.arange(L) / SR; i = ns(tm)
        y[i:i + L] += lp(r.standard_normal(L), r.uniform(bright * 0.7, bright * 1.4)) * np.exp(-tl / 0.014) * r.uniform(0.3, 1.0)
        tm += r.exponential(1 / rate)
    return widen(y, r, 15, 0.9)


def coin(r):
    return G.clink(r, f0=float(r.uniform(3400, 5200)), dur=0.16, bright=1.4)



def glass_smash(r, big=1.0):
    n = ns(0.9); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(40):
        a = ns(r.exponential(0.06)); L = min(n - a, ns(0.2))
        if L <= 10: continue
        tl = np.arange(L) / SR
        y[a:a + L] += np.sin(TAU * r.uniform(2500, 9000) * tl) * np.exp(-tl / r.uniform(0.01, 0.06)) * r.uniform(0.2, 0.8)
    y += hp(r.standard_normal(n), 2000) * np.exp(-t / 0.03) * 1.2 * big
    return fades(y, 0.0005, 0.1)


def splash(r):
    n = ns(0.5); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 600, 5000) * smooth_noise(n, r, 40) ** 2 * np.exp(-t / 0.12) * 1.6 + lp(r.standard_normal(n), 900) * np.exp(-t / 0.03), 0.002, 0.05)


def click(r, f0=1800):
    return fades(G.clink(r, f0=f0, dur=0.06, bright=0.6), 0.0003, 0.01)


def cock(r):
    """single-action hammer coming back: a ratchety double click"""
    out = np.zeros(ns(0.22))
    for k, (dt, f0) in enumerate([(0.0, 1400), (0.07, 2200), (0.12, 3100)]):
        y = click(r, f0); a = ns(dt); out[a:a + len(y)] += y * (1 - 0.2 * k)
    return out


def tick(r):
    n = ns(0.03); t = np.arange(n) / SR
    return fades(np.sin(TAU * 2400 * t) * np.exp(-t / 0.006) + hp(r.standard_normal(n), 3000) * np.exp(-t / 0.002) * 0.3, 0.0002, 0.005)


def spurs(r, n=3):
    out = np.zeros(ns(0.4 * n + 0.3))
    for i in range(n):
        for k in range(3):
            y = G.clink(r, f0=float(r.uniform(3800, 5200)), dur=0.12); a = ns(0.4 * i + 0.03 * k); out[a:a + len(y)] += y * (0.6 if k else 1.0)
    return out


def caw(r):
    d = 0.6; n = ns(d); t = np.arange(n) / SR
    f = 260 * (1 + 0.3 * np.sin(np.pi * t / d)) * (1 + 0.02 * smooth_noise(n, r, 30))
    y = bp(np.sign(np.sin(phase(f))) + 0.6 * r.standard_normal(n), 400, 2600) * np.sin(np.pi * t / d) ** 0.7
    return fades(y, 0.01, 0.05)


def rustle(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 1500, 7000) * (0.4 + 0.6 * smooth_noise(n, r, 9) ** 2) * (np.sin(TAU * 1.6 * t) > -0.3) * 0.7, 0.05, 0.1)



def jet(dur, r, near=1.0):
    n = ns(dur); t = np.arange(n) / SR
    roar = lp(colored(n, r, 0.9), 900) * 0.8 + bp(r.standard_normal(n), 1800, 6000) * 0.25 * near
    whine = sum(np.sin(phase(f0 * (1 + 0.002 * smooth_noise(n, r, 2)))) * a for f0, a in [(2400, 0.06), (3600, 0.03)]) * near
    return widen(fades(roar + whine, 0.3, 0.3), r, 14, 0.7)


def metal_groan(r, dur=1.0):
    return G.creak(dur, r, 40, 70, G.CHAIN, rough=0.2)


def crackle(r, dur=0.6):
    n = ns(dur); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(30):
        a = ns(r.uniform(0, dur * 0.9)); L = min(n - a, ns(0.04))
        if L > 10: tl = np.arange(L) / SR; y[a:a + L] += hp(r.standard_normal(L), 2500) * np.exp(-tl / 0.006) * r.uniform(0.3, 1)
    return fades(y + metal_groan(r, dur)[:n] * 0.5, 0.002, 0.05)


def hiss(dur, r, rise=True):
    n = ns(dur); t = np.arange(n) / SR
    e = np.clip(t / dur, 0, 1) if rise else np.clip(1 - t / dur, 0, 1)
    return fades(bp(r.standard_normal(n), 1500, 8000) * (0.3 + 0.7 * e), 0.05, 0.1)


def pump(r):
    n = ns(0.35); t = np.arange(n) / SR
    return fades(lp(r.standard_normal(n), 400) * np.exp(-t / 0.08) * 1.5 + np.sin(phase(60 * (1 + 0.5 * np.exp(-t / 0.03)))) * np.exp(-t / 0.1), 0.002, 0.05)


def splash(r, big=1.0):
    n = ns(1.4); t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 400, 5000) * smooth_noise(n, r, 30) ** 2 * np.exp(-t / (0.35 * big)) * 1.6 + lp(r.standard_normal(n), 500) * np.exp(-t / 0.08)
    return fades(y + G.bubbles(1.4, r, 30, 300, 1600, env=np.exp(-t / 0.5)) * 0.5, 0.002, 0.1)


def screech(r):
    n = ns(0.7); t = np.arange(n) / SR
    y = np.sin(phase(1400 * (1 + 0.05 * smooth_noise(n, r, 20)))) * np.exp(-t / 0.25) * 0.6 + bp(r.standard_normal(n), 1000, 4000) * np.exp(-t / 0.2)
    return fades(y, 0.005, 0.1)


def chime(r):
    out = np.zeros(ns(1.6))
    for k, m in enumerate([76, 72]):
        y = I.vibes(I.m2f(m), 0.6, r, 1.2); a = ns(0.32 * k); out[a:a + len(y)] += y[: len(out) - a]
    return out


def cabin_hum(dur, r):
    n = ns(dur)
    return widen(fades(lp(colored(n, r, 1.1), 450) * 0.8 + bp(r.standard_normal(n), 300, 1200) * 0.08, 0.3, 0.3), r, 12, 0.5)


def stream(dur, r):
    n = ns(dur)
    return widen(fades(bp(r.standard_normal(n), 800, 6000) * (0.5 + 0.5 * smooth_noise(n, r, 12)) ** 2, 0.3, 0.3) + G.bubbles(dur, r, 14, 400, 2000) * 0.3, r, 15, 0.8)


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    sky = [(0, 215), (300, 387), (880, 1115)]
    for a, e in sky: cue(b, jet(F(e - a) + 0.2, r), a, -18, "jet at cruise", "integrated")
    cue(b, fades(G.breeze(F(1715 - 1175) + 0.2, r), 0.3, 0.3), 1175, -30, "air", "integrated")
    # the hook: two cracks, a deep thump (bloodless), creaks
    for f in [CRACK1, CRACK2]: cue(b, crackle(r, 0.5), f, -4, "metal cracks")
    cue(b, boom(r, 0.6, 1.6), 142, -8, "muffled thump")
    cue(b, metal_groan(r, 1.2), 150, -12, "groan")
    cue(b, blip(320, 220, 0.25), WINDOWS + 2, -16, "uh-oh")
    # 1950s airport
    cue(b, crowd(F(85), r, 8, 3.8), 215, -26, "airport murmur", "integrated")
    cue(b, jet(F(19), r, 1.6) * 1.0, FAST - 6, -6, "fly-by")
    cue(b, G.whoosh(1.0, r, 0.35), FAST - 4, -8, "whoosh")
    cue(b, G.oof(r, "oh", base=120), QUIET + 6, -20, "snore")
    # the newspaper
    cue(b, G.hurrah(r, 260, 1.1, kid=True), 395, -12, "newsboy shouts", p=-0.3)
    cue(b, G.hurrah(r, 260, 1.1, kid=True), TWO + 4, -11, "newsboy, again", p=-0.3)
    cue(b, G.whoa(r, base=140), TWO + 8, -12, "gasp")
    # the tank
    cue(b, metal_groan(r, 2.0), 520, -16, "crane")
    cue(b, splash(r, 1.3), LOWER + 30, -4, "fuselage into the water")
    k, f = 0, PUMP
    while f < FLIGHTS1:
        cue(b, pump(r), f, -10 if f < FLIGHTS0 else -14, "pump"); f += 16 if f < FLIGHTS0 else 5
    for k in range(40):
        fr = FLIGHTS0 + (FLIGHTS1 - FLIGHTS0) * (k / 40) ** 0.5
        cue(b, tick(r), fr, -14, "counter flips")
    cue(b, crackle(r, 1.4), SPLIT, -4, "the crack runs")
    cue(b, G.whoa(r, base=110), CORNER + 6, -12, "engineers gasp")
    cue(b, blip(400, 900, 0.18), WHY + 4, -12, "question")
    # thin air, the balloon
    cue(b, I.glock(I.m2f(88), 0.4, r, 0.4), BREATHE - 20, -16, "bird squeak")
    cue(b, I.glock(I.m2f(86), 0.4, r, 0.4), BREATHE - 12, -16, "bird squeak")
    cue(b, hiss(F(80), r, True), 990, -11, "air pumped in")
    cue(b, slide(300, 700, 1.4), SWELL, -14, "swelling")
    cue(b, hiss(F(40), r, False), SHRINK, -12, "air let out")
    cue(b, slide(700, 300, 1.0), SHRINK, -15, "shrinking")
    cue(b, screech(r), LAND, -6, "tyres touch down")
    # flow, rock, corners
    cue(b, stream(F(54), r), 1265, -14, "stream", "integrated")
    for f in [SHARP - 4, SHARP + 4, SHARP + 12, SHARP + 18]: cue(b, crackle(r, 0.25), f, -12, "corner stress", p=float(r.uniform(-0.5, 0.5)))
    for k in range(4): cue(b, pump(r), EVERY + k * 12, -14, "every flight")
    # the paperclip
    for k in range(8): cue(b, metal_groan(r, 0.3), CLIP + k * 12, -16, "bend", p=0.2)
    cue(b, click(r, 4200), SNAP, -3, "snap")
    cue(b, cock(r), SNAP + 1, -10, "ping")
    # today, the cabin
    cue(b, jet(F(80), r, 0.7), 1715, -22, "modern jet", "integrated")
    cue(b, cabin_hum(F(TOTAL - 1795), r), 1795, -24, "cabin hum", "integrated")
    for k in range(4): cue(b, chime(r), DING + k * 12, -12, "call button")
    cue(b, G.stroll_step(r, 0.3), ATTEND + 2, -16, "steps"); cue(b, G.stroll_step(r, 0.3), ATTEND + 12, -16, "steps")
    for f in [62, 182, 252, 334, 548, 676, 792, 1040, 1215, 1448, 1752, 1803]:
        cue(b, G.whoosh(0.5, r, 0.45), f - 7, -21, "whoosh")
    return b + 0.1 * convolve_st(b, make_ir(0.8, 7, hf=1.5))


# ---------------------------------------------------------------- score
M = I.m2f
Q = 0.5


def build_music():
    b = np.zeros((2, N)); r = rng(54)
    pl = lambda t, m, v=0.5, p=0.2: place(b, pan(I.pluck(M(m), v, r, 0.9, 0.6), p), t)
    vib = lambda t, m, v=0.4, d=1.6: place(b, pan(I.vibes(M(m), v, r, d), 0.1), t)
    gl = lambda t, m, v=0.4: place(b, pan(I.glock(M(m), v, r, 1.2), -0.3), t)
    bass = lambda t, m, v=0.5: place(b, pan(I.pluck(M(m), v, r, 1.2, 0.3), -0.2), t)
    stab = lambda t, ms, d=0.3, v=0.8: [place(b, pan(I.brass(M(m), d, v, r, "stab"), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    # the hook: a jaunty 1950s jet-age fanfare that falls apart on the cracks
    for k, ms in enumerate([[60, 64, 67], [62, 65, 69], [64, 67, 72]]): stab(0.15 + k * 0.6, ms, 0.25, 0.6)
    place(b, pan(I.brass(M(48), 1.4, 0.7, r, "tuba", fall=-7.0), 0), F(CRACK2))
    # the 1950s: bright vibraphone swing, C major
    PROG = [(48, [64, 67, 71]), (45, [64, 67, 72]), (50, [65, 69, 72]), (43, [65, 67, 71])]
    TUNE = [76, 79, 81, 79, 76, 74, 72, 74]
    def swing(t0, t1, vel=0.4, tune=True):
        k = 0
        while t0 + k * 2 * Q < t1 - 0.1:
            root, tri = PROG[(k // 2) % 4]; t = t0 + k * 2 * Q
            bass(t, root, vel); bass(t + Q, root + 7, vel * 0.8)
            for i, m in enumerate(tri): vib(t + Q * 0.66 + 0.01 * i, m, vel * 0.5, 0.8)
            if tune: gl(t, TUNE[k % 8], vel); gl(t + Q, TUNE[(k + 3) % 8], vel * 0.8)
            k += 1
    swing(F(216), F(387))
    # the crashes: one low note, then a curious detective pizzicato for the tank test
    place(b, pan(I.brass(M(43), 1.6, 0.5, r, "soft"), 0), F(TWO))
    for k in range(int((F(SPLIT) - F(475)) / Q)):
        t = F(475) + k * Q
        bass(t, [45, 52, 48, 52][k % 4], 0.45)
        if k % 2: pl(t + Q / 2, [69, 72, 76, 72][(k // 2) % 4], 0.35)
    stab(F(SPLIT) - 0.02, [57, 60, 63, 66], 0.6, 0.8)
    # the explanation: calm, curious vibes over a pad; the corner gets a dissonant cluster
    te = F(880)
    for k, tri in enumerate([[60, 64, 67], [57, 60, 64], [65, 69, 72], [55, 59, 62]] * 3):
        t = te + k * 1.6
        if t > F(1700): break
        place(b, st(I.pad([M(m) for m in tri], 1.4, 0.35, r)), t)
        for i, m in enumerate(tri): vib(t + i * 0.25, m + 12, 0.3, 1.2)
    for m in [72, 73, 78, 79]: vib(F(SHARP), m, 0.45, 1.4)
    # the payoff: the 1950s swing comes back modern and bright, and a button on the last word
    swing(F(1716), F(TOTAL) - 0.6, 0.38)
    stab(F(1930), [60, 64, 67, 72], 0.4, 0.7); place(b, st(I.cymbal(0.4, r, 1.2)), F(1930))
    return b + 0.15 * convolve_st(b, make_ir(1.1, 3, hf=1.3))


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
