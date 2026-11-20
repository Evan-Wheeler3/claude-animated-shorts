// Reusable body poses built on Rig (world-space IK). All coordinates are character space: +Z forward, +Y up,
// x OUTWARD for the side named (mirrored by Rig.mx). Every pose function expects `rig.reset()` beforehand.
import { B, Rig } from "./rig";
import type { V3 } from "./cam";

const D = Math.PI / 180;

/** Pelvis offset (character space) then plant both ankles; knees bend toward +Z. */
export function legs(r: Rig, pelvis: V3, L: V3, R: V3, kneeFwd = 1) {
  r.shiftPelvis(...pelvis);
  r.plant("L", L, [L[0] + 0.05, 0.5, L[2] + kneeFwd]);
  r.plant("R", R, [R[0] + 0.05, 0.5, R[2] + kneeFwd]);
}

export function stand(r: Rig) {
  r.armsDown();
}

/** walk cycle sample, phase 0..1 (0 = left heel strike), stride in meters */
export function walk(r: Rig, phase: number, stride = 0.62, armsFree = true) {
  const a = r.ankle;
  const s = Math.sin(phase * 2 * Math.PI), c = Math.cos(phase * 2 * Math.PI);
  const bob = -0.035 * Math.abs(c) + 0.01;
  const lift = (p: number) => Math.max(0, Math.sin(p * 2 * Math.PI)) * 0.09;
  const L: V3 = [a.out, a.y + lift(phase + 0.5), a.z + (c * stride) / 2];
  const R: V3 = [a.out, a.y + lift(phase), a.z - (c * stride) / 2];
  legs(r, [0, bob, 0.03], L, R);
  r.turn(B.pelvis, [0, 1, 0], -c * 5);
  r.turn(B.spine1, [0, 1, 0], c * 7);
  if (armsFree) {
    r.reach("L", [0.22, 0.88, 0.04 - c * 0.18], [0.35, 1.15, -0.5]);
    r.reach("R", [0.22, 0.88, 0.04 + c * 0.18], [0.35, 1.15, -0.5]);
  }
  void s;
}

/** both hands together in front of the chest (newspaper, tray, wheel) */
export function handsFront(r: Rig, y = 1.12, fwd = 0.3, out = 0.13) {
  r.reach("L", [out, y, fwd], [0.5, y - 0.3, -0.2]);
  r.reach("R", [out, y, fwd], [0.5, y - 0.3, -0.2]);
}

export function crouch(r: Rig, depth = 0.38) {
  const a = r.ankle;
  legs(r, [0, -depth, -0.06], [a.out + 0.05, a.y, a.z + 0.06], [a.out + 0.05, a.y, a.z - 0.12], 1.4);
  r.turn(B.spine, [1, 0, 0], 18);
}

/** seated (car seat / chair): seatH = pelvis height above floor */
export function seated(r: Rig, seatH = 0.55, feetFwd = 0.5) {
  const a = r.ankle;
  legs(r, [0, seatH - r.hipY, -0.05], [a.out + 0.04, a.y, feetFwd], [a.out + 0.04, a.y, feetFwd], 1.5);
}

/** knee raised for a step-up (window climb / vault tuck). side = raised leg */
export function kneeUp(r: Rig, side: "L" | "R", height = 0.75, fwd = 0.35) {
  const s = side === "L" ? "l" : "r";
  r.ik(B[`${s}Thigh` as const], B[`${s}Calf` as const], B[`${s}Foot` as const],
    r.w(r.mx(side, [r.ankle.out, height - 0.35, fwd + 0.05])), r.w(r.mx(side, [r.ankle.out, height + 0.2, fwd + 1])));
}

/** head yaw (deg, + = toward character's left) and pitch (deg, + = down), split over neck/head */
export function look(r: Rig, yaw: number, pitch = 0) {
  const lx = r.leftX;
  r.turn(B.neck, [0, 1, 0], yaw * 0.4 * lx);
  r.turn(B.head, [0, 1, 0], yaw * 0.6 * lx);
  if (pitch) {
    r.turn(B.neck, [1, 0, 0], pitch * 0.4);
    r.turn(B.head, [1, 0, 0], pitch * 0.6);
  }
}

export type Face = Partial<Record<"browUp" | "browDown" | "wide" | "blink" | "eyesL" | "eyesR" | "eyesDown" | "jaw" | "press", number>>;

/** face morphs (0..1). eyesL/eyesR = gaze to the CHARACTER's left/right */
export function face(r: Rig, f: Face) {
  r.morph("AK_03_BrowInnerUp", f.browUp ?? 0);
  r.morph("AK_04_BrowOuterUpLeft", (f.browUp ?? 0) * 0.6);
  r.morph("AK_05_BrowOuterUpRight", (f.browUp ?? 0) * 0.6);
  r.morph("AK_01_BrowDownLeft", f.browDown ?? 0);
  r.morph("AK_02_BrowDownRight", f.browDown ?? 0);
  r.morph("AK_21_EyeWideLeft", f.wide ?? 0);
  r.morph("AK_22_EyeWideRight", f.wide ?? 0);
  r.morph("AU_45_Blink", f.blink ?? 0);
  r.morph("AU_61_EyesTurnLeft", f.eyesL ?? 0);
  r.morph("AU_62_EyesTurnRight", f.eyesR ?? 0);
  r.morph("AU_64_EyesDown", f.eyesDown ?? 0);
  r.morph("AK_25_JawOpen", f.jaw ?? 0);
  r.morph("AK_36_MouthPressLeft", f.press ?? 0);
  r.morph("AK_37_MouthPressRight", f.press ?? 0);
}

export const deg = D;

/** one knee down (left knee on the floor, right foot planted forward): the locksmith at the safe */
export function kneel(r: Rig, drop = 0.4) {
  const a = r.ankle;
  r.shiftPelvis(0, -drop, -0.06);
  r.plant("L", [a.out, 0.13, -0.42], [a.out, 0.05, 0.6]);
  r.plant("R", [a.out + 0.02, a.y, 0.24], [a.out + 0.05, 0.7, 1.2]);
}
