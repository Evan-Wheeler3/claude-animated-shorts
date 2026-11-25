#!/usr/bin/env python3
"""Check every narration line is heard as written (faster-whisper medium.en, one line at a time).

Usage: python tools/voice/check_lines.py videos/<story-id> [--model medium.en]
Reads voice/voice.wav + voice/lines.json. Prints each line that is heard differently and exits 1 if any.
Numbers (digits vs words), hyphens, UK/US spelling and true homophones (raised/razed) count as matches, so only real
mispronunciations are flagged (Vasa examples it would have caught: So->But, gust->ghost, opened->open, tip->teep).
A line heard wrong in isolation but right in the full-file check (align.py) is reported as WARN, not FAIL.
Fix a FAIL with a phoneme OVERRIDE in gen_voice.py (comma after the word, lengthen ˈ vowels, slower speed).
"""
import json, re, subprocess, sys
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

STORY = sys.argv[1].rstrip('/')
MODEL = sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else 'medium.en'
NUMW = set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen '
           'seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million '
           'first second third tenth'.split())
SAME = {'harbour': 'harbor', 'metres': 'meters', 'metre': 'meter', 'colour': 'color', 'razed': 'raised', 'grey': 'gray',
        'okay': 'ok'}


def norm(text: str):
    t = text.lower().replace('%', ' percent').replace('-', ' ')
    toks = []
    for w in re.sub(r"[^a-z0-9' ]", ' ', t).split():
        w = SAME.get(w, w)
        if any(ch.isdigit() for ch in w) or w in NUMW or (w == 'and' and toks and toks[-1] == '#'):
            if not toks or toks[-1] != '#':
                toks.append('#')
            continue
        toks.append(w)
    return toks


def heard(model, a, sr):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-f', 'f32le', '-ar', '16000', '-'],
                         input=a.astype(np.float32).tobytes(), capture_output=True).stdout
    segs, _ = model.transcribe(np.frombuffer(raw, np.float32), beam_size=5)
    return ' '.join(s.text.strip() for s in segs)


m = WhisperModel(MODEL, device='cpu', compute_type='int8')
a, sr = sf.read(f'{STORY}/voice/voice.wav', dtype='float32')
if a.ndim > 1:
    a = a.mean(1)
lines = json.load(open(f'{STORY}/voice/lines.json'))
full = norm(heard(m, a, sr))
fails = 0
for L in lines:
    seg = a[int(max(0, L['start'] - .05) * sr):int((L['end'] + .05) * sr)]
    h = heard(m, seg, sr)
    want = norm(L['text'])
    if norm(h) == want:
        continue
    in_full = ' '.join(want) in ' '.join(full)
    tag = 'WARN' if in_full else 'FAIL'
    fails += tag == 'FAIL'
    print(f"{tag} {L['line']}: script  \"{L['text']}\"\n          heard   \"{h}\"" + ('  (heard correctly in the full file)' if in_full else ''))
print(f"\n{len(lines)} lines checked, {fails} FAIL")
sys.exit(1 if fails else 0)
