# Hold Up sedan (toon pass)

`Car_Sedan.glb` is copied unchanged from `videos/phil-bathroom/assets/props/Car_Sedan.glb` (commit `1e99cdc`, licence "Original for Hold Up" in the phil-bathroom asset manifest). It has real glazing, a full cabin, a driver seat anchor, steering wheel, separate front bumper and four wheel nodes.

`../sedan.ts` (`loadSedan(url)`) turns it into the guardrail toon look at load time. It drops the textures, gives every material a flat matte colour from the Codex palette (body paint `#f9673e`), makes the glass light and see-through on the NOINK layer, and makes the materials double-sided because the roof and bumper caps are single-sided. It also turns the car 180° so the nose faces +Z, scales it to 4.1 m long, puts the ground at Y=0, and adds pivots at the centres of the wheels and steering wheel, since the GLB has no node transforms. The driver sits at +X (left-hand drive).

Look check: `previews/sedan-toon-look.png` (Remotion composition `GuardrailCarLook`, frames 0–3).
