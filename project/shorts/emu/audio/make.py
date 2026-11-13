# Sound for "The Great Emu War": the narration (untouched) + synthesized SFX + a small original score, all numpy.
# Every cue sits on a picture frame from src/videos/emu/story.ts (30 fps). Output: mix.wav (48 kHz stereo, exact
# length), stems, cues.md.  usage: python make.py   (run from this folder; needs numpy + scipy)
import os, json, math
import numpy as np
from scipy import signal, ndimage
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, peq, colored, smooth_noise, fades, phase, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, momentary_max, true_peak, norm_to, read_wav, write_wav)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 2092
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
# beats (frames) from story.ts
FLASH, EAT, SALUTE, WANT = 131, 228, 284, 391
POP = [442, 464, 475, 486, 496]
AMMO0, AMMO1, STROLL, HORDE, FIRE, JAM = 517, 546, 608, 741, 864, 940
TRUCK0, OUTRUN, TANK, CHARGE, SWEEP, RUNKID, SCATTER, SPLIT0 = 968, 1037, 1106, 1417, 1436, 1526, 1547, 1609
BRASS0, COINS, REVEAL = 1765, 1917, 2046
R = rng(1932)
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


def emu_boom(r, n=3):
    """an emu's drum: deep hollow thumps from the throat pouch"""
    out = np.zeros(ns(0.34 * n + 0.3)); f0 = r.uniform(62, 78)
    for i in range(n):
        d = 0.26; m = ns(d); t = np.arange(m) / SR
        y = np.sin(phase(f0 * (1 + 0.25 * np.exp(-t / 0.03)))) * np.sin(np.pi * t / d) ** 0.7 + 0.3 * np.sin(phase(2 * f0)) * np.exp(-t / 0.05)
        a = ns(0.33 * i); out[a:a + m] += y * (1 - 0.1 * i)
    return out


def emu_grunt(r):
    d = r.uniform(0.16, 0.24); n = ns(d); t = np.arange(n) / SR
    f = r.uniform(150, 210) * (1.2 - 0.4 * t / d)
    y = np.sign(np.sin(phase(f))) * np.sin(np.pi * t / d) ** 0.6
    return fades(bp(y, 250, 1800) * (1 + 0.4 * np.sin(TAU * 45 * t)), 0.004, 0.03)


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


def engine(dur, r, rev=1.0):
    n = ns(dur); t = np.arange(n) / SR
    f = 46 * rev * (1 + 0.06 * smooth_noise(n, r, 1.5))
    ph = phase(f)
    y = np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph) * 0.4 + lp(r.standard_normal(n), 300) * 0.5 * (0.6 + 0.4 * np.sin(ph * 0.5) ** 2)
    rattle = bp(r.standard_normal(n), 900, 3500) * (np.sin(TAU * 13 * t) > 0.6) * 0.12
    return widen(fades(lp(y, 900) + rattle, 0.15, 0.3), r, 9, 0.4)


def patter(dur, r, rate, bright=1300):
    n = ns(dur); y = np.zeros(n); tm = 0.0
    while tm < dur - 0.15:
        L = ns(0.07); tl = np.arange(L) / SR; i = ns(tm)
        y[i:i + L] += lp(r.standard_normal(L), r.uniform(bright * 0.7, bright * 1.4)) * np.exp(-tl / 0.014) * r.uniform(0.3, 1.0)
        tm += r.exponential(1 / rate)
    return widen(y, r, 15, 0.9)


def munch(r):
    n = ns(0.16); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 1500, 6000) * smooth_noise(n, r, 70) ** 2 * np.exp(-t / 0.05), 0.002, 0.02)


def flap(dur, r, rate=13):
    n = ns(dur); t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 500, 3500) * np.maximum(0, np.sin(TAU * rate * t * (1 + 0.1 * smooth_noise(n, r, 3)))) ** 3
    return fades(y * np.exp(-t / (dur * 0.6)), 0.005, 0.1)


