// "Niagara Barrel" timeline: geography of the Horseshoe Falls set, shot table and camera keys.
// GATE 1 (look development): the shot table below holds the staged preview shots A-F (+G) with provisional frame
// ranges taken from SHOTLIST.md. Gate 2 re-times every shot to the recorded voice (words.json) before animating.
// Camera grammar is the bridge short's (templates/bridge/story.ts): smootherstep glides, creeping push-ins on holds,
// cuts on big reframes, 7-frame flip kicks on impacts.
export const FPS = 30;
export type V3 = [number, number, number];

// ---------------- geography (metres; +z = downstream; y = 0 at the crest of the falls) ----------------
export const D0 = 0;                // the crest (lip) height; build.ts helpers default to it
export const R = 80;                // horseshoe lip radius around the bowl centre (0, 0): ~160 m across (real: ~670 m, compressed)
export const PHI_M = (100 * Math.PI) / 180; // the lip runs from -100 deg to +100 deg (apex upstream at -z)
export const DROP = 51;             // 167 ft
export const POOL_Y = -DROP;        // plunge pool / lower river surface
export const LAND_Y = 3.2;          // banks above the upper river
export const CH_W = 92;             // upper channel half width
/** a point on the lip at angle phi (0 = apex, upstream) */
export const lip = (phi: number): V3 => [R * Math.sin(phi), 0, -R * Math.cos(phi)];
/** unit vector pointing upstream (out of the bowl) at angle phi; the curtain falls the other way */
export const outward = (phi: number): [number, number] => [Math.sin(phi), -Math.cos(phi)];
/** upper river surface height at distance d upstream of the lip (gentle rapids slope + standing waves added in falls.ts) */
export const riverY = (d: number) => 0.006 * Math.max(0, d) - 0.25 * Math.exp(-Math.max(0, d) / 3);
/** gorge rims, left (Canadian, -x) and right (Goat Island / American, +x), from the lip ends downstream */
export const RIM_L: [number, number][] = [[-78.8, 13.9], [-76, 40], [-73, 80], [-71, 140], [-69, 220], [-67, 330], [-64, 520], [-62, 900]];
export const RIM_R: [number, number][] = RIM_L.map(([x, z]) => [-x, z]);
/** upper channel banks from far upstream to the lip ends */
export const BANK_L: [number, number][] = [[-CH_W, -700], [-CH_W, -120], [-90, -60], [-87, -20], [-83, 0], [-78.8, 13.9]];
export const BANK_R: [number, number][] = BANK_L.map(([x, z]) => [-x, z]);

// ---------------- staged places ----------------
const at = (phi: number, d: number, y = 0): V3 => { const l = lip(phi), o = outward(phi); return [l[0] + o[0] * d, y, l[2] + o[1] * d]; };
export const RUN_PHI = (-55 * Math.PI) / 180; // the barrel's line toward the brink (Canadian half of the horseshoe)
export const BARREL_HOOK: V3 = at(RUN_PHI, 13, riverY(13) - 0.62);
export const BARREL_BRINK: V3 = (() => { const l = lip(RUN_PHI), o = outward(RUN_PHI); return [l[0] - o[0] * 2.2, -1.6, l[2] - o[1] * 2.2]; })();
export const ANNIE_BANK: V3 = [-79.6, LAND_Y, 47];         // Table Rock promenade, the whole horseshoe behind her
export const DOCK: V3 = [-CH_W, LAND_Y, -205];             // timber landing upstream (launch)
export const SHORE: V3 = [-56, POOL_Y + 0.45, 128];      // pebble shore of the lower river (cat test / rescue)

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; key: string; a: number; b: number; light: Light; still: number; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, key: "A_hook", a: 0, b: 120, light: "day", still: 40, sunAz: 120, sunEl: 40 },
  { id: 2, key: "B_annie", a: 120, b: 270, light: "day", still: 200, sunAz: 140, sunEl: 34 },
  { id: 3, key: "C_barrel", a: 270, b: 420, light: "day", still: 330, sunAz: 135, sunEl: 32 },
  { id: 4, key: "D_cat", a: 420, b: 600, light: "day", still: 500, sunAz: 150, sunEl: 38 },
  { id: 5, key: "E_plunge", a: 600, b: 870, light: "day", still: 720, sunAz: 120, sunEl: 30 },
  { id: 6, key: "F_rescue", a: 870, b: 1020, light: "day", still: 940, sunAz: 140, sunEl: 30 },
  { id: 7, key: "G_purse", a: 1020, b: 1260, light: "day", still: 1150, sunAz: 145, sunEl: 30 },
];
export const TOTAL = 1260;
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// A: high behind the barrel riding the rapids; the brink, the far curtains and the mist column ahead
const oA = outward(RUN_PHI);
// (the Table Rock view: across the horseshoe at the far curtains, Goat Island on top)
const TGT_A: V3 = [lip(0.8)[0], -24, lip(0.8)[2]]; // the far (Goat Island) curtains
const dirA = (() => { const dx = TGT_A[0] - BARREL_HOOK[0], dz = TGT_A[2] - BARREL_HOOK[2], n = Math.hypot(dx, dz); return [dx / n, dz / n]; })();
const LOOK_A: V3 = add(BARREL_HOOK, [dirA[0] * 24, -4.2, dirA[1] * 24]); // on the line to the far curtains, 24 m ahead
const SA = (f: number) => dolly(add(BARREL_HOOK, [-dirA[0] * 9, 6.2, -dirA[1] * 9]), LOOK_A, pushK(f, 0, 0.002), { fov: 62, roll: -0.03 });
// B: Annie close-up on the promenade, falls and mist behind her
const HS: V3 = [-5, -14, -45]; // the horseshoe, seen from Table Rock
const dirB = (() => { const dx = HS[0] - ANNIE_BANK[0], dz = HS[2] - ANNIE_BANK[2], n = Math.hypot(dx, dz); return [dx / n, dz / n]; })();
const rB: [number, number] = [-dirB[1], dirB[0]]; // screen right when looking at the falls
const SB = (f: number) => dolly([ANNIE_BANK[0] - dirB[0] * 2.15, ANNIE_BANK[1] + 1.62, ANNIE_BANK[2] - dirB[1] * 2.15],
  [ANNIE_BANK[0] - rB[0] * 0.12, ANNIE_BANK[1] + 1.3, ANNIE_BANK[2] - rB[1] * 0.12], pushK(f, 120, 0.0018), { fov: 38 });
