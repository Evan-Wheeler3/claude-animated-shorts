# coin-ridges: original, subtle background score + mix (re-sectioned from templates/holdup/music_example.py).
# D minor, 100 bpm (one bar = 2.4 s). Sections follow voice/lines.json:
#   clipping (sneaky pizzicato, glock sparkle on "free silver", low hit on "death") | machine coins (mechanical
#   triplet plucks + press-like timpani taps, pluck on "away") | recoinage + Newton (brighter F/C, sparkle on
#   "Isaac Newton", music-box wink on "gravity guy") | the chase (sneaky staccato, low hit on "hanged", near
#   silence) | today + payoff (music-box motif, warm major, button on the last word).
# Usage: python music.py <voice_dir> <out_dir>      (voice_dir holds voice.wav, lines.json, words.json)
import json, os, sys
import numpy as np
from scipy.signal import resample_poly
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../templates/audio'))
from dsp import SR, ns, rng, place, make_ir, convolve_st, integrated, hp, lp, dbg  # noqa: E402
import instruments as I  # noqa: E402

VDIR, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
lines = {l['line']: l for l in json.load(open(f'{VDIR}/lines.json'))}
words = json.load(open(f'{VDIR}/words.json'))
voice, vsr = sf.read(f'{VDIR}/voice.wav', dtype='float64')
if voice.ndim > 1:
    voice = voice.mean(1)
voice = resample_poly(voice, SR, vsr)
DUR = len(voice) / SR + 0.6
N = ns(DUR)
S = lambda k: lines[k]['start']
E = lambda k: lines[k]['end']
w = lambda line, i: [x for x in words if x['line'] == line][i]['start']

Q = 0.6           # quarter note at 100 bpm
BAR = 4 * Q
m2f = I.m2f
CH = {'Dm': [50, 53, 57], 'Bb': [46, 50, 53], 'F': [41, 45, 48], 'C': [48, 52, 55], 'Gm': [43, 46, 50], 'A': [45, 49, 52]}
PROG_MIN = ['Dm', 'Bb', 'F', 'C']
PROG_END = ['F', 'C', 'Dm', 'Bb', 'F']

tr = {k: np.zeros((2, N)) for k in ['pad', 'pluck', 'glock', 'timp', 'box']}
r = rng(11)


def add(track, x, t, gain=1.0, p=0.0):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        th = (p + 1) * np.pi / 4
        x = np.stack([x * np.cos(th), x * np.sin(th)])
    i = ns(t)
    if i >= N:
        return
    n = min(x.shape[1], N - i)
    tr[track][:, i:i + n] += gain * x[:, :n]


def pads(t0, t1, prog, vel=.30, oct=0):
    t, k = t0, 0
    while t < t1 - .2:
        d = min(BAR, t1 - t)
        add('pad', I.pad([m2f(n + 12 * oct) for n in CH[prog[k % len(prog)]]], d, vel=vel, r=r, att=.5, rel=.8, warm=700), t)
        t += BAR; k += 1


