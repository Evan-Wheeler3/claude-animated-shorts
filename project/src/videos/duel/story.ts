// Timeline of "Could You Survive a Western Duel?": shots timed to the narration word onsets
// (shorts/duel/voice/whisper_raw.json, frames at 30 fps), the two sets (the saloon at the origin, the street at x = 100),
// the beats, the odds counter and the cameras.
export const FPS = 30;
export const TOTAL = 1376;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const gy = (_x: number, _z: number) => 0;
export const at = (x: number, z: number, dy = 0): V3 => [x, dy, z];

// ---------------- places ----------------
// saloon: room x -7..7, z -6..6, bar counter along z = -3.6, the doors in the front wall at z = 6
export const YOU_BAR: V3 = [-0.6, 0, -2.75];
export const GUN_BAR: V3 = [0.6, 0, -2.75];
export const BARKEEP: V3 = [-2.6, 0, -4.5];
// street: centre line x = 100, the saloon front on the west side (x = 93), the duellists 69 m (75 yards) apart
export const SX = 100;
export const YOU_ST: V3 = [SX, 0, 10];
export const GUN_ST: V3 = [SX, 0, -59];
export const SALOON_DOOR: V3 = [93.2, 0, 4];
export const WALL: V3 = [106.6, 0, -5];   // the bullet-hole wall
export const ROOF: V3 = [107.45, 6.4, 4];   // the vulture

// ---------------- beats (frames) ----------------
export const FLASH_AT = -1;
export const WAKE = 18, SPILL = 141, SOAK = 150, TURN = 197, OUTSIDE = 290, RARE = 347;
export const COCK = 492, YARDS = 536, SHOTS4 = [645, 656, 664, 676] as const, IDEA = 712;
export const HOLES = [767, 777, 790] as const, DRAW = 838, AIM = 857, MISS = 978, NOT = 1021, FAST = 1076;
export const IDEA2 = 1162, DOOR = 1250, SLIDE = 1278, LOOK = 1336;

// ---------------- the odds counter: [frame the change starts, value] ----------------
export const ODDS: [number, number][] = [[0, 100], [227, 70], [288, 40], [347, 70], [431, 35], [538, 15], [645, 5], [714, 15], [767, 30], [790, 45],
  [835, 50], [975, 60], [1021, 10], [1065, 3], [1276, 99]];
/** the counter value at frame f: ticks quickly to each new value; the last climb slows to a stop at 99 */
export const oddsAt = (f: number) => {
  let v = ODDS[0][1];
  for (let i = 1; i < ODDS.length; i++) {
    const [f0, to] = ODDS[i];
    if (f < f0) break;
    const last = i === ODDS.length - 1, dur = last ? 62 : 10 + Math.abs(to - v) * 0.12;
    const u = clamp01((f - f0) / dur);
    v = v + (to - v) * (last ? 1 - (1 - u) ** 2.6 : u);
  }
  return Math.round(v);
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; name: string };
const S = (id: number, a: number, b: number, name: string, light: Light = "day", sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, name, light, sunAz, sunEl });
const IN = (id: number, a: number, b: number, name: string) => S(id, a, b, name, "golden", 170, 62);
export const SHOTS: ShotDef[] = [
  IN(1, 0, 84, "wake"), IN(2, 84, 132, "saloon"), IN(3, 132, 197, "spill"), IN(4, 197, 227, "turn"),
  IN(5, 227, 278, "apology"), IN(6, 278, 317, "outside"),
  S(7, 317, 425, "street"), S(8, 425, 483, "badnews"), S(9, 483, 505, "cock"), S(10, 505, 588, "yards"),
  S(11, 588, 698, "lifelong"), S(12, 698, 745, "advantage"), S(13, 745, 808, "missed"),
  S(14, 808, 854, "draw"), S(15, 854, 912, "aim"), S(16, 912, 1017, "misses"), S(17, 1017, 1065, "ifnot"), S(18, 1065, 1105, "vulture"),
  S(19, 1105, 1225, "strategy"), S(20, 1225, 1273, "walkback"), IN(21, 1273, TOTAL, "drink"),
];
export const XFADE: Record<number, number> = {};
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

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

