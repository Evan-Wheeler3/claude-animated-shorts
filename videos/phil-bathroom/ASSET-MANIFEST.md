# Phil | Production assets

## Included and verified in the bathroom test

| File | Use |
| --- | --- |
| [Bathroom_Reveal.glb](assets/bathroom/assets/Bathroom_Reveal.glb) | Full S16 scene with the staged cast, lights, camera and five synchronized clips |
| [SCENE_INIT.mjs](assets/bathroom/SCENE_INIT.mjs) | Tested Three.js setup and local-frame seeking for S16 |
| [Bathroom_Reveal.blend](assets/bathroom/Bathroom_Reveal.blend) | Editable scene with packed textures |
| [Bathroom_Set.glb](assets/bathroom/assets/Bathroom_Set.glb) | Individual bathroom geometry for S01/S02 reverse-angle coverage |
| [Bathroom_Cast.glb](assets/bathroom/assets/Bathroom_Cast.glb) | Staged bath variants and props |
| [Phil_Standing_Rig.glb](assets/bathroom/assets/Phil_Standing_Rig.glb) | Neutral clothed Phil with a body rig and face morphs for the episode |
| [Bathroom motion proof](assets/bathroom/previews/ThreeJS_Motion_Proof.mp4) | Approved renderer look and timing in a silent sample |
| [Pole-vault concept](refs/Pole_Vault_Concept.png) | Concept still for silhouette and lighting |
| [Bathroom manifest and credits](assets/bathroom/ASSET-MANIFEST.md) | Coordinate systems, rig/pivot details, validation, and source credits |
| [House_Exterior.glb](assets/exterior/House_Exterior.glb) | S03–S07 and S11–S15 exterior in meters, Y up, with front wall at Z=0. Includes the hinged front door and centered deadbolt turnpiece, openable side sash, bottom-pivoted bars, centered garage panels, yard wall and lamp, and fortress dressing. To reveal the window upgrades or fortress group after loading, restore its scale to (1, 1, 1). Meshes and tiled textures are original. glTF Validator reported zero errors and warnings. Three.js load and render proofs: [front three-quarter](assets/qa/previews/House_Exterior_Front.png), [wall at dusk](assets/qa/previews/House_Exterior_Wall_Dusk.png). |
| [`assets/interior/Hallway.glb`](assets/interior/Hallway.glb) | Validated with glTF Validator and three.js r177. `Bath_Door_Hinge` at (0, 0, 3.17) rotates about Y toward negative angles and parents `Bath_Door` with `Door_Knob`. `Steel_Front_Door_Interior` parents `Bolt`, centered at world (3.383, 1.1, 5.265) with −0.12 m local Z travel. Also includes `Ceiling_Dome`, `Ceiling_Dome_Lens`, `Console_Table`, and `Framed_Picture`. [S01](assets/qa/previews/Hallway_S01.png), [S15](assets/qa/previews/Hallway_S15.png), [QA report](assets/qa/QA_hallway.json). Original geometry and textures with olive ceramic and ceiling plaster reused from the supplied bathroom set. |

Keep the included license notices with the reused assets. Use the full GLB alone for S16. Reuse set and rig exports separately for other shots. The shipped rig uses real-world meters, and the bathroom asset folder’s manifest describes its axes and origins.

## Reuse or build for the full short

| Needed asset | Shots | Direction |
| --- | --- | --- |
| Clothed homeowner rig | S01–S15 | Match the bath likeness with a compatible standing body and simple wardrobe. Test shoulders, neck, facial orientation and hand contacts. |
| One modular suburban house and front hallway | S01–S15 | Front door and deadbolt, openable side window, porch, garage, yard and wall. Include separate pivots for the door, window and garage panels. |
| Window upgrade kit | S04–S06 | Separate bars, file and boards. Plan separate collision geometry so actors clear the frame during contact. |
| Car and garage damage states | S07 | Simple driver seat and wheel, closed garage and two breakaway panels or lightweight animated fragments. |
| Gregory, tray and collar tag | S08–S10 | Short pug rig with idle, sniff, side step and sit. Build an independent tray pivot and a readable GREGORY tag. |
| Concrete wall and vault pole | S11–S12 | Match the vault silhouette in the concept. Keep the world-space plant point and hand release readable. |
| Fortress dressing | S13–S15 | Steel door, red security status light, two guards from a shared uniform rig, interior security state and a paper or account graphic. |
| Episode sound and narration | All | Render from the approved owner voice workflow and assemble original or licensed foley, score and one bathroom punchline cue. |

