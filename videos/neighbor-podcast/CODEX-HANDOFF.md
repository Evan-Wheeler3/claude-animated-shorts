# Neighbor Podcast | Handoff

## Current state: motion review (Claude, 2026-11-20). Stopped for owner approval.

Branch `codex/neighbor-podcast`, built on Codex's handoff commit `a22b6b0bafd0b17c3edc461fb1b1483bf9df5ebd`. The motion-review commit is the next commit on this branch. Its SHA is reported to the owner, since a commit cannot contain its own SHA. **Final 1440 × 2560 export and any upload have not been started.** Both wait on the owner's review of the cut below.

### Motion-review artifact

- `previews/motion-review/NeighborPodcast_motion_review_540x960.mp4`: 540 × 960, 30 fps, 1530 frames = 51.0 s, H.264 picture with the temp AAC mix (picture rendered 24m47s at 4× concurrency, SwiftShader).
- `previews/motion-review/contact_sheet_1fps.jpg`, `previews/motion-review/keyframes/*.jpg` (frames 45, 340, 344, 510, 700, 795, 880, 1150, 1300, 1360, 1500, extracted from the cut), `previews/motion-review/QA.json`.

### What was built

- **Composition.** `NeighborPodcast` (`remotion/src/Episode.tsx`) has ten shots on the SHOTLIST frame ranges (`src/shots.ts` holds the shots and picture cues). It uses one WebGL renderer, four lazily loaded sets and a device-look post pass (`src/lib/post.ts`). Codex's `PodcastStills` remains registered and unchanged.
- **Sets.** `src/sets/porch.ts`, `night.ts`, `safe.ts` and `woods.ts`. Props are in `src/props.ts`, and the articulated baby and bear are in `src/creatures.ts`. The guest and locksmith are Phil's Guard A/B Rocketbox rigs, restyled at runtime (`src/lib/cast.ts`). See [ASSET-MANIFEST.md](ASSET-MANIFEST.md).
- **Locked beats:**
  - Bat barrel fills the doorbell fisheye on frame 344. Black from 345 to 365, and the crack lands on 345.
  - Baby straightens on 510, with the 0.80 s CC0 cheer (monitor-filtered) on 510.
  - Safe door flush and clunk on 722.
  - Bear breath at 1478. Cut to black 1525–1529.
- **Voices.** These are temp TTS takes on separate dry tracks (`audio/voice/narrator.wav` and `host.wav`), aligned by `audio/tools/align_voices.py`. All twelve lines transcribe word-for-word and are disjoint. Timing moves against SHOTLIST, all inside beat-tied limits that the script enforces:
  - H02 runs 435–507, starting in the S03 crib feed because the 1.9 s window was too short. It still ends before the 510 stand and cheer.
  - H01 runs 120–204, N06 runs 902–1027, and N07 runs 1097–1172 with a 1.06× tempo. The sip moved to 1174–1194.
  - H05 runs 1320–1421, and the bear lean starts at 1446.
- **Sound.** Temp mix from `audio/tools/mix_review.py`. Sources and licences are in `audio/mix/CUES.md` and `audio/sfx/cc0/SOURCES.json`.

### Verification run (this container, Linux, SwiftShader WebGL)

| Check | Result |
| --- | --- |
| `npm ci`, `npm run typecheck` | pass (Remotion 4.0.545, Three 0.177.0 locked) |
| Codex blocking stills 45/510/795/1360 (`npm run stills`) | rendered. Inspected: rough blocking (baton mic, primitive baby/bear, edge-cropped cast). Superseded by `NeighborPodcast`. |
| Per-shot real-renderer stills | rendered and inspected each iteration (`scripts/ep-stills.mjs`). Fixes made: door direction, fisheye framing, bat contact, nursery camera occluder, puppet root reset, mic-in-hand reach |
| Bear mic distance | numeric probe in `sets/woods.ts`: snout to grille 0.070 m at full lean (f1472), 0.082 m on the breath (f1500). The host's left hand reaches the offer without a snap. |
| Voice alignment | `align_voices.py` asserts disjoint lines, H02 ≤ 507, N02 ≤ 330, hard beat ranges |
| Mix | 51.00 s, −17.5 LUFS integrated, −0.3 dBFS peak. Digital silence 354–365 and 1525–1529. Cheer is the only event 505–535. |
| Review cut | `python3 scripts/qa_review.py`: 1530 frames, 30 fps, black only at 345–365 and 1525–1529, audio 51.0 s (see QA.json) |

### Open for the owner

1. **Approve or redirect motion.** Watch the porch swing, the crib stand, the safe close and open, and the bear sit and lean.
2. **Real voice takes.** The brief says "record". These are TTS placeholders (narrator cloned from series voice B), and the tooling re-aligns new takes in one command.
3. **Foley realism.** The bat crack, safe clunk, bear footfalls and breath are synthesized. Recorded or licensed replacements are recommended before final.
4. **Known softness:**
   - The porch side view shows the podcast only at frame edge.
   - The homeowner's wrists bend awkwardly on the final safe push (S05, about 700–720).
   - The locksmith's shoulder patches read faintly as uniform patches.
   - Bear fur is a texture, not geometry.
   - The ground in the IR clearing shows faint shadow banding.
5. **Asset formats.** Assets are procedural TypeScript builders rather than GLB files. Export them if GLB deliverables are required.
6. **After approval:** final render at `--scale 1.3333` (1440 × 2560), final mix, QA, then `PRODUCTION-RETROSPECTIVE.md`. No upload without explicit authorization.

---

## Original Codex handoff (a22b6b0)

Start on `codex/neighbor-podcast` at the commit containing this handoff. The owner waived Codex rendering. Claude can start the production build from this revision.

### Available

- Approved 51-second script, host dialogue cues, and ten timed shots. Speech windows are disjoint. The bat impact is at frame 345 and the baby stand and cheer at frame 510.
- A Remotion and Three.js project under `remotion/`. `PodcastStills` is a blocking composition with four static setups, not an animatic.
- Two local standing GLBs, a Rocketbox notice, reusable Phil IK and pose code, and procedural blocking geometry for the four setups. See [ASSET-MANIFEST.md](ASSET-MANIFEST.md).
- TypeScript checked against the local runtime (Remotion 4.0.544, Three.js 0.170.0). The lockfile pins Phil's Remotion 4.0.545 and Three.js 0.177.0. Check with the locked dependencies before production. Browser launch failed in the Codex sandbox, so visual output is unverified.

### Build from here

1. In `remotion/`, run `npm ci` and `npm run typecheck`. Open `npm run studio` and inspect frames 45, 510, 795 and 1360 of `PodcastStills`.
2. Implement the full ten-shot composition from [SHOTLIST.md](SHOTLIST.md). Add the bat swing and blackout, monitor insert, safe close/open, and moving-day and cabin beats. Turn the static baby and bear poses into articulated motion. Check the crib rail, folding chairs, hands and mic against the delivery cameras.
3. Record the separate narrator and host takes. Align actual word timings, keeping the 0:17 cheer clear of speech. Audition the linked SFX and lock the cut before final mixing.
4. Review the motion and audio under the owner’s approval gates before final export. Keep the existing Phil style and 1440 × 2560 final target.

See [CLAUDE-PROMPT.md](CLAUDE-PROMPT.md) for the continuation brief.
