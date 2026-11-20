// Articulated procedural characters: the baby (S03/S04) and the bear (S09/S10).
// Both are joint hierarchies of THREE.Groups (rigid segments, no skinning), posed every frame with world-space
// two-bone IK, the same approach as lib/rig.ts uses for the Rocketbox skeletons. Origins sit on the floor between
// the feet; characters face +Z. Every pose starts from `reset()`.
import * as THREE from "three";
import { T, tex, noise } from "./lib/tex";
import { col, std, sph, type XYZ } from "./lib/kit";
import { headphones } from "./props";

const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

/** a joint: Group at the pivot. Segment meshes hang along -Y (limbs) or +Y (spine/neck) inside it */
function joint(parent: THREE.Object3D, p: XYZ, name: string) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...p);
  parent.add(g);
  return g;
}

/** ellipsoid segment between local origin and `end`, radius r (x/z scale sx, sz) */
function seg(parent: THREE.Object3D, end: XYZ, r: number, mat: THREE.Material, sx = 1, sz = 1) {
  const e = new THREE.Vector3(...end);
  const len = e.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 0.4), 6, 14), mat);
  m.castShadow = m.receiveShadow = true;
  m.position.copy(e.clone().multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.clone().normalize());
  m.scale.set(sx, 1, sz);
  parent.add(m);
  return m;
}

abstract class Puppet {
  root = new THREE.Group();
  private rest = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion }>();
  protected snapshot() {
    this.root.traverse((o) => { if (o !== this.root) this.rest.set(o, { p: o.position.clone(), q: o.quaternion.clone() }); }); // root is placed by the shot
  }
  reset() {
    for (const [o, r] of this.rest) {
      o.position.copy(r.p);
      o.quaternion.copy(r.q);
    }
    this.root.updateMatrixWorld(true);
  }
  /** character space -> world */
  w(p: XYZ) {
    this.root.updateMatrixWorld(true);
    return this.root.localToWorld(new THREE.Vector3(...p));
  }
  protected worldRot(o: THREE.Object3D, q: THREE.Quaternion) {
    o.parent!.getWorldQuaternion(_pq);
    o.getWorldQuaternion(_wq);
    _wq.premultiply(q);
    o.quaternion.copy(_pq.invert().multiply(_wq));
    o.updateMatrixWorld(true);
  }
  /** rotate `o` (about its pivot) so its child joint `child` points at world `target` */
  aim(o: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
    const p = o.getWorldPosition(_a);
    const cur = child.getWorldPosition(_b).sub(p).normalize();
    const want = _c.copy(target).sub(p).normalize();
    _q.setFromUnitVectors(cur, want);
    this.worldRot(o, _q);
  }
  /** rotate about a character-space axis (degrees) */
  turn(o: THREE.Object3D, axis: XYZ, deg: number) {
    const ax = new THREE.Vector3(...axis).normalize().applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()));
    this.worldRot(o, _q.setFromAxisAngle(ax, THREE.MathUtils.degToRad(deg)));
  }
  /** two-bone IK in world space; targets/poles are character-space points */
  ik(upper: THREE.Object3D, lower: THREE.Object3D, end: THREE.Object3D, target: XYZ, pole: XYZ) {
    this.root.updateMatrixWorld(true);
    const T = this.w(target), P = this.w(pole);
    const pu = upper.getWorldPosition(new THREE.Vector3()), pl = lower.getWorldPosition(new THREE.Vector3()), pe = end.getWorldPosition(new THREE.Vector3());
    const a = pu.distanceTo(pl), b = pl.distanceTo(pe);
    const toT = T.clone().sub(pu);
    const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const dir = toT.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const bend = P.clone().sub(pu);
    bend.sub(dir.clone().multiplyScalar(bend.dot(dir))).normalize();
    const elbow = pu.clone().add(dir.clone().multiplyScalar(a * cosA)).add(bend.multiplyScalar(a * Math.sqrt(Math.max(0, 1 - cosA * cosA))));
    this.aim(upper, lower, elbow);
    this.aim(lower, end, pu.clone().add(dir.multiplyScalar(d)));
  }
}

