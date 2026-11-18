import * as THREE from "three";
import { bed, beamHD, planksHD, rng, water } from "../../../templates/bridge/paint";
import { NOINK } from "../../../templates/bridge/ink";
import { box, makeDrawer, makePan, makeShovel, matte, socket } from "./props";

export const COUNTER_TOP = .97;

export function makeShop() {
  const root = new THREE.Group();
  const timber = matte("#ffffff", beamHD());
  const counter = matte("#fff3d7", planksHD());
  const plank = matte("#b38564", planksHD());
  const back = matte("#b9907c", planksHD());
  const trim = matte("#684030", beamHD());
  box(root, [8, .12, 9], [0, -.06, 0], plank);
  // Board-and-batten room, with an actual open threshold and a second room beyond it.
  box(root, [4.3, 3.1, .16], [1.15, 1.55, -2.2], back);
  box(root, [2.2, 3.1, .16], [-3.24, 1.55, -2.2], back);
  box(root, [1.15, 1.02, .16], [-1.57, 2.59, -2.2], back);
  for (const x of [-2.19, -.98]) box(root, [.12, 2.18, .23], [x, 1.09, -2.19], trim);
  box(root, [1.34, .16, .24], [-1.57, 2.13, -2.19], timber);
  box(root, [1.28, .035, .42], [-1.57, .018, -2.2], timber);
  box(root, [2.1, 3.2, .16], [-1.55, 1.60, -4.35], matte("#839e92"));
  box(root, [.12, 3.1, 4.4], [3.25, 1.55, -2.15], back);
  for (const x of [-3.4, -.83, 1.18, 3.13]) box(root, [.085, 3.1, .13], [x, 1.55, -2.10], trim);

  for (const y of [.60, 1.04, 1.49, 1.92]) {
    box(root, [1.46, .055, .47], [1.12, y, -1.91], timber);
  }
  for (const x of [.39, 1.85]) box(root, [.055, 1.5, .47], [x, 1.22, -1.91], trim);
  const panRack = new THREE.Group();
  root.add(panRack);
  for (const y of [1.13, 1.58, 2.01]) {
    for (const x of [.67, 1.16, 1.62]) {
      const pan = makePan();
      pan.root.rotation.x = 1.24;
      pan.root.position.set(x, y + .115, -1.78);
      panRack.add(pan.root);
    }
  }
  const crate = box(root, [.48, .34, .40], [1.48, .18, -1.62], timber);
  crate.name = "inventoryCrate";
  box(root, [.42, .23, .32], [.84, .17, -1.65], trim);
  for (const x of [2.14, 2.39, 2.64]) {
    const shovel = makeShovel();
    shovel.root.position.set(x, .02, -1.79);
    shovel.root.rotation.x = -.16;
    root.add(shovel.root);
  }

  const counterDeck = box(root, [2.03, .085, .57], [-.08, COUNTER_TOP - .0425, .04], counter);
  counterDeck.name = "counterDeck";
  for (const x of [-1.00, .81]) {
    for (const z of [-.19, .27]) {
      if (x > 0 && z > 0) continue;
      box(root, [.095, .885, .09], [x, .4425, z], trim);
    }
  }
  box(root, [1.84, .43, .075], [-.09, .48, .24], timber);
  // Drawer opens into the cashier-side return. The front clears its housing at full travel.
  const drawer = makeDrawer(timber, matte("#8e603d"));
  drawer.root.position.set(.67, .742, .097);
  root.add(drawer.root);
  box(root, [.53, .107, .43], [.67, .684, .066], trim);
  const counterSurface = socket(root, "counterSurface", 0, COUNTER_TOP, 0);
  const ledger = box(root, [.26, .035, .18], [-.83, COUNTER_TOP + .0175, -.14], matte("#70423a"));
  box(root, [.244, .022, .171], [-.831, COUNTER_TOP + .018, -.132], matte("#dbc7a5"));
  ledger.name = "ledger";
  return { root, drawer, counterSurface, panRack };
}

const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
export function makePebble(size: number, material: THREE.Material, stretch = 1) {
  const rock = new THREE.Mesh(rockGeometry, material);
  rock.scale.set(size * stretch, size * .55, size * .78);
  rock.castShadow = rock.receiveShadow = true;
  return rock;
}

