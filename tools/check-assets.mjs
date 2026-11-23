#!/usr/bin/env node
// Hold Up asset checker. No dependencies (Node 18+).
//
// Checks every GLB listed in videos/<story-id>/assets/assets.json against the brief:
// valid self-contained GLB 2.0, real-world size in metres, pivot, up axis, triangle budget,
// required material names and licence/provenance. Exits 1 if anything fails.
//
// Usage: node tools/check-assets.mjs videos/<story-id>/assets/assets.json
//
// This checks the mechanics only. It does not judge looks: Claude accepts or rejects each asset
// from in-engine renders (see PRODUCTION-PIPELINE.md, stage 3).

import fs from 'node:fs';
import path from 'node:path';

const LICENSES = ['CC0-1.0', 'CC-BY-4.0', 'original'];
const PIVOTS = ['bottom-center', 'center'];

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('usage: node tools/check-assets.mjs videos/<story-id>/assets/assets.json');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const baseDir = path.dirname(manifestPath);

// ---------- GLB parsing ----------
function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB file (bad magic)');
  if (buf.readUInt32LE(4) !== 2) throw new Error(`GLB version ${buf.readUInt32LE(4)}, need 2`);
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = chunk;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin, bytes: buf.length };
}

const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) { // column-major 4x4
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const apply = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

function analyse(gltf) {
  const j = gltf.json;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let tris = 0, meshNodes = 0;
  const sceneIdx = j.scene ?? 0;
  const roots = j.scenes?.[sceneIdx]?.nodes ?? [];
  const visit = (ni, parent) => {
    const n = j.nodes[ni];
    const m = mul(parent, trs(n));
    if (n.mesh !== undefined) {
      meshNodes++;
      for (const p of j.meshes[n.mesh].primitives) {
        const pos = j.accessors[p.attributes.POSITION];
        if (!pos?.min || !pos?.max) throw new Error('POSITION accessor without min/max');
        for (let i = 0; i < 8; i++) {
          const v = apply(m, [i & 1 ? pos.max[0] : pos.min[0], i & 2 ? pos.max[1] : pos.min[1], i & 4 ? pos.max[2] : pos.min[2]]);
          for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], v[a]); max[a] = Math.max(max[a], v[a]); }
        }
        const mode = p.mode ?? 4;
        const count = p.indices !== undefined ? j.accessors[p.indices].count : pos.count;
        if (mode === 4) tris += count / 3;
        else if (mode === 5 || mode === 6) tris += Math.max(0, count - 2);
      }
    }
    for (const c of n.children || []) visit(c, m);
  };
  roots.forEach((r) => visit(r, I4()));
  return {
    min, max, size: max.map((v, a) => v - min[a]), tris: Math.round(tris), meshNodes,
    materials: (j.materials || []).map((m) => m.name || ''),
    images: (j.images || []).length,
    externalUris: [...(j.buffers || []), ...(j.images || [])].filter((x) => x.uri && !x.uri.startsWith('data:')).map((x) => x.uri),
    required: j.extensionsRequired || [],
    cameras: (j.cameras || []).length,
    lights: (j.extensions?.KHR_lights_punctual?.lights || []).length,
  };
}

// ---------- checks ----------
const f2 = (n) => n.toFixed(2);
let failed = 0;
const rows = [];

