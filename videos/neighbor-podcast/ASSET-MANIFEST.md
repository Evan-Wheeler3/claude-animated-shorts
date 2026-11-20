# Neighbor Podcast | Asset plan

Target Three.js/Remotion. GLBs use meters, Y up and positive Z forward for standing cast. Proposed paths are relative to this folder. The following table is the final-asset plan. Available blocking implementations are listed below. Render verification is deferred to Claude.

| ID | Asset and target path | Source and status | Scale, pivot and review |
| --- | --- | --- | --- |
| PORCH | `assets/sets/Porch.glb` | Reuse candidate. Phil's `assets/exterior/House_Exterior.glb` exists at `c455d9a`. Verify provenance and bring across only the required modules. | House origin at grade. Add a lens mount and shallow flower bed. Review fisheye and bat side angle together. |
| OWNER | `assets/cast/Homeowner_Standing_Rig.glb` | Reuse candidate. Phil's standing homeowner and Rocketbox license notice exist at `c455d9a`. Check the asset manifest and carry required notices. | Floor origin, preserve IK and face morphs. Review bat grip and box carry. |
| HOST | `assets/cast/Host.glb` | Build or source. Reuse compatible human skeleton tooling. | Floor origin. Review seated height, gaze, speech poses, and persistent mic grip. |
| GUEST | `assets/cast/Porch_Guest.glb` | Build or source distinct adult variant. | Floor origin. Review seated contact as chair sinks. |
| BABY | `assets/cast/Baby.glb` | Build or source age-appropriate clothed rig with sufficient hand and leg articulation. | Floor origin. Review both hands on rail, planted feet and seated pose. |
| LOCKSMITH | `assets/cast/Locksmith.glb` | Build or source distinct adult variant. | Floor origin. Review opening hand contact and eyeline from inside safe. |
| BEAR | `assets/cast/Bear.glb` | Build or source rig with quadruped gait, seated pose and head control. | Ground origin. Review loaded chair, headset clearance and muzzle-to-mic gap. |
| KIT | `assets/props/Podcast_Kit.glb` | Build chairs, headset, mic, notes and glass. | Mic grip pivot, adult/tiny chair floor origins, seat contact anchors and headset band fit. |
| DOORBELL | `assets/props/Doorbell.glb` | Build housing and lens mount. | Wall mount origin with named camera anchor. Review lens/impact registration. |
| BAT | `assets/props/Bat.glb` | Build baseball bat. | Grip origin. Review staged swing, wall clearance and camera occlusion before contact cut. |
| NURSERY | `assets/sets/Bedroom_Nursery.glb` | Build nightstand vignette and crib vignette with independent lighting. | Grade origin. Crib rail at baby's standing hand height, clear camera sightline. |
| MONITOR | `assets/props/Baby_Monitor.glb` | Build parent display and matching nursery camera. | Screen plane and nursery lens anchors. Review display light and safe placement. |
| SAFE | `assets/props/Safe_and_Cameras.glb` | Build safe, door and camera pile as separate nodes. | Door hinge pivot and interior camera anchor. Review door swing and guest reveal. |
| CABIN | `assets/sets/Cabin_and_Woods.glb` | Build cabin steps, road transition and trail clearing. Source foliage with recorded license. | Grade origin. Review travel direction and usable depth in infrared. |
| MOVE | `assets/props/Move_Kit.glb` | Build or source truck, moving box and mug. | Vehicle origin at ground, box handholds, mug grip. |
| TRAILCAM | `assets/props/Trail_Camera.glb` | Build device or define a named set camera anchor if housing stays offscreen. | Fixed lens origin with sightline to both chairs. |

Build or source original and permissively licensed assets. Record exact source, license, materials, rig controls and evidence path as each asset lands. For reuse inspection, see the [pinned Phil asset tree](https://github.com/Evan-Wheeler3/claude-animated-shorts/tree/c455d9a7917d4efe7b9bd274ba654a0f23b40a0c/videos/phil-bathroom/assets). The branch carrying this package does not vendor those files.

## Available for blocking

- `assets/cast/Host_Blocking_Rig.glb` and `assets/cast/Homeowner_Standing_Rig.glb` are copied from the pinned Phil commit. Both use the existing standing IK and face controls. See `assets/cast/ROCKETBOX_LICENSE.md`. The host uses Phil’s likeness for blocking. The homeowner doubles as the porch guest and locksmith in the current still setups.
- `remotion/src/sets.ts` contains procedural porch, crib, safe, trail clearing, chairs, mic, headphones, and posed baby and bear geometry. The baby and bear are static blocking assemblies. They need articulated motion for the stand, sit, and mic lean.
- The existing house GLB remains a reuse candidate. The porch scene currently uses procedural siding and landscaping. No GLBs are shipped for the procedural sets or props.

## Audio

- Narrator and host recordings are pending. Capture separate dry tracks with word timings and preserve intact takes for alignment.
- Crowd cheer is sourced as CC0. Forest wind is sourced under the Mixkit free SFX license. Both are linked in [SHOTLIST.md](SHOTLIST.md) and await audition.
- Record or source real contact Foley for the bat crack, safe door, crib, chairs and footfalls. Record a close breath for the bear payoff. Track source and license per clip.
