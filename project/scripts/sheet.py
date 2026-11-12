# usage: python scripts/sheet.py out.jpg img1 img2 ...   (grid of labelled frames, 6 per row)
import sys, os
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W, H, n = (200, 356, 9) if len(files) > 12 else (300, 533, 6)
rows = (len(files) + n - 1) // n
sheet = Image.new("RGB", (W * min(n, len(files)), H * rows), "black")
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((W, H))
    d = ImageDraw.Draw(im); lab = os.path.basename(f).split("_")[-1].split(".")[0]
    d.rectangle([0, 0, 60, 16], fill="black"); d.text((3, 2), lab, fill="white")
    sheet.paste(im, ((i % n) * W, (i // n) * H))
sheet.save(out, quality=85)
