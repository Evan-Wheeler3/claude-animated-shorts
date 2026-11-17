# Niagara Barrel: production retrospective (in progress)

Status: Gate 1 stills APPROVED; character anatomy, grounding/interaction fix pass APPROVED; glow option 2 ("subtle")
APPROVED as the primary-character default (owner, 2026-11-17). Pipeline integration (shared assets, catalog, docs)
committed. Gate 2 (voice, animation) in progress.

## 1. Project overview
- 35-45 s Hold Up short about Annie Edson Taylor (Horseshoe Falls, 1901). Script `SCRIPT.md`, shots `SHOTLIST.md`.
- Commits: 13c8d38 (Gate 1: project, set, props, cast, stills), then the fix pass on `claude/gifted-dijkstra-sxjxv6`.
- Deliverables so far: `out/niagara-barrel/previews/` (Gate-1 stills + contact sheets), `out/niagara-barrel/fixpass/`
  (before/after, glow comparison), `out/lab/` (CharacterLab before/after + motion tests).

## 2. Initial implementation
- The repo had the bridge template (`templates/bridge`) but no Remotion project. Created one at the repo root
  (package.json, src/Root.tsx) with the `NiagaraShort` composition, copying the bridge post chain, ink, lens, grade,
  card shading and toon code.
- Rendering runs headless on Linux with Playwright's Chromium + SwiftShader (`gl: "swangle"`, scripts/niagara-stills.mjs).

## 3. Problems encountered (Stage 1)
1. Prop scaffold (`assets/niagara-props.js`): 0.92 m barrel with one-sided 3-row staves that set `side = DoubleSide` on a
   shared module material and hoops that clipped near the chimes; rowboat "cavity" was a convex dome on a closed egg;
   per-rock materials; coin purse a ball; rectangular falls blockout.
2. First falls render: the A camera looked down the river and saw the gorge, not the falls (the horseshoe opens downstream).
3. Mist at 72 large puffs / 0.7 opacity whited out the bowl; rainbow too strong; rapids streak texture read as light-speed lines.
4. Bridge ink settings faded lines out before the far rim (set is ~160 m wide).
5. Repeated framing misses in 9:16: barrel out of frame in A (three tries), Annie/rivermen cut in B-D/F, E filled with
   curtain streaks with no barrel or scale.
6. Shore set placed inside the gorge's talus slope (D/F showed a beige slab).
7. Golden light preset turned the gorge walls orange/purple at close range (F, G) - switched to day.
8. Character construction (found in the user's review and the audit `docs/learning/audits/2026-11-17-*.md`): arms of
   varying length drawn over the sleeves, hats floating on top of the head/bun, skirt narrower than the blouse at the
   waist with a straight floating waistband, hand-typed heights for feet and props, rim grip not anchored to the rim.

## 4. Iterations performed (Stage 1)
- Props rebuilt (barrel 1.37 x 0.91 m with 22 solid staves, flat hoops + rivets, lid boards + hatch; lapstrake rowboat with
  inner skin, gunwales, transom, thwarts, oars; slumped purse; boulders; rope, hammer, anvil, dock, railing, lamp; later a
  crate). `scripts/audit-props.mjs` passes all.
- Falls set (`src/videos/niagara/falls.ts`): fan mesh rapids converging on a 200 deg lip, ballistic curtain per lip angle
  (initial downward velocity for a crisp brink crease), bowl rock, pool with foam ring, strata gorge walls with talus,
  banks, promenade, foam mounds, rapids crests, mist billows + plume.
- Camera A restaged as the Table Rock view across the bowl (barrel at phi -55 deg); E as a side profile along the lip;
  B moved to Table Rock with the horseshoe behind; shore moved out of the talus.
- Debug camera override (`CAM` env) used for overview renders; it diagnosed the A and mist problems.

## 5. Solutions that worked
See docs/learning/PRODUCTION-LESSONS.md L2-L5 (props audit, staging, scale-dependent post, restrained effects).
Fix pass (this branch): RIG + IK sleeves + root clipping, `wornHat`, contour-fitted skirt and wrapping waistband
(toon.ts); `Ground`, `CardStage` snapping, `toCard`/`ringGrips` attachment (pipeline/); barrel floats on the measured
river surface and rides the computed sheet; props rested on the beach/dock; per-frame `[QA]` logs; camera path
validator; CharacterLab composition; main-character glow (per-card halo + presence).

## 6. Failed approaches
- First IK hang pose hid the hands behind Annie's skirt (found in the CharacterLab, fixed).
- Ground rays starting 2.5 m above the authored y (cards authored at 0 below 3.2 m land): Annie vanished under the
  terrain in B and C; caught by QA, fixed by starting at 200 m.
- First worn-hat fit (band 0.15 HH, fit 0.84 on the hair contour): read as a headband.
- Pushing the dolly toward a far target: the camera passed the barrel.
- Facing the curtain for E: unreadable streak wall.

## 7. Performance considerations
- SwiftShader: ~10-13 s per still at 540 x 960 buffer, ~16-21 s at 1080 x 1920, after a ~15 s bundle. A 40 s final at
  1440 x 2560 will take hours on this container; motion proofs at 0.5 scale are practical.

## 8. Reusable improvements
`src/pipeline/` (toon, actors, cast, ground, sky, water, cardshade, props3d, legacy/toon_v1), `src/videos/lab/`,
`scripts/{audit-props,validate-paths,lab-stills,niagara-stills,contact_sheet}`, `docs/learning/*`.

## 9. Outstanding limitations
- Seated characters in long skirts read as standing in a front view (lab `props`).
- Flat cards on slopes: soles are one line; mean-of-feet snapping leaves gaps up to ~5 cm on the lab bumps (reported by QA).
- No prop-to-prop collision solver; props are placed deliberately and only their support is checked.
- 2D cards cannot interleave with 3D geometry (a hand behind a rim with the arm in front).
- The mist plume above the brink barely reads from A; E has no mist rising past the barrel yet.
- Facts checked at the start of Gate 2: see FACT-CHECK.md (height and cat outcome softened in the script).

## 10. Recommendations for the next production
- Start from `src/pipeline/` and the CharacterLab; register ground surfaces as you build the set.
- Stage cameras by computing the line subject -> landmark, then confirm on a 0.5-scale still.
- Run tools (audit, tsc, validate-paths, QA stills) before asking for review; include before/after for every fix.
