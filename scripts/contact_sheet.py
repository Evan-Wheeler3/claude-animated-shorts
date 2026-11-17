"""Labelled contact sheet of the Gate-1 preview stills (labels sit in a band ABOVE each frame, never on the image).
usage: python3 scripts/contact_sheet.py out/niagara-barrel/previews  -> <dir>/contact_sheet.jpg (2 rows x 3, plus extras)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1] if len(sys.argv) > 1 else "out/niagara-barrel/previews"
shots = [("A_hook", "A  Hook: barrel near the brink"), ("B_annie", "B  Annie close-up"), ("C_barrel", "C  Barrel (4.5 ft oak + iron)"),
         ("D_cat", "D  The cat test"), ("E_plunge", "E  Over the brink"), ("F_rescue", "F  Rescue: alive")]
extra = [("G_purse", "G  Bonus: empty purse")]
W, H, PAD, LAB = 432, 768, 24, 54
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20) if os.path.exists("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf") else ImageFont.load_default()
def sheet(items, cols, out):
    rows = (len(items) + cols - 1) // cols
    img = Image.new("RGB", (cols * (W + PAD) + PAD, rows * (H + LAB + PAD) + PAD), "#1d1b22")
    g = ImageDraw.Draw(img)
    for i, (k, label) in enumerate(items):
        x, y = PAD + (i % cols) * (W + PAD), PAD + (i // cols) * (H + LAB + PAD)
        g.text((x, y + 14), label, fill="#f3ead8", font=font)
        img.paste(Image.open(os.path.join(d, k + ".jpg")).resize((W, H), Image.LANCZOS), (x, y + LAB))
    img.save(out, quality=90); print(out)
sheet(shots, 3, os.path.join(d, "contact_sheet.jpg"))
if all(os.path.exists(os.path.join(d, k + ".jpg")) for k, _ in extra): sheet(shots + extra, 4, os.path.join(d, "contact_sheet_with_bonus.jpg"))
