// "Why Guardrails Crumple": shot table, word timing and every motion curve. Pure functions of video time t (s).
// World: Y up, traffic +Z, drop toward +X (models.mjs). The guardrail root sits at x = RAIL_X, z = 0; its beam
// follows roadCenter(z) (curved rail), straight for z < 5. The car is the toon sedan (sedan.ts), nose +Z.
import {roadCenter} from '../../assets/models.mjs';
import WORDS from './words.json';

export const FPS = 30;
export const TOTAL = 1154; // 38.47 s: narration ends 36.85 s, then the one-eye beat
export const RAIL_X = 3.26;
export const LANE_X = 2.85; // car centre for the head-on approaches (bumper meets the rail end on its driver side)

type Word = {w: string; a: number; b: number};
export const words = WORDS as Word[];
/** start time of the n-th occurrence of a word (punctuation ignored) */
export const at = (w: string, n = 0) => {
  const hits = words.filter(x => x.w.replace(/[^a-z']/gi, '').toLowerCase() === w.toLowerCase());
  if (!hits[n]) throw new Error(`word ${w}#${n} not in words.json`);
  return hits[n].a;
};

export type ShotId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Shot = {id: ShotId; a: number; b: number; key: string};
// cut points sit in the gaps between sentences (or 2-3 frames ahead of the word they illustrate)
export const SHOTS: Shot[] = [
  {id: 1, a: 0, b: 3.88, key: 'hook'},
  {id: 2, a: 3.88, b: 5.98, key: 'assemble'},
  {id: 3, a: 5.98, b: 10.55, key: 'glance'},
  {id: 4, a: 10.55, b: 14.08, key: 'flex'},
  {id: 5, a: 14.08, b: 17.62, key: 'old-end'},
  {id: 6, a: 17.62, b: 20.2, key: 'cabin'},
  {id: 7, a: 20.2, b: 24.1, key: 'new-head'},
  {id: 8, a: 24.1, b: 26.95, key: 'slide'},
  {id: 9, a: 26.95, b: 31.95, key: 'cutaway'},
  {id: 10, a: 31.95, b: TOTAL / FPS, key: 'stop'},
];
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
  edge: at('edge') - .1,            // car leaves the cliff (shot 1)
  posts: at('city', 0) - .05,        // posts start popping (shot 2)
  beam: at('guardrails') + .1,       // beam runs along the posts
  sideHit: at('side', 0) - .07,      // glancing contact (shot 3)
  bend: at('bend') + .02,            // replayed flex peak (shot 4)
  spear: at('spear') - .07,          // old end spears the car (shot 5)
  swap: at('new') - .05,             // old end -> impact head (shot 7)
  hit: at('hits') - .07,             // bumper meets the head (shot 8)
  stop: at('stops') - .05,           // car comes to rest (shot 10)
  peek: at('stops') + 1.0,           // driver opens one eye
};

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
const PROFILE: [number, number][] = [
  [0, 7], [.34, 3.2], [1.44, 1.3], [2.39, .7], [7.34, .45], [7.84, .6], [10.04, .35], [11.84, 0],
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