These exterior and supporting assets are production tasks. Prioritize animated requirements over excess model detail. Use ready, licensed repo assets where they fit. Put placeholder status and blocking risks in the first review notes.

## Production status (Gate 1, Claude)

See [REVIEW-GATE1.md](REVIEW-GATE1.md) for the per-asset table: what is reused, built or still a placeholder. In short:
- **Reused:** the supplied bathroom GLBs, `SCENE_INIT.mjs` and the standing Phil rig.
- **Built** procedurally in `remotion/src/`, all at blocking quality: the hallway, exterior house, window kit, garage panels, yard wall, fortress dressing and small props.
- **Placeholders:** the clothed homeowner (supplied face on a standing body clone), the car, Gregory, and the two guards.
- **Blocked:** the narration, which needs the owner's enrolled Qwen3-TTS voice (see [narration/README.md](narration/README.md)).

All built geometry is in meters, Y up. Exterior: the house front is at z = 0 facing +Z; the garage door is centered at x = 2.85; the side window is at x = −5, z = −3; the wall is at z = −11 and 3.66 m tall. The bathroom and hallway use the bathroom GLB's own axes.


## Sedan and handheld props

| Path | Pivot | Node names | Preview | Status | License |
| --- | --- | --- | --- | --- | --- |
| [`assets/props/Car_Sedan.glb`](assets/props/Car_Sedan.glb) | Ground at vehicle center, nose −Z, driver side −X | `Car_Sedan`, `Floorpan`, `Carpet`, `Driver_Body`, `Mirror_Housing`, `Passenger_Body`, `Hood`, `Trunk_Lid`, `Front_Bumper`, `Rear_Bumper`, `Lower_Intake`, `Grille_Surround`, `Rear_License_Plate`, `Headlight_L`, `Taillight_L`, `Headlight_R`, `Taillight_R`, `Roof`, `Headliner`, `Window_FL`, `Window_RL`, `Front_Door_Trim`, `Rear_Door_Trim`, `Window_FR`, `Window_RR`, `Windshield`, `Rear_Glass`, `Dashboard`, `Instrument_Binnacle`, `Center_Stack`, `Center_Console`, `Gear_Lever`, `Driver_Seat`, `Seat_Cushion`, `Seat_Back`, `Headrest`, `Passenger_Seat`, `Rear_Seat_Cushion`, `Rear_Seat_Back`, `Driver_Seat_Anchor`, `Steering_Wheel`, `Steering_Rim`, `Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR` | [Car_34](assets/qa/previews/Car_34.png), [Car_Driver](assets/qa/previews/Car_Driver.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Rotisserie_Tray.glb`](assets/props/Rotisserie_Tray.glb) | Bottom center | `Rotisserie_Tray`, `Tray_Base`, `Roast_Chicken`, `Tray_Lid` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Newspaper_Folded.glb`](assets/props/Newspaper_Folded.glb) | Midpoint of the folded edge | `Newspaper_Folded`, `Newsprint`, `Center_Fold` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Vault_Pole.glb`](assets/props/Vault_Pole.glb) | Bottom tip at Y = 0, shaft extends +Y | `Vault_Pole`, `Fiberglass_Shaft`, `Tip_Cap`, `Tape_Grip_1`, `Tape_Grip_2`, `Upper_Plug` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Metal_File.glb`](assets/props/Metal_File.glb) | Center of the hand grip, blade extends +Y | `Metal_File`, `Grip`, `Ferrule`, `File_Blade` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Claw_Hammer.glb`](assets/props/Claw_Hammer.glb) | Center of the hand grip, head toward +Y | `Claw_Hammer`, `Handle`, `Grip`, `Hammer_Head`, `Strike_Face` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Screwdriver.glb`](assets/props/Screwdriver.glb) | Center of the red hand grip, shaft extends +Y | `Screwdriver`, `Red_Grip`, `Collar`, `Shaft`, `Blade_Tip` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Account_Statement.glb`](assets/props/Account_Statement.glb) | Center of the A4 card, printed side faces +Z | `Account_Statement`, `Statement_Card`, `Statement_Print` | [Props_Sheet](assets/qa/previews/Props_Sheet.png), [Statement_Close](assets/qa/previews/Statement_Close.png) | Validated and rendered | Original for Hold Up |
| [`assets/props/Plywood_Board.glb`](assets/props/Plywood_Board.glb) | Center of the board, length along X | `Plywood_Board`, `Plywood`, `Nail_Head_1`, `Nail_Head_2` | [Props_Sheet](assets/qa/previews/Props_Sheet.png) | Validated and rendered | Original for Hold Up |
| [Homeowner_Standing_Rig.glb](assets/cast/Homeowner_Standing_Rig.glb) | 80 Bip01 bones, identical to Phil’s standing rig | 23 face morphs, names unchanged. 1.809 m tall, Y up, faces +Z, floor pivot between feet. | [Front](assets/qa/previews/Homeowner_Front.png), [Side](assets/qa/previews/Homeowner_Side.png), [Face close-up](assets/qa/previews/Homeowner_FaceCU.png), [With Phil](assets/qa/previews/Homeowner_vs_Phil.png) | Validated with glTF Validator and Three.js r177. [QA report](assets/qa/QA_homeowner.json). | [Microsoft Rocketbox @ 0943055db6ec570bcef9f2c8b41c9e5467c808f9](https://github.com/microsoft/Microsoft-Rocketbox/tree/0943055db6ec570bcef9f2c8b41c9e5467c808f9), [MIT notice](assets/cast/Homeowner_Rocketbox_LICENSE.md) |
| `assets/cast/Gregory_Pug_Rig.glb` | Meters, Y up, +Z forward. Floor origin centered between paws. 0.30 m at shoulder, 0.45 m torso. | Bones `Pug_Root`, `Pug_Spine0–1`, `Pug_Neck`, `Pug_Head`, `Pug_Jaw`, `Pug_Tail0–1`, `Pug_Ear_L/R`, `Pug_FrontLeg_L/R0–2`, `Pug_HindLeg_L/R0–2`. `Gregory_Body` morphs `Blink`, `Sniff`, `EyesLeft`, `EyesRight`. Clips `Idle_Alert`, `Sniff`, `Scoot_Forward`, `Sit`, `Blink` at 30 fps. `Pug_Collar` and `Gregory_Tag` separate. | [Three-quarter](assets/qa/previews/Gregory_34.png), [sit/engraving](assets/qa/previews/Gregory_Sit_Tag.png), [scale with Phil](assets/qa/previews/Gregory_Scale.png), [motion](assets/qa/previews/Gregory_Motion.mp4), [QA](assets/qa/QA_gregory.json) | Validated for Gate 1 review | Original artwork |
| [Guard_A_Rig.glb](assets/cast/Guard_A_Rig.glb) | Floor between feet, +Z forward, Y up, meters | `Guard_A_Face`, `Guard_A_Wardrobe`. Rocketbox `Male_Adult_03` head, 80 Phil Bip01 bones in order, 23 Phil facial morphs | [Front](assets/qa/previews/Guards_Front.png), [Face close-up](assets/qa/previews/Guards_FaceCU.png), [Lineup](assets/qa/previews/Guards_Lineup.png) | Validated for S14, 0 glTF errors and posed seam check passed | Rocketbox `0943055db6ec570bcef9f2c8b41c9e5467c808f9`, [MIT notice](assets/cast/Guards_Rocketbox_LICENSE.md) |
| [Guard_B_Rig.glb](assets/cast/Guard_B_Rig.glb) | Floor between feet, +Z forward, Y up, meters | `Guard_B_Face`, `Guard_B_Wardrobe`. Rocketbox `Male_Adult_12` head, 80 Phil Bip01 bones in order, 23 Phil facial morphs | [Front](assets/qa/previews/Guards_Front.png), [Face close-up](assets/qa/previews/Guards_FaceCU.png), [Lineup](assets/qa/previews/Guards_Lineup.png) | Validated for S14, 0 glTF errors and posed seam check passed | Rocketbox `0943055db6ec570bcef9f2c8b41c9e5467c808f9`, [MIT notice](assets/cast/Guards_Rocketbox_LICENSE.md) |
