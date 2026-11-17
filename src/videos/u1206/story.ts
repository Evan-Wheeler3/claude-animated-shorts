// "U-1206 — The Toilet That Doomed a Submarine": shot table and camera keys.
// GATE 1 (first stills): frame ranges are the provisional windows of videos/u1206-toilet-disaster/SHOTLIST.md (30 fps,
// 40 s scaffold). Gate 2 re-times every shot to the recorded narration (words.json) before anything is animated.
// Camera grammar is the bridge/Niagara one: cuts on big reframes, creeping push-ins on holds, smootherstep glides.
export const FPS = 30;
export type V3 = [number, number, number];
export const F = (sec: number) => Math.round(sec * FPS);

// ---------------- geography (metres, Y up) ----------------
// Interior sets sit far from the exterior so fog, shadows and ground rays never mix. Each set is used by its shots only.
export const COMP: V3 = [1000, 0, 0];   // the toilet compartment (createCompartment: floor centre, back wall at -z)
export const SECT: V3 = [1040, 0, 0];   // the two-level illustrative section (createSection: bottom centre)
export const BATT: V3 = [1080, 0, 0];   // battery room (createBatteryRoom)
export const CTRL: V3 = [1120, 0, 0];   // control room (createControlRoom)
export const SEA_Y = 0;                 // exterior: ocean surface at y = 0; the sub is placed by keel height
export const DEPTH_KEEL = -46;          // "two hundred feet underwater" is SCHEMATIC: keel ~46 m below the surface
export const SURF_KEEL = -4.3;          // surfaced: deck casing ~1.3 m proud of the water (hull centre at y -1.1)

