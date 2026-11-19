// Built exterior for S03-S15: one modular suburban ranch house + yard, plus the episode's props.
// World: meters, Y up. House front faces +Z (front wall plane z = 0). Garage at +X (screen right from the street),
// side window on the left side wall (x = -5, faces -X), side path, and the 12 ft (3.66 m) block wall at the back.
// Separate pivots: front door + deadbolt turnpiece, side-window sash, bars, boards, garage door panels (4), car,
// Gregory (body/head/tail), chicken tray, vault pole, steel door, sensor light, floodlights.
// Status: built blocking-quality geometry with procedural textures (see ASSET-MANIFEST.md); not final hero assets.
import * as THREE from "three";
import { T, label } from "../lib/tex";
import { cloneRig, loadGLB } from "../lib/load";

export const WALL_H = 3.66; // twelve feet
export const PORCH_Y = 0.18;

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, ...o });
const shadowed = (m: THREE.Mesh) => ((m.castShadow = true), (m.receiveShadow = true), m);
export function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cyl(rt: number, rb: number, h: number, mat: THREE.Material, parent: THREE.Object3D, seg = 16) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
  parent.add(m);
  return m;
}
function sph(r: number, mat: THREE.Material, parent: THREE.Object3D, sx = 1, sy = 1, sz = 1, seg = 20) {
  const m = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat));
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

/** box with world-scaled UVs (texture repeats every `tile` meters on each face) */
function tiledBox(w: number, h: number, d: number, mat: THREE.Material, tile: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ax > 0.5 ? [p.getZ(i), p.getY(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, u / tile, v / tile);
  }
  return shadowed(new THREE.Mesh(g, mat));
}

function gableRoof(w: number, d: number, rise: number, overhang: number, mat: THREE.Material) {
  // ridge along X
  const hw = w / 2 + overhang, hd = d / 2 + overhang;
  const g = new THREE.BufferGeometry();
  const v = [
    -hw, 0, hd, hw, 0, hd, hw, rise, 0, -hw, 0, hd, hw, rise, 0, -hw, rise, 0, // front slope
    hw, 0, -hd, -hw, 0, -hd, -hw, rise, 0, hw, 0, -hd, -hw, rise, 0, hw, rise, 0, // back slope
  ];
  const s = Math.hypot(hd, rise) / 2.2;
  const u = [0, 0, w / 2.2, 0, w / 2.2, s, 0, 0, w / 2.2, s, 0, s, 0, 0, w / 2.2, 0, w / 2.2, s, 0, 0, w / 2.2, s, 0, s];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2));
  g.computeVertexNormals();
  const roof = shadowed(new THREE.Mesh(g, mat));
  // gable ends (triangles) + fascia
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise * (d / 2) / hd)]);
  return { roof, gable: new THREE.ShapeGeometry(tri) };
}

export type ExteriorRefs = ReturnType<typeof buildExterior>;

