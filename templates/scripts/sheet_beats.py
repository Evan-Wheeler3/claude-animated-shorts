# Counts framing changes on the 10x6 reference contact sheets (references/sheets/*.jpg, 60 frames spread evenly over
# each short). Adjacent tiles whose colour histograms differ by more than THR count as a new picture. The caption
# band (60-76 % of tile height) is masked. Undercounts shorts that stay in one palette (short17: 13 counted, ~27 by
# eye), so read the result as a lower bound. Results: references/reports/editing.md.
# Usage: python3 templates/scripts/sheet_beats.py [THR=0.35] ['references/sheets/*.jpg']
import glob, sys
import numpy as np
from PIL import Image

THR = float(sys.argv[1]) if len(sys.argv) > 1 else 0.35
PAT = sys.argv[2] if len(sys.argv) > 2 else 'references/sheets/*.jpg'

def tile_hists(p):
    im = Image.open(p).convert('RGB'); W, H = im.size; th, tw = H // 6, W // 10; out = []
    for r in range(6):
        for c in range(10):
            a = np.asarray(im.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th)).convert('HSV')).astype(int)
            a = np.concatenate([a[:int(.60 * th)], a[int(.76 * th):]])
            h = np.histogramdd(a.reshape(-1, 3) // 32, bins=(8, 8, 8), range=((0, 8),) * 3)[0].ravel()
            out.append(h / h.sum())
    return out

counts, runs_all = [], []
for p in sorted(glob.glob(PAT)):
    f = tile_hists(p)
    d = [0.5 * np.abs(f[i] - f[i - 1]).sum() for i in range(1, 60)]
    ch = [i for i, x in enumerate(d, 1) if x > THR]
    runs = np.diff([0] + ch + [60]); runs_all += list(runs); counts.append(len(runs))
    print(p.split('/')[-1], 'pictures', len(runs), 'longest run (samples)', runs.max())
r = np.array(runs_all)
print('pictures per short: median', np.median(counts), 'range', min(counts), max(counts))
print('run length in samples: mean %.2f median %.0f p90 %.0f max %d' % (r.mean(), np.median(r), np.percentile(r, 90), r.max()))