const Y = YOU_BAR, G = GUN_BAR, YS = YOU_ST, GS = GUN_ST;
const F: Record<string, (f: number) => Shot> = {
  wake: (f) => dolly([Y[0] + 0.15, 1.72, Y[2] + 2.5], [Y[0], 1.78, Y[2]], pushK(f, 0, 0.0025), { fov: 36 }),
  saloon: (f) => dolly([1.2, 2.4, 5.2], [-0.4, 1.4, -3], pushK(f, 84, 0.0012), { fov: 56 }),
  spill: (f) => dolly([0.05, 1.6, 0.9], [0, 1.45, -2.75], pushK(f, 132, 0.002, 0.006, 20), { fov: 46 }),
  turn: (f) => dolly([G[0] + 0.1, 1.85, G[2] + 2.3], [G[0], 1.85, G[2]], pushK(f, 197, 0.004), { fov: 34, roll: -0.04 }),
  apology: (f) => dolly([0.0, 1.6, 0.5], [0, 1.6, -2.75], pushK(f, 227, 0.002), { fov: 42 }),
  outside1: (f) => dolly([G[0] + 0.1, 1.85, G[2] + 2.3], [G[0], 1.88, G[2]], pushK(f, 278, 0.003), { fov: 34, roll: 0.03 }),
  outside2: (f) => dolly([0.4, 1.5, 0.8], [0, 1.3, 6], pushK(f, 296, 0.002), { fov: 52 }),
  street: (f) => zoom([SX + 1.5, 3.6, 22], [SX - 0.4, 1.3, -18], 46, pushK(f, 317, 0.0016)),
  bad: (f) => dolly([YS[0] + 0.1, 1.7, YS[2] - 2.6], [YS[0], 1.75, YS[2]], pushK(f, 425, 0.0025), { fov: 38 }),
  cock: (f) => dolly([YS[0] - 0.5, 1.85, YS[2] - 1.2], [YS[0] - 0.3, 1.78, YS[2]], pushK(f, 483, 0.004), { fov: 34, roll: 0.04 }),
  yards1: (f) => zoom([SX + 0.9, 1.8, 15.5], [SX - 0.3, 1.4, -20], 46, 1),
  yards2: (f) => zoom([SX + 0.9, 1.8, 15.5], [GS[0], 1.2, GS[2]], 4.2, pushK(f, 560, 0.002)),
  life: (f) => dolly([GS[0] + 0.2, 1.55, GS[2] + 3.2], [GS[0], 1.62, GS[2]], pushK(f, 588, 0.0025), { fov: 40 }),
  adv: (f) => dolly([YS[0] + 0.1, 1.75, YS[2] - 2.4], [YS[0], 1.85, YS[2]], pushK(f, 698, 0.003, 0.006, 22), { fov: 40, roll: -0.03 }),
  missed: (f) => dolly([WALL[0] - 3.4, 1.4, WALL[2] + 0.2], [WALL[0], 1.5, WALL[2]], pushK(f, 745, 0.002), { fov: 40 }),
  draw: (f) => dolly([GS[0] + 0.1, 1.2, GS[2] + 2.2], [GS[0], 1.15, GS[2]], pushK(f, 808, 0.004), { fov: 38, roll: 0.03 }),
  aim: (f) => dolly([YS[0] + 3.2, 1.5, YS[2] - 0.3], [YS[0], 1.45, YS[2] - 0.3], pushK(f, 854, 0.002), { fov: 40 }),
  shot1: (f) => dolly([GS[0] + 0.1, 1.6, GS[2] + 2.6], [GS[0], 1.62, GS[2]], pushK(f, 912, 0.003), { fov: 40 }),
  shot2: (f) => dolly([YS[0] + 0.05, 1.75, YS[2] - 2.3], [YS[0], 1.82, YS[2]], pushK(f, 978, 0.004), { fov: 40, roll: 0.04 }),
  ifnot: (f) => dolly([YS[0] + 3.0, 1.5, YS[2] - 0.6], [YS[0], 1.45, YS[2] - 0.6], pushK(f, 1017, 0.004), { fov: 38, roll: -0.04 }),
  vulture: (f) => dolly([ROOF[0] - 2.6, ROOF[1] - 0.6, ROOF[2] + 1.0], [ROOF[0], ROOF[1] + 0.6, ROOF[2]], pushK(f, 1065, 0.003), { fov: 40 }),
  strat: (f) => dolly([YS[0] + 0.1, 1.72, YS[2] - 2.6], [YS[0], 1.9, YS[2]], pushK(f, 1105, 0.0018), { fov: 42 }),
  walk: (f) => dolly([SALOON_DOOR[0] + 8.3, 1.7, SALOON_DOOR[2] + 1.0], [SALOON_DOOR[0], 1.6, SALOON_DOOR[2] + 1.0], pushK(f, 1225, 0.002), { fov: 46 }),
  drink1: (f) => dolly([0.0, 1.62, 1.7], [0, 1.45, -2.75], pushK(f, 1273, 0.0018), { fov: 46 }),
  drink2: (f) => dolly([0.0, 1.7, 1.5], [0, 1.6, -2.75], pushK(f, 1330, 0.0012), { fov: 40 }),
};
const one = (a: number, k: string): Key[] => [{ f: a, s: F[k] }];
const CAMS: Record<number, Key[]> = {
  1: one(0, "wake"), 2: one(84, "saloon"), 3: one(132, "spill"), 4: one(197, "turn"), 5: one(227, "apology"),
  6: [{ f: 278, s: F.outside1 }, { f: 296, cut: true, s: F.outside2 }],
  7: one(317, "street"), 8: one(425, "bad"), 9: one(483, "cock"),
  10: [{ f: 505, s: F.yards1 }, { f: 534, dur: 28, s: F.yards2 }],
  11: one(588, "life"), 12: one(698, "adv"), 13: [{ f: 745, s: F.missed }, { f: 786, dur: 16, s: rolled(F.missed, 0.04) }],
  14: one(808, "draw"), 15: one(854, "aim"), 16: [{ f: 912, s: F.shot1 }, { f: 978, cut: true, s: F.shot2 }],
  17: one(1017, "ifnot"), 18: one(1065, "vulture"), 19: one(1105, "strat"), 20: one(1225, "walk"),
  21: [{ f: 1273, s: F.drink1 }, { f: 1326, dur: 30, s: F.drink2 }],
};

