# safety-matches: original background score (from videos/coin-ridges/audio/music.py), SOLO PIANO only (owner note 2026-11-25: "no percussive hits, just piano,
# a little quieter"). Synthesised piano (additive partials, slight inharmonicity, two detuned strings, soft hammer).
# D minor -> F major, 92 bpm. Sections follow voice/lines.json:
#   hook + gag + clipping L01-L05 (curious broken chords; silence for the L03 joke beat) | machine coins L06-L07 |
#   recoinage + Newton L08-L10 (brighter F/C, rising figure on "Isaac Newton", high wink on "gravity") | the chase
#   L11-L12 (low, sparse, stops on "hanged") | today + payoff L13-L14 (gentle motif, warm major, soft final chord on
#   the last word). Script v4 line numbers. No percussion, no pads.
# The bed sits ~20 LU under the voice (v1 was 16) and ducks a further 4 dB while words are spoken.
# Usage: python music.py <voice_dir> <out_dir>      (voice_dir holds voice.wav, lines.json, words.json)
import json, os, sys
import numpy as np
from scipy.signal import resample_poly
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../templates/audio'))
from dsp import SR, ns, rng, make_ir, convolve_st, integrated, hp, lp, dbg  # noqa: E402

VDIR, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
lines = {l['line']: l for l in json.load(open(f'{VDIR}/lines.json'))}
words = json.load(open(f'{VDIR}/words.json'))
voice, vsr = sf.read(f'{VDIR}/voice.wav', dtype='float64')
if voice.ndim > 1:
    voice = voice.mean(1)
voice = resample_poly(voice, SR, vsr)
DUR = len(voice) / SR + 1.2
N = ns(DUR)
S = lambda k: lines[k]['start']
E = lambda k: lines[k]['end']
w = lambda line, i: [x for x in words if x['line'] == line][i]['start']
m2f = lambda m: 440.0 * 2 ** ((m - 69) / 12)

Q = 60 / 92
BAR = 4 * Q
CH = {'Dm': [38, 45, 50, 53, 57], 'Bb': [34, 41, 46, 50, 53], 'F': [41, 48, 53, 57, 60], 'C': [36, 43, 48, 52, 55],
      'Gm': [43, 50, 55, 58, 62], 'A': [33, 45, 49, 52, 57]}
r = rng(7)
bed = np.zeros((2, N))


def piano(f, vel=0.5, dur=2.5):
    """Soft synth piano note: 8 partials with stretch, per-partial decay, two detuned strings, felt hammer."""
    n = ns(dur)
    t = np.arange(n) / SR
    B = 0.0004                       # inharmonicity
    out = np.zeros(n)
    bright = 0.35 + 0.5 * vel
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = (bright ** (k - 1)) / k
        dec = 0.9 + 0.0025 * fk      # higher partials die faster
        for det in (-0.6, 0.6):
            out += amp * np.exp(-dec * t) * np.sin(2 * np.pi * (fk + det) * t + r.uniform(0, 6.28))
    att = np.minimum(1, t / 0.004)
    rel = np.minimum(1, (dur - t) / 0.25).clip(0, 1)
    out *= att * rel * vel / 4
    return out


def note(m, t, vel=0.4, dur=2.5, pan=0.0):
    x = piano(m2f(m), vel, dur)
    i = ns(t)
    if i >= N:
        return
    n = min(len(x), N - i)
    th = (pan + 1) * np.pi / 4
    bed[0, i:i + n] += np.cos(th) * x[:n]
    bed[1, i:i + n] += np.sin(th) * x[:n]