// C: low close-up of the barrel on the landing, Annie beside it for scale, rapids behind
export const DOCK_Y = LAND_Y - 0.6; // deck top of the landing
const BARREL_DOCK: V3 = [DOCK[0] + 2.4, DOCK_Y, DOCK[2] + 0.2];
export const BARREL_AT_DOCK = BARREL_DOCK;
const SC = (f: number) => dolly([BARREL_DOCK[0] - 1.55, BARREL_DOCK[1] + 0.75, BARREL_DOCK[2] - 3.0], [BARREL_DOCK[0] + 0.35, BARREL_DOCK[1] + 1.0, BARREL_DOCK[2] + 0.1], pushK(f, 270, 0.002), { fov: 46, roll: 0.02 });
// D: medium on the shore, the cat glaring from the barrel rim, Annie delighted, falls far behind
export const BARREL_SHORE: V3 = [SHORE[0] + 0.3, SHORE[1], SHORE[2] - 0.4];
const SD = (f: number) => dolly([BARREL_SHORE[0] + 0.25, SHORE[1] + 1.35, BARREL_SHORE[2] + 5.6], [BARREL_SHORE[0] - 0.05, SHORE[1] + 1.05, BARREL_SHORE[2] - 1], pushK(f, 420, 0.002), { fov: 44 });
// E: under the brink, looking up as the barrel tips over the lip into the sheet
const tE: [number, number] = [Math.cos(RUN_PHI), Math.sin(RUN_PHI)]; // along the lip
// high angle from over the bowl: the barrel tips off the lip, the sheet drops away under it into foam and mist
// side profile from over the bowl near the Canadian end: the barrel tips off the lip, the sheet drops away under it,
// the rest of the horseshoe curves off behind into the mist
const SE = (f: number) => { const c = add(BARREL_BRINK, [-3.9, 3.7, 8.8]); return dolly(c, add(BARREL_BRINK, [4.5, -5.2, -4]), pushK(f, 600, 0.001), { fov: 60, roll: 0.06 }); };
// F: Annie up out of the barrel at the shore, dazed; a riverman beside her, the boat and the falls behind
export const BARREL_RESCUE: V3 = [SHORE[0] - 0.2, SHORE[1], SHORE[2] + 9];
const SF = (f: number) => dolly([BARREL_RESCUE[0] + 0.7, SHORE[1] + 1.9, BARREL_RESCUE[2] + 4.6], [BARREL_RESCUE[0] + 0.15, SHORE[1] + 1.55, BARREL_RESCUE[2] - 0.5], pushK(f, 870, 0.002), { fov: 42 });
// G: deadpan payoff, the empty purse held up, two coins on the barrel lid
const SG = (f: number) => dolly([BARREL_RESCUE[0] + 0.75, SHORE[1] + 1.15, BARREL_RESCUE[2] + 4.4], [BARREL_RESCUE[0] + 0.25, SHORE[1] + 1.0, BARREL_RESCUE[2] + 1.2], pushK(f, 1020, 0.0015), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: SA }], 2: [{ f: 120, s: SB }], 3: [{ f: 270, s: SC }], 4: [{ f: 420, s: SD }],
  5: [{ f: 600, s: SE }], 6: [{ f: 870, s: SF }], 7: [{ f: 1020, s: SG }],
};
const KICKS: [number, number][] = [];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) { const n = Math.floor((t - t0) * FPS + 1e-6); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                                                      // A: establishing, sharp
  { f: 120, cInf: 10, focus: () => [ANNIE_BANK[0], ANNIE_BANK[1] + 1.3, ANNIE_BANK[2]] }, // B: eyes
  { f: 270, cInf: 11, focus: () => [BARREL_DOCK[0], BARREL_DOCK[1] + 0.9, BARREL_DOCK[2]] }, // C: barrel
  { f: 420, cInf: 10, focus: () => [BARREL_SHORE[0], SHORE[1] + 1.35, BARREL_SHORE[2]] }, // D: the cat
  { f: 600, cInf: 0 },                                                                    // E: plunge, readable
  { f: 870, cInf: 10, focus: () => [BARREL_RESCUE[0], SHORE[1] + 2.0, BARREL_RESCUE[2]] }, // F: Annie's eyes
  { f: 1020, cInf: 12, focus: () => [BARREL_RESCUE[0] + 0.1, SHORE[1] + 1.45, BARREL_RESCUE[2] + 1.3] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)], k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
