// "U-1206 — The Toilet That Doomed a Submarine": shot table and camera keys.
// GATE 2: every shot starts 2 frames before its narration word (videos/u1206-toilet-disaster/voice/words.json, Kokoro
// am_puck 1.15 — the owner's pick over the monotone house voice); reactions land 0-3 frames before their word.
// Owner edit 2 (2026-11-17): the boat only goes down once (cruising -> surfaces with a breach -> scuttled -> wreck);
// the surfacing is the captain hauling the blow valve + an above-water breach; the jet hits the sailor in the face;
// the ending is ONE shot (B): the broken wreck on the seabed with the toilet in the foreground.
// All motion inside a shot runs on the SHOT-LOCAL clock (frames since the shot's first frame) so re-timing a shot never
// breaks its animation.
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

// ---------------- narration clock (seconds; words.json of the owner-revised script, the owner's cloned voice) ----------------
export const W = {
  in: 0.02, n1945: 0.13, german: 1.14, was: 2.2, toilet: 3.66, u1206: 4.52, scotland: 6.22, twohundred: 6.92, underwater: 7.74,
  its: 8.4, highpressure: 8.76, complicated: 9.95, flushing: 11.0, specialist: 12.55, one: 13.48, went: 15.23, wrong: 15.51,
  instead: 16.08, seawater: 17.04, blasting: 17.99, water: 19.04, battery: 20.53, releasing: 22.08, chlorine: 23.46, gas: 24.08,
  the: 24.56, crew: 24.92, surface: 25.77, and: 26.54, allied: 26.65, aircraft: 27.09, spot: 28.29, submarine: 30.04,
  damaged: 31.04, abandoned: 31.74, eventually: 32.48, floor: 34.48, all: 34.88, bathroom: 35.75, worst: 37.41, flush: 37.71,
  history: 38.35, end: 38.97,
};
const L = 2; // shots start / reactions land 2 frames before their word

// ---------------- shots ----------------
export type Look = "interior" | "alarm" | "underwater" | "surface";
export type ShotDef = { id: number; key: string; a: number; b: number; still: number; look: Look; critical: boolean };
const SH: [string, number, number, Look, boolean][] = [ // key, start frame, still frame, look, critical preview
  ["s01_blast", 0, F(0.97), "interior", true],                         // the hook proves itself in the first 0.5 s
  ["s02_hero", F(W.was) - L, F(3.67), "underwater", true],
  ["s03_depth", F(W.u1206) - L, F(6.98), "underwater", false],
  ["s04_captain", F(W.its) - L, F(9.75), "interior", true],
  ["s05_specialist", F(W.flushing) - L, F(12.51), "interior", false],
  ["s06_valve", F(W.one) - L, F(15.62), "interior", false],
  ["s07_flood", F(W.instead) - L, F(18.36), "interior", true],
  ["s08_cutaway", F(W.water) - 4, F(20.79), "interior", true],           // "The water spilled into the battery room below"
  ["s09_gas", F(W.releasing) - L, F(23.85), "alarm", true],
  ["s10a_blow", F(W.gas) + 14, F(25.35), "alarm", true],                // the captain hauls the blow valve ("The crew had to surface")
  ["s10_breach", F(W.surface) + 5, F(W.surface) + 5 + 15, "surface", true], // the boat breaks the surface in the pause
  ["s11_aircraft", F(W.aircraft) - L, F(28.7), "surface", false],
  ["s12_scuttle", F(W.submarine) - L, F(31.79), "surface", true],
  ["s14_wreck", F(W.eventually) - L, F(36.84), "underwater", true],    // "Eventually sinking to the ocean floor" -> the end, on the wreck
];
export const TOTAL = F(40.59); // the last word ends at 38.7 s; a dry 1.6 s hold on the end frame
export const SHOTS: ShotDef[] = SH.map(([key, a, still, look, critical], i) => ({
  id: i + 1, key, a, b: i + 1 < SH.length ? SH[i + 1][1] : TOTAL, still, look, critical,
}));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const shotByKey = (k: string) => SHOTS.find((s) => s.key === k)!;
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];
/** frames since the shot started */
export const lf = (key: string, f: number) => f - shotByKey(key).a;
/** shot-local frame of an absolute narration time (s) */
export const wf = (key: string, sec: number) => F(sec) - shotByKey(key).a;

