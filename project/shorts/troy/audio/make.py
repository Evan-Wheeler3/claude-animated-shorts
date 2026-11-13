# Sound for "The Trojan Horse": the narration (untouched) + synthesized SFX + a small original score, all numpy.
# Every cue sits on a picture frame from src/videos/troy/story.ts (30 fps). Output: mix.wav (48 kHz stereo, exact
# length), stems, cues.md.  usage: python make.py   (run from this folder; needs numpy + scipy)
import os, json, math
import numpy as np
from scipy import signal, ndimage
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, peq, colored, smooth_noise, fades, phase, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, momentary_max, true_peak, norm_to, read_wav, write_wav)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 1816
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
# beats (frames) from src/videos/troy/story.ts
TRICK, PROBLEM, ILIAD, TEN, NOWHERE, BUILD, HIDE, SAIL, DRAG, CELEBRATE = 33, 77, 112, 129, 194, 214, 259, 295, 351, 400
BEWARE, SERPENTS, CRUSH, CLIMB, GATES, FALLS, EXCEPT, BARELY, ROMAN, THOUSAND, REALLY = 449, 507, 552, 586, 617, 635, 653, 730, 813, 846, 899
GROW, BIGGER, RAM, HIDES, QUAKE, POSEIDON, SHAKEN, REAL, SCHLIE, TURKEY, TRENCH, SMASH, WAR, GREEKS, IN3 = 980, 1044, 1123, 1162, 1205, 1232, 1345, 1384, 1468, 1491, 1527, 1603, 1667, 1686, 1766
R = rng(1184)
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


def morse(r, dur):
    out = np.zeros(ns(dur)); tm = 0.0; k = 0
    while tm < dur - 0.3:
        d = 0.07 if (k * 7) % 3 else 0.2; n = ns(d); t = np.arange(n) / SR
        out[ns(tm): ns(tm) + n] += np.sin(TAU * 800 * t) * np.clip(t / 0.004, 0, 1) * np.clip((d - t) / 0.004, 0, 1) * 0.6
        tm += d + 0.07 + (0.15 if k % 5 == 4 else 0); k += 1
    return out


def stamp(r):
    n = ns(0.4); t = np.arange(n) / SR
    return fades(lp(r.standard_normal(n), 1400) * np.exp(-t / 0.03) * 1.4 + np.sin(phase(110 * (1 + np.exp(-t / 0.01)))) * np.exp(-t / 0.06), 0.001, 0.05)


def zap(r):
    n = ns(0.6); t = np.arange(n) / SR
    return fades((bp(r.standard_normal(n), 2000, 9000) * (np.sin(TAU * 60 * t) > 0) + np.sin(phase(3000 * (1 + 0.3 * np.sin(TAU * 30 * t)))) * 0.3) * np.exp(-t / 0.15), 0.001, 0.05)


def horn(r, f0=110, dur=1.6):
    n = ns(dur); t = np.arange(n) / SR
    y = sum(np.sin(phase(f0 * k)) / k for k in range(1, 7)) * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    return lp(y, 900)


def waves(dur, r):
    n = ns(dur); t = np.arange(n) / SR; sw = 0.5 + 0.5 * np.sin(TAU * t / 5.5) ** 2; cn = colored(n, r, 0.9)
    return widen(fades(lp(cn, 900) * (1 - sw) * 0.6 + lp(cn, 2500) * sw * 0.5, 0.3, 0.3), r, 17, 0.8)


