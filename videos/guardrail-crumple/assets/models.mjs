import * as THREE from 'three';

const palette = {
  asphalt: '#56546a', shoulder: '#ad8b69', grass: '#a3ac66', stone: '#8b625d',
  strata: '#b17d65', paint: '#f9673e', trim: '#382e43', rubber: '#252335',
  hub: '#aabac9', lamp: '#fff1ab', tail: '#ae293a', steel: '#96aab9',
  darkSteel: '#536474', yellow: '#ffcc53', white: '#f6e5bd', river: '#549caa',
};
const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) =>
  [key, new THREE.MeshStandardMaterial({color, roughness: 0.85})]));

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, materials[material]);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, material, size, position, bevel = 0) {
  if (!bevel) return mesh(parent, new THREE.BoxGeometry(...size), material, ...position);
  const [width, height, depth] = size;
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -y);
  shape.lineTo(x, -y);
  shape.lineTo(x, y);
  shape.lineTo(-x, y);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return mesh(parent, geometry, material, ...position);
}

// +Z is travel; +X is toward the drop. Straight approach, easing bend after z=5.
export function roadCenter(z) {
  return -(Math.max(0, z - 5) ** 2) / 130;
}

function surface(parent, material, rows) {
  const positions = [];
  const indices = [];
  for (const row of rows) positions.push(...row[0], ...row[1]);
  for (let row = 0; row < rows.length - 1; row++) {
    const i = row * 2;
    indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return mesh(parent, geometry, material);
}

export function createCliffRoad() {
  const root = new THREE.Group();
  const zValues = Array.from({length: 81}, (_, index) => index - 40);
  const strip = (material, from, to, y) => surface(root, material, zValues.map(z =>
    [[roadCenter(z) + from, y, z], [roadCenter(z) + to, y, z]]));
  strip('grass', -30, -3.35, -.025);
  strip('shoulder', -3.35, 3.65, -.018);
  strip('asphalt', -3, 3, 0);
  for (const x of [-2.78, 2.78]) strip('white', x, x + .065, .008);
  for (let z = -38; z < 39; z += 3.6) {
    surface(root, 'yellow', [z, z + 1.65].map(point =>
      [[roadCenter(point) - .055, .009, point], [roadCenter(point) + .055, .009, point]]));
  }
  const levels = [[3.65, -.018], [4.1, -1.4], [4.85, -3.2], [5.25, -5.2], [6.6, -9], [8.5, -14]];
  const wallPoint = (level, z) => {
    const [x, y] = levels[level];
    const irregularity = level ? .42 * Math.sin(z * .59 + level) + .18 * Math.cos(z * 1.9) : 0;
    return [roadCenter(z) + x + irregularity, y + irregularity * .45, z];
  };
  for (let level = 0; level < levels.length - 1; level++) {
    surface(root, level % 2 ? 'strata' : 'stone', zValues.map(z => [
      wallPoint(level, z), wallPoint(level + 1, z),
    ]));
  }
  box(root, 'river', [100, .4, 110], [33, -14.15, 0]);
  for (let i = 0; i < 37; i++) {
    const z = -38 + i * 2.1;
    const x = roadCenter(z) - 5.5 - 4 * (1 + Math.sin(i * 4.17));
    const tree = new THREE.Group();
    root.add(tree);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(.65 + (1 + Math.cos(i * 2.1)) * .35);
    mesh(tree, new THREE.CylinderGeometry(.07, .13, 1.35, 7), 'stone', 0, .67, 0);
    for (let tier = 0; tier < 3; tier++) {
      mesh(tree, new THREE.ConeGeometry(.7 - tier * .14, 1.1, 8), 'grass', 0, 1.15 + tier * .44, 0);
    }
  }
  return root;
}

export function createCar() {
  const root = new THREE.Group();
  const exterior = new THREE.Group();
  const interior = new THREE.Group();
  root.add(exterior, interior);
  box(exterior, 'paint', [1.86, .53, 3.7], [0, .63, 0], .15);
  box(exterior, 'paint', [1.48, .1, 1.19], [0, 1.45, -.17], .035);
  for (const x of [-.71, .71]) {
    for (const z of [-.64, .46]) {
      const pillar = box(exterior, 'paint', [.075, .72, .07], [x, 1.12, z], .025);
      pillar.rotation.x = z > 0 ? -.42 : .30;
    }
    box(exterior, 'paint', [.2, .13, .18], [x * 1.3, 1.04, .56], .035);
    box(exterior, 'trim', [.11, .035, .18], [x * 1.3, .91, -.23]);
    box(exterior, 'lamp', [.34, .16, .08], [x * .93, .7, 1.84], .025);
    box(exterior, 'tail', [.34, .14, .08], [x * .97, .7, -1.84], .025);
  }
  box(exterior, 'trim', [1.1, .11, .08], [0, .66, 1.87], .025);
  box(exterior, 'trim', [1.6, .15, .14], [0, .51, -1.88], .04);
  const glazing = new THREE.MeshStandardMaterial({
    color: '#9bd1df', roughness: .28, transparent: true, opacity: .22,
    depthWrite: false, side: THREE.DoubleSide,
  });
  for (const z of [-.64, .46]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.36, .68), glazing);
    pane.position.set(0, 1.12, z);
    pane.rotation.x = z > 0 ? -.42 : .30;
    pane.layers.set(3);
    exterior.add(pane);
  }
  const bumper = new THREE.Group();
  bumper.position.set(0, .52, 1.89);
  exterior.add(bumper);
  box(bumper, 'trim', [1.64, .17, .2], [0, 0, 0], .045);
  const wheels = [];
  const steeringPivots = [];
  for (const x of [-.9, .9]) {
    for (const z of [-1.19, 1.17]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, .345, z);
      root.add(pivot);
      const wheel = new THREE.Group();
      pivot.add(wheel);
      wheels.push(wheel);
      if (z > 0) steeringPivots.push(pivot);
      mesh(wheel, new THREE.CylinderGeometry(.345, .345, .24, 28), 'rubber').rotation.z = Math.PI / 2;
      mesh(wheel, new THREE.CylinderGeometry(.21, .21, .255, 20), 'hub').rotation.z = Math.PI / 2;
      box(wheel, 'trim', [.263, .08, .08], [0, 0, 0]);
    }
  }
  for (const x of [-.4, .4]) {
    box(interior, 'trim', [.54, .18, .51], [x, .88, -.22], .065);
    const back = box(interior, 'trim', [.52, .55, .13], [x, 1.09, -.44], .045);
    back.rotation.x = -.15;
  }
  box(interior, 'trim', [1.4, .18, .24], [0, 1, .49], .04);
  const steering = new THREE.Group();
  steering.position.set(-.4, 1.12, .37);
  interior.add(steering);
  mesh(steering, new THREE.TorusGeometry(.155, .025, 9, 24), 'trim');
  box(steering, 'hub', [.22, .025, .028], [0, 0, 0]);
  const belt = box(interior, 'white', [.054, .46, .025], [-.4, 1.085, -.21]);
  belt.rotation.z = -.67;
  belt.visible = false;
  return {root, exterior, interior, bumper, wheels, steeringPivots, steering, belt};
}