export function buildExterior(scene: THREE.Scene) {
  const W = new THREE.Group();
  scene.add(W);
  const stucco = std({ map: T.stucco([1, 1]) });
  const trim = std({ map: T.paint("xtrim", "#ece6d8"), roughness: 0.7 });
  const shingles = std({ map: T.shingles([1, 1]), side: THREE.DoubleSide });
  const concrete = std({ map: T.concrete([1, 1]) });
  const glass = std({ color: 0x1d2a35, roughness: 0.15, metalness: 0.3 });
  const darkGlass = std({ color: 0x0e151c, roughness: 0.2, metalness: 0.2 });

  // ---------- ground ----------
  const grassT = T.grass([60, 60]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), std({ map: grassT }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  W.add(ground);
  const flat = (w: number, d: number, mat: THREE.Material, x: number, z: number, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    W.add(m);
    return m;
  };
  flat(160, 8, std({ map: T.asphalt([40, 2]) }), 0, 14, 0.012); // street
  flat(160, 1.5, std({ map: T.concrete([80, 1]) }), 0, 9.3, 0.02); // sidewalk
  flat(3.8, 9, std({ map: T.concrete([2, 4]) }), 2.8, 4.9, 0.018); // driveway
  flat(1.0, 8.5, std({ map: T.concrete([1, 6]) }), -1.5, 5.0, 0.016); // front walk
  flat(1.2, 12, std({ map: T.concrete([1, 8]) }), -5.75, -4, 0.016); // side path to the wall

  const houseStart = W.children.length; // procedural house structure starts here (replaced by Codex House_Exterior.glb)
  // ---------- house body (x -5..1, z -8..0) + garage (x 1..4.7, z -6..0.4) ----------
  const body = tiledBox(6, 2.8, 8, stucco, 2.2);
  body.position.set(-2, 1.4, -4);
  W.add(body);
  // garage shell with a real door opening (x 1.55..4.15, h 2.1) so the breakaway panels have somewhere to go
  for (const [w, h, d, x, y, z] of [
    [0.12, 2.7, 6.4, 4.64, 1.35, -2.8], // right wall
    [3.7, 2.7, 0.12, 2.85, 1.35, -5.94], // back wall
    [0.55, 2.7, 0.12, 1.275, 1.35, 0.34], // front pier left
    [0.55, 2.7, 0.12, 4.425, 1.35, 0.34], // front pier right
    [2.6, 0.6, 0.12, 2.85, 2.4, 0.34], // header
  ] as const) {
    const m = tiledBox(w, h, d, stucco, 2.2);
    m.position.set(x, y, z);
    W.add(m);
  }
  box(3.6, 0.04, 6.3, std({ color: 0x181614 }), 2.85, 2.68, -2.8, W); // ceiling (keeps the interior dark)
  box(6.2, 0.18, 8.2, concrete, -2, 0.09, -4, W); // foundation lip
  const r1 = gableRoof(8, 6, 1.6, 0.45, shingles);
  r1.roof.position.set(-2, 2.8, -4);
  r1.roof.rotation.y = Math.PI / 2; // ridge along Z for the house
  W.add(r1.roof);
  const r2 = gableRoof(3.7, 6.4, 1.1, 0.4, shingles);
  r2.roof.position.set(2.85, 2.7, -2.8);
  W.add(r2.roof);
  for (const [x, z, d, rise] of [[-2, 0, 6, 1.6], [-2, -8, 6, 1.6]] as const) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise)])), stucco);
    g.position.set(x, 2.8, z + (z === 0 ? 0.005 : -0.005));
    if (z !== 0) g.rotation.y = Math.PI;
    shadowed(g);
    W.add(g);
  }
  box(4.5, 0.16, 0.06, trim, 2.85, 2.72, 0.85, W); // garage fascia
  {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-3.2, 0), new THREE.Vector2(3.2, 0), new THREE.Vector2(0, 1.1)])), stucco);
    g.position.set(4.705, 2.7, -2.8);
    g.rotation.y = Math.PI / 2;
    W.add(shadowed(g));
  }

  // ---------- front door, frame, deadbolt ----------
  const doorX = -1.5;
  box(1.2, 2.3, 0.1, trim, doorX, 1.15 + PORCH_Y - 0.02, 0.02, W);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(doorX - 0.47, PORCH_Y, 0.06);
  W.add(doorPivot);
  const frontDoor = box(0.94, 2.1, 0.05, std({ map: T.frontDoor(), roughness: 0.6 }), 0.47, 1.05, 0, doorPivot);
  const brass = std({ color: 0xc9a14e, metalness: 0.85, roughness: 0.3 });
  const knob = sph(0.032, brass, frontDoor);
  knob.position.set(0.37, -0.08, 0.05);
  const boltPlate = box(0.07, 0.11, 0.012, brass, 0.37, 0.12, 0.03, frontDoor);
  const turnpiece = new THREE.Group(); // pivots around its true centre (shot list S03)
  turnpiece.position.set(0.37, 0.12, 0.045);
  frontDoor.add(turnpiece);
  box(0.016, 0.055, 0.016, brass, 0, 0, 0, turnpiece);
  void boltPlate;
  // steel fortress door (S13-S15) occupies the same opening
  const steelDoor = box(0.98, 2.14, 0.09, std({ map: T.steel(), metalness: 0.75, roughness: 0.38 }), doorX, PORCH_Y + 1.07, 0.08, W);
  for (const y of [0.5, 1.07, 1.65]) box(0.94, 0.05, 0.03, std({ color: 0x3b4148, metalness: 0.8, roughness: 0.4 }), 0, y - 1.07, 0.06, steelDoor);
  const keypad = box(0.1, 0.16, 0.03, std({ color: 0x1b1e22 }), 0.6, 0.15, 0.03, steelDoor);
  void keypad;

  // porch slab + steps + railing + lights
  box(2.6, PORCH_Y, 1.7, concrete, doorX, PORCH_Y / 2, 0.85, W);
  box(1.2, PORCH_Y / 2, 0.35, concrete, doorX, PORCH_Y / 4, 1.85, W);
  const iron = std({ color: 0x1d1c1b, metalness: 0.6, roughness: 0.5 });
  const rail = new THREE.Group();
  W.add(rail);
  for (const side of [-1, 1]) {
    const x0 = doorX + side * 1.25;
    box(0.04, 0.04, 1.65, iron, x0, PORCH_Y + 0.9, 0.85, rail);
    for (let i = 0; i <= 8; i++) box(0.018, 0.9, 0.018, iron, x0, PORCH_Y + 0.45, 0.05 + i * 0.2, rail);
  }
  const porchLamps: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const l = box(0.13, 0.24, 0.1, std({ color: 0xfff0c8, emissive: 0xffc070, emissiveIntensity: 0.4 }), doorX + side * 0.68, PORCH_Y + 1.85, 0.1, W);
    porchLamps.push(l);
  }

  // front window (left of door)
  const winFront = (x: number, y: number, z: number, w: number, h: number) => {
    box(w + 0.14, h + 0.14, 0.08, trim, x, y, z, W);
    box(w, h, 0.09, glass, x, y, z + 0.005, W);
    box(w, 0.05, 0.1, trim, x, y, z + 0.01, W);
    box(0.05, h, 0.1, trim, x, y, z + 0.01, W);
  };
  winFront(-3.7, 1.55, 0.02, 1.3, 1.05);

  // ---------- side window kit (left wall x = -5, faces -X) ----------
  const sideWin = new THREE.Group();
  sideWin.position.set(-5.02, 0, -3);
  W.add(sideWin);
  const SW = { w: 1.0, h: 1.0, sill: 0.95 };
  const cy = SW.sill + SW.h / 2;
  box(0.1, SW.h + 0.16, SW.w + 0.16, trim, 0, cy, 0, sideWin);
  box(0.12, 0.06, SW.w + 0.3, trim, -0.06, SW.sill - 0.03, 0, sideWin); // sill
  const opening = box(0.11, SW.h, SW.w, darkGlass, 0.01, cy, 0, sideWin); // dark interior
  const curtain = box(0.02, SW.h * 0.95, SW.w * 0.4, std({ map: T.paint("curt", "#c7b48a") }), 0.04, cy, -0.25, sideWin);
  const sash = new THREE.Group(); // lower sash slides up
  sideWin.add(sash);
  box(0.06, SW.h / 2, SW.w, glass, -0.03, SW.sill + SW.h / 4, 0, sash);
  box(0.07, 0.05, SW.w, trim, -0.03, SW.sill + SW.h / 2, 0, sash);
  const bars = new THREE.Group();
  sideWin.add(bars);
  const barMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const b = box(0.025, SW.h + 0.1, 0.025, iron, -0.12, cy, -0.4 + i * 0.2, bars);
    barMeshes.push(b);
  }
  box(0.03, 0.03, SW.w + 0.1, iron, -0.12, SW.sill + 0.05, 0, bars);
  box(0.03, 0.03, SW.w + 0.1, iron, -0.12, SW.sill + SW.h - 0.02, 0, bars);
  const boards = new THREE.Group();
  sideWin.add(boards);
  const ply = std({ map: T.plywood([1, 1]) });
  const boardMeshes = [0, 1, 2].map((i) => {
    const b = box(0.03, 0.24, SW.w + 0.3, ply, -0.16, SW.sill + 0.18 + i * 0.32, 0, boards);
    b.rotation.x = (i - 1) * 0.06;
    return b;
  });
  // boarded front window too (Detroit look)
  const frontBoards = new THREE.Group();
  W.add(frontBoards);
  for (let i = 0; i < 4; i++) {
    const b = box(1.5, 0.24, 0.03, ply, -3.7, 1.15 + i * 0.27, 0.1, frontBoards);
    b.rotation.z = (i % 2 ? -1 : 1) * 0.05;
  }
  const garageSideBoards = new THREE.Group(); // a sheet over the porch window to the right of the door
  W.add(garageSideBoards);

  // ---------- garage door: 4 panels with own pivots (S07 breakaway) ----------
  const gdT = T.garageDoor();
  const garagePanels: THREE.Group[] = [];
  const GD = { x: 2.85, w: 2.6, h: 2.1, z: 0.42 };
  // frame (jambs + header) around the opening, dark garage interior well behind it
  box(0.1, GD.h + 0.1, 0.1, trim, GD.x - GD.w / 2 - 0.05, GD.h / 2, GD.z - 0.02, W);
  box(0.1, GD.h + 0.1, 0.1, trim, GD.x + GD.w / 2 + 0.05, GD.h / 2, GD.z - 0.02, W);
  box(GD.w + 0.2, 0.1, 0.1, trim, GD.x, GD.h + 0.05, GD.z - 0.02, W);
  box(3.5, 0.02, 6.2, std({ color: 0x2a2826 }), GD.x, 0.012, -2.8, W); // garage slab
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.position.set(GD.x, (i + 0.5) * (GD.h / 4), GD.z);
    const tex = gdT.clone();
    tex.repeat.set(1, 0.25);
    tex.offset.set(0, i * 0.25);
    tex.needsUpdate = true;
    box(GD.w, GD.h / 4 - 0.01, 0.045, std({ map: tex, roughness: 0.7 }), 0, 0, 0, g);
    W.add(g);
    garagePanels.push(g);
  }
  const garageRest = garagePanels.map((g) => ({ p: g.position.clone(), r: g.rotation.clone() }));
  // lightweight debris chips
  const debris: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const d = box(0.12 + ((i * 37) % 10) * 0.012, 0.08, 0.02, std({ color: 0xd8d3c6 }), GD.x, 1, GD.z, W);
    d.visible = false;
    debris.push(d);
  }

  // ---------- yard wall (12 ft concrete block) at the back: z = -11, x -16..6 ----------
  const blockMat = std({ map: T.block([1, 1]), roughness: 0.95 });
  const wall = tiledBox(22, WALL_H, 0.3, blockMat, 1.6);
  wall.position.set(-5, WALL_H / 2, -11);
  W.add(wall);
  box(22.1, 0.08, 0.36, concrete, -5, WALL_H + 0.04, -11, W);
  // pillar + yard flood lamp, screen-right of the vault camera (camera outside at -Z looks +Z: screen right = -X)
  const pillar = tiledBox(1.2, WALL_H + 1.5, 1.2, stucco, 2.2);
  pillar.position.set(-9.0, (WALL_H + 1.5) / 2, -11.5);
  W.add(pillar);
  box(1.5, 0.12, 1.5, std({ color: 0x4a3a2c }), -9.0, WALL_H + 1.56, -11.5, W);
  const yardLampHead = box(0.36, 0.16, 0.26, std({ color: 0x2a2a28, metalness: 0.5, roughness: 0.5 }), -8.25, WALL_H + 1.0, -11.9, W);
  const yardLampLens = box(0.32, 0.02, 0.22, std({ color: 0xfff1cf, emissive: 0xffcc80, emissiveIntensity: 3.5 }), -8.25, WALL_H + 0.91, -11.9, W);
  void yardLampHead;
  void yardLampLens;
  // hedge along the inside of the wall
  const hedgeMat = std({ map: T.leaves(), roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const h = sph(0.7, hedgeMat, W, 1.6, 0.9, 1);
    h.position.set(-14 + i * 1.6, 0.6, -10.2);
  }

  const houseEnd = W.children.length;
  // ---------- neighbourhood ----------
  const nb = (x: number, z: number, w: number, d: number, h: number, col: string, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    W.add(g);
    const b = tiledBox(w, h, d, std({ map: T.paint(`nb${col}`, col, [1, 1]) }), 2.2);
    b.position.y = h / 2;
    g.add(b);
    const rf = gableRoof(w, d, 1.3, 0.35, shingles);
    rf.roof.position.y = h;
    g.add(rf.roof);
    box(1.2, 1.0, 0.06, glass, -w * 0.25, 1.5, d / 2 + 0.02, g);
    box(0.9, 2.0, 0.06, std({ color: 0x3d4c5e }), w * 0.2, 1.0, d / 2 + 0.02, g);
    return g;
  };
  nb(-13, -4, 7, 8, 2.7, "#b9a789");
  nb(12, -4, 7, 8, 2.8, "#9fa7a1");
  nb(-9, 23, 8, 8, 2.8, "#c2b195", Math.PI);
  nb(3, 23, 7, 8, 2.7, "#a39a8c", Math.PI);
  nb(14, 23, 7, 8, 2.9, "#b7a48a", Math.PI);
  nb(-7, -29, 8, 7, 2.8, "#a99b85");
  nb(7, -30, 7, 7, 2.7, "#9c9a8e");
  const tree = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    W.add(g);
    const tr = cyl(0.12 * s, 0.18 * s, 2.2 * s, std({ color: 0x4a3828 }), g);
    tr.position.y = 1.1 * s;
    for (const [ox, oy, oz, r] of [[0, 3.0, 0, 1.3], [0.7, 2.5, 0.2, 0.9], [-0.6, 2.6, -0.3, 1.0], [0.1, 3.7, 0.2, 0.9]]) {
      const f = sph(r * s, hedgeMat, g, 1, 0.9, 1, 12);
      f.position.set(ox * s, oy * s, oz * s);
    }
    return g;
  };
  tree(-8.5, 6, 1.1);
  tree(7.5, 5, 1.0);
  tree(-11, -14, 1.3);
  tree(4, -15, 1.2);
  tree(-17, 12, 1.2);
  tree(18, 10, 1.1);
  // low picket fence on the left of the lawn (foreground parallax cue)
  const fence = new THREE.Group();
  W.add(fence);
  const wood = std({ map: T.paint("fence", "#e9e3d4") });
  for (let i = 0; i < 26; i++) box(0.08, 0.9, 0.03, wood, -7.0, 0.45, 8.5 - i * 0.32, fence);
  box(0.05, 0.08, 8.3, wood, -6.97, 0.7, 4.5, fence);
  box(0.05, 0.08, 8.3, wood, -6.97, 0.3, 4.5, fence);

  // ---------- car (boxy 90s sedan, faces -Z by default: nose toward the garage) ----------
  const car = new THREE.Group();
  W.add(car);
  const paint = std({ color: 0x6b2d2a, roughness: 0.45, metalness: 0.35 });
  const lower = box(1.76, 0.62, 4.6, paint, 0, 0.55, 0, car);
  void lower;
  // open cabin: roof slab + A/B/C pillars so Phil reads through the (rolled-down) side windows
  box(1.5, 0.06, 1.75, paint, 0, 1.44, 0.3, car);
  for (const sx of [-1, 1]) {
    const a = box(0.07, 0.62, 0.07, paint, sx * 0.76, 1.12, -0.72, car);
    a.rotation.x = -0.5;
    box(0.07, 0.56, 0.08, paint, sx * 0.77, 1.13, 0.42, car);
    const c = box(0.07, 0.62, 0.07, paint, sx * 0.76, 1.12, 1.3, car);
    c.rotation.x = 0.45;
  }
  box(1.5, 0.5, 0.03, glass, 0, 1.13, -0.86, car).rotation.x = 0.5; // windshield
  box(1.5, 0.5, 0.03, glass, 0, 1.13, 1.42, car).rotation.x = -0.45;
  for (const [x, z] of [[-0.82, -1.45], [0.82, -1.45], [-0.82, 1.4], [0.82, 1.4]]) {
    const wh = cyl(0.33, 0.33, 0.24, std({ color: 0x141414, roughness: 0.9 }), car, 20);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.33, z);
    const hub = cyl(0.17, 0.17, 0.25, std({ color: 0x9a9a9a, metalness: 0.8, roughness: 0.3 }), car, 12);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, 0.33, z);
  }
  box(1.8, 0.16, 0.12, std({ color: 0x2a2a2a }), 0, 0.36, -2.33, car); // bumpers
  box(1.8, 0.16, 0.12, std({ color: 0x2a2a2a }), 0, 0.36, 2.33, car);
  for (const sx of [-1, 1]) {
    box(0.36, 0.13, 0.03, std({ color: 0xfff7e0, emissive: 0xfff0c0, emissiveIntensity: 0.6 }), sx * 0.6, 0.66, -2.31, car);
    box(0.34, 0.12, 0.03, std({ color: 0x8a0f0f, emissive: 0x500000 }), sx * 0.62, 0.68, 2.31, car);
  }
  // interior: seat + wheel (driver = car's left = -X when nose points -Z)
  box(0.55, 0.12, 0.55, std({ color: 0x2c2620 }), -0.38, 0.5, 0.3, car);
  box(0.55, 0.62, 0.12, std({ color: 0x2c2620 }), -0.38, 0.86, 0.62, car);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 24), std({ color: 0x151515 }));
  wheel.position.set(-0.38, 0.98, -0.3);
  wheel.rotation.x = -0.45;
  car.add(wheel);

  // ---------- Gregory (procedural pug, placeholder rig: body / head / tail pivots) ----------
  const fawn = std({ map: T.fur("#c9a375", "fawn"), roughness: 0.95 });
  const mask = std({ map: T.fur("#2a221c", "mask"), roughness: 0.9 });
  const eyeM = std({ color: 0x0a0806, roughness: 0.08, metalness: 0.1 });
  const pug = new THREE.Group();
  W.add(pug);
  const pugBody = new THREE.Group();
  pug.add(pugBody);
  const torso = sph(0.15, fawn, pugBody, 1.0, 0.95, 1.45);
  torso.position.set(0, 0.25, 0);
  const chest = sph(0.12, fawn, pugBody, 1.05, 1.0, 1.0);
  chest.position.set(0, 0.26, 0.14);
  const legs: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.07, 0.15], [0.07, 0.15], [-0.075, -0.13], [0.075, -0.13]]) {
    const l = cyl(0.028, 0.024, 0.17, fawn, pugBody, 10);
    l.geometry.translate(0, -0.085, 0);
    l.position.set(x, 0.17, z);
    legs.push(l);
    const paw = sph(0.03, fawn, l, 1, 0.6, 1.3, 10);
    paw.position.set(0, -0.158, 0.012);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.38, 0.2);
  pugBody.add(head);
  sph(0.105, fawn, head, 1.12, 0.98, 0.95);
  const muzzle = sph(0.06, mask, head, 1.3, 0.85, 0.55);
  muzzle.position.set(0, -0.025, 0.085);
  const nose = sph(0.02, std({ color: 0x0d0b0a, roughness: 0.4 }), head, 1.4, 0.8, 0.8);
  nose.position.set(0, -0.005, 0.118);
  const eyes: THREE.Mesh[] = [];
  const lids: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const e = sph(0.024, eyeM, head, 1, 1, 0.8, 14);
    e.position.set(sx * 0.048, 0.025, 0.078);
    eyes.push(e);
    const lid = sph(0.026, fawn, head, 1, 1, 0.8, 14); // blink: scale lid over the eye
    lid.position.set(sx * 0.048, 0.03, 0.078);
    lid.scale.set(1, 0.02, 0.8);
    lids.push(lid);
    const ear = sph(0.04, mask, head, 0.85, 0.55, 0.22, 10); // folded "button" ears
    ear.position.set(sx * 0.098, 0.055, 0.03);
    ear.rotation.set(0.3, sx * 0.4, sx * 1.1);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.016, 8, 16, Math.PI * 1.6), fawn);
  tail.position.set(0, 0.36, -0.19);
  tail.rotation.y = Math.PI / 2;
  pugBody.add(shadowed(tail));
  // collar + GREGORY tag
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24), std({ color: 0x9b1f1f, roughness: 0.6 }));
  collar.position.set(0, 0.33, 0.17);
  collar.rotation.x = Math.PI / 2 - 0.5;
  pugBody.add(shadowed(collar));
  const tagTex = label("gregory", 256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "#fff3c4");
    gr.addColorStop(1, "#c8a14a");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3b2a10";
    g.font = "bold 50px Arial, Helvetica, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("GREGORY", w / 2, h / 2 + 2);
  });
  const tag = new THREE.Mesh(new THREE.CircleGeometry(0.034, 24), std({ map: tagTex, metalness: 0.5, roughness: 0.35 }));
  tag.position.set(0, 0.235, 0.262);
  tag.rotation.x = 0.25;
  pugBody.add(tag);

  // ---------- rotisserie chicken tray ----------
  const tray = new THREE.Group();
  W.add(tray);
  box(0.3, 0.05, 0.22, std({ color: 0xc9ccd0, metalness: 0.9, roughness: 0.35 }), 0, 0.025, 0, tray);
  const chickenM = std({ color: 0x9a5a22, roughness: 0.35 });
  const ck = sph(0.09, chickenM, tray, 1.25, 0.8, 0.95);
  ck.position.set(0, 0.1, 0);
  for (const sx of [-1, 1]) {
    const leg = sph(0.04, chickenM, tray, 0.9, 0.8, 1.6, 10);
    leg.position.set(sx * 0.06, 0.12, 0.08);
    leg.rotation.x = -0.4;
  }

  // ---------- vault pole (yellow, as concept) ----------
  const pole = new THREE.Group();
  W.add(pole);
  const poleMesh = cyl(0.022, 0.022, 4.6, std({ color: 0xd8b52a, roughness: 0.55 }), pole, 10);
  poleMesh.position.y = 2.3; // pivot at the plant tip
  const poleTip = cyl(0.024, 0.024, 0.18, std({ color: 0x1c1c1c }), pole, 10);
  poleTip.position.y = 0.09;

  // ---------- tools / inserts ----------
  const fileTool = box(0.02, 0.008, 0.26, std({ color: 0x777b80, metalness: 0.8, roughness: 0.45 }), 0, 0, 0, W);
  const hammer = new THREE.Group();
  W.add(hammer);
  box(0.03, 0.3, 0.03, std({ color: 0x8a5a2a }), 0, 0, 0, hammer);
  box(0.12, 0.04, 0.04, std({ color: 0x404448, metalness: 0.8, roughness: 0.4 }), 0.0, 0.16, 0, hammer);
  const screwdriver = new THREE.Group();
  W.add(screwdriver);
  cyl(0.016, 0.016, 0.1, std({ color: 0xc23b22 }), screwdriver).position.y = -0.05;
  cyl(0.004, 0.004, 0.12, std({ color: 0xaaaaaa, metalness: 0.9 }), screwdriver).position.y = 0.06;

  // ---------- fortress dressing ----------
  const fortress = new THREE.Group();
  W.add(fortress);
  const sensor = sph(0.03, std({ color: 0x400000, emissive: 0xff1a1a, emissiveIntensity: 0 }), fortress, 1, 1, 0.6, 12);
  sensor.position.set(doorX + 0.75, PORCH_Y + 2.05, 0.08);
  const sensorBox = box(0.12, 0.12, 0.06, std({ color: 0x1b1d20 }), doorX + 0.75, PORCH_Y + 2.05, 0.04, fortress);
  void sensorBox;
  const floods: THREE.Mesh[] = [];
  for (const x of [-4.6, 0.6, 4.4]) {
    const f = box(0.3, 0.16, 0.18, std({ color: 0xfff6dc, emissive: 0xffe2a8, emissiveIntensity: 2.5 }), x, 2.62, 0.55, fortress);
    floods.push(f);
  }
  const cams: THREE.Group[] = [];
  for (const x of [-4.8, 4.5]) {
    const c = new THREE.Group();
    c.position.set(x, 2.5, 0.3);
    fortress.add(c);
    box(0.1, 0.1, 0.22, std({ color: 0xe8e8e8 }), 0, 0, 0.1, c);
    cams.push(c);
  }
  // razor wire coil along the yard wall top
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.006, 4, 20), iron);
  const wire = new THREE.InstancedMesh(coil.geometry, iron, 70);
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-15.5 + i * 0.3, WALL_H + 0.22, -11);
    wire.setMatrixAt(i, m);
  }
  fortress.add(wire);
  // guard post (booth) right of the porch
  const booth = new THREE.Group();
  booth.position.set(-3.1, 0, 0.9);
  fortress.add(booth);
  box(0.9, 2.2, 0.9, std({ map: T.paint("booth", "#5d6a5a") }), 0, 1.1, 0, booth);
  box(0.92, 0.5, 0.05, glass, 0, 1.5, 0.45, booth);
  // bank statement insert card (S13)
  const statement = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), std({
    roughness: 0.9,
    map: label("statement", 420, 594, (g, w, h) => {
      g.fillStyle = "#f6f3ea";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#1f3a5a";
      g.fillRect(0, 0, w, 60);
      g.fillStyle = "#fff";
      g.font = "bold 26px Arial";
      g.fillText("ACCOUNT STATEMENT", 20, 40);
      g.fillStyle = "#333";
      g.font = "18px Arial";
      const rows = [["Steel door", "-4,850.00"], ["Laser sensors", "-12,400.00"], ["Security staff", "-38,000.00"], ["Concrete wall", "-21,750.00"], ["Pug", "-1,200.00"]];
      rows.forEach(([a, b], i) => {
        g.fillText(a, 24, 110 + i * 40);
        g.fillText(b, w - 140, 110 + i * 40);
      });
      g.fillStyle = "#a01818";
      g.font = "bold 30px Arial";
      g.fillText("BALANCE   $0.00", 24, h - 60);
    }),
  }));
  W.add(statement);

  return {
    W, houseStart, houseEnd, rail, hedgeMat, wire, doorPivot, frontDoor, turnpiece, steelDoor, porchLamps, sideWin, sash, curtain, bars, barMeshes, boards, boardMeshes, frontBoards,
    garagePanels, garageRest, debris, car, wheel, pug, pugBody, head, tail, lids, eyes, legs, tag, tray, pole, fileTool, hammer,
    screwdriver, fortress, sensor, floods, cams, booth, statement, opening, GD, doorX, SW, garageSideBoards,
  };
}

