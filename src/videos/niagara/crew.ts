// Who stands where in each Niagara shot, and what their faces do. Same contract as the bridge's cast.stage():
// a list of character placements (lit cards) and effect cards for world.ts to draw.
import * as THREE from "three";
import { Pen, bodyFront, cat, ANNIE, RIVERMAN, townsfolk, fxStars, fxContact, fxShadow, fxRing, Outfit, Expr, FrontOpts, CatOpts } from "./toon";
import { FPS, SHOTS, ANNIE_BANK, BARREL_AT_DOCK, BARREL_SHORE, BARREL_RESCUE, BARREL_HOOK, BARREL_BRINK, DOCK_Y, LAND_Y, SHORE, POOL_Y, clamp01 } from "./story";
import { BARREL } from "../../../videos/niagara-barrel/assets/niagara-props.js";

export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "cat"; size: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type Stage = { places: Place[]; fx: FxPlace[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3; light: "day" | "golden" };

const q = (v: number, n = 120) => Math.round(v * n) / n;
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const tierCat = (d: number): [number, number, number] => (d < 4 ? [1200, 1200, 2.0] : d < 9 ? [600, 600, 1.0] : [300, 300, 0.5]);
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps */
const light2D = (cam: CamInfo, mirror = false) => {
  const sx = cam.sun.dot(cam.right) * (mirror ? -1 : 1), sy = -cam.sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

/** one person card in the 600 x 1000 design space, scaled and lit from the scene's sun */
const person = (cam: CamInfo, i: number, o: Outfit, okey: string, x: number, y: number, z: number, fo: FrontOpts, scale = 1, mirror = false): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 1.2 * scale, z)) / scale, [w, h, k] = tier(d);
  const f2: FrontOpts = { ...fo, light: light2D(cam, mirror), seed: fo.seed ?? (i % 7) + 1 };
  return { key: `F|${okey}|${fkey(f2)}`, x, y, z, scale, mirror, size: [w, h, k], draw: (p) => bodyFront(p, o, f2) };
};
const catCard = (cam: CamInfo, x: number, y: number, z: number, o: CatOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 0.3, z)), [w, h, k] = tierCat(d);
  const o2 = { ...o, light: light2D(cam) };
  return { key: `C|${fkey(o2)}`, x, y, z, scale, geo: "cat", size: [w, h, k], draw: (p) => cat(p, o2) };
};

// contact shadows (bridge review rounds 2-4): a tight multiply pool under the feet + a soft day tail away from the sun
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (cam: CamInfo, out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const S = cam.sun, hl = Math.hypot(S.x, S.z) || 1, ox = -S.x / hl, oz = -S.z / hl, rot = Math.atan2(-ox, -oz);
  const el = Math.asin(Math.min(0.99, Math.max(0.1, S.y)));
  const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h, tc = hexOf(TAIL, k);
  out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  const cc = hexOf(CONTACT[cam.light], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
const ring = (out: Stage, x: number, y: number, z: number, u: number, size: number) =>
  out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x, y, z, w: size, h: size, flat: true });

