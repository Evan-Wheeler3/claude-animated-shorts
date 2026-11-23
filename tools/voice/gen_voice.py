# Emphasis-aware Kokoro narration: *word* -> primary stress + lengthened stressed vowel; spans recorded for a gain lift.
import os, sys, re, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
STORY = sys.argv[1].rstrip('/'); MODEL = os.environ.get('KOKORO_DIR', 'kokoro')
k = Kokoro(MODEL + '/onnx/model.onnx', MODEL + '/voices.bin')
V = 'am_puck'; SPEED = 1.08; GAP = 0.04; PAUSE = dict(sentence_pause=0.06, clause_pause=0.04)
BEAT = {'L08': 0.22, 'L11': 0.16, 'L18': 0.26}
# Vasa-specific pronunciation overrides (verified with faster-whisper medium.en). Clear them for a new story.
OVERRIDE = {'L07': ('sˈoʊː ðeɪ stˈɑːpt, ðə tˈɛst.', 1.10), 'L10': ('ðə kˈænən hˈætʃɪz ˈoʊpənd, fɔːɹ ɐ kˈænən səlˈuːt.', 1.08), 'L11': ('dʒˈʌst ðˈɛn, ɐ stɹˈɔːŋ ɡˈʌst hˈɪt!', 1.08)}   # verified with faster-whisper medium.en
VOW = set('aeiouɑɐɒæɔəɘɚɛɜɝɞɪʊʌʏɨʉyøœɯɤ')
SHORT = set('ɪɛæʌʊə')   # lengthening these changes the word (tip -> teep, gust -> ghost): stress only

def stretch(tok):
    tok = tok.replace('ˌ', 'ˈ')
    if 'ˈ' not in tok:
        i = next((j for j, ch in enumerate(tok) if ch in VOW), None)
        if i is None: return tok
        tok = tok[:i] + 'ˈ' + tok[i:]
    i = tok.index('ˈ') + 1
    while i < len(tok) and tok[i] not in VOW: i += 1
    j = i
    while j < len(tok) and tok[j] in VOW: j += 1
    if j < len(tok) and tok[j] == 'ː': return tok
    if j - i == 1 and tok[i] in SHORT: return tok
    return tok[:j] + 'ː' + tok[j:] if j > i else tok

def phon(lid, text):
    if lid in OVERRIDE: return OVERRIDE[lid]
    words = text.split(); emph = [w.startswith('*') for w in words]
    plain = ' '.join(w.replace('*', '') for w in words)
    if not any(emph): return plain, None
    toks = [k.tokenizer.phonemize(w.replace('*', ''), 'en-us').strip() for w in words]   # one token per word
    if len(toks) != len(words):
        print('  token mismatch on', lid, len(toks), len(words)); return plain, None
    return ' '.join(stretch(t) if e else t for t, e in zip(toks, emph)), SPEED

def squeeze(a, sr, maxgap=0.18, keep=0.12, thr=0.006):
    f = int(sr * 0.01); n = len(a) // f
    env = np.array([np.abs(a[i * f:(i + 1) * f]).max() for i in range(n)]); quiet = env < thr; res = []; i = 0
    while i < n:
        j = i
        while j < n and quiet[j] == quiet[i]: j += 1
        seg = a[i * f:j * f]
        if quiet[i] and (j - i) * f > maxgap * sr: h = int(keep * sr / 2); seg = np.concatenate([seg[:h], seg[-h:]])
        res.append(seg); i = j
    res.append(a[n * f:]); return np.concatenate(res)

SRC = STORY + '/voice/SCRIPT-emphasis.md' if os.path.exists(STORY + '/voice/SCRIPT-emphasis.md') else STORY + '/SCRIPT.md'
lines = [l for l in open(SRC) if re.match(r'L\d\d ', l)]
out, meta, t, sr = [], [], 0.0, 24000
for l in lines:
    lid, raw = l[:3], l[4:].strip()
    ph, sp = phon(lid, raw)
    if sp is None: a, sr = k.create(ph, voice=V, speed=SPEED, lang='en-us', **PAUSE)
    else: a, sr = k.create(ph, voice=V, speed=sp, lang='en-us', is_phonemes=True, **PAUSE)
    nz = np.where(np.abs(a) > 0.01)[0]; a = squeeze(a[max(0, nz[0] - 240):nz[-1] + 240], sr)
    g = BEAT.get(lid, GAP) if out else 0.05
    out.append(np.zeros(int(sr * g), np.float32)); t += g
    meta.append({'line': lid, 'text': raw.replace('*', ''), 'emph': [i for i, w in enumerate(raw.split()) if w.startswith('*')],
                 'start': round(t, 3), 'end': round(t + len(a) / sr, 3)})
    out.append(a); t += len(a) / sr
out.append(np.zeros(int(sr * 0.25), np.float32))
a = np.concatenate(out); a = a / np.max(np.abs(a)) * 0.89
sf.write(STORY + '/voice/voice.wav', a, sr, subtype='PCM_16')
json.dump(meta, open(STORY + '/voice/lines.json', 'w'), indent=1)
n = sum(len(m['text'].split()) for m in meta)
print(f'{len(a) / sr:.2f} s, {n} words, {n / (meta[-1]["end"] - meta[0]["start"]):.2f} words/s')
