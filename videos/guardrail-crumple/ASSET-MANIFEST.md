# Guardrail asset manifest

All meshes and canvas artwork are original procedural assets in the story folder. They require Three.js and a browser canvas for the 2D cards. There are no downloaded models, textures, fonts, or brand marks. The terminal is a stylized illustration of an extrusion mechanism.

Coordinates are in approximate meters, Y up. Road grade is Y=0. Traffic travels toward +Z and the drop is toward +X. Set rail root X to 3.26 m for the supplied cliff road. The head-on impacts use the straight approach. Use the curved rail for the glancing hit.

| Shots | Asset | Source and control | Placement and scale |
|---|---|---|---|
| 1–10 | Cliff bend, road markings, gravel shoulder, layered rock wall, river and trees | [models.mjs](assets/models.mjs), `createCliffRoad()`, `roadCenter(z)` | Origin on the approach centerline. Six-meter road, 14-meter drop. Use background fog to soften the far end. |
| 1, 3, 5–6, 8, 10 | Compact car and cabin | [models.mjs](assets/models.mjs), `createCar()` | Root at ground beneath the car center, nose +Z. Wheels spin on local X, front pivots steer on Y, bumper group can yaw or retract. Exterior can be hidden for cabin framing. Cabin has seats, dash, steering wheel and belt. |
| 1, 3, 5–6, 8, 10 | 2D toon driver | [driver.ts](assets/driver.ts), `createDriver()`, using the shared toon drawing and card lighting | Attach card to car interior at its supplied offset. Call `faceCamera(camera)` after setting the shot camera. Poses are `steer`, `brace`, and `peek`; use the card belt for the impact close-up. Keep the face inside the window opening from driving cameras. Card on NOINK layer 3. |
| 2–5 | Corrugated beam, post spacers and old terminal | [models.mjs](assets/models.mjs), `createGuardrail()` | Root at leading edge. Beam center Y=0.68. Use `setTerminal({modern: false})`; apply `setBeam({flex, contact})` afterward for the side shot. Posts are separate children for the assembly beat. |
| 7–10 | Energy-absorbing impact head, housing and cutaway guides | [models.mjs](assets/models.mjs), `createGuardrail()` | Call `setTerminal({travel, open})` with travel in meters. Switch to open for shot 9. The input end of the beam advances with the impact head. Keep the bumper in contact with the front face throughout the travel. |
| 9–10 | Flattened steel strip | [models.mjs](assets/models.mjs), `createDischargedSteel()` | Parent to the head during the cutaway. Set length from the same travel value. The ribbon exits toward the field side and curls downward. Treat its curve as art direction, and lock its final pose for the stopped shot. |
| 1, 3, 5, 8 | Dust and impact sparks | [cards.mjs](assets/cards.mjs), `createImpactEffect()` | Place at tire or impact point, rotate group toward camera, drive normalized progress from 0 to 1. Layer 3. |
| All | Lighting, sky, shadows, outlines, audio generation | Existing [bridge template](../../templates/bridge/) and [audio helpers](../../templates/audio/) | Apply world ink to layer 0. Light and tint the driver with the existing card treatment. Use the existing narrator and mix. |

The 3D geometry checks passed in Three.js 0.170. Open the [review page](assets/preview.html) or render the Remotion first-stills entry to inspect the supplied poses. Use real Remotion first-stills to approve the final look and camera contact before animation.

A [CC0 Kenney sedan](assets/kenney-sedan/README.md) is available as a sourced exterior option. Its windows are opaque in the original mesh. The existing cabin car supports the driver-through-window shots.
