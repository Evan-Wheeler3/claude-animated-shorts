# Sound for "U-1206: the worst flush in naval history": the narration (untouched) + synthesized SFX + a small original
# score, all numpy. Same recipe and house mix as the Niagara/troy/eiffel/emu shorts (SFX -6 dB, music 10 LU under the
# voice and ducked 3 dB under speech, -15 LUFS integrated, true peak <= -1 dBTP). Library: templates/audio.
# Every cue sits on a picture frame read from the story module (timing.json from scripts/story-json.mjs).
# usage: node scripts/story-json.mjs src/videos/u1206/story.ts videos/u1206-toilet-disaster/audio/timing.json
#        python3 videos/u1206-toilet-disaster/audio/make.py   -> mix.wav, stem_*.wav, cues.md (48 kHz stereo, exact length)
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
Wd = T["words"]                                   # word onsets, frames
SH = {s["key"]: (s["a"], s["b"]) for s in T["shots"]}
L = 2
BLAST = SH["s01_blast"][0] + T["BLAST_F"]         # the bowl erupts (shot 01, local frame)
BREACH = SH["s10_breach"][0] + T["BREACH_F"]      # the boat breaks the surface
CATCH, FLOOD, BLOW, BUBBLE = Wd["went"] - L, Wd["blasting"] - L - 9, Wd["crew"], Wd["history"] - L
END = Wd["end"]                                   # the last word ends here; the rest is a silent hold
R = rng(1206)
CUES = []
VREF = -20.0


def cue(buf, x, f, db, name, mode="momentary", p=None):
    """place sound x at frame f, at `db` LU relative to the voice (momentary max, or integrated for beds)"""
    x = st(x) if p is None else pan(x if x.ndim == 1 else x.mean(0), p)
    place(buf, norm_to(x, VREF + db, mode), F(f))
    CUES.append((f, name, db))


def span(*keys):
    return SH[keys[0]][0], SH[keys[-1]][1]


# ---------------------------------------------------------------- sound makers (U-1206-specific)
def hum(dur, r, f0=50.0):
    """inside the boat: electric-motor hum, its harmonics and a soft machinery wash"""
    n = ns(dur); t = np.arange(n) / SR
    y = sum(np.sin(TAU * f0 * k * t + r.uniform(0, TAU)) / k ** 1.3 for k in (1, 2, 3, 4, 6))
    y = y * (0.9 + 0.1 * smooth_noise(n, r, 0.6)) + lp(colored(n, r, 1.2), 500) * 0.6
    return widen(fades(y, 0.4, 0.4), r, 13, 0.6)


def deep(dur, r):
    """underwater: a deep, slow rumble with faint bubbles"""
    n = ns(dur)
    y = lp(colored(n, r, 1.8), 160) * (0.8 + 0.2 * smooth_noise(n, r, 0.25)) * 1.6
    return widen(fades(y, 0.8, 0.8), r, 17, 0.8) + 0.25 * st(G.bubbles(dur, r, 2.0, 250, 1400)[:n])


def ping(r, f0=1350.0):
    """sonar ping: a pure tone with a long watery tail"""
    n = ns(2.2); t = np.arange(n) / SR
    y = np.sin(TAU * f0 * t) * np.exp(-t / 0.45) * np.clip(t / 0.004, 0, 1)
    return fades(y + 0.3 * np.sin(TAU * f0 * 1.003 * t) * np.exp(-t / 0.9), 0.002, 0.3)


def sea(dur, r):
    w, b = G.water_bed(dur, r, close=0.7, slosh_rate=0.7), G.breeze(dur, r, 0.8)
    n = min(w.shape[1], b.shape[1]); return w[:, :n] + 0.5 * b[:, :n]


def hiss(dur, r, lo=1800, hi=9000, att=0.01):
    n = ns(dur); t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), lo, hi) * np.clip(t / att, 0, 1) * (0.85 + 0.15 * smooth_noise(n, r, 3)), 0.002, min(0.3, dur / 3))


