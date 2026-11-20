import * as T from "three";
import {staticFile} from "remotion";
import {makeHomeowner, makeRigFrom} from "./lib/rig";
import {handsFront, look, seated} from "./lib/poses";

type XYZ = [number, number, number];
const material = (color: number, metalness = 0) => new T.MeshStandardMaterial({color, roughness: 0.77, metalness});

function mesh(parent: T.Object3D, geometry: T.BufferGeometry, color: number, point: XYZ) {
  const object = new T.Mesh(geometry, material(color));
  object.position.set(...point);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}

const box = (p: T.Object3D, size: XYZ, color: number, point: XYZ) =>
  mesh(p, new T.BoxGeometry(...size), color, point);

function oval(p: T.Object3D, size: XYZ, color: number, point: XYZ) {
  const object = mesh(p, new T.SphereGeometry(1, 24, 16), color, point);
  object.scale.set(...size);
  return object;
}

function bar(p: T.Object3D, a: XYZ, b: XYZ, radius: number, color: number) {
  const start = new T.Vector3(...a);
  const end = new T.Vector3(...b);
  const object = mesh(p, new T.CylinderGeometry(radius, radius, start.distanceTo(end), 12), color,
    start.clone().lerp(end, 0.5).toArray());
  object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize());
}

function group(parent: T.Object3D, point: XYZ) {
  const result = new T.Group();
  result.position.set(...point);
  parent.add(result);
  return result;
}

function chair(parent: T.Object3D, point: XYZ, scale = 1) {
  const p = group(parent, point);
  p.scale.setScalar(scale);
  box(p, [0.48, 0.045, 0.44], 0x57614c, [0, 0.46, 0]);
  box(p, [0.48, 0.23, 0.045], 0x57614c, [0, 0.84, -0.21]);
  for (const x of [-0.22, 0.22]) {
    bar(p, [x, 0.015, -0.28], [x, 0.49, 0.21], 0.017, 0x454448);
    bar(p, [x, 0.015, 0.26], [x, 0.94, -0.23], 0.017, 0x454448);
  }
  return p;
}

function microphone(scene: T.Scene, hand: T.Vector3, tip: XYZ) {
  const base = hand.toArray();
  bar(scene, base, tip, 0.029, 0x292a2d);
  oval(scene, [0.047, 0.053, 0.047], 0x34363d, tip);
}

function stage(background: number, floor: number, key: XYZ, night = false) {
  const scene = new T.Scene();
  scene.background = new T.Color(background);
  scene.fog = new T.Fog(background, 7, 18);
  scene.add(new T.HemisphereLight(night ? 0xb5c1c7 : 0xffe3bb, 0x433829, night ? 0.8 : 1.45));
  const sun = new T.DirectionalLight(night ? 0xbecfd4 : 0xffd1a0, 2.1);
  sun.position.set(...key);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  box(scene, [28, 0.12, 24], floor, [0, -0.065, 0]);
  return scene;
}

function view(position: XYZ, target: XYZ, fov = 48) {
  const camera = new T.PerspectiveCamera(fov, 9 / 16, 0.045, 36);
  camera.position.set(...position);
  camera.lookAt(...target);
  return camera;
}

function wallBoards(scene: T.Scene, z: number, color: number) {
  for (let i = 0; i < 18; i++) {
    box(scene, [8, 0.175, 0.12], color, [0, i * 0.18 + 0.08, z]);
  }
}

function baby(parent: T.Object3D) {
  const p = group(parent, [0.61, 0.34, -0.03]);
  p.name = "Baby_Stand_Blocking";
  const fabric = 0xedbf70;
  const skin = 0xd79676;
  oval(p, [0.16, 0.19, 0.11], fabric, [0, 0.37, 0]);
  oval(p, [0.138, 0.151, 0.119], skin, [0, 0.61, 0.013]);
  oval(p, [0.028, 0.042, 0.027], 0x694531, [0.02, 0.749, -0.025]);
  for (const x of [-0.065, 0.065]) {
    oval(p, [0.015, 0.02, 0.012], 0x30221c, [x, 0.638, 0.121]);
    bar(p, [x, 0.26, 0], [x, 0.065, 0.015], 0.047, fabric);
    oval(p, [0.06, 0.046, 0.075], fabric, [x, 0.042, 0.04]);
  }
  for (const side of [-1, 1]) {
    bar(p, [side * 0.13, 0.45, 0], [side * 0.17, 0.35, 0.12], 0.042, fabric);
    bar(p, [side * 0.17, 0.35, 0.12], [side * 0.19, 0.37, 0.31], 0.033, skin);
    oval(p, [0.045, 0.038, 0.032], skin, [side * 0.19, 0.37, 0.31]);
  }
  oval(p, [0.026, 0.014, 0.012], 0x844a3c, [0, 0.573, 0.128]);
}

