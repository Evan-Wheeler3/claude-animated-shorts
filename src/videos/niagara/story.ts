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

// ---------------- narration clock (videos/niagara-barrel/voice/words.json, the owner's cloned voice) ----------------
// Every frame below comes from a word onset: F(seconds) = frame. Reactions land 0-3 frames before their word.
export const F = (sec: number) => Math.round(sec * FPS);
export const W = {
  falls: 3.49, inside: 3.82, barrel: 4.55, annie: 5.83, plan: 7.71, rich: 8.19, first: 8.62, cat: 10.25, by: 10.62, alive: 12.05,
  so: 12.5, climbed: 12.97, strapped: 14.02, lid: 15.78, sealed: 15.94, then: 16.42, edge: 18.5, down: 18.96, more: 19.75, feet: 21.01,
  when: 21.54, finally: 22.2, opened: 22.59, annie2: 23.58, alive2: 24.03, survived: 24.77, minor: 26.64, but: 27.46, problem: 28.25,
  fortune: 29.88, and: 30.3, barely: 30.7, money: 31.68, turns: 32.14, waterfall: 33.13, rich2: 34.86, it: 35.26,
};
export const TOTAL = F(35.29) + 4; // the video ends on the last word

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; key: string; a: number; b: number; light: Light; still: number; sunAz?: number; sunEl?: number };
const SH: [string, number, number, number, number][] = [ // key, start frame, still frame, sun az, sun el
  ["hook_wide", 0, 23, 125, 42], ["hook_barrel", 50, 94, 120, 40], ["barrel_cu", F(W.inside) - 2, F(4.63), 120, 40],
  ["annie", F(5.02), F(8.26), 140, 34], ["cat_in", F(W.first) - 2, F(10.09), 135, 34], ["cat_alive", F(W.by) - 2, F(12.13), 150, 38],
  ["climb", F(W.so) - 2, F(13.66), 135, 32], ["strap", F(W.strapped) - 2, F(15.22), 135, 32], ["seal", F(15.4), F(16.03), 135, 32],
  ["current", F(W.then) - 2, F(17.62), 120, 36], ["brink", F(18.62), F(19.11), 120, 30], ["drop", F(19.72), F(20.95), 120, 34],
  ["rescue_open", F(W.finally) - 2, F(22.8), 140, 30], ["rescue_alive", F(23.48), F(25.72), 140, 30], ["problem", F(27.55), F(28.33), 145, 30],
  ["fortune", F(28.6), F(29.94), 150, 32], ["purse", F(W.and) - 2, F(32.88), 145, 30],
];
export const SHOTS: ShotDef[] = SH.map(([key, a, still, sunAz, sunEl], i) => ({ id: i + 1, key, a, b: i + 1 < SH.length ? SH[i + 1][1] : TOTAL, light: "day", still, sunAz, sunEl }));
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const shotByKey = (k: string) => SHOTS.find((s) => s.key === k)!;
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---------------- the barrel's run (one continuous story function) ----------------
// river: distance upstream of the lip on the RUN_PHI line; sheet: seconds since it left the lip (ballistic sheet,
// falls.ts curtainAt); pool: bobbing in the foam. The world reads the water surface for its height.
export const LIP_F = F(W.down) - 2;   // the barrel tips over the lip on "down"
export const RIVER_V = 9;             // m/s near the brink (the upper rapids run ~8-10 m/s)
export const SHEET_T = (-3.6 + Math.sqrt(3.6 * 3.6 + 2 * 9.8 * (DROP + 1.5 + 0.25))) / 9.8; // time to the pool along the sheet
export const IMPACT_F = LIP_F + Math.round(SHEET_T * FPS);
export type BarrelRun = { mode: "river"; d: number; phi: number; t: number } | { mode: "sheet"; tl: number; t: number } | { mode: "pool"; tp: number; t: number };
export const barrelRun = (key: string, f: number): BarrelRun => {
  const t = f / FPS;
  if (key === "hook_wide" || key === "hook_barrel") return { mode: "river", d: 22 - 3.2 * (f / FPS), phi: RUN_PHI, t }; // flash-forward, slowed for readability
  if (key === "barrel_cu") return { mode: "river", d: 30, phi: RUN_PHI + 0.25, t }; // upstream, mid-channel
  if (f < LIP_F) return { mode: "river", d: (RIVER_V * (LIP_F - f)) / FPS, phi: RUN_PHI, t };
  if (f < IMPACT_F) return { mode: "sheet", tl: (f - LIP_F) / FPS, t };
  return { mode: "pool", tp: (f - IMPACT_F) / FPS, t };
};

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
/** creeping push since f0 (bridge grammar 0.15-0.35 %/f), with an optional punch of `punch` per frame for n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, pf = 0, n = 30) => {
  let s = rate * Math.max(0, f - f0);
  if (punch > rate && f > pf) for (let i = 0; i < Math.min(f - pf, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** where the barrel is (x, z; y approximated without the water mesh; world.ts uses the measured surface) */
