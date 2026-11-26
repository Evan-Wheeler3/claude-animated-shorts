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
git add "$OUT"
git commit -q -m "Assets inbox: $(ls "$OUT" | tr '\n' ' ')" || true
git push -q && rm -f "${zips[@]}" && echo "Pushed. Tell Claude: assets sent." || echo "Push failed; zips kept in $IN."
read -n1 -r -p "Press any key to close."