/**
 * Swap the procedural blocking for the Codex asset upgrade (codex/phil-bathroom @ 740c3eb):
 * House_Exterior.glb, Car_Sedan.glb, Gregory_Pug_Rig.glb and the props. Keeps the built ground, street, walks,
 * neighbours, trees, fence, hedge, porch railings, porch lamps, garage debris and razor wire (not in the GLB).
 * Re-points every handle the shots drive; hidden upgrade groups (scale 0 in the GLB) are restored to scale 1 and
 * driven by visibility instead.
 */
export async function upgradeExterior(X: ExteriorRefs, url: (p: string) => string) {
  const get = async (p: string) => (await loadGLB(url(p))).scene;
  const [house, car, tray, pole, file, hammer, screwdriver, statement, pug] = await Promise.all([
    get("exterior/House_Exterior.glb"), get("props/Car_Sedan.glb"), get("props/Rotisserie_Tray.glb"), get("props/Vault_Pole.glb"),
    get("props/Metal_File.glb"), get("props/Claw_Hammer.glb"), get("props/Screwdriver.glb"), get("props/Account_Statement.glb"),
    loadGLB(url("cast/Gregory_Pug_Rig.glb")),
  ]);
  const shadows = (o: THREE.Object3D) => o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  // 1) hide the procedural house structure, keep what the GLB does not provide
  const keep = new Set<THREE.Object3D>([X.rail, ...X.porchLamps, ...X.debris]);
  X.W.children.slice(X.houseStart, X.houseEnd).forEach((o) => {
    const isHedge = (o as THREE.Mesh).material === X.hedgeMat;
    if (!keep.has(o) && !isHedge) o.visible = false, (o.userData.retired = true);
  });
  for (const old of [X.car, X.pug, X.tray, X.pole, X.fileTool, X.hammer, X.screwdriver, X.statement]) old.parent?.remove(old);
  // 2) house
  shadows(house);
  X.W.add(house);
  const n = <T extends THREE.Object3D = THREE.Object3D>(name: string, root: THREE.Object3D = house) => {
    const o = root.getObjectByName(name);
    if (!o) throw new Error(`asset node ${name} missing`);
    return o as T;
  };
  for (const g of ["Front_Window_Boards", "Window_Bars", "Window_Boards", "Fortress_Dressing"]) n(g).scale.set(1, 1, 1);
  const fortress = n("Fortress_Dressing");
  X.fortress.remove(X.wire);
  fortress.add(X.wire); // razor wire rides with the fortress state
  X.fortress.parent?.remove(X.fortress);
  const sensor = n<THREE.Mesh>("Security_Sensor_Lens");
  sensor.material = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1a1a, emissiveIntensity: 0, roughness: 0.3 });
  const panels = [0, 1, 2, 3].map((i) => n(`Garage_Panel_${i}`));
  // 3) car (nose -Z, driver -X, origin on the ground centre), side glass rolled down so Phil reads through
  shadows(car);
  X.W.add(car);
  for (const w of ["Window_FL", "Window_FR", "Window_RL", "Window_RR"]) n(w, car).visible = false;
  // 4) props (pivots: tray bottom centre, pole tip with +Y length 4.9, tools at the grip with +Y long axis)
  for (const o of [tray, pole, file, hammer, screwdriver, statement]) shadows(o), X.W.add(o);
  // 5) Gregory (Codex A3): skinned rig + 5 clips on one mixer
  const pugRoot = new THREE.Group();
  const pugModel = cloneRig(pug.scene);
  pugRoot.add(pugModel);
  pugModel.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; } });
  X.W.add(pugRoot);
  const mixer = new THREE.AnimationMixer(pugModel);
  const clips = Object.fromEntries(pug.animations.map((c) => [c.name, mixer.clipAction(c)])) as Record<string, THREE.AnimationAction>;
  Object.assign(X, {
    doorPivot: n("Front_Door_Hinge"), frontDoor: n("Front_Door"), turnpiece: n("Deadbolt_Turnpiece"), steelDoor: n("Steel_Door"),
    sash: n("Window_Sash"), bars: n("Window_Bars"), barMeshes: [0, 1, 2, 3, 4].map((i) => n(`Bar_${i}`)),
    boards: n("Window_Boards"), boardMeshes: [0, 1, 2].map((i) => n(`Board_${i}`)), frontBoards: n("Front_Window_Boards"),
    garagePanels: panels, garageRest: panels.map((g) => ({ p: g.position.clone(), r: g.rotation.clone() })),
    fortress, sensor, car, wheel: n("Steering_Wheel", car), tray, pole, fileTool: file, hammer, screwdriver, statement,
    pug: pugRoot, tag: n("Gregory_Tag", pugModel), pugJaw: n("Pug_Jaw", pugModel), pugHead: n("Pug_Head", pugModel), pugMixer: mixer, pugClips: clips,
  });
  // rest transforms for everything the shots offset relative to rest
  const rest = new Map<THREE.Object3D, { p: THREE.Vector3; r: THREE.Euler }>();
  for (const o of [X.sash, X.bars, ...X.barMeshes, X.steelDoor, X.turnpiece, X.fortress]) rest.set(o, { p: o.position.clone(), r: o.rotation.clone() });
  return {
    rest,
    reset() { for (const [o, t] of rest) { o.position.copy(t.p); o.rotation.copy(t.r); } },
    restOf: (o: THREE.Object3D) => rest.get(o)!,
  };
}

export type PugExtras = { pugJaw: THREE.Object3D; pugHead: THREE.Object3D; pugMixer: THREE.AnimationMixer; pugClips: Record<string, THREE.AnimationAction> };
