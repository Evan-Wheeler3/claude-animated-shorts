# U-1206 — Gate 1 first stills (Claude, awaiting owner review)

Status: **awaiting owner approval. No animation, voice, sound or video has been made.** Narration (`SCRIPT.md`) and
shot list (`SHOTLIST.md`) are unchanged.

## Integration
- Branch `claude/u1206-preview-stills-4xrds1`, built from the current renderer `claude/gifted-dijkstra-sxjxv6` @ `7c4a8ce`
  with Codex `codex/u1206-toilet-disaster` @ `8ffd2fb` merged in. **No change was made to either source branch.**
- Composition `U1206Short` (`src/videos/u1206/`: `story.ts` shot/camera table, `world.ts` sets + staging, `U1206.tsx`
  post chain identical to Niagara). Codex assets are imported unchanged from `videos/u1206-toilet-disaster/assets/index.js`.
- Codex's opt-in watch-cap patch did not apply cleanly to the newer `toon.ts` (one hunk moved); it was ported by hand.
  The change only takes effect for outfits with `hat: "subcap"`, so other videos' characters are unaffected.
- The old Codex review adapter (`tools/install-review-adapter.mjs`) was **not** used: it targets the earlier runtime,
  and its floating-diorama staging does not show the shots in their real setting.
- Stills: `node scripts/u1206-stills.mjs <outDir> all 1` (1080 × 1920). The 720 × 1280 copies are in `previews/gate1/`.
  Every frame logged `[QA] cards grounded`, and `npx tsc --noEmit` passes.

## Integration choices (story-scoped, in world.ts only)
- Interiors get a ceiling, a right-hand wall, ribs, pipes and a caged lamp, so views never look out into the sky.
- The section's upper deck is raised 0.5 m so the battery bay reads. A deck drain, the Codex droplet path (moved and
  squashed to fit) and a puddle on the front battery row show where the water goes.
- Underwater uses a gradient dome, blue fog, soft light shafts and an underwater light look. The surface is hidden in
  the deep shots.
- Gas uses inked yellow-green billow cards. The Codex sprite cue is still loaded but hidden; turn it back on with
  `PROPS='{"codexGas":true}'`.
- Hand contact is computed per camera: the valve-rim point is projected along the view ray into the card plane.

## Known limitations to judge (not fixed yet)
- **Owner review 1 (fixed):** the water seemed to shoot out of the air above the toilet. The Codex
  `createAnimatedBlast` arc started 25 cm above the rim. It is replaced in shots 01 and 07 by a story-scoped geyser
  (`makeGeyser` in world.ts). The water now starts inside the bowl, rises straight out of it with foam at the rim, then
  arcs. In 01 the camera sits just above rim height so the bowl opening shows. The stream is still a solid tube; it
  will be softened in Gate 2.
- 07: the sailor's bracing hand on the door frame does not show. The stream lands just in front of his boots.
- 05/06: the hand dot meets the rim. 06 is a locked ECU, so the gauge needle is out of frame.
- 09: the warning lamp shows but has little glow. Cells and shade look purple under the alarm light.
- 11: the boat is cropped at the bottom of the frame mid-tilt, and only one aircraft is in frame.
- 12: the raft crew are small, which suits a high wide. The boat settles stern-first; this is schematic.
- 14: the boat behind the toilet is faint; that is intended ("disappearing in blue").
- The cutaway and pipe layout are illustrative, not historical.
