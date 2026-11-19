// S01-S02: the supplied Bathroom_Set.glb (same room as the S16 reveal) plus a built front wall, door and hallway.
// Coordinates are the bathroom GLB's (meters, Y up). The room's open side is +Z (z = 3.05); the doorway is cut at
// x 0.0..0.8 so a low hallway camera sees the toilet straight through it. Lighting reuses the approved reveal values
// for the room (amber sconce, window fill, hemisphere) and adds one warm hallway ceiling practical.
import * as THREE from "three";
import { staticFile } from "remotion";
import { loadGLB } from "../lib/load";
import { makeHomeowner, makePhil, type Rig } from "../lib/rig";
import { T } from "../lib/tex";
import { applyCam, ramp, type CamKey } from "../lib/cam";
import { face, handsFront, look, walk, legs, stand } from "../lib/poses";
import { B } from "../lib/rig";

const lerpDeg = (a: number, b: number, t: number) => a + (b - a) * t;

export type BathroomSet = { pose: (id: string, local: number, aspect: number) => { scene: THREE.Scene; camera: THREE.PerspectiveCamera } };

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Folded newspaper prop using the supplied newspaper material (Bathroom_Cast M_Newspaper_0). */
export function foldedPaper(src: THREE.Material) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.38, 0.022), src);
  m.castShadow = true;
  g.add(m);
  return g;
}

/** keep a held prop between both hands, facing the character's forward axis */
export function holdBetweenHands(rig: Rig, prop: THREE.Object3D, tiltDeg = 20) {
  rig.update();
  const l = rig.pos(B.lHand), r = rig.pos(B.rHand);
  prop.position.copy(l.add(r).multiplyScalar(0.5));
  prop.quaternion.copy(rig.root.getWorldQuaternion(new THREE.Quaternion()));
  prop.rotateX(THREE.MathUtils.degToRad(-tiltDeg));
  prop.translateZ(0.03);
}