function bear(parent: T.Object3D) {
  const p = group(parent, [0.51, 0, -0.07]);
  p.name = "Bear_Sit_Blocking";
  p.rotation.y = -0.35;
  const fur = 0x514b44;
  oval(p, [0.42, 0.58, 0.32], fur, [0, 0.98, 0]);
  oval(p, [0.32, 0.28, 0.27], fur, [0, 1.52, 0.12]);
  oval(p, [0.22, 0.16, 0.22], 0x7c7062, [0, 1.43, 0.33]);
  oval(p, [0.11, 0.064, 0.07], 0x272728, [0, 1.48, 0.515]);
  for (const side of [-1, 1]) {
    oval(p, [0.105, 0.115, 0.065], fur, [side * 0.235, 1.74, 0.08]);
    oval(p, [0.031, 0.027, 0.019], 0x171818, [side * 0.115, 1.56, 0.351]);
    oval(p, [0.17, 0.36, 0.19], fur, [side * 0.34, 0.87, 0.17]);
    oval(p, [0.15, 0.15, 0.26], fur, [side * 0.22, 0.47, 0.18]);
    oval(p, [0.137, 0.13, 0.213], 0x504741, [side * 0.22, 0.14, 0.40]);
    oval(p, [0.069, 0.15, 0.118], 0x20252b, [side * 0.319, 1.56, 0.14]);
  }
  const headband = new T.CatmullRomCurve3([
    new T.Vector3(-0.33, 1.60, 0.12), new T.Vector3(-0.24, 1.80, 0.12),
    new T.Vector3(0, 1.85, 0.12), new T.Vector3(0.24, 1.80, 0.12), new T.Vector3(0.33, 1.60, 0.12),
  ]);
  mesh(p, new T.TubeGeometry(headband, 24, 0.026, 9, false), 0x22272c, [0, 0, 0]);
}

const host = () => makeRigFrom(staticFile, "cast/Host_Blocking_Rig.glb", "Phil_Face");
const homeowner = () => makeHomeowner(staticFile);

async function porch() {
  const scene = stage(0xb2b9a0, 0x64694b, [2, 5, 3]);
  wallBoards(scene, -1.25, 0x9b896f);
  box(scene, [1.02, 2.05, 0.10], 0x51483c, [-0.72, 1, -1.12]);
  box(scene, [0.91, 0.49, 0.032], 0x9eb0a6, [-0.72, 1.68, -1.05]);
  box(scene, [2.5, 0.08, 2.6], 0xaba191, [-0.55, 0.01, 0.08]);
  box(scene, [1.29, 0.06, 1.8], 0x594939, [0.91, 0.008, -0.15]);
  for (let i = 0; i < 13; i++) {
    const x = 0.36 + (i % 3) * 0.39;
    const z = -0.88 + Math.floor(i / 3) * 0.36;
    oval(scene, [0.13, 0.08, 0.12], i % 2 ? 0x4a693b : 0x667248, [x, 0.06, z]);
  }
  const [a, b] = await Promise.all([host(), homeowner()]);
  scene.add(a.root, b.root);
  a.root.position.set(-0.57, 0.055, -0.15);
  a.root.rotation.y = 0.24;
  b.root.position.set(0.64, 0, -0.37);
  b.root.rotation.y = -0.23;
  chair(scene, [-0.57, 0.055, -0.15]).rotation.y = 0.24;
  chair(scene, [0.64, 0, -0.37]).rotation.y = -0.23;
  seated(a, 0.55);
  seated(b, 0.49);
  handsFront(a, 0.83, 0.33);
  handsFront(b, 0.70, 0.31);
  look(a, 0, -9);
  const table = group(scene, [0.03, 0, 0.55]);
  box(table, [0.35, 0.04, 0.32], 0x645341, [0, 0.65, 0]);
  for (const x of [-0.14, 0.14]) {
    for (const z of [-0.12, 0.12]) bar(table, [x, 0.01, z], [x, 0.65, z], 0.018, 0x423a34);
  }
  mesh(table, new T.CylinderGeometry(0.045, 0.035, 0.102, 20), 0x8da6a4, [0.08, 0.725, 0]);
  box(table, [0.13, 0.01, 0.17], 0xd6c5a5, [-0.07, 0.676, 0]);
  microphone(scene, a.w(a.mx("R", [0.13, 0.83, 0.33])), [-0.37, 1.04, 0.29]);
  return {scene, camera: view([0, 1.49, 1.83], [0, 0.76, 0], 57)};
}

