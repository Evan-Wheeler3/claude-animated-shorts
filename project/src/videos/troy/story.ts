import { getInputProps } from "remotion";
// Timeline of "The Trojan Horse": shots timed to the narration word onsets (shorts/troy/voice/whisper_raw.json,
// frames at 30 fps), the sets, the beats and the cameras.
export const FPS = 30;
export const TOTAL = 1816;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const gy = (_x: number, _z: number) => 0;

// ---------------- places ----------------
// Troy: the wall runs along z = 0 (x -60..60) with the gate at x = 0; the city inside toward -z; the plain, the Greek
// camp and the beach toward +z (sea beyond z = 120)
export const GATE: V3 = [0, 0, 0];
export const HORSE0: V3 = [0, 0, 22];     // the horse on the plain (faces -z, toward the gate)
export const CAMP: V3 = [18, 0, 60];
export const BEACH: V3 = [0, 0, 112];
export const LIB: V3 = [600, 0, 0];      // a scholar's study (desk at the origin, shelves behind at z = -2.5)
export const YARD: V3 = [800, 0, 0];     // the backyard barbecue
export const HILL: V3 = [1000, 0, 0];    // the mound at Hisarlik, cut away toward +z
export const LAYERS = 9;                 // the stacked cities in the mound (Troy I at the bottom)
export const LAYER_H = 1.6;

// ---------------- beats (frames) ----------------
export const FLASH_AT = -1;
export const TRICK = 33, PROBLEM = 77, ILIAD = 112, TEN = 129, NOWHERE = 194, BUILD = 214, HIDE = 259, SAIL = 295;
export const DRAG = 351, CELEBRATE = 400, BEWARE = 449, SERPENTS = 507, CRUSH = 552, CLIMB = 586, GATES = 617, FALLS = 635;
export const EXCEPT = 653, BARELY = 730, ROMAN = 813, THOUSAND = 846, REALLY = 899, GROW = 980, BIGGER = 1044;
export const RAM = 1123, HIDES = 1162, QUAKE = 1205, POSEIDON = 1232, SHAKEN = 1345, REAL = 1384, SCHLIE = 1468, TURKEY = 1491;
export const TRENCH = 1527, SMASH = 1603, WAR = 1667, GREEKS = 1686, IN3 = 1766;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; name: string };
const S = (id: number, a: number, b: number, name: string, light: Light = "day", sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, name, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 90, "hook", "golden", 30, 10), S(2, 90, 126, "scroll", "day", 150, 50), S(3, 126, 208, "siege", "day", 120, 40),
  S(4, 208, 290, "build", "day", 120, 40), S(5, 290, 337, "sail", "golden", -30, 10), S(6, 337, 414, "drag", "day", 120, 40),
  S(7, 414, 494, "priest", "day", 120, 40), S(8, 494, 568, "serpents", "day", 100, 30), S(9, 568, 653, "night", "golden", 160, 3),
  S(10, 653, 778, "iliad", "day", 150, 50), S(11, 778, 886, "roman", "day", 150, 50), S(12, 886, 920, "really", "golden", 30, 10),
  S(13, 920, 1086, "uncle", "day", 140, 45), S(14, 1086, 1187, "ram", "day", 120, 40), S(15, 1187, 1302, "quake", "day", 120, 40),
  S(16, 1302, 1365, "layer", "day", 130, 45), S(17, 1365, 1504, "dig", "day", 130, 45), S(18, 1504, 1681, "trench", "day", 130, 45),
  S(19, 1681, TOTAL, "payoff", "golden", 30, 12),
];
export const XFADE: Record<number, number> = { 2: 6, 3: 6, 5: 8, 9: 8, 10: 8, 12: 6, 13: 8, 16: 8, 19: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** where the horse is: on the plain, rolled through the gate, inside the walls */
export const horseAt = (id: number, f: number): V3 => {
  if (id === 6) { const u = smooth((f - 345) / 60); return [0, 0, 22 - 30 * u]; }
  if (id === 9 || id === 12) return [0, 0, -10];
  return HORSE0;
};
/** the gate leaves: 0 shut .. 1 open */
export const gateAt = (id: number, f: number) => (id === 6 ? smooth((f - 338) / 14) : id === 9 ? smooth((f - GATES) / 12) : id === 14 ? 0 : 0);
/** how deep the trench is (0..1), and how wrecked the war layers are */
export const trenchAt = (id: number, f: number) => (id === 18 ? smooth((f - TRENCH) / 70) : id === 19 ? 1 : 0);
export const shakeAt = (id: number, f: number) => (id === 15 && f >= QUAKE ? Math.sin(f * 2.1) * 0.25 * Math.exp(-(f - QUAKE) / 40) : 0);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
/** point dx, dy, dz away from a ground anchor */
const o = (p: V3, dx: number, dy: number, dz: number): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];

