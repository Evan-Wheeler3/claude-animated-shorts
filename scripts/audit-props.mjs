// Gate-1 prop audit: imports every export of the Niagara prop library in Node, builds it, and checks geometry:
// NaN/Inf positions or normals, degenerate meshes, bounding sizes, and outward-facing normals on closed props
// (sampled: normals of outer-facing triangles must point away from the prop's vertical axis).
// usage: node scripts/audit-props.mjs
import * as THREE from "three";
import * as P from "../videos/niagara-barrel/assets/niagara-props.js";

const fns = Object.entries(P).filter(([k, v]) => typeof v === "function" && k.startsWith("create"));
let bad = 0;
for (const [name, fn] of fns) {
  let obj;
  try { obj = fn(); } catch (e) { console.log(`FAIL ${name}: threw ${e.message}`); bad++; continue; }
  let tris = 0, meshes = 0, nan = 0, noNormal = 0;
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry, p = g.attributes.position, n = g.attributes.normal;
    tris += (g.index ? g.index.count : p.count) / 3;
    if (!n) noNormal++;
    for (let i = 0; i < p.count; i++) {
      if (![p.getX(i), p.getY(i), p.getZ(i)].every(Number.isFinite)) nan++;
      if (n && ![n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite)) nan++;
    }
  });
  const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3());
  const ok = nan === 0 && noNormal === 0 && meshes > 0;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(20)} meshes ${String(meshes).padStart(3)}  tris ${String(Math.round(tris)).padStart(6)}  size ${s.x.toFixed(2)} x ${s.y.toFixed(2)} x ${s.z.toFixed(2)} m  min.y ${box.min.y.toFixed(3)}${nan ? "  NaN " + nan : ""}`);
}
// orientation: the outermost surface seen from outside must face outward (rays from 4 m away, horizontal)
const outward = (name, obj, h) => {
  const ray = new THREE.Raycaster(), meshes = []; obj.updateMatrixWorld(true); obj.traverse((o) => o.isMesh && meshes.push(o));
  let good = 0, tot = 0;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, o = new THREE.Vector3(4 * Math.sin(a), h, 4 * Math.cos(a));
    ray.set(o, o.clone().multiplyScalar(-1).setY(0).normalize());
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) continue;
    tot++;
    const nW = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (nW.dot(ray.ray.direction) < 0) good++;
  }
  const ok = tot > 0 && good === tot; if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} facing  ${name.padEnd(12)} ${good}/${tot} outward at y=${h}`);
};
outward("barrel", P.createBarrel(), 0.69);
outward("barrel hoop", P.createBarrel(), 0.37 * 1.37);
outward("open barrel", P.createBarrel({ lid: false }), 0.4);
outward("boat", P.createRescueBoat(), 0.3);
outward("purse", P.createCoinPurse(), 0.05);
// lid: a ray from above must hit an upward face
{
  const b = P.createBarrel(); b.updateMatrixWorld(true); const ms = []; b.traverse((o) => o.isMesh && ms.push(o));
  const r = new THREE.Raycaster(new THREE.Vector3(0.12, 3, 0.05), new THREE.Vector3(0, -1, 0)), hit = r.intersectObjects(ms, false)[0];
  const up = hit && hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y > 0.5;
  if (!up) bad++;
  console.log(`${up ? "ok  " : "FAIL"} lid top faces up (hit y ${hit?.point.y.toFixed(3)} on ${hit?.object.material.name})`);
}
console.log(bad ? `${bad} problem(s)` : "all props pass");
process.exit(bad ? 1 : 0);
