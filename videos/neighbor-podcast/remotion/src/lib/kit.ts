// Small mesh kit shared by the Neighbor Podcast sets and props (meters, Y up). Every mesh casts and receives
// shadows. Materials are low-gloss MeshStandardMaterial, matching Phil's early PC-game look.
import * as THREE from "three";

export type XYZ = [number, number, number];

export const std = (o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
export const col = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => std({ color, ...o });

export const shadowed = <M extends THREE.Mesh>(m: M) => ((m.castShadow = true), (m.receiveShadow = true), m);

export function group(parent: THREE.Object3D, p: XYZ = [0, 0, 0], name?: string) {
  const g = new THREE.Group();
  g.position.set(...p);
  if (name) g.name = name;
  parent.add(g);
  return g;
}

export function box(parent: THREE.Object3D, size: XYZ, mat: THREE.Material, p: XYZ) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(...size), mat));
  m.position.set(...p);
  parent.add(m);
  return m;
}

/** box whose texture repeats every `tile` meters on each face (world-scaled UVs) */
export function tiledBox(parent: THREE.Object3D, size: XYZ, mat: THREE.Material, p: XYZ, tile = 1) {
  const g = new THREE.BoxGeometry(...size);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ax > 0.5 ? [pos.getZ(i), pos.getY(i)] : ay > 0.5 ? [pos.getX(i), pos.getZ(i)] : [pos.getX(i), pos.getY(i)];
    uv.setXY(i, u / tile, v / tile);
  }
  const m = shadowed(new THREE.Mesh(g, mat));
  m.position.set(...p);
  parent.add(m);
  return m;
}

export function cyl(parent: THREE.Object3D, rt: number, rb: number, h: number, mat: THREE.Material, p: XYZ, seg = 16) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
  m.position.set(...p);
  parent.add(m);
  return m;
}

export function sph(parent: THREE.Object3D, r: number, mat: THREE.Material, p: XYZ, s: XYZ = [1, 1, 1], seg = 20) {
  const m = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat));
  m.position.set(...p);
  m.scale.set(...s);
  parent.add(m);
  return m;
}

/** cylinder (or capsule) spanning two points */
export function bar(parent: THREE.Object3D, a: XYZ, b: XYZ, r: number, mat: THREE.Material, capsule = false, seg = 12) {
  const s = new THREE.Vector3(...a), e = new THREE.Vector3(...b);
  const len = s.distanceTo(e);
  const geo = capsule ? new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, seg) : new THREE.CylinderGeometry(r, r, len, seg);
  const m = shadowed(new THREE.Mesh(geo, mat));
  m.position.copy(s.clone().lerp(e, 0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.sub(s).normalize());
  parent.add(m);
  return m;
}

/** flat ground patch (plane) at height y */
export function flat(parent: THREE.Object3D, w: number, d: number, mat: THREE.Material, p: XYZ) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(...p);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** soft dark blob under a character or prop: grounds contacts at phone size */
let blobTex: THREE.CanvasTexture | null = null;
export function contactBlob(parent: THREE.Object3D, w: number, d: number, p: XYZ, opacity = 0.45) {
  if (!blobTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, "rgba(0,0,0,1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(...p);
  m.renderOrder = 1;
  parent.add(m);
  return m;
}

/** deterministic hash noise for per-frame jitter (grain seeds, sway) */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
