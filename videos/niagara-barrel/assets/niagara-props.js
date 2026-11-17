// Original reusable procedural Three.js props for the Hold Up short "Niagara Barrel".
// Pure geometry + plain named MeshStandardMaterials: no textures, no external files, THREE r150+.
// Units: metres, Y up. Every material carries a `name` (oak, oakDark, iron, rope, ...) so a renderer can swap in its
// own look: the Remotion scene (src/videos/niagara/props3d.ts) converts each one to the two-tone toon Lambert and adds
// painted wood grain by name. UVs: staves / planks run u across the grain, v along it (metres / 1).
//
// Gate-1 audit (2026-11-17) of the first scaffold, all fixed here:
//  - barrel was 0.92 m tall; Annie Edson Taylor's barrel was about 4.5 ft (1.37 m) tall and 3 ft (0.91 m) across.
//    Rebuilt to that size with 22 solid staves (outer + inner face, end grain, joints), a bulged bilge, recessed
//    lid boards, six flat iron hoops with rivets, lid bolts and an air hatch. The old one-sided 3-row staves had
//    facet seams, mutated shared materials (side = DoubleSide on the module material) and hoops that clipped the
//    staves near the chimes.
//  - rowboat "cavity" was a convex dome on top of a closed egg (no inside). Now an open lapstrake hull with an
//    inner skin, gunwales, transom, keel, thwarts, oarlocks and oars.
//  - rocks: one material per rock, plain icosahedra. Now noise-displaced boulders sharing three materials.
//  - falls scaffold: rectangular wall. Kept only as a layout blockout; the real Horseshoe Falls environment is
//    src/videos/niagara/falls.ts (curved lip, curtain, bowl, gorge, mist).
//  - coin purse was a ball; now an empty, slumped drawstring pouch with gathers and cords. Coins got rims.
//  - cat stand-in: the film's cat is a 2D toon card (src/videos/niagara/toon.ts `cat`) like every character; the 3D
//    stand-in is kept, cleaned up (tube tail, legs, muzzle) for blocking only.
//  - new supporting props: rope coil, hammer, anvil (ballast), timber dock, iron railing, lamp post, foam mound.
// Origins: every prop sits on y = 0 at its base centre unless noted. Bows / fronts point +Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------- materials (named, cached per colour) ----------------
export const PALETTE = {
  oak: '#b07a45', oakLight: '#c48d55', oakDark: '#7b4b28', endGrain: '#d9b07c', iron: '#3b4048', ironLight: '#5d6470',
  rope: '#c9a66b', leather: '#7e4a33', cord: '#d8b67a', gold: '#e2b743', paint: '#e9e2d0', boatRed: '#a8473a',
  rock: '#8a8577', rockDark: '#6c6a63', rockLight: '#a39e8f', fur: '#e38b3a', furDark: '#3c2e30', foam: '#f4f8fb', cushion: '#9b3b3b',
};
const _mats = new Map();
/** shared named material (never mutate the result; ask for another name instead) */
export function mat(name, color = PALETTE[name] ?? name, extra = {}) {
  const key = name + '|' + color + '|' + JSON.stringify(extra);
  let m = _mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra }); m.name = name; _mats.set(key, m); }
  return m;
}
function mesh(g, m, p = [0, 0, 0], r = [0, 0, 0]) {
  const x = new THREE.Mesh(g, m); x.position.set(...p); x.rotation.set(...r); x.castShadow = true; x.receiveShadow = true; return x;
}
/** deterministic random in [0,1) */
export function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/** indexed grid surface: fn(u, v) -> [x, y, z] for u, v in [0, 1]; smooth normals inside the strip, hard edges
 *  between strips (clean toon creases). Normal = dP/dv x dP/du, `flip` reverses it. uv = (u * su, v * sv). */
