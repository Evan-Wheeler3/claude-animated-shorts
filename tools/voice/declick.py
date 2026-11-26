#!/usr/bin/env python3
"""Remove the hissy 't'/'ts' burst the voice-B TTS (Qwen3-TTS clone) puts at the start of a take.

Each take starts with ~50-90 ms of bright noise (spectral centroid > 4 kHz), then near-silence, then the words. In the
assembled narration it lands right after the previous sentence, so it sounds like a 't' at the end of every sentence.
For each line in voice/lines.json this looks at the first 0.35 s; if it finds a bright burst followed by a quiet gap
(< -58 dBFS) before the first word, it silences start..gap with 10 ms fades. Timing is unchanged (samples are zeroed,
not cut), so words.json stays valid.
Usage: python tools/voice/declick.py videos/<story-id>          (rewrites voice/voice.wav; run before music.py)
"""
import json, sys
import numpy as np, soundfile as sf

D = sys.argv[1].rstrip('/') + '/voice/'
a, sr = sf.read(D + 'voice.wav', dtype='float64')
L = json.load(open(D + 'lines.json')); W = json.load(open(D + 'words.json'))
hop = int(.01 * sr); f = np.fft.rfftfreq(hop, 1 / sr); win = np.hanning(hop)
def frame(i):
    x = a[i:i + hop]
    if len(x) < hop: return -120, 0
    sp = np.abs(np.fft.rfft(x * win)); r = np.sqrt((x ** 2).mean() + 1e-12)
    return 20 * np.log10(r), (sp * f).sum() / (sp.sum() + 1e-9)
fixed = []
for l in L:
    first = min(w['start'] for w in W if w['line'] == l['line'])
    s0 = int(max(0, l['start'] - .02) * sr); lim = int((l['start'] + .35) * sr)   # (whisper may put the first word's start on the burst itself)
    fr = [(i, *frame(i)) for i in range(s0, max(s0, lim), hop)]
    bright = [k for k, (_, db, c) in enumerate(fr) if db > -50 and c > 4000]
    if not bright or bright[0] > 4: continue                      # burst must be right at the take start
    quiet = next((k for k in range(bright[0], len(fr)) if fr[k][1] < -58), None)
    if quiet is None: continue
    e = fr[quiet][0] + hop; r = int(.01 * sr)
    g = np.ones(e - s0 + r); g[:e - s0] = 0; g[e - s0:] = np.linspace(0, 1, r)
    a[s0:e + r] *= g[:len(a[s0:e + r])]
    fixed.append(f"{l['line']} {1000 * (e - s0) / sr:.0f}ms")
sf.write(D + 'voice.wav', a, sr, subtype='PCM_16')
print('declicked', len(fixed), 'line starts:', ', '.join(fixed) or 'none')
