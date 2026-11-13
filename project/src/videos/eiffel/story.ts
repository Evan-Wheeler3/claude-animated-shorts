import { getInputProps } from "remotion";
// Timeline of "The Eiffel Tower's Secret Job": shots timed to the narration word onsets
// (shorts/eiffel/voice/whisper_raw.json, frames at 30 fps), the sets, the beats and the cameras.
export const FPS = 30;
export const TOTAL = 1790;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const gy = (_x: number, _z: number) => 0;

// ---------------- places ----------------
// the tower stands at the origin (faces on the axes), the Champ de Mars toward +z, the Seine toward -z
export const TOWER: V3 = [0, 0, 0];
export const TOP = 276;                    // the top observation deck
export const PLAZA: V3 = [0, 0, 95];       // where crowds stand in front of the tower
export const RESTO: V3 = [600, 0, 0];      // the restaurant inside the tower (window wall at z = -3 looks out over Paris)
export const ROOM: V3 = [600, 0, 30];      // the wartime radio room
export const LAND: V3 = [900, 0, 0];       // the radio landscape: mast at the origin, hills and town toward -z
export const HOUSE: V3 = [1200, 0, 0];     // the cutaway house (front open toward +z)
export const SEA: V3 = [1500, 0, 0];       // the evening sea: ships toward -z

/** the tower's half-width at height y (m): base 125 m square, platforms at 57, 115 and 276 m (world.ts builds it) */
export const halfW = (y: number) => {
  const P: [number, number][] = [[0, 62.5], [57, 36], [115, 20], [180, 11.5], [276, 4.6], [300, 2.8], [324, 1.0]];
  for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const [a, wa] = P[i - 1], [b, wb] = P[i]; const u = (y - a) / (b - a); return wa + (wb - wa) * u; }
  return 1;
};

