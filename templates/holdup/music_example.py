# TEMPLATE (from Vasa): copy to videos/<story-id>/audio/music.py, then re-section it to the new script lines (S(), E(), w()).
# Keep: the instrument kit, ~16 LU under the voice, ducking, the -14 LUFS limiter. Change: keys, sections, hit points.
# Vasa: original, subtle background score + mix, synthesized with the bridge short's instrument kit (templates/audio).
# D minor, 100 bpm (one bar = 2.4 s). Sections follow the narration (voice/lines.json):
#   hook + build (pizzicato arpeggios, warm pad, glock sparkle on "sculptures") | the test (busier plucks, soft
#   timpani taps under the running) | departure (brighter, glock flourish on the salute) |
#   gust + sinking (low timpani roll, minor pad, then almost silence on the deaths) | "You see" (music-box motif) |
#   inquiry (sneaky staccato plucks, full stop on "Officially, nobody.") | raising + payoff (warm F major pad, plucks,
#   button on the last word).
# The bed sits ~16 LU under the voice and ducks a further 4 dB while words are spoken.
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


# 1. hook + build: L01..L03
pads(0, S('L04'), PROG_MIN, vel=.28)
arps(0.0, S('L04'), PROG_MIN, vel=.26)
sparkle(w('L02', 5) - .05)                       # "hundreds of painted sculptures"
# 2. the test: L04..L08, busier, timpani taps under the running
pads(S('L04'), S('L09'), ['Dm', 'Gm', 'Dm', 'A'], vel=.26)
arps(S('L04'), S('L07'), ['Dm', 'Gm', 'Dm', 'A'], vel=.30, step=Q / 3, pattern=(0, 1, 2), accent=1.15)
for k in range(int((E('L06') - S('L05')) / Q)):
    add('timp', I.timpani(m2f(38), vel=.22, r=r, dur=1.0), S('L05') + k * Q)
add('pluck', I.pluck(m2f(62), vel=.35, r=r, dur=.6), S('L07'))   # stop
add('pluck', I.pluck(m2f(57), vel=.30, r=r, dur=.6), S('L08') + .05)
# 3. departure: L09-L10, brighter, flourish on the salute
pads(S('L09'), S('L11'), ['F', 'C'], vel=.30)
arps(S('L09'), S('L11'), ['F', 'C'], vel=.30, pattern=(0, 2, 1, 2))
sparkle(w('L10', 6) - .05, notes=(77, 81, 84, 89), vel=.3)        # "cannon salute"
add('timp', I.timpani(m2f(41), vel=.35, r=r, dur=1.6), w('L10', 6))
# 5. gust + sinking: low roll into a minor hit, then near silence through the deaths
for k in range(18):
    add('timp', I.timpani(m2f(38), vel=.05 + .02 * k, r=r, dur=.6), S('L11') + k * .065)
add('timp', I.timpani(m2f(38), vel=.55, r=r, dur=2.6), S('L12'))
pads(S('L12'), S('L13'), ['Dm', 'Bb'], vel=.26, oct=-1)
add('pad', I.pad([m2f(38), m2f(45)], E('L13') - S('L13'), vel=.12, r=r, att=.8, rel=1.2, warm=400), S('L13'))
# 6. explanation: music-box curiosity motif over a light pad
pads(S('L14'), S('L17'), ['F', 'C', 'Dm', 'C'], vel=.18)
MOTIF = [(0, 74), (.5, 77), (1, 81), (1.5, 79), (2, 77), (3, 76), (3.5, 74)]
t = S('L14')
while t < S('L17') - 1:
    for b, n in MOTIF:
        add('box', I.musicbox(m2f(n + 12), vel=.28, r=r, dur=1.2), t + b * Q, p=-.2)
    t += 2 * BAR
add('timp', I.timpani(m2f(36), vel=.3, r=r, dur=1.4), w('L15', 11))   # "top-heavy" lands low
# 7. inquiry: sneaky staccato, hard stop on "Officially, nobody." then a single pluck on "nobody"
arps(S('L17'), S('L18') - .05, ['Dm', 'A'], vel=.26, step=Q / 2, pattern=(0, 2), up=0)
add('pluck', I.pluck(m2f(45), vel=.4, r=r, dur=1.0, bright=.2), w('L18', 1))
arps(S('L19'), S('L20'), ['Dm', 'Bb', 'A'], vel=.22, step=Q / 2, pattern=(0, 2), up=0)
# 8. raising + payoff: warm major, button on the last word
pads(S('L20'), E('L21') + .4, PROG_END, vel=.30)
arps(S('L20') + Q, E('L21'), PROG_END, vel=.28, pattern=(0, 1, 2, 1))
sparkle(E('L21') - .05, notes=(77, 81, 84, 89, 93), vel=.3)
add('timp', I.timpani(m2f(41), vel=.4, r=r, dur=2.0), E('L21') - .05)

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