export function surface(nu, nv, fn, { flip = false, su = 1, sv = 1 } = {}) {
  const pos = [], uv = [], idx = [], W = nu + 1;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = fn(i / nu, j / nv); pos.push(p[0], p[1], p[2]); uv.push((i / nu) * su, (j / nv) * sv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- the barrel ----------------
export const BARREL = { H: 1.37, RB: 0.46, RH: 0.37, T: 0.032, STAVES: 22 };
/** radius of the barrel's outside at height y (0 = bottom): parabolic bilge */
export const barrelR = (y, B = BARREL) => { const s = (y - B.H / 2) / (B.H / 2); return B.RH + (B.RB - B.RH) * (1 - s * s); };

/** Annie's oak-and-iron barrel, ~4.5 ft tall, 3 ft across the bilge. Origin at the bottom centre, axis +Y.
 *  opts.lid (default true): lid boards + hatch in place; false = open top showing the cushions inside.
 *  Returns a Group with userData {height, radius, axis, lidY}. */
export function createBarrel(opts = {}) {
  const { lid = true, seed = 3 } = opts, B = BARREL, r = rng(seed);
  const g = new THREE.Group(); g.name = 'Annie oak barrel';
  const woods = [mat('oak'), mat('oakLight', PALETTE.oakLight), mat('oakDark')].map((m, i) => m), end = mat('endGrain');
  const gap = 0.0035; // radians of dark joint between staves
  const staveGeo = [[], [], []], endGeo = [];
  for (let i = 0; i < B.STAVES; i++) {
    const a0 = (i / B.STAVES) * Math.PI * 2 + gap, a1 = ((i + 1) / B.STAVES) * Math.PI * 2 - gap, th = B.T * (0.9 + 0.2 * r());
    const P = (u, v, inset) => { const a = lerp(a0, a1, u), y = v * B.H, rr = barrelR(y) - inset; return [rr * Math.sin(a), y, rr * Math.cos(a)]; };
    const w = (a1 - a0) * B.RB;
    const outer = surface(4, 18, (u, v) => P(u, v, 0), { flip: true, su: w, sv: B.H });
    const inner = surface(3, 12, (u, v) => P(u, v, th), { su: w, sv: B.H });
    const top = surface(3, 1, (u, v) => { const a = lerp(a0, a1, u), rr = barrelR(B.H) - th * (1 - v); return [rr * Math.sin(a), B.H, rr * Math.cos(a)]; });
    const bot = surface(3, 1, (u, v) => { const a = lerp(a0, a1, u), rr = barrelR(0) - th * (1 - v); return [rr * Math.sin(a), 0, rr * Math.cos(a)]; }, { flip: true });
    const side0 = surface(1, 12, (u, v) => { const y = v * B.H, rr = barrelR(y) - th * (1 - u); return [rr * Math.sin(a0), y, rr * Math.cos(a0)]; }, { flip: true });
    const side1 = surface(1, 12, (u, v) => { const y = v * B.H, rr = barrelR(y) - th * (1 - u); return [rr * Math.sin(a1), y, rr * Math.cos(a1)]; });
    const k = r() < 0.55 ? 0 : r() < 0.7 ? 1 : 2;
    staveGeo[k].push(outer, inner, side0, side1);
    endGeo.push(top, bot);
  }
  staveGeo.forEach((list, k) => { if (list.length) { const m = mesh(merge(list), woods[k]); m.name = 'staves'; g.add(m); } });
  g.add(mesh(merge(endGeo), end));
  // dark joint shadow behind the staves (seen through the 0.35 deg gaps) and the bottom head
  const core = surface(44, 6, (u, v) => { const a = u * Math.PI * 2, y = v * B.H, rr = barrelR(y) - B.T - 0.002; return [rr * Math.sin(a), y, rr * Math.cos(a)]; });
  g.add(mesh(core, mat('jointDark', '#2a1a12')));
  g.add(mesh(new THREE.CylinderGeometry(barrelR(0.05) - B.T + 0.004, barrelR(0.05) - B.T + 0.004, 0.035, 40), mat('oakDark'), [0, 0.06, 0]));
  // iron hoops: flat bands following the bulge, rivets on the outside
  const ironM = mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), hoopGeo = [], rivets = [];
  const hoopT = 0.008, hoopW = 0.05;
  for (const f of [0.045, 0.19, 0.37, 0.63, 0.81, 0.955]) {
    const y0 = f * B.H - hoopW / 2, y1 = f * B.H + hoopW / 2, R = (y) => barrelR(y) + 0.0015;
    hoopGeo.push(surface(64, 2, (u, v) => { const a = u * Math.PI * 2, y = lerp(y0, y1, v), rr = R(y) + hoopT; return [rr * Math.sin(a), y, rr * Math.cos(a)]; }, { flip: true, su: 8, sv: 1 }));
    hoopGeo.push(surface(64, 1, (u, v) => { const a = u * Math.PI * 2, rr = lerp(R(y1), R(y1) + hoopT, v); return [rr * Math.sin(a), y1, rr * Math.cos(a)]; }));
    hoopGeo.push(surface(64, 1, (u, v) => { const a = u * Math.PI * 2, rr = lerp(R(y0), R(y0) + hoopT, v); return [rr * Math.sin(a), y0, rr * Math.cos(a)]; }, { flip: true }));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + f * 3, rr = R(f * B.H) + hoopT; rivets.push(new THREE.SphereGeometry(0.009, 8, 6).translate(rr * Math.sin(a), f * B.H, rr * Math.cos(a))); }
  }
  g.add(mesh(merge(hoopGeo), ironM));
  g.add(mesh(merge(rivets), mat('ironLight', PALETTE.ironLight, { roughness: 0.4, metalness: 0.3 })));
  const lidY = B.H - 0.045;
  if (lid) g.add(createBarrelLid());
  else {
    // open: leather harness straps and the cushion padding Annie sat in, visible from above
    const inR = barrelR(B.H - 0.2) - B.T - 0.01;
    const pad = surface(32, 6, (u, v) => { const a = u * Math.PI * 2, y = lerp(0.35, B.H - 0.28, v), rr = barrelR(y) - B.T - 0.012 - 0.02 * Math.sin(a * 10) ** 2; return [rr * Math.sin(a), y, rr * Math.cos(a)]; });
    g.add(mesh(pad, mat('cushion', PALETTE.cushion)));
    g.add(mesh(new THREE.CylinderGeometry(inR, inR, 0.06, 32), mat('cushion', PALETTE.cushion), [0, 0.36, 0]));
  }
  g.userData = { height: B.H, radius: B.RB, headRadius: B.RH, axis: 'Y', origin: 'bottom centre', lidY, canRotateForWater: true };
  return g;
}