// ---------------- beats (frames) ----------------
export const FLASH_AT = -1;
export const SECRET = 26, STANDING = 87, PERMIT = 206, YEARS = 230, DOWN = 281, WAIT = 326, LETTER = 373, MONSTER = 405;
export const LUNCH = 461, CANT = 558, Y1909 = 603, JOB = 687, RADIO = 709, SPREADS = 752, BLOCK = 816, CURVE = 859, HIGHER = 900;
export const FARTHER = 928, WIFI = 974, UP = 997, BASE = 1019, TALL = 1101, BIGGEST = 1174, ARMY = 1202, RENEW = 1240;
export const SHIPS = 1334, WHERE = 1379, WAR = 1411, LISTEN = 1425, TODAY = 1500, NEWONE = 1567, TALLER = 1592, PROPOSE = 1624, KNEEL = 1703, ROUTER = 1740;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; name: string };
const S = (id: number, a: number, b: number, name: string, light: Light = "day", sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, name, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 104, "hook", "golden", 30, 14), S(2, 104, 245, "fair", "day", 120, 40), S(3, 245, 296, "down", "day", 120, 40),
  S(4, 296, 424, "artists", "day", 120, 40), S(5, 424, 545, "lunch", "day", 150, 50), S(6, 545, 575, "reveal", "day", 120, 40),
  S(7, 575, 700, "deadline", "day", 120, 40), S(8, 700, 724, "radio", "day", 120, 40),
  S(9, 724, 894, "spread", "day", 140, 45), S(10, 894, 962, "higher", "day", 140, 45), S(11, 962, 1061, "wifi", "day", 150, 50),
  S(12, 1061, 1199, "tallest", "day", 120, 40), S(13, 1199, 1291, "army", "day", 120, 40),
  S(14, 1291, 1402, "ships", "golden", -20, 6), S(15, 1402, 1470, "war", "day", 150, 50),
  S(16, 1470, 1610, "today", "day", 120, 40), S(17, 1610, TOTAL, "propose", "golden", 30, 14),
];
export const XFADE: Record<number, number> = { 2: 8, 5: 6, 9: 8, 11: 8, 14: 8, 15: 8, 16: 8, 17: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** the mast in the radio landscape: short, then it grows (shot 10) */
export const mastAt = (id: number, f: number) => (id === 10 ? 6 + 34 * smooth((f - HIGHER) / 24) : 6);
/** the new antenna (2022) being lowered onto the top */
export const newAntAt = (f: number) => smooth((f - NEWONE) / 22);

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
const F: Record<string, (f: number) => Shot> = {
  hook1: (f) => ({ pos: [36, 3 + 0.25 * f, 150 - 0.2 * f], look: [0, 60 + 1.6 * f, 0], fov: 50 }),
  hook2: (f) => ({ pos: [70, 180 + 0.4 * (f - 50), 120], look: [0, 280, 0], fov: 32 }),
  fair1: (f) => ({ pos: [18, 4 + 0.05 * (f - 104), 175], look: [0, 70, 0], fov: 50 }),
  fair2: (f) => ({ pos: [6, 1.7, 103.5], look: [3, 1.6, 95], fov: 42 }),
  down: (f) => ({ pos: [PLAZA[0] + 2.4, 1.7, PLAZA[2] + 3.4], look: [PLAZA[0] + 2.3, 1.6, PLAZA[2]], fov: 40, roll: -0.03 }),
  art1: (f) => ({ pos: [2, 1.8, 103.6], look: [0.6, 1.65, 96], fov: 44 }),
  art2: (f) => ({ pos: [-1.0, 1.7, 100.4], look: [-0.6, 1.7, 96], fov: 36 }),
  lunch1: (f) => ({ pos: P(RESTO, 0.3, 1.55, 3.6), look: P(RESTO, 0, 1.3, 0), fov: 46 }),
  lunch2: (f) => ({ pos: P(RESTO, 0.1, 1.45, 2.2), look: P(RESTO, 0, 1.4, 0), fov: 36 }),
  reveal: (f) => ({ pos: [0.4, 58.8 + 0.2 * (f - 545), 41.2 + 2.6 * (f - 545)], look: [0, 58.8 + 0.5 * (f - 545), 39], fov: 40 }),
  dead1: (f) => ({ pos: [4, 1.7, 103.6], look: [3.2, 1.75, 96], fov: 42 }),
  dead2: (f) => ({ pos: [3.8, 1.75, 101.4], look: [3.2, 1.8, 96], fov: 34 }),
  radio: (f) => ({ pos: [60, 230, 60], look: [0, 318, 0], fov: 36 }),
  sp1: (f) => ({ pos: P(LAND, 60, 26, 70), look: P(LAND, -22, 6, -40), fov: 50 }),
  sp2: (f) => ({ pos: P(LAND, 120, 120, 200), look: P(LAND, 0, -40, -80), fov: 46 }),
  hi: (f) => ({ pos: P(LAND, 40, 22, 56), look: P(LAND, -4, 12, -26), fov: 52 }),
  wifi1: (f) => ({ pos: P(HOUSE, 0.4, 3.4, 12.5), look: P(HOUSE, 0, 2.6, 0), fov: 46 }),
  wifi2: (f) => ({ pos: P(HOUSE, -0.6, 5.0, 6.5), look: P(HOUSE, -0.6, 4.6, 0), fov: 40 }),
  wifi3: (f) => ({ pos: P(HOUSE, 0.6, 0.6, 6.5), look: P(HOUSE, 0.6, 0.9, 0), fov: 40 }),
  tall1: (f) => ({ pos: [120, 2 + 0.5 * (f - 1061), 240], look: [0, 40 + 1.5 * (f - 1061), 0], fov: 50 }),
  tall2: (f) => ({ pos: [260, 140, 380], look: [0, 150, 0], fov: 50 }),
  army: (f) => ({ pos: [1.5, 1.7, 104.4], look: [0.4, 1.7, 96], fov: 46 }),
  army2: (f) => ({ pos: [0.6, 1.8, 101.5], look: [0.4, 2.0, 96], fov: 36 }),
  ships1: (f) => ({ pos: P(SEA, 20, 6, 30), look: P(SEA, 0, 3, -10), fov: 44 }),
  ships2: (f) => ({ pos: P(SEA, 2.6, 4.6, -2), look: P(SEA, 0, 4.2, -9), fov: 40 }),
  war: (f) => ({ pos: P(ROOM, 0.2, 1.5, 3.4), look: P(ROOM, 0, 1.3, 0), fov: 44 }),
  today1: (f) => ({ pos: [110, 120 + 0.6 * (f - 1470), 190], look: [0, 230, 0], fov: 46 }),
  today2: (f) => ({ pos: [36, 300, 42], look: [0, 322, 0], fov: 40 }),
  prop1: (f) => ({ pos: [7.2, TOP + 1.45, 7.6], look: [6.6, TOP + 1.1, 2.0], fov: 40 }),
  prop2: (f) => ({ pos: [34, TOP + 8, 32], look: [2, TOP + 30, 0], fov: 50 }),
};
const one = (a: number, k: string): Key[] => [{ f: a, s: F[k] }];
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: F.hook1 }, { f: 50, dur: 46, s: F.hook2 }],
  2: [{ f: 104, s: F.fair1 }, { f: 190, dur: 34, s: F.fair2 }], 3: one(245, "down"),
  4: [{ f: 296, s: F.art1 }, { f: 380, dur: 24, s: F.art2 }],
  5: [{ f: 424, s: F.lunch1 }, { f: 470, dur: 30, s: F.lunch2 }], 6: one(545, "reveal"),
  7: [{ f: 575, s: F.dead1 }, { f: 650, dur: 28, s: F.dead2 }], 8: one(700, "radio"),
  9: [{ f: 724, s: F.sp1 }, { f: 846, dur: 40, s: F.sp2 }], 10: one(894, "hi"),
  11: [{ f: 962, s: F.wifi1 }, { f: 990, dur: 22, s: F.wifi2 }, { f: 1013, dur: 22, s: F.wifi3 }],
  12: [{ f: 1061, s: F.tall1 }, { f: 1150, dur: 34, s: F.tall2 }], 13: [{ f: 1199, s: F.army }, { f: 1232, dur: 24, s: F.army2 }],
  14: [{ f: 1291, s: F.ships1 }, { f: 1360, dur: 30, s: F.ships2 }], 15: one(1402, "war"),
  16: [{ f: 1470, s: F.today1 }, { f: 1545, dur: 30, s: F.today2 }],
  17: [{ f: 1610, s: F.prop1 }, { f: 1712, dur: 46, s: F.prop2 }],
};

