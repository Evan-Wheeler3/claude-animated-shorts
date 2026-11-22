// Toon pass on the Hold Up sedan (Car_Sedan.glb, original Hold Up asset first committed for phil-bathroom in 1e99cdc).
// The GLB is realistic: textured PBR paint, metallic trim and dark tinted glass. Here every material becomes a flat,
// matte MeshStandardMaterial from the Codex guardrail palette (models.mjs), textures are dropped, the glass is light
// and see-through, and the ink pass draws the outlines. Glass sits on the NOINK layer like the cabin car's glazing.
// Placement: root at ground under the car centre, nose +Z (the GLB faces -Z; it is turned 180 deg), length LENGTH m.
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {NOINK} from '../../../templates/bridge/ink';

export const LENGTH = 4.1;

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
  return {root, body, interior, wheels, steeringPivots, steering, bumper, seat, cushion, wheelCentre, glass};
}