/** the barrel head: four boards in the croze, two iron straps, a bolt ring and a round air hatch. Origin = barrel bottom. */
export function createBarrelLid() {
  const B = BARREL, g = new THREE.Group(); g.name = 'barrel lid';
  const rl = barrelR(B.H - 0.045) - B.T + 0.006, y = B.H - 0.045, th = 0.035, n = 4, gap = 0.006;
  const boards = [];
  for (let k = 0; k < n; k++) {
    const x0 = -rl + (2 * rl * k) / n + gap / 2, x1 = -rl + (2 * rl * (k + 1)) / n - gap / 2;
    const sh = new THREE.Shape(), pts = [];
    const steps = 10, zOf = (x) => Math.sqrt(Math.max(0, rl * rl - x * x));
    for (let i = 0; i <= steps; i++) { const x = lerp(x0, x1, i / steps); pts.push([x, zOf(x)]); }
    for (let i = steps; i >= 0; i--) { const x = lerp(x0, x1, i / steps); pts.push([x, -zOf(x)]); }
    sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([a, b]) => sh.lineTo(a, b));
    const eg = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 4 });
    eg.rotateX(Math.PI / 2); eg.translate(0, y + th / 2, 0); // shape xy -> xz, extrusion downward from y + th/2
    boards.push(eg);
  }
  g.add(mesh(merge(boards), mat('oakLight', PALETTE.oakLight)));
  g.add(mesh(new THREE.CylinderGeometry(rl + 0.004, rl + 0.004, 0.02, 40), mat('jointDark', '#2a1a12'), [0, y - 0.03, 0]));
  const ironM = mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), bolt = mat('ironLight', PALETTE.ironLight, { roughness: 0.4, metalness: 0.3 });
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.012, 2 * rl - 0.02), ironM, [s * rl * 0.42, y + th / 2 + 0.006, 0]));
  const bolts = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; bolts.push(new THREE.SphereGeometry(0.013, 8, 6).scale(1, 0.6, 1).translate((rl - 0.035) * Math.sin(a), y + th / 2 + 0.002, (rl - 0.035) * Math.cos(a))); }
  g.add(mesh(merge(bolts), bolt));
  // round hatch: iron collar + domed cap (air hose port)
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 24), ironM, [0, y + th / 2 + 0.015, 0]));
  g.add(mesh(new THREE.SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1), bolt, [0, y + th / 2 + 0.03, 0]));
  g.userData = { lidY: y, radius: rl };
  return g;
}

