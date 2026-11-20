// Acting helpers shared by every set: hand-held props, look-at, seated host with mic, sky dome, trees.
import * as THREE from "three";
import { B, Rig } from "./rig";
import { look, seated } from "./poses";
import { label, T } from "./tex";
import { bar, col, std, type XYZ } from "./kit";
import { ramp } from "./cam";

const v = (p: XYZ | THREE.Vector3) => (p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(...p));

/** palm centre: 55% of the way from the wrist to the middle-finger base */
export function palm(r: Rig, side: "L" | "R", out = new THREE.Vector3()) {
  const h = r.pos(side === "L" ? B.lHand : B.rHand);
  const f = r.bones.get(`Bip01_${side}_Finger2`);
  if (!f) return out.copy(h);
  return out.copy(h).lerp(f.getWorldPosition(new THREE.Vector3()), 0.75);
}

/** IK a hand so its wrist lands at `wrist` (world), elbow bending toward `pole` (world) */
export function handTo(r: Rig, side: "L" | "R", wrist: XYZ | THREE.Vector3, pole: XYZ | THREE.Vector3) {
  const s = side === "L" ? "l" : "r";
  r.ik(B[`${s}Up` as const], B[`${s}Fore` as const], B[`${s}Hand` as const], v(wrist), v(pole));
}

/** Place a prop (origin = grip, +Y = pointing axis) in the hand, aimed at `aim` (world). Curls the fingers. */
export function inHand(r: Rig, side: "L" | "R", prop: THREE.Object3D, aim: XYZ | THREE.Vector3, curl = 62) {
  r.curl(side, curl, curl * 0.8);
  const p = palm(r, side);
  prop.position.copy(p);
  if (prop.parent) prop.parent.worldToLocal(prop.position);
  const dir = v(aim).sub(p).normalize();
  prop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  prop.updateMatrixWorld(true);
}

/** character-space point of a rig -> world */
export const cw = (r: Rig, p: XYZ) => r.root.localToWorld(new THREE.Vector3(...p));

/** head/eye direction toward a world point: yaw/pitch in degrees for poses.look */
export function lookAtWorld(r: Rig, target: THREE.Vector3, weight = 1) {
  const head = r.pos(B.head);
  const local = r.root.worldToLocal(target.clone()).sub(r.root.worldToLocal(head.clone()));
  const yaw = THREE.MathUtils.radToDeg(Math.atan2(local.x, local.z)) * r.leftX;
  const pitch = -THREE.MathUtils.radToDeg(Math.atan2(local.y, Math.hypot(local.x, local.z)));
  look(r, THREE.MathUtils.clamp(yaw, -70, 70) * weight, THREE.MathUtils.clamp(pitch, -35, 40) * weight);
}

/** Seated host holding the mic in his right hand. `micT` blends between the "own mouth" hold (0) and the
 *  "offered to the guest" hold (1) at world point `guest`. Returns the mic grip world point. */
export function hostSeatedMic(r: Rig, mic: THREE.Object3D, seatH: number, micT: number, guest: THREE.Vector3, feetFwd = 0.48) {
  seated(r, seatH, feetFwd);
  const mouth = r.pos(B.head).add(new THREE.Vector3(0, -0.06, 0)).add(new THREE.Vector3(0, 0, 0.1).applyQuaternion(r.root.quaternion));
  // own hold: wrist under the chin; offered: arm extended toward the guest at their mouth height
  const own = cw(r, [-0.1 * r.leftX, seatH + 0.42, 0.24]);
  const toward = guest.clone().sub(r.pos(B.rUp));
  const reach = Math.min(0.5, toward.length() - 0.12);
  const off = r.pos(B.rUp).add(toward.normalize().multiplyScalar(reach)).add(new THREE.Vector3(0, -0.08, 0));
  const wrist = own.clone().lerp(off, micT);
  handTo(r, "R", wrist, cw(r, [-0.55 * r.leftX, seatH - 0.1, -0.2]));
  inHand(r, "R", mic, mouth.clone().lerp(guest, micT).add(new THREE.Vector3(0, 0.05, 0)));
  return wrist;
}

/** gradient sky dome (MeshBasic, no fog) */
export function skyDome(scene: THREE.Scene, key: string, top: string, horizon: string, radius = 120) {
  const t = label(`sky-${key}`, 32, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top);
    gr.addColorStop(0.48, horizon);
    gr.addColorStop(1, horizon);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, toneMapped: false }));
  scene.add(m);
  return m;
}

/** stylised conifer / deciduous tree; origin at the trunk base */
export function tree(parent: THREE.Object3D, p: XYZ, h = 6, kind: "pine" | "leafy" = "pine", seed = 1) {
  const g = new THREE.Group();
  g.position.set(...p);
  g.rotation.y = seed * 1.7;
  parent.add(g);
  const bark = std({ map: T.fur("#4b3a2b", "bark"), roughness: 0.95 });
  bar(g, [0, 0, 0], [0.02 * Math.sin(seed), h * 0.75, 0], 0.07 + h * 0.012, bark);
  const leaves = std({ map: T.leaves(), color: kind === "pine" ? 0x7f9a86 : 0xa0b080, roughness: 0.95 });
  if (kind === "pine") {
    for (let i = 0; i < 4; i++) {
      const r = (0.95 - i * 0.18) * (h / 6) * 1.2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.3, 9), leaves);
      c.position.y = h * (0.3 + i * 0.17);
      c.castShadow = c.receiveShadow = true;
      g.add(c);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(h * (0.2 + (i % 2) * 0.05), 1), leaves);
      c.position.set(Math.sin(i * 2.3 + seed) * h * 0.13, h * (0.7 + (i % 3) * 0.08), Math.cos(i * 2.3 + seed) * h * 0.13);
      c.castShadow = c.receiveShadow = true;
      g.add(c);
    }
  }
  return g;
}

export { ramp };
export const colr = col;
