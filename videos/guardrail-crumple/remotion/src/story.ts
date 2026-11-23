// "Why Guardrails Crumple": shot table, word timing and every motion curve. Pure functions of video time t (s).
// World: Y up, traffic +Z, drop toward +X (models.mjs). The guardrail root sits at x = RAIL_X, z = 0; its beam
// follows roadCenter(z) (curved rail), straight for z < 5. The car is the toon sedan (sedan.ts), nose +Z.
import {roadCenter} from '../../assets/models.mjs';
import WORDS from './words.json';

export const FPS = 30;
export const RAIL_X = 3.26;
export const LANE_X = 2.85; // car centre for the head-on approaches (bumper meets the rail end on its driver side)

// Everything below is timed from the narration (voice/words.json, copied to src/words.json). A new take re-times the
// whole film: cuts sit in the gaps before sentence starts, beats sit on their words.
type Word = {w: string; a: number; b: number};
export const words = WORDS as Word[];
const norm = (w: string) => w.replace(/[^a-z']/gi, '').replace(/’/g, "'").toLowerCase();
/** start time of the n-th occurrence of a word (punctuation ignored) */
export const at = (w: string, n = 0) => {
  const hits = words.filter(x => norm(x.w) === w.toLowerCase());
  if (!hits[n]) throw new Error(`word ${w}#${n} not in words.json`);
  return hits[n].a;
};
/** sentence start times (a word starts a sentence when the previous word ends in . ! or ?) */
export const SENT: number[] = words.filter((x, i) => i === 0 || /[.!?]["”’]?$/.test(words[i - 1].w)).map(x => x.a);
if (SENT.length !== 11) throw new Error(`words.json has ${SENT.length} sentences, SCRIPT.md (v3) has 11`);
const LAST = words[words.length - 1];
export const TOTAL = Math.round((LAST.b + .45) * FPS); // ends on the opening frame: the Short loops

// v3: about 22 beats in ~30 s. Each beat = one camera setup; consecutive beats are cut (or whip) between.
// A cut sits 2-3 frames ahead of the word or sentence the next beat illustrates.
export type BeatKey =
  | 'open' | 'ribbon' | 'eye'                                  // hook: the aftermath, the ribbon, the driver alive
  | 'skid' | 'fall'                                            // flashback: off the cliff
  | 'glanceWin' | 'glanceHit' | 'flex' | 'back'                // side hit
  | 'flaw'                                                     // the old blunt end
  | 'approach' | 'spear' | 'cabin'                             // head-on with the old end
  | 'head' | 'slide' | 'cutaway' | 'stop' | 'loop';            // the extruding terminal, back to the opening frame
export type Shot = {key: BeatKey; a: number; b: number};
const cut = (t: number) => t - .08;

/** word-anchored beats (filled in once BEAT is known, below) */
export let SHOTS: Shot[] = [];
export const shotAt = (t: number) => SHOTS.find(s => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];

// ------------------------------------------------------------------ helpers
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const mix3 = (a: number[], b: number[], u: number) => a.map((v, i) => lerp(v, b[i], u));
const slope = (z: number) => -2 * Math.max(0, z - 5) / 130; // d roadCenter / dz
export const roadYaw = (z: number) => Math.atan(slope(z));
export {roadCenter};

/** the moment-of-truth beats, from the narration */
export const BEAT = {
  ribbon: at('ribbon') + .3,         // push lands on the ribbon
  life: at('life'),                  // the driver opens one eye
  edge: at('edge') - .1,             // car leaves the cliff
  sideHit: at('side', 0) - .07,      // glancing contact
  bend: at('bends') + .05,           // replayed flex peak
  pushes: at('back', 0),
  spear: at('spear') - .07,          // old end spears the car
  swap: at('head', 0) - .2,          // the impact head pops onto the rail
  hit: at('hits') - .07,             // bumper meets the head
  stop: at('dead') - .05,            // car comes to rest
  loop: SENT[10],                    // "And that leftover ribbon is what saved him."
  // legacy names used by the motion code
  posts: 0, beam: 0, peek: at('life'),
};
/** cuts inside the old shot groups (kept for the motion code) */
export const CUT = {glanceB: BEAT.sideHit - .3, oldEndB: at('straight', 1) + .2, closeUp: 1e9};

SHOTS = [
  {key: 'open', a: 0, b: cut(BEAT.ribbon - .05)},
  {key: 'ribbon', a: cut(BEAT.ribbon - .05), b: cut(SENT[1])},
  {key: 'eye', a: cut(SENT[1]), b: cut(SENT[2])},
  {key: 'skid', a: cut(SENT[2]), b: cut(at('road', 0) + .1)},
  {key: 'fall', a: cut(at('road', 0) + .1), b: BEAT.edge + .35},     // cut away just after it leaves the edge
  {key: 'glanceWin', a: BEAT.edge + .35, b: CUT.glanceB},            // the driver through the side window, then...
  {key: 'glanceHit', a: CUT.glanceB, b: cut(at('bends'))},
  {key: 'flex', a: cut(at('bends')), b: cut(at('back', 0))},
  {key: 'back', a: cut(at('back', 0)), b: cut(SENT[4])},
  {key: 'flaw', a: cut(SENT[4]), b: cut(SENT[5])},
  {key: 'approach', a: cut(SENT[5]), b: CUT.oldEndB},
  {key: 'spear', a: CUT.oldEndB, b: cut(at('through') + .05)},
  {key: 'cabin', a: cut(at('through') + .05), b: cut(SENT[6])},
  {key: 'head', a: cut(SENT[6]), b: cut(SENT[7])},
  {key: 'slide', a: cut(SENT[7]), b: cut(SENT[8])},
  {key: 'cutaway', a: cut(SENT[8]), b: cut(SENT[9])},
  {key: 'stop', a: cut(SENT[9]), b: cut(BEAT.loop)},
  {key: 'loop', a: cut(BEAT.loop), b: TOTAL / FPS},
];

/** speed ramp: video time v -> story time; slope 1 outside [hitV - w, hitV + w], `slow` inside, s(hitV) = hitS */
export function ramp(v: number, hitV: number, hitS: number, slow: number, w: number) {
  if (v < hitV - w) return hitS - slow * w + (v - (hitV - w));
  if (v > hitV + w) return hitS + slow * w + (v - (hitV + w));
  return hitS + slow * (v - hitV);
}

// ------------------------------------------------------------------ car state
export type CarState = {
  x: number; y: number; z: number; yaw: number; pitch: number; roll: number;
  dist: number; steer: number; wheel: number; visible: boolean;
};

// side-hit kinematics (shots 1, 3, 4), story time tau; contact at TC
const V_SIDE = 8.5, VX_SIDE = 2.1, YAW0 = .26;
export type SideGeom = {front: number; halfWidth: number};
const beamFace = (z: number) => RAIL_X + roadCenter(z) - .085;

/** car pose for the skid toward the rail; `rail` = false lets it run off the edge (hook) */
export function sideCar(tau: number, tc: number, g: SideGeom, rail: boolean): CarState & {flex: number; contact: number; spark: number} {
  const zc = 6.2; // car centre z at contact
  let z: number, x: number, yaw: number;
  const yawAt = (zz: number) => roadYaw(zz);
  if (tau <= tc || !rail) {
    z = zc + V_SIDE * (tau - tc);
    yaw = yawAt(z) + YAW0;
    const cx0 = beamFace(zc + g.front) - g.halfWidth * Math.cos(YAW0) - g.front * Math.sin(YAW0);
    x = cx0 + VX_SIDE * (tau - tc);
  } else {
    const d = tau - tc;
    // after contact: speed bleeds 8.5 -> 6.5 m/s, nose swings to the road heading, side presses the beam
    z = zc + V_SIDE * d - 1.0 * d * d;
    const swing = smooth(d / .55);
    yaw = yawAt(z) + YAW0 * (1 - swing) - .05 * Math.sin(Math.PI * clamp01(d / .9));
    const press = .24 * Math.sin(Math.PI * clamp01(d / .55)) * (1 - smooth((d - .3) / .4));
    const rebound = .55 * smooth((d - .35) / 1.1);
    const face = beamFace(z + g.front * .6);
    x = face - g.halfWidth * Math.cos(yaw - yawAt(z)) - g.front * Math.sin(yaw - yawAt(z)) + press - rebound;
  }
  const dist = V_SIDE * (tau + 10);
  const d = tau - tc;
  const flex = !rail || d < 0 ? 0 : d < .2 ? .28 * smooth(d / .2) : .28 - .15 * smooth((d - .2) / .5);
  const contact = zc + g.front * .75 + V_SIDE * clamp01(d / .45) * .45 * .8;
  const steer = d < 0 ? .32 + .12 * Math.sin(tau * 5) : -.25 * (1 - smooth(d / 1.2));
  // the hook: past the edge the car falls and tumbles
  let y = 0, pitch = 0, roll = 0;
  const edgeX = RAIL_X + .39 + roadCenter(z);
  if (!rail && x - g.halfWidth * .55 > edgeX) {
    const over = (x - g.halfWidth * .55 - edgeX) / VX_SIDE;
    y = -4.9 * over * over - .4 * over;
    pitch = .55 * over;
    roll = -.9 * over * over - .25 * over;
  }
  if (rail) { // body language: lean out of the skid, a jolt on contact, a wobble as it settles
    roll += d < 0 ? -.05 : -.05 * Math.exp(-d * 3) + .07 * Math.sin(Math.PI * clamp01(d / .35)) * Math.exp(-d * 2);
    pitch += d < 0 ? 0 : .03 * Math.sin(Math.PI * clamp01(d / .3));
  }
  return {x, y, z, yaw, pitch, roll, dist, steer, wheel: steer * -2.6, visible: true, flex, contact,
    spark: rail ? clamp01(d / .55) : 0};
}

/** the hook (shot 1): a slower skid that leaves the edge at z ~ 9.5 on the bend, then falls and tumbles */
export function hookCar(t: number, g: SideGeom): CarState {
  const tE = BEAT.edge, v = 4.4, vx = 1.7;
  const z = 9.5 + v * (t - tE);
  const edgeX = RAIL_X + .39 + roadCenter(9.5);
  let x = edgeX + g.halfWidth * .5 + vx * (t - tE);
  const yaw = roadYaw(z) + .3;
  const d = t - tE;
  let y = 0, pitch = 0, roll = 0;
  if (d > 0) {
    y = -4.9 * d * d - .3 * d;
    x += .6 * d;
    pitch = .5 * d + .35 * d * d;
    roll = -.6 * d - .8 * d * d;
  }
  const wheel = .45 * Math.sin(t * 6.5) + .2; // still sawing at the wheel, even in midair
  return {x, y, z, yaw, pitch, roll, dist: z, steer: .35, wheel, visible: true};
}

// ------------------------------------------------------------------ head-on: old end (shot 5/6)
const V_HEAD = 9;
export const PEN = 1.75; // m of rail inside the car when it stops
export function oldEndCar(t: number, front: number): CarState & {pen: number} {
  const t5 = BEAT.spear;
  const zContact = -.07 - front;
  let z: number, pen = 0;
  if (t < t5) z = zContact - V_HEAD * (t5 - t);
  else {
    const u = clamp01((t - t5) / (2 * PEN / V_HEAD));
    pen = PEN * (1 - (1 - u) * (1 - u));
    z = zContact + pen;
  }
  const d = t - t5;
  const pitch = d < 0 ? 0 : .06 * Math.sin(Math.PI * clamp01(d / .45)) * Math.exp(-d * 2);
  return {x: LANE_X, y: 0, z, yaw: 0, pitch, roll: 0, dist: z, steer: 0, wheel: .05 * Math.sin(t * 3), visible: true, pen};
}

// ------------------------------------------------------------------ head-on: extruding terminal (shots 8-10)
// Video-time speed profile (m/s) of the bumper after contact: fast hit, a slow readable slide through the cutaway,
// then the last metres in the wide shot. travel(t) integrates it; the car's bumper stays on the head's face.
const V_APPROACH = 7;
const SH_ = (k: BeatKey) => SHOTS.find(x => x.key === k)!.a;
const H9 = SH_('cutaway') - BEAT.hit, H10 = SH_('stop') - BEAT.hit, HS = BEAT.stop - BEAT.hit;
const PROFILE: [number, number][] = [
  [0, 7], [.34, 3.2], [Math.max(.6, H9 - 1.0), 1.3], [H9, .7], [H10, .45], [H10 + .5, .6], [Math.max(H10 + .8, HS - 1.8), .35], [HS, 0],
];
const STEPS = 2400;
const TRAVEL_T: number[] = [];
{
  const end = PROFILE[PROFILE.length - 1][0];
  let acc = 0;
  for (let i = 0; i <= STEPS; i++) {
    const s = (i / STEPS) * end;
    TRAVEL_T.push(acc);
    acc += speedAt(s) * end / STEPS;
  }
}
function speedAt(s: number) {
  for (let i = 1; i < PROFILE.length; i++) {
    if (s <= PROFILE[i][0]) {
      const [a, va] = PROFILE[i - 1], [b, vb] = PROFILE[i];
      return lerp(va, vb, (s - a) / (b - a));
    }
  }
  return 0;
}
/** head travel down the rail (m) at video time t */
export function travel(t: number) {
  const s = t - BEAT.hit;
  if (s <= 0) return 0;
  const end = PROFILE[PROFILE.length - 1][0];
  const f = Math.min(s, end) / end * STEPS;
  const i = Math.floor(f);
  return i >= STEPS ? TRAVEL_T[STEPS] : lerp(TRAVEL_T[i], TRAVEL_T[i + 1], f - i);
}
export const TRAVEL_END = TRAVEL_T[STEPS];
export function terminalCar(t: number, front: number): CarState {
  const T = travel(t);
  const s = t - BEAT.hit;
  const zFace = T - .205;
  let z = zFace - front;
  if (s < 0) z += V_APPROACH * s;
  const zh = Math.max(T, 0);
  const x = LANE_X + roadCenter(zh);
  const yaw = roadYaw(zh);
  const pitch = s < 0 ? 0 : .035 * Math.sin(Math.PI * clamp01(s / .5)) * Math.exp(-s * 1.5);
  return {x, y: 0, z, yaw, pitch, roll: 0, dist: z, steer: yaw * 1.5, wheel: 0, visible: true};
}

// ------------------------------------------------------------------ camera
export type Cam = {pos: number[]; look: number[]; fov: number; roll?: number};
export const kick = (t: number, t0: number, amp: number) => {
  const f = Math.round((t - t0) * FPS);
  if (f < 0 || f > 7) return 0;
  return amp * (f % 2 ? -1 : 1) * (1 - f / 8);
};
