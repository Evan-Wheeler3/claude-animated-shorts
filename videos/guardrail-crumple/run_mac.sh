#!/usr/bin/env bash
# Why Guardrails Crumple: build the narration in the owner's cloned voice, re-time, mix and render on the Mac.
# Run from anywhere:  bash videos/guardrail-crumple/run_mac.sh            (everything)
#                     bash videos/guardrail-crumple/run_mac.sh --no-voice (keep voice/voice.wav, redo the rest)
#                     bash videos/guardrail-crumple/run_mac.sh --voice-only (stop after voice + timings + mix)
#                     bash videos/guardrail-crumple/run_mac.sh --render-only (use the committed voice, timings and mix:
#                                                                  just render + mux; no Python models needed)
# Needs: Python 3.10+ with qwen-tts torch soundfile scipy numpy faster-whisper; Node 20+; ffmpeg (brew install ffmpeg).
set -euo pipefail
cd "$(dirname "$0")"
STORY=$PWD
VOICE=1; RENDER=1; PREP=1
for a in "$@"; do case $a in --no-voice) VOICE=0;; --voice-only) RENDER=0;; --render-only) VOICE=0; PREP=0;; esac; done
step() { printf '\n== %s\n' "$*"; }

if [ $VOICE = 1 ]; then
  step "1/6 narration: owner's cloned voice (Qwen3-TTS), 1.18x"
  python3 voice/make_voice.py
fi
if [ $PREP = 1 ]; then
step "2/6 word timings (faster-whisper) -> script words"
python3 voice/align.py voice/voice.wav voice/words_raw.json
python3 voice/fit_words.py voice/words_raw.json voice/words.json voice/lines.txt
cp voice/words.json remotion/src/words.json

step "3/6 picture timing for the sound build"
cd remotion
[ -d node_modules ] || npm ci
ln -sfn "$PWD/node_modules" ../assets/node_modules        # lets tsx resolve three for assets/models.mjs
npx -y tsx scripts/timing.mts > ../audio/timing.json
rm ../assets/node_modules
cd "$STORY"

step "4/6 music-only mix"
python3 audio/make.py
ffmpeg -v error -y -i audio/mix.wav -c:a aac -b:a 256k audio/mix.m4a
fi
[ $RENDER = 1 ] || { echo "voice + mix done (render skipped)"; exit 0; }

step "5/6 render 1440x2560 (GPU)"
mkdir -p "$STORY/out"
cd remotion
[ -d node_modules ] || npm ci
npx remotion render src/index.ts GuardrailShort "$STORY/out/picture.mp4" \
  --width=1440 --height=2560 --codec=h264 --crf=16 --muted --timeout=120000
cd "$STORY"

step "6/6 mux narration + music"
mkdir -p previews/final
MIX=audio/mix.wav; [ -f "$MIX" ] || MIX=audio/mix.m4a     # mix.m4a is the committed copy
ffmpeg -v error -y -i out/picture.mp4 -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 \
  -movflags +faststart previews/final/guardrail-crumple-1440x2560.mp4
ffmpeg -v error -y -i previews/final/guardrail-crumple-1440x2560.mp4 -vf scale=720:1280:flags=lanczos \
  -c:v libx264 -crf 22 -c:a copy -movflags +faststart previews/final/guardrail-crumple-720p.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames:format=duration -of compact \
  previews/final/guardrail-crumple-1440x2560.mp4
echo "done: previews/final/guardrail-crumple-1440x2560.mp4"
