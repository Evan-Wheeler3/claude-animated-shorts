// S05-S06: the safe. Floor safe at the origin, front face z = 0 facing +Z, door hinged on the left (-X) edge.
// The confiscated cameras sit on the safe floor; one webcam on the shelf faces out — its view is the S06 feed
// (the neighbor streams from inside the safe). Room: carpet, panelled walls, one warm ceiling practical.
// S05: homeowner kneels front-right, puts the baby monitor in last, pushes the door shut (clunk on CUE.clunk).
// S06: inside-the-safe webcam; the locksmith opens the door, the host is already holding the mic out to him.
import * as THREE from "three";
import { B } from "../lib/rig";
import { crouch, kneel, look } from "../lib/poses";
import { box, col, contactBlob, cyl, flat, group, std, tiledBox, type XYZ } from "../lib/kit";
import { T } from "../lib/tex";
import { cw, handTo, inHand, lookAtWorld } from "../lib/act";
import { applyCam, lerp, ramp, type CamKey } from "../lib/cam";
import { faceAt, jawFrom, makeHost, makeLocksmith, makeOwner } from "../lib/cast";
import { cameraPile, microphone, monitorUnit, safe as makeSafe } from "../props";
import { CUE, HOST_ENV } from "../shots";
import type { SetOut } from "./porch";

const OPEN_S05 = -1.0; // door angle while loading the safe
const OPEN_S06 = -1.75;

