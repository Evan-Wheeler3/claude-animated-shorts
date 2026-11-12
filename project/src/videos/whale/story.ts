// Timeline of "A Whale of a Deal" (Florence, Oregon, 12 Nov 1970): 27 shots timed to the narration word onsets
// (shorts/whale/voice/whisper_raw.json, frames at 30 fps), the terrain, story state (crates, blast, chunks, car) and
// the camera grammar of the skill: cuts on big jumps, smootherstep glides, every hold creeps, 7-frame impact kicks.
export const FPS = 30;
export const TOTAL = 2106;
export const D0 = 0; // sea level (build.ts imports it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- place ----------------
// sea at z < 0, wet sand to z ~6, beach rising to z 45, dunes to z 100, a flat top (viewing crest, then the car park)
export const PL = 6.775; // plateau height
export const gy = (x: number, z: number) => {
  if (z < 0) return Math.max(-3, 0.06 * z);
  const beach = 0.035 * Math.min(z, 45), d = smooth((z - 45) / 55);
  const bumps = (1 - smooth((z - 104) / 14)) * d * (0.8 * Math.sin(x * 0.09 + 1.3) * Math.sin(z * 0.11) + 0.4 * Math.sin(x * 0.23 + z * 0.17));
  return beach + 5.2 * d + bumps;
};
export const at = (x: number, z: number, dy = 0): V3 => [x, gy(x, z) + dy, z];
export const WH: V3 = at(0, 10);          // whale centre (lies along x, head toward +x)
export const CRATE: V3 = at(-0.6, 12.9);  // dynamite stack against the landward flank
export const HOOKPLG: V3 = at(4.2, 16.6); // the plunger in the hook shot
export const SIGN: V3 = at(-9.4, 14.6);
export const TRUCK: V3 = at(-13, 25);
export const EASEL: V3 = at(-8, 19);
export const LOG: V3 = at(11, 4.6);
export const WALT0: V3 = at(6, 19);
export const CROWD: V3 = at(-4, 112);     // the viewing spot on the dune crest ("a quarter of a mile")
export const REP: V3 = at(13, 106);
export const PLG: V3 = at(5.8, 108);
export const CAR: V3 = [10, PL, 152];
export const KET: V3 = [-18, PL, 158];
export const DEAL: V3 = [400, PL, 162];

