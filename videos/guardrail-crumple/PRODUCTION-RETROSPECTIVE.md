# Why Guardrails Crumple: production retrospective (Claude, 2026-11-22)

Base: `codex/guardrail-crumple` at `10cf3b5`. Branch: `claude/guardrail-crumple-animate-1g8n48`.

## What changed from the handoff
- **Narration line 5** was changed with the owner's approval. The sources describe untreated blunt ends as *spearing* the occupant compartment in head-on hits, not stopping the car dead, so the line now reads "…the rail could spear right through your car." Shot 5 shows the blunt beam end punching into the grille. Sources are in STORY.md.
- **Car.** The owner chose the Hold Up sedan from phil-bathroom over the cabin car and the Kenney sedan. A load-time toon pass and corner fixes make it fit the scene (see `assets/car-sedan/README.md`). The same car appears in every shot.
- **Run time.** The final cut is 38.5 s, not 49. The established narrator reads at about 4.1 words/s, which makes the script 34 s bare. Pauses were added where the picture needs room: the posts assembling, both impacts, and about 1 s after the extrusion line. The cutaway holds for about 5 s, and the one-eye beat runs 1.6 s past the last word.
- **Strip.** `createDischargedSteel()` was replaced by one continuous ribbon (`remotion/src/extrusion.ts`). It runs from the W-beam profile through a 90° throat to a flat strip, then into a coil. Its length is tied to the head's travel, so the steel that goes in is visibly the steel that comes out. The coil turns down-rail on the field side, clear of the posts and the car (the Codex note about the strip overlapping the bumper).
- **Posts** that the head passes fold flat instead of vanishing.

## Issues found and fixed
- The sedan's side sheets pinched inward past the bumpers and lights, which left flaps and poking bumper ends. Fixed at load time (before and after: `previews/sedan-corner-fix.png`).
- The canvas ignored Remotion's `--scale`. Half-res proofs were drawn at 1080 and downscaled, and a 4/3 export would have been an upscale. Fixed with `setPixelRatio(devicePixelRatio)`. Half-res proofs got about 4x faster.
- `--scale 1.3333` gives a 2559.99 px height, which the stitcher rejects. The final render uses `--width 1440 --height 2560` instead.
- Camera iterations, from the actual renders:
  - The hook car was off-frame. It now has its own slower skid that leaves the edge on the bend, and the camera tracks it.
  - The flex replay was too low to read. It is now shot from high on the field side, looking back along the bulge.
  - The old-end impact now sits on the rail line, so the beam visibly enters the grille.
  - The cutaway is shot from high in front of the head on the field side. The first framing was blocked by the coil, and the second by the beam.
- The Remotion browser download host is blocked here. Renders use the preinstalled Chromium headless shell with `swangle`.

## Validation
- Gate 2 motion proofs: `previews/motion/proof-glancing-hit-540p.mp4` (shots 3–4 with sound) and `previews/motion/proof-cutaway-stills.jpg`.
- Final render: `previews/final/guardrail-crumple-1440x2560.mp4` (H.264 CRF 16, AAC 256k) and a 720p review copy, `previews/final/guardrail-crumple-720p.mp4`. Rendered in two halves (71 + 81 min, 4 CPUs, software GL) and joined with no re-encode.
- `templates/scripts/short_qa.py` (report: `previews/final/qa-report.md`): 1440x2560, 30 fps, 1154 frames, 38.47 s; −16.3 LUFS integrated, LRA 2.3 LU, −1.1 dBFS peak; no silences, black, white or frozen spans. Its 10 "pops" are all planned: 8 shot cuts (one frame after the QA's rounded shot list), the cut inside shot 3 at f215 and the cabin jolt at f538.
- Not done: no Opus-max verifier side-by-side scoring against the reference frames (SKILL.md step 9) was run on this cut.

## Revision 2 (owner notes on the first cut)
- **Voice:** "generic AI." The first cut used the Kokoro recipe that the Niagara branch documented as the house narrator. But Niagara and U-1206 were later re-voiced in the **owner's cloned voice** (commits `d20aa8e` and `3dd4b15`), and the docs were never updated. Lesson: check the latest commits on earlier productions' voice files, not just their tool scripts.
- **Sound:** SFX, chord stabs and cymbals were too much. The film now has music only.
- **Script:** reworded for clarity; line 4 was misleading.
- **Timing:** cuts and beats were derived from words.json, so a new take re-times the film without editing story.ts.
- **Rendering:** at about 7 s per 1440 frame, software GL in the cloud is far too slow. The final renders on the owner's Mac with the GPU (`run_mac.sh`).
- `previews/final/*` is still the **first cut** (old script and voice) until the Mac run replaces it.

## Reusable lessons
- When a GLB's geometry is baked into car space with no node transforms, wheels and steering need pivots at their bounding-box centres. The steering axis can be taken as the smallest-variance axis of the rim's vertices.
- Drive an extrusion with **one travel value**. Beam start, head position, bumper contact and strip length all read from it, so contact can never drift.
- Choose the cutaway camera by checking what lies between the lens and the mechanism. A coil or uncut beam near the lens hides everything.