export async function loadSafe() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15110d);
  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x3a2c22, 0.55));
  const lamp = new THREE.PointLight(0xffc888, 9, 9, 1.5);
  lamp.position.set(0.4, 2.3, 1.1);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.002;
  scene.add(lamp);
  const fill = new THREE.PointLight(0xffdcb0, 2.5, 5, 1.5);
  fill.position.set(-0.6, 1.2, 1.8);
  scene.add(fill);
  const faceFill = new THREE.PointLight(0xffd8b0, 1.6, 2.2, 1.5); // bounce off the open safe door onto faces
  faceFill.position.set(0.0, 0.95, 0.25);
  scene.add(faceFill);

  // ---------- room ----------
  const panel = std({ map: T.plywood([1, 1]), color: 0xa88c6c });
  tiledBox(scene, [5, 2.6, 0.1], panel, [0, 1.3, -0.9], 1.2);
  tiledBox(scene, [5, 2.6, 0.1], panel, [0, 1.3, 2.6], 1.2);
  tiledBox(scene, [0.1, 2.6, 3.6], panel, [-1.8, 1.3, 0.85], 1.2);
  tiledBox(scene, [0.1, 2.6, 3.6], panel, [1.9, 1.3, 0.85], 1.2);
  flat(scene, 5, 4, std({ map: T.paint("carpet", "#6b5a4a"), roughness: 1 }), [0, 0, 0.85]);
  box(scene, [5, 0.1, 0.03], std({ map: T.paint("skirt", "#e9e1d0") }), [0, 0.05, -0.84]);
  // shelf unit + boxes on the far wall (seen behind the locksmith in S06)
  const shelfWood = std({ map: T.woodFloor([0.5, 0.5]), color: 0xb08a68 });
  for (const y of [0.6, 1.1, 1.6]) box(scene, [1.6, 0.03, 0.35], shelfWood, [0.2, y, 2.38]);
  for (const x of [-0.6, 1.0]) box(scene, [0.03, 1.7, 0.35], shelfWood, [x, 0.85, 2.38]);
  [[-0.3, 0.71, 0x6a4c3a], [0.4, 0.69, 0x445a6a], [0.1, 1.21, 0x8a6a3a], [0.7, 1.19, 0x5a3a3a]].forEach(([x, y, c]) =>
    box(scene, [0.32, 0.2, 0.25], col(c as number), [x as number, y as number, 2.36]));
  // door frame (S06 background left)
  box(scene, [0.95, 2.1, 0.06], std({ map: T.frontDoor() }), [-1.1, 1.05, 2.55]);

  // ---------- safe + cameras ----------
  const S = makeSafe(scene, [0, 0, 0]);
  const pile = cameraPile(S.g, [0, 0.11, -0.3]);
  pile.scale.setScalar(0.95);
  // the shelf webcam: POV for S06
  const shelfCam = group(S.g, [0.04, 0.04 + S.H * 0.55 + 0.01, -0.24], "ShelfWebcam");
  box(shelfCam, [0.1, 0.035, 0.035], col(0x222326), [0, 0.02, 0]);
  cyl(shelfCam, 0.012, 0.012, 0.01, std({ color: 0x050608, roughness: 0.05 }), [0, 0.02, 0.02], 16).rotation.x = Math.PI / 2;
  const mon = monitorUnit(scene, [0, 0, 0]);
  mon.g.scale.setScalar(1);
  contactBlob(scene, 0.9, 0.8, [0, 0.003, -0.3], 0.5);

  // ---------- cast ----------
  const [owner, host, smith] = await Promise.all([makeOwner(), makeHost(), makeLocksmith()]);
  scene.add(owner.root, host.root, smith.root);
  const mic = microphone(scene);
  // locksmith kit: key ring on the belt + a pick in the left hand
  const keys = group(scene, [0, 0, 0], "KeyRing");
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 20), std({ color: 0xb8bcc0, metalness: 0.85, roughness: 0.3 }));
  keys.add(ring);
  for (let i = 0; i < 5; i++) box(keys, [0.008, 0.05, 0.003], std({ color: i % 2 ? 0xc9a14e : 0xb8bcc0, metalness: 0.8, roughness: 0.35 }), [Math.sin(i) * 0.02, -0.04, Math.cos(i) * 0.01]);
  const pick = group(scene, [0, 0, 0], "Pick");
  box(pick, [0.012, 0.09, 0.006], col(0x1a1a1a), [0, 0.0, 0]);
  box(pick, [0.004, 0.07, 0.002], std({ color: 0xc9ccd0, metalness: 0.85, roughness: 0.3 }), [0, 0.08, 0]);

  const camS05 = new THREE.PerspectiveCamera(46, 9 / 16, 0.03, 50);
  const KEYS_S05: CamKey[] = [
    { f: 585, pos: [0.75, 1.2, 1.75], look: [-0.12, 0.45, 0.05], fov: 46 },
    { f: 735, pos: [0.68, 1.12, 1.55], look: [-0.12, 0.45, 0.0], fov: 43 },
  ];
  const pov = new THREE.PerspectiveCamera(84, 9 / 16, 0.005, 50);
  const ownerAt = new THREE.Vector3(-0.3, 0, 0.88);

  function doorPoint(local: XYZ) {
    S.door.updateMatrixWorld(true);
    return S.door.localToWorld(new THREE.Vector3(...local));
  }

  function poseS05(f: number) {
    owner.root.visible = mon.g.visible = true;
    host.root.visible = smith.root.visible = mic.visible = keys.visible = pick.visible = false;
    // door: open while loading, then pushed shut, accelerating, flush on the clunk
    const push = Math.min(1, Math.max(0, (f - CUE.doorPushStart) / (CUE.clunk - 2 - CUE.doorPushStart)));
    S.hinge.rotation.y = lerp(OPEN_S05, 0, push * push);
    S.wheel.rotation.z = f > CUE.clunk ? -ramp(f, CUE.clunk + 2, CUE.clunk + 12) * 1.6 : 0;
    owner.reset();
    owner.root.position.copy(ownerAt);
    owner.root.rotation.y = Math.PI - 0.25;
    crouch(owner, 0.5);
    owner.turn(B.spine, [1, 0, 0], 12);
    owner.update();
    // the monitor: in the right hand, set on top of the pile, released on CUE.monitorRelease
    const pileTop = new THREE.Vector3(0.02, 0.22, -0.27);
    const start = cw(owner, [-0.22 * owner.leftX, 0.62, 0.32]);
    if (f < CUE.monitorRelease) {
      const t = ramp(f, CUE.monitorIn, CUE.monitorRelease - 4);
      const p = start.clone().lerp(pileTop, t);
      p.y += Math.sin(t * Math.PI) * 0.08;
      mon.g.position.copy(p);
      mon.g.rotation.set(0, Math.PI * 0.1 * (1 - t), 0.25 * (1 - t));
      handTo(owner, "R", p.clone().add(new THREE.Vector3(0.07, 0.1, 0.06)), cw(owner, [-0.6 * owner.leftX, 0.6, 0.1]));
    } else {
      mon.g.position.copy(pileTop);
      mon.g.rotation.set(0, 0, 0);
      if (f < CUE.doorPushStart - 10) {
        const back = ramp(f, CUE.monitorRelease, CUE.monitorRelease + 14);
        handTo(owner, "R", pileTop.clone().add(new THREE.Vector3(0.07, 0.1, 0.06)).lerp(cw(owner, [-0.2 * owner.leftX, 0.5, 0.3]), back), cw(owner, [-0.6 * owner.leftX, 0.6, 0.1]));
      }
    }
    // both hands to the door's outer face, then push it flush
    const toDoor = ramp(f, CUE.doorPushStart - 14, CUE.doorPushStart);
    if (f >= CUE.doorPushStart - 14) {
      const hR = doorPoint([S.W * 0.82, -0.1, 0.13]), hL = doorPoint([S.W * 0.82, 0.16, 0.13]);
      const restR = cw(owner, [-0.2 * owner.leftX, 0.5, 0.3]), restL = cw(owner, [0.2 * owner.leftX, 0.5, 0.3]);
      handTo(owner, "R", restR.lerp(hR, toDoor), cw(owner, [-0.7 * owner.leftX, 0.5, -0.2]));
      handTo(owner, "L", restL.lerp(hL, toDoor), cw(owner, [0.7 * owner.leftX, 0.5, -0.2]));
      owner.curl("L", 15);
      owner.curl("R", 15);
    } else {
      owner.reach("L", [0.2, 0.5, 0.3], [0.5, 0.6, -0.2]);
    }
    lookAtWorld(owner, f < CUE.monitorRelease + 8 ? pileTop : doorPoint([S.W * 0.5, 0, 0]), 0.9);
    faceAt(owner, f, 5, { browDown: 0.7, press: f > CUE.doorPushStart ? 0.8 : 0.4, jaw: 0 });
  }

  function poseS06(f: number) {
    owner.root.visible = false;
    mon.g.visible = true;
    mon.g.position.set(0.02, 0.22, -0.27);
    host.root.visible = smith.root.visible = mic.visible = keys.visible = pick.visible = true;
    const open = ramp(f, CUE.safeCrack, CUE.safeOpen);
    S.hinge.rotation.y = lerp(0, OPEN_S06, open) + (f < CUE.safeCrack + 4 && f >= CUE.safeCrack ? -0.02 : 0);
    // locksmith kneeling centre-front, right hand pulling the door edge open
    smith.reset();
    smith.root.position.set(0.12, 0, 0.78);
    smith.root.rotation.y = Math.PI + 0.08;
    kneel(smith, 0.42);
    smith.turn(B.spine, [1, 0, 0], 6);
    smith.update();
    const edge = doorPoint([S.W * 0.9, 0, 0.12]);
    const knee = cw(smith, [-0.18 * smith.leftX, 0.45, 0.38]);
    const handOff = ramp(f, CUE.safeOpen, CUE.safeOpen + 14);
    handTo(smith, "R", edge.clone().lerp(knee, handOff), cw(smith, [-0.7 * smith.leftX, 0.6, -0.1]));
    handTo(smith, "L", cw(smith, [0.16 * smith.leftX, 0.55, 0.32]), cw(smith, [0.6 * smith.leftX, 0.5, -0.2]));
    smith.update();
    inHand(smith, "L", pick, cw(smith, [0.1 * smith.leftX, 0.9, 0.7]), 50);
    keys.position.copy(cw(smith, [-0.17 * smith.leftX, 0.42, 0.08]));
    // host crouched at the locksmith's side, mic already out
    host.reset();
    host.root.position.set(-0.48, 0, 0.92);
    host.root.rotation.y = Math.PI - 0.75;
    crouch(host, 0.42);
    host.update();
    const smithMouth = smith.pos(B.head).add(new THREE.Vector3(0, -0.07, 0)).add(new THREE.Vector3(0, 0, 0.08).applyQuaternion(smith.root.quaternion));
    const hostMouth = host.pos(B.head).add(new THREE.Vector3(0, -0.07, 0));
    const asking = f >= 806 && f < 856;
    const micAim = asking ? hostMouth.clone().lerp(smithMouth, 0.25) : smithMouth;
    const wrist = host.pos(B.rUp).lerp(smithMouth, 0.62).add(new THREE.Vector3(0, -0.1, 0));
    handTo(host, "R", wrist, cw(host, [-0.6 * host.leftX, 0.5, -0.3]));
    host.reach("L", [0.2, 0.55, 0.32], [0.5, 0.6, -0.2]);
    host.update();
    inHand(host, "R", mic, micAim);
    lookAtWorld(host, smith.pos(B.head), 0.9);
    faceAt(host, f, 1, { jaw: jawFrom(HOST_ENV, f) });
    // locksmith: at the host during the question; then down at the open safe, then back to him
    const insideCam = shelfCam.getWorldPosition(new THREE.Vector3());
    if (f >= CUE.lookDown && f < CUE.lookBack) {
      lookAtWorld(smith, insideCam, 1);
      faceAt(smith, f, 7, { eyesDown: 0.5 });
    } else if (f >= CUE.lookBack) {
      lookAtWorld(smith, host.pos(B.head), 0.9);
      faceAt(smith, f, 7, { browUp: 0.15 });
    } else {
      lookAtWorld(smith, f < CUE.safeOpen + 6 ? insideCam : host.pos(B.head), f < CUE.safeOpen + 6 ? 0.6 : 0.85);
      faceAt(smith, f, 7, {});
    }
  }

  function pose(f: number, aspect: number): SetOut {
    if (f < 735) {
      poseS05(f);
      applyCam(camS05, KEYS_S05, f, aspect);
      return { scene, camera: camS05, fx: { mode: "clean" } };
    }
    poseS06(f);
    scene.updateMatrixWorld(true);
    pov.position.copy(shelfCam.localToWorld(new THREE.Vector3(0, 0.02, 0.03)));
    pov.aspect = aspect;
    pov.lookAt(0.05, 1.02, 1.4);
    pov.updateProjectionMatrix();
    // dark until the door cracks; the room light pours in as it opens
    const lightIn = ramp(f, CUE.safeCrack, CUE.safeCrack + 10);
    return { scene, camera: pov, fx: { mode: "webcam", exposure: lerp(0.05, 1.15, lightIn) } };
  }
  void look;
  return { pose };
}