for (const a of manifest.assets || []) {
  const fails = [], warns = [], info = [];
  const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
  try {
    for (const k of ['id', 'file', 'size_m', 'pivot', 'max_tris', 'license']) if (a[k] === undefined) fail(`manifest field "${k}" missing`);
    if (a.license && !LICENSES.includes(a.license)) fail(`licence "${a.license}" not allowed (${LICENSES.join(', ')})`);
    if (a.license && a.license !== 'original' && !a.source) fail('source URL required for a sourced asset');
    if (a.license === 'CC-BY-4.0' && !a.credit) fail('CC-BY-4.0 needs a "credit" line');
    if (a.pivot && !PIVOTS.includes(a.pivot)) fail(`pivot "${a.pivot}" must be one of ${PIVOTS.join(', ')}`);

    const file = path.join(baseDir, a.file || '');
    if (!a.file || !fs.existsSync(file)) throw new Error(`file not found: ${file}`);
    if (!file.toLowerCase().endsWith('.glb')) fail('must be a .glb file');
    const g = readGlb(file);
    const r = analyse(g);
    const mb = g.bytes / 1e6;
    info.push(`size ${r.size.map(f2).join(' x ')} m`, `${r.tris} tris`, `${mb.toFixed(1)} MB`, `materials [${r.materials.join(', ')}]`);

    if (r.meshNodes === 0) fail('no mesh in the default scene');
    if (r.externalUris.length) fail(`not self-contained, external files: ${r.externalUris.join(', ')}`);
    const compressed = r.required.filter((e) => /draco|meshopt|basisu|ktx/i.test(e));
    if (compressed.length) fail(`compressed (${compressed.join(', ')}); deliver uncompressed GLB`);
    if (mb > (a.max_mb ?? 15)) fail(`${mb.toFixed(1)} MB > ${a.max_mb ?? 15} MB`);
    if (r.cameras || r.lights) warn(`file contains ${r.cameras} camera(s) / ${r.lights} light(s); they will be ignored`);

    // size + axes
    if (Array.isArray(a.size_m) && a.size_m.length === 3 && r.meshNodes) {
      const tol = a.size_tolerance ?? 0.15;
      const off = a.size_m.map((t, i) => (t > 0 ? Math.abs(r.size[i] - t) / t : 0));
      if (off.some((o) => o > tol)) {
        const sortedA = [...r.size].sort((x, y) => x - y), sortedT = [...a.size_m].sort((x, y) => x - y);
        const sameShape = sortedT.every((t, i) => t <= 0 || Math.abs(sortedA[i] - t) / t <= tol);
        const ratio = r.size[1] / (a.size_m[1] || 1);
        fail(`size ${r.size.map(f2).join(' x ')} m vs target ${a.size_m.map(f2).join(' x ')} m (±${tol * 100}%)` +
          (sameShape ? ' — right dimensions on the wrong axes: check +Y up / -Z forward' :
            ratio > 50 ? ' — looks like centimetres, export in metres' : ''));
      }
    }
    // pivot
    if (r.meshNodes && PIVOTS.includes(a.pivot)) {
      const ext = r.size.map((s) => Math.max(s, 1e-6));
      const cen = r.min.map((m, i) => (m + r.max[i]) / 2);
      const xzOff = Math.max(Math.abs(cen[0]) / ext[0], Math.abs(cen[2]) / ext[2]);
      if (xzOff > 0.05) fail(`pivot is off-centre in X/Z by ${(xzOff * 100).toFixed(0)}% of the width (bbox centre ${cen.map(f2).join(', ')})`);
      if (a.pivot === 'bottom-center' && Math.abs(r.min[1]) / ext[1] > 0.02) fail(`pivot not at the base: lowest point is y = ${f2(r.min[1])} m, need 0`);
      if (a.pivot === 'center' && Math.abs(cen[1]) / ext[1] > 0.05) fail(`pivot not at the centre: bbox centre y = ${f2(cen[1])} m`);
    }
    // budget
    if (typeof a.max_tris === 'number' && r.tris > a.max_tris) fail(`${r.tris} tris > budget ${a.max_tris}`);
    // materials
    for (const want of a.materials || []) {
      if (!r.materials.some((m) => m.toLowerCase().includes(want.toLowerCase()))) fail(`no material named like "${want}"`);
    }
  } catch (e) {
    fail(e.message);
  }
  if (fails.length) failed++;
  rows.push({ id: a.id ?? '(no id)', ok: !fails.length, fails, warns, info });
}

if (!rows.length) { console.error('assets.json lists no assets'); process.exit(1); }
for (const r of rows) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.info.join(' | ')}`);
  for (const m of r.fails) console.log(`      ✗ ${m}`);
  for (const m of r.warns) console.log(`      ! ${m}`);
}
console.log(`\n${rows.length - failed}/${rows.length} assets pass mechanical checks.` +
  (failed ? '' : ' Visual acceptance still happens in-engine (Claude, stage 3).'));
process.exit(failed ? 1 : 0);
