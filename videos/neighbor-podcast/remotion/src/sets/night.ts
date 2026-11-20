// S03-S04: night. Two rooms in one scene.
//   Bedroom (x = -20): nightstand with the baby-monitor parent unit. Its screen shows the live crib-camera feed
//   (rendered to a texture through the "monitor" device look every frame it is visible).
//   Nursery (x = 0): crib centred on the origin, long axis along X, front rail at z = +0.36, mattress top y = 0.32,
//   rail top y = 0.87. The host's tiny folding chair sits front-left of the crib. The nursery camera is high
//   front-right; its fixed view is the full-screen feed in S03 (after CUE.cribCut) and S04.
import * as THREE from "three";
import { B } from "../lib/rig";
import { seated, walk } from "../lib/poses";
import { box, col, contactBlob, cyl, flat, group, sph, std, tiledBox, type XYZ } from "../lib/kit";
import { T, tex, noise } from "../lib/tex";
import { cw, handTo, hostSeatedMic, inHand, lookAtWorld } from "../lib/act";
import { applyCam, lerp, ramp, type CamKey } from "../lib/cam";
import { faceAt, jawFrom, makeHost } from "../lib/cast";
import { foldingChair, microphone, monitorUnit, nurseryCam } from "../props";
import { Baby } from "../creatures";
import { CUE, HOST_ENV } from "../shots";
import { Post } from "../lib/post";
import type { SetOut } from "./porch";
import type { Ctx } from "../Episode";

const MATTRESS = 0.32, RAIL = 0.87, FRONT = 0.36;
const BABY_AT: XYZ = [-0.22, MATTRESS, FRONT - 0.13];
const CHAIR_AT: XYZ = [-0.9, 0, 0.82];

