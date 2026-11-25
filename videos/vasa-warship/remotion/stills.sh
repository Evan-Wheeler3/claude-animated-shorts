#!/bin/bash
# usage: ./stills.sh <composition> <outdir> <scale> frame...
comp=$1; out=$2; sc=$3; shift 3; mkdir -p "$out"
B=${BUNDLE:-/tmp/claude-0/vasa-bundle}
npx remotion bundle src/index.ts --out-dir "$B" --log=error >/dev/null 2>&1 || { echo "bundle failed"; npx remotion bundle src/index.ts --out-dir "$B" 2>&1 | tail -20; exit 1; }
for f in "$@"; do npx remotion still "$B" "$comp" "$out/f$(printf %02d $f).png" --frame=$f --scale=$sc --timeout=120000 --log=error 2>&1 | grep -iE "error|exception" | head -5; done
