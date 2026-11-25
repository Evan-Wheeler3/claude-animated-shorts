#!/usr/bin/env python3
"""Hold Up pacing check for the animatic (stage 4) and the final cut.

Usage: python3 tools/check-pacing.py <words.json> <shots.json> [--fps 30] [--voice voice.wav]

words.json  a list of {"word"|"text", "start", "end"} in seconds (or {"words": [...]}).
shots.json  the same file scripts/short_qa.py reads: {"shots": [{"id", "a", "b"}], "planned": [[f, f], ...]}
            plus an optional "beats": [frame, ...] for new visuals inside a shot (insert, reveal,
            reaction swap, a camera move that reframes). Shot starts, planned cuts and beats all count
            as a new picture.

--voice measures pauses from the audio itself (silence < -40 dBFS for >= 0.25 s). Whisper word gaps overstate
pauses (Vasa: 5.2 s by word gaps vs 0.9 s of real silence), so with --voice the pause flags use the audio.
Targets come from references/reports/editing.md. Runtime is a soft target (45-60 s): it is reported
but never fails the check. Everything else is a FLAG to fix or to justify in the shot list.
Exit 1 if there are flags.
"""
import json, sys

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if len(args) < 2:
    sys.exit(__doc__)
fps = 30.0
if '--fps' in sys.argv:
    fps = float(sys.argv[sys.argv.index('--fps') + 1])

W = json.load(open(args[0], encoding='utf-8'))
W = W.get('words', W) if isinstance(W, dict) else W
words = [{'w': x.get('word', x.get('text', '')).strip(), 's': float(x['start']), 'e': float(x['end'])} for x in W]
S = json.load(open(args[1], encoding='utf-8'))
shots = S.get('shots', [])
if not words or not shots:
    sys.exit('words.json and shots.json must both be non-empty')

end_f = max(s['b'] for s in shots)
dur = end_f / fps
changes = sorted({s['a'] / fps for s in shots} | {c[0] / fps for c in S.get('planned', [])} | {b / fps for b in S.get('beats', [])})
changes = [c for c in changes if c < dur]

flags, notes = [], []
flag = flags.append

# ---- runtime (soft) ----
notes.append(f'runtime {dur:.1f} s ' + ('(inside the 45-60 s target)' if 45 <= dur <= 60 else
             '(outside the 45-60 s target: fine if the story needs it, say why in SHOTLIST.md)'))

# ---- voice ----
first, last = words[0]['s'], words[-1]['e']
if first > 0.20: flag(f'voice starts at {first:.2f} s; start within 0.2 s (reference: frame 1-4)')
tail = dur - last
if tail > 0.6: flag(f'{tail:.2f} s after the last word; end on the last word (<= 0.6 s)')
if tail < 0: flag(f'picture ends {-tail:.2f} s before the voice does')
speech = last - first
wps = len(words) / speech
notes.append(f'{len(words)} words, {wps:.2f} words/s (reference 3.5-4.1, median 3.7)')
if wps < 3.2: flag(f'narration is slow: {wps:.2f} words/s; tighten delivery or cut pauses')
if wps > 4.3: flag(f'narration is rushed: {wps:.2f} words/s; clarity first, cut words instead of speeding up')
gaps = [(words[i]['s'] - words[i - 1]['e'], words[i - 1]['w'], words[i]['w'], words[i]['s']) for i in range(1, len(words))]
if '--voice' in sys.argv:   # real silences from the audio replace the word-gap estimate
    import wave, array
    wf = wave.open(sys.argv[sys.argv.index('--voice') + 1]); sr = wf.getframerate(); nch = wf.getnchannels()
    pcm = array.array('h', wf.readframes(wf.getnframes()))[::nch]
    hop = sr // 100; env = [max(abs(x) for x in pcm[i:i + hop] or [0]) / 32768 for i in range(0, len(pcm), hop)]
    gaps, run = [], 0
    for k, e in enumerate(env + [1.0]):
        t = k / 100
        if e < 0.01 and first < t < last: run += 1
        else:
            if run >= 25:
                t0 = t - run / 100
                prev = max((w for w in words if w['e'] <= t0 + .1), key=lambda w: w['e'], default=words[0])
                nxt = min((w for w in words if w['s'] >= t - .1), key=lambda w: w['s'], default=words[-1])
                gaps.append((run / 100, prev['w'], nxt['w'], t))
            run = 0
long_gaps = [g for g in gaps if g[0] > 0.45]
total_pause = sum(g[0] for g in gaps if g[0] > 0.25)
notes.append(f'pauses > 0.25 s total {total_pause:.2f} s (reference < 1 s)')
for g, a, b, t in long_gaps:
    flag(f'{g:.2f} s pause at {t:.1f} s between "{a}" and "{b}"; keep deliberate pauses to a planned beat (<= 0.45 s)')

# ---- picture rhythm ----
pts = changes + [dur]
holds = [(pts[i + 1] - pts[i], pts[i]) for i in range(len(pts) - 1)]
mean_hold = sum(h for h, _ in holds) / len(holds)
notes.append(f'{len(changes)} new pictures, one every {mean_hold:.1f} s on average (reference ~1.5-2.5 s)')
if mean_hold > 3.0: flag(f'average {mean_hold:.1f} s per picture is slow; give most sentences two visuals')
for h, t in holds:
    if h > 4.5:
        flag(f'{h:.1f} s on one picture from {t:.1f} s; add a beat (insert, reaction, reframing move) or justify it')

# ---- every sentence gets a visual ----
sent, start = [], words[0]['s']
for i, w in enumerate(words):
    if w['w'].endswith(('.', '?', '!')) or i == len(words) - 1:
        sent.append((start, w['e'], ' '.join(x['w'] for x in words if start <= x['s'] <= w['e'])))
        if i + 1 < len(words):
            start = words[i + 1]['s']
for a, b, text in sent:
    if a > 0.5 and not any(a - 0.5 <= c <= b for c in changes):
        flag(f'no new picture for the sentence at {a:.1f} s: "{text[:60]}"')

print('PACING CHECK')
for n in notes: print('  ·', n)
print()
for f in flags: print('  FLAG', f)
print(f"\n{'OK' if not flags else f'{len(flags)} flag(s)'}: the owner judges the animatic itself; this only catches mechanical pacing problems.")
sys.exit(1 if flags else 0)