export async function loadNight() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080c);
  scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x1c1814, 0.32));

  // =================================================================== nursery
  const N = group(scene, [0, 0, 0], "Nursery");
  const wallp = std({ map: tex("nurserywall", 256, (g, w, h) => {
    g.fillStyle = "#b9c4c8";
    g.fillRect(0, 0, w, h);
    noise(g, w, h, ["#a4afb3", "#cdd6d8"], 0.18);
    g.fillStyle = "rgba(240,240,220,0.5)";
    for (let y = 16; y < h; y += 42) for (let x = (y / 42) % 2 ? 24 : 4; x < w; x += 42) {
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  }) });
  tiledBox(N, [6, 2.7, 0.1], wallp, [0, 1.35, -0.75], 1.2);
  tiledBox(N, [0.1, 2.7, 5], wallp, [-2.2, 1.35, 1.2], 1.2);
  flat(N, 6, 6, std({ map: T.woodFloor([3, 3]) }), [0, 0, 1]);
  const rug = flat(N, 1.8, 1.3, std({ map: tex("rug", 128, (g, w, h) => {
    g.fillStyle = "#d9cdb6";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#9fb3c2";
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    noise(g, w, h, ["#c4b89f", "#e9dfcb"], 0.2);
  }) }), [-0.2, 0.004, 0.95]);
  rug.receiveShadow = true;
  // crib
  const wood = std({ map: T.plywood([1, 1]), color: 0xf2e6d6, roughness: 0.7 });
  const crib = group(N, [0, 0, 0], "Crib");
  box(crib, [1.3, 0.16, 0.7], std({ map: tex("sheet", 64, (g, w, h) => {
    g.fillStyle = "#e9eef2";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(140,170,200,0.35)";
    for (let i = 0; i < 6; i++) g.fillRect(0, i * 11, w, 3);
  }), roughness: 0.95 }), [0, MATTRESS - 0.08, 0]);
  box(crib, [1.34, 0.04, 0.74], wood, [0, MATTRESS - 0.18, 0]);
  for (const z of [-0.36, FRONT]) {
    box(crib, [1.38, 0.05, 0.05], wood, [0, RAIL - 0.02, z]);
    box(crib, [1.38, 0.05, 0.04], wood, [0, MATTRESS - 0.12, z]);
    for (let i = 0; i < 13; i++) box(crib, [0.025, RAIL - MATTRESS + 0.1, 0.025], wood, [-0.6 + i * 0.1, (RAIL + MATTRESS - 0.12) / 2, z]);
  }
  for (const x of [-0.69, 0.69]) {
    for (const z of [-0.36, FRONT]) box(crib, [0.06, RAIL + 0.08, 0.06], wood, [x, (RAIL + 0.08) / 2, z]);
    box(crib, [0.04, RAIL - MATTRESS + 0.1, 0.7], wood, [x, (RAIL + MATTRESS - 0.12) / 2, 0]);
  }
  sph(crib, 0.07, col(0xc9a07a, { roughness: 1 }), [0.48, MATTRESS + 0.06, -0.18], [1, 0.9, 0.8]); // plush bear
  sph(crib, 0.045, col(0xc9a07a, { roughness: 1 }), [0.48, MATTRESS + 0.15, -0.18]);
  // dresser + nursery camera (high, front-right)
  box(N, [0.9, 1.1, 0.45], std({ map: T.paint("dresser", "#e8e2d6") }), [2.3, 0.55, -0.4]);
  box(N, [0.3, 1.9, 0.3], std({ map: T.paint("shelf", "#e8e2d6") }), [-0.15, 0.95, 3.12]); // tall shelf behind the camera // wall bracket behind the camera
  const ncam = nurseryCam(N, [-0.15, 1.95, 2.9]);
  ncam.lookAt(-0.42, 0.66, 0.4);
  contactBlob(N, 1.6, 0.9, [0, 0.003, 0], 0.4);
  // night-light + moonlight
  const nl = new THREE.PointLight(0xffc98e, 2.2, 5, 1.6);
  nl.position.set(-1.6, 0.4, -0.4);
  N.add(nl);
  sph(N, 0.05, std({ color: 0xffe2b0, emissive: 0xffc070, emissiveIntensity: 2 }), [-1.6, 0.35, -0.68], [1, 1, 0.5]);
  const moon = new THREE.DirectionalLight(0x9fb4e8, 0.9);
  moon.position.set(2.5, 4, 3);
  moon.target.position.set(0, 0.5, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  const msc = moon.shadow.camera as THREE.OrthographicCamera;
  msc.left = msc.bottom = -2.5;
  msc.right = msc.top = 2.5;
  moon.shadow.normalBias = 0.02;
  N.add(moon, moon.target);
  const fill = new THREE.PointLight(0xb8c6f0, 3.5, 6, 1.4); // camera-side fill, keeps the feed readable
  fill.position.set(1.2, 1.9, 2.2);
  N.add(fill);

  // =================================================================== parent bedroom
  const R = group(scene, [-20, 0, 0], "Bedroom");
  tiledBox(R, [4, 2.7, 0.1], std({ map: T.wallpaper([1, 1]), color: 0x8c90a8 }), [0, 1.35, -0.45], 1.2);
  flat(R, 4, 4, std({ map: T.woodFloor([2, 2]), color: 0x8a8aa0 }), [0, 0, 0.8]);
  const stand = std({ map: T.woodFloor([0.5, 0.5]), color: 0xa08470 });
  box(R, [0.5, 0.58, 0.42], stand, [0, 0.29, -0.2]);
  box(R, [0.54, 0.03, 0.46], stand, [0, 0.595, -0.2]);
  box(R, [0.42, 0.16, 0.01], std({ map: T.woodFloor([0.5, 0.5]), color: 0x8f7462 }), [0, 0.42, 0.015]);
  sph(R, 0.016, std({ color: 0xc9a14e, metalness: 0.8, roughness: 0.3 }), [0, 0.42, 0.03]);
  // bed edge + duvet at screen right
  box(R, [1.6, 0.5, 2], std({ map: T.paint("duvet", "#6f7896") }), [1.1, 0.25, 0.6]);
  sph(R, 0.32, std({ map: T.paint("pillow", "#c9cad6") }), [0.7, 0.58, -0.15], [1.1, 0.35, 0.7]);
  // lamp (off), book, glass
  cyl(R, 0.06, 0.08, 0.03, col(0x3a3a3a), [-0.15, 0.625, -0.28]);
  cyl(R, 0.01, 0.01, 0.25, col(0x3a3a3a), [-0.15, 0.75, -0.28]);
  cyl(R, 0.09, 0.13, 0.15, std({ color: 0xd8cdb5, roughness: 0.9 }), [-0.15, 0.9, -0.28], 18);
  box(R, [0.13, 0.03, 0.19], col(0x5a2f2f), [0.15, 0.625, -0.27]).rotation.y = 0.3;
  const mon = monitorUnit(R, [0.03, 0.61, -0.12]);
  mon.g.rotation.y = -0.15;
  const glow = new THREE.PointLight(0xbcd0ff, 0, 1.6, 2);
  glow.position.set(0.03, 0.72, 0.05);
  R.add(glow);
  const rmoon = new THREE.DirectionalLight(0x7f92c8, 0.55);
  rmoon.position.set(-22, 3, 3);
  rmoon.target.position.set(-20, 0.5, 0);
  R.add(rmoon, rmoon.target);
  scene.add(rmoon, rmoon.target);
  rmoon.position.set(-22, 3, 3);

  // screen feed: crib camera -> monitor look -> texture on the parent-unit screen
  const screenPost = new Post(480, 320);
  const screenRT = new THREE.WebGLRenderTarget(480, 320);
  screenRT.texture.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenRT.texture, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });

  // =================================================================== cast + kit
  const host = await makeHost();
  scene.add(host.root);
  const baby = new Baby();
  scene.add(baby.root);
  baby.root.position.set(...BABY_AT);
  baby.root.rotation.y = -0.35;
  const chair = foldingChair(scene, CHAIR_AT, 0.56, 0x6a7f8c);
  const mic = microphone(scene);
  const babyBlob = contactBlob(scene, 0.35, 0.3, [BABY_AT[0], MATTRESS + 0.002, BABY_AT[2]], 0.35);
  void babyBlob;

  const feedCam = new THREE.PerspectiveCamera(46, 9 / 16, 0.03, 50);
  const standCam = new THREE.PerspectiveCamera(40, 9 / 16, 0.03, 50);
  const STAND_CAM: CamKey[] = [
    { f: 366, pos: [-20.02, 0.98, 1.05], look: [-19.98, 0.67, -0.12], fov: 40 },
    { f: CUE.monitorOn, pos: [-20.0, 0.92, 0.9], look: [-19.97, 0.68, -0.12], fov: 38 },
    { f: CUE.cribCut, pos: [-19.98, 0.78, 0.42], look: [-19.97, 0.69, -0.12], fov: 32 },
  ];
  const chairFacing = Math.atan2(BABY_AT[0] - CHAIR_AT[0], BABY_AT[2] - CHAIR_AT[2]);

  /** baby rise curve: 0 = sitting, ~0.25 = kneeling at the rail, 1 = standing (exactly at CUE.stand) */
  const upAt = (f: number) => {
    if (f < CUE.babyGrab) return 0;
    if (f < CUE.riseStart) return 0.22 * ramp(f, CUE.babyGrab, CUE.babyGrab + 14);
    if (f < CUE.stand) return lerp(0.22, 1, ramp(f, CUE.riseStart, CUE.stand));
    if (f < CUE.sitStart) return 1;
    const t = Math.min(1, (f - CUE.sitStart) / (CUE.sitDown - CUE.sitStart));
    return 1 - t * t; // drops, then plops
  };

  function poseBaby(f: number) {
    const u = upAt(f);
    const railL: XYZ = [0.11, RAIL - MATTRESS - 0.02, 0.12], railR: XYZ = [-0.11, RAIL - MATTRESS - 0.02, 0.12];
    const lapL: XYZ = [0.07, 0.16, 0.12], lapR: XYZ = [-0.07, 0.16, 0.12];
    const reach = ramp(f, CUE.babyGrab - 8, CUE.babyGrab + 4) * (f < CUE.sitStart + 4 ? 1 : 1 - ramp(f, CUE.sitStart + 4, CUE.sitDown));
    const mixP = (a: XYZ, b: XYZ, t: number): XYZ => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const hold = reach >= 0.999;
    const wobble = f >= CUE.stand && f < CUE.sitStart ? Math.sin((f - CUE.stand) * 0.7) * 0.01 : 0;
    baby.root.position.set(BABY_AT[0] + wobble, BABY_AT[1] + (f > CUE.sitDown && f < CUE.sitDown + 6 ? Math.sin(((f - CUE.sitDown) / 6) * Math.PI) * 0.012 : 0), BABY_AT[2]);
    baby.pose(u, {
      grip: hold ? { L: railL, R: railR } : { L: null, R: null },
      lap: { L: mixP(lapL, railL, reach), R: mixP(lapR, railR, reach) },
      headYaw: f < CUE.stand ? -18 : -8,
      headPitch: f < CUE.babyGrab ? 4 : -4,
      blink: [0, 1, 1, 0][(f + 2) % 71] ?? 0,
      mouth: f >= CUE.stand && f < CUE.sitDown ? 0.6 : 0.1,
    });
  }

  function poseHost(f: number) {
    host.reset();
    const sitT = ramp(f, 434, 448);
    const babyHead = new THREE.Vector3(BABY_AT[0], MATTRESS + lerp(0.33, 0.6, upAt(Math.max(366, f - 4))), BABY_AT[2] + 0.04);
    if (f < 434) {
      // carrying the tiny chair in, setting it down
      const enter = ramp(f, CUE.cribCut, 432);
      host.root.position.set(lerp(-1.6, CHAIR_AT[0] - 0.05, enter), 0, lerp(1.35, CHAIR_AT[2] + 0.28, enter));
      host.root.rotation.y = lerp(1.2, chairFacing, enter);
      walk(host, ((f - CUE.cribCut) / 22) % 1, 0.4 * (1 - ramp(f, 426, 432)), false);
      host.reach("L", [0.18, lerp(0.8, 0.45, ramp(f, 424, 432)), 0.3], [0.5, 0.9, -0.3]);
      host.reach("R", [0.18, 0.88, 0.1], [0.4, 1.1, -0.4]);
      host.update();
      chair.position.copy(cw(host, [0.0, 0, 0.32]));
      chair.position.y = Math.max(0, lerp(0.35, 0, ramp(f, 424, 432)));
      chair.position.lerp(new THREE.Vector3(...CHAIR_AT), ramp(f, 426, 432));
      inHand(host, "R", mic, cw(host, [-0.24 * host.leftX, 0.6, 0.4]));
      lookAtWorld(host, babyHead, 0.6);
    } else {
      chair.position.set(...CHAIR_AT);
      host.root.position.set(CHAIR_AT[0], 0, CHAIR_AT[2]);
      host.root.rotation.y = chairFacing;
      const raise = f < 450 ? 0 : ramp(f, CUE.micRaise - 10, CUE.micRaise);
      hostSeatedMic(host, mic, lerp(host.hipY, 0.36, sitT), raise, babyHead, 0.38);
      host.reach("L", [0.16, 0.5, 0.36], [0.5, 0.7, -0.2]);
      host.update();
      lookAtWorld(host, babyHead, 0.85);
    }
    chair.rotation.y = chairFacing;
    faceAt(host, f, 1, { jaw: jawFrom(HOST_ENV, f) });
  }

  function renderScreen(ctx: Ctx, f: number, aspect: number) {
    const on = f >= CUE.monitorOn;
    (mon.screen as THREE.Mesh).material = on ? screenMat : mon.screen.material;
    glow.intensity = on ? 1.4 : 0;
    (mon.led.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2 : 0;
    if (!on) return;
    placeFeed(1.5);
    screenPost.render(ctx.renderer, scene, feedCam, { mode: "monitor", flicker: f < CUE.monitorOn + 6 ? 1 - (f - CUE.monitorOn) / 6 : 0 }, f, screenRT);
    void aspect;
  }

  function placeFeed(aspect: number) {
    ncam.updateMatrixWorld(true);
    feedCam.position.copy(ncam.localToWorld(new THREE.Vector3(0, 0.065, 0.07))); // just in front of the lens
    feedCam.aspect = aspect;
    feedCam.fov = aspect > 1 ? 30 : 46;
    feedCam.lookAt(-0.42, 0.66, 0.4);
    feedCam.updateProjectionMatrix();
  }

  const blackScreen = mon.screen.material as THREE.Material;
  function pose(f: number, aspect: number, ctx: Ctx): SetOut {
    poseBaby(f);
    poseHost(f);
    scene.updateMatrixWorld(true);
    if (f < CUE.cribCut) {
      if (f < CUE.monitorOn) (mon.screen as THREE.Mesh).material = blackScreen;
      renderScreen(ctx, f, aspect);
      applyCam(standCam, STAND_CAM, f, aspect);
      return { scene, camera: standCam, fx: { mode: "clean", exposure: 1.1 } };
    }
    placeFeed(aspect);
    return { scene, camera: feedCam, fx: { mode: "monitor" } };
  }
  void B;
  void handTo;
  void seated;
  return { pose };
}
