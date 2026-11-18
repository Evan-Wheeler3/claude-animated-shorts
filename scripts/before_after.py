"""Before/after comparison sheets (labels in bands outside the frames).
usage: python3 scripts/before_after.py <dir> <out.jpg> <key[:label]> [key[:label] ...]
expects <dir>/before_<key>.jpg and <dir>/after_<key>.jpg; one row per key: BEFORE | AFTER"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, out, items = sys.argv[1], sys.argv[2], sys.argv[3:]
W, H, PAD, LAB = 360, 640, 16, 40
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font = ImageFont.truetype(F, 18) if os.path.exists(F) else ImageFont.load_default()
cols = 2 * min(len(items), 3)
rows = (len(items) + 2) // 3
img = Image.new("RGB", (cols * (W + PAD) + PAD, rows * (H + LAB + PAD) + PAD), "#1d1b22")
g = ImageDraw.Draw(img)
for n, it in enumerate(items):
    key, _, label = it.partition(":")
    label = label or key
    for j, tag in enumerate(["before", "after"]):
        x, y = PAD + ((n % 3) * 2 + j) * (W + PAD), PAD + (n // 3) * (H + LAB + PAD)
        g.text((x, y + 10), f"{'BEFORE' if j == 0 else 'AFTER'}  {label}", fill="#f3ead8" if j else "#c9b8b8", font=font)
        img.paste(Image.open(os.path.join(d, f"{tag}_{key}.jpg")).resize((W, H), Image.LANCZOS), (x, y + LAB))
img.save(out, quality=88); print(out)