// ---------------- story clocks ----------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** shot 01 (local frames): the sailor's wheel jerks a half-turn over frames 0-8, the bowl erupts at BLAST_F */
export const BLAST_F = 10;
/** shot 06: the handle catches on "went" and turns; the gauge kicks on "wrong" */
export const CATCH_F = () => wf("s06_valve", W.went) - L;
/** shot 07: the reversal: the bowl erupts on "seawater", full blast on "blasting" */
export const FLOOD_F = () => wf("s07_flood", W.blasting) - L - 9; // the stream grows 9 f, so it HITS HIS FACE on "blasting"
/** shot 10a: the captain spins the blow valve from "crew" to "surface" */
export const BLOW_F = () => wf("s10a_blow", W.crew);
/** shot 10: the bow breaks the surface (local frame) */
export const BREACH_F = 10;
/** shot 14: the bubble leaves the toilet on "history" */
export const BUBBLE_F = () => wf("s14_wreck", W.history) - L;
/** sub travel along +z (bow) for the underwater shots, m/s */
export const SUB_V = 2.4; // visibly under way: the boat is HIDING, not sunk
/** seabed of the ending (the wreck lies here) */
export const SEABED = DEPTH_KEEL - 8;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
/** creeping push (bridge grammar 0.15-0.35 %/frame) from local frame 0 */
const pushK = (l: number, rate: number) => Math.exp(-rate * Math.max(0, l));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** sub keel-midships position for exterior shots (x, keel y, z); t = seconds since the shot started */
export const subAt = (key: string, f: number): V3 => {
  const t = lf(key, f) / FPS;
  switch (key) {
    case "s02_hero": return [0, DEPTH_KEEL, -6 + SUB_V * t];
    case "s03_depth": return [0, DEPTH_KEEL, -4 + SUB_V * t];
    // breach: rises from below the surface, overshoots (bow high) and settles to its surfaced trim
    case "s10_breach": { const k = lf(key, f), up = smooth(k / (BREACH_F + 8)), settle = k > BREACH_F + 8 ? Math.exp(-(k - BREACH_F - 8) / 10) * Math.sin((k - BREACH_F - 8) / 4) : 0;
      return [0, SURF_KEEL - 9 + 9 * up + 0.8 * settle, -6 + 3 * t]; }
    case "s11_aircraft": case "s12_scuttle": return [0, SURF_KEEL, 0];
    case "s14_wreck": return [0, SEABED, 34];
    default: return [0, DEPTH_KEEL, 0];
  }
};
const C = (o: V3, p: V3): V3 => add(o, p);
const S: Record<string, (l: number) => Shot> = {
  // 01 ECU just above rim height on the valve and bowl; snap-push toward the eruption, then hold (creeping)
  s01_blast: (l) => { const k = smooth((l - BLAST_F - 1) / 5); return dolly(C(COMP, [0.05, 0.8, 1.3]), C(COMP, [0.15, 0.85, -0.7]), (1 - 0.12 * k) * pushK(l - BLAST_F - 7, 0.0015), { fov: 68, roll: 0.05 }); },
  // 02 underwater 3/4 from slightly below, tilting up as the hull passes
  s02_hero: (l) => { const s = subAt("s02_hero", l + shotByKey("s02_hero").a); return dolly([-34, DEPTH_KEEL + 1, s[2] + 34], [s[0], DEPTH_KEEL + 4 + 0.03 * l, s[2] + 6], pushK(l, 0.0015), { fov: 55, roll: -0.03 }); },
  // 03 side profile, deep water; slow tilt up toward the hazy surface light
  s03_depth: (l) => { const s = subAt("s03_depth", l + shotByKey("s03_depth").a); return { pos: [-150, DEPTH_KEEL + 4, s[2] + 1], look: [0, DEPTH_KEEL + 22 + 0.12 * l, s[2] + 1], fov: 50 }; },
  // 04 MS captain squeezed into the compartment; tiny push, then a comic static-ish hold
  s04_captain: (l) => dolly(C(COMP, [1.35, 1.45, 1.25]), C(COMP, [-0.2, 1.0, -0.65]), pushK(l, 0.0018), { fov: 60, roll: -0.03 }),
  // 05 CU: the specialist's hand threads in to the valve; focus racks to the wheel (dofAt)
  s05_specialist: (l) => dolly(C(COMP, [0.25, 1.3, 0.45]), C(COMP, [0.88, 1.02, -0.9]), pushK(l, 0.0025), { fov: 48, roll: 0.02 }),
  // 06 ECU on one valve, LOCKED (shot list): the failure reads by itself
  s06_valve: () => ({ pos: C(COMP, [0.55, 1.04, 0.08]), look: C(COMP, [0.9, 0.92, -0.94]), fov: 40 }),
  // 07 MS down the plumbing line, sailor braced in the doorway, water at the boots
  s07_flood: (l) => dolly(C(COMP, [1.35, 1.55, 1.25]), C(COMP, [-0.45, 0.7, -0.6]), pushK(l, 0.0015), { fov: 62, roll: 0.04 }),
  // 08 clean two-level cutaway, near orthographic; motivated vertical follow of the droplet path
  s08_cutaway: (l) => { const u = smooth((l - 4) / 36); return { pos: C(SECT, [0.55, 2.4 - 0.3 * u, 14]), look: C(SECT, [0.35, 1.55 - 0.3 * u, 0]), fov: 23 }; },
  // 09 battery tops to claustrophobic MS: gas rising, crew recoils, the lamp flickers red
  s09_gas: (l) => dolly(C(BATT, [1.55, 1.95, -1.15]), C(BATT, [-0.6, 1.0, 0.45]), pushK(l, 0.0025), { fov: 64, roll: -0.04 }),
  // 10a MCU: the captain hauls the blow valve round, hard (alarm light)
  s10a_blow: (l) => dolly(C(CTRL, [0.75, 1.5, 1.9]), C(CTRL, [-0.45, 1.25, -0.2]), pushK(l, 0.004), { fov: 50, roll: -0.04 }),
  // 10 just above the water: the boat bursts up through the surface, bow first, and settles
  s10_breach: (l) => dolly([-22, 2.4, 8], [0, 3.2, 26], pushK(l, 0.002), { fov: 54, roll: 0.03 }),
  // 11 surfaced wide; tilt up toward the aircraft on "aircraft", the boat stays in frame
  s11_aircraft: (l) => { const u = smooth((l - wf("s11_aircraft", W.aircraft) + 4) / 30); return { pos: [-34, 3.0, -14], look: [0, 3 + 12 * u, 6 + 4 * u], fov: 54 }; },
  // 12 high-angle aftermath: crew rafts clear, slow push on the conning tower
  s12_scuttle: (l) => dolly([-30, 13, -22], [0, 1.5, 4], pushK(l, 0.0015), { fov: 48 }),
  // 14 ending B: low on the seabed; the toilet in the sand in front, the broken wreck behind; slow creep, static end
  // "Eventually sinking to the ocean floor": the camera sinks with the line from mid-water down to the seabed framing
  // (lands just after "floor"), then the dry hold with a slow creep for "bathroom break" and the punchline
  s14_wreck: (l) => { const u = glide(l / (wf("s14_wreck", W.floor) + 14)), y = SEABED + 1.4 + 16 * (1 - u);
    // the hold creeps by ZOOM, not dolly: a dolly toward the far wreck would carry the lens past the toilet
    return { pos: [-3, y, -2 - 6 * (1 - u)], look: [0, SEABED + 5.5 - 4 * (1 - u), 40], fov: 54 - 4 * smooth((l - 40) / 200) }; },
};
/** impact kicks (bridge grammar: sign flips every frame, decays over 7 f), absolute frames: the eruption, the valve's
 *  catch (small), the blast on "blasting" (shot list: one controlled 0.15 s jolt, then recover) */