def helicopter(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    return widen(fades(lp(r.standard_normal(n), 500) * (0.5 + 0.5 * np.sign(np.sin(TAU * 11 * t))) * 1.2, 0.3, 0.3), r, 10, 0.4)


def hammering(dur, r, rate=3.2):
    out = np.zeros((2, ns(dur + 0.4))); tm = 0.0
    while tm < dur:
        y = G.hammer_hit(r, float(r.uniform(0.6, 1.0))); place(out, pan(y, float(r.uniform(-0.7, 0.7))), tm); tm += r.exponential(1 / rate) + 0.08
    return out


def saw(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    strokes = 0.5 + 0.5 * np.sin(TAU * 2.2 * t)
    return fades(bp(r.standard_normal(n), 1800, 6500) * strokes ** 2 * 0.8, 0.05, 0.1)


def rumble_roll(dur, r):
    """big wooden wheels on dirt: low grind with a slow wobble and creaks"""
    n = ns(dur); t = np.arange(n) / SR
    y = lp(colored(n, r, 1.2), 260) * (0.7 + 0.3 * np.sin(TAU * 1.1 * t)) * 1.4 + G.creak(dur, r, 60, 90, G.WOOD, rough=0.2)[:n] * 0.25
    return widen(fades(y, 0.4, 0.4), r, 11, 0.5)


def oars(dur, r):
    n = ns(dur); out = np.zeros(n); tm = 0.0
    while tm < dur - 0.6:
        L = ns(0.5); tl = np.arange(L) / SR; i = ns(tm)
        out[i:i + L] += bp(r.standard_normal(L), 500, 3000) * np.sin(np.pi * tl / 0.5) ** 3 * 0.7
        tm += 1.1
    return out


def serpent_hiss(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 3500, 9000) * (0.6 + 0.4 * np.sin(TAU * 3 * t)) * np.clip(t / 0.2, 0, 1), 0.05, 0.2)


def whinny(r):
    d = 1.0; n = ns(d); t = np.arange(n) / SR
    f = 700 * (1 + 0.5 * np.exp(-t / 0.2)) * (1 + 0.06 * np.sin(TAU * 18 * t))
    y = bp(np.sign(np.sin(phase(f))) * 0.6 + r.standard_normal(n) * 0.3, 500, 3500) * np.sin(np.pi * t / d) ** 0.6
    return fades(y, 0.02, 0.1)


def quake(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    e = np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 1.2, 0, 1)
    y = lp(colored(n, r, 1.4), 120) * 2.0 + lp(r.standard_normal(n), 600) * smooth_noise(n, r, 9) ** 2 * 0.8
    y += G.rattle(dur, r, 26, heavy=True)[:n] * 0.4
    return widen(fades(np.tanh(y * e * 1.5), 0.1, 0.3), r, 13, 0.5)


def crumble(r, dur=1.6):
    n = ns(dur); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(60):
        a = ns(r.exponential(0.35)); L = min(n - a, ns(0.15))
        if L > 10: tl = np.arange(L) / SR; y[a:a + L] += lp(r.standard_normal(L), r.uniform(600, 2500)) * np.exp(-tl / r.uniform(0.01, 0.04)) * r.uniform(0.3, 1)
    y += np.sin(phase(48 * (1 + np.exp(-t / 0.05)))) * np.exp(-t / 0.3) * 1.2
    return widen(fades(y, 0.001, 0.2), r, 9, 0.6)


def shovel(r):
    n = ns(0.45); t = np.arange(n) / SR
    scrape = bp(r.standard_normal(n), 900, 4500) * np.clip(t / 0.15, 0, 1) * np.exp(-t / 0.18)
    clink = G.clink(r, f0=float(r.uniform(1500, 2200)), dur=0.15); scrape[: len(clink)] += clink * 0.5
    return fades(scrape + lp(r.standard_normal(n), 500) * np.exp(-np.maximum(t - 0.3, 0) / 0.05) * (t > 0.3) * 0.8, 0.002, 0.05)


def digging(dur, r, rate=1.1):
    out = np.zeros((2, ns(dur + 0.6))); tm = 0.1
    while tm < dur:
        place(out, pan(shovel(r), float(r.uniform(-0.6, 0.6))), tm); tm += r.exponential(1 / rate) + 0.25
    return out


def paper(r, dur=0.7):
    n = ns(dur); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 1500, 7000) * smooth_noise(n, r, 25) ** 3 * 2.0, 0.01, 0.1)