// ---------------- 1901 rescue rowboat ----------------
/** clinker-built rowboat, 4.3 m, bow +Z, keel at y = 0 midships. Open hull with an inner skin. */
export function createRescueBoat(opts = {}) {
  const { L = 4.3, Bm = 0.68, D = 0.52, oarsIn = true } = opts;
  const g = new THREE.Group(); g.name = '1901 rescue rowboat';
  const half = (z) => { const t = z / (L / 2); return t > 0 ? Bm * Math.pow(Math.max(0, 1 - t ** 2.2), 0.62) : Bm * (1 - 0.5 * t * t); };
  const sheer = (z) => { const t = z / (L / 2); return D + 0.07 * t * t + 0.06 * Math.max(0, t) ** 3; };
  const depth = (z) => { const t = z / (L / 2); return D * (0.98 - 0.32 * Math.max(0, t) ** 2 - 0.12 * Math.min(0, t) ** 2); };
  const sec = (z, th, side, inset = 0) => {
    const b = Math.max(0.004, half(z) - inset), s = sheer(z), d = depth(z) - inset;
    const k = Math.pow(Math.sin(th * Math.PI / 2), 0.75);
    return [side * b * k, s - d + d * (1 - Math.cos(th * Math.PI / 2)) + inset * 0.6, z];
  };
  const z0 = -L / 2, z1 = L / 2 - 0.004, strakes = 5, outer = [], inner = [];
  for (const side of [-1, 1]) {
    for (let k = 0; k < strakes; k++) {
      const t0 = k / strakes, t1 = (k + 1) / strakes;
      outer.push(surface(28, 3, (u, v) => {
        const z = lerp(z0, z1, u), th = lerp(t0, t1, v), p = sec(z, th, side), lap = 0.012 * (1 - v);
        return [p[0] + side * lap * Math.sign(half(z)), p[1] - lap * 0.4, p[2]];
      }, { flip: side < 0, su: L, sv: 0.3 }));
    }
    inner.push(surface(28, 8, (u, v) => sec(lerp(z0 + 0.02, z1 - 0.06, u), v, side, 0.022), { flip: side > 0, su: L, sv: 1 }));
  }
  const paint = mat('boatRed', PALETTE.boatRed), wood = mat('oak'), dark = mat('oakDark');
  g.add(mesh(merge(outer), paint));
  g.add(mesh(merge(inner), wood));
  // gunwale caps (outer sheer -> inner sheer) and rub rails
  const gun = [];
  for (const side of [-1, 1]) gun.push(surface(28, 1, (u, v) => { const z = lerp(z0, z1, u), a = sec(z, 1, side), b = sec(z, 1, side, 0.022); return [lerp(a[0], b[0], v), lerp(a[1], b[1], v) + 0.012, z]; }, { flip: side < 0 }));
  g.add(mesh(merge(gun), dark));
  for (const side of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const z = lerp(z0 + 0.02, z1 - 0.05, i / 24), p = sec(z, 0.97, side); pts.push(new THREE.Vector3(p[0] + side * 0.012, p[1], z)); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.022, 6), dark));
  }
  // transom (flat stern board) and keel strip
  const ts = new THREE.Shape(), tp = [];
  for (let i = 0; i <= 12; i++) { const p = sec(z0, i / 12, 1); tp.push([p[0], p[1]]); }
  for (let i = 12; i >= 0; i--) { const p = sec(z0, i / 12, -1); tp.push([p[0], p[1]]); }
  ts.moveTo(tp[0][0], tp[0][1]); tp.slice(1).forEach(([a, b]) => ts.lineTo(a, b));
  const tg = new THREE.ExtrudeGeometry(ts, { depth: 0.035, bevelEnabled: false }); tg.translate(0, 0.01, z0 - 0.02);
  g.add(mesh(tg, dark));
  const kp = []; for (let i = 0; i <= 20; i++) { const z = lerp(z0, z1, i / 20); kp.push(new THREE.Vector3(0, sheer(z) - depth(z) - 0.02, z)); }
  kp.push(new THREE.Vector3(0, sheer(z1) + 0.04, z1 + 0.03));
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(kp), 40, 0.028, 6), dark));
  // thwarts, oarlocks, oars
  for (const z of [-0.85, 0.35, 1.15]) {
    const y = sheer(z) - 0.2, w = 2 * (half(z) - 0.04) * 0.97;
    g.add(mesh(new THREE.BoxGeometry(w, 0.035, 0.24), wood, [0, y, z]));
  }
  for (const side of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI), mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), [side * half(0.35), sheer(0.35) + 0.04, 0.35], [0, Math.PI / 2, 0]));
  const oar = () => {
    const o = new THREE.Group();
    o.add(mesh(new THREE.CylinderGeometry(0.02, 0.024, 2.2, 8), mat('oakLight', PALETTE.oakLight), [0, 0, 0], [Math.PI / 2, 0, 0]));
    o.add(mesh(new THREE.BoxGeometry(0.14, 0.018, 0.55), mat('oakLight', PALETTE.oakLight), [0, 0, 1.25]));
    return o;
  };
  for (const side of [-1, 1]) {
    const o = oar();
    if (oarsIn) { o.position.set(side * 0.28, sheer(0) - 0.12, -0.15); o.rotation.set(0.04, side * 0.04, 0); }
    else { o.position.set(side * 1.25, sheer(0.35) - 0.05, 0.35); o.rotation.set(0.12, side * 1.25, 0); }
    g.add(o);
  }
  g.userData = { length: L, beam: 2 * Bm, sheerMid: sheer(0), bow: '+Z', origin: 'keel midships', waterline: 0.18 };
  return g;
}