export const barrelXZ = (key: string, f: number): V3 => {
  const r = barrelRun(key, f);
  if (r.mode === "river") return at(r.phi, Math.max(0, r.d), riverY(Math.max(0, r.d)));
  return [...lip(RUN_PHI)] as V3;
};

const oA = outward(RUN_PHI), tE: [number, number] = [Math.cos(RUN_PHI), Math.sin(RUN_PHI)];
const TGT_A: V3 = [lip(0.8)[0], -24, lip(0.8)[2]]; // the far (Goat Island) curtains
const dirTo = (from: V3, to: V3): [number, number] => { const dx = to[0] - from[0], dz = to[2] - from[2], n = Math.hypot(dx, dz); return [dx / n, dz / n]; };
// 1 hook_wide: high over the gorge, the whole horseshoe and its mist; slow zoom toward the Canadian end where the barrel rides
const S_hookWide = (f: number) => zoom([-70, 46, 150], [-20, -14, -40], 52, pushK(f, 0, 0.0035));
// 2 hook_barrel: Table Rock view across the bowl, the camera rides with the barrel (approved A framing)
const S_hookBarrel = (f: number) => { const b = barrelXZ("hook_barrel", f), d = dirTo(b, TGT_A); return dolly(add(b, [-d[0] * 9, 6.2, -d[1] * 9]), add(b, [d[0] * 24, -4.2, d[1] * 24]), pushK(f, 66, 0.002), { fov: 62, roll: -0.03 }); };
// 3 barrel_cu: water-level close-up of the bobbing barrel, the brink and mist behind it
const S_barrelCu = (f: number) => { const b = barrelXZ("barrel_cu", f), d = dirTo(b, lip(RUN_PHI)); return dolly(add(b, [-d[0] * 2.9 + d[1] * 0.4, 1.15, -d[1] * 2.9 - d[0] * 0.4]), add(b, [0, 0.62, 0]), pushK(f, F(W.inside), 0.003), { fov: 40, roll: 0.03 }); };
// 4 annie: Table Rock close-up (approved B), punch-in on "rich"
const HS: V3 = [-5, -14, -45];
const dirB = dirTo(ANNIE_BANK, HS), rB: [number, number] = [-dirB[1], dirB[0]];
const S_annie = (f: number) => dolly([ANNIE_BANK[0] - dirB[0] * 2.15, ANNIE_BANK[1] + 1.62, ANNIE_BANK[2] - dirB[1] * 2.15],
  [ANNIE_BANK[0] - rB[0] * 0.12, ANNIE_BANK[1] + 1.3, ANNIE_BANK[2] - rB[1] * 0.12], pushK(f, F(5.9), 0.0018, 0.006, F(W.plan) - 4, 24), { fov: 38 });
