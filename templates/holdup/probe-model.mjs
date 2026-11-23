#!/usr/bin/env node
// Measure a hero model BEFORE placing cameras or characters (Vasa lesson: masts blocked shots, sailors stood outside
// the narrow bow, splashes sat under water). Prints: bbox, walkable deck heights, vertical obstacles (masts, posts),
// half-width along the length at given heights, and a summary of named parts.
// Usage (from templates/holdup/remotion, after npm ci):  node ../probe-model.mjs <file.glb> [--heights 6,9,12]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const THREE = await import(require.resolve('three'));
const {GLTFLoader} = await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));

const file = process.argv[2];
if (!file) { console.error('usage: node ../probe-model.mjs <file.glb> [--heights 6,9,12]'); process.exit(2); }
const hi = process.argv.indexOf('--heights');
const buf = fs.readFileSync(file);
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
const s = gltf.scene; s.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(s), size = box.getSize(new THREE.Vector3());
const f = (v) => v.toFixed(2);
console.log(`bbox x ${f(box.min.x)}..${f(box.max.x)}  y ${f(box.min.y)}..${f(box.max.y)}  z ${f(box.min.z)}..${f(box.max.z)}  (m)`);
const solid = [];
s.traverse((o) => { if (o.isMesh && ![].concat(o.material).some((m) => /sail|rope|cloth|flag/i.test(m.name))) solid.push(o); });
const rc = new THREE.Raycaster();
const hits = (o, d) => { rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); return rc.intersectObjects(solid, false); };
const long = size.z >= size.x ? 'z' : 'x', L0 = long === 'z' ? box.min.z : box.min.x, Ln = long === 'z' ? size.z : size.x;
const at = (u, v, w) => (long === 'z' ? [u, v, w] : [w, v, u]);

// 1. walkable surfaces: downward rays along the centre line, upward-facing hits, clustered by height
const decks = {};
for (let k = 1; k < 40; k++) {
  const w = L0 + Ln * k / 40;
  for (const h of hits(at(.3, box.max.y + 5, w), [0, -1, 0])) if (h.face && h.face.normal.y > .2) { const y = Math.round(h.point.y * 4) / 4; decks[y] = (decks[y] || 0) + 1; }
}
console.log('walkable decks (height: share of the length):', Object.entries(decks).filter(([, n]) => n >= 4).sort((a, b) => b[0] - a[0]).map(([y, n]) => `${y} m (${Math.round(n / 39 * 100)}%)`).join(', '));

// 2. vertical obstacles (masts, posts): horizontal rays across at 40 % height, narrow hits near the centre line
const yObs = box.min.y + .4 * size.y, obs = [];
for (let k = 0; k <= 200; k++) {
  const w = L0 + Ln * k / 200;
  const h = hits(at(box.min.x - 5, yObs, w).map((v, i) => (long === 'z' ? v : v)), long === 'z' ? [1, 0, 0] : [0, 0, 1])[0];
  if (h && Math.abs(long === 'z' ? h.point.x : h.point.z) < Math.max(1, .12 * (long === 'z' ? size.x : size.z))) obs.push(w);
}
const groups = []; for (const w of obs) { const g = groups.at(-1); if (g && w - g.at(-1) < Ln / 100 + .01) g.push(w); else groups.push([w]); }
console.log(`vertical obstacles at ${f(yObs)} m height (${long}):`, groups.map((g) => f((g[0] + g.at(-1)) / 2)).join(', ') || 'none');

// 3. half-width along the length at given heights (where characters can stand inside the hull/walls)
const H = hi > 0 ? process.argv[hi + 1].split(',').map(Number) : [box.min.y + .25 * size.y, box.min.y + .5 * size.y].map((v) => +v.toFixed(1));
for (const y of H) {
  const row = [];
  for (let k = 1; k < 10; k++) {
    const w = L0 + Ln * k / 10;
    const h = hits(at(box.min.x - 5, y, w), long === 'z' ? [1, 0, 0] : [0, 0, 1])[0];
    row.push(`${f(w)}:${h ? f(Math.abs(long === 'z' ? h.point.x : h.point.z)) : '-'}`);
  }
  console.log(`half-width at y=${y} (${long}:half-width)  ${row.join('  ')}`);
}

// 4. named parts summary (moving parts, sails, doors)
const named = {};
s.traverse((o) => { if (!o.name || o === s) return; const k = o.name.replace(/([_-]\d+)+$/, ''); if (o.parent && o.parent !== s && o.parent.name.replace(/([_-]\d+)+$/, '') === k) return; (named[k] ||= []).push(o); });
const parts = Object.entries(named).filter(([k, v]) => v.length > 1 || /lid|door|sail|hatch|oar|rudder|wheel|arm/i.test(k));
for (const [k, v] of parts.slice(0, 30)) {
  const b = new THREE.Box3(); v.forEach((o) => b.expandByObject(o));
  console.log(`part ${k} x${v.length}: y ${f(b.min.y)}..${f(b.max.y)}, ${long} ${f(long === 'z' ? b.min.z : b.min.x)}..${f(long === 'z' ? b.max.z : b.max.x)}`);
}
