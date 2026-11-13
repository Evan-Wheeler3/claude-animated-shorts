# Sound for "Could You Survive a Western Duel?": the narration (untouched) + synthesized SFX + a small original score, all numpy.
# Every cue sits on a picture frame from src/videos/duel/story.ts (30 fps). Output: mix.wav (48 kHz stereo, exact
# length), stems, cues.md.  usage: python make.py   (run from this folder; needs numpy + scipy)
import os, json, math
import numpy as np
from scipy import signal, ndimage
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, peq, colored, smooth_noise, fades, phase, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, momentary_max, true_peak, norm_to, read_wav, write_wav)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 1376
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
# beats (frames) from story.ts
WAKE, SPILL, SOAK, TURN, OUTSIDE, RARE = 18, 141, 150, 197, 290, 347
COCK, YARDS, SHOTS4, IDEA = 492, 536, [645, 656, 664, 676], 712
HOLES, DRAW, AIM, MISS, NOT, FAST = [767, 777, 790], 838, 857, 978, 1021, 1076
IDEA2, DOOR, SLIDE, LOOK = 1162, 1250, 1278, 1336
ODDS = [(0, 100), (227, 70), (288, 40), (347, 70), (431, 35), (538, 15), (645, 5), (714, 15), (767, 30), (790, 45), (835, 50), (975, 60), (1021, 10), (1065, 3), (1276, 99)]
SAL = [(0, 317), (1273, TOTAL)]   # inside the saloon
R = rng(1873)
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


