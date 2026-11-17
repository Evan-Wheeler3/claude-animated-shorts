// Who stands where in each Niagara shot and what their faces do. Placement only gives x, z for anyone standing:
// pipeline/cast.ts CardStage snaps soles and contact shadows onto the real ground. Contacts with props use ATTACHMENT
// points from the resolved prop positions (Anchors, set by world.ts after the props are rested on the ground).
import * as THREE from "three";
import { Pen, ANNIE, RIVERMAN, townsfolk, fxStars, fxRing, Expr, FrontOpts } from "../../pipeline/toon";
import { person, catCard, blob, toCard, ringGrips, lidAt, q, CAT_SU, Stage, CamInfo, Place } from "../../pipeline/cast";
import { SU, GlowLevel } from "../../pipeline/actors";
import { SHOTS, ANNIE_BANK, BARREL_HOOK } from "./story";
import { BARREL, barrelR } from "../../../videos/niagara-barrel/assets/niagara-props.js";

/** resolved world positions of props the cast touches (barrel base centres after ground resting) */
export type Anchors = { dock: THREE.Vector3; shore: THREE.Vector3; rescue: THREE.Vector3; brink: THREE.Vector3 };
/** Annie is ~1.58 m (the stout 3.5-head build at 0.95) next to the 1.37 m barrel */
export const ANNIE_SCALE = 0.95;
/** main-character glow for Annie (GLOW preset); set from inputProps in world.ts for the comparison renders */
export const CAST_GLOW: { annie: GlowLevel } = { annie: "subtle" };