const KICKS: [number, number][] = [[BLAST_F, 1.0], [F(W.went) - L, 0.25], [F(W.blasting) - L, 0.8]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1], c = full(S[s.key](f - s.a)), a = s.key === "s06_valve" ? 0 : kickAt(f); // 06 stays locked
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ln = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ln * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

/** the lone toilet of the end gag: on the camera's line, lower third */
export const TOILET14: V3 = [-3.3, DEPTH_KEEL - 8, 6.5]; // on the seabed (y = SEABED; rested on the sand at runtime)

// ---------------- lens (cInf px at 1080; focus point) ----------------
export const dofAt = (id: number, f = 0): { cInf: number; focus?: V3 } => {
  const key = SHOTS[id - 1].key, l = f - SHOTS[id - 1].a;
  switch (key) {
    case "s01_blast": return { cInf: 13, focus: C(COMP, [0.35, 0.8, -0.55]) };
    case "s04_captain": return { cInf: 10, focus: C(COMP, [-0.35, 1.5, -0.2]) };
    case "s05_specialist": { // rack focus: the specialist's face -> the wheel as the hand arrives
      const u = smooth((l - 10) / 12), a = C(COMP, [1.2, 1.55, -0.66]), b = C(COMP, [0.86, 0.9, -0.94]);
      return { cInf: 12, focus: a.map((v, i) => v + (b[i] - v) * u) as V3 };
    }
    case "s06_valve": return { cInf: 13, focus: C(COMP, [0.86, 0.9, -0.94]) };
    case "s07_flood": return { cInf: 8, focus: C(COMP, [-0.6, 1.3, -0.2]) };
    case "s09_gas": return { cInf: 9, focus: C(BATT, [-0.2, 1.3, 0.2]) };
    case "s10a_blow": return { cInf: 10, focus: C(CTRL, [-0.45, 1.5, -0.1]) };
    case "s14_wreck": return { cInf: 6, focus: [TOILET14[0], TOILET14[1] + 0.6, TOILET14[2]] };
    default: return { cInf: 0 };
  }
};
