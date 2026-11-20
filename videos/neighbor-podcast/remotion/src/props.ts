// Procedural props for My Neighbor Has a Podcast (meters, Y up, front = +Z unless noted). Each builder returns a
// THREE.Group whose origin is the documented pivot so shots can key it directly. See ASSET-MANIFEST.md.
import * as THREE from "three";
import { T, label, noise, speckle, tex } from "./lib/tex";
import { bar, box, col, cyl, group, sph, std, type XYZ } from "./lib/kit";

const steel = () => std({ color: 0x55585c, metalness: 0.6, roughness: 0.45 });
const black = () => col(0x161718, { roughness: 0.6 });

// ---------- podcast kit ----------

/** Folding chair. Origin on the floor at seat centre, sitter faces +Z. Seat top at 0.46 m x scale. */
export function foldingChair(parent: THREE.Object3D, p: XYZ, scale = 1, seatColor = 0x4d5743) {
  const g = group(parent, p, "FoldingChair");
  g.scale.setScalar(scale);
  const frame = std({ color: 0x3a3b3e, metalness: 0.55, roughness: 0.5 });
  const fabric = std({ map: T.paint(`chair-${seatColor}`, "#" + seatColor.toString(16).padStart(6, "0")), roughness: 0.9 });
  box(g, [0.44, 0.03, 0.4], fabric, [0, 0.445, 0.01]);
  box(g, [0.42, 0.2, 0.025], fabric, [0, 0.79, -0.215]);
  for (const x of [-0.215, 0.215]) {
    bar(g, [x, 0.0, -0.26], [x, 0.9, -0.225], 0.012, frame); // back legs up into the backrest
    bar(g, [x, 0.0, 0.24], [x, 0.43, -0.1], 0.012, frame); // front legs crossing under
    bar(g, [x, 0.43, -0.2], [x, 0.43, 0.21], 0.011, frame); // seat rail
    sph(g, 0.016, black(), [x, 0.006, -0.26]);
    sph(g, 0.016, black(), [x, 0.006, 0.24]);
  }
  bar(g, [-0.215, 0.16, 0.12], [0.215, 0.16, 0.12], 0.009, frame);
  return g;
}

/** Handheld dynamic mic. Origin at the grip (hand) point, the mic points along local +Y. */
export function microphone(parent: THREE.Object3D) {
  const g = group(parent, [0, 0, 0], "Mic");
  const handle = cyl(g, 0.017, 0.012, 0.17, black(), [0, 0.02, 0]);
  handle.rotation.y = 0.3;
  cyl(g, 0.021, 0.018, 0.03, steel(), [0, 0.115, 0]);
  const grille = std({ color: 0x7c8086, metalness: 0.5, roughness: 0.55, map: T.steel([3, 3]) });
  sph(g, 0.03, grille, [0, 0.145, 0]);
  return g;
}

/** Over-ear headphones. Origin at the centre between the cups; band arches +Y; cups on ±X. */
export function headphones(parent: THREE.Object3D, halfWidth = 0.085, color = 0x1b1d20) {
  const g = group(parent, [0, 0, 0], "Headphones");
  const m = col(color, { roughness: 0.5 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(halfWidth, halfWidth * 0.1, 8, 28, Math.PI), m);
  band.castShadow = true;
  g.add(band);
  for (const s of [-1, 1]) {
    const cup = cyl(g, halfWidth * 0.42, halfWidth * 0.42, halfWidth * 0.32, m, [s * halfWidth, -halfWidth * 0.12, 0], 20);
    cup.rotation.z = Math.PI / 2;
    const pad = cyl(g, halfWidth * 0.36, halfWidth * 0.36, halfWidth * 0.1, col(0x2c2c2e, { roughness: 0.95 }), [s * (halfWidth - halfWidth * 0.2), -halfWidth * 0.12, 0], 20);
    pad.rotation.z = Math.PI / 2;
  }
  return g;
}

/** Glass of water. Origin at the glass base. */
export function waterGlass(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "Glass");
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.11, 24, 1, true),
    std({ color: 0xcfe0e4, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.38, side: THREE.DoubleSide }));
  glass.position.y = 0.055;
  g.add(glass);
  cyl(g, 0.031, 0.031, 0.008, std({ color: 0xbcd0d4, roughness: 0.1, transparent: true, opacity: 0.6 }), [0, 0.004, 0], 24);
  cyl(g, 0.033, 0.029, 0.075, std({ color: 0x8fb8c4, roughness: 0.05, transparent: true, opacity: 0.45 }), [0, 0.045, 0], 24);
  return g;
}

