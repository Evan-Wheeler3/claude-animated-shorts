// "The Eiffel Tower's Secret Job" as one three.js scene: the tower and Paris round it, the restaurant, the radio room,
// the radio landscape, the cutaway house and the evening sea.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V, lam } from "./build";
import { ctex, cloudHD, waterNear, waterFar } from "./paint";
import { latticeTex, ironTex, haussTex, panoTex, wallpaperTex, clothTex, gravelTex, lawnTex } from "./fxt";
import { woodTex } from "./fxw";
import { shade } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, gy, V3, TOWER, TOP, PLAZA, RESTO, ROOM, LAND, HOUSE, SEA, halfW, mastAt, newAntAt, smooth, easeOut, clamp01 } from "./story";

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const col = (hex: string) => lam("c" + hex, () => ({ color: hex }));
const tex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => { const t = ctex(key, w, h, draw); t.anisotropy = 16; return t; };
const unlit = (map: THREE.Texture, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, ...extra });
const sh = <T extends THREE.Object3D>(o: T, cast = true) => { o.traverse((m) => { m.castShadow = cast; m.receiveShadow = true; }); return o; };
const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cyl = (r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, axis: "x" | "y" | "z" = "y", r2 = r, seg = 20) => {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  if (axis === "x") g.rotateZ(Math.PI / 2); if (axis === "z") g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m;
};
/** flat patch that follows the ground (decals, tarmac lines): a disc or a rectangle sampled on the terrain */
const patch = (cx: number, cz: number, rx: number, rz: number, mat: THREE.Material, round = true, lift = 0.03, yaw = 0, uvK = 0) => {
  const n = round ? 28 : 8, m = 6, pos: number[] = [], uv: number[] = [], idx: number[] = [], c = Math.cos(yaw), s = Math.sin(yaw);
  for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) {
    let lx: number, lz: number;
    if (round) { const a = (i / n) * Math.PI * 2, r = j / m; lx = rx * r * Math.cos(a); lz = rz * r * Math.sin(a); } else { lx = rx * ((2 * i) / n - 1); lz = rz * ((2 * j) / m - 1); }
    const x = cx + lx * c + lz * s, z = cz - lx * s + lz * c;
    pos.push(x, gy(x, z) + lift, z); uv.push(uvK ? x / uvK : 0.5 + lx / (2 * rx), uvK ? z / uvK : 0.5 + lz / (2 * rz));
  }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, d = a + n + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; return mesh;
};
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

const lumpGeo = (seed: number, detail = 2, amp = 0.22) => {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + amp * (Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 2) + 0.6 * Math.sin(v.z * 4.3 + seed * 3));
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  return g;
};

