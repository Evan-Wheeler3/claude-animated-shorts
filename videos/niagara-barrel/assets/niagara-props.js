// Niagara Barrel props: the generic props now live in the shared library assets/props/holdup-props.js (single source,
// promoted during the 2026-11-17 fix pass). This file re-exports them so the Codex handoff paths keep working, and
// keeps the one story-specific piece (the superseded falls blockout).
import * as THREE from 'three';
import { mat } from '../../../assets/props/holdup-props.js';
export * from '../../../assets/props/holdup-props.js';

function mesh(g, m, p = [0, 0, 0], r = [0, 0, 0]) { const x = new THREE.Mesh(g, m); x.position.set(...p); x.rotation.set(...r); x.castShadow = true; x.receiveShadow = true; return x; }

// ---------------- layout blockout (superseded) ----------------
/** Original rectangular layout blockout, kept for reference only. The real Horseshoe Falls environment (curved lip,
 *  curtain, bowl, gorge, mist) is built in src/videos/niagara/falls.ts. */
export function createFallsScaffold() {
  const g = new THREE.Group(); g.name = 'Horseshoe Falls layout scaffold (blockout only)';
  const cliff = mat('cliff', '#687b73'), edge = mat('edge', '#9ca89b'), water = mat('water', '#3d91b2');
  g.add(mesh(new THREE.BoxGeometry(28, 9, 3), cliff, [0, -4.5, 1.5]));
  g.add(mesh(new THREE.BoxGeometry(28, 0.45, 3.5), edge, [0, 0.02, 1.4]));
  g.add(mesh(new THREE.PlaneGeometry(28, 45), water, [0, 0.27, -22], [-Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.PlaneGeometry(28, 9), water, [0, -4.4, 3.1]));
  g.add(mesh(new THREE.PlaneGeometry(28, 25), water, [0, -9, 15], [-Math.PI / 2, 0, 0]));
  g.userData = { lipZ: 3.1, lipY: 0.25, dropY: -9, notes: 'Blockout only; see src/videos/niagara/falls.ts' };
  return g;
}