def geyser(r, dur=1.4):
    """the toilet erupts: a pressurised blast of water (splash) on a roaring hiss"""
    a = st(G.splash_big(r))
    h = st(hiss(dur, r, 500, 7000, 0.005)) * 0.7
    out = np.zeros((2, max(a.shape[1], h.shape[1]))); out[:, : a.shape[1]] += a; out[:, : h.shape[1]] += h
    return out


def klaxon(dur, r, f0=420.0, period=0.9):
    """dive alarm: a buzzy two-tone horn, on/off"""
    n = ns(dur); t = np.arange(n) / SR
    f = f0 * np.where((t % period) < period * 0.5, 1.0, 0.84)
    y = signal.square(phase(f)) * 0.5 + np.sin(phase(f * 2)) * 0.2
    gate = ((t % period) < period * 0.42).astype(float)
    gate = ndimage.uniform_filter1d(gate, ns(0.012))
    return fades(bp(y, 250, 3500) * gate, 0.01, 0.05)


def airblast(r, dur=1.6):
    """high-pressure air into the ballast tanks: a roaring hiss with a low rumble"""
    n = ns(dur); t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 300, 6000) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.9) + lp(colored(n, r, 1.5), 140) * np.exp(-t / 0.7) * 1.5
    return fades(y, 0.002, 0.3)


def prop_plane(dur, r, f0=95.0):
    """a piston aircraft passing: buzzy harmonic drone with a doppler sweep and a swell"""
    n = ns(dur); t = np.arange(n) / SR; u = t / dur
    f = f0 * (1.06 - 0.12 * u)
    ph = phase(f)
    y = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 12)) * (1 + 0.3 * np.sin(TAU * 18 * t))
    env = np.exp(-((u - 0.55) / 0.3) ** 2)
    y = fades(bp(y, 80, 4000) * env, 0.2, 0.4)
    return np.stack([y * (1 - 0.6 * u), y * (0.4 + 0.6 * u)])   # passes left to right


def boom(r, d=2.0):
    """depth-charge / bomb hit: a deep thump with a rolling noise tail"""
    n = ns(d); t = np.arange(n) / SR
    y = np.sin(phase(42 * (1 + 1.2 * np.exp(-t / 0.05)))) * np.exp(-t / 0.4) * 1.4
    y += lp(colored(n, r, 1.3), 700) * np.exp(-t / 0.6) * 0.9 + bp(r.standard_normal(n), 800, 5000) * np.exp(-t / 0.05) * 0.3
    return widen(fades(y, 0.001, 0.4), r, 9, 0.7)


def groan(dur, r):
    """the hull complaining as it sinks: low metal groan"""
    return G.chain_groan(dur, r, 0.4, 1.0, 14, 24)


def flush(r, dur=1.9):
    """a toilet flush: the gush, a swirling gurgle that falls in pitch, the tank refill"""
    n = ns(dur); t = np.arange(n) / SR
    gush = bp(r.standard_normal(n), 400, 5000) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.7)
    swirl = bp(r.standard_normal(n), 300, 2500) * (0.6 + 0.4 * np.sin(TAU * (6 - 2.5 * t / dur) * t)) * np.exp(-((t - 0.8) / 0.5) ** 2)
    gl = G.bubbles(dur, r, 40, 250, 1600)
    y = gush + 0.8 * swirl + 0.6 * gl[:n] * np.exp(-((t - 0.9) / 0.6) ** 2)
    return fades(y, 0.004, 0.25)


