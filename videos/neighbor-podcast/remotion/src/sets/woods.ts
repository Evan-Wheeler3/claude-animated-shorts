// S07-S10: the woods. Road runs along +X and the pavement ends at x = 0; a dirt track continues through the trees
// to the cabin (steps face -X, bottom step at x = 29.4, z = 0). Travel direction is screen left -> right throughout.
// Trail-cam clearing at (20, 0, -12): the host's adult folding chair + the bear's chair, trail camera strapped to a
// tree at z = -9.4 looking -Z. S09/S10 are night infrared: only the camera's IR flash and a faint sky light.
import * as THREE from "three";
import { B } from "../lib/rig";
import { legs, seated, walk } from "../lib/poses";
import { box, col, contactBlob, flat, group, std, tiledBox, type XYZ } from "../lib/kit";
import { T, tex, noise, r as rnd } from "../lib/tex";
import { cw, handTo, hostSeatedMic, inHand, lookAtWorld, skyDome, tree } from "../lib/act";
import { applyCam, lerp, ramp, type CamKey } from "../lib/cam";
import { faceAt, jawFrom, makeHost, makeOwner } from "../lib/cast";
import { foldingChair, microphone, movingBox, mug as makeMug, trailCam, truck } from "../props";
import { Bear } from "../creatures";
import { CUE, HOST_ENV } from "../shots";
import type { SetOut } from "./porch";

const STEP_X = 29.4, STEP_RISE = 0.18, STEP_RUN = 0.3;
const CLEAR: XYZ = [20, 0, -12];
const HOST_CHAIR: XYZ = [CLEAR[0] - 0.36, 0, CLEAR[2] + 0.04];
const BEAR_CHAIR: XYZ = [CLEAR[0] + 0.45, 0, CLEAR[2] - 0.05];
const TCAM: XYZ = [CLEAR[0] - 0.02, 1.0, CLEAR[2] + 3.0];

