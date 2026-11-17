"""Regression check: compare two sets of renders with the same file names (mean absolute difference per image, 0-255).
usage: python3 scripts/compare_renders.py <reference_dir> <new_dir> [threshold=1.5] [prefix=after_]
Exit 1 when any image differs by more than the threshold (inspect those by eye: a real change or a regression?)."""
import sys, os
import numpy as np
from PIL import Image
ref, new = sys.argv[1], sys.argv[2]
thr = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
pre = sys.argv[4] if len(sys.argv) > 4 else "after_"
bad = 0
for f in sorted(os.listdir(ref)):
    if not f.startswith(pre) or not f.endswith(".jpg") or not os.path.exists(os.path.join(new, f)): continue
    a = np.asarray(Image.open(os.path.join(ref, f)).convert("RGB"), dtype=np.float32)
    b = np.asarray(Image.open(os.path.join(new, f)).convert("RGB").resize(a.shape[1::-1]), dtype=np.float32)
    d = float(np.abs(a - b).mean()); ok = d <= thr; bad += not ok
    print(f"{'ok  ' if ok else 'DIFF'} {f:40s} mean |diff| {d:.2f}")
print("regression clean" if not bad else f"{bad} image(s) differ"); sys.exit(1 if bad else 0)
