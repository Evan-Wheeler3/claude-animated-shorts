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
