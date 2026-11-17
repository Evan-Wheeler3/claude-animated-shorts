# Sound for "Niagara Barrel": the narration (untouched) + synthesized SFX + a small original score, all numpy.
# Same recipe and house mix as the troy/eiffel/emu shorts (SFX -6 dB, music 10 LU under the voice and ducked
# 3 dB under speech, -15 LUFS integrated, true peak <= -1 dBTP). Library: templates/audio (dsp, instruments, sfx_gen).
# Every cue sits on a picture frame read from the story module (timing.json from scripts/story-json.mjs).
# usage: node scripts/story-json.mjs src/videos/niagara/story.ts videos/niagara-barrel/audio/timing.json
#        python3 videos/niagara-barrel/audio/make.py      -> mix.wav, stem_*.wav, cues.md (48 kHz stereo, exact length)
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
N = ns(TOTAL / FPS)
F = lambda f: f / FPS
Wd = T["words"]
SH = {s["key"]: (s["a"], s["b"]) for s in T["shots"]}
HITS, IMPACT, LIP, LIDPOP = T["HAMMER_HITS"], T["IMPACT_F"], T["LIP_F"], T["LID_POP_F"]
R = rng(1901)
CUES = []
VREF = -20.0


def cue(buf, x, f, db, name, mode="momentary", p=None):
    """place sound x at frame f, at `db` LU relative to the voice (momentary max, or integrated for beds)"""
    x = st(x) if p is None else pan(x if x.ndim == 1 else x.mean(0), p)
    place(buf, norm_to(x, VREF + db, mode), F(f))
    CUES.append((f, name, db))


# ---------------------------------------------------------------- sound makers (Niagara-specific)
def roar(dur, r, near=1.0):
    """the falls: a deep broadband roar with slow surges; `near` brightens it"""
    n = ns(dur); t = np.arange(n) / SR
    cn = colored(n, r, 1.1)
    body = lp(cn, 300 + 900 * near) * (0.8 + 0.2 * smooth_noise(n, r, 0.4))
    sub = lp(colored(n, r, 1.6), 90) * 1.4
    hiss = hp(r.standard_normal(n), 2500) * 0.05 * near
    return widen(fades(body + sub + hiss, 0.6, 0.6), r, 21, 0.9)


def rapids(dur, r, close=1.0):
    return G.water_bed(dur, r, close=close, slosh_rate=1.6)


def meow(r, kind="alarm"):
    """a cat: formant-shaped harmonic glide (alarm = rising wail, hiss = noise burst + spit)"""
    if kind == "hiss":
        n = ns(0.7); t = np.arange(n) / SR
        return fades(bp(r.standard_normal(n), 2500, 9000) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.35) * 1.2, 0.002, 0.08)
    d = 0.75; n = ns(d); t = np.arange(n) / SR; u = t / d
    f0 = 520 + 380 * np.sin(np.pi * np.clip(u * 1.2, 0, 1)) ** 1.5
    ph = phase(f0)
    y = sum(np.sin(k * ph) / k ** 0.9 for k in range(1, 9))
    y = signal.lfilter(*signal.iirpeak(1100 + 900 * np.sin(np.pi * u).mean(), 3, SR), y) + 0.4 * y
    return fades(bp(y, 400, 5000) * np.sin(np.pi * u) ** 0.6, 0.01, 0.06)


def coin(r, f0=None):
    return G.clink(r, f0=float(f0 or r.uniform(2600, 4200)), dur=0.35, bright=1.3)


def jingle(dur, r, rate=14):
    out = np.zeros((2, ns(dur + 0.5))); t = 0.0
    while t < dur:
        place(out, pan(coin(r), float(r.uniform(-0.7, 0.7))), t, gain=float(r.uniform(0.4, 1))); t += r.exponential(1 / rate)
    return out


def pop(f0=500, f1=1100, d=0.09):
    n = ns(d); t = np.arange(n) / SR
    return fades(np.sin(phase(f0 * (f1 / f0) ** (t / d))) * np.exp(-t / 0.04), 0.001, 0.02)