// ======================================================================================== BABY
// ~10-month-old, 0.72 m standing. Pale-yellow footed onesie, bare hands, wispy hair.
export class Baby extends Puppet {
  pelvis: THREE.Group; chest: THREE.Group; neck: THREE.Group; head: THREE.Group;
  arm: Record<"L" | "R", [THREE.Group, THREE.Group, THREE.Group]> = {} as never;
  leg: Record<"L" | "R", [THREE.Group, THREE.Group, THREE.Group]> = {} as never;
  mouth: THREE.Mesh; lids: THREE.Mesh[] = [];
  static HIP = 0.33;

  constructor() {
    super();
    const onesie = std({ map: tex("onesie", 128, (g, w, h) => {
      g.fillStyle = "#ecd9a0";
      g.fillRect(0, 0, w, h);
      noise(g, w, h, ["#d8c48a", "#f6e8bc"], 0.18);
      g.fillStyle = "rgba(160,190,220,0.45)";
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) g.fillRect(x + 6, y + 6, 4, 4);
    }), roughness: 0.92 });
    const skin = std({ map: T.paint("babyskin", "#e8b496"), roughness: 0.75 });
    const r = this.root;
    this.pelvis = joint(r, [0, Baby.HIP, 0], "Baby_Pelvis");
    sph(this.pelvis, 0.105, onesie, [0, -0.01, 0], [1, 0.82, 0.9]); // diaper-padded seat
    this.chest = joint(this.pelvis, [0, 0.05, 0], "Baby_Chest");
    seg(this.chest, [0, 0.16, 0.005], 0.092, onesie, 1.05, 0.88);
    this.neck = joint(this.chest, [0, 0.215, 0.005], "Baby_Neck");
    this.head = joint(this.neck, [0, 0.03, 0], "Baby_Head");
    sph(this.head, 0.074, skin, [0, 0.07, 0.006], [1, 1.04, 1.02], 28);
    sph(this.head, 0.06, skin, [0, 0.035, 0.03], [1.05, 0.8, 0.9], 22); // cheeks / jaw
    const hair = col(0x8a6a48, { roughness: 1 });
    sph(this.head, 0.07, hair, [0, 0.1, -0.008], [0.98, 0.62, 0.96], 24);
    sph(this.head, 0.016, hair, [0.01, 0.155, 0.02], [1, 1.4, 1]);
    const eye = col(0x241812, { roughness: 0.3 });
    for (const s of [-1, 1]) {
      sph(this.head, 0.0115, col(0xf5efe8, { roughness: 0.4 }), [s * 0.026, 0.074, 0.067], [1, 1, 0.5]);
      sph(this.head, 0.0085, eye, [s * 0.026, 0.074, 0.071], [1, 1, 0.5]);
      const lid = sph(this.head, 0.013, skin, [s * 0.026, 0.078, 0.069], [1, 0.05, 0.6]);
      this.lids.push(lid);
      sph(this.head, 0.016, skin, [s * 0.072, 0.066, 0.0], [0.45, 1, 0.7]); // ears
      const brow = sph(this.head, 0.012, col(0xa8805a), [s * 0.027, 0.094, 0.068], [1.2, 0.18, 0.4]);
      brow.rotation.z = -s * 0.1;
    }
    sph(this.head, 0.011, skin, [0, 0.058, 0.08], [1, 0.8, 0.8]); // nose
    this.mouth = sph(this.head, 0.012, col(0x7a3a32, { roughness: 0.6 }), [0, 0.034, 0.073], [1.1, 0.35, 0.5]);
    for (const s of ["L", "R"] as const) {
      const x = s === "L" ? 0.085 : -0.085;
      const sh = joint(this.chest, [x, 0.17, 0], `Baby_${s}_Shoulder`);
      seg(sh, [0, -0.11, 0], 0.03, onesie);
      const el = joint(sh, [0, -0.11, 0], `Baby_${s}_Elbow`);
      seg(el, [0, -0.095, 0], 0.026, onesie);
      const wr = joint(el, [0, -0.1, 0], `Baby_${s}_Wrist`);
      sph(wr, 0.026, skin, [0, -0.018, 0.004], [0.85, 1.05, 0.7]);
      sph(wr, 0.01, skin, [(s === "L" ? -1 : 1) * 0.018, -0.008, 0.012], [1, 1.6, 1]); // thumb
      this.arm[s] = [sh, el, wr];
      const hx = s === "L" ? 0.05 : -0.05;
      const hip = joint(this.pelvis, [hx, -0.03, 0.01], `Baby_${s}_Hip`);
      seg(hip, [0, -0.15, 0], 0.042, onesie);
      const kn = joint(hip, [0, -0.15, 0], `Baby_${s}_Knee`);
      seg(kn, [0, -0.13, 0], 0.035, onesie);
      const an = joint(kn, [0, -0.13, 0], `Baby_${s}_Ankle`);
      sph(an, 0.034, onesie, [0, -0.012, 0.03], [0.85, 0.6, 1.5]); // footed onesie
      this.leg[s] = [hip, kn, an];
    }
    this.snapshot();
  }

  /** `up` 0 = sitting on the mattress, 1 = standing straight holding the rail. Rail grips/feet in character space. */
  pose(up: number, o: { grip: Record<"L" | "R", XYZ | null>; lap?: Record<"L" | "R", XYZ>; headYaw?: number; headPitch?: number; blink?: number; mouth?: number }) {
    this.reset();
    const u = THREE.MathUtils.clamp(up, 0, 1);
    const sit = 1 - u;
    // pelvis: sitting on the mattress (0.11 up, 0.06 back) -> standing (HIP)
    const py = THREE.MathUtils.lerp(0.105, Baby.HIP, u);
    this.pelvis.position.set(0, py, THREE.MathUtils.lerp(-0.07, 0, u));
    // seated: thighs forward, slight back tilt; mid-rise: forward lean over the hands
    const lean = u < 1 ? Math.sin(Math.min(1, u * 1.1) * Math.PI) * 22 : 0;
    this.turn(this.chest, [1, 0, 0], lean + sit * 4);
    for (const s of ["L", "R"] as const) {
      const sx = s === "L" ? 1 : -1;
      const [h, k, a] = this.leg[s];
      if (u < 0.12) {
        // seated: legs out in front, soles facing forward-out
        const f = u / 0.12;
        this.ik(h, k, a, [sx * 0.1, 0.04, THREE.MathUtils.lerp(0.2, 0.08, f)], [sx * 0.2, 0.25, 0.2]);
      } else {
        this.ik(h, k, a, [sx * 0.065, 0.03, 0.02], [sx * 0.07, 0.3, 0.6]);
      }
      const [sh, el, wr] = this.arm[s];
      const g = o.grip[s];
      const tgt = g ?? o.lap?.[s] ?? [sx * 0.08, py + 0.08, 0.1];
      this.ik(sh, el, wr, tgt as XYZ, [sx * 0.35, py + 0.1, -0.25]);
    }
    if (o.headYaw) this.turn(this.head, [0, 1, 0], o.headYaw);
    this.turn(this.head, [1, 0, 0], (o.headPitch ?? 0) - lean * 0.6);
    const b = o.blink ?? 0;
    for (const l of this.lids) l.scale.y = 0.05 + b * 0.95;
    this.mouth.scale.set(1.1 - (o.mouth ?? 0) * 0.3, 0.35 + (o.mouth ?? 0) * 0.9, 0.5);
    this.root.updateMatrixWorld(true);
  }
}

