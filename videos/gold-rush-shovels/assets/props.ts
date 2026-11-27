import * as THREE from "three";
import { twoTone } from "../../../templates/bridge/shade";

export const matte = (color: THREE.ColorRepresentation, map?: THREE.Texture) =>
  twoTone(new THREE.MeshLambertMaterial({ color, map: map ?? null }));

export function box(parent: THREE.Object3D, size: number[], at: number[], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(at[0], at[1], at[2]);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function socket(parent: THREE.Object3D, name: string, x: number, y: number, z: number) {
  const point = new THREE.Object3D();
  point.name = name;
  point.position.set(x, y, z);
  parent.add(point);
  return point;
}

export const PAN_RADIUS = 0.225;
export const PAN_FLOOR = 0.012;
export function makePan() {
  const root = new THREE.Group();
  const profile = [[0, 0], [.135, 0], [.149, .005], [.221, .064], [.225, .066],
    [.226, .074], [.218, .077], [.212, .070], [.145, PAN_FLOOR], [0, PAN_FLOOR]];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 64),
    twoTone(new THREE.MeshPhongMaterial({ color: "#424f5b", specular: "#657288", shininess: 50, side: THREE.DoubleSide })));
  bowl.castShadow = bowl.receiveShadow = true;
  root.add(bowl);
  return {
    root, floor: socket(root, "panFloor", 0, PAN_FLOOR, 0),
    left: socket(root, "rimLeft", -PAN_RADIUS, .071, 0),
    right: socket(root, "rimRight", PAN_RADIUS, .071, 0),
  };
}

export const NUGGET_HEIGHT = .024;
export function makeNugget() {
  // Indexed asymmetrical hull. Base is flat at y=0 for gravel, pan and drawer continuity.
  const points = [
    [-.018, 0, -.007], [-.005, 0, -.014], [.016, 0, -.008], [.020, 0, .005], [.008, 0, .013], [-.014, 0, .011],
    [-.015, .013, -.005], [-.004, .021, -.010], [.013, .017, -.005], [.018, .009, .005],
    [.006, NUGGET_HEIGHT, .008], [-.012, .012, .008],
  ];
  const faces = [
    [0,1,2,3,4,5], [6,11,10,7], [7,10,8], [8,10,9], [9,10,4,3], [10,11,5,4], [11,6,0,5],
    [6,7,1,0], [7,8,2,1], [8,9,3,2],
  ];
  const palette = ["#a85a12", "#ffe184", "#ffd04f", "#fff2a9", "#cd8a21", "#e5aa35", "#f9c951", "#b57520", "#eeb53c", "#ffd567"];
  const vertices: number[] = [];
  const colors: number[] = [];
  const center = new THREE.Vector3(0, .009, 0);
  faces.forEach((face, index) => {
    const color = new THREE.Color(palette[index]);
    for (let i = 1; i < face.length - 1; i++) {
      const triangle = [face[0], face[i], face[i + 1]].map(j => new THREE.Vector3(...points[j]));
      const [a,b,c] = triangle;
      if (b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().sub(center)) < 0) triangle.reverse();
      triangle.forEach(point => { vertices.push(point.x, point.y, point.z); colors.push(color.r, color.g, color.b); });
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 65, specular: "#ffe7a9" }));
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return { root, pinch: socket(root, "nuggetPinch", 0, .015, 0) };
}

export const SHOVEL_BREAK = .43;
export const SHOVEL_REST = .031;
const splinters = [.019, -.017, .007, -.026, .018, .005, -.011, .014];
function woodSection(parent: THREE.Group, from: number, to: number, roughFrom: boolean, roughTo: boolean, material: THREE.Material) {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const [y, rough] of [[from, roughFrom], [to, roughTo]] as const) {
    splinters.forEach((offset, i) => {
      const angle = i * Math.PI / 4;
      vertices.push(.022 * Math.cos(angle), y + (rough ? offset : 0), .022 * Math.sin(angle));
    });
  }
  splinters.forEach((_, i) => {
    const j = (i + 1) % 8;
    indices.push(i, i + 8, j, j, i + 8, j + 8);
  });
  for (let i = 1; i < 7; i++) indices.push(0, i, i + 1, 8, 9 + i, 8 + i);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.clearGroups();
  geometry.addGroup(0, 48, 0);
  geometry.addGroup(48, 36, 1);
  const mesh = new THREE.Mesh(geometry, [material, matte("#ddb27a")]);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
}