// impact kicks: [frame, gain]
const KICKS: [number, number][] = [[SPILL + 2, 0.6], [TURN, 0.8], [OUTSIDE + 6, 0.8], [COCK, 0.6], ...SHOTS4.map((f) => [f, 0.7] as [number, number]),
  ...HOLES.map((f) => [f, 0.6] as [number, number]), [DRAW, 0.7], [MISS, 1.4], [NOT, 0.6], [FAST + 2, 0.5], [DOOR, 0.5]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 13 }, { f: 84, cInf: 3 }, { f: 132, cInf: 9, focus: () => [0, 1.5, -2.75] }, { f: 197, cInf: 14 }, { f: 227, cInf: 10, focus: () => [0, 1.6, -2.75] },
  { f: 278, cInf: 14 }, { f: 296, cInf: 6 }, { f: 317, cInf: 0 }, { f: 425, cInf: 12 }, { f: 483, cInf: 14 }, { f: 505, cInf: 0 },
  { f: 588, cInf: 11 }, { f: 698, cInf: 13 }, { f: 745, cInf: 8 }, { f: 808, cInf: 13 }, { f: 854, cInf: 8 }, { f: 912, cInf: 12 },
  { f: 1017, cInf: 8 }, { f: 1065, cInf: 8 }, { f: 1105, cInf: 12 }, { f: 1225, cInf: 4 }, { f: 1273, cInf: 9, focus: () => [0, 1.6, -2.75] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
