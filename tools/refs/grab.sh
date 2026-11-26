#!/usr/bin/env bash
# Grab reference Shorts on the Mac (YouTube blocks the cloud) and push a small study pack for Claude to analyse.
# Usage (from anywhere):  bash tools/refs/grab.sh URL [URL ...]
# Per video it pushes refs/<id>/: info.json (title, channel, views, likes, length, date), frames/ (2 per second, 360 px
# wide), audio.m4a (for transcription), cuts.txt (scene-change times). The full video is NOT pushed (it stays in
# ~/Downloads/holdup-refs). Needs: brew install yt-dlp ffmpeg
set -euo pipefail
cd "$(dirname "$0")/../.."
[ $# -gt 0 ] || { echo "Give one or more Short URLs."; exit 1; }
command -v yt-dlp >/dev/null || brew install yt-dlp
command -v ffmpeg >/dev/null || brew install ffmpeg
BR=claude/keen-brown-kfp2nk
git fetch -q origin $BR && git checkout -q $BR && git pull -q --ff-only
VID=~/Downloads/holdup-refs; mkdir -p "$VID"
for url in "$@"; do
  id=$(yt-dlp --print id "$url" 2>/dev/null | head -1) || { echo "SKIP (could not read): $url"; continue; }
  out=refs/$id; rm -rf "$out"; mkdir -p "$out/frames"
  echo "== $id"
  yt-dlp -q --no-warnings -f "bv*[height<=1280]+ba/b" --merge-output-format mp4 -o "$VID/$id.mp4" "$url"
  yt-dlp -q --no-warnings --skip-download --print-to-file \
    '{"id":"%(id)s","title":%(title)j,"channel":%(channel)j,"views":%(view_count)s,"likes":%(like_count|null)s,"comments":%(comment_count|null)s,"duration":%(duration)s,"upload_date":"%(upload_date)s","url":"%(webpage_url)s"}' \
    "$out/info.json" "$url"
  ffmpeg -v error -y -i "$VID/$id.mp4" -vf "fps=2,scale=360:-2" -q:v 4 "$out/frames/f%04d.jpg"
  ffmpeg -v error -y -i "$VID/$id.mp4" -vn -c:a aac -b:a 64k -ac 1 "$out/audio.m4a"
  ffmpeg -v info -i "$VID/$id.mp4" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 \
    | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > "$out/cuts.txt" || true
  echo "   $(ls "$out/frames" | wc -l | tr -d ' ') frames, $(wc -l < "$out/cuts.txt" | tr -d ' ') cuts"
done
git add -f refs
git commit -q -m "Reference shorts for style study: $(ls refs | tr '\n' ' ')" || { echo "Nothing new to push."; exit 0; }
for try in 1 2 3; do git push -q && { echo "Pushed. Tell Claude: refs sent."; exit 0; }; echo "push failed (try $try), retrying..."; sleep 5; done
echo "Could not push; run 'git status' in $(pwd) and send Claude a screenshot."; exit 1