export const stage = (id: number, t: number, cam: CamInfo, an: Anchors): Stage => {
  const out: Stage = { places: [], fx: [] }, s = SHOTS[id - 1];
  const A = (x: number, z: number, fo: FrontOpts, extra: Partial<Place> = {}) =>
    out.places.push(person(cam, 1, ANNIE, "annie", x, 0, z, { seed: 3, blink: lidAt(t, 1), ...fo }, ANNIE_SCALE, { name: "Annie", glow: CAST_GLOW.annie, ...extra }));
  const extra = (i: number, o: typeof RIVERMAN[0], key: string, x: number, z: number, fo: FrontOpts) => {
    out.places.push(person(cam, i, o, key, x, 0, z, { blink: lidAt(t, i), ...fo }, 1, { name: key }));
    blob(cam, out, x, z);
  };
  switch (s.key) {
    case "A_hook":
      for (let k = 0; k < 3; k++) out.fx.push({ key: `ring${q((t * 0.7 + k / 3) % 1, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q((t * 0.7 + k / 3) % 1, 30)), x: BARREL_HOOK[0], y: BARREL_HOOK[1] + 0.66, z: BARREL_HOOK[2], w: 2.6, h: 2.6, flat: true });
      break;
    case "B_annie":
      A(ANNIE_BANK[0], ANNIE_BANK[2], { mode: "stand", expr: "hopeful", pose: "point" });
      blob(cam, out, ANNIE_BANK[0], ANNIE_BANK[2], ANNIE_SCALE);
      for (const [i, dx, dz] of [[0, 1.4, 9], [3, 0.4, 14.5], [4, 1.6, -11]] as const)
        extra(20 + i, townsfolk(i), `f${i}`, ANNIE_BANK[0] + dx, ANNIE_BANK[2] + dz, { mode: "stand", expr: (["smile", "grin", "neutral"] as Expr[])[i % 3] });
      break;
    case "C_barrel": {
      const b = an.dock;
      A(b.x + 0.85, b.z - 0.3, { mode: "stand", expr: "determined", pose: "hips" });
      blob(cam, out, b.x + 0.85, b.z - 0.3, ANNIE_SCALE);
      break;
    }
    case "D_cat": {
      const b = an.shore;
      // the cat perched on the open rim: its card's rim line (y 470 of 600) sits ON the resolved barrel top
      out.places.push(catCard(cam, b.x, b.y + BARREL.H - (575 - 470) * CAT_SU, b.z + 0.06, { expr: "indignant", pose: "perch", wet: true, blink: lidAt(t, 5) > 0.5 ? 1 : 0 }, { ground: false, name: "cat" }));
      A(b.x - 0.88, b.z - 0.1, { mode: "stand", expr: "hopeful", pose: "clasp" });
      blob(cam, out, b.x - 0.88, b.z - 0.1, ANNIE_SCALE);
      extra(31, RIVERMAN[0], "rm0", b.x + 1.0, b.z - 0.45, { mode: "stand", expr: "laugh", pose: "shrug", seed: 4 });
      break;
    }
    case "E_plunge":
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + 0.3, u = (t * 0.9 + k / 6) % 1, r0 = 0.5 + 0.9 * u;
        out.fx.push({ key: `spray${k % 3}`, cw: 256, ch: 256, draw: (p) => spray(p, k % 3), soft: true,
          x: an.brink.x + Math.cos(a) * r0, y: an.brink.y - 0.75 + 0.4 * u, z: an.brink.z + Math.sin(a) * r0, w: 0.45 + 0.5 * u, h: 0.45 + 0.5 * u }); // around the barrel where it meets the sheet
      }
      break;
    case "F_rescue": {
      const b = an.rescue;
      // CONTAINMENT: Annie stands on the cushions (0.5 m up), her card in the barrel's axis plane moved 6 cm toward the
      // lens (in front of the staves it would otherwise z-fight at the rim's side points), NOT grounded.
      // ATTACHMENT: both hands target the rim's side points as seen from this camera (ringGrips -> toCard).
      const lift = 0.5, toward = cam.pos.clone().sub(b).setY(0).normalize().multiplyScalar(0.06);
      const cx = b.x + toward.x, cz = b.z + toward.z, cy = b.y + lift;
      const rim = new THREE.Vector3(b.x, b.y + BARREL.H + 0.005, b.z), [gl, gr] = ringGrips(cam.pos, rim, barrelR(BARREL.H) + 0.004);
      const hands: [[number, number], [number, number]] = [toCard(cam.pos, cx, cy, cz, ANNIE_SCALE, gl, SU), toCard(cam.pos, cx, cy, cz, ANNIE_SCALE, gr, SU)];
      A(cx, cz, { mode: "stand", expr: "dazed", pose: "grip", hands, headTilt: -6 }, { ground: false });
      out.places[out.places.length - 1].y = cy;
      const u = (t * 0.8) % 1;
      out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: cx, y: cy + 1.68, z: cz + 0.05, w: 0.7, h: 0.35 });
      extra(32, RIVERMAN[1], "rm1", b.x + 0.95, b.z - 0.7, { mode: "stand", expr: "shock", pose: "up", seed: 6 });
      extra(33, RIVERMAN[2], "rm2", b.x - 1.15, b.z - 2.0, { mode: "stand", expr: "relief", seed: 2 });
      break;
    }
    case "G_purse": {
      const b = an.rescue;
      A(b.x + 0.1, b.z + 1.25, { mode: "stand", expr: "deadpan", pose: "purse" });
      blob(cam, out, b.x + 0.1, b.z + 1.25, ANNIE_SCALE);
      break;
    }
  }
  return out;
};

/** a white spray puff (cartoon water burst, plum rim, soft-edged) on a 256 x 256 card */
const spray = (p: Pen, seed: number) => {
  const pts: [number, number, number][] = [[128, 140, 70], [80, 150, 45], [176, 150, 48], [110, 98, 40], [158, 104, 36]];
  for (const [x, y, r] of pts) p.ell(x + (seed - 1) * 8, y, r, r * 0.85, "#2a2030", 0);
  for (const [x, y, r] of pts) p.ell(x + (seed - 1) * 8, y, r - 6, r * 0.85 - 6, "#f4fbff", 0);
  p.ell(118, 120, 30, 18, "#ffffff", 0);
};