// ---------------- rocks ----------------
/** one rounded boulder of radius ~r, flattened, noise-displaced (shares three rock materials) */
export function createBoulder(r = 1, seed = 1, flat = 0.6, kind = 0) {
  const rr = rng(seed), geo = new THREE.IcosahedronGeometry(r, 3), p = geo.attributes.position;
  const ph = [rr() * 6.3, rr() * 6.3, rr() * 6.3, rr() * 6.3];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = 1 + 0.16 * Math.sin(3.1 * v.x + ph[0]) * Math.cos(2.7 * v.z + ph[1]) + 0.1 * Math.sin(5.3 * v.y + ph[2]) + 0.05 * Math.sin(9 * v.x + 7 * v.z + ph[3]);
    // a flatter top facet: boulders look planed and stack well
    const top = v.y > 0.55 ? 1 - 0.35 * (v.y - 0.55) : 1;
    p.setXYZ(i, v.x * r * n, v.y * r * n * flat * top, v.z * r * n);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat(['rock', 'rockDark', 'rockLight'][kind % 3]));
  m.position.y = r * flat * 0.45;
  m.rotation.y = rr() * 6.28;
  return m;
}
export function createRockCluster(seed = 1, n = 9, spread = [5, 3]) {
  const g = new THREE.Group(); g.name = 'River rocks'; const r = rng(seed);
  for (let i = 0; i < n; i++) { const rad = 0.35 + r() * 0.8; const b = createBoulder(rad, seed * 31 + i, 0.5 + 0.2 * r(), i); b.position.x += (r() - 0.5) * spread[0]; b.position.z += (r() - 0.5) * spread[1]; g.add(b); }
  return g;
}
/** rounded white foam mound for the toon water (plunge pool, rapids) */
export function createFoamMound(r = 1, seed = 1) {
  const m = createBoulder(r, seed, 0.42, 0); m.material = mat('foam', PALETTE.foam); m.name = 'foam'; return m;
}

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