export function makeShovel(worn = false) {
  const root = new THREE.Group();
  const lower = new THREE.Group();
  const upper = new THREE.Group();
  upper.position.y = SHOVEL_BREAK;
  root.add(lower, upper);

  const steel = twoTone(new THREE.MeshPhongMaterial({
    color: worn ? "#485052" : "#8ca5b4", shininess: worn ? 18 : 58,
    specular: worn ? "#5a676e" : "#dbe6e8",
  }));
  const wood = matte(worn ? "#8c5837" : "#c88b49");
  const silhouette = new THREE.Shape();
  silhouette.moveTo(0, 0);
  silhouette.bezierCurveTo(-.026, .004, -.111, .065, -.112, .127);
  silhouette.lineTo(-.105, .251);
  silhouette.quadraticCurveTo(-.084, .273, 0, .257);
  silhouette.quadraticCurveTo(.084, .273, .105, .251);
  silhouette.lineTo(.112, .127);
  silhouette.bezierCurveTo(.111, .065, .026, .004, 0, 0);
  const bladeGeometry = new THREE.ExtrudeGeometry(silhouette, {
    depth: .008, bevelEnabled: true, bevelSize: .006, bevelThickness: .005, bevelSegments: 2, curveSegments: 12,
  });
  bladeGeometry.translate(0, .006, -.004);
  const positions = bladeGeometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    positions.setZ(i, positions.getZ(i) + .018 - .023 * (x / .116) ** 2 - .012 * (1 - y / .27) ** 2);
  }
  bladeGeometry.computeVertexNormals();
  const blade = new THREE.Mesh(bladeGeometry, steel);
  blade.castShadow = blade.receiveShadow = true;
  lower.add(blade);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.031, .037, .135, 12), steel);
  collar.position.set(0, .255, .006);
  lower.add(collar);
  const intact = new THREE.Group();
  root.add(intact);
  woodSection(intact, .265, 1.16, false, false, wood);
  if (worn) {
    woodSection(lower, .265, SHOVEL_BREAK, false, true, wood);
    woodSection(upper, 0, 1.16 - SHOVEL_BREAK, true, false, wood);
    const wear = matte("#746857");
    for (const [x, y, length] of [[-.055,.117,.044],[.035,.092,.032],[-.016,.193,.038],[.065,.16,.029]]) {
      const scuff = box(lower, [.0035, length, .0008], [x, y, .027 - .023 * (x / .116) ** 2 - .012 * (1 - y / .27) ** 2], wear);
      scuff.rotation.z = -.21;
    }
    const score = new THREE.Mesh(new THREE.TorusGeometry(.022, .002, 5, 16, Math.PI * 1.55), matte("#4a3024"));
    score.rotation.x = Math.PI / 2;
    score.position.y = SHOVEL_BREAK;
    intact.add(score);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.031, 12, 8), wood);
  knob.scale.y = .65;
  knob.position.y = 1.16 - SHOVEL_BREAK;
  upper.add(knob);
  const lowerGrip = socket(upper, "shaftGrip", 0, .69 - SHOVEL_BREAK, 0);
  const upperGrip = socket(upper, "endGrip", 0, 1.12 - SHOVEL_BREAK, 0);
  const bladeTouch = socket(lower, "bladeTopTouch", 0, .15, .028);
  const edge = socket(lower, "cuttingEdge", 0, 0, 0);
  const rest = socket(root, "tablePlane", 0, .48, -SHOVEL_REST);
  const setBroken = (broken: boolean) => {
    if (broken && !worn) throw new Error("Only the worn shovel can split");
    intact.visible = !broken;
    lower.children.forEach(child => {
      if (child instanceof THREE.Mesh && Array.isArray(child.material)) child.visible = broken;
    });
    upper.children.forEach(child => {
      if (child instanceof THREE.Mesh && Array.isArray(child.material)) child.visible = broken;
    });
    if (!broken) {
      upper.position.set(0, SHOVEL_BREAK, 0);
      upper.rotation.set(0, 0, 0);
    }
  };
  setBroken(false);
  return { root, lower, upper, lowerGrip, upperGrip, bladeTouch, edge, rest, setBroken };
}

export const DRAWER_TRAVEL = .34;
export const DRAWER_FLOOR = .014;
export function makeDrawer(wood: THREE.Material, dark: THREE.Material) {
  const root = new THREE.Group();
  const tray = new THREE.Group();
  root.add(tray);
  box(tray, [.46, DRAWER_FLOOR, .40], [0, DRAWER_FLOOR / 2, 0], dark);
  for (const x of [-.219, .219]) box(tray, [.022, .064, .40], [x, .046, 0], wood);
  box(tray, [.416, .064, .022], [0, .046, -.189], wood);
  box(tray, [.49, .098, .032], [0, .05, .20], wood);
  const pull = new THREE.Mesh(new THREE.TorusGeometry(.032, .006, 8, 20), matte("#806749"));
  pull.position.set(0, .047, .225);
  tray.add(pull);
  const grip = socket(tray, "drawerPull", 0, .021, .225);
  const landing = socket(tray, "drawerFloor", .048, DRAWER_FLOOR, .10);
  return {
    root, tray, grip, landing,
    setOpen: (amount: number) => { tray.position.z = THREE.MathUtils.clamp(amount, 0, 1) * DRAWER_TRAVEL; },
  };
}
