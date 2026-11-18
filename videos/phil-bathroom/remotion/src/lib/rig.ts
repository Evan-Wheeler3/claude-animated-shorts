// Character rigs for the episode: the supplied Phil_Standing_Rig (Rocketbox Bip01, 80 bones, 23 face morphs) and a
// provisional clothed homeowner (supplied Homeowner_Face rebound onto a standing body clone, shirt hue-shifted).
// Posing is done in WORLD terms (rotate a bone about a world axis, aim a bone at a point, two-bone IK) so we never
// depend on the Biped's local bone axes. Every pose starts from the rest A-pose: call `reset()` first each frame.
import * as THREE from "three";
import { cloneRig, loadGLB } from "./load";

const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

export const B = {
  pelvis: "Bip01_Pelvis", spine: "Bip01_Spine", spine1: "Bip01_Spine1", spine2: "Bip01_Spine2", neck: "Bip01_Neck", head: "Bip01_Head",
  lClav: "Bip01_L_Clavicle", lUp: "Bip01_L_UpperArm", lFore: "Bip01_L_Forearm", lHand: "Bip01_L_Hand",
  rClav: "Bip01_R_Clavicle", rUp: "Bip01_R_UpperArm", rFore: "Bip01_R_Forearm", rHand: "Bip01_R_Hand",
  lThigh: "Bip01_L_Thigh", lCalf: "Bip01_L_Calf", lFoot: "Bip01_L_Foot", lToe: "Bip01_L_Toe0",
  rThigh: "Bip01_R_Thigh", rCalf: "Bip01_R_Calf", rFoot: "Bip01_R_Foot", rToe: "Bip01_R_Toe0",
} as const;

export class Rig {
  root = new THREE.Group(); // place/turn the character with this (origin on the floor between the feet, faces +Z)
  bones = new Map<string, THREE.Bone>();
  private rest = new Map<THREE.Bone, { p: THREE.Vector3; q: THREE.Quaternion }>();
  face: THREE.Mesh | null = null;