async function nursery() {
  const scene = stage(0x514e47, 0x605348, [-2, 4, 3], true);
  box(scene, [8, 3, 0.12], 0x726452, [0, 1.5, -1.35]);
  box(scene, [1.64, 1.05, 0.06], 0x353b43, [0.67, 1.62, -1.26]);
  box(scene, [0.045, 1.12, 0.07], 0x8b7d69, [0.67, 1.62, -1.19]);
  box(scene, [1.69, 0.045, 0.07], 0x8b7d69, [0.67, 1.62, -1.19]);
  const crib = group(scene, [0, 0, 0]);
  box(crib, [1.15, 0.13, 0.67], 0xbcb09d, [0.64, 0.27, 0]);
  for (const z of [-0.34, 0.31]) {
    box(crib, [1.19, 0.055, 0.053], 0x997854, [0.64, 0.72, z]);
    box(crib, [1.19, 0.055, 0.053], 0x997854, [0.64, 0.25, z]);
    for (let i = 0; i < 9; i++) box(crib, [0.036, 0.47, 0.032], 0xa18061, [0.11 + i * 0.133, 0.49, z]);
  }
  for (const x of [0.075, 1.22]) {
    for (const z of [-0.34, 0.31]) box(crib, [0.062, 0.78, 0.065], 0x977151, [x, 0.39, z]);
    box(crib, [0.05, 0.45, 0.66], 0x947554, [x, 0.48, -0.015]);
  }
  baby(crib);
  const a = await host();
  scene.add(a.root);
  chair(scene, [-0.60, 0, -0.13], 0.72).rotation.y = 0.52;
  a.root.position.set(-0.60, 0, -0.13);
  a.root.rotation.y = 0.52;
  seated(a, 0.41);
  handsFront(a, 0.68, 0.31);
  look(a, 20);
  microphone(scene, a.w(a.mx("L", [0.13, 0.68, 0.31])), [0.23, 0.90, 0.32]);
  return {scene, camera: view([0.07, 1.40, 2.47], [0.16, 0.73, 0], 46)};
}

async function safe() {
  const scene = stage(0x605943, 0x6e604d, [0.6, 4, 3]);
  wallBoards(scene, -1.3, 0x8f795c);
  const [a, b] = await Promise.all([host(), homeowner()]);
  scene.add(a.root, b.root);
  a.root.position.set(-0.44, 0, -0.25);
  a.root.rotation.y = 0.33;
  b.root.position.set(0.47, 0, 0);
  b.root.rotation.y = -0.25;
  a.armsDown();
  handsFront(b, 1.03, 0.3);
  look(b, -8, 12);
  microphone(scene, a.w(a.mx("L", [0.22, 0.92, 0.055])), [0.07, 1.33, 0.31]);
  for (const x of [-0.96, 0.96]) box(scene, [0.12, 1.52, 0.5], 0x343c3c, [x, 1.23, 1.57]);
  for (const y of [0.50, 1.96]) box(scene, [1.90, 0.13, 0.5], 0x343c3c, [0, y, 1.57]);
  box(scene, [0.30, 1.42, 0.11], 0x3b4748, [0.94, 1.22, 1.28]).rotation.y = 0.4;
  box(scene, [0.28, 0.13, 0.14], 0x454653, [-0.4, 0.66, 1.42]);
  return {scene, camera: view([0, 1.29, 1.89], [0, 1.30, 0], 56)};
}

async function trail() {
  const scene = stage(0x353c3b, 0x53564e, [1.4, 4, 3], true);
  for (let i = 0; i < 29; i++) {
    const x = Math.sin(i * 32.67) * (3.3 + i * 0.12);
    const z = -1.8 - (i % 7) * 0.67;
    const h = 2.6 + (i % 5) * 0.48;
    bar(scene, [x, 0, z], [x + 0.09, h, z], 0.10 + (i % 4) * 0.024, 0x43443b);
    for (let b = 0; b < 3; b++) {
      mesh(scene, new T.ConeGeometry(0.85 - b * 0.13, 1.17, 8), 0x39473d, [x, h - 0.78 + b * 0.47, z]);
    }
  }
  const a = await host();
  scene.add(a.root);
  chair(scene, [-0.67, 0, -0.08]).rotation.y = 0.37;
  chair(scene, [0.51, 0, -0.07], 1.12).rotation.y = -0.35;
  bear(scene);
  a.root.position.set(-0.67, 0, -0.08);
  a.root.rotation.y = 0.37;
  seated(a, 0.50);
  a.armsDown();
  a.reach("L", [0.34, 0.92, 0.38], [0.5, 0.65, 0.1]);
  look(a, 28, -9);
  microphone(scene, a.w(a.mx("L", [0.34, 0.92, 0.38])), [-0.01, 1.22, 0.29]);
  return {scene, camera: view([0.03, 1.28, 2.98], [0.01, 0.89, 0], 49)};
}

export const keys = {45: "S01-doorbell", 510: "S04-baby-stand", 795: "S06-safe", 1360: "S10-bear"} as const;
export type KeyFrame = keyof typeof keys;
export const buildSet = {45: porch, 510: nursery, 795: safe, 1360: trail};