export const BAR_TOP = 0;
export const WATER_TOP = -.075;
export function makeCreek() {
  const root = new THREE.Group();
  const random = rng(1849);
  const gravel = matte("#ffffff", bed());
  const bank = matte("#c6ab7d", bed());
  const mud = matte("#90704e");
  const stones = ["#948579", "#ac9b84", "#776e65", "#a69986", "#8e8e80"].map(color => matte(color));
  box(root, [35, .18, 32], [0, -.33, 0], gravel);
  const waterMap = water().clone();
  waterMap.wrapS = waterMap.wrapT = THREE.RepeatWrapping;
  waterMap.repeat.set(4, 2);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(33, 17),
    new THREE.MeshPhongMaterial({ color: "#a2e4d6", map: waterMap, transparent: true, opacity: .64, depthWrite: false,
      specular: "#c9ece0", shininess: 55 }));
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(0, WATER_TOP, -5.2);
  stream.layers.set(NOINK);
  root.add(stream);
  const shore = new THREE.Shape();
  shore.moveTo(-8, 4);
  shore.lineTo(-6.5, -.8);
  shore.bezierCurveTo(-4.7, -.78, -4.9, -2.3, -2.7, -2.0);
  shore.bezierCurveTo(-1.2, -1.9, -1.8, -.78, -.3, -.75);
  shore.bezierCurveTo(1.2, -.8, 1.6, -.26, 1.95, .9);
  shore.lineTo(7, 4);
  shore.lineTo(7, 7);
  shore.lineTo(-8, 7);
  shore.closePath();
  const gravelBar = new THREE.Mesh(new THREE.ExtrudeGeometry(shore, { depth: .08, bevelEnabled: true, bevelSize: .13, bevelThickness: .045, bevelSegments: 2 }), bank);
  gravelBar.rotation.x = Math.PI / 2;
  gravelBar.position.y = -.045;
  gravelBar.receiveShadow = true;
  root.add(gravelBar);
  for (let i = 0; i < 115; i++) {
    const x = (random() - .5) * 11;
    const z = random() * 4.2 - .55;
    if (z < Math.max(0, x - .6) * .57 - .4) continue;
    const s = .037 + random() ** 3 * .22;
    const rock = makePebble(s, stones[i % stones.length], .9 + random() * .55);
    rock.rotation.y = random() * 6;
    rock.position.set(x, .014 - s * .16, z);
    root.add(rock);
  }
  for (let i = 0; i < 16; i++) {
    const rock = makePebble(.22 + random() * .24, stones[i % stones.length], 1.6);
    rock.position.set(-8 + i * 1.1, -.15, -2.2 - random() * 5.7);
    root.add(rock);
  }

  // Distant foothills and sparse oak shapes keep the working bank legible.
  const hills = ["#89a898", "#94ae97", "#a5b492", "#779780"].map(color => matte(color));
  for (let i = 0; i < 8; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), hills[i % hills.length]);
    hill.scale.set(5 + random() * 4, 2.2 + random() * 3.3, 3.5);
    hill.position.set(-18 + i * 5.6, -1, -12 - random() * 7);
    root.add(hill);
  }
  const leaves = ["#78904d", "#637842", "#98a558"].map(color => matte(color));
  for (let i = 0; i < 11; i++) {
    const tree = new THREE.Group();
    const x = -12 + i * 2.4;
    const z = -10 - random() * 3;
    const height = .85 + random() * .85;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.055, .10, height, 8), mud);
    trunk.position.y = height * .48;
    tree.add(trunk);
    for (let j = 0; j < 4; j++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.67, 1), leaves[j % leaves.length]);
      crown.scale.set(1, .68, .78);
      crown.position.set((j - 1.5) * .27, height + (j % 2) * .29, (random() - .5) * .38);
      tree.add(crown);
    }
    tree.position.set(x, -.21, z);
    root.add(tree);
  }
  return { root, stream, barSurface: socket(root, "barSurface", 0, BAR_TOP, .8), setFlow: (seconds: number) => {
    waterMap.offset.x = seconds * -.075;
  } };
}
