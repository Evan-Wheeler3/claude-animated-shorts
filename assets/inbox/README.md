# Drop zone: drag downloaded asset zips here

1. Download a pack (links in `assets/PACKS.md`). Leave it as a .zip. Single models (e.g. a Poly Pizza .glb) can go in as-is.
2. Drag the .zip into THIS folder (`assets/inbox/`).
3. Double-click `tools/assets/send-inbox.command` (first time only: right-click → Open → Open, because macOS asks
   about scripts from the internet). Or in Terminal from the repo:  `bash tools/assets/send-inbox.command`
4. Tell Claude "assets sent". Claude converts everything to GLB, sorts it into `assets/library/`, and indexes it.

The script unpacks each zip, keeps only the model files (glTF/GLB first, else OBJ, else FBX), pushes them to the
branch, and deletes the zip. Zips themselves are never committed (they can be too big for GitHub).