/** Annie is ~1.58 m (the stout 3.5-head build at 0.95) next to the 1.37 m barrel */
export const ANNIE_SCALE = 0.95;

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, s = SHOTS[id - 1];
  const A = (x: number, y: number, z: number, fo: FrontOpts, mirror = false) => out.places.push(person(cam, 1, ANNIE, "annie", x, y, z, { seed: 3, blink: lidAt(t, 1), ...fo }, ANNIE_SCALE, mirror));
  switch (s.key) {
    case "A_hook": {
      // white water breaking round the barrel as it rides the current
      for (let k = 0; k < 3; k++) ring(out, BARREL_HOOK[0], BARREL_HOOK[1] + 0.66, BARREL_HOOK[2], (t * 0.7 + k / 3) % 1, 2.6);
      break;
    }
    case "B_annie": {
      A(ANNIE_BANK[0], ANNIE_BANK[1], ANNIE_BANK[2], { mode: "stand", expr: "hopeful", pose: "point", facing: 0 });
      blob(cam, out, ANNIE_BANK[0], ANNIE_BANK[1], ANNIE_BANK[2], ANNIE_SCALE);
      // a few 1901 sightseers further along the railing
      for (const [i, dx, dz] of [[0, 1.4, 9], [3, 0.4, 14.5], [4, 1.6, -11]] as const) {
        const x = ANNIE_BANK[0] + dx, z = ANNIE_BANK[2] + dz;
        out.places.push(person(cam, 20 + i, townsfolk(i), `f${i}`, x, LAND_Y, z, { mode: "stand", expr: (["smile", "grin", "neutral"] as Expr[])[i % 3], blink: lidAt(t, 20 + i) }));
        blob(cam, out, x, LAND_Y, z);
      }
      break;
    }
    case "C_barrel": {
      const [bx, by, bz] = BARREL_AT_DOCK;
      A(bx + 0.85, DOCK_Y, bz - 0.3, { mode: "stand", expr: "determined", pose: "hips" });
      blob(cam, out, bx + 0.85, DOCK_Y, bz - 0.3, ANNIE_SCALE);
      void by;
      break;
    }
    case "D_cat": {
      const [bx, by, bz] = BARREL_SHORE;
      // the cat perched on the open rim: its card's rim line (y 470 of 600) sits on the barrel top
      out.places.push(catCard(cam, bx, by + BARREL.H - (575 - 470) * CAT_SU, bz + 0.06, { expr: "indignant", pose: "perch", wet: true, blink: lidAt(t, 5) > 0.5 ? 1 : 0 }));
      A(bx - 0.88, by, bz - 0.1, { mode: "stand", expr: "hopeful", pose: "clasp" });
      blob(cam, out, bx - 0.88, by, bz - 0.1, ANNIE_SCALE);
      out.places.push(person(cam, 31, RIVERMAN[0], "rm0", bx + 1.0, by, bz - 0.45, { mode: "stand", expr: "laugh", pose: "shrug", blink: lidAt(t, 31), seed: 4 }));
      blob(cam, out, bx + 1.0, by, bz - 0.45);
      break;
    }
    case "E_plunge": {
      // spray kicked off the barrel as it tips over the brink
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + 0.3, u = (t * 0.9 + k / 6) % 1, r0 = 0.5 + 0.9 * u;
        out.fx.push({ key: `spray${k % 3}`, cw: 256, ch: 256, draw: (p) => spray(p, k % 3), soft: true,
          x: BARREL_BRINK[0] + Math.cos(a) * r0, y: BARREL_BRINK[1] - 0.6 + 0.4 * u, z: BARREL_BRINK[2] + Math.sin(a) * r0, w: 0.45 + 0.5 * u, h: 0.45 + 0.5 * u });
      }
      break;
    }
    case "F_rescue": {
      const [bx, by, bz] = BARREL_RESCUE;
      // Annie standing on the cushions inside the barrel: chin ~0.3 m above the rim; hands grip the rim
      const lift = 0.5, rimY = 975 - (BARREL.H - lift) / (0.00216 * ANNIE_SCALE);
      A(bx, by + lift, bz, { mode: "stand", expr: "dazed", pose: "grip", gripY: rimY, headTilt: -6 });
      const u = (t * 0.8) % 1;
      out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: bx, y: by + lift + 1.68, z: bz + 0.05, w: 0.7, h: 0.35 });
      out.places.push(person(cam, 32, RIVERMAN[1], "rm1", bx + 0.95, by, bz - 0.7, { mode: "stand", expr: "shock", pose: "up", blink: lidAt(t, 32), seed: 6 }));
      blob(cam, out, bx + 0.95, by, bz - 0.7);
      out.places.push(person(cam, 33, RIVERMAN[2], "rm2", bx - 1.15, by, bz - 2.0, { mode: "stand", expr: "relief", blink: lidAt(t, 33), seed: 2 }));
      blob(cam, out, bx - 1.15, by, bz - 2.0);
      break;
    }
    case "G_purse": {
      const [bx, by, bz] = BARREL_RESCUE;
      A(bx + 0.1, by, bz + 1.25, { mode: "stand", expr: "deadpan", pose: "purse" });
      blob(cam, out, bx + 0.1, by, bz + 1.25, ANNIE_SCALE);
      break;
    }
  }
  void POOL_Y; void SHORE;
  return out;
};
/** cat card: 600 x 600 design units -> ~0.57 m card (a ~0.42 m cat sitting) */
export const CAT_SU = 0.00095;

/** a white spray puff (cartoon water burst, plum rim, soft-edged) on a 256 x 256 card */
const spray = (p: Pen, seed: number) => {
  const pts: [number, number, number][] = [[128, 140, 70], [80, 150, 45], [176, 150, 48], [110, 98, 40], [158, 104, 36]];
  for (const [x, y, r] of pts) p.ell(x + (seed - 1) * 8, y, r, r * 0.85, "#2a2030", 0);
  for (const [x, y, r] of pts) p.ell(x + (seed - 1) * 8, y, r - 6, r * 0.85 - 6, "#f4fbff", 0);
  p.ell(118, 120, 30, 18, "#ffffff", 0);
};