const profile = [[0, -.16], [-.04, -.13], [-.075, -.083], [-.025, -.026],
  [-.025, .026], [-.075, .083], [-.04, .13], [0, .16]];

export function createGuardrail({length = 28, curved = false} = {}) {
  const root = new THREE.Group();
  const posts = new THREE.Group();
  root.add(posts);
  const xAt = z => curved ? roadCenter(z) : 0;
  for (let z = 1; z < length; z += 1.9) {
    box(posts, 'darkSteel', [.13, .78, .15], [xAt(z) + .12, .39, z], .018);
    box(posts, 'darkSteel', [.21, .16, .19], [xAt(z) + .1, .67, z], .018);
  }
  const resolution = Math.ceil(length * 5);
  const detail = new THREE.BufferGeometry();
  // Allocate explicitly. The back profile adds visible sheet thickness at the inlet.
  detail.setAttribute('position', new THREE.BufferAttribute(new Float32Array((resolution + 1) * profile.length * 2 * 3), 3));
  const attribute = detail.getAttribute('position');
  const indices = [];
  for (let segment = 0; segment < resolution; segment++) {
    for (let point = 0; point < profile.length * 2; point++) {
      const width = profile.length * 2;
      const a = segment * width + point;
      const b = segment * width + (point + 1) % width;
      indices.push(a, b, a + width, b, b + width, a + width);
    }
  }
  detail.setIndex(indices);
  const beam = mesh(root, detail, 'steel');
  beam.material = materials.steel.clone();
  beam.material.side = THREE.DoubleSide;
  const section = [...profile, ...profile.slice().reverse().map(([x, y]) => [x + .025, y])];

  function setBeam({start = 0, flex = 0, contact = 8} = {}) {
    const from = THREE.MathUtils.clamp(start, 0, length - .01);
    for (let ring = 0; ring <= resolution; ring++) {
      const z = THREE.MathUtils.lerp(from, length, ring / resolution);
      const displacement = flex * Math.exp(-(((z - contact) / 2.0) ** 2));
      section.forEach(([x, y], point) => attribute.setXYZ(
        ring * section.length + point, xAt(z) + x + displacement, .68 + y, z,
      ));
    }
    attribute.needsUpdate = true;
    detail.computeVertexNormals();
    detail.computeBoundingSphere();
  }

  const oldEnd = box(root, 'steel', [.13, .34, .14], [0, .68, 0], .022);
  const head = new THREE.Group();
  root.add(head);
  box(head, 'yellow', [.54, .5, .15], [0, .64, -.13], .046);
  const face = box(head, 'trim', [.29, .047, .018], [0, .63, -.213]);
  face.rotation.z = -.63;
  const shell = box(head, 'steel', [.36, .35, .46], [0, .68, .15], .044);
  const cutaway = new THREE.Group();
  head.add(cutaway);
  box(cutaway, 'darkSteel', [.40, .065, .5], [0, .49, .14], .015);
  box(cutaway, 'darkSteel', [.065, .26, .47], [.17, .65, .14], .014);
  for (const y of [.55, .82]) {
    const guide = box(cutaway, 'yellow', [.29, .059, .36], [-.015, y, .14], .02);
    guide.rotation.y = .36;
  }

  function setTerminal({travel = 0, open = false, modern = true} = {}) {
    const distance = THREE.MathUtils.clamp(travel, 0, length - .6);
    head.visible = modern;
    oldEnd.visible = !modern;
    head.position.set(xAt(distance), 0, distance);
    shell.visible = !open;
    cutaway.visible = open;
    for (const support of posts.children) {
      support.visible = !modern || support.position.z > distance + .12;
    }
    setBeam({start: modern ? distance + .35 : 0});
  }

  setTerminal();
  return {root, posts, beam, head, oldEnd, setBeam, setTerminal};
}

export function createDischargedSteel() {
  const root = new THREE.Group();
  const segments = 52;
  const rows = Array.from({length: segments + 1}, () => [[0, 0, 0], [0, .24, 0]]);
  const strip = surface(root, 'steel', rows);
  strip.material = materials.steel.clone();
  strip.material.side = THREE.DoubleSide;
  const points = strip.geometry.getAttribute('position');

  function setLength(length) {
    root.visible = length > .01;
    for (let index = 0; index <= segments; index++) {
      const s = index / segments * Math.max(length, .01);
      const angle = s * 1.48;
      const radius = .52 + s * .15;
      const x = -.21 - Math.sin(angle) * radius;
      const z = .16 - radius * (1 - Math.cos(angle)) - s * .28;
      const y = .58 * Math.exp(-s * .72) + .035;
      points.setXYZ(index * 2, x, y, z);
      points.setXYZ(index * 2 + 1, x, y + .235, z);
    }
    points.needsUpdate = true;
    strip.geometry.computeVertexNormals();
    strip.geometry.computeBoundingSphere();
  }

  setLength(0);
  return {root, setLength};
}