def slide(f0, f1, d):
    n = ns(d); t = np.arange(n) / SR
    ph = phase(f0 * (f1 / f0) ** ((t / d) ** 1.3) * (1 + 0.012 * np.sin(TAU * 6 * t)))
    return fades((np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.clip(t / 0.05, 0, 1), 0.01, 0.03)


def thump(r, f0=55, d=0.6):
    n = ns(d); t = np.arange(n) / SR
    return fades(np.sin(phase(f0 * (1 + 0.8 * np.exp(-t / 0.03)))) * np.exp(-t / 0.18) * 1.3 + lp(r.standard_normal(n), 900) * np.exp(-t / 0.02) * 0.6, 0.0005, 0.05)


def buckle(r):
    y = np.zeros(ns(0.5)); place_m = lambda x, t: y.__setitem__(slice(ns(t), ns(t) + len(x)), y[ns(t): ns(t) + len(x)] + x[: len(y) - ns(t)])
    place_m(G.clink(r, f0=1800.0, dur=0.12), 0.0); place_m(G.clink(r, f0=2300.0, dur=0.1), 0.12)
    place_m(fades(bp(r.standard_normal(ns(0.25)), 300, 2500) * 0.4, 0.01, 0.05), 0.2)
    return y


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    sec = lambda k: (SH[k][0], SH[k][1])
    # beds: the falls roar runs under everything (nearer on the river and at the brink), rapids on the river shots
    a, e = 0, TOTAL
    cue(b, roar(F(e - a) + 0.5, r, 0.5), a, -24, "falls roar (distant)", "integrated")
    for k, lvl in [("hook_wide", -20), ("hook_barrel", -19), ("barrel_cu", -18), ("current", -16)]:
        a, e = sec(k); cue(b, rapids(F(e - a) + 0.4, r, 1.0), a, lvl, f"rapids {k}", "integrated")
    for k in ("cat_in", "climb", "strap", "seal"):
        a, e = sec(k); cue(b, rapids(F(e - a) + 0.3, r, 0.5), a, -24, f"river by the dock {k}", "integrated")
    a, e = sec("brink"); cue(b, roar(F(SH["drop"][1] - a) + 0.3, r, 1.0), a, -12, "roar at the brink", "integrated")
    a, e = sec("annie"); cue(b, G.babble(F(e - a), r, 170, 1.0), a, -27, "sightseers", "integrated")
    a = SH["rescue_open"][0]; cue(b, G.water_bed(F(TOTAL - a), r, close=0.4, slosh_rate=0.5), a, -24, "lapping shore", "integrated")
    # hook
    cue(b, G.whoosh(1.4, r, 0.6), 2, -14, "push in"); cue(b, G.whoosh(0.6, r, 0.4), SH["hook_barrel"][0] - 6, -16, "cut whoosh")
    cue(b, G.creak(0.7, r, 70, 110), Wd["barrel"] - 6, -12, "barrel creaks")
    cue(b, G.splash_big(r)[:, : ns(0.6)] if G.splash_big(r).ndim == 2 else G.splash_big(r)[: ns(0.6)], Wd["inside"], -16, "slosh")
    # the plan
    cue(b, pop(), Wd["plan"] - 2, -10, "bubble pop"); cue(b, jingle(0.8, r, 18), Wd["plan"] + 2, -14, "imagined coins")
    # cat test
    cue(b, meow(r), Wd["cat"] - 4, -8, "alarmed meow"); cue(b, meow(r, "hiss"), SH["cat_alive"][0] + 4, -10, "indignant hiss")
    cue(b, meow(r), Wd["alive"] + 6, -12, "grumpy mrow"); cue(b, G.hurrah(r, 160, 1.0), Wd["alive"] + 2, -18, "riverman laughs")
    # climb, strap, seal
    cue(b, G.creak(0.6, r, 60, 95), Wd["climbed"], -12, "barrel creak as she steps in"); cue(b, thump(r, 70, 0.4), Wd["climbed"] + 10, -14, "cushion thump")
    cue(b, buckle(r), Wd["strapped"] + 4, -10, "strap buckle")
    for h in HITS: cue(b, G.hammer_hit(r, 0.8), h, -6, "hammer tap")
    # the run and the drop
    a, e = sec("current"); cue(b, G.creak(F(e - a), r, 40, 70, rough=0.25), a + 6, -16, "barrel creaking in the current")
    cue(b, G.whoosh(1.0, r, 0.5), LIP - 6, -10, "over the brink"); cue(b, slide(700, 160, F(IMPACT - LIP)), LIP, -14, "falling (slide down)")
    cue(b, G.splash_big(r), IMPACT, -2, "PLUNGE splash"); cue(b, thump(r, 45, 1.0), IMPACT, -6, "impact thump")
    # rescue
    a, e = sec("rescue_open")
    for k in range(3): cue(b, G.clink(r, f0=1500.0, dur=0.15), a + 6 + k * 4, -14, "prying")
    cue(b, G.wood_crack(r), LIDPOP - 1, -8, "lid pops"); cue(b, pop(400, 900, 0.12), LIDPOP, -10, "pop")
    cue(b, slide(300, 900, 0.25), Wd["annie2"] - 7, -10, "up she pops"); cue(b, G.whoa(r, 140, 0.6), Wd["annie2"] + 2, -14, "rivermen gasp")
    for k in range(3): cue(b, I.glock(I.m2f([84, 88, 91][k]), 0.4, r), Wd["annie2"] + 4 + k * 5, -18, "dazed twinkle")
    # the problem, the fortune, the purse
    cue(b, slide(500, 330, 0.5), Wd["problem"], -12, "uh-oh")
    a, e = sec("fortune"); cue(b, jingle(F(e - a), r, 22), a, -12, "imagined gold shower", "integrated")
    land = Wd["money"] - 2 + round(FPS * np.sqrt(2 * 0.74 / 9.8))
    cue(b, coin(r, 3200), land, -8, "lonely coin lands"); cue(b, coin(r, 3600), land + 7, -14, "coin bounce")
    for f in [SH["barrel_cu"][0], SH["annie"][0], SH["cat_in"][0], SH["current"][0], SH["rescue_open"][0], SH["purse"][0]]: cue(b, G.whoosh(0.4, r, 0.4), f - 5, -22, "cut whoosh")
    return b + 0.1 * convolve_st(b, make_ir(0.9, 7, hf=1.4))


# ---------------------------------------------------------------- score (original)
M = I.m2f


def build_music():
    b = np.zeros((2, N)); r = rng(2026)
    pl = lambda t, m, v=0.45, p=0.15: place(b, pan(I.pluck(M(m), v, r, 0.9, 0.6), p), t)
    bass = lambda t, m, v=0.5: place(b, pan(I.pluck(M(m), v, r, 1.3, 0.3), -0.2), t)
    tim = lambda t, m, v=0.6: place(b, st(I.timpani(M(m), v, r, 1.8)), t)
    stab = lambda t, ms, d=0.3, v=0.8, kind="stab": [place(b, pan(I.brass(M(m), d, v, r, kind), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    BT = 60 / 112  # 112 bpm, F major-ish adventure
    PROG = [(53, [65, 69, 72]), (58, [65, 70, 74]), (60, [64, 67, 72]), (53, [65, 69, 72])]
    def bed(t0, t1, vel=0.4, drums=True):
        k = 0
        while t0 + k * BT / 2 < t1 - 0.15:
            t = t0 + k * BT / 2; root, ch = PROG[(k // 8) % 4]
            pl(t, ch[k % 3] + (12 if k % 4 == 3 else 0), vel * (1.0 if k % 2 == 0 else 0.7), 0.25 if k % 2 else -0.15)
            if k % 4 == 0: bass(t, root - 12, vel * 1.1)
            if drums and k % 8 == 0: tim(t, root - 12, vel * 0.7)
            k += 1
    end = F(TOTAL)
    bed(0.0, F(SH["current"][0]), 0.42)
    stab(F(Wd["falls"]), [65, 69, 72], 0.35, 0.6); stab(F(Wd["rich"]), [65, 69, 72, 77], 0.3, 0.6)
    place(b, st(I.glock(M(84), 0.5, r)), F(Wd["plan"])); place(b, st(I.glock(M(89), 0.45, r)), F(Wd["rich"]))
    # tension: the run to the edge, timpani building, then silence for the fall's whistle
    for k in range(int((F(LIP) - F(SH["current"][0])) / (BT / 2))): tim(F(SH["current"][0]) + k * BT / 2, 41 + (k // 4) % 2 * 2, 0.3 + 0.03 * k)
    for k, tri in enumerate([[53, 57, 60], [55, 58, 62], [56, 60, 63]]): place(b, st(I.pad([M(m) for m in tri], 0.75, 0.35, r)), F(SH["current"][0]) + k * 0.75)
    stab(F(IMPACT), [41, 48, 53], 0.6, 1.0); place(b, st(I.cymbal(0.8, r, 2.4)), F(IMPACT))
    # the rescue: light comic plucks; relief chord on "survived"
    bed(F(SH["rescue_open"][0]) + 0.3, F(SH["problem"][0]), 0.32, False)
    stab(F(Wd["survived"]), [65, 69, 72, 77], 0.4, 0.6, "soft")
    # the problem: a minor turn; the fortune: a little fanfare; the purse: the band stops dead
    stab(F(Wd["problem"]), [56, 60, 63], 0.4, 0.6)
    stab(F(SH["fortune"][0] + 4), [65, 69, 72], 0.25, 0.8); stab(F(Wd["fortune"]), [65, 69, 72, 77], 0.5, 0.9)
    place(b, st(I.cymbal(0.4, r, 1.4)), F(Wd["fortune"]))
    bed(F(SH["fortune"][0]), F(SH["purse"][0]), 0.45)
    # deadpan button: a lone glock note on the coin, and a soft two-note shrug on the last word
    place(b, st(I.glock(M(77), 0.35, r)), F(Wd["money"] + 8))
    place(b, pan(I.pluck(M(60), 0.4, r, 1.2, 0.4), 0.1), F(Wd["rich2"])); place(b, pan(I.pluck(M(53), 0.45, r, 1.6, 0.4), -0.1), F(Wd["it"]))
    b[:, ns(F(SH["purse"][0])): ns(F(SH["purse"][0])) + 1] *= 1  # (the bed above ends at the smash cut)
    return b + 0.15 * convolve_st(b, make_ir(1.1, 3, hf=1.3))


# ---------------------------------------------------------------- mix (house standard, from the troy short)
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
    words = json.load(open(os.path.join(HERE, "..", "voice", "words.json")))
    sfx = build_sfx() * dbg(-6.0)
    mus = build_music()
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
    for name, x in [("mix", mix), ("stem_voice", voice), ("stem_music", mus), ("stem_sfx", sfx)]: write_wav(os.path.join(HERE, name + ".wav"), x)
    with open(os.path.join(HERE, "cues.md"), "w") as f:
        f.write(f"# Sound cues (frame, time, cue, level vs voice in LU)\n\nvoice {VREF:.1f} LUFS, mix {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP, {N / SR:.3f} s\n\n")
        for fr_, name, db in sorted(CUES): f.write(f"- {int(fr_):5d}  {fr_ / FPS:6.2f} s  {name}  ({db:+.0f})\n")
    print(f"voice {VREF:.1f} LUFS | mix {integrated(mix):.1f} LUFS | peak {true_peak(mix):.1f} dBTP | music {integrated(mus):.1f} | sfx {integrated(sfx):.1f} | {N / SR:.3f} s")


if __name__ == "__main__":
    main()
