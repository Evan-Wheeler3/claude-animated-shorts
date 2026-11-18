# Phil bathroom reveal for Claude Code

Use the extracted folder as one shot asset pack for Hold Up's opt-in Absurd 3D Comedy style. The shot is already staged and keyed. Review the supplied motion proof before integrating it into the episode.

1. Read `README.md`, `ASSET-MANIFEST.md`, and the current Hold Up repository production instructions. Open `refs/Approved_Bathroom_Still.png` and compare it with `previews/ThreeJS_Bathroom_Reveal.png`.
2. Use `assets/Bathroom_Reveal.glb` for this reveal and `SCENE_INIT.mjs` as the Three.js integration example. Keep the embedded camera and five animation clips in sync with one mixer. Set the frame from Remotion's current frame relative to the shot's start at 30 fps. Return the supplied perspective camera to the render path and set its view to 9:16. This pack has its own soft falloff lighting and no ink outline treatment. Use ACES filmic tone mapping at exposure 1.25 for the closest match to the preview.
3. Show the homeowner in the foamy bath for the opening, then pan right. Show the homeowner's head turn first. Phil holds the newspaper still and gives him a small side-eye near the end. The supplied clip timing is below. The three-dimensional rigs and separate newspaper meshes support further staging in Blender or Three.js.
4. Hold the last two-shot for the comic pause. Use the episode's approved audio and place the single sound cue just before the hard cut. Review the end at 9:16 and phone size. Present the reveal as an in-engine still and a short proof for owner review. Follow the episode's current approval gate before continuing.

| 30 fps frame, zero-based | Action |
| --- | --- |
| 0–37 | Hold on the homeowner and bath. Phil stays out of the opening frame. |
| 38–107 | Pan into the room. The homeowner turns during the move. |
| 107–119 | Phil's gaze shifts sideways. |
| 126–131 | Hold the face-off through Phil's blink. |
| 138 | Suggested short sound cue. |
| 146 | Suggested hard cut to black in the editor. |

For the source scene open `Bathroom_Reveal.blend` in Blender 4.3 or newer. The frame markers in Blender are one-based. Render frame 139 to compare the reveal. The source rigs are `Phil_Rig` and `Homeowner_Rig`. Their head, neck, eye, spine, and limb bones use the `Bip01` names. Relevant face morphs are `AU_62_EyesTurnRight`, `AU_64_EyesDown`, `AU_45_Blink`, and `AK_03_BrowInnerUp`. Blender stores the facial animation on the two face meshes. Keep their clip actions in the GLB mix.
