// Toon pass on the Hold Up sedan (Car_Sedan.glb, original Hold Up asset first committed for phil-bathroom in 1e99cdc).
// The GLB is realistic: textured PBR paint, metallic trim and dark tinted glass. Here every material becomes a flat,
// matte MeshStandardMaterial from the Codex guardrail palette (models.mjs), textures are dropped, the glass is light
// and see-through, and the ink pass draws the outlines. Glass sits on the NOINK layer like the cabin car's glazing.
// Placement: root at ground under the car centre, nose +Z (the GLB faces -Z; it is turned 180 deg), length LENGTH m.
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {NOINK} from '../../../templates/bridge/ink';

export const LENGTH = 4.1;
const BUMPER_NARROW = .91; // 0.81 m -> 0.74 m half-width (GLB units): inside the side sheets' 0.72-0.77 m

// material index in the GLB -> toon colour (indices are stable; the GLB's materials are unnamed)
const TOON: Record<number, string> = {
  0: '#382e43',  // floorpan, dashboard
  1: '#463c52',  // carpet, door cards, console
  2: '#f9673e',  // body paint (same orange as the approved first stills)
  3: '#2f2838',  // window frames, intake, trims
  4: '#b9c6d2',  // chrome handles and surrounds
  5: '#536474',  // grille bars, vents
  6: '#f6e5bd',  // licence plate
  7: '#fff1ab',  // headlights
  8: '#ffb347',  // indicators
  9: '#c63848',  // taillights
  10: '#ffb347',
  11: '#d9c9a6', // headliner
  13: '#4a4058', // seats
  14: '#cbb27a', 15: '#cbb27a', 16: '#cbb27a', // gauges
  17: '#252335', // tyres
};
const GLASS = new THREE.MeshStandardMaterial({
  color: '#bfe3ee', roughness: .2, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide,
});

function pivotAtCentre(node: THREE.Object3D) {
  // The GLB bakes geometry in car space (no node transforms): wrap children in a pivot at their bounding-box centre.
  const centre = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
  node.worldToLocal(centre);
  const pivot = new THREE.Group();
  pivot.position.copy(centre);
  for (const child of [...node.children]) {
    child.position.sub(centre);
    pivot.add(child);
  }
  node.add(pivot);
  return pivot;
}

export type Sedan = {
  root: THREE.Group; body: THREE.Group; interior: THREE.Group;
  wheels: THREE.Object3D[]; steeringPivots: THREE.Object3D[]; steering: THREE.Object3D; bumper: THREE.Object3D;
  seat: THREE.Vector3; cushion: THREE.Box3; wheelCentre: THREE.Vector3; glass: THREE.Mesh[];
  /** half length to the front bumper face, half width, rear overhang, wheel radius (m, root space) */
  front: number; halfWidth: number; rear: number; wheelRadius: number;
  /** turn the steering wheel about its column (rad, + = clockwise as the driver sees it) */
  setSteer: (angle: number) => void;
  /** roll the wheels to a travelled distance (m) and steer the front ones (rad, + = toward +X) */
  setWheels: (distance: number, steer: number) => void;
};