export async function loadBathroom(): Promise<BathroomSet> {
  const scene = new THREE.Scene();
  const [set, cast] = await Promise.all([loadGLB(staticFile("bathroom/assets/Bathroom_Set.glb")), loadGLB(staticFile("bathroom/assets/Bathroom_Cast.glb"))]);
  const room = set.scene.clone(true);
  room.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = !/Curtain|Sconce|Foam/.test(m.name);
      m.receiveShadow = true;
    }
  });
  scene.add(room);

  // ---- lights: reveal values for the room ----
  scene.add(new THREE.HemisphereLight(0xa9b5d2, 0x393121, 0.42));
  const sconce = new THREE.PointLight(0xffc479, 1.75, 7, 2);
  sconce.position.set(-0.11, 1.74, -0.76);
  sconce.castShadow = true;
  sconce.shadow.mapSize.set(512, 512);
  sconce.shadow.radius = 3;
  sconce.shadow.bias = -0.0009;
  sconce.shadow.normalBias = 0.014;
  scene.add(sconce);
  const windowFill = new THREE.PointLight(0x7398ef, 0.4, 5, 2);
  windowFill.position.set(0.89, 1.94, -0.74);
  scene.add(windowFill);
  const roomFill = new THREE.PointLight(0xffd8a2, 2.2, 6, 2);
  roomFill.position.set(0.4, 2.2, 1.6);
  scene.add(roomFill);
  // hallway practical (warm ceiling dome) + soft bounce
  const hall = new THREE.PointLight(0xffc98a, 6.0, 9, 2);
  hall.position.set(0.9, 2.35, 4.4);
  hall.castShadow = true;
  hall.shadow.mapSize.set(1024, 1024);
  hall.shadow.radius = 4;
  hall.shadow.bias = -0.001;
  hall.shadow.normalBias = 0.02;
  scene.add(hall);
  const bounce = new THREE.PointLight(0xffe2bd, 1.6, 7, 2);
  bounce.position.set(1.6, 1.0, 5.6);
  scene.add(bounce);

  // ---- built hallway (wallpaper, wood floor, white trim) ----
  const H = new THREE.Group();
  scene.add(H);
  const paper = std({ map: T.wallpaper([3, 1.2]) });
  const trim = std({ map: T.paint("trim", "#e8e2d2"), roughness: 0.6 });
  const wz = 3.11; // wall centre plane
  box(3.0, 2.55, 0.12, paper, -1.5, 1.275, wz, H); // left of doorway (x -3..0)
  box(2.7, 2.55, 0.12, paper, 2.15, 1.275, wz, H); // right of doorway (x 0.8..3.5)
  box(0.8, 0.5, 0.12, paper, 0.4, 2.3, wz, H); // header
  // casing
  box(0.07, 2.12, 0.16, trim, -0.035, 1.06, wz, H);
  box(0.07, 2.12, 0.16, trim, 0.835, 1.06, wz, H);
  box(0.94, 0.08, 0.16, trim, 0.4, 2.09, wz, H);
  box(6.5, 0.12, 0.03, trim, 0.25, 0.06, wz + 0.075, H); // baseboard hall side
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 3.6), std({ map: T.woodFloor([5, 3]), roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.25, 0, 3.17 + 1.8);
  floor.receiveShadow = true;
  H.add(floor);
  box(6.5, 0.05, 3.6, std({ map: T.paint("ceil", "#d9d2c0") }), 0.25, 2.575, 4.97, H);
  box(0.12, 2.55, 3.6, paper, 3.5, 1.275, 4.97, H);
  box(0.12, 2.55, 3.6, paper, -3.0, 1.275, 4.97, H);
  box(6.5, 2.55, 0.12, paper, 0.25, 1.275, 6.8, H);
  // ceiling dome (emissive practical)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0xfff1d8, emissive: 0xffd9a0, emissiveIntensity: 2.2 }));
  dome.rotation.x = Math.PI;
  dome.position.set(0.9, 2.55, 4.4);
  H.add(dome);
  // framed picture right of the door + console table
  box(0.5, 0.62, 0.03, std({ color: 0x3b2a1c }), 2.1, 1.55, 3.19, H);
  box(0.42, 0.54, 0.01, std({ map: T.paint("pic", "#7b8a6a") }), 2.1, 1.55, 3.21, H);
  box(0.9, 0.05, 0.36, std({ map: T.woodFloor([1, 1]) }), 2.3, 0.78, 3.38, H);
  for (const x of [1.9, 2.7]) box(0.04, 0.78, 0.3, std({ color: 0x4a301c }), x, 0.39, 3.38, H);

  // ---- door (hinge on the left jamb, swings into the hall) ----
  const procHinge = new THREE.Group();
  procHinge.position.set(0.0, 0, 3.17);
  H.add(procHinge);
  const door = box(0.8, 2.04, 0.045, std({ map: T.paint("door", "#ece6d6"), roughness: 0.55 }), 0.4, 1.02, 0.0225, procHinge);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.8, roughness: 0.35 }));
  knob.position.set(0.33, -0.05, 0.05);
  door.add(knob);

  // ---- S15: steel front door at the end of the hallway (interior side), with a bolt that slides home ----
  const steel = new THREE.MeshStandardMaterial({ map: T.steel(), metalness: 0.75, roughness: 0.38 });
  box(0.06, 2.1, 1.0, steel, 3.42, 1.05, 4.9, H);

  // ---- Codex hallway (Hallway.glb, bathroom coordinates) replaces the built blocking above ----
  H.visible = false;
  const hallGlb = (await loadGLB(staticFile("interior/Hallway.glb"))).scene;
  hallGlb.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
  });
  scene.add(hallGlb);
  const node = (name: string) => {
    const o = hallGlb.getObjectByName(name);
    if (!o) throw new Error(`Hallway.glb node ${name} missing`);
    return o;
  };
  const hinge = node("Bath_Door_Hinge");
  const steelDoor = node("Steel_Front_Door_Interior");
  const bolt = node("Bolt");
  const boltRestZ = bolt.position.z;

  // ---- cast ----
  const [phil, home] = await Promise.all([makePhil(staticFile), makeHomeowner(staticFile)]);
  scene.add(phil.root, home.root);
  // Codex Newspaper_Folded.glb: pivot on the centre fold, paper spans +X 0.29 m; centre it between the hands
  const paperProp = new THREE.Group();
  const paperGlb = (await loadGLB(staticFile("props/Newspaper_Folded.glb"))).scene.clone(true);
  paperGlb.position.x = -0.145;
  paperGlb.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null));
  paperProp.add(paperGlb);
  scene.add(paperProp);

  const camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.03, 100);

  const S01: CamKey[] = [
    { f: 0, pos: [0.42, 0.7, 6.05], look: [0.76, 1.1, 3.0], fov: 60 },
    { f: 60, pos: [0.46, 0.72, 6.35], look: [0.84, 1.14, 3.0], fov: 60 },
    { f: 107, pos: [0.5, 0.73, 6.45], look: [0.9, 1.2, 3.1], fov: 59 },
  ];
  const S02: CamKey[] = [
    { f: 0, pos: [-0.05, 1.5, 2.15], look: [0.6, 0.92, -0.3], fov: 42 },
    { f: 65, pos: [0.08, 1.4, 1.75], look: [0.56, 0.9, -0.35], fov: 40 },
  ];

  const S15: CamKey[] = [
    { f: 0, pos: [1.0, 1.58, 6.35], look: [2.85, 1.42, 4.75], fov: 42 },
    { f: 40, pos: [0.85, 1.55, 6.3], look: [2.5, 1.35, 4.6], fov: 44 },
    { f: 75, pos: [0.4, 1.5, 6.2], look: [0.7, 1.25, 3.6], fov: 46 },
  ];

  function pose(id: string, f: number, aspect: number) {
    phil.reset();
    home.reset();
    paperProp.visible = false;
    steelDoor.visible = bolt.visible = id === "S15";
    phil.root.visible = home.root.visible = true;
    if (id === "S15") {
      // the lock finishes (bolt slides home), shoulders drop, he turns and walks toward the warm bathroom light
      hinge.rotation.y = -THREE.MathUtils.degToRad(70);
      phil.root.visible = false;
      bolt.position.z = boltRestZ - 0.12 * ramp(f, 2, 10);
      const go = ramp(f, 34, 75);
      home.root.position.set(2.75 - 1.8 * go, 0, 4.85 - 0.95 * go);
      home.root.rotation.y = THREE.MathUtils.degToRad(lerpDeg(90, -120, ramp(f, 26, 40)));
      if (go > 0) walk(home, (f / 24) % 1, 0.5);
      else stand(home);
      const relax = ramp(f, 14, 28);
      home.turn(B.lClav, [0, 0, 1], -5 * relax * home.leftX);
      home.turn(B.rClav, [0, 0, 1], 5 * relax * home.leftX);
      look(home, 0, 6 * relax);
      face(home, { blink: f > 16 && f < 20 ? 1 : 0.15 * relax, browUp: 0.3 * (1 - relax), press: 0.2 });
      applyCam(camera, S15, f, aspect);
    } else if (id === "S01") {
      // door: handle snap in the first half-second, swings ~105 deg by f 14
      hinge.rotation.y = -THREE.MathUtils.degToRad(105) * ramp(f, 2, 16);
      // Phil: steps out of the doorway (+z) and curves toward the homeowner (+x), folding the paper
      const t = THREE.MathUtils.clamp(f / 70, 0, 1);
      const path = new THREE.Vector3(0.42 + 0.95 * t * t, 0, 2.6 + 1.25 * Math.sin(t * Math.PI * 0.5));
      phil.root.position.copy(path);
      phil.root.rotation.y = THREE.MathUtils.degToRad(15 + 60 * t);
      walk(phil, (f / 26) % 1, 0.55, false);
      handsFront(phil, 1.1, 0.3, 0.16);
      look(phil, -6, 12);
      face(phil, { eyesDown: 0.55 });
      paperProp.visible = true;
      holdBetweenHands(phil, paperProp, -12);
      // Homeowner waits beside the door frame, recoils a half-step, bewildered
      home.root.position.set(1.48, 0, 3.66 - 0.08 * ramp(f, 20, 40));
      home.root.rotation.y = THREE.MathUtils.degToRad(-40);
      stand(home);
      home.reach("R", [0.2, 1.0, 0.2], [0.5, 1.0, -0.4]);
      look(home, -22 - 16 * ramp(f, 30, 60), 4);
      face(home, { browUp: 1, wide: 0.8, jaw: 0.3, eyesR: 0.3 });
      applyCam(camera, S01, f, aspect);
    } else {
      hinge.rotation.y = -THREE.MathUtils.degToRad(105);
      phil.root.visible = false;
      // homeowner leans into frame and looks down at the bowl, neck stiffening
      home.root.position.set(0.9, 0, 0.18);
      home.root.rotation.y = THREE.MathUtils.degToRad(-135);
      const a = home.ankle;
      legs(home, [0, -0.02, 0], [a.out, a.y, a.z + 0.05], [a.out, a.y, a.z - 0.1]);
      home.turn(B.spine, [1, 0, 0], 22 * ramp(f, 4, 30));
      stand(home);
      look(home, 6, 26 * ramp(f, 10, 34));
      face(home, { eyesDown: 0.7, browDown: 0.35 * ramp(f, 30, 45), press: 0.4 });
      applyCam(camera, S02, f, aspect);
    }
    scene.updateMatrixWorld(true);
    return { scene, camera };
  }
  return { pose };
}
