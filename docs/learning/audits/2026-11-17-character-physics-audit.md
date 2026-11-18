# Audit: character construction, grounding and interaction (2026-11-17, before any fix)

Code audited: `src/videos/niagara/toon.ts` (`bodyFront`, `hatOn`, `hatBehind`), `crew.ts`, `actors.ts`, `world.ts`,
`story.ts` at commit 13c8d38 (Gate 1 stills). Each finding names the root cause, not the symptom.

## Arms / sleeves
1. **No arm model.** Every pose in `bodyFront` hard-codes three points (shoulder, "elbow", hand) as offsets from the
   torso (`hang`, and one literal per `pose`). Upper-arm and forearm lengths therefore differ per pose (measured: hand
   0.62 HH from the shoulder in "hips", 0.80 HH in "point", 0.95 HH in "up"), so arms visibly change length between poses.
2. **Arms are not sleeves.** Arms are a single `p.stroke` in `armCol = mix(jacket, INK, .5)` with no ink rim. On Annie's
   cream blouse that is a grey-brown stick, so the arm reads as drawn on top of the clothes, not as a sleeve.
3. **Wrong layer order.** Draw order is back arms -> torso -> sleeve puffs -> FRONT arms. Front-arm poses (hips, clasp,
   grip, purse) are therefore drawn over the puff, and the line cuts through the sleeve head.
4. **Shoulder anchor sits on the neck.** `sh()` = (0.85 x torso half width, chin + .12 HH); the egg torso is narrow
   there, so the arm root is inside the neck/collar area and the puff is offset +6u to hide it.
5. **No wrist.** The hand is an ink dot at the end of the stroke; nothing marks a cuff, so hands look stuck on.

## Hats / hair
6. **Hats are placed, not worn.** Each hat uses fixed widths (`w0 = .22 W`, `wb = 46u`) and a base line at a fixed height
   (`crown + .02 HH` for Annie's hat: ABOVE the crown, i.e. on top of the bun). Nothing reads the head contour, so the
   hat does not follow the skull's curve and floats.
7. **Annie's hat rotates about its own pivot** (`ha = a - 9 deg` about `cx + 6u`) instead of the head, and its brim is a
   full ellipse drawn over everything, so it neither tucks behind the hair at the back nor overlaps the forehead in front.

## Torso / waist / skirt
8. **Skirt narrower than the torso at the waist.** The torso blob is widest near its bottom; the skirt starts at
   `ww = .86 T.a` on a straight line, so the blouse bulges out past the skirt top on both sides.
9. **Waistband is a straight band** with 2u overhang past the skirt edge on both sides (floating line, not a band
   around a body).
10. Pants have no waist at all: the torso blob simply covers the leg roots (works, but no belt line to anchor to).

## Proportions
11. `BUILD` holds head/torso/leg ratios only; arm lengths, shoulder width, hip width and hand positions are implicit in
    the pose literals, so they are inconsistent between poses and builds.

## Grounding
12. **Characters use constants, not the surface.** crew.ts sets y from `LAND_Y`, `DOCK_Y`, `SHORE[1]`. The beach mesh
    has a slope and a sine ripple, the promenade paving sits 3 cm above `LAND_Y`: feet float or sink by a few cm, and
    contact blobs are at the same wrong height.
13. **Props use constants too** (barrel on the shore, rock, rope). No helper finds the surface under a prop footprint.

## Interaction / clipping
14. **Barrel rim grip is not anchored.** "grip" hand x = 1.25 T.a + 18u from the torso, unrelated to the barrel rim
    radius, so hands land beside or inside the rim depending on scale.
15. **Annie's card stands at the barrel axis**; the rim's side tangent points are in that plane, so a correctly
    anchored hand can z-fight the staves: needs a small toward-camera offset rule.
16. **Barrel over the brink (E) is placed by hand** at `lip + inward 2.2, y -1.6`, not on the computed sheet surface.

## QA
17. No automated check exists for foot-ground distance, prop support, camera near-plane, or path jumps; problems were
    found only by eye on full renders.