// ======================================================================================== BEAR
// American black bear, ~1.0 m at the shoulder on all fours, wearing over-ear headphones.
export class Bear extends Puppet {
  pelvis: THREE.Group; chest: THREE.Group; neck: THREE.Group; head: THREE.Group; jaw: THREE.Group;
  front: Record<"L" | "R", [THREE.Group, THREE.Group, THREE.Group]> = {} as never;
  hind: Record<"L" | "R", [THREE.Group, THREE.Group, THREE.Group]> = {} as never;
  phones: THREE.Group;
  static SPINE = 0.62; // pelvis -> shoulders

  constructor() {
    super();
    const fur = std({ map: T.fur("#2b2520", "bear"), roughness: 0.97 });
    const furD = std({ map: T.fur("#221d19", "bear2"), roughness: 0.97 });
    const muzzle = std({ map: T.fur("#8a7158", "muzzle"), roughness: 0.95 });
    const pad = col(0x151312, { roughness: 0.8 });
    const r = this.root;
    // pelvis joint; the torso runs along local +Y (upright when sitting, pitched 90° to walk on all fours)
    this.pelvis = joint(r, [0, 0.75, 0], "Bear_Pelvis");
    sph(this.pelvis, 0.3, fur, [0, 0.06, 0], [1, 0.95, 0.92], 24);
    this.chest = joint(this.pelvis, [0, 0.12, 0], "Bear_Chest");
    seg(this.chest, [0, Bear.SPINE - 0.12, 0.02], 0.3, fur, 1.0, 0.92);
    sph(this.chest, 0.3, fur, [0, Bear.SPINE - 0.16, 0.03], [1.04, 0.9, 0.95], 24); // shoulder hump
    this.neck = joint(this.chest, [0, Bear.SPINE - 0.08, 0.06], "Bear_Neck");
    seg(this.neck, [0, 0.17, 0.06], 0.17, fur);
    this.head = joint(this.neck, [0, 0.2, 0.08], "Bear_Head");
    sph(this.head, 0.17, fur, [0, 0.03, 0], [1, 0.95, 1.05], 26);
    sph(this.head, 0.09, muzzle, [0, -0.02, 0.17], [0.95, 0.82, 1.25], 20);
    sph(this.head, 0.036, col(0x0d0c0c, { roughness: 0.35 }), [0, 0.01, 0.275], [1.2, 0.85, 0.8]); // nose
    this.jaw = joint(this.head, [0, -0.06, 0.08], "Bear_Jaw");
    sph(this.jaw, 0.07, muzzle, [0, -0.012, 0.1], [0.85, 0.45, 1.1], 18);
    for (const s of [-1, 1]) {
      sph(this.head, 0.019, col(0x0a0909, { roughness: 0.25 }), [s * 0.07, 0.07, 0.14]); // eyes
      sph(this.head, 0.055, furD, [s * 0.12, 0.17, -0.02], [1, 1, 0.55]); // ears
      sph(this.head, 0.03, muzzle, [s * 0.12, 0.17, 0.005], [1, 1, 0.3]);
    }
    // headphones over the ears: band over the crown, cups on the sides of the head
    this.phones = headphones(this.head, 0.165, 0x8d9298); // light grey: reads on IR and against black fur
    this.phones.position.set(0, 0.07, -0.01);
    this.phones.rotation.x = -0.15;
    for (const s of ["L", "R"] as const) {
      const sx = s === "L" ? 1 : -1;
      const sh = joint(this.chest, [sx * 0.2, Bear.SPINE - 0.2, 0.05], `Bear_${s}_Shoulder`);
      seg(sh, [0, -0.32, 0], 0.11, fur);
      const el = joint(sh, [0, -0.32, 0], `Bear_${s}_Elbow`);
      seg(el, [0, -0.3, 0], 0.085, fur);
      const wr = joint(el, [0, -0.3, 0], `Bear_${s}_Wrist`);
      sph(wr, 0.09, fur, [0, -0.03, 0.04], [1, 0.62, 1.25], 18);
      sph(wr, 0.06, pad, [0, -0.07, 0.04], [1, 0.25, 1.1], 14);
      for (let i = -1; i <= 1; i++) sph(wr, 0.012, col(0xc9c0b0, { roughness: 0.5 }), [i * 0.035, -0.05, 0.14], [1, 0.8, 2]); // claws
      this.front[s] = [sh, el, wr];
      const hp = joint(this.pelvis, [sx * 0.17, 0.0, 0.02], `Bear_${s}_Hip`);
      seg(hp, [0, -0.36, 0], 0.15, fur, 1, 1.05);
      const kn = joint(hp, [0, -0.36, 0], `Bear_${s}_Knee`);
      seg(kn, [0, -0.3, 0], 0.095, fur);
      const an = joint(kn, [0, -0.3, 0], `Bear_${s}_Ankle`);
      sph(an, 0.095, fur, [0, -0.04, 0.08], [1, 0.55, 1.7], 18);
      sph(an, 0.07, pad, [0, -0.075, 0.08], [1, 0.2, 1.5], 14);
      this.hind[s] = [hp, kn, an];
    }
    this.snapshot();
  }