// ---------------- coin purse + coins ----------------
/** EMPTY drawstring purse: slumped leather pouch, gathered neck, cord with two knotted ends. ~16 cm tall. */
export function createCoinPurse() {
  const g = new THREE.Group(); g.name = 'Empty coin purse';
  const prof = (v) => { // radius along the height: flat sagging base, pinched neck at .78, ruffled mouth
    if (v < 0.78) return 0.02 + 0.105 * Math.sin(Math.min(1, (v + 0.08) / 0.72) * Math.PI * 0.92) ** 0.8;
    return 0.028 + 0.05 * ((v - 0.78) / 0.22) ** 1.4;
  };
  const body = surface(48, 26, (u, v) => {
    const a = u * Math.PI * 2, gather = 1 + 0.16 * Math.sin(a * 9) * Math.max(0, Math.min(1, (v - 0.5) / 0.3)) + 0.06 * Math.sin(a * 5 + 1) * (v > 0.78 ? 1 : 0.3);
    const rr = prof(v) * gather, sag = 0.022 * Math.sin(v * Math.PI) * Math.cos(a); // slumps toward +x
    const y = v < 0.78 ? 0.11 * v / 0.78 * (0.75 + 0.25 * v) : 0.11 * 0.945 + 0.05 * (v - 0.78) / 0.22;
    return [rr * Math.sin(a) * 1.15 + sag, y, rr * Math.cos(a) * 0.85];
  }, { flip: true });
  g.add(mesh(body, mat('leather', PALETTE.leather)));
  // inner mouth (dark) so the opening reads empty
  g.add(mesh(new THREE.CircleGeometry(0.06, 20), mat('jointDark', '#2a1a12'), [0, 0.148, 0], [-Math.PI / 2, 0, 0]));
  const cordM = mat('cord', PALETTE.cord);
  g.add(mesh(new THREE.TorusGeometry(0.034, 0.006, 6, 24), cordM, [0, 0.108, 0], [Math.PI / 2, 0, 0]));
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(s * 0.03, 0.108, 0.01), new THREE.Vector3(s * 0.06, 0.07, 0.04), new THREE.Vector3(s * 0.075, 0.025, 0.06), new THREE.Vector3(s * 0.07, 0.004, 0.075)];
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.005, 6), cordM));
    g.add(mesh(new THREE.SphereGeometry(0.011, 8, 6), cordM, [s * 0.07, 0.006, 0.075]));
  }
  g.userData = { height: 0.16, empty: true };
  return g;
}
/** small stack of gold coins (2.6 cm across) with a raised rim on each */
export function createCoinStack(count = 3, seed = 2) {
  const g = new THREE.Group(); g.name = 'Coins'; const r = rng(seed);
  const gold = mat('gold', PALETTE.gold, { metalness: 0.35, roughness: 0.4 });
  for (let i = 0; i < count; i++) {
    const c = new THREE.Group(), y = 0.002 + i * 0.0042;
    c.add(mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.0036, 24), gold));
    c.add(mesh(new THREE.TorusGeometry(0.0122, 0.0009, 4, 24), gold, [0, 0.0018, 0], [Math.PI / 2, 0, 0]));
    c.position.set((r() - 0.5) * 0.004, y, (r() - 0.5) * 0.004); c.rotation.y = r() * 6.28;
    g.add(c);
  }
  return g;
}

