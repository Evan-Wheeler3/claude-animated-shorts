import * as THREE from "three";

export type V3 = [number, number, number];
export type CamKey = { f: number; pos: V3; look: V3; fov: number; roll?: number };

export const smoother = (t: number) => {
  t = THREE.MathUtils.clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** 0..1 eased progress of `f` through [a, b] */
export const ramp = (f: number, a: number, b: number) => smoother((f - a) / Math.max(1e-6, b - a));

/** Smootherstep glide between camera keys (holds before the first / after the last key). */
export function applyCam(cam: THREE.PerspectiveCamera, keys: CamKey[], f: number, aspect: number) {
  let a = keys[0], b = keys[0];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].f <= f) a = keys[i];
    if (keys[i].f >= f) { b = keys[i]; break; }
    b = keys[i];
  }
  const t = a === b ? 0 : smoother((f - a.f) / (b.f - a.f));
  const pos = lerp3(a.pos, b.pos, t), look = lerp3(a.look, b.look, t);
  cam.position.set(...pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(...look);
  const roll = lerp(a.roll ?? 0, b.roll ?? 0, t);
  if (roll) cam.rotateZ(THREE.MathUtils.degToRad(roll));
  cam.fov = lerp(a.fov, b.fov, t);
  cam.aspect = aspect;
  cam.near = 0.03;
  cam.far = 400;
  cam.updateProjectionMatrix();
}
