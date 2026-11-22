#!/bin/bash
# usage: ./stills.sh <outdir> <scale> frame...
out=$1; sc=$2; shift 2; mkdir -p $out
npx remotion bundle src/index.ts --out-dir /tmp/claude-0/bundle --log=error >/dev/null 2>&1
for f in "$@"; do npx remotion still /tmp/claude-0/bundle GuardrailShort $out/f$(printf %04d $f).png --frame=$f --scale=$sc --log=error 2>&1 | grep -iE "error|exception" | head -5; done
