# Phil bathroom reveal assets

The set is in meters. Blender uses Z up and the cast faces negative Y at rest. GLB uses Y up and the standing cast faces positive Z. The combined GLB, set, and posed cast share the same axes and scene origin. Load either the full shot or the separate modules.

| File | Contents and use |
| --- | --- |
| `Bathroom_Reveal.blend` | Editable Blender 4.3 scene with room modules, two skinned rigs, face morphs, seated blocking, camera, lights, and packed textures. |
| `assets/Bathroom_Reveal.glb` | Complete Three.js shot with all meshes and embedded textures. Contains the camera, amber point light, and five matching animation clips. |
| `assets/Bathroom_Set.glb` | Static room, window, sconce geometry, tub, opaque foam, curtain, toilet, and floor props. |
| `assets/Bathroom_Cast.glb` | Two skinned cast rigs in shot coordinates, newspaper props and pooled shorts, with the seated head and face animation clips. |
| `assets/Phil_Standing_Rig.glb` | Reusable fully clothed Phil in a neutral A-pose with deform bones and 23 face morphs. Origin on the floor between the feet. |
| `SCENE_INIT.mjs` | Loads and animates the full shot. Supplies camera frame seeking and compatible sources for ambient, doorway and window fill. |
| `previews/ThreeJS_Bathroom_Reveal.png` | Actual Chromium WebGL render of the full GLB. |
| `previews/ThreeJS_Motion_Proof.mp4` | Actual Chromium WebGL motion sample with the camera move, reaction, side-eye, and final cut. |
| `previews/Blender_Reveal.png` | Editable source scene rendered in Blender EEVEE at frame 139. |
| `previews/QA.json` | GLB validation and Three.js import checks for textures, skinning, facial weights, and camera motion. |
| `refs/Approved_Bathroom_Still.png` | Owner-approved visual target. |

## Integration details

- The combined GLB is the easiest way to keep the room, poses, and lighting registered. Blender area lights ship with the source file. The Three.js initializer supplies point-light fill for the exported scene.
- Both face meshes retain 23 morph targets. The Blender armatures have 80 rig bones each. In Three.js the loader sanitizes property names with spaces. Inspect the loaded bone names before adding procedural adjustments.
- `Newspaper_GripPivot` is the center fold. The two panels, hands, and lower wardrobe are already posed for the seated shot. If the hands or paper move in a new shot, recheck their contact in the new pose.
- The GLB validator's skin hierarchy warnings refer to skinned meshes parented under their rigs. All four GLBs loaded and their expected animation tracks resolved in Three.js. Renderer output is 576 × 1024 for stills and 360 × 640 for the motion proof.

## Source credits

- Phil wardrobe adapts Microsoft Rocketbox `Male_Adult_01`. Phil's head and base body rig adapt `Male_Adult_14`. The homeowner head and rig adapt `Male_Adult_16`. Diffuse maps were recolored and downsampled for this shot. Microsoft Rocketbox, MIT license. The included [full notice](ROCKETBOX_LICENSE.md) applies. [Source snapshot](https://github.com/microsoft/Microsoft-Rocketbox/tree/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Adults).
- The homeowner shoulder mesh adapts the MakeHuman core `base.obj` and the `caucasian-male-young.target` morph. MakeHuman core assets, CC0. [Base mesh](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) · [Morph](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/caucasian-male-young.target) · [Asset license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md).
- Room meshes, props, procedural tile maps, and newspaper artwork were built for this pack.
