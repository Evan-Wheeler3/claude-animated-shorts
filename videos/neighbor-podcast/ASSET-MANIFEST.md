# Neighbor Podcast | Asset manifest

**State: motion-review build (Claude, 2026-11-20).** Every asset below is loaded and posed in the real Three.js/Remotion composition `NeighborPodcast` and checked in rendered frames. Status `review` means it is in the motion-review cut awaiting the owner; nothing here is owner-approved for final export.

**Conventions.** Meters, Y up. Characters and props face +Z unless noted. Runtime code paths are relative to `remotion/src/`, and asset paths are relative to this folder. `--public-dir=../assets` serves `assets/` to Remotion.

**Format decision.** The episode props, sets, baby and bear are procedural Three.js builders (TypeScript), not GLB files. This follows Phil's `exteriorBuild.ts` precedent. The geometry is deterministic and versioned with the shots that pose it, and nothing goes through an export round trip. The Codex plan proposed `.glb` paths (`assets/props/*.glb` and others), and none were created. If the owner wants GLB deliverables, a `GLTFExporter` pass over these builders is the open item.

## Characters

| ID | Runtime | Source / format | Pivot, scale, rig | Used in | Status | Licence / notes |
| --- | --- | --- | --- | --- | --- | --- |
| HOST | `lib/cast.ts` `makeHost` → `assets/cast/Host_Blocking_Rig.glb` | Codex copy of Phil rig at `c455d9a` (GLB, Bip01 80 bones, 23 face morphs) | Floor origin, 1:1 m. World-space IK (`lib/rig.ts`), seated/crouch/walk poses, jaw lip-sync from `voice.json hostEnv`, auto blinks | S01–S04, S06, S09–S10 | review | Rocketbox MIT (`assets/cast/ROCKETBOX_LICENSE.md`). Phil likeness by design (the neighbor). |
| OWNER | `makeOwner` → `assets/cast/Homeowner_Standing_Rig.glb` | Codex copy from `c455d9a` | Same rig. Two-hand bat grip (both wrists IK'd to the handle), box carry, kneel-push, seated sip | S02, S05, S07–S08 | review | Rocketbox MIT |
| GUEST | `makeGuest` → `assets/cast/Guard_A_Rig.glb` (**new copy** from `c455d9a`) | Phil's Guard A GLB, restyled at runtime: burgundy shirt, khaki trousers, brown belt/shoes, tweed flat cap; badge + patches hidden | Same rig. Seated; follows the chair as it sinks 8 cm and tips back-left | S01–S02 | review | Rocketbox MIT (`assets/cast/Guards_Rocketbox_LICENSE.md`). GLB unmodified. Restyle is material-colour only. |
| LOCKSMITH | `makeLocksmith` → `assets/cast/Guard_B_Rig.glb` (**new copy**) | Guard B restyled: charcoal work shirt, pale name patch, dark work trousers, teal cap; badge hidden. Props: key ring + pick (`sets/safe.ts`) | Same rig + new `kneel()` pose (`lib/poses.ts`) | S06 | review | Rocketbox MIT. Shoulder patch shapes remain (pale), so they read as workwear. |
| BABY | `creatures.ts` `Baby` | **New** procedural articulated puppet (Groups + capsules/ellipsoids, Canvas2D onesie and skin textures) | Floor origin between the feet, 0.72 m standing. Joints: pelvis, chest, neck, head, shoulder/elbow/wrist ×2, hip/knee/ankle ×2. Two-bone IK both arms + legs. `pose(up, grip/lap)` sit → kneel → stand → plop, lids, mouth | S03–S04 | review | Original. Replaces Codex's static `baby()` blocking assembly. |
| BEAR | `creatures.ts` `Bear` | **New** procedural articulated puppet (fur via `T.fur`, muzzle, jaw, claws, pads), scaled 0.92 in the shot | Ground origin. Pelvis/chest/neck/head/jaw, front + hind legs (3 joints each), two-bone IK. `walk(phase)` on all fours, `sit(s, seatY, lean/jaw/breathe)`, `snout()` probe. Headphones parented to the head (light grey so they read on IR) | S09–S10 | review | Original. Replaces Codex's static `bear()` blocking assembly. |

## Props (`props.ts`)

| ID | Builder | Pivot | Used in | Status |
| --- | --- | --- | --- | --- |
| KIT chairs | `foldingChair(parent, p, scale, colour)` | Floor, seat centre. Seat top 0.46 m × scale. Adult 1.0, tiny 0.56, bear 1.12 | S01–S04, S09–S10 | review |
| KIT mic | `microphone()` | Grip point. +Y = pointing axis. Grille tip at +0.145 m | all host shots | review |
| KIT headphones | `headphones(halfWidth, colour)` | Centre between the cups | S09–S10 (bear) | review |
| KIT glass, notes, side table | `waterGlass`, `notes`, `sideTable` | Base | S01 | review |
| DOORBELL | `doorbell(parent, p)` → `{ g, lens }` | Wall-mount centre. `lens` = fisheye camera anchor | S01–S02 | review |
| BAT | `bat()` (lathe, ash texture, grip tape) | Knob, barrel along +Y, 0.84 m | S02 | review |
| MONITOR | `monitorUnit()` → `{ screen, led }`; `nurseryCam()` | Base. Screen plane takes the live crib-camera render target | S03, S05 | review |
| SAFE | `safe(parent, p)` → `{ hinge, door, wheel }` | Floor at the front-face centre. Door hinges −X: `hinge.rotation.y` 0 = shut | S05–S06 | review |
| CAMERA PILE | `cameraPile()` (smashed doorbell, webcam, camcorder, dome cam, phone, action cam) + shelf webcam (S06 POV) | Pile base | S05–S06 | review |
| MOVE | `truck()`, `movingBox()`, `mug()` | Rear axle / box centre / base | S07–S08 | review |
| TRAILCAM | `trailCam()` on a pine in the clearing | Lens. Defines the S09–S10 camera | S09–S10 | review |

## Sets (`sets/*.ts`)

| ID | File | Contents | Light | Status |
| --- | --- | --- | --- | --- |
| PORCH | `sets/porch.ts` | Procedural facade (Phil `T.siding`, trim, real doorway + hall), porch slab, posts, soffit, flower bed with flowers, yard, street, houses opposite, trees | Late-afternoon sun + warm wall bounce | review. Phil's `House_Exterior.glb` was not used. |
| NIGHT | `sets/night.ts` | Parent bedroom vignette (nightstand, lamp, bed, monitor with live feed) + nursery (crib, mattress, plush, rug, night-light, shelf camera) | Moonlight, night-light, camera-side fill, screen glow | review |
| SAFE ROOM | `sets/safe.ts` | Panelled room, carpet, shelving, door, safe | Warm ceiling practical + face fill | review |
| WOODS | `sets/woods.ts` | Road with the pavement ending at x = 0, dirt track, ~200 trees (deterministic), log cabin with porch + 3 steps, truck, clearing with chairs + trail cam | Day sun (S07–S08). Night IR flash spot + faint sky (S09–S10) | review |

**Device looks.** `lib/post.ts` is one full-screen pass: ACES (exposure 1.25, matching Phil's proof) plus sRGB, with modes `fisheye` (doorbell), `monitor` (nursery feed), `webcam` (inside the safe), `ir` (trail cam) and `clean`.

## Audio

| ID | Path | Source | Licence | Status |
| --- | --- | --- | --- | --- |
| Narrator track | `audio/voice/narrator.wav` (48 kHz mono, 51.0 s, −18 LUFS dry) | **Temp TTS.** Qwen3-TTS 12Hz 0.6B Base, voice-cloned from the series narrator take "voice B" (`videos/phil-bathroom/narration/voice.wav` @ `c455d9a`, first 6.6 s). Pauses > 0.3 s shrunk to 0.2 s, 1.1× tempo (Phil house style) | Model: Apache-2.0. Reference voice: the owner-approved TTS voice from Phil | **temp – replace with recorded take** |
| Host track | `audio/voice/host.wav` | **Temp TTS.** Qwen3-TTS 12Hz 0.6B CustomVoice, speaker "Ryan", calm host instruction | Apache-2.0 | **temp – replace with recorded take** |
| Word timings | `audio/voice/words.json`, `audio/voice/takes.md`, `remotion/src/voice.json` | faster-whisper small.en on the placed takes. 12/12 lines transcribe word-for-word (match 1.00) | — | review |
| Crowd cheer | `audio/sfx/cc0/763830_cheer.mp3` → 0.80 s window (0.46–1.26 s) at frame 510, monitor-filtered like H02 | Freesound #763830 "CRWDCheer_Short Affirmative Cheer…" by ShangusBurger | CC0 1.0 | review (audition) |
| Forest bed | `audio/sfx/cc0/826326_forest.mp3` | Freesound #826326 "Forest Ambience with Birds" by upkey | CC0 1.0 | review |
| Chair creaks | `audio/sfx/cc0/612693_chair_creak.mp3` | Freesound #612693 "creaky theatre chair.wav" by HOGGanimation | CC0 1.0 | review |
| Footsteps | `audio/sfx/cc0/505831_footsteps.mp3` | Freesound #505831 "Footsteps outdoors gravel.wav" by jedg | CC0 1.0 | review |
| Synth Foley | generated in `audio/tools/mix_review.py` (bat crack, swing, glass tap, latch, safe clunk, hinge, ratchet, key jingle, truck idle, bear footfalls, bear breath, exhale, sip, room tones) | Original synthesis | No third-party licence | temp |
| Mix | `audio/mix/motion_review_mix.wav` (+ `assets/audio/` copy), stems `audio/mix/stems/*.flac`, cue sheet `audio/mix/CUES.md` | `mix_review.py` | — | review |

The Mixkit forest candidate in SHOTLIST.md was not used: mixkit.co is blocked by this session's network policy, and a CC0 Freesound bed replaced it. All Freesound files are the public HQ previews (128 kbps MP3), because originals require a login. `audio/sfx/cc0/SOURCES.json` records page, author, file and licence for each.

## Still open

- Real narrator and host recordings (the owner brief says "Record"). The TTS takes are placeholders aligned with the same tooling (`gen_voices.py` → `align_voices.py`).
- Realistic recorded Foley for the bat crack, safe clunk, bear footfalls and breath (currently synthesized).
- GLB export of the procedural assets, if wanted.
- Final 1440 × 2560 render, gated on owner approval.