def broken(t0, t1, prog, vel=.30, step=Q / 2, pattern=(0, 2, 3, 2), up=0):
    """Left-hand broken chords (bass note held), one chord per bar."""
    t, i = t0, 0
    while t < t1 - .05:
        ch = CH[prog[int((t - t0) // BAR) % len(prog)]]
        if i % 8 == 0:
            note(ch[0] - 12 + 12, t, vel * 1.1, BAR * 1.1, pan=-.3)
        n = ch[pattern[i % len(pattern)]] + up
        note(n, t, vel * r.uniform(.85, 1.0), 1.6, pan=-.15)
        t += step; i += 1


def motif(t0, t1, notes, vel=.28, step=Q, pan=.25):
    t, j = t0, 0
    while t < t1 - .1:
        b, n = notes[j % len(notes)]
        note(n, t + b * step, vel * r.uniform(.9, 1.0), 2.2, pan=pan)
        j += 1
        if j % len(notes) == 0:
            t += 2 * BAR


def chord(name, t, vel=.3, dur=3.0, up=0):
    for k, m in enumerate(CH[name][1:]):
        note(m + up, t + k * .018, vel, dur, pan=-.1 + .1 * k)


PROG_MIN = ['Dm', 'Bb', 'F', 'C']
CURIOUS = [(0, 74), (.5, 77), (1, 76), (1.5, 74), (2, 72), (3, 69)]
WARM = [(0, 72), (.5, 76), (1, 79), (2, 77), (2.5, 76), (3, 72)]

# chain: steady curious broken chords; a soft low "uh-oh" note on every "But" (each new problem)
broken(0, S('L06'), ['Dm', 'Bb', 'F', 'C'], vel=.28)
motif(S('L02'), S('L05'), CURIOUS, vel=.2)
for k in ['L01', 'L02', 'L03', 'L04']:
    ws = [x for x in words if x['line'] == k]
    for x in ws:
        if x['word'].lower().strip('.,!') == 'but':
            note(38, x['start'], .26, 1.6, pan=-.2); note(45, x['start'] + .02, .2, 1.4, pan=-.2)
# the jaw: hushed, sparse low notes
chord('Dm', S('L05'), vel=.16, dur=2.5, up=-12)
# the split + safety match: brighter major, rising figure into "safety"
broken(S('L06'), S('L08'), ['F', 'C', 'Bb', 'F'], vel=.30, pattern=(0, 2, 3, 2))
for j, m in enumerate((72, 76, 79, 84)):
    note(m, w('L07', 23) - .25 + j * .1, .24, 2.2, pan=.3)
# callback: warm motif, soft final chord on the last word
broken(S('L08'), E('L08') - .1, ['F', 'C', 'Dm', 'Bb'], vel=.26)
motif(S('L08'), E('L08') - .4, WARM, vel=.22)
# the pause before the punchline: the piano stops, one soft held suspension, then the final chord lands on "help"
chord('C', E('L08') - .02, vel=.16, dur=S('L09') - E('L08') + .5)
chord('F', w('L09', 4) - .03, vel=.30, dur=3.0)

# ---------- mix ----------
hall = make_ir(1.8, 5, pre=.02, hf=1.4)
bed = bed + .30 * convolve_st(bed.mean(0), hall)[:, :N]
bed = hp(lp(bed, 8000, 2), 50, 2)

# duck 4 dB under spoken words (20 ms attack / 250 ms release)
env = np.zeros(N)
for x in words:
    env[ns(x['start'] - .05):ns(x['end'] + .1)] = 1
k_att, k_rel = 1 - np.exp(-1 / (SR * .02)), 1 - np.exp(-1 / (SR * .25))
g = np.empty(N); y = 0.0
for i in range(N):
    y += (k_att if env[i] > y else k_rel) * (env[i] - y); g[i] = y
bed *= dbg(-4.0 * g)

v = np.zeros((2, N)); v[:, :len(voice)] = voice
v *= dbg(-16.0 - integrated(v))                    # voice -16 LUFS
bed *= dbg(-16.0 - 20.0 - integrated(bed))         # bed ~20 LU under the voice (quieter than v1's 16)
mix = v + bed
from scipy.ndimage import minimum_filter1d, uniform_filter1d  # noqa: E402
for _ in range(3):
    mix *= dbg(-14.0 - integrated(mix))
    need = np.minimum(1.0, .9 / np.maximum(np.abs(mix).max(0), 1e-9))
    wl = ns(.005)
    gl = uniform_filter1d(minimum_filter1d(need, 2 * wl + 1), 2 * wl + 1)
    mix *= gl[None, :]
mix *= min(1.0, .93 / np.abs(mix).max())
sf.write(f'{OUT}/music.wav', bed.T.astype(np.float32), SR)
sf.write(f'{OUT}/mix.wav', mix.T.astype(np.float32), SR)
print(f'dur {N / SR:.2f}s  voice {integrated(v):.1f}  bed {integrated(bed):.1f}  mix {integrated(mix):.1f} LUFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