export async function loadSedan(url: string): Promise<Sedan> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const palette = new Map<number, THREE.Material>();
  const parser = gltf.parser;
  const glass: THREE.Mesh[] = [];
  const meshes: THREE.Mesh[] = [];
  model.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const mesh of meshes) {
    const assoc = parser.associations.get(mesh.material as THREE.Material);
    const index = assoc?.materials ?? -1;
    if (index === 12) {
      mesh.material = GLASS;
      mesh.layers.set(NOINK);
      mesh.castShadow = false;
      glass.push(mesh);
      continue;
    }
    if (!palette.has(index)) {
      palette.set(index, new THREE.MeshStandardMaterial({
        color: TOON[index] ?? '#7a6f86', roughness: .85, metalness: 0, side: THREE.DoubleSide, // roof/bumper caps are single-sided in the GLB
        emissive: index === 7 ? '#5a4a20' : index === 9 ? '#300a0e' : '#000000',
      }));
    }
    mesh.material = palette.get(index)!;
    mesh.castShadow = mesh.receiveShadow = true;
  }

  // The bumpers are boxes 0.81 m out from centre, but the curved side sheets taper to 0.59-0.72 m at the nose and
  // tail, so the bumper ends poked out through the bodywork. Narrow both bumpers to sit inside the side sheets.
  for (const name of ['Front_Bumper', 'Rear_Bumper']) {
    const bumper = model.getObjectByName(name);
    if (bumper) bumper.scale.x *= BUMPER_NARROW;
  }
  // the taillight lenses reach 0.785 m, just past the side sheets' 0.77 m: tuck them in
  for (const name of ['Taillight_L', 'Taillight_R']) {
    model.getObjectByName(name)?.scale.multiply(new THREE.Vector3(.96, 1, 1));
  }

  // The side sheets also pinch 0.13 m inward over a last 0.1 m tip at the nose and tail. That tip has no thickness,
  // so the head/taillights stuck out past it and its open edge read as a flap. Fold each tip ring back onto the ring
  // behind it (matched by height order), so every sheet ends flush with the lights and the bumper wraps the corner.
  const caps: [THREE.Object3D, THREE.Mesh][] = [];
  for (const name of ['Driver_Body', 'Passenger_Body']) {
    model.getObjectByName(name)?.traverse(o => {
      const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!geo) return;
      const pos = geo.getAttribute('position');
      for (const end of [-1, 1]) {
        const ring = (lo: number, hi: number) => {
          const ids: number[] = [];
          for (let i = 0; i < pos.count; i++) {
            const z = pos.getZ(i) * end;
            if (z > lo && z <= hi) ids.push(i);
          }
          const ys = [...new Set(ids.map(i => +pos.getY(i).toFixed(3)))].sort((p, q) => p - q);
          return {ids, ys};
        };
        const tip = ring(2.3, 9), prev = ring(2.2, 2.3);
        if (!tip.ys.length || tip.ys.length !== prev.ys.length) continue;
        const target = new Map<number, number>(); // tip height -> a vertex index of the ring behind
        tip.ys.forEach((y, k) => target.set(y, prev.ids.find(i => +pos.getY(i).toFixed(3) === prev.ys[k])!));
        for (const i of tip.ids) {
          const j = target.get(+pos.getY(i).toFixed(3))!;
          pos.setXYZ(i, pos.getX(j), pos.getY(j), pos.getZ(j));
        }
        // close the open sheet end below the lights with a plate behind the bumper (hides the gap at the corner)
        const [b0, b1] = prev.ys.slice(0, 2).map(y => prev.ids.find(i => +pos.getY(i).toFixed(3) === y)!);
        const z = pos.getZ(b0), side = Math.sign(pos.getX(b0));
        const plate = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pos.getX(b0), pos.getY(b0), z), new THREE.Vector3(pos.getX(b1), pos.getY(b1), z),
          new THREE.Vector3(side * .5, pos.getY(b1), z), new THREE.Vector3(side * .5, pos.getY(b0), z),
        ]);
        plate.setIndex([0, 1, 2, 0, 2, 3]);
        plate.computeVertexNormals();
        const cap = new THREE.Mesh(plate, (o as THREE.Mesh).material);
        cap.name = 'Sheet_End_Plate';
        caps.push([o, cap]); // the plate shares the sheet's (identity) node space
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    });
  }
  for (const [parent, cap] of caps) { cap.castShadow = cap.receiveShadow = true; parent.add(cap); }

  const body = new THREE.Group();
  body.add(model);
  model.rotation.y = Math.PI;
  const size = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
  model.scale.setScalar(LENGTH / size.z);
  body.updateMatrixWorld(true);
  const floor = new THREE.Box3().setFromObject(body).min.y;
  model.position.y -= floor;
  body.updateMatrixWorld(true);

  const root = new THREE.Group();
  const interior = new THREE.Group();
  root.add(body, interior);
  const get = (name: string) => model.getObjectByName(name)!;
  const wheels = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'].map(n => pivotAtCentre(get(n)));
  const steering = pivotAtCentre(get('Steering_Wheel'));
  const bumper = get('Front_Bumper');
  root.updateMatrixWorld(true);
  const seat = get('Driver_Seat_Anchor').getWorldPosition(new THREE.Vector3());
  const cushion = new THREE.Box3().setFromObject(get('Driver_Seat').getObjectByName('Seat_Cushion')!);
  const wheelCentre = steering.getWorldPosition(new THREE.Vector3());
  // front wheels sit at +Z after the turn
  const steeringPivots = wheels.filter(w => w.getWorldPosition(new THREE.Vector3()).z > 0);
  const box = new THREE.Box3().setFromObject(body);
  const wheelBox = new THREE.Box3().setFromObject(wheels[0]);
  const wheelRadius = (wheelBox.max.y - wheelBox.min.y) / 2;
  // steering column axis = normal of the rim (smallest spread of the rim's vertices), in the pivot's parent space
  const rimPts: THREE.Vector3[] = [];
  steering.traverse(o => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g) return;
    const a = g.getAttribute('position');
    for (let i = 0; i < a.count; i += 3) rimPts.push(new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld));
  });
  const mean = rimPts.reduce((m, p) => m.add(p), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, rimPts.length));
  const cov = [0, 0, 0, 0, 0, 0]; // xx yy zz xy xz yz
  for (const p of rimPts) {
    const d = p.clone().sub(mean);
    cov[0] += d.x * d.x; cov[1] += d.y * d.y; cov[2] += d.z * d.z; cov[3] += d.x * d.y; cov[4] += d.x * d.z; cov[5] += d.y * d.z;
  }
  // smallest eigenvector by inverse power iteration on (C + eps I)
  const C = new THREE.Matrix3().set(cov[0], cov[3], cov[4], cov[3], cov[1], cov[5], cov[4], cov[5], cov[2]);
  const inv = C.clone().invert();
  let axis = new THREE.Vector3(0, .3, 1).normalize();
  for (let k = 0; k < 30; k++) axis.applyMatrix3(inv).normalize();
  if (axis.z < 0) axis.negate(); // world column axis, pointing to the front of the car
  const parentQ = steering.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
  const localAxis = axis.clone().applyQuaternion(parentQ).normalize();
  const steerQ = new THREE.Quaternion();
  const setSteer = (angle: number) => { steering.quaternion.copy(steerQ.setFromAxisAngle(localAxis, angle)); };
  for (const w of wheels) w.rotation.order = 'YXZ';
  const setWheels = (distance: number, steer: number) => {
    // the model is turned 180 deg: local +X is world -X, so a forward roll is a negative local X rotation
    for (const w of wheels) w.rotation.x = -distance / wheelRadius;
    for (const w of steeringPivots) w.rotation.y = steer;
  };
  return {root, body, interior, wheels, steeringPivots, steering, bumper, seat, cushion, wheelCentre, glass,
    front: box.max.z, halfWidth: box.max.x, rear: -box.min.z, wheelRadius, setSteer, setWheels};
}
