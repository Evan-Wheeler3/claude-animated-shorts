#!/usr/bin/env bash
# Why Safety Matches Are Safe: final render on the Mac (GPU).
# Uses the committed narration (voice/voice.wav), word timings (voice/words.json) and mix (audio/mix.m4a):
# no Python or voice models needed. Run from anywhere:   bash videos/safety-matches/run_mac.sh
# Options:  --proof   render a 540x960 low-res proof instead of the 1440x2560 final (quick motion check)
# Needs: Node 20+ (node -v), ffmpeg (brew install ffmpeg), internet on the first run (npm + Remotion's Chrome).
set -euo pipefail
cd "$(dirname "$0")"
STORY=$PWD
W=1440; H=2560; NAME=safety-matches-1440x2560
for a in "$@"; do case $a in --proof) W=540; H=960; NAME=safety-matches-proof-540x960;; esac; done
step() { printf '\n== %s\n' "$*"; }
command -v node >/dev/null || { echo "Node is missing: install Node 20+ (https://nodejs.org or brew install node)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is missing: brew install ffmpeg"; exit 1; }

step "1/4 install (first run only)"
cd remotion
[ -d node_modules ] || npm ci --no-audit --no-fund

step "2/4 render ${W}x${H} picture (GPU, ~1716 frames)"
mkdir -p "$STORY/out"
npx remotion render src/index.ts MatchesShort "$STORY/out/picture.mp4" \
  --width=$W --height=$H --codec=h264 --crf=16 --muted --timeout=120000
cd "$STORY"

step "3/4 mux narration + music"
mkdir -p previews/final
ffmpeg -v error -y -i out/picture.mp4 -i audio/mix.m4a -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 \
  -shortest -movflags +faststart "previews/final/$NAME.mp4"
[ $W = 1440 ] && ffmpeg -v error -y -i "previews/final/$NAME.mp4" -vf scale=720:1280:flags=lanczos \
  -c:v libx264 -crf 22 -c:a copy -movflags +faststart previews/final/safety-matches-720p.mp4

step "4/4 check"
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames:format=duration -of compact "previews/final/$NAME.mp4"
if python3 -c "import numpy, PIL" 2>/dev/null; then
  python3 ../../templates/scripts/short_qa.py "previews/final/$NAME.mp4" out/qa shots.json | head -6
else
  echo "(frame QA skipped: pip3 install numpy pillow to enable it)"
fi
echo "done: $STORY/previews/final/$NAME.mp4"