/** Stack of host notes (index cards). Origin at the bottom centre; long side along X. */
export function notes(parent: THREE.Object3D) {
  const g = group(parent, [0, 0, 0], "Notes");
  const paper = std({ map: label("notes", 128, 96, (c, w, h) => {
    c.fillStyle = "#efe7d2";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(60,70,120,0.55)";
    for (let y = 16; y < h; y += 10) c.fillRect(8, y, w * (0.55 + ((y * 7) % 30) / 100), 2);
  }), roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const b = box(g, [0.15, 0.003, 0.1], paper, [(i % 2) * 0.004, 0.002 + i * 0.0032, -(i % 3) * 0.003]);
    b.rotation.y = (i - 1.5) * 0.02;
  }
  return g;
}

/** Small round side table. Origin on the floor. */
export function sideTable(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "SideTable");
  const wood = std({ map: T.woodFloor([0.5, 0.5]), color: 0xbb9a7a });
  cyl(g, 0.2, 0.2, 0.03, wood, [0, 0.55, 0], 28);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    bar(g, [Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14], [Math.cos(a) * 0.1, 0.54, Math.sin(a) * 0.1], 0.014, wood);
  }
  return g;
}

// ---------- porch ----------

/** Video doorbell. Origin at the wall mount centre; lens faces +Z. `lens` = camera anchor. */
export function doorbell(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "Doorbell");
  box(g, [0.065, 0.14, 0.028], col(0x1d1e21, { roughness: 0.35 }), [0, 0, 0.014]);
  box(g, [0.058, 0.03, 0.002], col(0x3a3d42, { roughness: 0.3 }), [0, 0.04, 0.029]);
  cyl(g, 0.012, 0.012, 0.006, std({ color: 0x050608, roughness: 0.05, metalness: 0.4 }), [0, 0.04, 0.031], 20).rotation.x = Math.PI / 2;
  const ring = cyl(g, 0.02, 0.02, 0.004, std({ color: 0x5ab4ff, emissive: 0x2a8cff, emissiveIntensity: 1.4 }), [0, -0.035, 0.029], 24);
  ring.rotation.x = Math.PI / 2;
  cyl(g, 0.016, 0.016, 0.006, col(0x2a2c30), [0, -0.035, 0.031], 24).rotation.x = Math.PI / 2;
  const lens = group(g, [0, 0.04, 0.035], "DoorbellLens");
  return { g, lens };
}

