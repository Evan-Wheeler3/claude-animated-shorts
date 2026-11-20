// S01-S02: the front porch. House front wall at z = 0 facing +Z. Door at x = -0.85, video doorbell at x = -0.2.
// The host's chair sits on the porch slab (y 0.15); the guest's chair sits in the flower bed (soil y 0.06) and sinks.
// S01: fixed fisheye from the doorbell lens. S02: side view (-X end of the porch) then back to the fisheye for the
// swing; the bat barrel reaches the lens on CUE.impact and the episode cuts to black.
import * as THREE from "three";
import { B, type Rig } from "../lib/rig";
import { face, legs, look, seated, walk } from "../lib/poses";
import { box, col, contactBlob, cyl, flat, group, sph, std, tiledBox, type XYZ } from "../lib/kit";
import { T } from "../lib/tex";
import { cw, handTo, hostSeatedMic, inHand, lookAtWorld, skyDome, tree } from "../lib/act";
import { applyCam, lerp, ramp, type CamKey } from "../lib/cam";
import { faceAt, jawFrom, makeGuest, makeHost, makeOwner } from "../lib/cast";
import { bat as makeBat, doorbell, foldingChair, microphone, notes as makeNotes, sideTable, waterGlass } from "../props";
import { CUE, HOST_ENV } from "../shots";
import type { Fx } from "../lib/post";

export type SetOut = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; fx: Fx; black?: boolean };

const PORCH_Y = 0.15, SOIL_Y = 0.06;
const HOST_CHAIR: XYZ = [-0.46, PORCH_Y, 1.38];
const GUEST_CHAIR: XYZ = [0.5, SOIL_Y, 1.34];
const TABLE: XYZ = [0.0, PORCH_Y, 1.72];

