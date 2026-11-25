#!/bin/bash
# Rough animatic for GATE B: picture at 432x768 (scale 0.4) + the recorded narration.
set -e
cd "$(dirname "$0")"
OUT=${1:-../previews/animatic}; mkdir -p "$OUT"
B=/tmp/claude-0/vasa-bundle
npx remotion bundle src/index.ts --out-dir "$B" --log=error 2>&1
npx remotion render "$B" VasaAnimatic /tmp/claude-0/vasa-animatic-pic.mp4 --scale=0.4 --concurrency=4 --timeout=300000 --codec=h264 --crf=23 --muted --log=error 2>&1
ffmpeg -v error -y -i /tmp/claude-0/vasa-animatic-pic.mp4 -i ../voice/voice.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k "$OUT/vasa-animatic.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of compact "$OUT/vasa-animatic.mp4"