/** punch zooms on the key words: [frame, amount, frames] */
const ZOOMS: [number, number, number][] = [
  [SECRET, 0.1, 12], [77, 0.06, 12], [PERMIT, 0.08, 12], [YEARS, 0.08, 10], [DOWN, 0.12, 8], [WAIT, 0.06, 10], [MONSTER, 0.1, 10],
  [LUNCH, 0.06, 12], [520, 0.06, 12], [Y1909, 0.08, 12], [645, 0.06, 12], [JOB, 0.08, 10], [771, 0.06, 12], [BLOCK, 0.06, 10],
  [FARTHER, 0.08, 12], [1043, 0.08, 10], [TALL, 0.06, 14], [ARMY, 0.06, 12], [1263, 0.08, 12], [WHERE, 0.06, 12], [LISTEN, 0.08, 12],
  [1500, 0.06, 12], [TALLER, 0.1, 10], [PROPOSE, 0.06, 14], [1669, 0.08, 12],
];

// impact kicks: [frame, gain]
const KICKS: [number, number][] = [[DOWN, 1.0], [MONSTER, 0.5], [CANT + 4, 0.5], [RADIO, 0.8], [BLOCK, 0.4], [RENEW, 0.6], [TALLER, 0.8], [ROUTER, 0.5]];
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
  { f: 0, cInf: 0 }, { f: 190, dur: 34, cInf: 9 }, { f: 245, cInf: 0 }, { f: 296, cInf: 9 }, { f: 424, cInf: 8 }, { f: 545, cInf: 0 },
  { f: 575, cInf: 10 }, { f: 700, cInf: 0 }, { f: 962, cInf: 5 }, { f: 1061, cInf: 0 }, { f: 1199, cInf: 9 }, { f: 1291, cInf: 4 },
  { f: 1402, cInf: 10 }, { f: 1470, cInf: 0 }, { f: 1610, cInf: 9 }, { f: 1712, dur: 46, cInf: 2 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