def quill(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    strokes = (np.sin(TAU * 3.1 * t) > -0.2).astype(float)
    return fades(bp(r.standard_normal(n), 3000, 9000) * strokes * (0.5 + 0.5 * smooth_noise(n, r, 30)) * 0.5, 0.02, 0.1)


def sizzle(dur, r):
    n = ns(dur)
    y = hp(r.standard_normal(n), 3000) * (0.3 + 0.7 * smooth_noise(n, r, 40) ** 4) * 0.5
    return widen(fades(y, 0.3, 0.3), r, 9, 0.7)


def gate_creak(r, dur=1.4):
    return fades(G.creak(dur, r, 30, 55, G.WOOD, rough=0.25), 0.05, 0.2)


def fire(dur, r):
    n = ns(dur); y = lp(colored(n, r, 1.0), 700) * 0.5; y += crackle(r, dur)[:n] * 0.6
    return widen(fades(y, 0.3, 0.4), r, 12, 0.7)


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    for a, e in [(0, 126), (290, 337), (1365, 1681)]: cue(b, fades(G.breeze(F(e - a) + 0.2, r), 0.3, 0.3), a, -24, "wind", "integrated")
    cue(b, G.whoosh(1.2, r, 0.5), 20, -13, "push in"); cue(b, blip(500, 1000, 0.14), TRICK, -14, "trick")
    cue(b, paper(r), 92, -10, "scroll unrolls")
    cue(b, crowd(F(208 - 126), r, 8, 3.6), 126, -24, "camp", "integrated")
    for k in range(5): cue(b, stamp(r), TEN + 4 + k * 13, -13, "year ticks")
    cue(b, blip(600, 300, 0.3), NOWHERE, -10, "nowhere")
    cue(b, hammering(F(290 - BUILD), r), BUILD, -16, "hammering", "integrated"); cue(b, saw(F(250 - 220), r), 220, -20, "saw")
    cue(b, G.creak(0.6, r, 60, 90, G.WOOD), HIDE, -12, "hatch")
    cue(b, waves(F(337 - 290), r), 290, -18, "sea", "integrated"); cue(b, oars(F(337 - 290), r), 292, -18, "oars")
    cue(b, rumble_roll(F(400 - DRAG + 10), r), DRAG - 8, -16, "wheels", "integrated")
    cue(b, crowd(F(414 - 360), r, 12, 4.4), 360, -20, "crowd", "integrated")
    for k in range(5): cue(b, G.hurrah(r, float(r.uniform(120, 220)), 1.0), CELEBRATE + k * 3, -12, "cheer", p=float(r.uniform(-0.7, 0.7)))
    cue(b, G.whoa(r, base=170, dur=0.6), BEWARE - 2, -10, "priest shouts")
    cue(b, serpent_hiss(F(CRUSH - SERPENTS + 4), r), SERPENTS - 10, -12, "serpents hiss")
    cue(b, splash(r), SERPENTS - 12, -14, "out of the sea")
    cue(b, G.oof(r, "oof"), CRUSH + 4, -8, "crushed"); cue(b, pump(r), CRUSH, -6, "crush thump")
    cue(b, G.crickets(F(653 - 568), r), 568, -22, "night", "integrated")
    cue(b, gate_creak(r, 0.7), 573, -11, "hatch opens"); cue(b, G.whoosh(0.6, r, 0.4), CLIMB - 4, -16, "climb")
    for k in range(3): cue(b, G.boot(r), CLIMB + 6 + k * 8, -14, "lands")
    cue(b, gate_creak(r), GATES - 4, -8, "gates creak open")
    cue(b, G.hurrah(r, 150, 1.0), FALLS - 6, -12, "charge")
    cue(b, fire(F(653 - FALLS), r), FALLS, -16, "fire", "integrated")
    cue(b, paper(r, 0.9), 656, -10, "scroll"); cue(b, blip(900, 450, 0.3), BARELY, -10, "barely")
    cue(b, quill(F(860 - 790), r), 790, -18, "quill"); cue(b, blip(400, 1200, 0.2), THOUSAND, -9, "+1000")
    cue(b, blip(500, 700, 0.18, 0.2), REALLY, -12, "question")
    cue(b, sizzle(F(1086 - 920), r), 920, -24, "bbq", "integrated")
    cue(b, slide(300, 700, 1.4), GROW, -14, "fish grows"); cue(b, slide(500, 1100, 0.8), BIGGER, -12, "fish bigger")
    cue(b, G.hurrah(r, 300, 1.0, kid=True), BIGGER + 10, -16, "kids")
    for f0 in (RAM, RAM + 24): cue(b, boom(r, 0.5, 1.4), f0, -4, "ram")
    cue(b, G.whoa(r, base=200, dur=0.5), RAM + 34, -14, "grunt")
    cue(b, quake(F(1302 - QUAKE), r), QUAKE, -6, "earthquake")
    cue(b, crumble(r), QUAKE + 30, -10, "wall crumbles"); cue(b, chime(r), POSEIDON - 8, -12, "Poseidon")
    cue(b, whinny(r), 1263, -12, "horse whinny")
    cue(b, crumble(r, 1.0), SHAKEN, -8, "layer cracks")
    cue(b, digging(F(1504 - 1380), r), 1380, -16, "shovels")
    cue(b, digging(F(TRENCH + 60 - 1504), r, 1.8), 1504, -14, "trench shovels")
    cue(b, crumble(r, 2.0), SMASH, -4, "smashed through"); cue(b, glass_smash(r, 0.6), SMASH + 4, -14, "pottery")
    cue(b, thunk(r, 140), WAR, -9, "war era")
    cue(b, G.whoa(r, base=150, dur=0.6), GREEKS + 30, -16, "Greek sighs")
    cue(b, blip(600, 1300, 0.12), IN3, -8, "3")
    for f in [90, 126, 208, 290, 337, 414, 494, 568, 653, 778, 886, 920, 1086, 1187, 1302, 1365, 1504, 1681]: cue(b, G.whoosh(0.5, r, 0.45), f - 7, -21, "whoosh")
    return b + 0.1 * convolve_st(b, make_ir(0.8, 7, hf=1.5))


# ---------------------------------------------------------------- score
M = I.m2f


def build_music():
    b = np.zeros((2, N)); r = rng(1250)
    lyre = lambda t, m, v=0.45, p=0.2: place(b, pan(I.pluck(M(m), v, r, 1.1, 0.55), p), t)
    bass = lambda t, m, v=0.5: place(b, pan(I.pluck(M(m), v, r, 1.4, 0.3), -0.2), t)
    tim = lambda t, m, v=0.6: place(b, st(I.timpani(M(m), v, r, 1.8)), t)
    stab = lambda t, ms, d=0.3, v=0.8: [place(b, pan(I.brass(M(m), d, v, r, "stab"), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    hornl = lambda t, m, d, v=0.5: place(b, pan(I.brass(M(m), d, v, r, "soft"), 0.15), t)
    # D dorian-ish lyre ostinato, 4/4 at 100 bpm; brass horn melody on top for the epic part
    BT = 0.6
    ARP = [50, 57, 62, 64, 65, 64, 62, 57]
    PROG = [0, 0, -2, -2, -4, -4, -2, -2]
    MEL = [(74, 2), (72, 1), (74, 1), (77, 2), (76, 2), (74, 3), (69, 1), (72, 2), (70, 2), (69, 4)]
    def lyre_bed(t0, t1, vel=0.4, drums=True, k0=0):
        k = 0
        while t0 + k * BT * 0.5 < t1 - 0.2:
            t = t0 + k * BT * 0.5; bar = (k // 8 + k0) % 8; sh = PROG[bar]
            lyre(t, ARP[k % 8] + sh, vel * (1.0 if k % 2 == 0 else 0.7), 0.25 if k % 2 else -0.1)
            if k % 8 == 0: bass(t, 38 + sh, vel * 1.1)
            if drums and k % 4 == 0: tim(t, 38 + sh if k % 8 == 0 else 45 + sh, vel * 0.9)
            k += 1
    def melody(t0, t1, vel=0.45, base=0):
        t = t0; i = 0
        while t < t1 - 0.5:
            m, d = MEL[i % len(MEL)]; hornl(t, m + base, d * BT * 0.95, vel); t += d * BT; i += 1
    lyre_bed(F(0), F(414)); melody(F(126), F(337), 0.4)
    stab(F(TRICK), [62, 65, 69], 0.3, 0.6); stab(F(NOWHERE), [50, 53, 56], 0.5, 0.7)
    stab(F(CELEBRATE), [62, 66, 69, 74], 0.4, 0.8); place(b, st(I.cymbal(0.5, r, 1.6)), F(CELEBRATE))
    # the priest, the serpents and the night: low drone, timpani pulses, then the city falls
    for k, tri in enumerate([[50, 53, 57], [49, 53, 56], [50, 53, 57], [48, 51, 55]]): place(b, st(I.pad([M(m) for m in tri], 1.9, 0.4, r, warm=600)), F(414) + k * 1.9)
    for k in range(8): tim(F(494) + k * 0.6, 38, 0.4 + 0.06 * k)
    stab(F(CRUSH), [38, 41, 44], 0.5, 0.9)
    for k, tri in enumerate([[50, 53, 57], [46, 50, 53], [48, 52, 55]]): place(b, st(I.pad([M(m) for m in tri], 1.0, 0.35, r, warm=500)), F(568) + k * 1.0)
    lyre_bed(F(GATES - 6), F(653), 0.45, True, 4); stab(F(FALLS), [50, 57, 62], 0.6, 0.9); place(b, st(I.cymbal(0.6, r, 2.0)), F(FALLS))
    # "Except...": the record scratch of history, light comic plucks
    stab(F(EXCEPT), [55, 58, 61], 0.25, 0.7)
    for k in range(int((F(886) - F(670)) / (BT * 2))):
        t = F(670) + k * BT * 2
        lyre(t, [62, 65, 69, 67][k % 4], 0.35); lyre(t + BT, [69, 72, 74, 72][k % 4], 0.25, -0.2)
    place(b, st(I.glock(M(81), 0.5, r)), F(BARELY)); place(b, st(I.glock(M(86), 0.5, r)), F(THOUSAND))
    stab(F(REALLY + 6), [62, 65, 68], 0.3, 0.6)
    # the explanation: curious vibes + pads
    te = F(924)
    for k, tri in enumerate([[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]] * 6):
        t = te + k * 1.8
        if t > F(1365): break
        place(b, st(I.pad([M(m) for m in tri], 1.6, 0.33, r)), t)
        for i, m in enumerate(tri): place(b, pan(I.vibes(M(m + 12), 0.28, r, 1.2), 0.1), t + i * 0.3)
    stab(F(BIGGER), [65, 69, 72], 0.25, 0.6); tim(F(RAM), 38, 0.7); tim(F(QUAKE), 36, 0.9); tim(F(SHAKEN), 38, 0.8)
    # the dig: the lyre theme comes back, quieter, building to the smash
    lyre_bed(F(1365), F(1681), 0.36, False, 2)
    for k in range(6): tim(F(SMASH - 36) + k * 0.2, 38, 0.3 + 0.1 * k)
    stab(F(SMASH), [38, 45, 50], 0.6, 1.0); place(b, st(I.cymbal(0.7, r, 2.2)), F(SMASH))
    stab(F(WAR), [62, 66, 69], 0.4, 0.7)
    # the payoff: the theme slow and grand, then the button on "3"
    melody(F(1684), F(IN3 - 6), 0.38, 0)
    for k, tri in enumerate([[50, 57, 62], [46, 53, 58], [48, 55, 60]]): place(b, st(I.pad([M(m) for m in tri], 1.0, 0.35, r)), F(1684) + k * 0.9)
    stab(F(IN3), [50, 57, 62, 66], 0.5, 0.9); place(b, st(I.cymbal(0.5, r, 1.4)), F(IN3)); tim(F(IN3), 38, 0.8)
    return b + 0.15 * convolve_st(b, make_ir(1.2, 3, hf=1.3))


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
