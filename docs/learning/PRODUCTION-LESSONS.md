# Production lessons (reusable, newest first)

Each entry: what went wrong / why / how found / tried / worked / failed / next time. Video-specific detail lives in
`videos/<name>/PRODUCTION-RETROSPECTIVE.md`; only reusable lessons belong here.

## L12. Final renders belong on the owner's machine; make the project render-ready instead
- Problem: software GL in the cloud container renders a 1440 x 2560 frame in ~18 s (~5 h for a 36 s short), and every
  hour spends Claude's session. A killed render produced nothing.
- Solution: `render.config.mjs` registry + `scripts/holdup.mjs` (doctor / preview / render / qa / bench / audio): chunked,
  verified, resumable final renders; atomic stitch + audio mux; automatic QA (JS loudness meter because Remotion's bundled
  ffmpeg has no ebur128); per-machine benchmark. LOCAL-RENDERING.md is the owner's guide.
- Verified: doctor on the real composition; 540p preview with audio; a 1440 x 2560 sample interrupted mid-chunk and
  resumed (1 chunk reused), stitched, muxed, QA PASS; missing-mix, truncated-file and unknown-story failures caught.
- Pending: Mac benchmark numbers (GPU ANGLE/Metal vs software, concurrency, VideoToolbox).

## L11. Promote reusable work into shared homes, keep story paths working (pipeline integration)
- Problem: generic props lived in a story's handoff file (`videos/niagara-barrel/assets/niagara-props.js`), effects
  inside the Niagara set and crew, the narrator recipe only on another branch, so the next video would re-create them.
- Solution: `assets/props/holdup-props.js` is the single source (the story file re-exports it, so Codex's paths still
  work and `audit-props.mjs` fails if a re-export goes missing); `src/pipeline/effects.ts`; `scripts/voice/`;
  `assets/ASSET-CATALOG.md` with in-engine previews (lab `catalog_props`).
- Verification: re-rendered every lab scenario and Niagara shot after the moves; `scripts/compare_renders.py` against
  the approved renders: pixel-identical (max 0.32/255 from new background props).
- Next time: promote when a second video would need it; never copy (duplicates drift).

## L10. The QA lab caught regressions that the shots hid (fix pass)
- The first IK pass hid Annie's hanging hands behind her own stout torso/skirt (neutral and walk poses). It looked fine
  in the Niagara shots (arms posed) and was only visible in the lab's neutral pose. Fix: hanging hands rest outside the
  REAL skirt contour (skirt geometry is now computed before the arms).
- `reach` moved both arms; the free arm stuck out sideways. Only the targeted hand may move.
- Lab staging bugs were mine, not the pipeline's: a solid basin box hid the pond, a crate fell off the far side of a
  ledge out of frame, a walk test missed its walker. Render every test at 0.5 and LOOK before using it as evidence.
- Next time: after ANY toon.ts change render the full lab pose set and compare with the previous `after_` images.

## L9. Placement by constant height floats or sinks (Niagara, Stage 1 -> fix pass)
- Wrong: characters and props on the beach/paving/dock used typed heights (`SHORE[1]`, `LAND_Y`, `DOCK_Y`).
- Why: the surfaces are real meshes with slopes, ripples and offsets; constants drift from them.
- Found: audit of crew.ts/world.ts (docs/learning/audits/2026-11-17-...), then the per-frame `[QA]` pass.
- Worked: `Ground` registry + `CardStage` snapping + `ground.rest()` for props (pipeline/ground.ts, cast.ts).
- Failed first: ray start at `y + 2.5` - cards authored at y 0 started BELOW the land and found nothing; QA caught it
  ("no ground under Annie") on the first run. Rays now start at 200 m unless `groundTop` says otherwise.
- Next time: never type a y for anything standing on terrain; register surfaces when building the set.

## L8. Arms were drawn per pose, not built (character system)
- Wrong: arm lengths changed per pose, arms were grey sticks drawn over the puff sleeves, shoulder roots sat on the neck.
- Why: each pose hard-coded shoulder/elbow/hand points; draw order put front arms after the sleeves.
- Worked: RIG constants + two-bone IK (`ik2`) + sleeve-coloured arms with ink rims + `clipOut(torso)` root rule +
  sleeve heads drawn last. One rule fixes every pose (CHARACTER-ANATOMY.md).
- Next time: add a pose as a HAND TARGET only. Never add elbow coordinates.

## L7. Hats were placed by fixed widths (character system)
- Wrong: Annie's hat sat above the crown on the bun; shako/top hat widths ignored the head.
- Worked: `wornHat()` reads the head/hair contour span at the band height; brim split into back/front halves.
- Failed first: band 0.15 HH below the crown on a 1.04x hair contour = a headband across the forehead. Band at 0.075 HH
  with fit 1.0 reads as worn. Tune `bandK` on a CU render, not in code review.

## L6. Contact between a 2D card and a 3D object needs the camera
- A card's hand can only touch a 3D rim from one viewpoint: compute contact points per camera (`ringGrips` +
  `toCard`) instead of offsets in the drawing. Containers: stand the card in the axis plane, 6 cm toward the lens.

## L5. Staging 9:16 shots: compute, then look (Niagara Stage 1, ~10 camera iterations)
- The horizontal field is narrow; characters at +-1 m fell out of frame repeatedly. A far look point plus a dolly push
  flew the camera past the barrel. A view down the river showed the gorge instead of the falls.
- Worked: subject-on-the-line-to-landmark cameras, near look points, debug camera override (`CAM` env) for overviews.
- Next time: before rendering a shot, list what must be in frame and check the outermost item's angle.

## L4. Scale-dependent post settings (Niagara)
- Bridge ink faded out from 150 m; on a 160 m set the falls had no lines. Fog 25-300 m whitened everything.
- Worked: InkPass `{ distFar: 160, fadeNear: 380, fadeFar: 1100 }`, fog from 140 m. Re-tune ink/fog for every set scale.

## L3. Effects need restraint (Niagara)
- First mist pass (72 big puffs at 0.7 opacity) whited out the whole bowl; the rainbow at 0.32 dominated; flat "splash"
  discs read as crowns. Worked: ~50 small low-opacity billows + thin plume, rainbow 0.16, drawn spray puffs.

## L2. Procedural props need an audit before use
- The Niagara scaffold had a 0.92 m barrel (real ~1.37 m), a boat with no inside, one-sided staves mutating shared
  materials. `scripts/audit-props.mjs` (NaN, outward normals, bounds) + dimension check against the fact sheet.

## L1. Reproducible before/after
- Freeze the previous drawing code (`src/pipeline/legacy/toon_v1.ts`) and keep the old placement switchable
  (lab `snap:false`) so comparisons are re-renderable, not screenshots of the past.