// ---------------- shots (provisional, from SHOTLIST.md) ----------------
export type Look = "interior" | "alarm" | "underwater" | "surface";
export type ShotDef = { id: number; key: string; a: number; b: number; still: number; look: Look; critical: boolean };
const SH: [string, number, number, Look, boolean][] = [ // key, start s, still s, look, critical preview (SHOTLIST edit rules)
  ["s01_blast", 0.0, 1.05, "interior", true],
  ["s02_hero", 1.6, 2.9, "underwater", true],
  ["s03_depth", 3.8, 5.4, "underwater", false],
  ["s04_captain", 6.7, 8.6, "interior", true],
  ["s05_specialist", 10.1, 11.3, "interior", false],
  ["s06_valve", 12.4, 13.6, "interior", false],
  ["s07_flood", 14.5, 16.0, "interior", true],
  ["s08_cutaway", 18.0, 19.8, "interior", true],
  ["s09_gas", 21.2, 22.8, "alarm", true],
  ["s10_surface", 24.0, 26.6, "underwater", false],
  ["s11_aircraft", 27.6, 29.6, "surface", false],
  ["s12_scuttle", 31.0, 33.4, "surface", true],
  ["s13_drip", 34.9, 36.2, "interior", false],
  ["s14_deadpan", 37.3, 39.2, "underwater", true],
];
export const TOTAL = F(40);
export const SHOTS: ShotDef[] = SH.map(([key, a, still, look, critical], i) => ({
  id: i + 1, key, a: F(a), b: i + 1 < SH.length ? F(SH[i + 1][1]) : TOTAL, still: F(still), look, critical,
}));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const shotByKey = (k: string) => SHOTS.find((s) => s.key === k)!;
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---------------- story clocks (Gate 1 scaffolds; Gate 2 locks them to word onsets) ----------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** shot 01: the wheel's dangerous half-turn, then the jet (seconds since the blast started; < 0 = not yet) */
export const BLAST_F = F(0.45);
/** shot 07: inward flow, then the burst at the connector */
export const FLOOD_F = F(14.9);
/** sub travel along +z (bow) for the underwater shots, m/s */
export const SUB_V = 1.2;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** sub keel-midships position for exterior shots (x, keel y, z) */
export const subAt = (key: string, f: number): V3 => {
  const t = f / FPS;
  switch (key) {
    case "s02_hero": return [0, DEPTH_KEEL, -6 + SUB_V * (t - 1.6)];
    case "s03_depth": return [0, DEPTH_KEEL, -4 + SUB_V * (t - 3.8)];
    case "s10_surface": { const u = smooth((t - 24.6) / 3.2); return [0, DEPTH_KEEL + (SURF_KEEL - 3 - DEPTH_KEEL) * u, -10 + 4.5 * (t - 24)]; }
    case "s11_aircraft": case "s12_scuttle": return [0, SURF_KEEL, 0];
    case "s14_deadpan": return [10, DEPTH_KEEL - 10 - 1.1 * (t - 37.3), 82];
    default: return [0, DEPTH_KEEL, 0];
  }
};
const C = (o: V3, p: V3): V3 => add(o, p);
const S: Record<string, (f: number) => Shot> = {
  // 01 ECU low angle on the valve, bowl visible; snap-push toward the jet on the blast, then hold
  s01_blast: (f) => { const k = smooth((f - BLAST_F - 2) / 5); return dolly(C(COMP, [0.0, 0.42, 1.3]), C(COMP, [0.12, 0.88, -0.7]), 1 - 0.12 * k, { fov: 68, roll: 0.05 }); },
  // 02 underwater 3/4 from slightly below, tilting up as the hull passes
  s02_hero: (f) => { const s = subAt("s02_hero", f); return dolly([-34, DEPTH_KEEL + 1, s[2] + 34], [s[0], DEPTH_KEEL + 4 + 0.03 * (f - F(1.6)), s[2] + 6], pushK(f, F(1.6), 0.0015), { fov: 55, roll: -0.03 }); },
  // 03 side profile, deep water; the hazy surface light far above (tilt up toward it)
  s03_depth: (f) => { const s = subAt("s03_depth", f); return { pos: [-150, DEPTH_KEEL + 4, s[2] + 1], look: [0, DEPTH_KEEL + 22 + 0.25 * (f - F(3.8)), s[2] + 1], fov: 50 }; },
  // 04 MS captain squeezed into the compartment, valve wheels and bowl in view
  s04_captain: (f) => dolly(C(COMP, [1.35, 1.45, 1.25]), C(COMP, [-0.2, 1.0, -0.65]), pushK(f, F(6.7), 0.0015), { fov: 60, roll: -0.03 }),
  // 05 CU: the specialist's hand on the valve between the pipes
  s05_specialist: (f) => dolly(C(COMP, [0.25, 1.3, 0.45]), C(COMP, [0.88, 1.02, -0.9]), pushK(f, F(10.1), 0.0025), { fov: 48, roll: 0.02 }),
  // 06 ECU on one valve, LOCKED (shot list): the failure reads by itself
  s06_valve: () => ({ pos: C(COMP, [0.55, 1.04, 0.08]), look: C(COMP, [0.9, 0.92, -0.94]), fov: 40 }),
  // 07 MS down the plumbing line, sailor braced in the doorway, water at the boots
  s07_flood: (f) => dolly(C(COMP, [1.35, 1.55, 1.25]), C(COMP, [-0.45, 0.7, -0.6]), pushK(f, F(14.5), 0.0015), { fov: 62, roll: 0.04 }),
  // 08 clean two-level cutaway, near orthographic; small vertical follow of the droplet path
  s08_cutaway: (f) => { const u = smooth((f - F(18.3)) / 60); return { pos: C(SECT, [0.55, 2.4 - 0.3 * u, 14]), look: C(SECT, [0.35, 1.55 - 0.3 * u, 0]), fov: 23 }; },
  // 09 battery tops to claustrophobic MS: gas rising, crew recoils, the lamp flickers red
  s09_gas: (f) => dolly(C(BATT, [1.55, 1.95, -1.15]), C(BATT, [-0.6, 1.0, 0.45]), pushK(f, F(21.2), 0.002), { fov: 64, roll: -0.04 }),
  // 10 (exterior half) parallel to the climbing boat
  s10_surface: (f) => { const s = subAt("s10_surface", f); return { pos: [-60, s[1] + 5, s[2] + 6], look: [0, s[1] + 7, s[2] + 6], fov: 56, roll: 0.05 }; },
  // 11 surfaced wide; tilt up toward the distant aircraft, which stay in frame with the boat
  s11_aircraft: (f) => { const u = smooth((f - F(28.0)) / 36); return { pos: [-34, 3.0, -14], look: [0, 3 + 12 * u, 6 + 4 * u], fov: 54 }; },
  // 12 high-angle aftermath: crew rafts clear, slow push on the conning tower
  s12_scuttle: (f) => dolly([-30, 13, -22], [0, 1.5, 4], pushK(f, F(31.0), 0.0012), { fov: 48 }),
  // 13 CU back on the cold-open valve: one drip, the seat wobbles
  s13_drip: (f) => dolly(C(COMP, [0.05, 0.95, 0.55]), C(COMP, [0.6, 0.72, -0.8]), pushK(f, F(34.9), 0.0012), { fov: 48 }),
  // 14 split-depth gag: toilet foreground, the boat fading into the blue behind it; static end frame
  s14_deadpan: () => ({ pos: [-3.2, DEPTH_KEEL - 1.4, 0], look: [2, DEPTH_KEEL - 4, 40], fov: 50 }),
};
export const camAt = (id: number, f: number): Cam => full(S[SHOTS[id - 1].key](f));

/** the lone toilet of the end gag: on the camera's line, lower third */
export const TOILET14: V3 = [-2.8, DEPTH_KEEL - 2.9, 3.4];

// ---------------- lens (cInf px at 1080; focus point) ----------------
export const dofAt = (id: number): { cInf: number; focus?: V3 } => {
  switch (SHOTS[id - 1].key) {
    case "s01_blast": return { cInf: 13, focus: C(COMP, [0.86, 0.9, -0.94]) };
    case "s04_captain": return { cInf: 10, focus: C(COMP, [-0.35, 1.5, -0.2]) };
    case "s05_specialist": return { cInf: 12, focus: C(COMP, [0.6, 1.25, -0.95]) };
    case "s06_valve": return { cInf: 13, focus: C(COMP, [0.86, 0.9, -0.94]) };
    case "s07_flood": return { cInf: 8, focus: C(COMP, [-0.6, 1.3, -0.2]) };
    case "s09_gas": return { cInf: 9, focus: C(BATT, [-0.2, 1.3, 0.2]) };
    case "s13_drip": return { cInf: 12, focus: C(COMP, [0.86, 0.85, -0.94]) };
    case "s14_deadpan": return { cInf: 7, focus: TOILET14 };
    default: return { cInf: 0 };
  }
};