// 5/7/8/9 at the landing (approved C framing family). BARREL_AT_DOCK is the barrel's x/z on the dock.
export const DOCK_Y = LAND_Y - 0.6;
export const BARREL_AT_DOCK: V3 = [DOCK[0] + 2.4, DOCK_Y, DOCK[2] + 0.2];
const BD = BARREL_AT_DOCK;
const S_catIn = (f: number) => dolly([BD[0] - 2.6, BD[1] + 1.7, BD[2] - 4.3], [BD[0] - 0.1, BD[1] + 1.0, BD[2] - 0.1], pushK(f, F(W.first), 0.0025), { fov: 46 });
const S_climb = (f: number) => dolly([BD[0] - 1.2, BD[1] + 1.9, BD[2] - 2.9], [BD[0] + 0.05, BD[1] + 1.5, BD[2]], pushK(f, F(W.so), 0.0025), { fov: 40, roll: 0.02 });
const S_strap = (f: number) => dolly([BD[0] - 0.75, BD[1] + 2.0, BD[2] - 1.75], [BD[0], BD[1] + 1.72, BD[2]], pushK(f, F(W.strapped), 0.003), { fov: 38, roll: -0.03 });
const S_seal = (f: number) => dolly([BD[0] - 1.9, BD[1] + 1.0, BD[2] - 3.1], [BD[0] + 0.35, BD[1] + 1.05, BD[2] - 0.2], pushK(f, F(15.3), 0.002), { fov: 48, roll: 0.03 });
// 6 cat_alive: the shore (approved D), push on "alive"
export const BARREL_SHORE: V3 = [SHORE[0] + 0.3, SHORE[1], SHORE[2] - 0.4];
const S_catAlive = (f: number) => dolly([BARREL_SHORE[0] + 0.25, SHORE[1] + 1.35, BARREL_SHORE[2] + 5.6], [BARREL_SHORE[0] - 0.05, SHORE[1] + 1.05, BARREL_SHORE[2] - 1], pushK(f, F(W.by), 0.002, 0.006, F(W.alive) - 6, 22), { fov: 44 });
// 10 current: tracking beside and behind the barrel at water level, the brink ahead
const S_current = (f: number) => {
  const b = barrelXZ("current", f), fw: [number, number] = [-oA[0], -oA[1]], side: [number, number] = [fw[1], -fw[0]];
  return { pos: add(b, [-fw[0] * 4.2 + side[0] * 1.6, 1.5, -fw[1] * 4.2 + side[1] * 1.6]), look: add(b, [fw[0] * 3.0, 0.1, fw[1] * 3.0]), fov: 50, roll: 0.03 };
};
// 11 brink: side profile over the bowl (approved E framing family); tilts down after the barrel as it goes
const S_brink = (f: number) => {
  const c = add(BARREL_BRINK, [-3.9, 3.7, 8.8]), u = smooth((f - LIP_F) / 26);
  return dolly(c, add(BARREL_BRINK, [4.5 - 1.5 * u, -5.2 - 9 * u, -4 + 1.5 * u]), pushK(f, F(18.4), 0.0012), { fov: 60, roll: 0.06 - 0.03 * u });
};
// 12 drop: from inside the bowl at mid height, panning down with the falling barrel to the impact
const S_drop = (f: number) => {
  const l = lip(RUN_PHI), base: V3 = [l[0] - oA[0] * 16 + tE[0] * 6, -14, l[2] - oA[1] * 16 + tE[1] * 6];
  const k = clamp01((f - F(19.85)) / (IMPACT_F - F(19.85))), y = -6 - 40 * k ** 1.6; // follows the barrel's accelerating fall
  return { pos: base, look: [l[0] - oA[0] * 8, y, l[2] - oA[1] * 8] as V3, fov: 48, roll: -0.04 };
};
// 13-17 at the rescue shore (approved F / G framings)
export const BARREL_RESCUE: V3 = [SHORE[0] - 0.2, SHORE[1], SHORE[2] + 9];
const BR = BARREL_RESCUE;
const S_rescueOpen = (f: number) => dolly([BR[0] + 1.4, SHORE[1] + 1.5, BR[2] + 4.4], [BR[0] + 0.3, SHORE[1] + 1.1, BR[2] - 0.4], pushK(f, F(W.finally), 0.002), { fov: 44 });
const S_rescueAlive = (f: number) => dolly([BR[0] + 0.7, SHORE[1] + 1.9, BR[2] + 4.6], [BR[0] + 0.15, SHORE[1] + 1.55, BR[2] - 0.5], pushK(f, F(23.45), 0.0018, 0.005, F(W.minor) - 6, 26), { fov: 42 });
const S_problem = (f: number) => dolly([BR[0] + 0.75, SHORE[1] + 1.2, BR[2] + 4.6], [BR[0] + 0.25, SHORE[1] + 1.05, BR[2] + 1.2], pushK(f, F(27.9), 0.003), { fov: 40 });
const S_fortune = (f: number) => dolly([BR[0] + 0.9, SHORE[1] + 0.7, BR[2] + 4.3], [BR[0] + 0.25, SHORE[1] + 1.35, BR[2] + 1.2], pushK(f, F(29.3), 0.0025), { fov: 46, roll: 0.04 });
const S_purse = (f: number) => dolly([BR[0] + 0.75, SHORE[1] + 1.15, BR[2] + 4.4], [BR[0] + 0.25, SHORE[1] + 1.0, BR[2] + 1.2], pushK(f, F(W.and), 0.0022), { fov: 40 });