/** Wooden baseball bat, 0.84 m. Origin at the knob; barrel along +Y. */
export function bat(parent: THREE.Object3D) {
  const pts = [
    [0, 0], [0.026, 0.0], [0.03, 0.008], [0.022, 0.02], [0.0135, 0.04], [0.0135, 0.3], [0.017, 0.42],
    [0.026, 0.56], [0.032, 0.66], [0.034, 0.8], [0.032, 0.83], [0.022, 0.84], [0, 0.842],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const wood = std({ map: tex("bat-ash", [64, 256], (g, w, h) => {
    g.fillStyle = "#c79a5e";
    g.fillRect(0, 0, w, h);
    noise(g, w, h, ["#a87a43", "#ddb57e"], 0.25);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(110,70,30,${0.08 + (i % 4) * 0.04})`;
      g.fillRect((i * 37) % w, 0, 1 + (i % 3), h);
    }
    g.fillStyle = "#2b2420";
    g.fillRect(0, h * 0.94, w, h * 0.06); // dark grip tape near the knob (v flipped)
  }), roughness: 0.55 });
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), wood);
  m.castShadow = m.receiveShadow = true;
  const g = group(parent, [0, 0, 0], "Bat");
  g.add(m);
  const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.17, 16), col(0x23201e, { roughness: 0.95 }));
  tape.position.y = 0.13;
  g.add(tape);
  return g;
}

// ---------- house night ----------

/** Baby-monitor parent unit. Origin at the base centre; screen faces +Z. `screen` takes the feed texture. */
export function monitorUnit(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "BabyMonitor");
  const shell = col(0xe9e5dd, { roughness: 0.5 });
  box(g, [0.09, 0.02, 0.06], shell, [0, 0.01, 0]);
  const body = group(g, [0, 0.07, 0]);
  body.rotation.x = -0.18;
  box(body, [0.14, 0.11, 0.025], shell, [0, 0, 0]);
  const screen: THREE.Mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.075), new THREE.MeshBasicMaterial({ color: 0x050607, toneMapped: false }));
  screen.position.set(0, 0.008, 0.0131);
  body.add(screen);
  sph(body, 0.004, std({ color: 0x40ff60, emissive: 0x20ff40, emissiveIntensity: 0 }), [0.055, -0.045, 0.013]).name = "MonitorLED";
  bar(body, [0.06, 0.05, -0.005], [0.07, 0.12, -0.01], 0.004, shell, true);
  return { g, screen, body, led: body.getObjectByName("MonitorLED") as THREE.Mesh };
}

/** Nursery camera on a small stand. Origin at the base; lens faces +Z. */
export function nurseryCam(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "NurseryCam");
  const shell = col(0xeeeae2, { roughness: 0.5 });
  cyl(g, 0.035, 0.04, 0.015, shell, [0, 0.0075, 0], 20);
  sph(g, 0.04, shell, [0, 0.06, 0]);
  cyl(g, 0.016, 0.016, 0.012, std({ color: 0x08090b, roughness: 0.05 }), [0, 0.065, 0.037], 20).rotation.x = Math.PI / 2;
  return g;
}

// ---------- safe ----------

/** Floor safe 0.62 x 0.78 x 0.6 with hollow interior. Origin on the floor at the front-face centre; door hinges on
 *  the left (−X) edge, `door.rotation.y` 0 = closed, −1.9 = wide open (swings toward the viewer on screen left). */
export function safe(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "Safe");
  const paint = std({ map: T.paint("safe", "#3d4a44"), roughness: 0.55, metalness: 0.35 });
  const inner = col(0x2a2622, { roughness: 0.95 });
  const W = 0.62, H = 0.78, D = 0.6, t = 0.06;
  box(g, [W, t, D], paint, [0, 0.04 + t / 2, -D / 2]); // floor
  box(g, [W, t, D], paint, [0, 0.04 + H - t / 2, -D / 2]); // roof
  box(g, [t, H, D], paint, [-W / 2 + t / 2, 0.04 + H / 2, -D / 2]);
  box(g, [t, H, D], paint, [W / 2 - t / 2, 0.04 + H / 2, -D / 2]);
  box(g, [W, H, t], paint, [0, 0.04 + H / 2, -D + t / 2]);
  box(g, [W - 2 * t, H - 2 * t, 0.01], inner, [0, 0.04 + H / 2, -D + t + 0.006]);
  box(g, [W - 2 * t, 0.01, D - t], inner, [0, 0.04 + t + 0.005, -D / 2 + t / 2]);
  box(g, [W - 2 * t, 0.012, D - t - 0.04], paint, [0, 0.04 + H * 0.55, -D / 2 - 0.0]); // shelf
  for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) for (const z of [-0.06, -D + 0.06]) box(g, [0.06, 0.04, 0.06], black(), [x, 0.02, z]);
  const hinge = group(g, [-W / 2, 0.04 + H / 2, 0], "SafeHinge");
  const door = group(hinge, [0, 0, 0], "SafeDoor");
  box(door, [W, H, 0.07], paint, [W / 2, 0, 0.035]);
  box(door, [W - 0.1, H - 0.1, 0.012], std({ map: T.paint("safe2", "#36423d"), roughness: 0.5, metalness: 0.35 }), [W / 2, 0, 0.074]);
  const chrome = std({ color: 0xb8bcc0, metalness: 0.85, roughness: 0.25 });
  const dial = cyl(door, 0.055, 0.06, 0.03, chrome, [W / 2 + 0.03, 0.12, 0.09], 32);
  dial.rotation.x = Math.PI / 2;
  const wheel = group(door, [W / 2 + 0.03, -0.1, 0.09], "SafeWheel");
  cyl(wheel, 0.02, 0.02, 0.03, chrome, [0, 0, 0], 16).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    bar(wheel, [0, 0, 0.01], [Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.01], 0.009, chrome);
    sph(wheel, 0.016, chrome, [Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.01]);
  }
  box(door, [0.08, 0.1, 0.03], paint, [W / 2 - 0.06, 0, -0.012]); // inner lug
  for (const y of [-0.25, 0.25]) cyl(g, 0.015, 0.015, 0.1, chrome, [-W / 2 - 0.005, 0.04 + H / 2 + y, 0.02], 10);
  // inside the door: small camera anchor (POV for S06) on the back wall, looking out
  const insideCam = group(g, [0.02, 0.04 + 0.28, -D + 0.12], "SafeInsideCam");
  return { g, hinge, door, wheel, insideCam, W, H, D };
}

/** The confiscated camera pile (sits on the safe floor). Origin at the pile base centre. */
export function cameraPile(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "CameraPile");
  const add = (o: THREE.Object3D, pos: XYZ, rot: XYZ) => (o.position.set(...pos), o.rotation.set(...rot), g.add(o), o);
  // smashed doorbell (cracked faceplate)
  const db = new THREE.Group();
  box(db, [0.065, 0.14, 0.028], col(0x1d1e21, { roughness: 0.35 }), [0, 0, 0]);
  box(db, [0.04, 0.06, 0.003], col(0x6b6e72, { roughness: 0.3 }), [0.01, 0.03, 0.016]).rotation.z = 0.4;
  add(db, [-0.16, 0.02, 0.06], [-Math.PI / 2, 0, 0.6]);
  // webcam
  const wc = new THREE.Group();
  box(wc, [0.09, 0.03, 0.03], col(0x222326), [0, 0, 0]);
  cyl(wc, 0.01, 0.01, 0.01, std({ color: 0x050608, roughness: 0.05 }), [0, 0, 0.016], 16).rotation.x = Math.PI / 2;
  add(wc, [0.1, 0.02, 0.08], [0, -0.4, 0]);
  // camcorder
  const cc = new THREE.Group();
  box(cc, [0.07, 0.07, 0.13], col(0x2b2c30, { roughness: 0.5 }), [0, 0, 0]);
  cyl(cc, 0.025, 0.028, 0.04, col(0x111214), [0, 0.005, 0.08], 18).rotation.x = Math.PI / 2;
  add(cc, [0.02, 0.04, -0.1], [0, 0.7, 0]);
  // security dome
  const dm = new THREE.Group();
  cyl(dm, 0.06, 0.06, 0.02, col(0xe6e2da), [0, 0, 0], 20);
  sph(dm, 0.045, std({ color: 0x15171a, roughness: 0.1, metalness: 0.2 }), [0, 0.01, 0], [1, 0.8, 1]);
  add(dm, [-0.12, 0.012, -0.12], [0.15, 0, 0.1]);
  // old phone
  add(box(new THREE.Group(), [0.07, 0.008, 0.14], col(0x111214, { roughness: 0.2 }), [0, 0, 0]).parent!, [0.15, 0.045, -0.05], [0.25, 1.1, 0.1]);
  // action cam
  const ac = new THREE.Group();
  box(ac, [0.06, 0.045, 0.03], col(0x8c9196, { roughness: 0.4, metalness: 0.3 }), [0, 0, 0]);
  add(ac, [-0.04, 0.06, 0.04], [0.2, 0.3, 0.2]);
  return g;
}

// ---------- moving day / woods ----------

/** Cardboard moving box 0.5 x 0.38 x 0.4. Origin at the box centre. */
export function movingBox(parent: THREE.Object3D) {
  const card = std({ map: tex("cardboard", 128, (g, w, h) => {
    g.fillStyle = "#b88b55";
    g.fillRect(0, 0, w, h);
    noise(g, w, h, ["#9c7444", "#cfa16a"], 0.2);
    speckle(g, w, h, ["#7d5a31"], 300, 1, 0.3);
    g.fillStyle = "rgba(205,190,150,0.85)";
    g.fillRect(w * 0.44, 0, w * 0.12, h);
  }), roughness: 0.92 });
  const g = group(parent, [0, 0, 0], "MovingBox");
  box(g, [0.5, 0.38, 0.4], card, [0, 0, 0]);
  return g;
}

/** Enamel mug. Origin at the base; handle on +X. */
export function mug(parent: THREE.Object3D) {
  const g = group(parent, [0, 0, 0], "Mug");
  const enamel = col(0x2f5a6e, { roughness: 0.4 });
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.04, 0.095, 24, 1, true), std({ color: 0x2f5a6e, roughness: 0.4, side: THREE.DoubleSide }));
  outer.position.y = 0.0475;
  outer.castShadow = true;
  g.add(outer);
  cyl(g, 0.04, 0.04, 0.006, enamel, [0, 0.003, 0], 24);
  cyl(g, 0.039, 0.039, 0.004, col(0x3b2414, { roughness: 0.2 }), [0, 0.075, 0], 24); // coffee
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 8, 16, Math.PI), enamel);
  h.position.set(0.042, 0.05, 0);
  h.rotation.z = -Math.PI / 2;
  g.add(h);
  return g;
}

/** Moving truck (box truck). Origin on the ground at the rear-axle centre; drives toward +Z. */
export function truck(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "Truck");
  const white = std({ map: T.paint("truckbox", "#e4e1d8"), roughness: 0.7 });
  const cabPaint = col(0xc5462e, { roughness: 0.55 });
  const glass = std({ color: 0x1d2a35, roughness: 0.12, metalness: 0.3 });
  box(g, [2.3, 2.3, 4.2], white, [0, 1.75, 0.2]);
  box(g, [2.3, 0.18, 4.4], col(0x2a2a2c), [0, 0.55, 0.3]);
  box(g, [2.2, 1.5, 1.7], cabPaint, [0, 1.35, 3.25]);
  box(g, [2.0, 0.6, 0.05], glass, [0, 1.75, 4.11]).rotation.x = -0.2;
  for (const s of [-1, 1]) box(g, [0.04, 0.55, 0.9], glass, [s * 1.1, 1.7, 3.3]);
  box(g, [2.25, 0.25, 0.15], col(0x333336), [0, 0.7, 4.12]);
  for (const s of [-1, 1]) sph(g, 0.09, std({ color: 0xfff2d0, emissive: 0xffe2a0, emissiveIntensity: 0.4 }), [s * 0.85, 0.95, 4.12]);
  const tire = col(0x18181a, { roughness: 0.95 });
  for (const z of [0, 3.3]) for (const s of [-1, 1]) {
    const w = cyl(g, 0.45, 0.45, 0.32, tire, [s * 1.0, 0.45, z], 20);
    w.rotation.z = Math.PI / 2;
    const hub = cyl(g, 0.2, 0.2, 0.33, steel(), [s * 1.0, 0.45, z], 14);
    hub.rotation.z = Math.PI / 2;
  }
  box(g, [2.32, 0.08, 0.04], col(0xc5462e), [0, 2.5, -1.9]);
  return g;
}

/** Trail camera strapped to a trunk. Origin at the lens; lens faces +Z. */
export function trailCam(parent: THREE.Object3D, p: XYZ) {
  const g = group(parent, p, "TrailCam");
  const camo = std({ map: tex("camo", 64, (c, w, h) => {
    c.fillStyle = "#5a5a3c";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = ["#3b3a26", "#7a7350", "#2d2c1e"][i % 3];
      c.beginPath();
      c.ellipse((i * 23) % w, (i * 41) % h, 5 + (i % 5), 3 + (i % 3), i, 0, Math.PI * 2);
      c.fill();
    }
  }), roughness: 0.9 });
  box(g, [0.11, 0.15, 0.07], camo, [0, 0, -0.035]);
  cyl(g, 0.016, 0.016, 0.01, std({ color: 0x050608, roughness: 0.05 }), [0, 0.02, 0.002], 16).rotation.x = Math.PI / 2;
  box(g, [0.07, 0.03, 0.004], std({ color: 0x220909, emissive: 0x330000, emissiveIntensity: 0.4 }), [0, -0.035, 0.001]);
  box(g, [0.13, 0.025, 0.16], col(0x1d1d1a), [0, 0, -0.1]);
  return g;
}
