// Timeline of "The Great Emu War" (Campion, Western Australia, Nov-Dec 1932): shots timed to the narration word onsets
// (shorts/emu/voice/whisper_raw.json, frames at 30 fps), the ground, the beats and the cameras.
export const FPS = 30;
export const TOTAL = 2092;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- place ----------------
// desert at z < 0, the fence on z = 0 (broken between x = -8 and 8), wheat from z = 3 to 56, the farm strip and its
// road (z = 70) beyond. The dam, the ridge, the range, the park and the bounty office sit off to the sides.
export const DAM: V3 = [-90, 0, -30];
export const RIDGE: V3 = [45, 0, -48];
export const gy = (x: number, z: number) => {
  const dr = Math.hypot(x - DAM[0], z - DAM[2]);
  const flat = smooth((Math.abs(z - 40) - 45) / 20) * (1 - smooth((Math.abs(x) - 150) / 60) * 0 );
  return 0.3 * Math.sin(x * 0.035 + 1) * Math.sin(z * 0.03) * flat + 3.2 * Math.exp(-((x - RIDGE[0]) ** 2 + (z - RIDGE[2]) ** 2) / 700)
    - 0.9 * (1 - smooth(dr / 8)) + 1.0 * Math.exp(-((dr - 10.5) ** 2) / 3);
};
export const at = (x: number, z: number, dy = 0): V3 => [x, gy(x, z) + dy, z];
export const HG: V3 = at(0, -6);         // the gun in the hook
export const FARM: V3 = at(0, 80);       // where the farmers stand
export const ARMY: V3 = at(-34, 80);     // the line-up
export const G5: V3 = at(37.7, -8.6);        // day one
export const BANK: V3 = at(-90, -40.5);  // the gun on the desert side of the dam bank, the water behind it
export const DESK: V3 = at(-52, 86);
export const E9: V3 = at(-70, -10);
export const UNL: V3 = at(60, 80);
export const RANGE: V3 = at(120, 74.5);
export const PARK: V3 = at(300, 60);
export const SPLIT: V3 = at(0, -40);
export const BRASS: V3 = at(-20, -12);
export const BOUNTY: V3 = at(-300, 74);
export const ROAD_Z = 70;