const KEYS: Record<string, Key[]> = {
  hook_wide: [{ f: 0, s: S_hookWide }], hook_barrel: [{ f: 66, s: S_hookBarrel }], barrel_cu: [{ f: 0, s: S_barrelCu }], annie: [{ f: 0, s: S_annie }, { f: F(W.plan) - 6, dur: 16, s: (f: number) => { const a = S_annie(f); return { ...a, pos: add(a.pos, [0, 0.16, 0]), look: add(a.look, [0, 0.3, 0]) }; } }], // tilt up to the bubble
  cat_in: [{ f: 0, s: S_catIn }], cat_alive: [{ f: 0, s: S_catAlive }], climb: [{ f: 0, s: S_climb }], strap: [{ f: 0, s: S_strap }], seal: [{ f: 0, s: S_seal }],
  current: [{ f: 0, s: S_current }], brink: [{ f: 0, s: S_brink }], drop: [{ f: 0, s: S_drop }], rescue_open: [{ f: 0, s: S_rescueOpen }],
  rescue_alive: [{ f: 0, s: S_rescueAlive }], problem: [{ f: 0, s: S_problem }], fortune: [{ f: 0, s: S_fortune }], purse: [{ f: 0, s: S_purse }],
};
const CAMS: Record<number, Key[]> = Object.fromEntries(SHOTS.map((s) => [s.id, KEYS[s.key]]));
/** impact kicks (bridge grammar: sign flips every frame, decays over 7 f): hammer taps, the splash, the lid */
export const HAMMER_HITS = [F(15.5), F(15.84)]; // two taps 10 f apart, the second lands on "sealed"
export const LID_POP_F = F(W.opened) + 1;
const KICKS: [number, number][] = [[HAMMER_HITS[0] / FPS, 0.35], [HAMMER_HITS[1] / FPS, 0.5], [IMPACT_F / FPS, 1.4], [LID_POP_F / FPS, 0.45]];
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
const at2 = (k: string) => shotByKey(k).a;
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: at2("barrel_cu"), cInf: 11 },
  { f: at2("annie"), cInf: 10, focus: () => [ANNIE_BANK[0], ANNIE_BANK[1] + 1.3, ANNIE_BANK[2]] },
  { f: at2("cat_in"), cInf: 10, focus: () => [BD[0], BD[1] + 1.4, BD[2]] },
  { f: at2("cat_alive"), cInf: 10, focus: () => [BARREL_SHORE[0], SHORE[1] + 1.35, BARREL_SHORE[2]] },
  { f: at2("climb"), cInf: 11, focus: () => [BD[0], BD[1] + 1.7, BD[2]] },
  { f: at2("seal"), cInf: 10, focus: () => [BD[0], BD[1] + 1.3, BD[2]] },
  { f: at2("current"), cInf: 0 },
  { f: at2("rescue_open"), cInf: 9, focus: () => [BR[0], SHORE[1] + 1.3, BR[2]] },
  { f: at2("rescue_alive"), cInf: 10, focus: () => [BR[0], SHORE[1] + 2.0, BR[2]] },
  { f: at2("problem"), cInf: 11, focus: () => [BR[0] + 0.1, SHORE[1] + 1.45, BR[2] + 1.3] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)], k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