const P = (b: V3, dx: number, dy: number, dz: number): V3 => [b[0] + dx, b[1] + dy, b[2] + dz];
const H = HORSE0;
const F: Record<string, (f: number) => Shot> = {
  hook1: (f) => { const a = 0.9 - 0.006 * f; return { pos: [22 * Math.sin(a), 4 + 0.03 * f, 22 + 22 * Math.cos(a)], look: [0, 7, 22], fov: 44 }; },
  scroll: (f) => ({ pos: P(LIB, 0.05, 1.55, 1.3), look: P(LIB, 0, 0.98, 0), fov: 38 }),
  siege1: (f) => ({ pos: [30 - 0.05 * (f - 126), 9, 70], look: [0, 6, 0], fov: 46 }),
  siege2: (f) => ({ pos: P(CAMP, 1.0, 1.7, 5.4), look: P(CAMP, 0.4, 1.6, 0), fov: 42 }),
  build1: (f) => ({ pos: [9, 3.2, 34], look: [0, 4, 22], fov: 46 }),
  build2: (f) => ({ pos: [5.2, 6.2, 27], look: [0.6, 5.0, 23], fov: 40 }),
  sail: (f) => ({ pos: [30, 8, 96], look: [0, 3, 126 + 0.25 * (f - 290)], fov: 44 }),
  drag1: (f) => ({ pos: [12, 9, 44 - 0.2 * (f - 337)], look: [0, 5, 12 - 0.3 * (f - 337)], fov: 46 }),
  priest: (f) => ({ pos: [2.6, 1.7, 12.6], look: [2.2, 1.7, 8], fov: 40 }),
  priest2: (f) => ({ pos: [2.6, 1.8, 12.0], look: [2.2, 1.8, 8], fov: 38 }),
  serp: (f) => ({ pos: [5, 2.2, 14.5], look: [2.2, 3.0, 8], fov: 50, roll: -0.04 }),
  night1: (f) => ({ pos: [16, 6, -2.5], look: [2, 5.2, -10], fov: 46 }),
  night2: (f) => ({ pos: [0, 6, 26], look: [0, 6, 0], fov: 46 }),
  iliad1: (f) => ({ pos: P(LIB, 0.05, 1.55, 1.3), look: P(LIB, 0, 0.98, 0), fov: 38 }),
  iliad2: (f) => ({ pos: P(LIB, 1.2, 1.6, 2.6), look: P(LIB, 0.6, 1.4, -0.6), fov: 42 }),
  roman1: (f) => ({ pos: P(LIB, -2.4, 1.6, 2.4), look: P(LIB, -2.6, 1.5, -0.6), fov: 40 }),
  roman2: (f) => ({ pos: P(LIB, -2.5, 1.7, 1.6), look: P(LIB, -2.6, 1.7, -0.6), fov: 34 }),
  really: (f) => ({ pos: [15, 3.5, -3], look: [0, 8, -10], fov: 50, roll: 0.04 }),
  uncle1: (f) => ({ pos: P(YARD, 0.4, 1.7, 5.6), look: P(YARD, 0, 1.6, 0), fov: 44 }),
  uncle2: (f) => ({ pos: P(YARD, 0.2, 1.8, 3.8), look: P(YARD, 0, 1.9, 0), fov: 40 }),
  ram: (f) => ({ pos: [14, 5, 18], look: [0, 3, 4], fov: 44 }),
  quake1: (f) => ({ pos: [26, 14, 40], look: [0, 6, -6], fov: 46 }),
  quake2: (f) => ({ pos: [6, 2.0, 12], look: [3, 2.6, 6], fov: 42 }),
  layer: (f) => ({ pos: P(HILL, 0, 7.5, 26), look: P(HILL, 0, 7, 0), fov: 46 }),
  dig1: (f) => ({ pos: P(HILL, 20, 14, 46), look: P(HILL, 0, 8, 0), fov: 46 }),
  dig2: (f) => ({ pos: P(HILL, 3.0, 16.3, 8.0), look: P(HILL, 1.4, 16.0, 3.0), fov: 40 }),
  trench1: (f) => ({ pos: P(HILL, 0, 8, 30), look: P(HILL, 0, 7, 0), fov: 46 }),
  trench2: (f) => ({ pos: P(HILL, 0.8, 10, 30), look: P(HILL, 0.8, 9.0, 0), fov: 44, roll: 0.03 }),
  pay1: (f) => ({ pos: P(HILL, 1.0, 17.2, 9.0), look: P(HILL, 0.2, 16.6, 3.2), fov: 42 }),
  pay2: (f) => ({ pos: P(HILL, 0.6, 16.8, 8.2), look: P(HILL, 0.4, 16.0, 3.2), fov: 36 }),
};
const one = (a: number, k: string): Key[] => [{ f: a, s: F[k] }];
const CAMS: Record<number, Key[]> = {
  1: one(0, "hook1"), 2: one(90, "scroll"), 3: [{ f: 126, s: F.siege1 }, { f: 168, dur: 30, s: F.siege2 }],
  4: [{ f: 208, s: F.build1 }, { f: 250, dur: 26, s: F.build2 }], 5: one(290, "sail"), 6: one(337, "drag1"),
  7: [{ f: 414, s: F.priest }, { f: 444, dur: 20, s: F.priest2 }], 8: one(494, "serp"),
  9: [{ f: 568, s: F.night1 }, { f: 612, cut: true, s: F.night2 }],
  10: [{ f: 653, s: F.iliad1 }, { f: 716, dur: 26, s: F.iliad2 }], 11: [{ f: 778, s: F.roman1 }, { f: 836, dur: 24, s: F.roman2 }],
  12: one(886, "really"), 13: [{ f: 920, s: F.uncle1 }, { f: 1030, dur: 28, s: F.uncle2 }], 14: one(1086, "ram"),
  15: [{ f: 1187, s: F.quake1 }, { f: 1258, dur: 28, s: F.quake2 }], 16: one(1302, "layer"),
  17: [{ f: 1365, s: F.dig1 }, { f: 1440, dur: 34, s: F.dig2 }], 18: [{ f: 1504, s: F.trench1 }, { f: 1610, dur: 34, s: F.trench2 }],
  19: [{ f: 1681, s: F.pay1 }, { f: 1740, dur: 26, s: F.pay2 }],
};