// ---------------- the tower ----------------
const CELL = 9; // lattice texture repeat (m)
/** a lattice strip between two edges a(y) and b(y), from y0 to y1 (both edges are functions of height) */
const stripGeo = (a: (y: number) => THREE.Vector3, b: (y: number) => THREE.Vector3, y0: number, y1: number, step = 4) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const n = Math.max(1, Math.round((y1 - y0) / step));
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n, A = a(y), B = b(y), w = A.distanceTo(B);
    pos.push(A.x, A.y, A.z, B.x, B.y, B.z); uv.push(0, y / CELL, w / CELL, y / CELL);
  }
  for (let i = 0; i < n; i++) { const p = i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const LEG0 = 15, MERGE = 118;
/** leg width at height y: 15 m at the base, filling to the centre where the legs join */
const legW = (y: number) => LEG0 + (halfW(y) - LEG0) * smooth(y / MERGE);
const makeTower = () => {
  const T = new THREE.Group();
  const latt = tex("lattE", 256, 256, (g) => latticeTex(g)); latt.wrapS = latt.wrapT = THREE.RepeatWrapping;
  const LM = lam("lattE", () => ({ map: latt, alphaTest: 0.45, side: THREE.DoubleSide }));
  const IM = lam("ironE", () => ({ map: tex("ironE", 256, 256, ironTex) }));
  const geos: THREE.BufferGeometry[] = [];
  const V3v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // four legs: each a tapered square column from its outer corner inward
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const o = (y: number) => halfW(y), i = (y: number) => halfW(y) - legW(y);
    geos.push(stripGeo((y) => V3v(sx * o(y), y, sz * i(y)), (y) => V3v(sx * o(y), y, sz * o(y)), 0, MERGE));   // outer x face
    geos.push(stripGeo((y) => V3v(sx * i(y), y, sz * o(y)), (y) => V3v(sx * o(y), y, sz * o(y)), 0, MERGE));   // outer z face
    geos.push(stripGeo((y) => V3v(sx * i(y), y, sz * i(y)), (y) => V3v(sx * i(y), y, sz * o(y)), 0, MERGE));   // inner x face
    geos.push(stripGeo((y) => V3v(sx * i(y), y, sz * i(y)), (y) => V3v(sx * o(y), y, sz * i(y)), 0, MERGE));   // inner z face
  }
  // the upper shaft: one square column to the top deck and on to the lantern
  const w = (y: number) => halfW(y);
  for (const s of [-1, 1]) {
    geos.push(stripGeo((y) => V3v(s * w(y), y, -w(y)), (y) => V3v(s * w(y), y, w(y)), MERGE, 296, 6));
    geos.push(stripGeo((y) => V3v(-w(y), y, s * w(y)), (y) => V3v(w(y), y, s * w(y)), MERGE, 296, 6));
  }
  const lattice = new THREE.Mesh(mergeGeometries(geos, false)!, LM); lattice.castShadow = true; lattice.receiveShadow = true; T.add(lattice);
  // the four great arches under the first floor
  for (let k = 0; k < 4; k++) {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 24; j++) {
      const t = (j / 24) * Math.PI, y = 6 + 33 * Math.sin(t), half = halfW(6) - legW(6);
      pts.push(V3v(half * Math.cos(t), y, halfW(y) - 0.6));
    }
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.9, 8), IM);
    arch.rotation.y = (k * Math.PI) / 2; arch.castShadow = true; T.add(arch);
  }
  // first floor (57 m): a square ring with a decorated band; second floor (115 m); the top (276 m)
  const ring = (y: number, half: number, inner: number, h: number) => {
    const d = half - inner;
    for (let k = 0; k < 4; k++) { const b = box(2 * half, h, d, IM, 0, y + h / 2, half - d / 2); const g2 = new THREE.Group(); g2.add(b); g2.rotation.y = (k * Math.PI) / 2; T.add(g2); }
  };
  ring(54, halfW(57) + 3, halfW(57) - 12, 6.5);
  T.add(box(2 * (halfW(115) + 2.5), 4, 2 * (halfW(115) + 2.5), IM, 0, 115, 0));
  // railings on the first two floors
  for (const [y, h] of [[60.5, halfW(57) + 3], [117, halfW(115) + 2.5]]) for (let k = 0; k < 4; k++) {
    const r = new THREE.Mesh(stripGeo((yy) => V3v(-h, yy, h), (yy) => V3v(h, yy, h), y, y + 1.6, 1.6), LM); r.rotation.y = (k * Math.PI) / 2; T.add(r);
  }
  // the top: deck, glazed cabin, campanile, lantern, antennas
  T.add(box(16, 1.2, 16, IM, 0, TOP - 0.6, 0), box(10, 3.4, 10, col("#9ec3d9"), 0, TOP + 1.7, 0), box(10.4, 0.5, 10.4, IM, 0, TOP + 3.6, 0));
  for (let k = 0; k < 4; k++) { const r = new THREE.Group(); r.add(box(16, 0.1, 0.1, IM, 0, TOP + 1.15, 7.95), box(16, 0.06, 0.06, IM, 0, TOP + 0.6, 7.95)); for (let j = -8; j <= 8; j += 1.6) r.add(box(0.07, 1.15, 0.07, IM, j, TOP + 0.58, 7.95)); r.rotation.y = (k * Math.PI) / 2; T.add(r); }
  T.add(box(5.6, 10, 5.6, IM, 0, TOP + 8.8, 0), cyl(2.4, 6, IM, 0, TOP + 16.8, 0, "y", 2.8, 16), cyl(1.4, 2.4, col("#c9ced6"), 0, TOP + 21, 0, "y", 1.8, 16));
  // broadcast antennas: a red-and-white mast, a ring of panels
  for (let k = 0; k < 6; k++) T.add(cyl(0.7, 4, col(k % 2 ? "#f2f3f5" : "#d63a2f"), 0, TOP + 24 + k * 4, 0, "y", 0.75, 12));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; T.add(box(0.5, 2.4, 0.9, col("#e8eaee"), 2.4 * Math.cos(a), TOP + 18, 2.4 * Math.sin(a))); }
  return sh(T);
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform> = {};
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private mast = new THREE.Group(); private newAnt = new THREE.Group(); private fair = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(shadowRes = 4096) {
    const R = this.root, M: Record<string, THREE.Material> = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowRes, shadowRes);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- Paris: ground, the Champ de Mars, the Seine, trees, Haussmann blocks ----
    const gravel = tex("gravE", 512, 512, gravelTex), lawn = tex("lawnE", 512, 512, lawnTex);
    const flatTex = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(2200, 1800).rotateX(-Math.PI / 2), lam("gravelE", () => ({ map: flatTex(gravel, 300, 260) }))); m.position.set(0, 0, 100); m.receiveShadow = true; R.add(m); }
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 420).rotateX(-Math.PI / 2), lam("lawnE", () => ({ map: flatTex(lawn, 6, 80) }))); m.position.set(s * 26, 0.03, 330); m.receiveShadow = true; R.add(m); }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(2200, 110).rotateX(-Math.PI / 2), col("#4f7fa6")); m.position.set(0, 0.04, -170); R.add(m); }
    {
      const N = 420, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), col("#5f9a4e"), N), q = new THREE.Quaternion(), c = new THREE.Color();
      let n = 0;
      for (const s of [-1, 1]) for (const r of [0, 1]) for (let k = 0; k < 40; k++) { const x = s * (50 + r * 9), z = 120 + k * 11; im.setMatrixAt(n, this.m4.compose(V(x, 6, z), q, V(4.2, 5, 4.2))); im.setColorAt(n++, c.set(k % 3 ? "#5f9a4e" : "#6fae58")); }
      for (; n < N; n++) { const a = hh(n, 1) * 6.28, d = 140 + hh(n, 2) * 120; const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8; if (Math.abs(x) < 70 && z > 60) { im.setMatrixAt(n, this.m4.compose(V(0, -50, 0), q, V(1, 1, 1))); continue; } im.setMatrixAt(n, this.m4.compose(V(x, 5, z), q, V(4, 5, 4))); im.setColorAt(n, c.set("#5f9a4e")); }
      im.castShadow = true; im.receiveShadow = true; R.add(im);
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 6), col("#6a4a32"), 160); let t2 = 0;
      for (const s of [-1, 1]) for (const r of [0, 1]) for (let k = 0; k < 40; k++) trunks.setMatrixAt(t2++, this.m4.compose(V(s * (50 + r * 9), 2, 120 + k * 11), q, V(1, 1, 1)));
      R.add(trunks);
    }
    {
      const hm = lam("haussE", () => ({ map: tex("haussE", 512, 512, haussTex) }));
      const N = 260, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), hm, N), q = new THREE.Quaternion();
      let n = 0;
      for (let i = 0; n < N && i < 3000; i++) {
        const a = hh(i, 3) * Math.PI * 2, d = 230 + hh(i, 4) * 520, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if ((Math.abs(x) < 80 && z > 0) || (z > -240 && z < -100)) continue;
        const w = 30 + hh(i, 5) * 30, h = 20 + hh(i, 6) * 7;
        im.setMatrixAt(n++, this.m4.compose(V(x, 0, z), q.setFromAxisAngle(V(0, 1, 0), Math.round(hh(i, 7) * 4) * (Math.PI / 2) + (Math.abs(x) > Math.abs(z) ? 0 : 0)), V(w, h, w * 0.6)));
      }
      im.count = n; im.castShadow = true; im.receiveShadow = true; R.add(im);
    }
    // ---- the tower ----
    R.add(makeTower());
    // the 1889 fair: flag masts and two domed pavilions by the plaza
    {
      const F = this.fair, cols = ["#2f4f8a", "#f7f3ea", "#c0353a"];
      for (let k = 0; k < 14; k++) { const x = (k % 2 ? 1 : -1) * (18 + Math.floor(k / 2) * 6), z = 72 + Math.floor(k / 2) * 4; F.add(cyl(0.12, 9, col("#e8eaee"), x, 4.5, z)); for (let j = 0; j < 3; j++) F.add(box(0.06, 1.2, 0.8, col(cols[j]), x, 8.2, z + 0.42 + j * 0.8)); }
      for (const s of [-1, 1]) { F.add(box(26, 9, 16, col("#e9dcc0"), s * 78, 4.5, 110), new THREE.Mesh(new THREE.SphereGeometry(7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), col("#4f8a9a"))); F.children[F.children.length - 1].position.set(s * 78, 9, 110); }
      sh(F); R.add(F);
    }

    // ---- the restaurant inside the tower (window wall at z = -3 over Paris) ----
    {
      const Rg = new THREE.Group(), C = RESTO;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8).rotateX(-Math.PI / 2), M.wood = lam("woodE", () => ({ map: tex("woodE", 256, 256, woodTex) }))); Rg.add(floor);
      const pano = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), unlit(tex("panoE", 1024, 512, panoTex))); pano.position.set(0, 2.2, -3.2); Rg.add(pano);
      for (let k = -4; k <= 4; k++) Rg.add(box(0.14, 4.2, 0.14, col("#5a4232"), k * 1.1, 2.1, -3.0));
      Rg.add(box(9.2, 0.16, 0.16, col("#5a4232"), 0, 1.0, -3.0), box(9.2, 0.16, 0.16, col("#5a4232"), 0, 4.1, -3.0));
      for (const s of [-1, 1]) { const wp = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.4), lam("wallpE", () => ({ map: tex("wallpE", 256, 256, (g) => wallpaperTex(g)) }))); wp.position.set(s * 4.6, 2.2, 0.8); wp.rotation.y = -s * Math.PI / 2; Rg.add(wp); }
      Rg.add(cyl(0.8, 0.06, lam("clothE", () => ({ map: tex("clothE", 256, 256, (g) => clothTex(g)) })), 0, 0.78, 0.2, "y", 0.8, 24), cyl(0.06, 0.76, col("#3a3d47"), 0, 0.38, 0.2), cyl(0.18, 0.03, col("#f7f7f5"), -0.2, 0.83, 0.5, "y", 0.2, 16), cyl(0.05, 0.2, col("#9ed3ee"), 0.3, 0.9, 0.4, "y", 0.04, 10));
      for (const lx of [-2.6, 2.6]) Rg.add(cyl(0.012, 1.2, col("#3a3d47"), lx, 3.8, 0.4), cyl(0.18, 0.3, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.0) }), lx, 3.1, 0.4, "y", 0.12, 12));
      Rg.position.set(C[0], 0, C[2]); sh(Rg); pano.castShadow = false; R.add(Rg);
      // the radio room
      const Q = new THREE.Group(), D = ROOM;
      Q.add(box(8, 0.02, 6, M.wood, 0, 0.01, 0), box(8, 4, 0.2, col("#8a7a62"), 0, 2, -2.6), box(2.6, 0.08, 1.0, M.wood, 0, 0.9, -0.9), box(2.4, 0.86, 0.9, col("#5a4232"), 0, 0.44, -0.95));
      Q.add(box(2.2, 1.4, 0.6, col("#3a3d47"), 0, 1.65, -1.9), box(1.0, 0.7, 0.5, col("#5b6170"), -1.6, 1.25, -1.9));
      for (let k = 0; k < 5; k++) Q.add(cyl(0.12, 0.05, col("#f2c94c"), -0.8 + k * 0.4, 1.8, -1.58, "z"));
      Q.add(cyl(0.2, 0.3, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.0) }), 0.8, 3.0, -0.6, "y", 0.12, 12));
      Q.position.set(D[0], 0, D[2]); sh(Q); R.add(Q);
    }
    // ---- the radio landscape: a mast, hills on its left, a town hidden behind them, a farm on the right ----
    {
      const L = LAND, Lg = new THREE.Group();
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), lam("lawnE2", () => ({ map: flatTex(lawn, 40, 40) }))); ground.position.y = 0.05; Lg.add(ground);
      for (const [x, z, s, h] of [[-32, -36, 22, 16], [-52, -18, 18, 12], [-18, -64, 26, 20]]) { const m = new THREE.Mesh(lumpGeo(x, 2, 0.12).scale(s, h, s * 0.8), col("#6f9a4a")); m.position.set(x, 0, z); Lg.add(m); }
      const house = (x: number, z: number, c: string) => { Lg.add(box(6, 4, 6, col(c), x, 2, z)); const r = new THREE.Mesh(new THREE.ConeGeometry(4.8, 3, 4).rotateY(Math.PI / 4), col("#a8463a")); r.position.set(x, 5.5, z); Lg.add(r); };
      house(-62, -60, "#e9dcc0"); house(-74, -48, "#f2e6c4"); house(-58, -78, "#e9dcc0"); house(-80, -70, "#d9c9a4"); house(40, -30, "#e9dcc0"); house(52, -44, "#f2e6c4");
      Lg.position.set(L[0], 0, L[2]); sh(Lg); R.add(Lg);
      // the mast: a slim lattice tower whose height changes per shot
      const latt = tex("lattE", 256, 256, (g) => latticeTex(g));
      const LM2 = lam("lattE2", () => ({ map: latt, alphaTest: 0.45, side: THREE.DoubleSide }));
      const mastGeo = (() => { const gs: THREE.BufferGeometry[] = []; const w = (y: number) => 1.2 - 0.8 * y; for (const s of [-1, 1]) { gs.push(stripGeo((y) => new THREE.Vector3(s * w(y), y, -w(y)), (y) => new THREE.Vector3(s * w(y), y, w(y)), 0, 1, 0.25)); gs.push(stripGeo((y) => new THREE.Vector3(-w(y), y, s * w(y)), (y) => new THREE.Vector3(w(y), y, s * w(y)), 0, 1, 0.25)); } return mergeGeometries(gs, false)!; })();
      this.mast.add(new THREE.Mesh(mastGeo, LM2)); this.mast.position.set(L[0], 0, L[2]); sh(this.mast); R.add(this.mast);
    }
    // ---- the cutaway house: a basement (floor 0) and a living room (floor 2.8), open toward +z ----
    {
      const H = HOUSE, Hg = new THREE.Group();
      Hg.add(box(7, 2.8, 0.2, col("#8a7a62"), 0, 1.4, -2.5), box(7, 2.8, 0.2, col("#f2e6c4"), 0, 4.2, -2.5), box(0.2, 5.6, 5, col("#d9c9a4"), -3.5, 2.8, 0), box(0.2, 5.6, 5, col("#d9c9a4"), 3.5, 2.8, 0));
      Hg.add(box(7.2, 0.25, 5, M.wood, 0, 2.8, 0), box(7.2, 0.1, 5, col("#6a6a72"), 0, 0.05, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.75), col("#a8463a")); roof.position.set(0, 7.0, 0); Hg.add(roof);
      Hg.add(box(1.4, 0.8, 0.6, M.wood, -0.6, 3.3, -1.6), box(0.4, 0.1, 0.3, col("#2a2428"), -0.6, 3.75, -1.6), box(1.2, 0.7, 0.8, col("#8a6a4a"), 0.6, 0.35, -1.4));
      for (const s of [-1, 1]) Hg.add(box(0.03, 0.28, 0.03, col("#2a2428"), -0.6 + s * 0.14, 3.95, -1.6));
      const soil = box(9, 2.8, 1.2, col("#8a6a4a"), 0, 1.4, 3.2); soil.visible = false; Hg.add(soil);
      Hg.add(box(30, 0.2, 10, col("#7fb05a"), 0, 2.85, -8), box(30, 2.8, 0.4, col("#8a6a4a"), 0, 1.4, -3.0));
      Hg.position.set(H[0], 0, H[2]); sh(Hg); R.add(Hg);
    }
    // ---- the evening sea: three steamers ----
    {
      const S = SEA, Sg = new THREE.Group();
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 1400).rotateX(-Math.PI / 2), col("#2f5f8a")); sea.position.set(0, 0.06, -500); Sg.add(sea);
      const ship = (x: number, z: number, s: number) => { const g2 = new THREE.Group(); g2.add(box(14, 2.4, 3.6, col("#2a2428"), 0, 1.0, 0), box(14.2, 0.4, 3.8, col("#c0353a"), 0, 0.1, 0), box(6, 2.2, 3, col("#f2ecdc"), 1, 3.2, 0), cyl(0.6, 3.6, col("#d9a441"), 0, 5.6, 0), cyl(0.09, 9, col("#5a4232"), -4.5, 5.6, 0), cyl(0.09, 9, col("#5a4232"), 5, 5.6, 0)); g2.position.set(x, 0, z); g2.scale.setScalar(s); g2.rotation.y = 0.2; Sg.add(g2); };
      ship(0, -9, 1); ship(-40, -60, 1.1); ship(50, -120, 1.2);
      Sg.position.set(S[0], 0, S[2]); sh(Sg); sea.castShadow = false; R.add(Sg);
    }
    // ---- the 2022 antenna, lowered onto the top ----
    this.newAnt.add(cyl(0.4, 6, col("#f2f3f5"), 0, 3, 0, "y", 0.5, 12), cyl(0.1, 3, col("#2a2428"), 0, 7.5, 0)); this.newAnt.position.set(0, TOP + 48, 0); sh(this.newAnt); R.add(this.newAnt);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private props(id: number, f: number) {
    const name = SHOTS[id - 1].name;
    this.mast.scale.y = mastAt(id, f);
    this.fair.visible = ["fair", "down", "artists", "deadline", "reveal"].includes(name);
    const u = newAntAt(f);
    this.newAnt.visible = name === "today" || name === "propose";
    this.newAnt.position.y = name === "propose" ? TOP + 48 : TOP + 48 + (1 - u) * 30;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig: camera-relative sun frozen per shot, two-tone uniforms, shadow fit ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    this.props(id, f);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, f, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of stg.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of stg.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(Math.abs(p.w), p.h)))) continue;
      const fxm = this.fx(fi++);
      fxm.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      fxm.use(!!p.soft);
      fxm.mesh.visible = true;
      fxm.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) fxm.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { fxm.mesh.quaternion.copy(cam.quaternion); fxm.mesh.rotateZ(p.rot ?? 0); }
      fxm.mesh.scale.set(p.w, p.h, 1);
      fused.push(fxm);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const x of fused) x.bind();
    return focus;
  }
}