export async function loadWoods() {
  const scene = new THREE.Scene();
  const sky = skyDome(scene, "woods", "#6d93c8", "#e8d9bc", 150);
  const fog = new THREE.Fog(0xd8d0b8, 18, 90);
  scene.fog = fog;
  const hemi = new THREE.HemisphereLight(0xcfd8e8, 0x4a3a28, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd6a0, 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const irFlash = new THREE.SpotLight(0xffffff, 0, 9, 0.62, 0.7, 1.2);
  scene.add(irFlash, irFlash.target);

  // ---------- ground: road -> broken pavement edge -> dirt track ----------
  const forest = std({ map: tex("forestfloor", 256, (g, w, h) => {
    g.fillStyle = "#5a4a32";
    g.fillRect(0, 0, w, h);
    noise(g, w, h, ["#3f3322", "#7a6a48", "#4c5a2c"], 0.4, [4, 8, 16, 32, 64]);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = ["#8a6a3a", "#6b4a2a", "#a0884a", "#3b4a22"][i % 4];
      g.globalAlpha = 0.45;
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 1 + rnd() * 2);
    }
    g.globalAlpha = 1;
  }, [40, 40]), roughness: 1 });
  flat(scene, 200, 200, forest, [10, 0, 0]);
  flat(scene, 70, 3.6, std({ map: T.asphalt([24, 1.2]) }), [-35, 0.012, 0]);
  for (let i = 0; i < 9; i++) { // ragged pavement edge
    const p = flat(scene, 0.5 + (i % 3) * 0.3, 0.4, std({ map: T.asphalt([0.3, 0.3]) }), [0.15 + (i % 2) * 0.2, 0.012, -1.6 + i * 0.4]);
    p.rotation.z = i * 0.7;
  }
  for (let i = 0; i < 7; i += 1) flat(scene, 3, 0.12, col(0xdcd6c0), [-4 - i * 7, 0.016, 0]); // centre dashes (stop before the edge)
  const dirt = std({ map: T.fur("#7a6446", "dirt"), roughness: 1 });
  const track = flat(scene, 31, 2.2, dirt, [14.5, 0.008, 0]);
  track.material = dirt;

  // ---------- trees (deterministic, keep the road / track / cabin / clearing clear) ----------
  let k = 0;
  for (let i = 0; i < 260; i++) {
    const x = -40 + ((i * 37.13) % 90), z = -30 + ((i * 53.71) % 60);
    if (Math.abs(z) < 2.6 && x < 33) continue;
    if (Math.hypot(x - 32, z - 0) < 5.5) continue;
    if (Math.hypot(x - CLEAR[0], z - CLEAR[2]) < 3.4) continue;
    if (x < 1 && Math.abs(z) < 4.5) continue;
    if (z > 3 && z < 16 && x > -9 && x < 27) continue; // S07 camera paths
    tree(scene, [x, 0, z], 7 + ((i * 7) % 6), i % 5 === 0 ? "leafy" : "pine", ++k);
  }
  const camTree = tree(scene, [TCAM[0] + 0.05, 0, TCAM[2] + 0.18], 9, "pine", 99);
  void camTree;

  // ---------- cabin ----------
  const logs = std({ map: tex("logs", 256, (g, w, h) => {
    g.fillStyle = "#7a5634";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += h / 8) {
      const gr = g.createLinearGradient(0, y, 0, y + h / 8);
      gr.addColorStop(0, "#4a321e");
      gr.addColorStop(0.2, "#8e6640");
      gr.addColorStop(0.7, "#7a5634");
      gr.addColorStop(1, "#3a2616");
      g.fillStyle = gr;
      g.fillRect(0, y, w, h / 8);
    }
    noise(g, w, h, ["#5a3e24", "#9a7650"], 0.18);
  }) });
  const cabin = group(scene, [STEP_X + 3 * STEP_RUN + 1.6 + 2.6, 0, 0], "Cabin");
  tiledBox(cabin, [5.2, 2.8, 6], logs, [0, 1.4 + 0.54, 0], 1.6);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.8, 4), std({ map: T.shingles([3, 3]), color: 0x8a7a6a }));
  roof.position.set(0, 2.8 + 0.54 + 0.9, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 1.25);
  roof.castShadow = true;
  cabin.add(roof);
  const plank = std({ map: T.woodFloor([1, 1]), color: 0xb89a7a });
  tiledBox(scene, [1.6, 0.1, 4], plank, [STEP_X + 3 * STEP_RUN + 0.8, 0.49, 0], 1); // porch deck (y 0.54)
  for (let i = 0; i < 3; i++) tiledBox(scene, [STEP_RUN, STEP_RISE, 1.6], plank, [STEP_X + STEP_RUN * (i + 0.5), STEP_RISE * (i + 0.5), 0], 1);
  for (const z of [-1.9, 1.9]) box(scene, [0.14, 2.6, 0.14], logs, [STEP_X + 3 * STEP_RUN + 0.1, 1.84, z]);
  box(scene, [0.9, 1.9, 0.06], std({ map: T.frontDoor(), color: 0x9a8a7a }), [cabin.position.x - 2.63, 1.5, 0.9]).rotation.y = Math.PI / 2;
  // moving boxes already on the porch + the last one (carried)
  for (const [x, z, r] of [[STEP_X + 1.6, -1.4, 0.2], [STEP_X + 1.9, -1.0, -0.3]] as const) {
    const b = movingBox(scene);
    b.position.set(x, 0.54 + 0.19, z);
    b.rotation.y = r;
  }
  const lastBox = movingBox(scene);

  // ---------- truck at the end of the pavement ----------
  const tr = truck(scene, [-5.0, 0, 0.6]);
  tr.rotation.y = Math.PI / 2;

  // ---------- clearing: chairs, trail cam ----------
  const hostChair = foldingChair(scene, HOST_CHAIR, 1);
  hostChair.rotation.y = 0.22;
  const bearChair = foldingChair(scene, BEAR_CHAIR, 1.12, 0x5a4a3a);
  bearChair.rotation.y = -0.2;
  const tcam = trailCam(scene, TCAM);
  tcam.lookAt(CLEAR[0], 0.8, CLEAR[2]);
  contactBlob(scene, 0.7, 0.6, [HOST_CHAIR[0], 0.004, HOST_CHAIR[2]], 0.4);

  // ---------- cast ----------
  const [host, owner] = await Promise.all([makeHost(), makeOwner()]);
  scene.add(host.root, owner.root);
  const bear = new Bear();
  bear.root.scale.setScalar(0.92);
  scene.add(bear.root);
  const mic = microphone(scene);
  const cup = makeMug(scene);

  const cam = new THREE.PerspectiveCamera(50, 9 / 16, 0.05, 300);
  const S07A: CamKey[] = [
    { f: 900, pos: [-3.5, 3.4, 13.0], look: [-1.0, 1.2, 0], fov: 48 },
    { f: CUE.roadCut, pos: [5.5, 3.0, 11.0], look: [9.5, 1.1, 0], fov: 46 },
  ];
  const S07B: CamKey[] = [
    { f: CUE.roadCut, pos: [20.5, 1.55, 4.6], look: [23.5, 1.1, 0], fov: 46 },
    { f: 1095, pos: [25.6, 1.6, 4.4], look: [29.6, 1.0, 0], fov: 44 },
  ];
  const S08: CamKey[] = [
    { f: 1095, pos: [STEP_X - 2.6, 1.05, 0.35], look: [STEP_X, 0.78, 0], fov: 36 },
    { f: 1200, pos: [STEP_X - 2.35, 1.03, 0.32], look: [STEP_X, 0.8, 0], fov: 34 },
  ];

  function dayLight(focus: THREE.Vector3) {
    sky.visible = true;
    scene.background = null;
    fog.color.set(0xd8d0b8);
    fog.near = 18;
    fog.far = 90;
    hemi.color.set(0xcfd8e8);
    hemi.groundColor.set(0x4a3a28);
    hemi.intensity = 1.0;
    sun.intensity = 2.8;
    sun.position.copy(focus).add(new THREE.Vector3(-14, 16, 12));
    sun.target.position.copy(focus);
    const s = sun.shadow.camera as THREE.OrthographicCamera;
    s.left = s.bottom = -12;
    s.right = s.top = 12;
    s.near = 1;
    s.far = 60;
    s.updateProjectionMatrix();
    irFlash.intensity = 0;
  }
  function nightIR() {
    sky.visible = false;
    scene.background = new THREE.Color(0x000000);
    fog.color.set(0x000000);
    fog.near = 4.5;
    fog.far = 10.5;
    hemi.color.set(0x8090a0);
    hemi.groundColor.set(0x101010);
    hemi.intensity = 0.12;
    sun.intensity = 0;
    irFlash.intensity = 26;
    irFlash.position.set(TCAM[0], TCAM[1] + 0.15, TCAM[2] + 0.05);
    irFlash.target.position.set(CLEAR[0], 0.45, CLEAR[2]);
  }

  /** homeowner walking the last box along the track (x from -1 at 900 to the steps at ~1072) */
  function poseOwnerWalk(f: number) {
    owner.root.visible = lastBox.visible = true;
    cup.visible = false;
    owner.reset();
    const pathX = (t: number) => lerp(-1.6, STEP_X - 0.45, t);
    const t1 = f < CUE.roadCut ? lerp(0, 0.42, (f - 900) / (CUE.roadCut - 900)) : lerp(0.72, 1, ramp(f, CUE.roadCut, 1068));
    const x = pathX(Math.min(1, t1));
    const z = 0.35 + Math.sin(x * 0.25) * 0.15;
    owner.root.position.set(x, 0, z);
    owner.root.rotation.y = Math.PI / 2; // facing +X
    const setDown = ramp(f, 1068, 1084);
    if (f < 1068) walk(owner, ((f - 900) / 30) % 1, 0.62, false);
    else legs(owner, [0, -0.25 * Math.sin(setDown * Math.PI), -0.05], [owner.ankle.out, owner.ankle.y, owner.ankle.z + 0.1], [owner.ankle.out, owner.ankle.y, owner.ankle.z - 0.1], 1.2);
    owner.turn(B.spine, [1, 0, 0], 4 + 30 * Math.sin(setDown * Math.PI));
    owner.update();
    const carry = cw(owner, [0, 1.02, 0.34]);
    const porch = new THREE.Vector3(STEP_X + 0.35, 0.54 + 0.19 + 0.0, z);
    const bp = setDown > 0 ? carry.clone().lerp(porch, setDown) : carry;
    if (f >= 1084) bp.copy(porch);
    lastBox.position.copy(bp);
    lastBox.rotation.set(0, Math.PI / 2, 0);
    const side = new THREE.Vector3(0, 0, 1).applyQuaternion(owner.root.quaternion).cross(new THREE.Vector3(0, 1, 0)).normalize();
    if (f < 1086) {
      handTo(owner, "L", bp.clone().addScaledVector(side, -0.25 * owner.leftX).add(new THREE.Vector3(0, -0.05, 0)), cw(owner, [0.6 * owner.leftX, 0.7, -0.2]));
      handTo(owner, "R", bp.clone().addScaledVector(side, 0.25 * owner.leftX).add(new THREE.Vector3(0, -0.05, 0)), cw(owner, [-0.6 * owner.leftX, 0.7, -0.2]));
    } else owner.armsDown();
    lookAtWorld(owner, new THREE.Vector3(STEP_X + 3, 1.2, 0), 0.5);
    faceAt(owner, f, 5, { browDown: 0.3 });
  }

  /** S08: on the second step, mug in the right hand; shoulders drop, one sip */
  function poseOwnerSteps(f: number) {
    owner.root.visible = cup.visible = lastBox.visible = true;
    lastBox.position.set(STEP_X + 0.35, 0.54 + 0.19, 0.3);
    owner.reset();
    owner.root.position.set(STEP_X - 0.12, 0, 0.05);
    owner.root.rotation.y = -Math.PI / 2; // facing -X, toward the camera
    seated(owner, STEP_RISE * 2 + 0.1, 0.42);
    const relax = ramp(f, CUE.shouldersDrop, CUE.shouldersDrop + 22);
    const tense = 1 - relax;
    owner.turn(B.spine2, [1, 0, 0], -3 * tense + 7 * relax);
    owner.turn(B.lClav, [0, 0, 1], -5 * relax * owner.leftX);
    owner.turn(B.rClav, [0, 0, 1], 5 * relax * owner.leftX);
    owner.update();
    const mouth = owner.pos(B.head).add(new THREE.Vector3(0, -0.09, 0)).add(new THREE.Vector3(0, 0, 0.09).applyQuaternion(owner.root.quaternion));
    const sip = ramp(f, CUE.sipStart, CUE.sipStart + 9) * (1 - ramp(f, CUE.sipEnd - 2, CUE.sipEnd + 8));
    const knee = cw(owner, [-0.14 * owner.leftX, 0.62, 0.36]);
    const cupPos = knee.clone().lerp(mouth.clone().add(new THREE.Vector3(0, -0.04, 0)).addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(owner.root.quaternion), 0.02), sip);
    handTo(owner, "R", cupPos.clone().add(new THREE.Vector3(0, -0.02, 0)).addScaledVector(new THREE.Vector3(-owner.leftX, 0, 0).applyQuaternion(owner.root.quaternion), 0.06), cw(owner, [-0.5 * owner.leftX, 0.5, -0.2]));
    owner.reach("L", [0.16, 0.6, 0.34], [0.5, 0.6, -0.2]);
    owner.curl("R", 60);
    cup.position.copy(cupPos).add(new THREE.Vector3(0, -0.05, 0));
    cup.rotation.set(0, Math.PI, -0.9 * sip);
    owner.update();
    lookAtWorld(owner, new THREE.Vector3(STEP_X - 6, 0.9 + 0.3 * sip, 0.5), 0.7);
    faceAt(owner, f, 5, { blink: f > CUE.shouldersDrop && f < CUE.shouldersDrop + 6 ? 0.9 : 0, press: 0.15 * tense });
  }

  /** bear sit target root: pelvis over the chair seat */
  const bearRoot = new THREE.Vector3(BEAR_CHAIR[0], 0, BEAR_CHAIR[2] + 0.12);
  const SEAT_Y = 0.46 * 1.12;

  function micTip() {
    mic.updateMatrixWorld(true);
    return mic.localToWorld(new THREE.Vector3(0, 0.15, 0));
  }

  let leanMax = 1;
  let leanSnout: THREE.Vector3 | null = null;
  let offerWrist: THREE.Vector3 | null = null;
  const MIC_GAP = 0.07;
  function poseBear(f: number, hostLean: number) {
    bear.root.visible = f >= CUE.bearEnter;
    if (!bear.root.visible) return;
    if (f < CUE.bearSitStart) {
      // walks in from screen right on all fours, turns to face the camera in front of the chair
      const t = ramp(f, CUE.bearEnter, CUE.bearSitStart - 4);
      const walkRoot = bearRoot.clone().add(new THREE.Vector3(0, 0, 0.75));
      const start = walkRoot.clone().add(new THREE.Vector3(3.4, 0, -0.6));
      const p = start.clone().lerp(walkRoot, Math.min(1, t * 1.15));
      bear.root.position.copy(p);
      bear.root.rotation.y = lerp(-Math.PI / 2 - 0.2, -0.0, ramp(f, CUE.bearSitStart - 18, CUE.bearSitStart - 2));
      bear.walk(((f - CUE.bearEnter) / 26) % 1, 1 - ramp(f, CUE.bearSitStart - 8, CUE.bearSitStart));
      return;
    }
    bear.root.position.copy(bearRoot);
    bear.root.rotation.y = 0;
    const s = ramp(f, CUE.bearSitStart, CUE.chairCreak + 2);
    const settle = f > CUE.chairCreak ? Math.sin(((f - CUE.chairCreak) / 8) * Math.PI) * 0.015 * (f < CUE.chairCreak + 8 ? 1 : 0) : 0;
    bearChair.position.y = -settle * 0.5;
    const breath = f >= CUE.breath && f < CUE.black ? Math.sin(((f - CUE.breath) / (CUE.black - CUE.breath)) * Math.PI) : 0;
    const lean = ramp(f, CUE.bearLean, CUE.bearLean + 26);
    bear.sit(s, SEAT_Y, { lean: lean * Math.max(0, leanMax), jaw: breath * 0.35, headYaw: f > CUE.bearSitStart + 30 ? -18 : 0, breathe: breath });
    if (f === 1500 || f === CUE.bearLean + 26) console.warn(`QA mic-gap f${f} snout->grille ${bear.snout().distanceTo(micTip()).toFixed(3)} m, leanMax ${leanMax.toFixed(2)}`);
    void hostLean;
  }

  function poseHostClearing(f: number) {
    host.reset();
    host.root.position.set(...HOST_CHAIR);
    host.root.rotation.y = 0.22;
    const emptyEdge = new THREE.Vector3(BEAR_CHAIR[0] + 0.5, 1.2, BEAR_CHAIR[2] + 0.2);
    const bearHead = bear.root.visible && f >= CUE.bearSitStart + 20 ? bear.snout() : emptyEdge;
    // H04: mic out toward the empty frame edge; H05: mic back to his own mouth; then offered to the bear
    let micT = 0;
    if (f < 1320) micT = ramp(f, CUE.reachOut, CUE.reachOut + 12);
    else if (f < 1424) micT = 1 - ramp(f, 1310, 1320);
    else micT = ramp(f, 1424, 1440);
    // mic in the LEFT (bear-side) hand for S09/S10
    seated(host, 0.55, 0.48);
    host.reach("R", [0.14, 0.7, 0.38], [0.5, 0.9, -0.2]);
    host.update();
    const mouth = host.pos(B.head).add(new THREE.Vector3(0, -0.07, 0.1));
    const shoulder = host.pos(B.lUp);
    const ownWrist = cw(host, [0.1 * host.leftX, 0.96, 0.25]);
    let target: THREE.Vector3, aim: THREE.Vector3;
    if (f >= 1424) {
      if (!leanSnout) {
        bear.root.position.copy(bearRoot);
        bear.root.rotation.y = 0;
        bear.sit(1, SEAT_Y, { lean: 1, headYaw: -18 });
        leanSnout = bear.snout();
      }
      const toS = leanSnout.clone().sub(shoulder).normalize();
      const grille = leanSnout.clone().addScaledVector(toS, -MIC_GAP);
      offerWrist = grille.clone().addScaledVector(toS, -0.145 - 0.075).add(new THREE.Vector3(0, -0.03, 0));
      target = offerWrist;
      aim = leanSnout;
    } else {
      const edgeWrist = shoulder.clone().add(emptyEdge.clone().sub(shoulder).normalize().multiplyScalar(0.5)).add(new THREE.Vector3(0, -0.06, 0));
      target = edgeWrist;
      aim = emptyEdge;
    }
    const w = ownWrist.clone().lerp(target, micT);
    handTo(host, "L", w, cw(host, [0.6 * host.leftX, 0.5, -0.3]));
    inHand(host, "L", mic, mouth.clone().lerp(aim, micT));
    if (f >= 1440) {
      // trim residual palm/grip error (<3 cm) so the grille sits exactly MIC_GAP from the leaned snout
      const toS = leanSnout!.clone().sub(shoulder).normalize();
      const err = leanSnout!.clone().addScaledVector(toS, -MIC_GAP).sub(micTip());
      if (err.length() < 0.03) mic.position.add(err);
      else console.warn(`QA mic offer out of reach by ${err.length().toFixed(3)} m`);
      mic.updateMatrixWorld(true);
    }
    host.update();
    lookAtWorld(host, f < 1300 ? new THREE.Vector3(TCAM[0], TCAM[1], TCAM[2]) : bearHead, f < 1300 ? 0.9 : 0.8);
    faceAt(host, f, 1, { jaw: jawFrom(HOST_ENV, f) });
  }

  function pose(f: number, aspect: number): SetOut {
    if (f < 1200) {
      host.root.visible = mic.visible = bear.root.visible = false;
      if (f < 1095) {
        poseOwnerWalk(f);
        dayLight(owner.root.position.clone());
        applyCam(cam, f < CUE.roadCut ? S07A : S07B, f, aspect);
      } else {
        poseOwnerSteps(f);
        dayLight(new THREE.Vector3(STEP_X, 0, 0));
        applyCam(cam, S08, f, aspect);
      }
      return { scene, camera: cam, fx: { mode: "clean" } };
    }
    // S09/S10: infrared trail cam
    owner.root.visible = cup.visible = false;
    host.root.visible = mic.visible = true;
    nightIR();
    poseHostClearing(f);
    poseBear(f, 0);
    if (f >= CUE.black) return { scene, camera: cam, fx: { mode: "clean" }, black: true };
    cam.position.set(TCAM[0], TCAM[1] + 0.02, TCAM[2] + 0.03);
    cam.fov = 58;
    cam.aspect = aspect;
    cam.near = 0.05;
    cam.lookAt(CLEAR[0] + 0.02, 0.82, CLEAR[2]);
    cam.updateProjectionMatrix();
    return { scene, camera: cam, fx: { mode: "ir" } };
  }
  void inHand;
  return { pose };
}
