# Phil Won't Stop Using Your Bathroom | Gate 1 visual review

**Status:** Gate 1 stills are rendered and waiting for the owner's review. No animation pass, narration, sound or final render has been made. The pipeline's approval gate applies, so work stops here until the owner approves.

**Branch:** `claude/happy-ptolemy-nw9xga`. The episode lives at `videos/phil-bathroom/`, and the Remotion project is in `videos/phil-bathroom/remotion/`.

## Key stills (actual Remotion → Three.js renders, 1080 × 1920)

Every image comes from the `PhilShort` composition through `@remotion/renderer` `renderStill` in headless Chromium (WebGL via SwiftShader). Committed review copies (JPEG):

| Beat | Frame | File |
| --- | --- | --- |
| Hook (S01) | 40 | [previews/gate1/S01_hook_f0040.jpg](previews/gate1/S01_hook_f0040.jpg) |
| Garage (S07) | 535 | [previews/gate1/S07_garage_f0535.jpg](previews/gate1/S07_garage_f0535.jpg) |
| Gregory reveal (S08) | 657 | [previews/gate1/S08_gregory_f0657.jpg](previews/gate1/S08_gregory_f0657.jpg) |
| Gregory tag (S10) | 782 | [previews/gate1/S10_gregory-tag_f0782.jpg](previews/gate1/S10_gregory-tag_f0782.jpg) |
| Vault apex (S12) | 900 | [previews/gate1/S12_vault-apex_f0900.jpg](previews/gate1/S12_vault-apex_f0900.jpg) |
| Bathroom payoff (S16) | 1328 | [previews/gate1/S16_payoff_f1328.jpg](previews/gate1/S16_payoff_f1328.jpg) |
| Contact sheet + approved benchmark | — | [previews/gate1/Gate1_contact_sheet.jpg](previews/gate1/Gate1_contact_sheet.jpg) |

The full-resolution PNGs are in `out/phil-bathroom/gate1/` (not committed).

## Reused, built or placeholder

| Asset | Shots | Status |
| --- | --- | --- |
| `Bathroom_Reveal.glb` + `SCENE_INIT.mjs` setup | S16 | **Reused as supplied.** It is ported unchanged to `remotion/src/sets/reveal.ts`: the same lights, the same 5-clip single mixer and camera, ACES at exposure 1.25. Frame 1328 matches the approved `ThreeJS_Bathroom_Reveal.png`. |
| `Bathroom_Set.glb` | S01, S02 | **Reused.** The room lights reuse the reveal values. |
| Hallway, doorway wall, hinged bathroom door, console, ceiling practical | S01, S02, S15 | **Built** procedurally in `sets/bathroom.ts`. |
| `Phil_Standing_Rig.glb` | S01, S04–S07, S09, S10, S12 | **Reused.** It is posed per frame with world-space IK (`lib/rig.ts`, `lib/poses.ts`), and the face morphs drive gaze and blinks. |
| Folded newspaper | S01 | **Built** using the supplied `M_Newspaper_0` material. |
| Clothed homeowner | S01–S03, S06, S07, S11, S15 | **Placeholder.** The supplied `Homeowner_Face` from `Bathroom_Cast.glb` is rebound onto a standing body clone, with the polo re-dyed blue. The likeness matches the bath, but the wardrobe shares Phil's body and shorts. A dedicated body and wardrobe is still needed. |
| Suburban house, porch, front door + deadbolt pivot, side window (sash, bars, boards), garage with 4 breakaway panels, driveway, street, neighbors, trees, 12-ft block wall, yard lamp | S03–S14 | **Built** as blocking-quality procedural geometry with canvas textures (`sets/exteriorBuild.ts`, `lib/tex.ts`). It is not hero-modeled. |
| Car | S07 | **Placeholder.** It is a boxy sedan with an open cabin. |
| Gregory (pug), collar, GREGORY tag | S08–S10 | **Placeholder.** It is a primitive-built pug with body, head and tail pivots, sit, blink and head-turn. It reads as a pug at phone size but looks toy-like next to the Rocketbox humans. A modeled, rigged pug is needed. The tag is built, and it appears only once he settles in S10. |
| Rotisserie chicken tray, file, hammer, screwdriver, vault pole | S03–S06, S09, S12 | **Built** from simple primitives. |
| Fortress dressing: steel door, red sensor, floodlights, cameras, razor wire, guard booth, account statement | S13–S15 | **Built** as blocking-quality pieces. |
| Two guards | S14 | **Placeholder.** Both reuse the homeowner head with a navy polo, so they read as homeowner clones. The cap meshes don't seat on the head. Distinct heads and a uniform are needed. |
| Narration | All | **BLOCKED.** See [narration/README.md](narration/README.md). |
| SFX, score, the fart cue | All | Not started. This is Gate 3 work after picture lock. |

## What was verified

- `npx tsc --noEmit` passes on the episode project.
- All six key stills rendered and were inspected. Earlier passes caught these defects, which are now fixed:
  - cameras inside walls, the car, a neighbor house and the guard booth
  - a solid garage front hiding the breakaway panels
  - a solid car cabin hiding Phil
  - inverted head pitch, and the homeowner facing away in S01
  - the GREGORY tag showing before S10
- A timeline check rendered 50 frames: every 30th frame from 0–1340, plus the S15/S16 boundary. All shots render without errors. Frame 1335 is picture, and 1336–1340 are pure black, so the hard cut falls at S16 local 146 as specified.
- S16 is preserved exactly:
  - The bath-only hold runs local 0–37.
  - The slow pan runs local 38–107.
  - Phil's side-eye runs 107–119 and his blink 126–131. Both come from the supplied clips, untouched.
  - The fart cue sits at local 138 (episode frame 1328).
  - The black edit starts at local 146 (episode frame 1336).

## Known issues for the owner's call

1. **Style gap.** The exterior sets use procedural textures and primitive props. The lighting family (warm practicals, limited fill, ACES) matches, but surface detail is below the bathroom benchmark, especially the car and Gregory.
2. **S10 chin scratch.** Phil's hand stops near the pug's cheek rather than under the chin.
3. **The homeowner's body is Phil's.** Same build and same khaki shorts.
4. **S12.** The vault follows the concept's apex pose. Phil turns during the swing so he faces camera over the wall (real pole-vault technique). He sits a little small in frame compared with the concept.
5. **Timing.** Shot timing follows SHOTLIST.md edit targets and isn't yet aligned to a narrator take.

## Ready for the animatic

- The `PhilShort` composition is 1080×1920, 30 fps, 1341 frames (44.7 s).
- All 16 shots are laid out with camera keys and blocking poses. Contacts are keyed on the shot-list frames: door handle, deadbolt turn, window climb, garage impact at S07 local 50, tray-to-step, sit + tag, pole plant and release, and the steel door seat.
- S16 runs off the supplied GLB clips.
- **Missing for an animatic with aligned narration:** the owner-voice take and `words.json`. After those exist, refit `shots.ts` (S16 moves as a block). The animatic render itself waits for owner approval of these stills.

## Commands (owner's Mac)

```bash
cd videos/phil-bathroom/remotion
npm install
# Gate 1 stills again (GPU WebGL; Remotion fetches its own headless browser on macOS)
PHIL_GL=angle node scripts/stills.mjs ../../../out/phil-bathroom/gate1 keys 1
# Studio for scrubbing the cut
npm run studio
# Low-res silent animatic (360x640) — only after the stills are approved
npm run animatic
```

`npm run final` (1440×2560, H.264) exists for Gate 3 and must not run before the narration, motion proofs and owner approvals.
