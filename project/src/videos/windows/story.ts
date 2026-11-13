import { getInputProps } from "remotion";
// Timeline of "Why Plane Windows Are Round": shots timed to the narration word onsets
// (shorts/windows/voice/whisper_raw.json, frames at 30 fps), the sets, the beats and the cameras.
// Engine upgrade (2026-11-13): more frequent smooth punch zooms (ZOOMS) and in-world glides between framings
// instead of cuts wherever the set allows.
export const FPS = 30;
export const TOTAL = 1986;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const gy = (_x: number, _z: number) => 0;

// ---------------- places ----------------
export const SKY: V3 = [0, 300, 0];      // the cruising Comet (nose toward +x)
export const TARMAC: V3 = [200, 0, 0];   // the parked Comet (nose toward +x), terminal behind (z = -30)
export const NEWS: V3 = [214, 0, 14];    // the newsstand
export const HANGAR: V3 = [400, 0, 0];   // the water tank (fuselage along x)
export const PANEL: V3 = [600, 0, 0];    // the explainer wall (faces +z), window centre at y = 3
export const STREAM: V3 = [600, 0, 40];
export const DESK: V3 = [600, 0, 80];
export const MODERN: V3 = [800, 0, 0];
export const CABIN: V3 = [1000, 0, 0];   // modern cabin, window wall at z = -1.6, seats face +x

// the fuselage (world.ts builds it from these): a tube of radius FR from x = -12 to 12 around the plane origin,
// windows on the texture at v 0.355..0.4 of the circumference from the belly (fxp.ts WIN_*)
export const FR = 1.6;
const WA = 2 * Math.PI * (0.355 + 0.0225);
/** centre of window i (0..21) on the +z side, relative to the plane origin */
export const winRel = (i: number): V3 => [-12 + 24 * (356 / 2048 + i * (64 / 2048) + 20 / 2048), -Math.cos(WA) * FR, Math.sin(WA) * FR];
export const PLANE_SKY: V3 = SKY, PLANE_TAR: V3 = [TARMAC[0], 2.6, TARMAC[2]], PLANE_TANK: V3 = [HANGAR[0], 2.0, HANGAR[2]], PLANE_MOD: V3 = [MODERN[0], 2.9, MODERN[2]];
export const WIN_SKY = 16, WIN_TANK = 11, WIN_MOD = 14;
/** the cruising plane's gentle bob and roll (world.ts poses the plane with it, cast.ts pins window cards to it) */
export const skyPose = (name: string, f: number) => ({
  bob: 0.25 * Math.sin(f / 26),
  roll: 0.04 * Math.sin(f / 33) + (name === "break" ? 0.06 * Math.sin((f - 111) * 0.9) * Math.exp(-(f - 111) / 30) : 0),
  yaw: 0.02 * Math.sin(f / 41),
});
/** a point given relative to the cruising plane, moved with its bob and roll */
export const onSkyPlane = (name: string, f: number, r: V3, dx = 0, dy = 0, dz = 0): V3 => {
  const { bob, roll } = skyPose(name, f), y = r[1] + dy, z = r[2] + dz, c = Math.cos(roll), sn = Math.sin(roll);
  return [SKY[0] + r[0] + dx, SKY[1] + bob + y * c - z * sn, SKY[2] + y * sn + z * c];
};