  constructor(model: THREE.Object3D, faceName: string) {
    this.root.add(model);
    model.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone) {
        this.bones.set(b.name, b);
        this.rest.set(b, { p: b.position.clone(), q: b.quaternion.clone() });
      }
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false; // skinned bounds come from the rest pose; posed limbs would cull wrongly
        if (m.name === faceName) this.face = m;
      }
    });
    this.root.updateMatrixWorld(true);
    const l = this.root.worldToLocal(this.pos(B.lUp)), r = this.root.worldToLocal(this.pos(B.rUp));
    this.leftX = l.x > r.x ? 1 : -1;
    const la = this.root.worldToLocal(this.pos(B.lFoot));
    this.ankle = { out: Math.abs(la.x), y: la.y, z: la.z };
    this.hipY = this.root.worldToLocal(this.pos(B.pelvis)).y;
  }
  /** rest ankle (outward x, height, z) and pelvis height in character space */
  ankle = { out: 0.1, y: 0.08, z: 0 };
  hipY = 0.9;

  bone(name: string) {
    const b = this.bones.get(name);
    if (!b) throw new Error(`missing bone ${name}`);
    return b;
  }

  reset() {
    for (const [b, r] of this.rest) {
      b.position.copy(r.p);
      b.quaternion.copy(r.q);
    }
    const inf = this.face?.morphTargetInfluences;
    if (inf) inf.fill(0);
    this.root.updateMatrixWorld(true);
  }

  update() {
    this.root.updateMatrixWorld(true);
  }

  /** world position of a bone */
  pos(name: string, out = new THREE.Vector3()) {
    return this.bone(name).getWorldPosition(out);
  }

  /** rotate a bone about a WORLD axis (degrees), keeping its children attached */
  turn(name: string, axis: THREE.Vector3 | [number, number, number], deg: number) {
    const b = this.bone(name);
    const ax = Array.isArray(axis) ? _a.set(...axis) : _a.copy(axis);
    ax.normalize();
    // character-relative axes: rotate the given axis by the root's world rotation
    ax.applyQuaternion(this.root.getWorldQuaternion(_wq));
    _q.setFromAxisAngle(ax, THREE.MathUtils.degToRad(deg));
    this.applyWorldRot(b, _q);
  }

  private applyWorldRot(b: THREE.Bone, q: THREE.Quaternion) {
    b.parent!.getWorldQuaternion(_pq);
    b.getWorldQuaternion(_wq);
    _wq.premultiply(q);
    b.quaternion.copy(_pq.invert().multiply(_wq));
    b.updateMatrixWorld(true);
  }

  /** rotate `name` so that its child bone points at a world target */
  aim(name: string, child: string, target: THREE.Vector3) {
    const b = this.bone(name);
    const p = b.getWorldPosition(_b);
    const cur = this.bone(child).getWorldPosition(_c).sub(p).normalize();
    const want = _d.copy(target).sub(p).normalize();
    _q.setFromUnitVectors(cur, want);
    this.applyWorldRot(b, _q);
  }

  /** analytic two-bone IK: upper->lower->end reaches `target`, bending toward world point `pole` */
  ik(upper: string, lower: string, end: string, target: THREE.Vector3, pole: THREE.Vector3) {
    const pu = this.pos(upper), pl = this.pos(lower), pe = this.pos(end);
    const a = pu.distanceTo(pl), b = pl.distanceTo(pe);
    const toT = target.clone().sub(pu);
    const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const dir = toT.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const bend = pole.clone().sub(pu);
    bend.sub(dir.clone().multiplyScalar(bend.dot(dir))).normalize();
    const elbow = pu.clone().add(dir.clone().multiplyScalar(a * cosA)).add(bend.multiplyScalar(a * Math.sqrt(Math.max(0, 1 - cosA * cosA))));
    this.aim(upper, lower, elbow);
    this.aim(lower, end, pu.clone().add(dir.multiplyScalar(d)));
  }

  /** hand reach in character space (root-relative coordinates, meters); pole likewise */
  reach(side: "L" | "R", target: [number, number, number], pole: [number, number, number]) {
    const s = side === "L" ? "l" : "r";
    this.ik(B[`${s}Up` as const], B[`${s}Fore` as const], B[`${s}Hand` as const], this.w(this.mx(side, target)), this.w(this.mx(side, pole)));
  }

  /** +1 if the character's left side is +X in character space (computed from the rest skeleton) */
  leftX = 1;
  /** mirror an OUTWARD-x character-space point onto the given side */
  mx(side: "L" | "R", p: [number, number, number]): [number, number, number] {
    const sgn = side === "L" ? this.leftX : -this.leftX;
    return [p[0] * sgn, p[1], p[2]];
  }

  /** plant a foot (ankle) in character space; pole = knee direction point */
  plant(side: "L" | "R", ankle: [number, number, number], pole: [number, number, number]) {
    const s = side === "L" ? "l" : "r";
    this.ik(B[`${s}Thigh` as const], B[`${s}Calf` as const], B[`${s}Foot` as const], this.w(this.mx(side, ankle)), this.w(this.mx(side, pole)));
  }

  /** character-space point -> world */
  w(p: [number, number, number]) {
    return this.root.localToWorld(new THREE.Vector3(...p));
  }

  /** move the pelvis in character space (meters), e.g. a crouch; legs must be re-planted afterwards */
  shiftPelvis(dx: number, dy: number, dz: number) {
    const pel = this.bone(B.pelvis);
    const wp = pel.getWorldPosition(new THREE.Vector3()).add(
      new THREE.Vector3(dx, dy, dz).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion())),
    );
    pel.parent!.worldToLocal(wp);
    pel.position.copy(wp);
    pel.updateMatrixWorld(true);
  }

  /** curl all fingers of a hand (degrees per joint) about the hand's own palm axis */
  curl(side: "L" | "R", deg: number, thumbDeg = deg * 0.5) {
    for (const f of ["0", "1", "2", "3", "4"]) {
      for (const seg of ["", "1", "2"]) {
        const b = this.bones.get(`Bip01_${side}_Finger${f}${seg}`);
        if (b) b.rotateZ(THREE.MathUtils.degToRad(f === "0" ? thumbDeg * 0.6 : deg));
      }
    }
    this.update();
  }

  morph(name: string, v: number) {
    const dict = this.face?.morphTargetDictionary;
    const inf = this.face?.morphTargetInfluences;
    if (!dict || !inf || dict[name] === undefined) return;
    inf[dict[name]] = v;
  }

  /** Relaxed stand: hands hang beside the thighs, elbows soft and slightly back */
  armsDown(handY = 0.86, out = 0.24, fwd = 0.04) {
    this.reach("L", [out, handY, fwd], [out + 0.1, 1.15, -0.5]);
    this.reach("R", [out, handY, fwd], [out + 0.1, 1.15, -0.5]);
  }
}