export async function loadPorch() {
  const scene = new THREE.Scene();
  skyDome(scene, "porch", "#5f8fcf", "#cfdde6");
  scene.fog = new THREE.Fog(0xcfdde6, 25, 110);
  scene.add(new THREE.HemisphereLight(0xc8d8f0, 0x6a5a3a, 1.0));
  const sun = new THREE.DirectionalLight(0xffe2bc, 2.7);
  sun.position.set(6, 8, 3.5);
  sun.target.position.set(0, 0.5, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -6;
  sc.right = sc.top = 6;
  sc.near = 1;
  sc.far = 30;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const bounce = new THREE.DirectionalLight(0xffd9b0, 0.7); // warm bounce off the siding onto faces
  bounce.position.set(0, 1.4, -3);
  bounce.target.position.set(0, 1, 2);
  scene.add(bounce, bounce.target);

  // ---------- ground, yard, street ----------
  flat(scene, 120, 120, std({ map: T.grass([50, 50]) }), [0, 0, 0]);
  flat(scene, 1.1, 7, std({ map: T.concrete([1, 5]) }), [-0.85, 0.012, 5.8]); // front walk
  flat(scene, 120, 7, std({ map: T.asphalt([30, 2]) }), [0, 0.014, 13]);
  flat(scene, 120, 1.4, std({ map: T.concrete([60, 1]) }), [0, 0.02, 9]);
  const houseMat = (c: string) => std({ map: T.paint(`opp-${c}`, c) });
  for (const [x, w, h, c] of [[-9, 7, 3.2, "#c9b48f"], [-1, 8, 3.6, "#a8b4b8"], [8, 7, 3.1, "#b98f74"]] as const) {
    box(scene, [w, h, 6], houseMat(c), [x, h / 2, 20]);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 1.6, 4), std({ map: T.shingles([3, 3]) }));
    roof.position.set(x, h + 0.8, 20);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.85);
    scene.add(roof);
  }
  [[-4.5, 10.8, 6], [4, 11, 7], [-12, 11.5, 5.5], [11, 6, 6.5], [3.6, 3.8, 3.2]].forEach(([x, z, h], i) => tree(scene, [x, 0, z], h, "leafy", i + 2));

  // ---------- house front ----------
  const siding = std({ map: T.siding([1, 1]), color: 0xd9cfc0 });
  // wall with a real doorway (x -1.31..-0.39, up to y 2.33) and a dark hall behind it
  tiledBox(scene, [3.69, 3.2, 0.2], siding, [-3.155, 1.6, -0.1], 1.4);
  tiledBox(scene, [5.39, 3.2, 0.2], siding, [2.305, 1.6, -0.1], 1.4);
  tiledBox(scene, [0.92, 0.87, 0.2], siding, [-0.85, 2.765, -0.1], 1.4);
  box(scene, [2.4, 2.6, 0.05], col(0x2a2520), [-0.85, 1.3, -1.6]);
  box(scene, [2.4, 0.05, 1.6], col(0x3a2c22), [-0.85, PORCH_Y - 0.02, -0.8]);
  for (const x of [-2.05, 0.35]) box(scene, [0.05, 2.6, 1.6], col(0x5a4c3e), [x, 1.3, -0.8]);
  const hall = new THREE.PointLight(0xffd2a0, 1.2, 4, 2);
  hall.position.set(-0.85, 2.2, -1.0);
  scene.add(hall);
  const trim = std({ map: T.paint("trim", "#efe9dc"), roughness: 0.7 });
  box(scene, [10, 0.18, 0.06], trim, [0, 0.09, 0.03]);
  // door + frame (opens inward on the left hinge)
  for (const x of [-1.36, -0.34]) box(scene, [0.1, 2.24, 0.08], trim, [x, PORCH_Y + 1.1, 0.02]);
  box(scene, [1.12, 0.1, 0.08], trim, [-0.85, PORCH_Y + 2.22, 0.02]);
  const doorHinge = group(scene, [-0.85 - 0.46, PORCH_Y, 0.03], "DoorHinge");
  box(doorHinge, [0.92, 2.08, 0.05], std({ map: T.frontDoor(), roughness: 0.6 }), [0.46, 1.04, 0]);
  sph(doorHinge, 0.028, std({ color: 0xc9a14e, metalness: 0.85, roughness: 0.3 }), [0.82, 1.0, 0.04]);
  // window to the right of the flower bed
  box(scene, [1.3, 1.25, 0.06], trim, [1.55, 1.55, 0.02]);
  box(scene, [1.12, 1.07, 0.04], std({ color: 0x223040, roughness: 0.15, metalness: 0.3 }), [1.55, 1.55, 0.05]);
  box(scene, [0.04, 1.07, 0.05], trim, [1.55, 1.55, 0.06]);
  box(scene, [1.12, 0.04, 0.05], trim, [1.55, 1.55, 0.06]);
  // porch light
  const lamp = group(scene, [-1.6, PORCH_Y + 1.75, 0.05]);
  box(lamp, [0.12, 0.2, 0.06], col(0x1f1f1f, { metalness: 0.4, roughness: 0.5 }), [0, 0, 0.03]);
  cyl(lamp, 0.05, 0.05, 0.14, std({ color: 0xf0e2c0, emissive: 0xffd9a0, emissiveIntensity: 0.25, roughness: 0.4 }), [0, -0.02, 0.08], 12);
  // porch slab, step, posts and roof
  const concrete = std({ map: T.concrete([1, 1]) });
  tiledBox(scene, [2.6, PORCH_Y, 2.5], concrete, [-1.0, PORCH_Y / 2, 1.25], 1.2);
  tiledBox(scene, [1.2, PORCH_Y / 2, 0.35], concrete, [-0.85, PORCH_Y / 4, 2.67], 1.2);
  for (const x of [-2.2, 0.2]) box(scene, [0.12, 2.6, 0.12], trim, [x, PORCH_Y + 1.3, 2.38]);
  box(scene, [2.75, 0.16, 0.18], trim, [-1.0, PORCH_Y + 2.62, 2.38]);
  tiledBox(scene, [2.75, 0.06, 2.55], std({ map: T.paint("soffit", "#e6dfd0") }), [-1.0, PORCH_Y + 2.72, 1.2], 1.5);
  // flower bed: edging + soil + flowers
  const soil = std({ map: T.fur("#4a3726", "soil"), roughness: 1 });
  tiledBox(scene, [2.1, SOIL_Y, 2.4], soil, [1.27, SOIL_Y / 2, 1.2], 0.8);
  for (const [w, d, x, z] of [[2.2, 0.08, 1.27, 2.42], [0.08, 2.45, 2.32, 1.2]] as const) box(scene, [w, 0.1, d], col(0x8a8378), [x, 0.05, z]);
  const petals = [0xd8453a, 0xf0c040, 0xe58fb2, 0xf3efe6];
  const leaf = col(0x3f6a2a, { roughness: 0.9 });
  for (let i = 0; i < 26; i++) {
    const x = 0.32 + ((i * 0.37) % 1.9), z = 0.15 + ((i * 0.61) % 2.15);
    if (Math.hypot(x - GUEST_CHAIR[0], z - GUEST_CHAIR[2]) < 0.45) continue;
    sph(scene, 0.09, leaf, [x, SOIL_Y + 0.07, z], [1, 0.7, 1], 10);
    for (let k = 0; k < 3; k++) sph(scene, 0.025, col(petals[(i + k) % 4], { roughness: 0.7 }), [x + Math.sin(k * 2.1 + i) * 0.06, SOIL_Y + 0.15, z + Math.cos(k * 2.1 + i) * 0.06], [1, 0.6, 1], 8);
  }

  // ---------- kit ----------
  const bell = doorbell(scene, [-0.2, PORCH_Y + 1.2, 0.0]);
  scene.updateMatrixWorld(true);
  const lens = bell.lens.getWorldPosition(new THREE.Vector3());
  const hostChair = foldingChair(scene, HOST_CHAIR, 1);
  hostChair.rotation.y = Math.PI + 0.12;
  const guestChair = foldingChair(scene, GUEST_CHAIR, 1, 0x6b5a45);
  guestChair.rotation.y = Math.PI - 0.22;
  sideTable(scene, TABLE);
  const glass = waterGlass(scene, [0, 0, 0]);
  const mic = microphone(scene);
  const notesProp = makeNotes(scene);
  const batProp = makeBat(scene);
  contactBlob(scene, 0.7, 0.6, [HOST_CHAIR[0], PORCH_Y + 0.003, HOST_CHAIR[2]], 0.35);

  // ---------- cast ----------
  const [host, guest, owner] = await Promise.all([makeHost(), makeGuest(), makeOwner()]);
  scene.add(host.root, guest.root, owner.root);

  const fisheye = new THREE.PerspectiveCamera(104, 9 / 16, 0.005, 200);
  const side = new THREE.PerspectiveCamera(42, 9 / 16, 0.03, 200);
  const SIDE_CAM: CamKey[] = [
    { f: 210, pos: [-3.6, 1.55, 3.3], look: [-0.62, 1.05, 0.45], fov: 44 },
    { f: 322, pos: [-3.35, 1.5, 3.05], look: [-0.55, 1.1, 0.42], fov: 40 },
  ];

  const tableTop = new THREE.Vector3(TABLE[0] + 0.08, PORCH_Y + 0.565, TABLE[2] - 0.05);

  function poseGuest(f: number) {
    // chair sinks into the bed through S01-S02 (8 cm, tipping back-left)
    const sink = ramp(f, 30, 300);
    guestChair.position.set(GUEST_CHAIR[0], SOIL_Y - 0.08 * sink, GUEST_CHAIR[2]);
    guestChair.rotation.set(-0.07 * sink, Math.PI - 0.22, 0.05 * sink);
    guest.reset();
    guest.root.position.copy(guestChair.position);
    guest.root.rotation.copy(guestChair.rotation);
    seated(guest, 0.55, 0.42);
    guest.armsDown();
    guest.reach("L", [0.16, 0.6, 0.36], [0.5, 0.4, 0.0]);
    guest.reach("R", [0.16, 0.6, 0.36], [0.5, 0.4, 0.0]);
    guest.update();
    // eyes: the glass, then down at the sinking chair, then back to the host
    if (f < 60) lookAtWorld(guest, tableTop, 0.8);
    else if (f > 140 && f < 175) look(guest, 0, 22);
    else lookAtWorld(guest, host.pos(B.head), 0.7);
    faceAt(guest, f, 3, { eyesDown: f > 140 && f < 175 ? 0.6 : 0, browUp: f > 145 && f < 175 ? 0.35 : 0 });
  }

  /** host: S01 setting the glass, walking to his chair, sitting, notes, lens look; S02 seated, mic at rest */
  function poseHost(f: number) {
    host.reset();
    const chairPos = new THREE.Vector3(...HOST_CHAIR);
    const standPos = new THREE.Vector3(TABLE[0] - 0.12, PORCH_Y, TABLE[2] + 0.42);
    const sitT = ramp(f, 70, CUE.hostSits);
    const walkT = ramp(f, 38, 72);
    const pos = standPos.clone().lerp(chairPos, walkT);
    host.root.position.copy(pos);
    host.root.rotation.y = lerp(Math.PI - 0.4, Math.PI + 0.12, walkT);
    const lensT = new THREE.Vector3().copy(lens);
    if (f < 38) {
      // leaning over the table, left hand lowering the glass
      legs(host, [0, -0.04, -0.06], [host.ankle.out, host.ankle.y, host.ankle.z + 0.05], [host.ankle.out, host.ankle.y, host.ankle.z - 0.12]);
      host.turn(B.spine, [1, 0, 0], 22 * (1 - ramp(f, 30, 38)));
      const gy = lerp(tableTop.y + 0.1, tableTop.y, ramp(f, 0, CUE.glassRelease - 4));
      const g = new THREE.Vector3(tableTop.x, gy, tableTop.z);
      if (f < CUE.glassRelease) {
        handTo(host, "L", g.clone().add(new THREE.Vector3(0.02, 0.05, 0.07)), cw(host, [0.5 * host.leftX, 0.9, -0.3]));
        glass.position.set(g.x, g.y, g.z);
      } else {
        host.reach("L", [0.2, 0.95, 0.15], [0.4, 1.1, -0.4]);
        glass.position.copy(tableTop);
      }
      host.reach("R", [0.22, 0.9, 0.06], [0.35, 1.15, -0.5]);
      inHand(host, "R", mic, cw(host, [-0.24 * host.leftX, 0.6, 0.35]));
      lookAtWorld(host, tableTop, 0.8);
    } else if (sitT < 1) {
      glass.position.copy(tableTop);
      if (sitT <= 0) walk(host, ((f - 38) / 30) % 1, 0.32 * (1 - ramp(f, 62, 70)), false);
      else seated(host, lerp(host.hipY, 0.55, sitT), lerp(0.05, 0.48, sitT));
      host.reach("R", [0.24, lerp(0.92, 0.7, sitT), lerp(0.08, 0.22, sitT)], [0.4, 1.1, -0.4]);
      inHand(host, "R", mic, cw(host, [-0.24 * host.leftX, 0.5, 0.5]));
      host.reach("L", [0.18, lerp(0.92, 0.66, sitT), lerp(0.1, 0.32, sitT)], [0.5, 1.0, -0.3]);
      look(host, 10, 6);
    } else {
      glass.position.copy(tableTop);
      const speaking = f >= 116 && f < 200;
      const micT = 0;
      hostSeatedMic(host, mic, 0.55, micT, guest.pos(B.head));
      if (!speaking && f < 116) {
        // mic resting on the thigh before he starts
        host.reach("R", [0.18, 0.7, 0.3], [0.5, 0.9, -0.3]);
        inHand(host, "R", mic, cw(host, [-0.1 * host.leftX, 0.75, 0.75]));
      }
      if (f >= 210) {
        host.reach("R", [0.18, 0.7, 0.3], [0.5, 0.9, -0.3]);
        inHand(host, "R", mic, cw(host, [-0.1 * host.leftX, 0.75, 0.75]));
      }
      // notes in the left hand: squared with two taps on the knee
      const tap = f >= CUE.notesTap[0] && f < CUE.notesTap[1] + 6 ? Math.abs(Math.sin(((f - CUE.notesTap[0]) / 7) * Math.PI)) : 0;
      host.reach("L", [0.12, 0.72 + tap * 0.05, 0.42], [0.55, 0.9, -0.2]);
      if (f < 116) look(host, 0, 28);
      else if (f < 210) lookAtWorld(host, lensT, 1);
      else lookAtWorld(host, owner.pos(B.head), Math.min(1, ramp(f, 236, 260) * 0.8));
    }
    host.update();
    // notes follow the left palm once he is seated
    if (f >= 70) {
      inHand(host, "L", notesProp, cw(host, [0.12 * host.leftX, 0.72, 1.2]), 30);
      notesProp.rotateX(-Math.PI / 2 + 0.2);
    } else notesProp.position.set(HOST_CHAIR[0], PORCH_Y + 0.47, HOST_CHAIR[2]);
    const jaw = jawFrom(HOST_ENV, f);
    faceAt(host, f, 1, { jaw, eyesDown: f > 92 && f < 114 ? 0.7 : 0 });
  }

  /** homeowner: S02 out of the door with the bat, to the doorbell; wind-up and swing into the lens */
  function poseOwner(f: number) {
    owner.reset();
    if (f < 210) {
      owner.root.visible = false;
      batProp.visible = false;
      return;
    }
    owner.root.visible = batProp.visible = true;
    const p0 = new THREE.Vector3(-0.85, PORCH_Y, -0.35), p1 = new THREE.Vector3(-0.95, PORCH_Y, 0.45), p2 = new THREE.Vector3(-0.62, PORCH_Y, 0.98);
    const walkA = ramp(f, 226, 262), walkB = ramp(f, 270, 300);
    const pos = p0.clone().lerp(p1, walkA).lerp(p2, walkB);
    owner.root.position.copy(pos);
    const faceBell = Math.atan2(lens.x - pos.x, lens.z - pos.z);
    owner.root.rotation.y = lerp(0.1, faceBell, ramp(f, 250, 290));
    const moving = (f > 226 && f < 262) || (f > 270 && f < 300);
    if (moving) walk(owner, ((f - 226) / 26) % 1, 0.45, false);
    else legs(owner, [0, -0.03, 0], [owner.ankle.out + 0.06, owner.ankle.y, owner.ankle.z + 0.12], [owner.ankle.out + 0.06, owner.ankle.y, owner.ankle.z - 0.14]);
    owner.update();
    // bat: knob point K (world) and barrel direction D (world)
    const chest = owner.pos(B.spine2);
    const right = new THREE.Vector3(-owner.leftX, 0, 0).applyQuaternion(owner.root.quaternion);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(owner.root.quaternion);
    const up = new THREE.Vector3(0, 1, 0);
    let K: THREE.Vector3, D: THREE.Vector3, twist = 0;
    const carry = () => ({ K: chest.clone().addScaledVector(fwd, 0.22).addScaledVector(up, -0.32).addScaledVector(right, 0.05), D: up.clone().multiplyScalar(0.7).addScaledVector(right, 0.5).addScaledVector(fwd, 0.25).normalize() });
    const ready = () => ({ K: chest.clone().addScaledVector(fwd, 0.2).addScaledVector(up, -0.05).addScaledVector(right, 0.12), D: up.clone().multiplyScalar(0.85).addScaledVector(right, 0.35).addScaledVector(fwd, -0.35).normalize() });
    const wound = () => ({ K: chest.clone().addScaledVector(fwd, 0.12).addScaledVector(up, 0.05).addScaledVector(right, 0.22), D: up.clone().multiplyScalar(0.55).addScaledVector(right, 0.55).addScaledVector(fwd, -0.65).normalize() });
    if (f < 300) {
      const a = carry(), b = ready(), t = ramp(f, 284, 300);
      K = a.K.lerp(b.K, t);
      D = a.D.lerp(b.D, t).normalize();
    } else if (f < CUE.swingStart) {
      const a = ready(), b = wound(), t = ramp(f, 318, CUE.swingStart);
      K = a.K.lerp(b.K, t);
      D = a.D.lerp(b.D, t).normalize();
      twist = -28 * t;
    } else {
      // swing: accelerate from the wound pose to the lens; at impact - 1 the barrel sits ~6 cm in front of the lens
      const b = wound();
      const s = Math.min(1, (f - CUE.swingStart) / (CUE.impact - 1 - CUE.swingStart));
      const e = s * s * s;
      // contact pose: barrel sweet spot (0.62 m) just in front of the lens, bat sweeping across it
      const camFwd = new THREE.Vector3(0.22, 0.95 - lens.y, 1.6 - lens.z).normalize();
      const hit = lens.clone().addScaledVector(camFwd, 0.04);
      const toHit = hit.clone().sub(chest);
      const Dc = toHit.addScaledVector(camFwd, -toHit.dot(camFwd)).normalize(); // across the lens
      const Kc = hit.clone().addScaledVector(Dc, -0.62);
      K = b.K.lerp(Kc, e);
      const q = new THREE.Quaternion().setFromUnitVectors(b.D, Dc);
      D = b.D.clone().applyQuaternion(new THREE.Quaternion().slerp(q, e));
      twist = lerp(-28, 26, e);
    }
    owner.turn(B.spine1, [0, 1, 0], twist * 0.5 * owner.leftX);
    owner.turn(B.spine2, [0, 1, 0], twist * 0.5 * owner.leftX);
    owner.update();
    const toBody = chest.clone().sub(K).normalize();
    const hL = K.clone().addScaledVector(D, 0.05).addScaledVector(toBody, 0.06);
    const hR = K.clone().addScaledVector(D, 0.14).addScaledVector(toBody, 0.06);
    handTo(owner, "L", hL, chest.clone().addScaledVector(up, -0.5).addScaledVector(right, -0.4));
    handTo(owner, "R", hR, chest.clone().addScaledVector(up, -0.5).addScaledVector(right, 0.5));
    owner.curl("L", 70, 50);
    owner.curl("R", 70, 50);
    batProp.position.copy(K);
    batProp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), D);
    if (f < CUE.fisheyeCut) lookAtWorld(owner, lens, 0.9);
    else lookAtWorld(owner, lens, 1);
    faceAt(owner, f, 5, { browDown: 0.85, press: 0.7, wide: f > CUE.swingStart ? 0.4 : 0 });
  }

  function pose(f: number, aspect: number): SetOut {
    // front door swings in for the homeowner (S02)
    doorHinge.rotation.y = 1.5 * ramp(f, CUE.doorOpen, CUE.doorOpen + 16);
    poseGuest(f);
    poseOwner(f);
    poseHost(f);
    if (f >= CUE.impact && f < 366) return { scene, camera: fisheye, fx: { mode: "clean" }, black: true };
    const useFish = f < 210 || f >= CUE.fisheyeCut;
    if (useFish) {
      fisheye.position.copy(lens).add(new THREE.Vector3(0, 0, 0.005));
      fisheye.aspect = aspect;
      fisheye.lookAt(0.02, 0.95, 1.6);
      fisheye.updateProjectionMatrix();
      return { scene, camera: fisheye, fx: { mode: "fisheye" } };
    }
    applyCam(side, SIDE_CAM, f, aspect);
    return { scene, camera: side, fx: { mode: "clean" } };
  }
  return { pose };
}

void face;