// ---------------- beats (frames) ----------------
export const HOOK_PUSH = 123, HOOK_BOOM = 131, FLASH_AT = 139;
export const STINK = 238, BOULDER = 548, CRATES0 = 702, CRATES1 = 760;
export const PLUNGE = 1079, BLAST = 1096, SHOCK = 1194;
export const HIT1 = 1331, HIT2 = 1349, HIT3 = 1366; // "Unluckily ... landed"
export const SLAB = 1481;                            // "flattens"
export const POOF = 1577, REPLAY = 1618, STOMP = 1704;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; name: string };
const S = (id: number, a: number, b: number, name: string, light: Light = "day", sunAz?: number, sunEl?: number): ShotDef => ({ id, a, b, name, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, 143, "hook"),
  S(2, 143, 238, "beach"),
  S(3, 238, 311, "smell"),
  S(4, 311, 399, "sign"),
  S(5, 399, 468, "dept"),
  S(6, 468, 572, "boulder"),
  S(7, 572, 653, "plan"),
  S(8, 653, 696, "gulls"),
  S(9, 696, 771, "crates"),
  S(10, 771, 933, "walt"),
  S(11, 933, 994, "retreat"),
  S(12, 994, 1043, "news", "day", 120),
  S(13, 1043, 1095, "plunger", "day", 120),
  S(14, 1095, 1150, "blast"),
  S(15, 1150, 1203, "cheer"),
  S(16, 1203, 1234, "sky"),
  S(17, 1234, 1384, "luckily"),
  S(18, 1384, 1434, "rain"),
  S(19, 1434, 1538, "car"),
  S(20, 1538, 1611, "poof", "golden", -40, 14),
  S(21, 1611, 1693, "replay", "golden", 60, 20),
  S(22, 1693, 1732, "stomp", "golden", -50, 16),
  S(23, 1732, 1827, "ketchup", "golden", -50, 16),
  S(24, 1827, 1881, "carcass"),
  S(25, 1881, 1928, "gone"),
  S(26, 1928, 2017, "owner"),
  S(27, 2017, TOTAL, "deal"),
];
/** crossfades (frames) at time changes */
export const XFADE: Record<number, number> = { 20: 8, 22: 8, 24: 8, 27: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
export type WhaleState = "whole" | "boulder" | "gone" | "blasted";
export type State = { whale: WhaleState; crates: number; blast: number; plunger: number; hookPlunger: boolean; carCrush: number; smoke: boolean };
/** everything the world needs to know in shot `id` at frame f. blast = frames since the charge went off (-1 = not yet) */
export const stateAt = (id: number, f: number): State => {
  const st: State = { whale: "whole", crates: 0, blast: -1, plunger: 0, hookPlunger: false, carCrush: 0, smoke: false };
  if (id === 1) { st.crates = 20; st.hookPlunger = true; st.plunger = smooth((f - HOOK_PUSH) / 5); st.blast = f >= HOOK_BOOM ? f - HOOK_BOOM : -1; }
  if (id === 6 && f >= BOULDER) st.whale = "boulder";
  if (id === 9) st.crates = Math.max(0, Math.min(20, Math.floor(((f - CRATES0) / (CRATES1 - CRATES0)) * 20) + 1));
  if (id >= 10 && id <= 13) st.crates = 20;
  if (id === 13) st.plunger = smooth((f - PLUNGE) / 6);
  if (id >= 14) { st.blast = f - BLAST; st.whale = "blasted"; st.smoke = true; }
  if (id === 14 && f < BLAST + 2) st.whale = "whole";
  if (id === 20) st.smoke = false;
  if (id === 21) { st.blast = f >= REPLAY ? f - REPLAY : -1; st.whale = f >= REPLAY + 2 ? "blasted" : "whole"; st.crates = f >= REPLAY ? 0 : 20; st.smoke = false; }
  if (id >= 19) st.carCrush = id === 27 ? 0 : easeOut((f - SLAB) / 4);
  if (id === 27) { st.whale = "whole"; st.blast = -1; st.smoke = false; }
  return st;
};

// ---------------- chunks ----------------
// Cartoon ballistics: every chunk leaves the whale at BLAST and lands at its own frame on its own spot; in between it
// rides a tall arc (the narration needs nine seconds of hang time between "goes up" and "landed").
export type Chunk = { to: V3; land: number; h: number; s: number; spin: number; from: V3 };
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const SLAB_AT: V3 = [CAR[0] - 0.1, PL + 1.33, CAR[2]];
export const HEAD_AT: V3 = [CROWD[0] + 0.1, 0, CROWD[2] - 0.2]; // the man in the middle (cast.ts seats the chunk on him)
export const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  const add = (x: number, z: number, land: number, s: number, h = 46) =>
    out.push({ to: [x, gy(x, z) + 0.22 * s, z], land, h, s, spin: 2 + 5 * hh(out.length, 3), from: [WH[0] + (hh(out.length, 5) - 0.5) * 6, WH[1] + 1.5, WH[2]] });
  add(SLAB_AT[0], SLAB_AT[2], SLAB, 1.0, 52); out[0].to = SLAB_AT;                    // 0: the slab for the car
  add(CROWD[0] - 1.9, CROWD[2] - 4.3, HIT1, 0.55);                                    // 1: lands in front of the crowd
  add(CROWD[0] + 2.6, CROWD[2] - 3.4, HIT2, 0.45);                                    // 2
  add(HEAD_AT[0], HEAD_AT[2], HIT3, 0.62); out[3].to = [HEAD_AT[0], gy(HEAD_AT[0], HEAD_AT[2]) + 1.24, HEAD_AT[2]]; // 3: on a head
  for (let i = 0; i < 26; i++) // the rain over the crowd and the dune (shots 17-18)
    add(CROWD[0] + (hh(i, 1) - 0.5) * 26, CROWD[2] + (hh(i, 2) - 0.6) * 20, HIT3 + 6 + Math.floor(hh(i, 4) * 84), 0.28 + 0.4 * hh(i, 6), 40 + 14 * hh(i, 7));
  for (let i = 0; i < 16; i++) // short lobs that stay on the beach (blast wide, aftermath)
    add(WH[0] + (hh(i, 8) - 0.5) * 44, WH[2] + 6 + hh(i, 9) * 34, BLAST + 40 + Math.floor(hh(i, 10) * 50), 0.3 + 0.5 * hh(i, 11), 14 + 12 * hh(i, 12));
  for (let i = 0; i < 8; i++) // more across the car park
    add(CAR[0] + (hh(i, 13) - 0.5) * 30, CAR[2] + (hh(i, 14) - 0.5) * 16, HIT3 + 20 + Math.floor(hh(i, 15) * 80), 0.3 + 0.35 * hh(i, 16), 48);
  return out;
})();
/** position of chunk c at frame f (after landing it stays put), plus whether it has landed */
export const chunkAt = (c: Chunk, f: number): { p: V3; landed: boolean; u: number } => {
  const u = (f - BLAST) / (c.land - BLAST);
  if (u >= 1) return { p: c.to, landed: true, u: 1 };
  const k = Math.max(0, u), e = 1 - (1 - k) ** 1.6; // fast away from the blast, hanging at the top
  const up = 4 * c.h * (k < 0.5 ? easeOut(k * 2) * 0.25 : 0.25 * (1 - ((k - 0.5) * 2) ** 2.2));
  return { p: [lerp(c.from[0], c.to[0], e), lerp(c.from[1], c.to[1], e) + up, lerp(c.from[2], c.to[2], e)], landed: false, u: k };
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

const C = CROWD, cy = C[1];
const F: Record<string, (f: number) => Shot> = {
  // 1 hook: whale + stack + the man at the plunger -> the dead eye -> the stack
  h1: (f) => dolly([12.5, 1.9, 19.5], [0.5, 1.7, 12.2], pushK(f, 0, 0.002), { fov: 48 }),
  h2: (f) => dolly([8.4, 1.5, 16.6], [5.0, 1.45, 11.2], pushK(f, 85, 0.003), { fov: 36, roll: -0.04 }),
  h3: (f) => dolly([3.6, 1.5, 19.2], [CRATE[0] + 1.2, CRATE[1] + 1.0, CRATE[2]], pushK(f, 107, 0.002, 0.007, 24), { fov: 40, roll: 0.04 }),
  // 2 beach aerial -> lower
  b1: (f) => zoom([-24, 15, 38], [0, 0.5, 9], 44, pushK(f, 143, 0.002)),
  b2: (f) => zoom([-13, 5.2, 27], [0.5, 1.2, 10], 44, pushK(f, 187, 0.002)),
  // 3 crowd holding their noses (lens between the whale and the crowd)
  s1: (f) => dolly([0.8, 1.75, 13.6], [0, 1.6, 18], pushK(f, 238, 0.0025), { fov: 42 }),
  s2: (f) => dolly([-1.1, 1.72, 15.4], [-1.5, 1.66, 18], pushK(f, 284, 0.002, 0.006, 24), { fov: 32, roll: 0.04 }),
  // 4 the highway sign in the sand
  g1: (f) => dolly([-12.6, 0.75, 19.4], [SIGN[0] + 0.6, SIGN[1] + 2.0, SIGN[2]], pushK(f, 311, 0.002), { fov: 42 }),
  g2: (f) => dolly([-11.4, 1.3, 18.6], [SIGN[0] + 0.3, SIGN[1] + 2.25, SIGN[2]], pushK(f, 349, 0.002), { fov: 36, roll: -0.04 }),
  // 5 the highway department
  d1: (f) => dolly([-1.2, 1.5, 12.9], [-1.5, 1.5, 17.2], pushK(f, 399, 0.0025), { fov: 44 }),
  // 6 the engineer -> what he sees
  e1: (f) => dolly([-1.2, 1.72, 14.4], [-1.5, 1.7, 17.2], pushK(f, 468, 0.003), { fov: 34 }),
  e2: (f) => dolly([-7.5, 1.9, 21.5], [1.2, 1.5, 10.2], pushK(f, 506, 0.0015, 0.005, 30), { fov: 42 }),
  // 7 the plan (a tall board, read top to bottom)
  p1: (f) => dolly([EASEL[0] + 0.15, EASEL[1] + 2.6, EASEL[2] + 3.3], [EASEL[0], EASEL[1] + 2.62, EASEL[2]], pushK(f, 572, 0.002), { fov: 30 }),
  p2: (f) => dolly([EASEL[0] + 0.05, EASEL[1] + 2.0, EASEL[2] + 3.3], [EASEL[0], EASEL[1] + 2.0, EASEL[2]], pushK(f, 606, 0.002), { fov: 30, roll: -0.03 }),
  p3: (f) => dolly([EASEL[0] - 0.1, EASEL[1] + 1.4, EASEL[2] + 3.3], [EASEL[0], EASEL[1] + 1.4, EASEL[2]], pushK(f, 636, 0.002), { fov: 30, roll: 0.03 }),
  // 8 the seagulls
  u1: (f) => dolly([LOG[0] + 0.3, LOG[1] + 1.0, LOG[2] + 4.6], [LOG[0], LOG[1] + 0.95, LOG[2]], pushK(f, 653, 0.003), { fov: 32 }),
  // 9 the stack grows
  c1: (f) => dolly([-6.2, 1.5, 19.6], [CRATE[0] + 0.4, CRATE[1] + 1.0, CRATE[2]], pushK(f, 696, 0.0025), { fov: 40, roll: -0.03 }),
  // 10 the man who knows
  w1: (f) => dolly([WALT0[0] + 0.5, WALT0[1] + 1.68, WALT0[2] - 4.0], o(WALT0, 0, 1.6, 0), pushK(f, 771, 0.002), { fov: 38 }),
  w2: (f) => dolly([WALT0[0] + 0.95, WALT0[1] + 1.62, WALT0[2] - 4.7], o(WALT0, 0.85, 1.62, 0), pushK(f, 850, 0.002), { fov: 40 }),
  w3: (f) => dolly([WALT0[0] + 0.25, WALT0[1] + 1.72, WALT0[2] - 2.9], o(WALT0, 0, 1.68, 0), pushK(f, 905, 0.0015, 0.006, 26), { fov: 30, roll: 0.03 }),
  // 11 everyone walks up the dunes
  r1: (f) => zoom([-11, 7.5, -8], [3, 3.4, 62], 46, pushK(f, 933, 0.002)),
  // 12 the news crew (the beach far behind)
  n1: (f) => dolly([REP[0] + 0.5, REP[1] + 1.66, REP[2] + 4.3], o(REP, -0.45, 1.5, 0), pushK(f, 994, 0.0025), { fov: 40 }),
  // 13 the plunger
  k1: (f) => dolly([PLG[0] - 0.2, PLG[1] + 1.25, PLG[2] + 4.4], o(PLG, -0.3, 1.0, 0), pushK(f, 1043, 0.002, 0.007, 22), { fov: 36 }),
  k2: (f) => dolly([PLG[0] + 0.5, PLG[1] + 0.75, PLG[2] + 2.3], o(PLG, 0, 0.55, 0), pushK(f, 1066, 0.004), { fov: 32, roll: -0.04 }),
  // 14 the blast
  x1: (f) => zoom([-34, 8.5, 58], [1, 10.5, 10], 50, pushK(f, 1095, 0.0012)),
  // 15 the crowd cheers, then looks up
  q1: (f) => dolly([C[0] + 0.6, cy + 1.5, C[2] - 7.2], [C[0], cy + 1.62, C[2]], pushK(f, 1150, 0.002), { fov: 42 }),
  q2: (f) => dolly([C[0] + 0.3, cy + 1.2, C[2] - 5.4], [C[0], cy + 1.72, C[2]], pushK(f, 1190, 0.003), { fov: 40, roll: -0.04 }),
  // 16 what they see
  y1: (f) => zoom([C[0], cy + 1.7, C[2] - 1], [C[0] + 2, cy + 46, C[2] - 52], 52, pushK(f, 1203, 0.004), { roll: 0.05 }),
  // 17 luckily / unluckily: one camera
  l1: (f) => dolly([C[0] + 0.4, cy + 1.55, C[2] - 6.6], [C[0], cy + 1.5, C[2]], pushK(f, 1234, 0.0018), { fov: 42, roll: -0.03 }),
  l2: (f) => dolly([C[0] - 0.3, cy + 1.5, C[2] - 5.4], [C[0], cy + 1.5, C[2]], pushK(f, 1306, 0.0018), { fov: 40, roll: 0.04 }),
  // 18 the rain
  m1: (f) => dolly([C[0] - 11, cy + 5.2, C[2] - 13], [C[0] + 0.5, cy + 0.9, C[2] + 0.5], pushK(f, 1384, 0.002), { fov: 46, roll: 0.03 }),
  // 19 the car
  a1: (f) => dolly([CAR[0] - 5.6, PL + 1.25, CAR[2] + 6.2], [CAR[0] - 0.2, PL + 0.95, CAR[2]], pushK(f, 1434, 0.002), { fov: 40 }),
  a2: (f) => dolly([CAR[0] - 3.9, PL + 0.7, CAR[2] + 5.0], [CAR[0] - 0.1, PL + 1.0, CAR[2]], pushK(f, 1510, 0.002), { fov: 38, roll: -0.04 }),
  // 20 "doesn't make things disappear"
  t1: (f) => dolly([-5.3, 2.05, 15.6], [-5.6, 2.25, 20], pushK(f, 1538, 0.002), { fov: 42 }),
  // 21 the replay from above
  v1: (f) => dolly([0, 50, 37], [0, 0, 14], pushK(f, 1611, 0.0012), { fov: 44 }),
  v2: (f) => dolly([0, 62, 44], [0, 0, 16], pushK(f, 1640, 0.001), { fov: 46, roll: 0.03 }),
  // 22 the ketchup packet
  j1: (f) => dolly([KET[0] + 0.75, PL + 0.3, KET[2] + 1.5], [KET[0], PL + 0.14, KET[2]], pushK(f, 1693, 0.003), { fov: 34 }),
  // 23 it is on everybody
  z1: (f) => dolly([KET[0] + 1.9, PL + 1.6, KET[2] + 4.2], [KET[0] + 1.9, PL + 1.55, KET[2]], pushK(f, 1732, 0.002), { fov: 38 }),
  z2: (f) => dolly([KET[0] + 1.2, PL + 1.9, KET[2] + 7.6], [KET[0] + 1.4, PL + 1.3, KET[2]], pushK(f, 1783, 0.0012), { fov: 42 }),
  // 24 the carcass
  i1: (f) => dolly([-13, 2.3, 23], [1, 1.3, 10.4], pushK(f, 1827, 0.002), { fov: 44 }),
  // 25 no gulls
  u2: (f) => dolly([LOG[0] + 0.3, LOG[1] + 1.0, LOG[2] + 4.6], [LOG[0], LOG[1] + 1.1, LOG[2]], pushK(f, 1881, 0.002), { fov: 34, roll: 0.03 }),
  // 26 the owner
  o1: (f) => dolly([CAR[0] - 5.4, PL + 1.5, CAR[2] + 6.6], [CAR[0] - 1.2, PL + 1.15, CAR[2] + 0.6], pushK(f, 1928, 0.002), { fov: 42 }),
  o2: (f) => dolly([CAR[0] - 3.2, PL + 1.72, CAR[2] + 4.6], [CAR[0] - 2.9, PL + 1.66, CAR[2] + 1.9], pushK(f, 1963, 0.0015, 0.005, 26), { fov: 32, roll: -0.03 }),
  // 27 the sale
  f1: (f) => dolly([DEAL[0] - 1.2, PL + 1.5, DEAL[2] + 6.8], [DEAL[0] - 0.9, PL + 1.5, DEAL[2] + 1.2], pushK(f, 2017, 0.002), { fov: 44 }),
  f2: (f) => zoom([DEAL[0] - 0.6, PL + 1.3, DEAL[2] + 7.4], [DEAL[0], PL + 5.0, DEAL[2] - 2.5], 40, pushK(f, 2052, 0.0022)),
};
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: F.h1 }, { f: 85, cut: true, s: F.h2 }, { f: 100, dur: 28, s: F.h3 }],
  2: [{ f: 143, s: F.b1 }, { f: 180, dur: 30, s: F.b2 }],
  3: [{ f: 238, s: F.s1 }, { f: 284, cut: true, s: F.s2 }],
  4: [{ f: 311, s: F.g1 }, { f: 340, dur: 24, s: F.g2 }],
  5: [{ f: 399, s: F.d1 }, { f: 430, dur: 20, s: rolled(F.d1, 0.035) }],
  6: [{ f: 468, s: F.e1 }, { f: 506, cut: true, s: F.e2 }, { f: 540, dur: 18, s: rolled(F.e2, -0.04) }],
  7: [{ f: 572, s: F.p1 }, { f: 598, dur: 22, s: F.p2 }, { f: 630, dur: 22, s: F.p3 }],
  8: [{ f: 653, s: F.u1 }, { f: 668, dur: 20, s: rolled(F.u1, 0.04) }],
  9: [{ f: 696, s: F.c1 }, { f: 735, dur: 24, s: rolled(F.c1, 0.035) }],
  10: [{ f: 771, s: F.w1 }, { f: 850, cut: true, s: F.w2 }, { f: 905, cut: true, s: F.w3 }],
  11: [{ f: 933, s: F.r1 }],
  12: [{ f: 994, s: F.n1 }, { f: 1014, dur: 20, s: rolled(F.n1, -0.035) }],
  13: [{ f: 1043, s: F.k1 }, { f: 1066, cut: true, s: F.k2 }],
  14: [{ f: 1095, s: F.x1 }],
  15: [{ f: 1150, s: F.q1 }, { f: 1182, dur: 22, s: F.q2 }],
  16: [{ f: 1203, s: F.y1 }],
  17: [{ f: 1234, s: F.l1 }, { f: 1304, dur: 20, s: F.l2 }],
  18: [{ f: 1384, s: F.m1 }],
  19: [{ f: 1434, s: F.a1 }, { f: 1500, dur: 26, s: F.a2 }],
  20: [{ f: 1538, s: F.t1 }, { f: 1580, dur: 20, s: rolled(F.t1, 0.035) }],
  21: [{ f: 1611, s: F.v1 }, { f: 1626, dur: 34, s: F.v2 }],
  22: [{ f: 1693, s: F.j1 }],
  23: [{ f: 1732, s: F.z1 }, { f: 1774, dur: 30, s: F.z2 }],
  24: [{ f: 1827, s: F.i1 }, { f: 1850, dur: 20, s: rolled(F.i1, -0.035) }],
  25: [{ f: 1881, s: F.u2 }],
  26: [{ f: 1928, s: F.o1 }, { f: 1953, dur: 30, s: F.o2 }],
  27: [{ f: 2017, s: F.f1 }, { f: 2040, dur: 32, s: F.f2 }],
};

