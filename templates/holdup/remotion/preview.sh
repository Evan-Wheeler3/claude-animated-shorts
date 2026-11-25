#!/bin/bash
# Asset preview stills: 3 views per asset in assets.json (three-quarter with a 1.75 m sailor, side, parts opened),
# plus a labelled contact sheet when python3 + Pillow are available.
# usage: ASSETS_DIR=../../../videos/<story-id>/assets ./preview.sh <outdir> [scale=0.4]
set -e
cd "$(dirname "$0")"
OUT=${1:?outdir}; SC=${2:-0.4}; mkdir -p "$OUT"
: "${ASSETS_DIR:?set ASSETS_DIR to the story assets folder, relative to this folder}"
[ -d node_modules ] || npm ci --no-audit --no-fund
N=$(node -e "console.log(require(require('path').resolve('$ASSETS_DIR','assets.json')).assets.length)")
IDS=$(node -e "console.log(require(require('path').resolve('$ASSETS_DIR','assets.json')).assets.map(a=>a.id).join(' '))")
B=$(mktemp -d)
npx remotion bundle src/index.ts --out-dir "$B" --log=error
i=0
for id in $IDS; do
  for v in 0 1 2; do
    npx remotion still "$B" AssetPreview "$OUT/$id-v$v.png" --frame=$((3 * i + v)) --scale=$SC --timeout=180000 --log=error
  done
  i=$((i + 1))
done
rm -rf "$B"
python3 - "$OUT" $IDS <<'PY' || echo "(contact sheet skipped: pip3 install pillow)"
import sys
from PIL import Image, ImageDraw
out, ids = sys.argv[1], sys.argv[2:]
W, H = 216, 384
s = Image.new('RGB', (3 * (W + 6) + 150, len(ids) * (H + 6)), 'white'); d = ImageDraw.Draw(s)
for r, i in enumerate(ids):
    d.text((6, r * (H + 6) + H // 2), i, fill='black')
    for v in range(3):
        s.paste(Image.open(f'{out}/{i}-v{v}.png').convert('RGB').resize((W, H)), (150 + v * (W + 6), r * (H + 6)))
s.save(f'{out}/contact-sheet.jpg', quality=85); print('contact sheet:', f'{out}/contact-sheet.jpg')
PY
echo "$N assets previewed in $OUT"
