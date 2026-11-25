#!/bin/bash
# usage: ./stills.sh <composition> <outdir> <scale> frame...   (bundles once, then one still per frame)
cd "$(dirname "$0")"; comp=$1; out=$2; sc=$3; shift 3; mkdir -p "$out"
B=${BUNDLE:-/tmp/look-test-bundle}
npx remotion bundle src/index.ts --out-dir "$B" --log=error >/dev/null 2>&1 || { echo "bundle failed"; npx remotion bundle src/index.ts --out-dir "$B" 2>&1 | tail -20; exit 1; }
for f in "$@"; do npx remotion still "$B" "$comp" "$out/look$f.png" --frame=$f --scale=$sc --timeout=180000 --log=error 2>&1 | grep -iE "error|exception" | head -5; echo "frame $f done"; done