// impact kicks: [frame, gain]; the image offset flips sign every frame and decays over 7 f
const KICKS: [number, number][] = [[HOOK_BOOM, 1.6], [BOULDER, 0.5], [PLUNGE + 5, 0.6], [BLAST, 2.4], [BLAST + 7, 1.2], [HIT1, 0.8], [HIT2, 0.7], [HIT3, 1.6],
  [1392, 0.6], [1404, 0.6], [1417, 0.7], [SLAB, 2.2], [REPLAY, 1.0], [STOMP, 1.2],
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => [CRATES0 + 2 + i * 9, 0.25] as [number, number])];
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
  { f: 0, cInf: 5, focus: () => [4.6, 1.5, 16.6] },
  { f: 85, cInf: 14 }, { f: 100, dur: 28, cInf: 12 },
  { f: 143, cInf: 0 },
  { f: 238, cInf: 11, focus: () => [0, 1.7, 17.4] }, { f: 284, cInf: 14, focus: () => [-1.5, 1.7, 17.4] },
  { f: 311, cInf: 12 }, { f: 399, cInf: 10, focus: () => [-1.5, 1.6, 17.2] },
  { f: 468, cInf: 14 }, { f: 506, cInf: 0 },
  { f: 572, cInf: 10 }, { f: 653, cInf: 14 }, { f: 696, cInf: 6 },
  { f: 771, cInf: 12, focus: () => o(WALT0, 0, 1.6, 0) }, { f: 850, cInf: 11, focus: () => o(WALT0, 0.6, 1.6, 0) }, { f: 905, cInf: 15, focus: () => o(WALT0, 0, 1.6, 0) },
  { f: 933, cInf: 0 },
  { f: 994, cInf: 12, focus: () => o(REP, 0, 1.6, 0) }, { f: 1043, cInf: 9 }, { f: 1066, cInf: 13 },
  { f: 1095, cInf: 0 },
  { f: 1150, cInf: 10, focus: () => [C[0], cy + 1.6, C[2] - 1] }, { f: 1203, cInf: 0 },
  { f: 1234, cInf: 12, focus: () => [C[0], cy + 1.6, C[2] - 1] },
  { f: 1384, cInf: 0 },
  { f: 1434, cInf: 9 }, { f: 1538, cInf: 11, focus: () => [-5.6, 1.9, 20] }, { f: 1611, cInf: 0 },
  { f: 1693, cInf: 15 }, { f: 1732, cInf: 11, focus: () => [KET[0] + 1.9, PL + 1.6, KET[2]] }, { f: 1774, dur: 30, cInf: 5, focus: () => [KET[0] + 1.9, PL + 1.6, KET[2]] },
  { f: 1827, cInf: 5 }, { f: 1881, cInf: 14 },
  { f: 1928, cInf: 8 }, { f: 1953, dur: 30, cInf: 14, focus: () => [CAR[0] - 2.9, PL + 1.66, CAR[2] + 1.9] },
  { f: 2017, cInf: 8, focus: () => [DEAL[0] - 0.9, PL + 1.6, DEAL[2] + 1.2] }, { f: 2040, dur: 32, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