# ---------------------------------------------------------------- SFX stem
def build_sfx():
    b = np.zeros((2, N)); r = R
    # beds by location: interior hum (with an alarm wash later), underwater depths, the open sea
    for keys, lvl in [(("s01_blast",), -22), (("s04_captain", "s08_cutaway"), -22), (("s09_gas", "s10a_blow"), -22)]:
        a, e = span(*keys); cue(b, hum(F(e - a) + 0.3, r), a, lvl, f"sub hum {keys[0]}", "integrated")
    for keys, lvl in [(("s02_hero", "s03_depth"), -18), (("s14_wreck",), -18)]:
        a, e = span(*keys); cue(b, deep(F(e - a) + 0.4, r), a, lvl, f"the deep {keys[0]}", "integrated")
    a, e = span("s10_breach", "s12_scuttle"); cue(b, sea(F(e - a) + 0.3, r), a, -18, "open sea", "integrated")
    # hook: the wheel jerks round, the bowl erupts
    cue(b, G.creak(0.3, r, 160, 280, rough=0.2), 0, -10, "valve wheel squeal")
    cue(b, G.clink(r, f0=700.0, dur=0.25), 8, -10, "wheel clunk")
    cue(b, geyser(r), BLAST, -2, "TOILET GEYSER")
    # the boat at depth
    cue(b, G.whoosh(0.9, r, 0.5, 200, 1200), SH["s02_hero"][0] - 4, -14, "into the water")
    cue(b, ping(r), Wd["u1206"] - 2, -10, "sonar ping"); cue(b, ping(r, 1350.0), Wd["underwater"], -16, "sonar ping (echo)")
    # the complicated toilet: pipes knock and gurgle; the specialist
    cue(b, G.clink(r, f0=900.0, dur=0.2), Wd["highpressure"], -12, "pipe knock")
    cue(b, G.bubbles(0.8, r, 18, 300, 1800), Wd["complicated"] - 4, -14, "pipes gurgle")
    cue(b, G.rattle(0.5, r, 30), Wd["specialist"] - 2, -14, "tool rattle")
    # it goes wrong
    cue(b, G.creak(0.5, r, 120, 200, rough=0.3), CATCH - 6, -10, "valve strains")
    cue(b, G.clink(r, f0=500.0, dur=0.35), CATCH, -6, "valve clank (went wrong)")
    cue(b, hiss(1.3, r, 900, 8000), FLOOD, -6, "seawater blasting in")
    cue(b, G.splash_big(r), FLOOD + 9, -6, "water hits his face")
    a, e = SH["s07_flood"]; cue(b, G.water_bed(F(e - a), r, close=1.0, slosh_rate=1.8), FLOOD + 4, -14, "flooding", "integrated")
    # the spill into the battery room, chlorine gas, the alarm
    a, e = SH["s08_cutaway"]; cue(b, G.water_bed(F(e - a) + 0.3, r, close=1.0, slosh_rate=1.2), Wd["water"], -12, "water spills below", "integrated")
    cue(b, G.bubbles(1.2, r, 25, 400, 2500), Wd["battery"], -14, "fizz on the batteries")
    a, e = span("s09_gas", "s10a_blow"); cue(b, hiss(F(e - Wd["releasing"]), r, 2500, 9000, 0.2), Wd["releasing"], -11, "chlorine hiss", "integrated")
    cue(b, klaxon(F(e - (Wd["releasing"] - 4)), r), Wd["releasing"] - 4, -3, "dive alarm", "integrated")
    # blow the tanks and surface
    cue(b, G.creak(0.6, r, 90, 160, rough=0.25), BLOW - 8, -10, "the captain hauls the blow valve")
    cue(b, airblast(r), BLOW, -6, "high-pressure air blast")
    cue(b, G.whoosh(1.0, r, 0.6, 150, 900), BREACH - 12, -10, "rising"); cue(b, geyser(r, 1.0), BREACH, -2, "BREACH: the boat breaks the surface")
    # spotted from the air, damaged, abandoned
    a, e = SH["s11_aircraft"]; cue(b, prop_plane(F(e - a) + 1.0, r), a, -1, "aircraft passing", "integrated")
    cue(b, boom(r), Wd["damaged"] - 3, -2, "bomb hit (damaged)"); cue(b, G.splash_big(r), Wd["damaged"] + 4, -8, "water column")
    cue(b, G.whoa(r, 130, 0.8), Wd["abandoned"] - 2, -16, "crew abandon ship")
    # sinking to the floor; the punchline flush
    cue(b, G.whoosh(1.2, r, 0.5, 120, 700), SH["s14_wreck"][0] - 6, -12, "under again")
    cue(b, groan(2.2, r), Wd["eventually"] + 4, -10, "hull groans as she sinks")
    cue(b, boom(r, 1.4), Wd["floor"], -8, "settles on the seabed")
    cue(b, G.bubbles(1.0, r, 10, 300, 1500), BUBBLE, -14, "last bubbles")
    cue(b, flush(r), END + 4, 4, "THE FLUSH (the punchline, in the hold after the last word)")
    for k in ("s04_captain", "s06_valve", "s08_cutaway", "s11_aircraft", "s12_scuttle"): cue(b, G.whoosh(0.4, r, 0.4), SH[k][0] - 5, -22, "cut whoosh")
    return b + 0.12 * convolve_st(b, make_ir(0.8, 7, hf=1.2))


