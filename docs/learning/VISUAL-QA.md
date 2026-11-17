# Visual QA checklist (accept / reject criteria)

Run in this order. "Tool" = automated check; "Look" = must be judged on a rendered image at phone size (1080 x 1920
viewed at ~40 %). A shot is accepted only when every applicable line passes.

## 0. Tools first
| Check | Command | Pass when |
|---|---|---|
| Prop geometry | `node scripts/audit-props.mjs` | "all props pass" |
| Types | `npx tsc --noEmit` | no output |
| Camera paths | `node scripts/validate-paths.mjs` | every shot ok (step <= 0.6 m/f, turn <= 4 deg/f, roll <= 8 deg) |
| Per-frame scene QA | `PROPS='{"qa":true}' node scripts/niagara-stills.mjs out/x all 0.5` | every `[QA]` line says `clean`, or each listed item is explained in the shot notes |
| Regression vs approved renders | `python3 scripts/compare_renders.py <approved_dir> <new_dir>` | "regression clean" (mean |diff| <= 1.5/255), or every DIFF inspected and explained |
| Character lab | `PROPS='{"qa":true}' node scripts/lab-stills.mjs out/lab/x all 0.5` | renders, QA clean except the known slope-gap demo |

## 1. Character anatomy (Look)
- Arm lengths look equal on both sides and across poses; elbows bend outward, never backward.
- Every arm emerges from a sleeve head or shoulder seam; no arm line is drawn across a sleeve, blouse or collar.
- Hands sit at the wrist end, never floating beside the arm; contact hands touch their object (rim, post, purse).
- Shoulders stay at the same height in every pose of the same character.

## 2. Clothing
- Skirt top = torso width at the waist (no blouse bulging out of it), waistband wraps (curved) and ends on the skirt edge.
- Trousers rise under the coat; legs never start from mid-air below the hem.
- No outline cuts through a garment except its own seams.

## 3. Hats and hair
- Brim front overlaps the forehead/hairline; crown base follows the head; no sky between hat and head.
- Hair shows under the brim where the design has hair; the hat turns with the head on tilted poses.

## 4. Main-character glow
- Visible only as a faint lift around the primary character on a mid-grey background; nobody notices "a glow" at phone size.
- Ink outline stays crisp (no halo over the line), eyes and mouth unchanged, secondaries have none.

## 5. Ground contact
- QA: no "no ground", no "foot gap" (unless on a deliberate slope), no prop floats/sinks > 3 cm.
- Look: contact shadow touches the soles; no light gap under a barrel/boat; nothing pokes through a deck or beach.

## 6. Object interaction and containment
- A character inside a container is hidden by the near wall below the rim and visible above it; no z-fighting flicker.
- A held object moves with the hand; a seat contacts the hips.

## 7. Collision and clipping
- QA: no near-plane risk, no blocked primary face, camera above ground.
- Look: no prop inside a cliff/bank, no barrel hovering over or behind a water sheet, no foreground blob at the frame edge.

## 8. Movement continuity (motion tests, low-res MP4)
- Objects accelerate/decelerate plausibly (falls speed up, rolls slow on the flat), rotate about their centre, never pop.
- Feet stay planted on terrain while walking; shadows follow.
- Camera: no unmotivated drift; cuts only on big reframes; validate-paths clean.

## 9. Camera framing
- Subject inside the 9:16 safe area (5 % margin), all named characters fully in frame unless a deliberate crop.
- Each shot has a distinct size/angle from its neighbours.

## 10. Lighting consistency
- Same light preset across a continuous scene; sun direction consistent within a shot; no character lit differently
  from the ground under it.

## 11. Render quality
- No NaN black pixels, no white frames, no shimmering ink on far geometry, no banding in sky/mist.
- `scripts/short_qa.py` on the final MP4: no black/white/frozen/pop frames, loudness in range.

## 12. Final animation quality
- Every sentence has a readable visual; punchlines land within 0-3 frames before their word.
- Muted watch at phone size: a stranger can follow the physical action.