def coo(r):
    d = 0.5; n = ns(d); t = np.arange(n) / SR
    f = r.uniform(380, 460) * (1 + 0.12 * np.sin(TAU * 3.2 * t))
    return fades(np.sin(phase(f)) * (0.5 + 0.5 * np.sin(TAU * 9 * t)) * np.sin(np.pi * t / d), 0.02, 0.05)


def coin(r):
    return G.clink(r, f0=float(r.uniform(3400, 5200)), dur=0.16, bright=1.4)


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    # air: dry wind over open country, a few far birds
    for a, e, db in [(0, 263, -25), (263, 668, -27), (668, 1077, -25), (1077, 1355, -27), (1596, 1815, -26), (1978, TOTAL, -27)]:
        cue(b, fades(G.breeze(F(e - a) + 0.2, r), 0.3, 0.3), a, db, "wind", "integrated")
    cue(b, G.bird_chirps(F(120), r, 0.5), 268, -27, "birds at the farm", "integrated")
    cue(b, G.bird_chirps(F(100), r, 0.5), 1980, -27, "birds at the farm", "integrated")
    # hook
    cue(b, emu_boom(r, 3), 6, -11, "emus drumming")
    cue(b, thunk(r, 300), 56, -12, "gun cocked")
    cue(b, patter(F(29), r, 60), 82, -17, "twenty thousand feet", "integrated")
    cue(b, emu_grunt(r), 113, -9, "emu, smug")
    # they walk in and eat
    cue(b, patter(F(92), r, 30), 136, -19, "emus walking in", "integrated")
    for k in range(4): cue(b, emu_boom(r, 2), 150 + k * 22, -15, "drumming", p=float(r.uniform(-0.6, 0.6)))
    for k in range(14): cue(b, munch(r), EAT + k * 2.4 + r.uniform(0, 1), -12, "munch", p=float(r.uniform(-0.6, 0.6)))
    # the farmers
    for k in range(3): cue(b, thunk(r, 240), SALUTE + k, -13, "salute", p=(k - 1) * 0.4)
    cue(b, blip(500, 1100, 0.14), WANT - 4, -11, "idea")
    # the army arrives: a pop for each, crates stacking, the tower wobbling
    for k, f in enumerate(POP): cue(b, blip(300 + 60 * k, 800 + 80 * k, 0.09), f, -10, "pop")
    for k in range(10): cue(b, thunk(r, float(r.uniform(110, 150))), AMMO0 + (AMMO1 - AMMO0) * k / 10, -9, "ammo crate")
    cue(b, engine(F(60), r, 0.7), 419, -24, "truck idling", "integrated")
    # day one
    cue(b, emu_boom(r, 2), 590, -15, "far emus", p=0.4)
    cue(b, patter(F(55), r, 12), STROLL, -22, "strolling off", "integrated")
    cue(b, slide(700, 380, 0.7), 640, -17, "deflate")
    # the ambush
    cue(b, patter(F(120), r, 55), HORDE - 20, -15, "a thousand emus coming", "integrated")
    for k in range(6): cue(b, emu_boom(r, 3), HORDE + k * 12, -13, "drumming", p=float(r.uniform(-0.7, 0.7)))
    hb = np.concatenate([np.concatenate([thunk(r, 60) * (1 if i % 2 == 0 else 0.6), np.zeros(ns(0.12))]) for i in range(8)])
    cue(b, hb, 806, -14, "heartbeat")
    cue(b, emu_grunt(r), 846, -10, "emu, point blank")
    # FIRE ... and the jam
    cue(b, burst(r, F(JAM - FIRE) - 0.15), FIRE, 0, "Lewis gun")
    for k in range(9): cue(b, emu_grunt(r), FIRE + 6 + k * 7, -11, "emus scatter", p=float(r.uniform(-0.8, 0.8)))
    cue(b, patter(F(70), r, 70), FIRE + 4, -13, "stampede", "integrated")
    cue(b, thunk(r, 520), JAM, -4, "CLUNK")
    cue(b, slide(900, 250, 0.5), JAM + 2, -11, "wind down")
    for k in range(3): cue(b, thunk(r, 700), JAM + 10 + k * 5, -11, "banging on the gun")
    cue(b, emu_grunt(r), JAM + 14, -9, "emu looks in")
    # the truck
    cue(b, engine(F(109), r, 1.4), TRUCK0, -13, "truck flat out", "integrated")
    for k in range(10): cue(b, thunk(r, float(r.uniform(80, 130))), TRUCK0 + 8 + k * 10, -14, "bounce")
    cue(b, patter(F(44), r, 45, 1700), OUTRUN - 8, -11, "emus overtaking", "integrated")
    cue(b, G.whoosh(0.7, r, 0.4), OUTRUN + 4, -11, "passing")
    cue(b, emu_grunt(r), OUTRUN + 22, -9, "emu looks back")
    # the report
    cue(b, blip(500, 1100, 0.14), TANK - 4, -11, "idea")
    for k in range(13):
        f = 1128 + k * 6.6
        cue(b, shot(r, 0.8), f, -9, "shot")
        cue(b, ricochet(r), f + 2, -7, "ricochet", p=float(r.uniform(-0.6, 0.6)))
    # luckily / unluckily
    cue(b, G.whoa(r, base=130, dur=0.5), 1222, -15, "phew")
    cue(b, emu_boom(r, 3), 1292, -9, "emus, unbothered")
    # the range
    for k in range(6): cue(b, thunk(r, float(r.uniform(160, 220))), CHARGE + k * 3, -12, "targets hop")
    cue(b, burst(r, 0.8), SWEEP - 2, -2, "Lewis gun")
    for k in range(10): cue(b, thunk(r, float(r.uniform(180, 300))), SWEEP + 3 + k * 2.4, -9, "target down", p=(k % 5 - 2) * 0.3)
    # the park
    for k in range(5): cue(b, coo(r), 1470 + k * 11, -16, "pigeon", p=float(r.uniform(-0.5, 0.5)))
    cue(b, steps(F(22), r, 9), RUNKID, -14, "kid running", "integrated")
    cue(b, widen(sum(np.pad(flap(1.4, r, float(r.uniform(11, 16))), (0, 0)) for _ in range(5)), r, 13, 0.9), SCATTER, -7, "pigeons scatter")
    # the split
    cue(b, patter(F(80), r, 80, 1600), SPLIT0, -11, "emus in every direction", "integrated")
    cue(b, G.whoosh(1.0, r, 0.2), SPLIT0, -11, "scatter")
    for k in range(5): cue(b, emu_grunt(r), SPLIT0 + 4 + k * 9, -12, "emu", p=float(r.uniform(-0.8, 0.8)))
    # going home, ten casings
    cue(b, engine(F(56), r, 1.0), 1697, -16, "truck leaving", "integrated")
    for k in range(10): cue(b, coin(r), BRASS0 + k * 3.5, -10, "casing", p=(k - 4.5) * 0.12)
    cue(b, emu_grunt(r), 1803, -10, "emu")
    # the bounty
    cue(b, I.triangle(0.8, r, 1.2, 2100.0), 1861, -10, "till bell")
    for k in range(40): cue(b, coin(r), COINS + k * 1.25, -13, "coins", p=float(r.uniform(-0.3, 0.5)))
    # the end
    cue(b, patter(F(22), r, 6), 2030, -18, "one emu strolling in", "integrated")
    cue(b, emu_boom(r, 2), 2058, -10, "emu")
    for f in [62, 198, 338, 519, 1040, 1178, 1421, 1913, 2049]:
        cue(b, G.whoosh(0.5, r, 0.45), f - 7, -19, "whoosh")
    return b + 0.1 * convolve_st(b, make_ir(0.8, 7, hf=1.5))


