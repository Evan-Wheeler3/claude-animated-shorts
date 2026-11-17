# Character anatomy standards (Hold Up cartoon cast)

Every character is a flat 2D drawing on a camera-facing card, drawn by `src/pipeline/toon.ts`, placed by
`src/pipeline/cast.ts`, lit by `src/pipeline/cardshade.ts`. These rules keep every pose, outfit and hat consistent.
They are enforced in code; the numbers below are the code's constants, not guidelines to eyeball.

Design space: a 600 x 1000 canvas, soles at y = 975. `W` = head width, `HH` = head height, `u` = W / 100.
World size: `SU = 0.00216 m` per unit (pipeline/actors.ts), times the card's `scale` (Annie 0.95 ~ 1.58 m).

## Proportions (`BUILD`, `RIG` in toon.ts)
| | adult | stout | kid |
|---|---|---|---|
| head half-width `a` | 118 | 118 | 112 |
| torso length (HH) | 1.10 | 1.15 | 0.85 |
| leg length (HH) | 1.40 | 1.32 | 1.00 |
| torso width (x W) | 0.80 | 0.92 | 0.72 |
- Total ~3.5 head-heights for adults. Heads are bean shaped (`headBlob`), H/W ~0.94. Keep it stylised: no realistic necks, hands or feet.
- `RIG` (shared by every build, scales with HH): shoulder joint `shoulderDrop` 0.17 HH below the chin, at `shoulderIn` 88 % of
  the torso half width measured ON THE CONTOUR at that height (`spanAt`); upper arm 0.44 HH, forearm 0.42 HH (a hanging
  hand ends ~0.82 HH under the shoulder, at hip level); waist line 0.38 HH above the torso bottom; trouser seat half width 0.17 W.
- Anchors are read off the actual torso contour (`spanAt(tp, y)`), never typed as fixed offsets, so they follow the
  build (stout torsos are wider) and the egg shape.

## Arms, shoulders, sleeves (`bodyFront`, `ik2`, `drawArm2`)
- A pose only names HAND TARGETS. `ik2(shoulder, target, upperArm, foreArm, out)` solves the elbow; arm length can never
  change between poses; unreachable targets clamp to a straight arm on the same line. Elbows bend outward (`out` = side).
- An arm is a SLEEVE: fill = jacket colour (35 % toward its shade), ink rim 1.25u each side, total ~0.07 W (still a stick arm).
- Layering, always in this order:
  1. back arms (hand outside the torso span) - before the torso;
  2. torso, skirt/waistband, collar;
  3. front arms (hand ends over the torso: hips, clasp, cross, hold, grip near the body);
  4. sleeve heads (`o.puff`) on top of every arm root, oriented along the upper arm.
- The shoulder ROOT is never drawn over the torso: every arm is first drawn with `Pen.clipOut(torso)`, so it emerges
  from the seam; a front arm then redraws only its forearm half inside the torso. This is what stops arm lines cutting
  through sleeves and blouses in every pose (not a per-pose fix).
- Wrist: a cuff band (jacket shade) 1.5-5u before the end, then the ink-dot hand 2.5u past the wrist along the forearm.
  Held props attach at `hand(side)` (the same anchor), never at a typed point.
- Poses available: neutral, walk (`mode: "stroll"`, swing), `point`, `up`, `hips`, `clasp`, `cross`, `grip`, `shrug`,
  `hold`/`purse`, `reach`, plus `hands: [left, right]` contact targets (see PHYSICS-AND-COLLISIONS.md "Attachment").
- Body tilt (`tilt`) rotates the upper body about the hips; contact targets are converted into that rotated frame first.

## Headwear (`wornHat`, `hatOn`, `hatBehind`)
- A worn hat is built from the HEAD (or hair) CONTOUR: the band sits `bandK` HH below the crown; its ends are the
  contour's span at that height x `fit`, joined by a sagging arc (the band wraps a round head).
- Brim: the BACK half is drawn before the crown (behind), the FRONT half after (over the forehead / hairline).
- Everything rotates with the head (`R` about the head centre, + `headTilt` via the pen rotation): no private pivots.
- Order: things behind the head (`hatBehind`: bun, pompadour, bonnet back) -> head -> hair cap -> hat -> face.
- Hair that should show under a hat is cut lower than the band (Annie: hair to 0.34 HH, band at 0.075 HH on the hair).
- Presets in use: Annie small felt hat (bandK .075, fit 1.0, crown .17 HH, brim 1.38), shako (.27, 1.03, crown .56/.66 HH,
  front peak .74 of band), top hat (.24, .98, crown .78 HH, brim 1.42), flat cap (contour cap + peak .72 of the brow span),
  bonnet (behind + brim arc), bare hair.

## Torso, waist, skirts, trousers
- Skirts start at the waist line and their top edge IS the torso's contour width there (+0.5u). Below, the skirt edge is
  `max(bell curve, torso width + 1.5u)`, so the blouse can never bulge past the skirt.
- `waistband()`: a band that wraps the body (both edges sag 0.02 HH at the centre), its ends exactly on the skirt edges,
  no overhang; drawn after the skirt.
- Trousers: a seat block (pants colour) rises under the coat hem so the legs hang from hips, not from the coat.
- Dresses (`o.dress`) keep the bridge construction (dress bean + shoulder cape).

## Faces
- Expressions in `FACE`; Niagara added `determined`, `hopeful`, `deadpan`, `worried`. Age lines (`o.age`) are 2 crow's-feet
  strokes + a cheek fold. No blush, no catchlights (reference rule).

## Main-character glow (`GLOW` in pipeline/actors.ts, `uPresence` in cardshade.ts)
- Targeted, per card, no full-screen pass: (1) a halo card = the drawing's alpha blurred ~16 design units, additive, a few
  cm behind the character (depth-tested, so it only shows outside the outline and never over the face or the ink);
  (2) `uPresence` on that character's own material: +3.5 % brightness, +8 % saturation at 1.0.
- Presets `off` / `subtle` (halo .16, presence .5) / `strong` (.34, 1.0); tint per light (`GLOW_TINT`). Set per Place
  (`glow`), primaries only; secondaries stay `off`. Final strength pending the user's review (see Niagara retrospective).

## Checklist
See VISUAL-QA.md "Character anatomy", "Clothing", "Hats and hair". Render the CharacterLab pose and hat scenarios
(`scripts/lab-stills.mjs`) after ANY change to toon.ts and compare with the previous renders.