// ---------------- beats (frames) ----------------
export const FLASH_AT = -1;
export const CRACK1 = 111, CRACK2 = 122, WINDOWS = 193, FAST = 304, QUIET = 319, SQUARE = 357, TWO = 423;
export const LOWER = 565, PUMP = 622, FLIGHTS0 = 682, FLIGHTS1 = 745, SPLIT = 778, CORNER = 818, WHY = 851;
export const BREATHE = 946, SWELL = 1047, SHRINK = 1124, LAND = 1158, FLOW = 1202, ROCK = 1270, ROUND = 1322, SQ = 1411, SHARP = 1459;
export const EVERY = 1501, CLIP = 1561, NOTFIRST = 1620, SNAP = 1682, TODAY = 1763, HOLE = 1809, DING = 1840, ATTEND = 1887, STOP = 1896;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; name: string };
const S = (id: number, a: number, b: number, name: string, light: Light = "day", sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, name, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 104, "cruise", "day", 110, 40), S(2, 104, 167, "break", "day", 110, 40), S(3, 167, 215, "windows", "day", 110, 40),
  S(4, 215, 300, "tarmac", "day", 130, 42), S(5, 300, 319, "fast", "day", 110, 40), S(6, 319, 387, "quiet", "day", 120, 35),
  S(7, 387, 475, "news", "day", 140, 45), S(8, 475, 600, "tank", "day", 160, 70), S(9, 600, 749, "pump", "day", 160, 70),
  S(10, 749, 849, "crack", "day", 160, 70), S(11, 849, 880, "why", "day", 160, 70),
  S(12, 880, 970, "thin", "day", 110, 40), S(13, 970, 1115, "swell", "day", 110, 40), S(14, 1115, 1175, "land", "golden", -40, 12),
  S(15, 1175, 1265, "flow", "day", 150, 50), S(16, 1265, 1319, "rock", "day", 120, 45), S(17, 1319, 1405, "round", "day", 150, 50),
  S(18, 1405, 1487, "square", "day", 150, 50), S(19, 1487, 1544, "every", "day", 150, 50), S(20, 1544, 1715, "clip", "day", 150, 50),
  S(21, 1715, 1795, "modern", "day", 130, 42), S(22, 1795, 1887, "hole", "golden", 160, 55), S(23, 1887, TOTAL, "attend", "golden", 160, 55),
];
export const XFADE: Record<number, number> = { 4: 8, 12: 8, 15: 8, 21: 8, 22: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** how far the cabin is pumped up: 0 .. 1 (shot 13 swells, shot 14 shrinks on landing) */
export const swellAt = (id: number, f: number) => (id === 13 ? smooth((f - SWELL) / 40) : id === 14 ? 1 - smooth((f - SHRINK) / 30) : 0);
/** the tank test: pressure pulses (0..1) and the flight counter */
export const pulseAt = (f: number) => (f < PUMP ? 0 : 0.5 - 0.5 * Math.cos(((f - PUMP) / (f < FLIGHTS0 ? 16 : 5)) * Math.PI * 2));
export const flightsAt = (f: number) => (f < PUMP ? 0 : f < FLIGHTS0 ? Math.floor((f - PUMP) / 16) : Math.min(3000, 4 + Math.floor(((f - FLIGHTS0) / (FLIGHTS1 - FLIGHTS0)) ** 2 * 3000)));
/** crack growth 0..1 */
export const crackAt = (f: number) => smooth((f - SPLIT) / (CORNER + 12 - SPLIT));

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
const SK = SKY, T = TARMAC, H = HANGAR, W = PANEL, C = CABIN;
const wS = winRel(WIN_SKY), wT = winRel(WIN_TANK), wM = winRel(WIN_MOD);
const add = (a: V3, b: V3, dx = 0, dy = 0, dz = 0): V3 => [a[0] + b[0] + dx, a[1] + b[1] + dy, a[2] + b[2] + dz];
const F: Record<string, (f: number) => Shot> = {
  // the cruise: orbiting slowly from the front quarter round to the side
  cruise1: (f) => ({ pos: P(SK, 34 - 0.06 * f, 6 + 0.02 * f, 26 - 0.05 * f), look: P(SK, 2, 0.5, 0), fov: 44 }),
  cruise2: (f) => ({ pos: P(SK, 14, 3, 21), look: P(SK, 0, 0.8, 0), fov: 34 }),
  brk: (f) => ({ pos: P(SK, 8 - 0.02 * (f - 104), 2.2, 11), look: P(SK, 1.5, 1.2, 0), fov: 32 }),
  win1: (f) => ({ pos: add(SK, wS, 0.6, 0.4, 4.6), look: add(SK, wS), fov: 32 }),
  win2: (f) => ({ pos: add(SK, wS, 0.05, 0.4, 2.6), look: add(SK, wS), fov: 30 }),
  tar1: (f) => ({ pos: P(T, 26, 14 - 0.06 * (f - 215), 30), look: P(T, 0, 2.5, 0), fov: 40 }),
  tar2: (f) => ({ pos: P(T, 9, 1.7, 12), look: P(T, 2, 2.2, 1), fov: 44 }),
  fast: (f) => ({ pos: P(SK, 6, 1.5, 9), look: P(SK, 6 - 0.9 * (f - 300), 1.0, 0), fov: 50, roll: -0.05 }),
  quiet: (f) => ({ pos: add(SK, wS, -1.5, 1.3, 1.25), look: add(SK, wS, -1.5, 0, 0), fov: 34 }),
  quiet2: (f) => ({ pos: add(SK, wS, 0.5, 2.4, 3.2), look: add(SK, wS, -2.0, 0, 0), fov: 40, roll: 0.03 }),
  news: (f) => ({ pos: P(NEWS, 0.4, 1.5, 3.6), look: P(NEWS, 0, 1.45, 0), fov: 42 }),
  tank1: (f) => ({ pos: P(H, -4, 7 - 0.02 * (f - 475), 26), look: P(H, 0, 3.5, 0), fov: 46 }),
  tank2: (f) => ({ pos: P(H, 3, 4.2, 14), look: P(H, 0, 2.6, 0), fov: 44 }),
  pump1: (f) => ({ pos: P(H, -9.5, 1.8, 9.6), look: P(H, -9.6, 1.9, 6.6), fov: 40 }),
  pump2: (f) => ({ pos: P(H, -11, 2.4, 11.2), look: P(H, -12.2, 3.0, 7.4), fov: 42 }),
  crack1: (f) => ({ pos: add(PLANE_TANK, wT, 0.1, 0.1, 3.1), look: add(PLANE_TANK, wT), fov: 34 }),
  crack2: (f) => ({ pos: add(PLANE_TANK, wT, 0.3, 0.5, 1.9), look: add(PLANE_TANK, wT, 0.3, 0.12, 0), fov: 30 }),
  why: (f) => ({ pos: P(H, 3.0, 1.7, 7.4), look: P(H, 3.1, 1.75, 4.5), fov: 38, roll: -0.03 }),
  thin: (f) => ({ pos: add(SK, wS, 0.6, 1.5, 3.6), look: add(SK, wS, -0.4, 0.6, 0.6), fov: 40 }),
  swell1: (f) => ({ pos: P(SK, 0, 3, 30), look: P(SK, 0, 0.6, 0), fov: 40 }),
  swell2: (f) => ({ pos: P(SK, 4, 9, 26), look: P(SK, 0, 0.6, 0), fov: 42 }),
  land: (f) => ({ pos: P(T, 40, 2.2, 26), look: P(T, 26 - 0.35 * (f - 1115), 2.4, 0), fov: 40 }),
  flow1: (f) => ({ pos: P(W, 0, 3.0, 9), look: P(W, 0, 3.0, 0), fov: 44 }),
  flow2: (f) => ({ pos: P(W, 0.8, 3.0, 6.4), look: P(W, 0, 3.0, 0), fov: 40 }),
  rock: (f) => ({ pos: P(STREAM, 0.6, 6.0, 5.6), look: P(STREAM, 0, 0.0, 0), fov: 46 }),
  round: (f) => ({ pos: P(W, -4.5, 3.0, 6.6), look: P(W, -4.5, 3.0, 0), fov: 40 }),
  square: (f) => ({ pos: P(W, 4.5, 3.0, 6.6), look: P(W, 4.5, 3.0, 0), fov: 40 }),
  sqCorner: (f) => ({ pos: P(W, 5.4, 3.8, 4.6), look: P(W, 5.0, 3.6, 0), fov: 38, roll: 0.04 }),
  every: (f) => ({ pos: P(W, 4.5, 3.0, 5.0), look: P(W, 4.5, 3.0, 0), fov: 40 }),
  clip: (f) => ({ pos: P(DESK, 0, 1.55, 3.0), look: P(DESK, 0, 1.25, 0), fov: 40 }),
  modern1: (f) => ({ pos: P(MODERN, 30 - 0.06 * (f - 1715), 6, 34), look: P(MODERN, 0, 3, 0), fov: 40 }),
  modern2: (f) => ({ pos: add(PLANE_MOD, wM, 0.05, 0.05, 2.6), look: add(PLANE_MOD, wM), fov: 30 }),
  hole1: (f) => ({ pos: P(C, 0.7, 1.35, -0.2), look: P(C, -0.45, 1.15, -1.05), fov: 50 }),
  hole2: (f) => ({ pos: P(C, 0.05, 1.22, -0.72), look: P(C, 0.05, 1.18, -1.58), fov: 34 }),
  att: (f) => ({ pos: P(C, 2.4, 1.5, -0.55), look: P(C, -0.35, 1.3, -0.55), fov: 50 }),
  att2: (f) => ({ pos: P(C, 2.0, 1.5, -0.55), look: P(C, -0.35, 1.4, -0.55), fov: 46 }),
};
const one = (a: number, k: string): Key[] => [{ f: a, s: F[k] }];
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: F.cruise1 }, { f: 62, dur: 36, s: F.cruise2 }],
  2: one(104, "brk"), 3: [{ f: 167, s: F.win1 }, { f: 182, dur: 24, s: F.win2 }],
  4: [{ f: 215, s: F.tar1 }, { f: 252, dur: 34, s: F.tar2 }], 5: one(300, "fast"),
  6: [{ f: 319, s: F.quiet }, { f: 334, dur: 30, s: F.quiet2 }], 7: one(387, "news"),
  8: [{ f: 475, s: F.tank1 }, { f: 548, dur: 34, s: F.tank2 }], 9: [{ f: 600, s: F.pump1 }, { f: 676, dur: 28, s: F.pump2 }],
  10: [{ f: 749, s: F.crack1 }, { f: 792, dur: 30, s: F.crack2 }], 11: one(849, "why"),
  12: one(880, "thin"), 13: [{ f: 970, s: F.swell1 }, { f: 1040, dur: 40, s: F.swell2 }], 14: one(1115, "land"),
  15: [{ f: 1175, s: F.flow1 }, { f: 1215, dur: 30, s: F.flow2 }], 16: one(1265, "rock"),
  17: one(1319, "round"), 18: [{ f: 1405, s: F.square }, { f: 1448, dur: 22, s: F.sqCorner }], 19: one(1487, "every"),
  20: one(1544, "clip"), 21: [{ f: 1715, s: F.modern1 }, { f: 1752, dur: 30, s: F.modern2 }],
  22: [{ f: 1795, s: F.hole1 }, { f: 1803, dur: 22, s: F.hole2 }, { f: 1846, dur: 22, s: F.hole1 }], 23: [{ f: 1887, s: F.att }, { f: 1940, dur: 26, s: F.att2 }],
};

