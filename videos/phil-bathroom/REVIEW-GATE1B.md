# Phil Won't Stop Using Your Bathroom | Gate 1b visual review (Codex assets integrated)

**Status:** Codex's asset upgrade (`codex/phil-bathroom` up to `740c3eb`) is fast-forwarded into this episode branch, and every placeholder from [REVIEW-GATE1.md](REVIEW-GATE1.md) is replaced. The owner has accepted the asset quality. These stills are waiting for the owner's Gate 1 approval. There is still no narration, animation pass or final render.

## Key stills (Remotion → Three.js, 1080 × 1920)

| Beat | Frame | File |
| --- | --- | --- |
| Hook (S01) | 40 | [previews/gate1b/S01_hook_f0040.jpg](previews/gate1b/S01_hook_f0040.jpg) |
| Garage (S07) | 535 | [previews/gate1b/S07_garage_f0535.jpg](previews/gate1b/S07_garage_f0535.jpg) |
| Gregory reveal (S08) | 657 | [previews/gate1b/S08_gregory_f0657.jpg](previews/gate1b/S08_gregory_f0657.jpg) |
| Gregory tag (S10) | 782 | [previews/gate1b/S10_gregory-tag_f0782.jpg](previews/gate1b/S10_gregory-tag_f0782.jpg) |
| Vault apex (S12) | 900 | [previews/gate1b/S12_vault-apex_f0900.jpg](previews/gate1b/S12_vault-apex_f0900.jpg) |
| Payoff (S16) | 1328 | [previews/gate1b/S16_payoff_f1328.jpg](previews/gate1b/S16_payoff_f1328.jpg) |
| Contact sheet + benchmark | — | [previews/gate1b/Gate1b_contact_sheet.jpg](previews/gate1b/Gate1b_contact_sheet.jpg) |

The first-pass stills stay in `previews/gate1/` for comparison.

## What is now in the shots

| Asset (Codex) | Used in | Wiring |
| --- | --- | --- |
| `cast/Homeowner_Standing_Rig.glb` | S01–S03, S06, S07, S11, S15 | `makeHomeowner` → `Homeowner_Face` morphs; same IK posing as Phil (bones verified identical) |
| `cast/Guard_A_Rig.glb`, `Guard_B_Rig.glb` | S14 | `makeGuard("A" \| "B")`; the old cap hack is removed |
| `cast/Gregory_Pug_Rig.glb` | S08–S10 | One mixer. S08 Idle_Alert + Blink, S09 Idle → Sniff with head aim, S10 Scoot_Forward (root motion 0.45 m) → Sit. The tag shows only from S10 local 18. The chin-scratch target is `Pug_Jaw`. |
| `exterior/House_Exterior.glb` | S03–S14 | `upgradeExterior()` restores the scale-0 upgrade groups to 1 and drives them by visibility. Window, bar, door and turnpiece offsets are relative to their GLB rest. Razor wire rides in `Fortress_Dressing`. |
| `interior/Hallway.glb` | S01, S02, S15 | `Bath_Door_Hinge`, `Steel_Front_Door_Interior`, `Bolt` (slides −0.12 m) |
| `props/Car_Sedan.glb` | S07 | Side glass hidden. Phil is seated at the anchor and his hands are IK'd to `Steering_Wheel`. |
| `props/*` (tray, pole 4.9 m, file, hammer, screwdriver, statement, folded newspaper) | S01, S03–S06, S09, S12, S13 | Pivots per manifest |
| `audio/sfx/*` (42 cues) | All | On the branch and QA'd. They aren't in the composition yet; they get placed at sound design, after narration locks picture timing. |

The ground, street, walks, neighbor houses, trees, picket fence, hedge, porch railings, porch lamps and garage debris are still my procedural pieces, because the house GLB doesn't include them.

## Re-staged during integration (verified in renders)

- **S03:** the deadbolt insert is now shot from inside, because Codex correctly put the thumb-turn on the door's interior face. The homeowner stands inside the door.
- **S08:** the opener is pulled back, since Gregory's head is larger than the placeholder's.
- **S10:** Gregory starts at the foot of the step and scoots one body-length beside Phil, then sits. Phil crouches lower and leans in, so his hand reaches the chin.
- **S11:** the camera was inside the house shell; it now sits in the back yard on a hedge-free stretch of the wall, and the tilt still runs from the shoe to the wall top against the sky.

## Verified

- `npx tsc --noEmit` passes.
- 57 timeline frames render without errors: every 30th frame, plus each re-staged shot and the cut boundary. Frame 1335 is picture, and 1336–1340 are black.
- S16 is unchanged, and the payoff still matches the approved benchmark.

## Known (owner accepted the asset quality; listed for visibility)

- The front door is green (the spec asked for red-brown) and the house has no dressing of its own (my procedural ground, neighbors and trees fill in).
- Gregory is stylized next to the realistic humans.
- The guard caps sit flat.
- The homeowner's collar is a round band rather than a pointed button-down collar.
- Narration is still blocked on the owner-voice take (see [narration/README.md](narration/README.md)).