// ---------------- cat (3D blocking stand-in; the film uses the 2D toon cat card) ----------------
export function createCatStandIn() {
  const g = new THREE.Group(); g.name = 'Cat blocking reference (film uses the 2D card)';
  const fur = mat('fur', PALETTE.fur), dark = mat('furDark', PALETTE.furDark), white = mat('paint', '#f6efe2');
  const body = mesh(new THREE.SphereGeometry(0.16, 16, 12), fur, [0, 0.2, 0]); body.scale.set(1, 1.05, 1.35); g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.115, 16, 12), fur, [0, 0.36, 0.17]));
  g.add(mesh(new THREE.SphereGeometry(0.055, 12, 8), white, [0, 0.33, 0.265]));
  for (const x of [-0.06, 0.06]) {
    g.add(mesh(new THREE.ConeGeometry(0.045, 0.09, 4), fur, [x, 0.47, 0.15], [-0.15, Math.PI / 4, x * 3]));
    g.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), dark, [x * 0.75, 0.38, 0.272]));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.14, 8), fur, [x * 1.3, 0.07, 0.15]));
  }
  const tail = new THREE.CatmullRomCurve3([[0, 0.15, -0.2], [0.05, 0.2, -0.32], [0.04, 0.36, -0.36], [-0.02, 0.46, -0.3]].map((p) => new THREE.Vector3(...p)));
  g.add(mesh(new THREE.TubeGeometry(tail, 16, 0.025, 8), fur));
  g.userData = { height: 0.5 };
  return g;
}

