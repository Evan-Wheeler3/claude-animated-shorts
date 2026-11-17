# Camera and staging (lessons from the bridge and Niagara productions)

Repo-level direction lives in `/CAMERA-DIRECTION.md`; the measured camera grammar in `/SKILL.md`. This file keeps the
practical lessons that cost us iterations.

## Framing a 9:16 shot
- Horizontal field is narrow: at fov 40 vertical the half-width angle is only ~11.6 deg. Three people 1 m apart need
  ~5.5 m of distance or fov 44+. Check the outermost character, not the centre (Niagara D/F: rivermen were cut twice).
- Put the subject on the line between camera and the background feature you want behind it. For a hero-with-landmark
  shot compute the direction to the landmark and back the camera along it (Niagara B: `dirB` toward the horseshoe).
- To place a subject on a third, offset the LOOK point sideways, not the camera; check the sign of the offset on a
  render (we had it backwards once: rB vs -rB).
- Barrel-in-the-landscape hooks: the prop must be in the lower third; with a far look target the prop falls out of
  frame. Use a near look point on the same line (Niagara A: look 24 m ahead along the line to the far curtains).

## Push-ins
- `dolly()` moves the camera toward the LOOK point; with a far look point a 10 % push is many metres and flies past the
  subject (Niagara A, first try). Keep the look point near the subject, or use `zoom()` (fov push) for distant targets.
- Push rates 0.0015-0.0025 per frame (bridge grammar); validate with `scripts/validate-paths.mjs`.

## Geography (Niagara)
- From the upper river near the brink, looking down the flow you see the GORGE, not the falls: the horseshoe opens
  downstream. The classic view is from the side (Table Rock) across the bowl at the far curtains.
- A falling-sheet shot works in side profile (lip line running away, sheet dropping beneath, foam below); looking at the
  sheet face-on fills the frame with streaks and loses all scale.

## Clipping and foreground
- Keep 0.6 m between the lens and any geometry (QA near-plane check). Trees are culled against every shot's sight line
  (`sightLines()` in world.ts); re-run after moving a camera.
- Foreground props cut by the frame edge read as blobs (bridge lesson): recognisable or gone.
- Mist/spray cards are NOINK and transparent; they never block the QA face check but can wash a face out: keep them
  behind characters or thin.

## Readability
- One idea per shot; the most important face >= 1/4 of the frame width on a phone for close-ups.
- Effect cards (spray, stars) are drawn cartoon shapes with plum rims; flat discs and "crowns" read as objects, not water.
- After every camera change render the still and look at it at phone size before moving on.
