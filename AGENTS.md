# Codex instructions — Hold Up world builder

You build **the physical world** of each short: hero props and vehicles, set pieces, buildings and town kits,
terrain pieces (cliffs, rocks, docks), interiors and furniture, delivered as GLB files. Claude handles everything
else (script, voice, characters, water and effects, cameras, animation, music, render). The pipeline is in
`PRODUCTION-PIPELINE.md`; you only need this file, the story's `ASSET-BRIEF.md`, and the tools below.

You start as soon as the script is approved and work in parallel with Claude. The better your assets, the less
Claude has to fake with boxes: you are the biggest lever on how the video looks.

## Trigger
"Deliver assets for <story-id>" (usually a pasted `CODEX-PROMPT.md`). Read `videos/<story-id>/ASSET-BRIEF.md` on
`main`. If it is missing or `script_status` in `STORY.md` isn't `approved`, stop and say so. Never guess a story-id.

## Scope
- **Do:** source (preferred) or model each asset in the brief; write `videos/<story-id>/assets/assets.json`.
- **Don't:** characters or people (2D cards drawn in code), water, mist, splashes or other effects, scene/camera
  code; edits outside `videos/<story-id>/assets/`; assets the brief doesn't ask for; merging to main.

## Sourcing
1. Prefer CC0: Kenney (kenney.nl), Poly Haven, Quaternius, Poly Pizza (CC0 filter only).
2. CC-BY (3.0 or 4.0) is allowed with a `credit` line (owner decision 2026-11-25). Nothing else: no "free for personal use", unclear licences or ripped game assets.
3. Model it yourself (`"license": "original"`) when nothing suitable exists; say why in `notes`. Modifying a CC0 base is encouraged.
4. Pick for the **silhouette at phone size** and the **period/setting in the brief**: chunky stylised low-poly, clean
   shapes, flat or simply painted colours. Avoid photoreal scans and fine noisy detail: black ink outlines are drawn
   on every edge, so busy geometry turns to scribble.

## Every GLB must
- be a single self-contained `.glb` (glTF 2.0, embedded textures, no Draco/meshopt/KTX compression)
- be in **metres**, **+Y up, −Z forward**, at the real-world size in the brief, pivot as the brief says
- stay under the triangle budget; use the brief's **material names** (Claude recolours by name); no baked lighting; textures ≤ 2048 px; no cameras or lights
- have every **moving part** as its own node, named by the brief's pattern, **resting closed**, with its origin on the
  **hinge edge**, opening in the brief's direction (`"parts"` in assets.json)
- be **complete**: closed containers have lids, tiling pieces meet exactly (`"tile"`), parts a person stands next to
  are sized against a 1.75 m person

## The self-check loop (do all of it before you reply)
1. `node tools/check-assets.mjs videos/<story-id>/assets/assets.json` → every asset PASS (it checks size, pivot, axes,
   budget, materials, licence, moving-part count/hinge/rest/opening direction, tiling length).
2. `cd templates/holdup/remotion && npm ci && ASSETS_DIR=../../../videos/<story-id>/assets ./preview.sh /tmp/preview`
   → three views per asset in our look, next to a 1.75 m sailor, with moving parts opened.
3. Look at every preview (open the images) against the brief and the **Common defects** list in
   `ASSET-BRIEF-TEMPLATE.md`. Fix and repeat until each asset reads right at phone size.
   If you can't run the preview (no Node or browser), say so in the reply; don't skip it silently.

## Reply format (required)
```
Branch: codex/<story-id>    Commit: <full SHA>    Based on main @ <SHA>
Checker: <paste the full check-assets output>
Preview: ran / could not run (<why>)
| asset | source + licence | what I changed | preview check |
|---|---|---|---|
MISSING: <assets not delivered and why, or "none">
```
Don't call assets "production-ready" or "high quality". Claude accepts or rejects each one in the real scene and may
send notes back; that's normal.

## Honesty
Never claim a file, commit, check or preview exists unless it does. If you can't do something, say exactly what and stop.
