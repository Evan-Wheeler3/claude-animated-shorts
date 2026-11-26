#!/bin/bash
# Double-click on the Mac: unpack every zip in assets/inbox, keep only the model files, push them for Claude.
# Prefers glTF/GLB; falls back to OBJ (+mtl + textures), then FBX. Zips are deleted after a successful push.
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO=$PWD; IN=assets/inbox; OUT=assets/library/_incoming
shopt -s nullglob nocaseglob
zips=("$IN"/*.zip)
if [ ${#zips[@]} -eq 0 ]; then echo "No .zip files in $IN. Drag the downloaded packs there first."; read -n1 -r -p "Press any key to close."; exit 0; fi
git pull --ff-only -q || { echo "git pull failed: open Terminal in $REPO and run 'git status'"; exit 1; }
for z in "${zips[@]}"; do
  name=$(basename "$z" .zip | tr ' ' '_' | tr -cd '[:alnum:]_-')
  tmp=$(mktemp -d); unzip -q "$z" -d "$tmp"; chmod -R u+rwX "$tmp"   # some packs unzip read-only
  dest="$OUT/$name"; rm -rf "$dest"; mkdir -p "$dest"
  if find "$tmp" -iname '*.gltf' -o -iname '*.glb' | grep -q .; then pat='gltf|glb|bin|png|jpg|jpeg'; kind=glTF
  elif find "$tmp" -iname '*.obj' | grep -q .; then pat='obj|mtl|png|jpg|jpeg'; kind=OBJ
  else pat='fbx|png|jpg|jpeg'; kind=FBX; fi
  # copy matching files, keeping their sub-folders (texture paths stay valid)
  (cd "$tmp" && find . -type f | grep -Ei "\.($pat)$" | grep -viE '__MACOSX|/\._' | while read -r f; do mkdir -p "$REPO/$dest/$(dirname "$f")"; cp "$f" "$REPO/$dest/$f"; done)
  n=$(find "$dest" -type f | wc -l | tr -d ' '); mb=$(du -sm "$dest" | cut -f1)
  echo "$name: $n files ($kind, ${mb} MB)"
  rm -rf "$tmp" 2>/dev/null || true
done
# push one pack per commit: a single huge push is refused by GitHub (HTTP 400)
git config http.postBuffer 524288000
for d in "$OUT"/*/; do
  p=$(basename "$d"); git add "$d"
  git diff --cached --quiet && continue
  git commit -q -m "Assets inbox: $p"
  ok=0; for try in 1 2 3; do git push -q && { ok=1; break; }; echo "push of $p failed (try $try), retrying..."; sleep 5; done
  [ $ok = 1 ] && echo "pushed $p" || { echo "Could not push $p. Zips kept in $IN; send Claude a screenshot."; read -n1 -r -p "Press any key to close."; exit 1; }
done
rm -f "${zips[@]}" && echo "All pushed. Tell Claude: assets sent."
read -n1 -r -p "Press any key to close."