# ---------------------------------------------------------------- score
M = I.m2f
Q = 0.5


def build_music():
    b = np.zeros((2, N)); r = rng(32)
    tuba = lambda t, m, d=0.36, v=0.6: place(b, pan(I.brass(M(m), d, v, r, "tuba"), -0.15), t)
    horn_ = lambda t, m, d=0.2, v=0.4, p=0.3: place(b, pan(I.brass(M(m), d, v, r, "horn"), p), t)
    stab = lambda t, ms, d=0.3, v=0.8: [place(b, pan(I.brass(M(m), d, v, r, "stab"), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    pl = lambda t, m, v=0.6, p=0.25: place(b, pan(I.pluck(M(m), v, r, 0.7, 0.8), p), t)
    gl = lambda t, m, v=0.45: place(b, pan(I.glock(M(m), v, r, 1.2), -0.3), t)
    vib = lambda t, m, v=0.4, d=1.6: place(b, pan(I.vibes(M(m), v, r, d), 0.1), t)
    sn = lambda t, v=0.5: place(b, pan(I.snare(v, r), 0.1), t)
    # G major, a bush two-step: G C D7 G | Em Am D7 G
    PROG = [(43, [59, 62, 67]), (36, [60, 64, 67]), (38, [60, 62, 66]), (43, [59, 62, 67]), (40, [59, 64, 67]), (45, [60, 64, 69]), (38, [60, 62, 66]), (43, [59, 62, 67])]
    TUNE = [[(0, 67), (1, 71), (2, 74), (2.5, 76), (3, 74)], [(0, 76), (1, 72), (2, 67), (3, 72)], [(0, 74), (1, 72), (2, 69), (3, 66)], [(0, 67), (1.5, 62), (2, 67)],
            [(0, 71), (1, 76), (2, 79), (3, 76)], [(0, 72), (1, 76), (2, 81), (3, 76)], [(0, 74), (1, 78), (2, 81), (3, 78)], [(0, 79), (1, 74), (2, 79)]]
    def two_step(t0, bars, vel=0.5, tune=True, start=0, march=False, fn=None):
        fn = fn or pl
        for k in range(bars):
            root, tri = PROG[(start + k) % 8]; t = t0 + k * 4 * Q
            for beat in range(4):
                if beat % 2 == 0: tuba(t + beat * Q, root + (7 if beat == 2 else 0), 0.34, vel)
                else: [horn_(t + beat * Q, m, 0.16, vel * 0.55, 0.3) for m in tri]
                if march: sn(t + beat * Q, 0.45 if beat % 2 else 0.3); sn(t + beat * Q + Q * 0.75, 0.25)
            if tune:
                for beat, m in TUNE[(start + k) % 8]: fn(t + beat * Q, m, vel + 0.1)
    # hook: a bugle call that ends on a raspberry
    for k, m in enumerate([67, 71, 74, 79, 74, 79]): place(b, pan(I.brass(M(m), 0.2 if k < 5 else 0.6, 0.75, r, "stab"), 0.1), 0.15 + k * 0.42)
    place(b, pan(I.brass(M(43), 0.7, 0.8, r, "tuba", fall=-5.0), 0), F(111))
    place(b, st(I.cymbal(0.5, r, 1.4)), F(111))
    # the emus arrive and eat: the bush tune, easy
    two_step(F(138), 2, 0.5)
    # the farmers: the tune as an old soldier's march, snare under it
    two_step(F(264), 2, 0.5, True, 2, True)
    place(b, pan(I.brass(M(67), 0.5, 0.7, r, "horn"), 0.2), F(WANT - 2)); place(b, pan(I.brass(M(74), 0.7, 0.8, r, "horn"), 0.2), F(WANT + 8))
    # the army: full march, proud, a cymbal on the ten thousand bullets
    two_step(F(420), 2, 0.6, True, 4, True)
    place(b, st(I.cymbal(0.6, r, 1.6)), F(AMMO1))
    # day one: the march loses its drum, then its tune
    two_step(F(552), 1, 0.45, True, 0)
    for k, m in enumerate([43, 42, 41, 40]): tuba(F(STROLL) + k * 0.42, m, 0.4, 0.5)
    # the ambush: timpani heartbeat and a roll that grows with the horde
    tb = F(668)
    for k in range(int((F(FIRE) - tb) / Q)):
        t = tb + k * Q; v = 0.2 + 0.6 * k / 13
        place(b, pan(I.timpani(M(31 if k % 2 == 0 else 38), v, r, 1.0), -0.2), t)
        if k > 4:
            for s in range(4): sn(t + s * Q / 4, v * (0.8 if s == 0 else 0.4))
    stab(F(FIRE) - 0.03, [55, 59, 62, 67], 0.3, 0.9)
    # ... the jam: three notes down a hole
    for k, m in enumerate([55, 54, 53]): place(b, pan(I.brass(M(m), 0.28, 0.6, r, "tuba"), 0), F(JAM + 6) + k * 0.3)
    # the truck: the tune at a gallop
    tr = F(TRUCK0 + 2)
    for k in range(int((F(1077) - tr) / (2 * Q))):
        root, tri = PROG[k % 8]; t = tr + k * 2 * Q
        tuba(t, root, 0.2, 0.7); [horn_(t + Q / 2, m, 0.1, 0.4) for m in tri]; tuba(t + Q, root + 7, 0.2, 0.7); [horn_(t + 1.5 * Q, m, 0.1, 0.4) for m in tri]
        for s in range(4): sn(t + s * Q / 2, 0.45 if s % 2 else 0.3)
        pl(t, TUNE[k % 8][0][1], 0.6); pl(t + Q, TUNE[k % 8][-1][1], 0.55)
    # the report: one grave horn; the tank: low and heavy
    place(b, pan(I.brass(M(55), 1.2, 0.5, r, "soft"), 0.1), F(1080))
    for k in range(6): tuba(F(1128) + k * 0.5, 31 + (k % 2) * 7, 0.42, 0.65)
    # luckily: a sweet chord. unluckily: the same chord, a semitone flat
    for m in [55, 59, 62, 67]: vib(F(1222), m, 0.45, 2.0)
    for m in [54, 58, 61, 66]: vib(F(1290), m, 0.45, 2.0)
    # the explanation: warm vibes
    te = F(1357)
    for k, tri in enumerate([[52, 55, 59], [48, 52, 55], [50, 54, 57], [43, 50, 59]]):
        place(b, st(I.pad([M(m) for m in tri], 1.7, 0.4, r)), te + k * 1.8)
        for i, m in enumerate(tri): vib(te + k * 1.8 + i * 0.3, m + 12, 0.35, 1.6)
    for k, m in enumerate([67, 71, 74, 71, 72, 76, 79, 76]): pl(F(1470) + k * 0.31, m, 0.45, 0.3 * math.sin(k))   # the park, tiptoe
    for k, m in enumerate([79, 76, 72, 67, 64, 60, 55]): gl(F(SCATTER) + k * 0.09, m, 0.5)                        # everything flies off
    two_step(F(1598), 1, 0.5, True, 4)
    # going home: the march, slow and flat
    for k, m in enumerate([55, 55, 54, 50]): place(b, pan(I.brass(M(m), 0.55 if k < 3 else 1.3, 0.6, r, "tuba", fall=-1.5 if k == 3 else 0.0), 0), F(1700) + k * 0.62)
    # the bounty and the end: the bush tune comes home, with a button on the last word
    two_step(F(1817), 2, 0.5, True, 4, False, gl)
    two_step(F(1980), 1, 0.55, True, 6)
    stab(F(2070), [55, 59, 62, 67], 0.5, 0.9); tuba(F(2070), 43, 0.6, 0.8); place(b, st(I.cymbal(0.5, r, 1.2)), F(2070))
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
