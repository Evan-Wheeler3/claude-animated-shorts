# Lift emphasized words (lines.json 'emph' indices) by +DB with 25 ms ramps, using words.json timings.
import sys, json, numpy as np, soundfile as sf
D = sys.argv[1].rstrip('/') + '/voice/'; DB = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0
a, sr = sf.read(D + 'voice.wav', dtype='float64'); L = json.load(open(D + 'lines.json')); W = json.load(open(D + 'words.json'))
g = np.ones(len(a)); r = int(.025 * sr); n = 0
for l in L:
    ws = [w for w in W if w['line'] == l['line']]
    for i in l.get('emph', []):
        s, e = int(ws[i]['start'] * sr), int(ws[i]['end'] * sr); n += 1
        env = np.ones(e - s + 2 * r); env[:r] = np.linspace(0, 1, r); env[-r:] = np.linspace(1, 0, r)
        seg = slice(max(0, s - r), min(len(a), e + r)); m = env[:seg.stop - seg.start]
        g[seg] = np.maximum(g[seg], 1 + (10 ** (DB / 20) - 1) * m)
a = a * g; a = a / np.abs(a).max() * 0.89
sf.write(D + 'voice.wav', a, sr, subtype='PCM_16'); print(n, 'emphasized words lifted by', DB, 'dB')
