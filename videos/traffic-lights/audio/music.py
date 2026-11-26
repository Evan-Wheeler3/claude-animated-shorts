# traffic-lights: solo piano bed (from safety-matches/audio/music.py; owner rule: piano only, no percussion, quiet).
# D minor -> F major, 92 bpm. Cues follow voice/lines.json + words.json:
#   L01-L06 the gas light and the cop in the street: curious broken chords, a low "uh-oh" on each new problem
#   ("problem", "exploded", "But") | L07 electric light: brighter, rising figure on "electric" | L08-L09 two lights, too sudden:
#   back to minor | L10-L11 yellow: rising figure on "yellow", warm major | L11->L12 pause: piano stops on one soft held chord,
#   then a cheeky falling figure lands on "suggestion" (the closing joke).
# The bed sits ~20 LU under the voice and ducks a further 4 dB while words are spoken.
# Usage: python music.py <voice_dir> <out_dir>
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

W_ = lambda line, word: next(x['start'] for x in words if x['line'] == line and x['word'].lower().strip('.,!?:') == word)
def uhoh(t): note(38, t, .26, 1.6, pan=-.2); note(45, t + .02, .2, 1.4, pan=-.2)

# hook + the gas light + the cop in the street: curious minor, an "uh-oh" on every new problem
broken(0, S('L07'), ['Dm', 'Bb', 'F', 'C'], vel=.28)
motif(S('L02'), S('L04'), CURIOUS, vel=.2)
uhoh(W_('L01', 'face')); uhoh(W_('L04', 'problem')); uhoh(W_('L04', 'exploded')); uhoh(W_('L06', 'but'))
chord('Dm', W_('L04', 'exploded') + .3, vel=.14, dur=2.2, up=-12)
# 1912, the electric light: brighter, a rising figure on "electric"
broken(S('L07'), S('L08'), ['F', 'C', 'Bb', 'F'], vel=.30)
for j, m in enumerate((72, 76, 79, 84)):
    note(m, W_('L07', 'electric') - .25 + j * .1, .22, 2.0, pan=.3)
# only two lights, too sudden: back to minor, uh-oh on "problem"
broken(S('L08'), S('L10'), ['Dm', 'Bb', 'Gm', 'A'], vel=.27)
uhoh(W_('L08', 'problem'))
# the yellow light: rising figure into "yellow", warm major to the end of L11
broken(S('L10'), E('L11') - .1, ['F', 'C', 'Dm', 'Bb'], vel=.28)
for j, m in enumerate((72, 76, 79, 81, 84)):
    note(m, W_('L10', 'yellow') - .3 + j * .08, .22, 2.0, pan=.3)
motif(S('L10'), E('L11') - .4, WARM, vel=.2)
# the pause: one soft held chord, then a cheeky falling figure lands on "suggestion"
chord('C', E('L11') - .02, vel=.15, dur=S('L12') - E('L11') + .4)
t0 = W_('L12', 'suggestion')
for j, m in enumerate((79, 78, 77, 76)):
    note(m, t0 - .35 + j * .13, .2, 1.4 if j < 3 else 2.5, pan=.25)
chord('F', t0 + .2, vel=.26, dur=3.0)

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