/** punch zooms on the key words: [frame, amount, frames] */
const ZOOMS: [number, number, number][] = [
  [TRICK, 0.08, 12], [PROBLEM, 0.08, 10], [ILIAD, 0.12, 8], [TEN, 0.06, 12], [NOWHERE, 0.08, 10], [HIDE, 0.08, 12], [CELEBRATE, 0.06, 12],
  [BEWARE, 0.1, 10], [CRUSH, 0.12, 8], [FALLS, 0.1, 10], [BARELY, 0.08, 12], [THOUSAND, 0.08, 10], [REALLY, 0.12, 8], [BIGGER, 0.1, 10],
  [HIDES, 0.06, 12], [POSEIDON, 0.08, 12], [SHAKEN, 0.1, 10], [TURKEY, 0.06, 12], [SMASH, 0.1, 10], [WAR, 0.08, 10], [IN3, 0.14, 8],
];

// impact kicks: [frame, gain]
const KICKS: [number, number][] = [[ILIAD, 0.6], [BUILD, 0.4], [BUILD + 8, 0.4], [BUILD + 16, 0.4], [CRUSH, 1.2], [FALLS, 1.2], [RAM, 0.9], [RAM + 14, 0.9],
  [QUAKE, 1.4], [QUAKE + 6, 1.0], [SHAKEN, 0.8], [SMASH, 1.2], [SMASH + 10, 0.8], [IN3, 0.8]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
/** punch zooms (engine upgrade): [frame, amount, frames]: the lens narrows smoothly by `amount` (0.12 = 12 % tighter)
 *  over `frames`, and stays there until the shot ends. Several per shot keep the picture alive between moves. */
export const zoomAt = (id: number, f: number) => {
  const s = SHOTS[id - 1];
  let k = 1;
  for (const [f0, amt, d] of ZOOMS) if (f0 >= s.a && f0 < s.b && f >= f0) k *= 1 - amt * glide((f - f0) / d);
  return k;
};
export const camAt = (id: number, f: number): Cam => {
  const dbg = (getInputProps() as { cam?: Cam }).cam; // model checks: inputProps { cam: { pos, look, fov, roll } }
  if (dbg) return dbg;
  const c0 = run(CAMS[id], f), z = zoomAt(id, f);
  const c = z === 1 ? c0 : { ...c0, fov: (360 / Math.PI) * Math.atan(Math.tan((c0.fov * Math.PI) / 360) * z) };
  const a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 3 }, { f: 90, cInf: 9 }, { f: 126, cInf: 0 }, { f: 168, dur: 30, cInf: 9 }, { f: 208, cInf: 4 }, { f: 290, cInf: 0 },
  { f: 414, cInf: 10 }, { f: 494, cInf: 4 }, { f: 568, cInf: 3 }, { f: 653, cInf: 9 }, { f: 886, cInf: 2 }, { f: 920, cInf: 10 },
  { f: 1086, cInf: 3 }, { f: 1187, cInf: 0 }, { f: 1258, dur: 28, cInf: 8 }, { f: 1302, cInf: 0 }, { f: 1440, dur: 34, cInf: 8 },
  { f: 1504, cInf: 0 }, { f: 1681, cInf: 9 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