def arps(t0, t1, prog, vel=.32, step=Q / 2, pattern=(0, 1, 2, 1), up=12, accent=1.0):
    t, i = t0, 0
    while t < t1 - .05:
        ch = CH[prog[int((t - t0) // BAR) % len(prog)]]
        n = ch[pattern[i % len(pattern)]] + up + (12 if i % 8 >= 4 else 0)
        v = vel * (accent if i % 4 == 0 else .8) * r.uniform(.9, 1.05)
        add('pluck', I.pluck(m2f(n), vel=v, r=r, dur=.7, bright=.45), t, p=r.uniform(-.35, .35))
        t += step; i += 1


def sparkle(t, notes=(81, 86, 89, 93), vel=.25, gap=.09):
    for j, n in enumerate(notes):
        add('glock', I.glock(m2f(n), vel=vel, r=r, dur=1.4), t + j * gap, p=.3)


# 1. clipping: L01..L04
pads(0, S('L05'), PROG_MIN, vel=.24)
arps(0.0, S('L04'), PROG_MIN, vel=.26, step=Q / 2, pattern=(0, 2, 1, 2))
sparkle(w('L03', 14) - .05)                                        # "free silver"
add('timp', I.timpani(m2f(38), vel=.45, r=r, dur=2.0), w('L04', 10))   # "death"
# 2. machine coins: L05..L07, mechanical plucks + press taps
pads(S('L05'), S('L08'), ['Dm', 'Gm', 'Dm', 'A'], vel=.24)
arps(S('L05'), E('L06'), ['Dm', 'Gm', 'Dm', 'A'], vel=.28, step=Q / 3, pattern=(0, 1, 2), accent=1.15)
for k in range(int((E('L05') - S('L05')) / Q)):
    add('timp', I.timpani(m2f(41), vel=.16, r=r, dur=.6), S('L05') + k * Q)
add('pluck', I.pluck(m2f(69), vel=.38, r=r, dur=.8), w('L06', 11))   # "away"
arps(S('L07'), E('L07'), ['Dm', 'A'], vel=.2, step=Q / 2, pattern=(0, 2), up=0)
# 3. recoinage + Newton: L08..L10, brighter
pads(S('L08'), S('L11'), ['F', 'C', 'Bb', 'F'], vel=.28)
arps(S('L08'), S('L11'), ['F', 'C', 'Bb', 'F'], vel=.28, pattern=(0, 2, 1, 2))
sparkle(w('L09', 11) - .05, notes=(77, 81, 84, 89), vel=.32)       # "Isaac Newton"
add('timp', I.timpani(m2f(41), vel=.32, r=r, dur=1.4), w('L09', 11))
for j, n in enumerate((84, 88, 91)):
    add('box', I.musicbox(m2f(n), vel=.3, r=r, dur=1.0), w('L10', 2) + j * .12, p=-.2)   # "gravity"
# 4. the chase: L11..L12, sneaky staccato, low hit on "hanged", then near silence
arps(S('L11'), w('L12', 8) - .05, ['Dm', 'A', 'Dm', 'Bb'], vel=.26, step=Q / 2, pattern=(0, 2), up=0)
add('timp', I.timpani(m2f(36), vel=.55, r=r, dur=2.4), w('L12', 8))
add('pad', I.pad([m2f(38), m2f(45)], S('L13') - w('L12', 8), vel=.10, r=r, att=.3, rel=1.0, warm=400), w('L12', 8))
# 5. today + payoff: L13..L15
pads(S('L13'), S('L15'), ['F', 'C', 'Dm', 'C'], vel=.18)
MOTIF = [(0, 74), (.5, 77), (1, 81), (1.5, 79), (2, 77), (3, 76), (3.5, 74)]
t = S('L13')
while t < S('L15') - 1:
    for b, n in MOTIF:
        add('box', I.musicbox(m2f(n + 12), vel=.26, r=r, dur=1.2), t + b * Q, p=-.2)
    t += 2 * BAR
pads(S('L15'), E('L15') + .4, PROG_END, vel=.30)
arps(S('L15'), E('L15'), PROG_END, vel=.28, pattern=(0, 1, 2, 1))
sparkle(E('L15') - .05, notes=(77, 81, 84, 89, 93), vel=.3)
add('timp', I.timpani(m2f(41), vel=.4, r=r, dur=2.0), E('L15') - .05)

# ---------- mix ----------
TARGET = {'pad': -9, 'pluck': -7, 'glock': -13, 'timp': -11, 'box': -8}   # relative balance inside the bed (LUFS)
bed = np.zeros((2, N))
for k, x in tr.items():
    if np.any(x):
        bed += x * dbg(TARGET[k] - integrated(x))
hall = make_ir(1.6, 5, pre=.02, hf=1.3)
bed = bed + .35 * convolve_st(bed.mean(0), hall)[:, :N]
bed = hp(lp(bed, 9000, 2), 45, 2)

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
bed *= dbg(-16.0 - 16.0 - integrated(bed))         # bed ~16 LU under the voice
mix = v + bed
# look-ahead peak limiter (5 ms) so the mix reaches YouTube loudness (-14 LUFS) without clipping
from scipy.ndimage import minimum_filter1d, uniform_filter1d  # noqa: E402
for _ in range(3):
    mix *= dbg(-14.0 - integrated(mix))
    need = np.minimum(1.0, .9 / np.maximum(np.abs(mix).max(0), 1e-9))
    w = ns(.005)
    gl = uniform_filter1d(minimum_filter1d(need, 2 * w + 1), 2 * w + 1)
    mix *= gl[None, :]
mix *= min(1.0, .93 / np.abs(mix).max())
sf.write(f'{OUT}/music.wav', bed.T.astype(np.float32), SR)
sf.write(f'{OUT}/mix.wav', mix.T.astype(np.float32), SR)
print(f'dur {N / SR:.2f}s  voice {integrated(v):.1f}  bed {integrated(bed):.1f}  mix {integrated(mix):.1f} LUFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