  /** On all fours. phase 0..1 walk cycle; `moving` 0 = standing still. */
  walk(phase: number, moving: number) {
    this.reset();
    const P = (t: number) => Math.sin(t * Math.PI * 2);
    const bob = Math.abs(Math.cos(phase * Math.PI * 2)) * 0.03 * moving;
    this.pelvis.position.set(0, 0.74 + bob, -0.5);
    this.turn(this.pelvis, [1, 0, 0], 82); // torso forward along +Z
    this.turn(this.pelvis, [0, 0, 1], P(phase) * 3 * moving);
    this.turn(this.neck, [1, 0, 0], -55);
    this.turn(this.head, [1, 0, 0], -20 + P(phase * 2) * 2 * moving);
    const stride = 0.34 * moving;
    const step = (ph: number) => ({ z: Math.cos(ph * Math.PI * 2) * stride * 0.5, y: Math.max(0, P(ph)) * 0.09 * moving });
    for (const s of ["L", "R"] as const) {
      const sx = s === "L" ? 1 : -1;
      const off = s === "L" ? 0 : 0.5;
      const fp = step(phase + off + 0.25), hp = step(phase + off);
      const [sh, el, wr] = this.front[s];
      this.ik(sh, el, wr, [sx * 0.2, 0.1 + fp.y, 0.15 + fp.z], [sx * 0.25, 0.6, -0.6]);
      const [h, k, a] = this.hind[s];
      this.ik(h, k, a, [sx * 0.19, 0.1 + hp.y, -0.55 + hp.z], [sx * 0.2, 0.4, 0.6]);
    }
    this.root.updateMatrixWorld(true);
  }