/** punch zooms on the key words: [frame, amount, frames] */
const ZOOMS: [number, number, number][] = [
  [48, 0.08, 14], [73, 0.06, 12], [142, 0.1, 10], [232, 0.06, 12], [257, 0.06, 12], [346, 0.08, 12], [365, 0.06, 10],
  [423, 0.12, 10], [442, 0.06, 12], [500, 0.06, 14], [584, 0.08, 14], [633, 0.06, 12], [696, 0.08, 14], [735, 0.06, 10],
  [833, 0.12, 10], [863, 0.14, 10], [933, 0.08, 12], [1013, 0.06, 12], [1093, 0.08, 12], [1227, 0.08, 12], [1288, 0.08, 12],
  [1351, 0.06, 14], [1386, 0.06, 12], [1428, 0.06, 12], [1522, 0.08, 12], [1561, 0.08, 12], [1636, 0.06, 12], [1682, 0.14, 8],
  [1745, 0.08, 12], [1777, 0.1, 12], [1868, 0.08, 12], [1896, 0.08, 10], [1927, 0.1, 12],
];

// impact kicks: [frame, gain]
const KICKS: [number, number][] = [[CRACK1, 1.4], [CRACK2, 1.6], [142, 0.8], [TWO, 0.6], [LOWER + 30, 0.8], [833, 0.8], [WHY + 12, 0.4], [LAND, 1.0],
  [SHARP, 0.6], [SNAP, 1.2], [DING, 0.4], [STOP, 0.5]];
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
  { f: 0, cInf: 0 }, { f: 167, cInf: 6 }, { f: 215, cInf: 0 }, { f: 252, dur: 34, cInf: 8 }, { f: 300, cInf: 0 }, { f: 319, cInf: 12 }, { f: 334, cInf: 4 },
  { f: 387, cInf: 11 }, { f: 475, cInf: 0 }, { f: 600, cInf: 9 }, { f: 749, cInf: 8 }, { f: 849, cInf: 13 }, { f: 880, cInf: 9 },
  { f: 970, cInf: 0 }, { f: 1175, cInf: 6 }, { f: 1265, cInf: 6 }, { f: 1319, cInf: 6 }, { f: 1544, cInf: 13 }, { f: 1715, cInf: 0 },
  { f: 1752, dur: 30, cInf: 6 }, { f: 1795, cInf: 9 }, { f: 1887, cInf: 9 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