const PHIL = "bathroom/assets/Phil_Standing_Rig.glb";
const CAST = "bathroom/assets/Bathroom_Cast.glb";

export async function makePhil(url: (p: string) => string): Promise<Rig> {
  const g = await loadGLB(url(PHIL));
  return new Rig(cloneRig(g.scene), "Phil_Face");
}

/** Re-dye the polo (the green-dominant region of the wardrobe atlas; skin and khaki are red-dominant) to `tint`,
 *  keeping the original fabric luminance variation. */
function recolorShirt(tex: THREE.Texture, tint: THREE.Color): THREE.Texture {
  const img = tex.image as HTMLImageElement | ImageBitmap;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d")!;
  g.drawImage(img as CanvasImageSource, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  const REF_L = 0.47; // mean luminance of the sage polo
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] / 255, gr = p[i + 1] / 255, b = p[i + 2] / 255;
    const k = THREE.MathUtils.smoothstep(gr - r, -0.005, 0.03) * (gr > b ? 1 : 0);
    if (k <= 0) continue;
    const l = (0.299 * r + 0.587 * gr + 0.114 * b) / REF_L;
    p[i] = 255 * Math.min(1, r + (tint.r * l - r) * k);
    p[i + 1] = 255 * Math.min(1, gr + (tint.g * l - gr) * k);
    p[i + 2] = 255 * Math.min(1, b + (tint.b * l - b) * k);
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY;
  t.colorSpace = tex.colorSpace;
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  return t;
}

/** Phil-body clone with a re-dyed polo (used for the two guards; head swap optional). */
export async function makeExtra(url: (p: string) => string, shirt: string, homeownerHead = false): Promise<Rig> {
  return homeownerHead ? makeHomeowner(url, shirt) : (async () => {
    const g = await loadGLB(url(PHIL));
    const body = cloneRig(g.scene);
    body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.name === "Phil_Wardrobe" && m.isMesh) {
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        if (mat.map) mat.map = recolorShirt(mat.map, new THREE.Color(shirt).convertLinearToSRGB());
        m.material = mat;
      }
    });
    return new Rig(body, "Phil_Face");
  })();
}

/**
 * PROVISIONAL homeowner: the supplied bath likeness (Homeowner_Face, Rocketbox Male_Adult_16 head) skinned onto a
 * standing body clone, Phil's head hidden, shirt hue-shifted to a dusty blue so the two men read apart.
 * Status: placeholder until a dedicated clothed homeowner body/wardrobe is modeled (ASSET-MANIFEST).
 */
export async function makeHomeowner(url: (p: string) => string, shirt = "#6f86a3"): Promise<Rig> {
  const [phil, cast] = await Promise.all([loadGLB(url(PHIL)), loadGLB(url(CAST))]);
  const body = cloneRig(phil.scene);
  const srcFace = cast.scene.getObjectByName("Homeowner_Face") as THREE.SkinnedMesh;
  if (!srcFace?.isSkinnedMesh) throw new Error("Homeowner_Face missing from Bathroom_Cast.glb");
  cast.scene.updateMatrixWorld(true);
  const face = srcFace.clone() as THREE.SkinnedMesh;
  const bones = srcFace.skeleton.bones.map((b) => {
    const t = body.getObjectByName(b.name.replace(/_\d+$/, "")) as THREE.Bone | undefined; // loader suffixes the 2nd rig's bones
    if (!t) throw new Error(`homeowner bone ${b.name} not on body`);
    return t;
  });
  face.name = "Homeowner_Face";
  face.morphTargetInfluences = srcFace.morphTargetInfluences ? srcFace.morphTargetInfluences.map(() => 0) : undefined;
  body.add(face);
  face.bind(new THREE.Skeleton(bones, srcFace.skeleton.boneInverses.map((m) => m.clone())), srcFace.bindMatrix.clone());
  body.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.name === "Phil_Face") m.visible = false;
    if (m.name === "Phil_Wardrobe" && m.isMesh) {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      if (mat.map) mat.map = recolorShirt(mat.map, new THREE.Color(shirt).convertLinearToSRGB());
      m.material = mat;
    }
  });
  return new Rig(body, "Homeowner_Face");
}
