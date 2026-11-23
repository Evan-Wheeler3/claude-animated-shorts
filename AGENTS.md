# Codex instructions — Hold Up asset delivery

You have one job on this repo: **deliver the 3D props and set pieces listed in a story's asset brief, as GLB files
that pass the checker.** Claude handles everything else (script, characters, scenes, animation, editing, render).
The pipeline is in `PRODUCTION-PIPELINE.md`; you only need this file and the brief.

## Trigger
"Deliver assets for <story-id>" (usually with a pasted `CODEX-PROMPT.md`). Read
`videos/<story-id>/ASSET-BRIEF.md`. If it is missing or `script_status` in `STORY.md` isn't `approved`, stop and
say so. Never guess a story-id.

## Scope
- **Do:** source (preferred) or model each asset in the brief. Write `videos/<story-id>/assets/assets.json`.
- **Don't:** build characters or people (they are 2D cards drawn in code), water, mist, splashes or other effects,
  scene/camera/animation code. Don't edit anything outside `videos/<story-id>/assets/`. Don't add assets the brief
  doesn't ask for. Don't merge to main.

## Sourcing
1. Prefer CC0: Kenney (kenney.nl), Poly Haven, Quaternius, Poly Pizza (CC0 filter only).
2. CC-BY-4.0 is allowed with a `credit` line. Nothing else: no "free for personal use", no unclear licences, no ripped game assets.
3. Model it yourself (`"license": "original"`) only when nothing suitable exists. Say why in `notes`.
4. Pick for the **silhouette at phone size** and the **period/setting in the brief**. Our look is chunky, simple,
   stylised low-poly with clean shapes, flat or simply painted colours. Avoid photoreal scans and fine noisy detail:
   black ink outlines are drawn on every edge, so busy geometry turns to scribble.

## Every GLB must
- be a single self-contained `.glb` (glTF 2.0, embedded textures, no Draco/meshopt/KTX compression)
- be in **metres**, **+Y up, −Z forward**, at the real-world size in the brief
- have its pivot where the brief says (`bottom-center` = resting on y = 0, centred in X/Z; or `center`)
- stay under the triangle budget
- have materials **named** as the brief lists (e.g. `wood`, `iron`) so Claude can recolour them. No baked lighting; textures, if any, ≤ 2048 px.
- contain no cameras or lights

Fix files in Blender or with gltf-transform; don't just relabel numbers in `assets.json`.

## assets.json
`videos/<story-id>/assets/assets.json`, one entry per asset (the brief template shows the exact fields):
```json
{ "story_id": "<story-id>", "assets": [
  { "id": "barrel", "file": "barrel.glb", "size_m": [0.68, 0.92, 0.68], "size_tolerance": 0.15,
    "pivot": "bottom-center", "max_tris": 8000, "materials": ["wood", "iron"],
    "license": "CC0-1.0", "source": "https://…", "author": "…", "credit": "", "notes": "modified: …" } ] }
```

## Done means
1. `node tools/check-assets.mjs videos/<story-id>/assets/assets.json` prints all PASS (exit 0). Paste its output.
2. Committed and pushed to `codex/<story-id>` (branch from latest `main`).
3. Your final message gives: branch, commit SHA, the checker output, one line per asset (source, licence, anything
   you changed), and anything you couldn't find. Mark gaps as **MISSING** rather than shipping a poor substitute.

Don't describe assets as "production-ready" or "high quality". Claude accepts or rejects each one from in-engine
renders and may send it back with notes. That's normal, not failure.

## Honesty
Never claim a file, commit or check exists unless it does. If you can't do something (no network, no Blender), say exactly what and stop.
