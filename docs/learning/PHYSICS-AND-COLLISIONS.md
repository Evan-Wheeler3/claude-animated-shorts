# Physics, grounding and collisions

The pipeline mixes 2D character cards with 3D sets. There is no physics engine; contact is solved with a few explicit,
reusable rules. Implementation: `src/pipeline/ground.ts`, `src/pipeline/cast.ts`, examples in
`src/videos/niagara/world.ts` + `crew.ts` and the QA lab `src/videos/lab/labWorld.ts`.

## 1. Ground contact (`Ground`)
- Register every walkable surface once: `ground.add(land, paving, beach, dockGroup)`. Do NOT register water, trees,
  walls or characters. Call `root.updateMatrixWorld(true)` before the first query.
- `hit(x, z, top=200)` casts a ray straight down and returns the highest surface + its normal. Results are cached per point.
- Characters: give x, z only. `CardStage.render` snaps the soles to the mean height under the two feet (+-0.11 m along
  the camera's right). Contact shadows (`blob()`) carry `groundOffset`, are snapped to the same surface and rotated to
  its normal, so they never float or cut into slopes.
- Someone standing UNDER a deck/bridge: set `Place.groundTop` below the deck.
- Props: `ground.rest(obj, footprint, sink)` puts the object's lowest point on the HIGHEST of 9 samples under its
  footprint (never sinks into a bump, may rest a few cm proud on the low side). `restAligned` first tilts the prop to the
  surface normal (a barrel standing square on a ramp). `sink` declares an intended embedding (a boulder bedded in pebbles).
- Never type a height constant for something standing on terrain. (Gate-1 bug: the beach had a slope and ripple, the
  paving sat 3 cm above `LAND_Y`; every card and prop used constants.)

```ts
const ground = new Ground().add(...falls.ground, dock);            // once
const barrel = toonify(createBarrel()); barrel.position.set(x, 0, z);
root.add(barrel); ground.rest(barrel, 0.42);                       // resting prop
out.places.push(person(cam, i, ANNIE, "annie", x, 0, z, opts));   // card: y is solved by CardStage
blob(cam, out, x, z);                                               // its contact shadow, also solved
```

## 2. Water
- Water surfaces get their OWN `Ground` (`world.water`). A floating prop takes `water.heightAt(x, z) - draft`
  (barrel draft 0.62 m with the anvil ballast). For animated waves rebuild the surface each frame and query it.
- Tilt a floating prop halfway toward the wave normal (lab `water` scenario).
- Riding a waterfall sheet: the sheet is a function (`curtainAt(s, k)` in niagara/falls.ts). Find the sheet point
  (`brinkK` bisection), the sheet tangent and normal, and place the barrel centre ON the surface, sunk ~35 % of its radius
  toward the camera side. Never hand-place a prop "near" a sheet.

## 3. Attachment (hands on objects)
- `toCard(camPos, cardX, cardY, cardZ, scale, worldPoint)` converts a 3D contact point into the card's design units for the
  current camera; pass it as `FrontOpts.hands[side]`. The IK arm reaches it with constant arm length.
- `ringGrips(camPos, centre, r)` returns the two side points of a rim (barrel, tub) as seen from the camera; they lie in the
  card plane of someone standing in the ring's axis, so the hands land exactly on the rim.
- Held props (purse, ice cream, hammer) attach at the hand anchor inside the drawing.
- Leaning: tilt the body (`tilt`) and give the leaning hand a contact target on the support (lab `lean`).

## 4. Containment and 2D/3D occlusion
- A card inside a container stands in the container's axis plane, moved 6 cm toward the camera (so it does not z-fight
  the staves at the rim's side points), `ground: false`, y = floor of the container + standing height (Annie: 0.5 m on
  the cushions). The near wall then hides the lower body by plain depth testing: no masks needed.
- Sitting: `FrontOpts.seat` = hip height above the soles in design units = (seat top - ground) / (SU x scale); the card
  stands just in front of the seat's centre.
- Cards are yaw-only billboards: they cannot wrap around 3D geometry. Things that must pass BETWEEN a card's parts
  (an arm in front of a barrel and a hand behind it) need two cards or a redesign of the shot. Known limitation.
- Character ink is inside the drawing; world ink never outlines cards (NOINK layer).

## 5. Movement and gravity (lab `fall_motion`)
- Free fall: `y = y0 - g t^2 / 2` until the support under the object (`ground.heightAt`), one damped bounce (25 % of the
  impact speed), then rest. Pivots: rotate about the object's centre (wrap it in a pivot group; the barrel hangs -H/2).
- Rolling: `a = 2/3 g sin(theta)` for a rolling cylinder, rotation = distance / radius about its own axis, friction
  deceleration on the flat. Height comes from the ground under the contact point + radius.
- Walking: `mode: "stroll"`, phase from distance (0.7 m per step); feet are snapped each frame.
- All motion is a pure function of the frame (Remotion renders frames out of order): no integrators with state.

## 6. Automated checks
- `inputProps { qa: true }` makes the world log `[QA]` lines per frame: missing ground under a card, foot gap on slopes
  > 4 cm, prop floating/sinking > 3 cm (minus declared sink), camera < 0.2 m above ground, geometry < 0.6 m from the lens
  (near-plane risk), a primary character's face blocked by an opaque mesh.
- `scripts/validate-paths.mjs` scans every frame of every shot for camera jumps, snaps, roll and FOV jumps.
- `scripts/audit-props.mjs` checks prop geometry (NaN, normals facing out, bounds).
- These checks cannot see 2D drawing problems (an arm crossing a sleeve, a hat on a bun). Always look at renders.

## Known limitations
- Sitting in a long skirt seen straight on reads as standing: the skirt hides the seat. Stage seated skirted characters
  from 3/4 or the side so the seat shows (lab `props` scenario demonstrates the problem).
- Feet on steep slopes: a flat card's soles are one line; we use the mean of the two feet and report gaps > 4 cm.
- No prop-to-prop collision solver: props are placed deliberately; the QA pass checks support only.
- The halo of the glow and the cards themselves do not receive the waterfall's mist occlusion separately from depth.
