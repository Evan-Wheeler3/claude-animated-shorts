#!/usr/bin/env python3
"""Side-by-side contact strip of rendered stills, for checking one shot's motion at a glance.

Usage: python3 tools/frame_strip.py <dir with lookNNN.png> [out.jpg] [--rows 2] [--crop x0,y0,x1,y1]
Typical loop (from videos/<id>/remotion):
  ./stills.sh <Comp> /tmp/s .4 <5-8 frames across the shot, incl. the word-cue frames> && python3 ../../../tools/frame_strip.py /tmp/s
Frames are ordered by the number in the filename.
"""
import glob, os, re, sys
from PIL import Image

args = sys.argv[1:]
rows, crop = 1, None
if '--rows' in args: i = args.index('--rows'); rows = int(args[i + 1]); del args[i:i + 2]
if '--crop' in args: i = args.index('--crop'); crop = tuple(int(v) for v in args[i + 1].split(',')); del args[i:i + 2]
d = args[0]; out = args[1] if len(args) > 1 else os.path.join(d, 'strip.jpg')
fs = sorted(glob.glob(os.path.join(d, '*.png')), key=lambda f: int(re.findall(r'\d+', os.path.basename(f))[-1]))
ims = [Image.open(f).convert('RGB') for f in fs]
if crop: ims = [im.crop(crop) for im in ims]
w, h = ims[0].size; cols = -(-len(ims) // rows)
o = Image.new('RGB', (w * cols, h * rows))
for i, im in enumerate(ims): o.paste(im, ((i % cols) * w, (i // cols) * h))
o.save(out, quality=85); print(out, f'{len(ims)} frames')