# ---------------------------------------------------------------- score (original): a small, wry naval cue in D minor
M = I.m2f


def build_music():
    b = np.zeros((2, N)); r = rng(1945)
    pl = lambda t, m, v=0.45, p=0.15: place(b, pan(I.pluck(M(m), v, r, 0.9, 0.5), p), t)
    tuba = lambda t, m, d=0.35, v=0.6: place(b, pan(I.brass(M(m), d, v, r, "tuba"), -0.15), t)
    tim = lambda t, m, v=0.6: place(b, st(I.timpani(M(m), v, r, 1.8)), t)
    stab = lambda t, ms, d=0.3, v=0.8, kind="stab": [place(b, pan(I.brass(M(m), d, v, r, kind), 0.2 * (i - 1)), t) for i, m in enumerate(ms)]
    BT = 60 / 100
    PROG = [(38, [62, 65, 69]), (34, [62, 65, 70]), (36, [60, 64, 67]), (33, [61, 64, 69])]   # Dm Bb C A
    def bed(t0, t1, vel=0.4, low=True):
        k = 0
        while t0 + k * BT / 2 < t1 - 0.15:
            t = t0 + k * BT / 2; root, ch = PROG[(k // 8) % 4]
            pl(t, ch[k % 3] + (12 if k % 4 == 3 else 0), vel * (1.0 if k % 2 == 0 else 0.7), 0.25 if k % 2 else -0.15)
            if low and k % 4 == 0: tuba(t, root, 0.3, vel * 1.2)
            k += 1
    # cold open hit on the geyser, then a sneaky bed through the setup
    stab(F(BLAST), [50, 57, 62], 0.5, 0.9); place(b, st(I.cymbal(0.6, r, 2.0)), F(BLAST))
    bed(F(SH["s02_hero"][0]), F(CATCH), 0.38)
    place(b, st(I.glock(M(81), 0.4, r)), F(Wd["specialist"]))
    # it goes wrong: a minor sting; tension under the flood, gas and alarm (timpani building)
    stab(F(CATCH), [49, 56, 61], 0.4, 0.8)
    t0, t1 = F(FLOOD), F(BLOW)
    for k in range(int((t1 - t0) / (BT / 2))): tim(t0 + k * BT / 2, 38 + (k // 6) % 2, 0.25 + 0.025 * k)
    for k, tri in enumerate([[50, 53, 57], [49, 52, 56], [50, 53, 58]]): place(b, st(I.pad([M(m) for m in tri], 1.4, 0.35, r)), t0 + k * 1.4)
    # surfacing: a heroic-ish lift that turns sour as the aircraft arrives
    stab(F(BREACH), [50, 57, 62, 65], 0.6, 0.9); place(b, st(I.cymbal(0.7, r, 2.2)), F(BREACH))
    stab(F(Wd["aircraft"]), [49, 52, 58], 0.5, 0.7)
    stab(F(Wd["damaged"]), [38, 45, 50], 0.7, 1.0)
    # the sinking: a slow descending tuba line; then the button on "worst flush"
    for k, m in enumerate([50, 48, 46, 45, 43, 38]): tuba(F(Wd["eventually"]) + k * 0.55, m, 0.5, 0.55)
    place(b, st(I.pad([M(m) for m in [50, 53, 57]], 2.4, 0.3, r)), F(Wd["all"]))
    stab(F(Wd["worst"]), [50, 53, 57], 0.25, 0.6); tuba(F(Wd["flush"]) + 0.5, 38, 0.6, 0.7); tuba(F(Wd["history"]) + 0.3, 33, 0.9, 0.6)
    return b + 0.15 * convolve_st(b, make_ir(1.1, 3, hf=1.3))


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