// ---------------- supporting props ----------------
/** coil of hemp rope, ~0.5 m across */
export function createRopeCoil(turns = 4, r0 = 0.25) {
  const pts = [];
  for (let i = 0; i <= turns * 32; i++) { const a = (i / 32) * Math.PI * 2, r = r0 - (i / (turns * 32)) * 0.09; pts.push(new THREE.Vector3(r * Math.cos(a), 0.022 + 0.035 * Math.floor(i / 32) * 0.6 + 0.004 * Math.sin(a * 3), r * Math.sin(a))); }
  pts.push(new THREE.Vector3(r0 + 0.1, 0.02, 0.05), new THREE.Vector3(r0 + 0.35, 0.02, 0.2));
  const g = new THREE.Group(); g.name = 'Rope coil';
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 64, 0.022, 7), mat('rope', PALETTE.rope)));
  return g;
}
/** claw hammer, 0.33 m, lying on its side (handle along +X) */
export function createHammer() {
  const g = new THREE.Group(); g.name = 'Hammer';
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.33, 10), mat('oakLight', PALETTE.oakLight), [0.165, 0.017, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.BoxGeometry(0.035, 0.035, 0.07), mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), [0.33, 0.02, 0.025]));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), [0.33, 0.02, 0.07], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.ConeGeometry(0.015, 0.08, 4), mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), [0.33, 0.02, -0.03], [-Math.PI / 2, 0, 0]));
  return g;
}
/** blacksmith's anvil (the barrel's ballast), ~0.3 m tall */
export function createAnvil() {
  const s = new THREE.Shape();
  [[-0.3, 0.3], [0.12, 0.3], [0.3, 0.26], [0.12, 0.22], [0.08, 0.2], [0.06, 0.1], [0.14, 0], [-0.18, 0], [-0.1, 0.1], [-0.12, 0.2], [-0.3, 0.22]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 });
  geo.translate(0, 0, -0.06);
  const g = new THREE.Group(); g.name = 'Anvil'; g.add(mesh(geo, mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }))); return g;
}
/** timber dock: deck of planks (u across, v along) on round posts. Size w x l, deck top at y = h, front edge at z = 0, runs -Z. */
export function createDock(w = 3, l = 6, h = 0.5, seed = 4) {
  const g = new THREE.Group(); g.name = 'Timber dock'; const r = rng(seed), planks = [[], []];
  const n = Math.round(l / 0.2);
  for (let i = 0; i < n; i++) {
    const z = -(i + 0.5) * (l / n), pw = l / n - 0.012, ww = w + (r() - 0.5) * 0.06, dy = (r() - 0.5) * 0.01;
    planks[r() < 0.6 ? 0 : 1].push(new THREE.BoxGeometry(ww, 0.045, pw).translate((r() - 0.5) * 0.04, h - 0.0225 + dy, z));
  }
  g.add(mesh(merge(planks[0]), mat('oak')), mesh(merge(planks[1]), mat('oakDark')));
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.16, l), mat('oakDark'), [x, h - 0.125, -l / 2]));
    for (let k = 0; k <= Math.ceil(l / 2); k++) { const z = -Math.min(l - 0.1, k * 2 + 0.1); g.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, h + 1.6, 10), mat('oakDark'), [x * 1.08, h - (h + 1.6) / 2 + 0.25, z])); }
  }
  g.userData = { deckY: h, width: w, length: l };
  return g;
}
/** 1901 iron promenade railing along +X: posts every `step` m with ball finials, two rails. Origin at the left foot. */
export function createRailing(len = 10, step = 1.6, h = 1.0) {
  const g = new THREE.Group(); g.name = 'Iron railing'; const ironM = mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 }), parts = [];
  for (let x = 0; x <= len + 1e-6; x += step) { parts.push(new THREE.CylinderGeometry(0.025, 0.03, h, 8).translate(x, h / 2, 0)); parts.push(new THREE.SphereGeometry(0.045, 10, 8).translate(x, h + 0.03, 0)); }
  for (const y of [h - 0.06, h * 0.45]) parts.push(new THREE.CylinderGeometry(0.018, 0.018, len, 8).rotateZ(Math.PI / 2).translate(len / 2, y, 0));
  g.add(mesh(merge(parts), ironM));
  return g;
}
/** cast-iron gas lamp post, 3.2 m */
export function createLampPost() {
  const g = new THREE.Group(); g.name = 'Gas lamp post'; const ironM = mat('iron', PALETTE.iron, { roughness: 0.5, metalness: 0.2 });
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.4, 10), ironM, [0, 0.2, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 10), ironM, [0, 1.6, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.42, 6), mat('glass', '#f3e6b8'), [0, 3.05, 0]));
  g.add(mesh(new THREE.ConeGeometry(0.22, 0.2, 6), ironM, [0, 3.35, 0]));
  return g;
}
/** planked shipping crate (seat / step / falling-object tests), size s, origin at the bottom centre */
export function createCrate(s = 0.5, seed = 6) {
  const g = new THREE.Group(); g.name = 'Crate'; const r = rng(seed), planks = [[], []], n = 4, gap = 0.008;
  for (const [ax, sign] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) for (let i = 0; i < n; i++) {
    const w = s / n - gap, y = (i + 0.5) * (s / n), off = sign * (s / 2 - 0.0125);
    const geo = ax === 'x' ? new THREE.BoxGeometry(0.025, w, s).translate(off, y, 0) : new THREE.BoxGeometry(s - 0.05, w, 0.025).translate(0, y, off);
    planks[r() < 0.6 ? 0 : 1].push(geo);
  }
  for (let i = 0; i < n; i++) planks[i % 2].push(new THREE.BoxGeometry(s / n - gap, 0.025, s - 0.01).translate(-s / 2 + (i + 0.5) * (s / n), s - 0.0125, 0));
  g.add(mesh(merge(planks[0]), mat('oak')), mesh(merge(planks[1]), mat('oakDark')));
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.05, s, 0.05), mat('oakDark'), [x * (s / 2 - 0.02), s / 2, z * (s / 2 - 0.02)]));
  g.add(mesh(new THREE.BoxGeometry(s - 0.06, s - 0.06, s - 0.06), mat('jointDark', '#2a1a12'), [0, s / 2, 0]));
  g.userData = { size: s, seatY: s };
  return g;
}