def odds_ticks(b):
    """a click for every number the counter passes, so it audibly runs down / climbs"""
    r = rng(5)
    v = ODDS[0][1]
    for i in range(1, len(ODDS)):
        f0, to = ODDS[i]
        last = i == len(ODDS) - 1
        dur = 62 if last else 10 + abs(to - v) * 0.12
        steps = max(1, abs(to - v))
        for k in range(1, steps + 1):
            u = k / steps
            if last: fr = f0 + dur * (1 - (1 - u) ** (1 / 2.6))   # inverse of the counter's ease
            else: fr = f0 + dur * u
            if last or k % max(1, steps // 12) == 0:
                cue(b, tick(r), fr, -16 if not last else -14 - 4 * u, "counter tick", p=0.0)
        v = to


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    # rooms: the saloon's murmur, the street's wind
    for a, e in SAL: cue(b, crowd(F(e - a), r, 8, 3.8), a, -26, "saloon murmur", "integrated")
    cue(b, fades(G.breeze(F(1273 - 317) + 0.2, r), 0.3, 0.3), 317, -22, "wind", "integrated")
    # waking up, the spill
    cue(b, G.whoa(r, base=150, dur=0.45), WAKE + 4, -12, "huh")
    cue(b, splash(r), SPILL + 2, -6, "whiskey splash")
    cue(b, glass_smash(r, 0.6), SPILL + 26, -9, "glass hits the floor")
    cue(b, G.oof(r, "oh", base=120), SOAK + 2, -10, "gunfighter, soaked")
    cue(b, spurs(r, 1), TURN, -10, "he turns")
    for k in range(3): cue(b, blip(900, 500, 0.05), TURN + 6 + k * 9, -20, "drip")
    cue(b, G.creak(0.9, r, 90, 140), OUTSIDE + 22, -11, "doors swing")
    cue(b, spurs(r, 3), OUTSIDE + 8, -13, "walking out")
    # the street
    cue(b, rustle(F(100), r), 330, -17, "tumbleweed", "integrated")
    cue(b, caw(r), 400, -18, "far vulture", p=0.5)
    cue(b, cock(r), COCK, -4, "hammer back")
    cue(b, G.whoosh(1.0, r, 0.5), YARDS - 6, -12, "zoom")
    for f in SHOTS4: cue(b, shot(r), f, -2, "shot", p=0.2); cue(b, glass_smash(r), f + 2, -7, "bottle", p=0.3)
    cue(b, blip(500, 1100, 0.14), IDEA, -10, "idea")
    for f, n in zip(HOLES, [8, 8, 24]):
        for k in range(n): cue(b, shot(r, 0.7), f + k * 0.9 + r.uniform(0, 0.6), -11, "shots into the wall", p=float(r.uniform(-0.6, 0.6)))
    cue(b, click(r, 4200), 802, -14, "the can, untouched")
    cue(b, G.whoosh(0.4, r, 0.4), DRAW - 2, -9, "draw")
    cue(b, cock(r), DRAW + 6, -8, "hammer")
    cue(b, cock(r), AIM + 22, -12, "your hammer, slowly")
    cue(b, shot(r, 1.2), MISS, 0, "his shot")
    cue(b, ricochet(r), MISS + 3, -5, "near miss")
    cue(b, G.whoa(r, base=180, dur=0.4), 984, -9, "you, startled")
    cue(b, G.whoosh(1.4, r, 0.85, 200, 900), NOT + 2, -13, "slow-motion rush")
    cue(b, caw(r), FAST + 4, -6, "vulture")
    cue(b, blip(500, 1100, 0.14), IDEA2, -10, "idea")
    for k in range(5): cue(b, G.stroll_step(r, 0.4), 1230 + k * 7, -12, "steps on the boardwalk")
    cue(b, G.creak(0.9, r, 90, 140), DOOR, -9, "doors")
    cue(b, G.whoosh(1.0, r, 0.6, 300, 1800), SLIDE, -12, "glass slides down the bar")
    cue(b, click(r, 3000), SLIDE + 20, -10, "glass stops")
    odds_ticks(b)
    for f in [84, 132, 197, 317, 425, 588, 745, 1065, 1273]:
        cue(b, G.whoosh(0.5, r, 0.45), f - 7, -21, "whoosh")
    return b + 0.1 * convolve_st(b, make_ir(0.8, 7, hf=1.5))


# ---------------------------------------------------------------- score
M = I.m2f
Q = 0.5


def build_music():
    b = np.zeros((2, N)); r = rng(73)
    piano = lambda t, m, v=0.5, p=0.0: place(b, pan(I.pluck(M(m), v, r, 0.9, 0.9, 0.12), p), t)
    tuba = lambda t, m, d=0.36, v=0.6: place(b, pan(I.brass(M(m), d, v, r, "tuba"), -0.15), t)
    stab = lambda t, ms, d=0.3, v=0.8: [place(b, pan(I.brass(M(m), d, v, r, "stab"), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    # honky-tonk in the saloon: stride left hand, a jaunty right hand (C - F - G7 - C)
    PROG = [(36, [60, 64, 67]), (41, [60, 65, 69]), (43, [59, 62, 65, 67]), (36, [60, 64, 67])]
    TUNE = [[(0, 76), (0.5, 79), (1, 84), (2, 81), (3, 79)], [(0, 77), (1, 81), (1.5, 79), (2, 77), (3, 74)], [(0, 74), (0.5, 77), (1, 79), (2, 77), (3, 71)], [(0, 72), (1, 76), (2, 72)]]
    def honky(t0, t1, vel=0.45, tune=True):
        k = 0
        while t0 + k * 4 * Q < t1 - 0.2:
            root, tri = PROG[k % 4]; t = t0 + k * 4 * Q
            for beat in range(4):
                if t + beat * Q >= t1: break
                if beat % 2 == 0: piano(t + beat * Q, root + (7 if beat == 2 else 0), vel, -0.2)
                else: [piano(t + beat * Q + 0.01 * i, m, vel * 0.55, 0.2) for i, m in enumerate(tri)]
            if tune:
                for beat, m in TUNE[k % 4]:
                    if t + beat * Q < t1: piano(t + beat * Q, m, vel + 0.1, 0.25); piano(t + beat * Q + 0.005, m - 12, vel * 0.4, 0.25)
            k += 1
    honky(F(2), F(SPILL))
    # the spill: the piano stops dead (one wrong note)
    piano(F(SPILL + 2), 61, 0.6); piano(F(SPILL + 2), 66, 0.6)
    # the duel: a lone whistle over a slow bass, Am
    def whistle_phrase(t0, notes, vel=0.7):
        st0, y = I.whistle([(t0 + a, d, m, vel) for a, d, m in notes], r)
        place(b, pan(y, 0.15), st0)
    for k in range(int((F(1065) - F(317)) / 1.5)):
        t = F(317) + k * 1.5
        place(b, pan(I.pluck(M([45, 40][k % 2]), 0.55, r, 1.4, 0.4), -0.25), t)
    whistle_phrase(F(322), [(0, 0.5, 69), (0.5, 0.5, 74), (1.0, 1.4, 76), (2.6, 0.4, 74), (3.0, 0.4, 72), (3.4, 1.6, 69)])
    whistle_phrase(F(592), [(0, 0.5, 69), (0.5, 0.5, 74), (1.0, 1.0, 76), (2.0, 0.4, 79), (2.4, 1.4, 76)])
    whistle_phrase(F(698), [(0, 0.3, 76), (0.3, 0.3, 79), (0.6, 0.9, 81)], 0.75)
    stab(F(DRAW) - 0.02, [57, 60, 64], 0.25, 0.8)
    stab(F(NOT) - 0.02, [56, 59, 62, 65], 0.8, 0.7)
    place(b, pan(I.brass(M(45), 1.6, 0.6, r, "tuba", fall=-12.0), 0), F(FAST))
    # the strategy: the honky-tonk tune comes back, one finger, as an idea
    for k, m in enumerate([76, 79, 84]): piano(F(IDEA2) + k * 0.18, m, 0.5, 0.2)
    honky(F(1273), F(TOTAL) - 0.2, 0.42)
    # and stops on the unsure look: one unresolved chord
    for m in [59, 62, 65, 67]: piano(F(LOOK + 2), m, 0.5, 0.1)
    return b + 0.15 * convolve_st(b, make_ir(1.0, 3, hf=1.3))


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