// ---------------- beats (frames) ----------------
export const FLASH_AT = 131;
export const EAT = 228, SALUTE = 284, WANT = 391;
export const POP = [442, 464, 475, 486, 496] as const;  // a major, two soldiers, two guns
export const AMMO0 = 517, AMMO1 = 546;
export const STROLL = 608, HORDE = 741, FIRE = 864, JAM = 940;
export const TRUCK0 = 968, OUTRUN = 1037, TANK = 1106;
export const CHARGE = 1417, SWEEP = 1436, RUNKID = 1526, SCATTER = 1547, SPLIT0 = 1609;
export const BRASS0 = 1765, COINS = 1917, REVEAL = 2046;
export const truckX = (f: number) => -42 + (f - TRUCK0) * 0.2;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; name: string };
const S = (id: number, a: number, b: number, name: string, light: Light = "day", sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, name, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 56, "hookGun"), S(2, 56, 82, "hookMen"), S(3, 82, 111, "hookMob"), S(4, 111, 136, "hookEmu"),
  S(5, 136, 228, "arrive"), S(6, 228, 263, "eat"),
  S(7, 263, 419, "farmers"), S(8, 419, 551, "army"), S(9, 551, 668, "dayOne"),
  S(10, 668, 741, "ambush"), S(11, 741, 805, "horde"), S(12, 805, 830, "wait"), S(13, 830, 864, "blank"),
  S(14, 864, 940, "fire"), S(15, 940, 968, "jam"), S(16, 968, 1077, "truck"),
  S(17, 1077, 1125, "report"), S(18, 1125, 1218, "tank"),
  S(19, 1218, 1287, "luckily"), S(20, 1287, 1355, "unluckily"),
  S(21, 1355, 1467, "range", "golden", -40, 16), S(22, 1467, 1547, "park"), S(23, 1547, 1596, "scatter"),
  S(24, 1596, 1697, "split"), S(25, 1697, 1753, "home"), S(26, 1753, 1815, "brass"),
  S(27, 1815, 1978, "bounty"), S(28, 1978, TOTAL, "end"),
];
export const XFADE: Record<number, number> = { 21: 8, 22: 8, 27: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

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

const tx = (f: number) => truckX(f);
const F: Record<string, (f: number) => Shot> = {
  hookGun: (f) => dolly([1.0, 1.75, -1.6], [0, 1.15, -10], pushK(f, 0, 0.002), { fov: 46 }),
  hookMen: (f) => dolly([0.3, 1.5, -10.6], [0, 1.42, -5], pushK(f, 56, 0.003), { fov: 42, roll: -0.03 }),
  hookMob: (f) => zoom([9, 6.5, -4], [0, 1.0, -36], 48, pushK(f, 82, 0.003)),
  hookEmu: (f) => dolly([0.25, 1.62, -9.0], [0, 1.66, -12], pushK(f, 111, 0.004), { fov: 30, roll: 0.04 }),
  arrive1: (f) => zoom([40, 7, -4], [0, 1.0, -6], 46, pushK(f, 136, 0.0018)),
  arrive2: (f) => zoom([24, 3.2, -6], [0, 1.2, 0], 44, pushK(f, 190, 0.002)),
  eat: (f) => dolly([2.5, 1.25, -2.6], [0, 1.0, 9], pushK(f, 228, 0.003), { fov: 40, roll: 0.03 }),
  farm1: (f) => dolly([0.3, 1.55, 74.2], [0, 1.5, 80], pushK(f, 263, 0.0018), { fov: 42 }),
  farm2: (f) => dolly([0.2, 1.7, 74.8], [-0.15, 2.0, 80], pushK(f, 330, 0.0015, 0.005, 26), { fov: 42 }),
  army1: (f) => dolly([-33.8, 1.5, 74.4], [-34, 1.35, 80], pushK(f, 419, 0.0015), { fov: 46 }),
  army2: (f) => dolly([-33.6, 1.0, 72.6], [-34, 3.3, 82.2], pushK(f, 511, 0.0015), { fov: 50, roll: -0.03 }),
  day1: (f) => dolly([36.6, 1.6, -3.4], [43.5, 2.9, -40], pushK(f, 551, 0.0012), { fov: 40 }),
  day2: (f) => zoom([38.5, 2.2, -12], [45, 3.6, -46], 22, pushK(f, 604, 0.002), { roll: 0.03 }),
  ambush: (f) => dolly([BANK[0] + 0.4, BANK[1] + 0.4, BANK[2] - 5.6], [BANK[0], BANK[1] + 0.75, BANK[2] + 1.2], pushK(f, 668, 0.002), { fov: 40 }),
  horde: (f) => zoom([BANK[0] + 1.4, BANK[1] + 2.4, BANK[2] + 3.6], [BANK[0], 1.5, BANK[2] - 42], 46, pushK(f, 741, 0.003)),
  wait: (f) => dolly([BANK[0] - 0.5, BANK[1] + 0.9, BANK[2] - 2.4], [BANK[0] - 0.8, BANK[1] + 1.0, BANK[2] + 1.1], pushK(f, 805, 0.004), { fov: 30, roll: -0.03 }),
  blank: (f) => dolly([BANK[0] + 0.2, BANK[1] + 1.0, BANK[2] + 0.2], [BANK[0], BANK[1] + 1.1, BANK[2] - 2.9], pushK(f, 830, 0.004), { fov: 32, roll: 0.04 }),
  fire: (f) => dolly([BANK[0] + 0.5, BANK[1] + 1.9, BANK[2] + 3.4], [BANK[0], BANK[1] + 0.7, BANK[2] - 8], pushK(f, 864, 0.0015), { fov: 52 }),
  jam: (f) => dolly([BANK[0] + 1.0, BANK[1] + 0.95, BANK[2] - 3.3], [BANK[0] - 0.35, BANK[1] + 0.8, BANK[2] + 0.6], pushK(f, 940, 0.003), { fov: 40, roll: 0.03 }),
  truck1: (f) => ({ pos: [tx(f) + 6.8, 1.9, 64.6], look: [tx(f) - 0.4, 1.6, ROAD_Z], fov: 46 * (1 - 0.0006 * (f - 968)) }),
  truck2: (f) => ({ pos: [tx(f) + 5.2, 1.6, 63.2], look: [tx(f) - 0.2, 1.5, ROAD_Z - 1.4], fov: 48, roll: -0.03 }),
  report: (f) => dolly([-51.7, 1.6, 81.5], [-52, 1.85, 86], pushK(f, 1077, 0.002), { fov: 42 }),
  tank: (f) => dolly([E9[0] + 0.3, 1.4, E9[2] + 4.8], [E9[0], 1.25, E9[2]], pushK(f, 1125, 0.0015, 0.005, 30), { fov: 38 }),
  luck: (f) => dolly([-33.8, 1.5, 73.9], [-34, 1.45, 80], pushK(f, 1218, 0.002), { fov: 44, roll: -0.03 }),
  unluck: (f) => dolly([60.2, 1.5, 73.9], [60, 1.45, 80], pushK(f, 1287, 0.002), { fov: 44, roll: 0.03 }),
  range1: (f) => dolly([118.4, 1.9, 71.4], [120.3, 1.0, 82], pushK(f, 1355, 0.0015), { fov: 50 }),
  park1: (f) => dolly([300.5, 1.6, 52.2], [300, 0.8, 61], pushK(f, 1467, 0.002), { fov: 50 }),
  park2: (f) => dolly([301, 4.4, 51.5], [300, 2.2, 61], pushK(f, 1547, 0.002), { fov: 50, roll: 0.04 }),
  split: (f) => dolly([0, 13 + 0.03 * (f - 1596), -21 + 0.02 * (f - 1596)], [0, 0, -45], 1, { fov: 50, roll: 0.0006 * (f - 1596) }),
  home: (f) => zoom([-12, 1.7, 66.5], [24, 1.3, ROAD_Z], 40, pushK(f, 1697, 0.002)),
  brass: (f) => dolly([BRASS[0] + 0.3, 1.3, BRASS[2] + 5.4], [BRASS[0], 0.95, BRASS[2] + 0.3], pushK(f, 1753, 0.002), { fov: 42 }),
  bounty1: (f) => dolly([BOUNTY[0] + 0.5, 1.7, BOUNTY[2] - 8.2], [BOUNTY[0], 2.35, BOUNTY[2]], pushK(f, 1815, 0.0012), { fov: 44 }),
  bounty2: (f) => dolly([BOUNTY[0] + 1.5, 1.4, BOUNTY[2] - 6.6], [BOUNTY[0] + 1.3, 2.0, BOUNTY[2] - 1.6], pushK(f, 1905, 0.0015), { fov: 44, roll: -0.03 }),
  end1: (f) => dolly([0.3, 1.55, 74.2], [0, 1.5, 80], pushK(f, 1978, 0.0018), { fov: 42 }),
  end2: (f) => dolly([1.2, 2.0, 72.6], [0.4, 1.6, 81], pushK(f, 2040, 0.0012), { fov: 46 }),
};
const one = (id: number, a: number, k: string): Key[] => [{ f: a, s: F[k] }];
const CAMS: Record<number, Key[]> = {
  1: one(1, 0, "hookGun"), 2: one(2, 56, "hookMen"), 3: one(3, 82, "hookMob"), 4: one(4, 111, "hookEmu"),
  5: [{ f: 136, s: F.arrive1 }, { f: 186, dur: 30, s: F.arrive2 }], 6: one(6, 228, "eat"),
  7: [{ f: 263, s: F.farm1 }, { f: 326, dur: 24, s: F.farm2 }],
  8: [{ f: 419, s: F.army1 }, { f: 506, dur: 26, s: F.army2 }],
  9: [{ f: 551, s: F.day1 }, { f: 604, cut: true, s: F.day2 }],
  10: one(10, 668, "ambush"), 11: one(11, 741, "horde"), 12: one(12, 805, "wait"), 13: one(13, 830, "blank"),
  14: one(14, 864, "fire"), 15: one(15, 940, "jam"),
  16: [{ f: 968, s: F.truck1 }, { f: 1030, dur: 20, s: F.truck2 }],
  17: one(17, 1077, "report"), 18: [{ f: 1125, s: F.tank }, { f: 1168, dur: 20, s: rolled(F.tank, 0.04) }],
  19: one(19, 1218, "luck"), 20: one(20, 1287, "unluck"),
  21: [{ f: 1355, s: F.range1 }, { f: 1410, dur: 22, s: rolled(F.range1, -0.04) }],
  22: one(22, 1467, "park1"), 23: one(23, 1547, "park2"), 24: one(24, 1596, "split"),
  25: one(25, 1697, "home"), 26: one(26, 1753, "brass"),
  27: [{ f: 1815, s: F.bounty1 }, { f: 1900, dur: 26, s: F.bounty2 }],
  28: [{ f: 1978, s: F.end1 }, { f: 2034, dur: 30, s: F.end2 }],
};

// impact kicks: [frame, gain]
const KICKS: [number, number][] = [[111, 0.8], [WANT, 0.5], ...POP.map((f) => [f, 0.4] as [number, number]), [AMMO1, 0.8],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => [FIRE + i * 6, 0.5] as [number, number]), [JAM, 1.0], [SWEEP, 0.9], [SCATTER, 0.7], [1174, 0.6]];
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
  { f: 0, cInf: 8, focus: () => [0, 1.5, -12] }, { f: 56, cInf: 11 }, { f: 82, cInf: 0 }, { f: 111, cInf: 14 },
  { f: 136, cInf: 0 }, { f: 228, cInf: 9, focus: () => [0, 1.2, 9] },
  { f: 263, cInf: 11, focus: () => [0, 1.6, 80] }, { f: 419, cInf: 6, focus: () => [-34, 1.5, 80] },
  { f: 551, cInf: 0 }, { f: 668, cInf: 10 }, { f: 741, cInf: 0 }, { f: 805, cInf: 14 }, { f: 830, cInf: 14 },
  { f: 864, cInf: 0 }, { f: 940, cInf: 12 }, { f: 968, cInf: 6, focus: (f) => [truckX(f), 1.5, ROAD_Z] },
  { f: 1077, cInf: 11, focus: () => [-52, 1.7, 86] }, { f: 1125, cInf: 12 },
  { f: 1218, cInf: 11, focus: () => [-34, 1.5, 80] }, { f: 1287, cInf: 11, focus: () => [60, 1.5, 80] },
  { f: 1355, cInf: 4 }, { f: 1467, cInf: 8 }, { f: 1547, cInf: 0 }, { f: 1697, cInf: 0 },
  { f: 1753, cInf: 11 }, { f: 1815, cInf: 7, focus: () => [BOUNTY[0], 1.6, BOUNTY[2] - 1.4] },
  { f: 1978, cInf: 11, focus: () => [0, 1.6, 80] }, { f: 2034, dur: 30, cInf: 5, focus: () => [0, 1.6, 80] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