  /** Sit transition. `sit` 0 = on all fours in front of the chair (facing away from it), 1 = seated upright.
   *  seatY = top of the chair seat; the chair is behind the bear (−Z in character space). `lean` 0..1 toward the
   *  mic (+Z, pitched forward), `jaw` 0..1, `headYaw` deg toward the host (+ = character's left). */
  sit(sit: number, seatY: number, o: { lean?: number; jaw?: number; headYaw?: number; headPitch?: number; breathe?: number } = {}) {
    this.reset();
    const s = THREE.MathUtils.clamp(sit, 0, 1);
    const e = s * s * (3 - 2 * s);
    const lean = o.lean ?? 0;
    // pelvis moves back over the seat and down; torso goes from horizontal (82°) to upright (−6° = slight slump)
    const py = THREE.MathUtils.lerp(0.74, seatY + 0.17, e) - Math.sin(e * Math.PI) * 0.06;
    const pz = THREE.MathUtils.lerp(0.25, -0.12, e);
    this.pelvis.position.set(0, py, pz);
    const rear = s < 0.45 ? THREE.MathUtils.lerp(82, 10, s / 0.45) : THREE.MathUtils.lerp(10, -6, (s - 0.45) / 0.55);
    this.turn(this.pelvis, [1, 0, 0], rear + lean * 22);
    this.chest.scale.setScalar(1 + (o.breathe ?? 0) * 0.025);
    this.turn(this.neck, [1, 0, 0], THREE.MathUtils.lerp(-55, 8, e) + lean * 10);
    if (o.headYaw) this.turn(this.head, [0, 1, 0], o.headYaw);
    this.turn(this.head, [1, 0, 0], THREE.MathUtils.lerp(-20, 0, e) + (o.headPitch ?? 0));
    this.turn(this.jaw, [1, 0, 0], (o.jaw ?? 0) * 22);
    for (const side of ["L", "R"] as const) {
      const sx = side === "L" ? 1 : -1;
      // hind feet: planted on the ground ahead of the chair, knees up and out
      const [h, k, a] = this.hind[side];
      const footZ = THREE.MathUtils.lerp(0.2, 0.42, e); // s=0 matches the last walk pose
      this.ik(h, k, a, [sx * THREE.MathUtils.lerp(0.19, 0.26, e), 0.1, footZ], [sx * 0.45, 0.9, 0.9]);
      // front paws: from the ground to resting on the knees (or reaching for the mic when leaning)
      const [sh, el, wr] = this.front[side];
      const ground: XYZ = [sx * 0.2, 0.1, 0.9];
      const knee: XYZ = [sx * 0.26, seatY + 0.2 + lean * 0.1, 0.28 + lean * 0.12];
      const t = THREE.MathUtils.clamp((s - 0.35) / 0.65, 0, 1);
      const tgt: XYZ = [THREE.MathUtils.lerp(ground[0], knee[0], t), THREE.MathUtils.lerp(ground[1], knee[1], t) + Math.sin(t * Math.PI) * 0.15, THREE.MathUtils.lerp(ground[2], knee[2], t)];
      this.ik(sh, el, wr, tgt, [sx * 0.6, 1.0, -0.4]);
    }
    this.root.updateMatrixWorld(true);
  }

  /** world position of the snout tip (for the mic-distance check) */
  snout(out = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    return this.head.localToWorld(out.set(0, 0.01, 0.29));
  }
}
