// The wheat country as one three.js scene: red desert, the fence, the wheat, the farm and its road, the dam, the
// range, the park, the bounty office; the Lewis gun, the truck, the ammunition and the cast.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V, lam } from "./build";
import { ctex, cloudHD, waterNear, waterFar } from "./paint";
import { wheatTex, ammoTex, ammoTop, wallTex, ironTex, postTex, bountyTex, earthTex, scrubTex } from "./fxe";
import { woodTex, asphaltTex } from "./fxw";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, gy, V3, DAM, RIDGE, HG, FARM, ARMY, G5, BANK, DESK, RANGE, PARK, SPLIT, BRASS, BOUNTY, ROAD_Z, smooth, easeOut, clamp01,
  POP, AMMO0, AMMO1, JAM, truckX } from "./story";

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

// ---------------- props ----------------
const tri3 = (a: V3, b: V3, c: V3) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); g.computeVertexNormals(); return g; };
/** gable roof prism over a w x d footprint, ridge along x */
const roofGeo = (w: number, d: number, h: number) => {
  const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
  return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-w / 2, 0, 0);
};
/** Lewis gun, barrel along -z, on its bipod; about 1.5 x life size so it reads */
const makeGun = () => {
  const g = new THREE.Group(), steel = col("#5b6170"), dk = col("#2e2f38"), wood = col("#8a5a34");
  g.add(cyl(0.085, 1.0, steel, 0, 0.5, -0.55, "z"), cyl(0.035, 0.16, dk, 0, 0.5, -1.12, "z"), box(0.16, 0.2, 0.55, dk, 0, 0.5, 0.18),
    cyl(0.24, 0.07, dk, 0, 0.64, 0.12, "y"), cyl(0.06, 0.03, steel, 0, 0.69, 0.12, "y"), box(0.1, 0.2, 0.5, wood, 0, 0.44, 0.66), box(0.06, 0.2, 0.06, dk, 0, 0.32, 0.3));
  for (const s of [-1, 1]) { const l = box(0.035, 0.62, 0.035, dk, s * 0.2, 0.24, -0.75); l.rotation.z = s * 0.42; g.add(l); }
  (g.children[5] as THREE.Mesh).rotation.x = -0.18;
  return sh(g);
};
const makeTruck = () => {
  const T = new THREE.Group(), body = new THREE.Group(), Y = col("#6b7a4a"), tyre = col("#2a2a31");
  body.add(box(5.2, 0.7, 2.0, Y, 0, 0.95, 0), box(1.9, 0.85, 1.9, Y, -1.0, 1.72, 0), box(1.7, 0.6, 1.94, col("#9ed3ee"), -1.0, 1.78, 0), box(1.94, 0.1, 1.96, Y, -1.0, 2.18, 0),
    box(2.5, 0.5, 0.08, Y, 1.3, 1.5, 0.96), box(2.5, 0.5, 0.08, Y, 1.3, 1.5, -0.96), box(0.08, 0.5, 2.0, Y, 2.56, 1.5, 0), box(5.3, 0.18, 2.06, col("#3a3d47"), 0, 0.62, 0),
    box(1.2, 0.5, 1.5, Y, -2.5, 1.2, 0), cyl(0.14, 0.06, col("#fff3b0"), -3.12, 1.2, 0.5, "x"), cyl(0.14, 0.06, col("#fff3b0"), -3.12, 1.2, -0.5, "x"));
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [[-1.9, 1.02], [1.6, 1.02], [-1.9, -1.02], [1.6, -1.02]]) { const w = cyl(0.46, 0.3, tyre, x, 0.46, z, "z"); wheels.push(w); T.add(w, cyl(0.22, 0.32, col("#d9dee4"), x, 0.46, z, "z")); }
  T.add(body);
  return { g: sh(T), body, wheels };
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private gunA = makeGun(); private gunB = makeGun(); private truck = makeTruck(); private truckGun = makeGun();
  private crates: THREE.Mesh[] = [];
  private fan = new THREE.Group();
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

    // ---- ground: red desert, straw-coloured farm land, a green patch for the park ----
    const earth = tex("earthE", 512, 512, earthTex);
    {
      const X0 = -440, X1 = 440, Z0 = -260, Z1 = 240, nx = 260, nz = 180, pos: number[] = [], uv: number[] = [], colr: number[] = [], idx: number[] = [];
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        const x = X0 + ((X1 - X0) * i) / nx, z = Z0 + ((Z1 - Z0) * j) / nz;
        pos.push(x, gy(x, z), z); uv.push(x / 7, z / 7);
        const farm = smooth((z + 2) / 5), park = (1 - smooth((Math.hypot(x - PARK[0], (z - PARK[2] - 3) * 1.2) - 26) / 10));
        const d = [0.98, 0.5, 0.33], w = [1.0, 0.9, 0.66], g = [0.5, 0.86, 0.42], wh = [1.0, 0.8, 0.36];
        const field = smooth((z - 2) / 3) * (1 - smooth((z - 57) / 3)) * (1 - smooth((Math.abs(x) - 88) / 4));
        const c = d.map((dv, k) => { let base = dv + (w[k] - dv) * farm; base += (wh[k] - base) * field; return base + (g[k] - base) * park; });
        colr.push(c[0], c[1], c[2]);
      }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, lam("earthE", () => ({ map: earth, vertexColors: true })));
      m.receiveShadow = true; R.add(m);
    }
    R.add(patch(0, ROAD_Z, 220, 1.9, lam("roadE", () => ({ map: earth, color: "#c9a57c" })), false, 0.03, 0, 7));
    // ---- far country: red mesas beyond the desert, pale hills behind the farm ----
    M.mesa = col("#b0563a"); M.hill = col("#d9b872"); M.gum = col("#7f9a5a"); M.gum2 = col("#6c8a4e"); M.trunk = col("#d9cdb8");
    M.wood = lam("woodE", () => ({ map: tex("woodE", 256, 256, woodTex) })); M.wall = lam("wallE", () => ({ map: tex("wallE", 512, 512, wallTex) }));
    M.iron = lam("ironE", () => ({ map: tex("ironE", 512, 256, ironTex) })); M.post = lam("postE", () => ({ map: tex("postE", 128, 256, postTex) }));
    for (let i = 0; i < 12; i++) {
      const x = -420 + i * 76 + hh(i, 1) * 30, z = -250 - hh(i, 2) * 60, s = 50 + hh(i, 3) * 50, hgt = 16 + hh(i, 4) * 22;
      const m = new THREE.Mesh(lumpGeo(i, 1, 0.1).scale(s, hgt, s * 0.6), M.mesa); m.position.set(x, 0, z); sh(m, false); R.add(m);
    }
    for (let i = 0; i < 12; i++) {
      const x = -420 + i * 76 + hh(i, 5) * 30, z = 230 + hh(i, 6) * 50, s = 70 + hh(i, 7) * 50;
      const m = new THREE.Mesh(lumpGeo(i + 30, 2, 0.1).scale(s, 14 + hh(i, 8) * 16, s * 0.6), M.hill); m.position.set(x, -3, z); sh(m, false); R.add(m);
    }
    const gum = (x: number, z: number, s = 1) => {
      const g = new THREE.Group();
      g.add(cyl(0.22 * s, 4.2 * s, M.trunk, 0, 2.1 * s, 0, "y", 0.14 * s, 8));
      for (const [dx, dy, dz, r] of [[0, 5.2, 0, 2.1], [-1.5, 4.4, 0.4, 1.5], [1.4, 4.6, -0.3, 1.6]]) { const f = new THREE.Mesh(lumpGeo(x + dx, 1, 0.2).scale(r * s, r * 0.7 * s, r * 0.9 * s), dx ? M.gum2 : M.gum); f.position.set(dx * s, dy * s, dz * s); g.add(f); }
      g.position.set(x, gy(x, z), z); sh(g); R.add(g);
    };
    for (const [x, z, s] of [[34, 100, 1.3], [-22, 104, 1.1], [58, 96, 1.0], [-64, 100, 1.2], [-44, 96, 0.9], [96, 104, 1.2], [140, 100, 1.1], [-110, -52, 1.0], [296, 67, 1.2], [305.5, 68.5, 1.0], [-310, 82, 1.2], [-289, 84, 1.0], [74, 92, 1.1]]) gum(x, z, s);
    // ---- wheat ----
    {
      const tt = tex("wheatE", 256, 256, wheatTex); tt.wrapS = tt.wrapT = THREE.ClampToEdgeWrapping;
      const pl = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), g = mergeGeometries([pl, pl.clone().rotateY(Math.PI / 2)], false)!;
      const nrm = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
      const mat = lam("wheatE", () => ({ map: tt, alphaTest: 0.5, side: THREE.DoubleSide }));
      const N = 5200, im = new THREE.InstancedMesh(g, mat, N), q = new THREE.Quaternion(), up = V(0, 1, 0);
      let n = 0;
      for (let ix = 0; ix < 110 && n < N; ix++) for (let iz = 0; iz < 40 && n < N; iz++) {
        const i = ix * 40 + iz, x = -88 + ix * 1.6 + (hh(i, 11) - 0.5) * 0.9, z = 3.5 + iz * 1.35 + (hh(i, 12) - 0.5) * 0.7;
        if (Math.abs(x) < 9 && z < 22 && hh(i, 13) < 0.72) continue; // eaten and trampled where the mob came through
        const s = 0.85 + hh(i, 14) * 0.3;
        im.setMatrixAt(n++, this.m4.compose(V(x, gy(x, z) - 0.04, z), q.setFromAxisAngle(up, hh(i, 15) * 6.28), V(s * 1.9, s, s * 1.9)));
      }
      im.count = n; im.layers.set(NOINK); im.receiveShadow = true; R.add(im);
    }
    // ---- scrub in the desert (kept clear of every place a lens goes) ----
    {
      const tt = tex("scrubE", 256, 256, scrubTex); tt.wrapS = tt.wrapT = THREE.ClampToEdgeWrapping;
      const pl = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), g = mergeGeometries([pl, pl.clone().rotateY(Math.PI / 2)], false)!;
      const nrm = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
      const im = new THREE.InstancedMesh(g, lam("scrubE", () => ({ map: tt, alphaTest: 0.5, side: THREE.DoubleSide })), 700), q = new THREE.Quaternion(), up = V(0, 1, 0);
      const keep: [number, number, number][] = [[0, -20, 34], [G5[0], G5[2], 12], [RIDGE[0], RIDGE[2], 16], [DAM[0], DAM[2], 26], [-90, -70, 30], [-70, -10, 12], [SPLIT[0], SPLIT[2] - 8, 34], [BRASS[0], BRASS[2], 12]];
      let n = 0;
      for (let i = 0; n < 700 && i < 5000; i++) {
        const x = -330 + hh(i, 16) * 660, z = -4 - hh(i, 17) * 190;
        if (keep.some(([kx, kz, r]) => Math.hypot(x - kx, z - kz) < r)) continue;
        const s = 0.9 + hh(i, 18) * 1.3;
        im.setMatrixAt(n++, this.m4.compose(V(x, gy(x, z) - 0.05, z), q.setFromAxisAngle(up, hh(i, 19) * 6.28), V(s * 1.3, s, s * 1.3)));
      }
      im.count = n; im.layers.set(NOINK); R.add(im);
    }
    // ---- the fence the emus came through ----
    {
      const N = 100, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.5, 0.16), M.post, N), q = new THREE.Quaternion(), e = new THREE.Euler();
      let n = 0;
      for (let i = 0; i < N; i++) {
        const x = -200 + i * 4;
        if (Math.abs(x) < 7.9) continue;
        const brk = Math.abs(x) < 9 ? (x > 0 ? -0.6 : 0.6) : 0;
        im.setMatrixAt(n++, this.m4.compose(V(x, gy(x, 0) + 0.7, 0), q.setFromEuler(e.set(0.05 * Math.sin(i), 0, brk)), V(1, 1, 1)));
      }
      im.count = n; im.castShadow = true; R.add(im);
      for (const s of [-1, 1]) for (const y of [0.45, 0.85, 1.25]) R.add(box(192, 0.03, 0.03, col("#6a6a72"), s * 104, y, 0));
    }
    // ---- the farm ----
    {
      const H = new THREE.Group();
      H.add(box(9, 3.0, 6, M.wall, 0, 1.5, 0), new THREE.Mesh(roofGeo(9.8, 7.4, 2.4), M.iron), box(1.0, 2.0, 0.1, col("#7a4a3a"), -1.5, 1.0, -3.02), box(1.4, 1.1, 0.1, col("#9ed3ee"), 1.8, 1.7, -3.02),
        box(9.6, 0.12, 2.2, M.iron, 0, 2.7, -4.0), box(0.14, 2.7, 0.14, M.post, -4.5, 1.35, -5.0), box(0.14, 2.7, 0.14, M.post, 4.5, 1.35, -5.0), box(0.14, 2.7, 0.14, M.post, 0, 1.35, -5.0),
        box(0.9, 1.6, 0.9, col("#b0544a"), 3.2, 5.0, 0.6));
      H.children[1].position.y = 3.0;
      H.position.set(20, gy(20, 96), 96); sh(H); R.add(H);
      const S = new THREE.Group(); S.add(box(6, 2.6, 5, M.iron, 0, 1.3, 0), new THREE.Mesh(roofGeo(6.4, 5.6, 1.2), col("#8d949c"))); S.children[1].position.y = 2.6;
      S.position.set(-14, gy(-14, 100), 100); sh(S); R.add(S);
      const tank = cyl(1.7, 2.3, lam("tankE", () => ({ map: tex("ironE", 512, 256, ironTex), color: "#b8c4cc" })), 30, gy(30, 98) + 1.15, 98, "y", 1.7, 20); sh(tank); R.add(tank);
      const P = new THREE.Group();
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(0.1, 7.2, 0.1, col("#8d949c"), sx * 0.7, 3.5, sz * 0.7); l.rotation.set(-sz * 0.085, 0, sx * 0.085); P.add(l); }
      for (const y of [2, 4.2]) P.add(box(1.5 - y * 0.15, 0.06, 0.06, col("#8d949c"), 0, y, -0.75 + y * 0.07), box(0.06, 0.06, 1.5 - y * 0.15, col("#8d949c"), 0.75 - y * 0.07, y, 0));
      for (let k = 0; k < 10; k++) { const b = box(0.34, 1.25, 0.03, col("#c9d2d9"), 0, 0.85, 0); const h = new THREE.Group(); h.add(b); h.rotation.z = (k / 10) * Math.PI * 2; this.fan.add(h); }
      this.fan.add(cyl(0.16, 0.12, col("#5b6170"), 0, 0, 0, "z"));
      this.fan.position.set(0, 7.3, -0.4); P.add(this.fan, box(0.04, 0.7, 1.6, col("#b0544a"), 0, 7.3, 1.0));
      P.position.set(8, gy(8, 92), 92); sh(P); R.add(P);
    }
    // ---- the dam: water, a dead tree ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.WU);
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "dam1";
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9.4, 40).rotateX(-Math.PI / 2), waterM); pond.position.set(DAM[0], gy(DAM[0], DAM[2]) + 0.62, DAM[2]); pond.receiveShadow = true; R.add(pond);
    { const t = new THREE.Group(); t.add(cyl(0.3, 4.6, M.trunk, 0, 2.3, 0, "y", 0.16, 8)); for (const [rz, y, L] of [[0.9, 3.2, 2.4], [-0.8, 3.9, 2.0], [0.5, 4.5, 1.4]]) { const b = cyl(0.1, L, M.trunk, 0, y, 0, "y", 0.04, 6); b.rotation.z = rz; b.position.x = -Math.sin(rz) * L * 0.5; b.position.y = y + Math.cos(rz) * L * 0.5 - 0.3; t.add(b); } t.position.set(DAM[0] + 13, gy(DAM[0] + 13, DAM[2] - 6), DAM[2] - 6); sh(t); R.add(t); }
    // ---- the major's desk and tent ----
    {
      const D = new THREE.Group();
      D.add(box(1.5, 0.08, 0.8, M.wood, 0, 0.8, -0.75), box(0.5, 0.02, 0.36, col("#f7f3ea"), -0.3, 0.86, -0.75), box(0.26, 0.2, 0.2, col("#3a3d47"), 0.45, 0.94, -0.7));
      for (const [x, z] of [[-0.68, -1.1], [0.68, -1.1], [-0.68, -0.4], [0.68, -0.4]]) D.add(box(0.07, 0.8, 0.07, M.wood, x, 0.4, z));
      const tent = new THREE.Mesh(roofGeo(4.6, 4.4, 2.9), col("#c9c2a0")); tent.position.set(0, 0, 3.4); D.add(tent);
      D.position.set(DESK[0], DESK[1], DESK[2]); sh(D); R.add(D);
    }
    // ---- ammunition: 20 crates in a wobbly tower behind the line-up ----
    const cSide = lam("ammoSide", () => ({ map: tex("ammoSide", 512, 320, ammoTex) })), cTop = lam("ammoTop", () => ({ map: tex("ammoTop", 256, 256, ammoTop) }));
    for (let k = 0; k < 20; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.5, 0.62), [cTop, cTop, cTop, cTop, cSide, cSide]);
      m.position.set(ARMY[0] + ((k % 2) - 0.5) * 1.02 + (hh(k, 21) - 0.5) * 0.1, ARMY[1] + 0.25 + Math.floor(k / 2) * 0.51, ARMY[2] + 2.2 + (hh(k, 22) - 0.5) * 0.08);
      m.rotation.y = Math.PI + (hh(k, 23) - 0.5) * 0.14; sh(m); this.crates.push(m); R.add(m);
    }
    R.add(this.gunA, this.gunB, this.truck.g);
    this.truckGun.position.set(1.3, 1.25, 0); this.truckGun.rotation.y = Math.PI / 2; this.truck.body.add(this.truckGun);
    // ---- the range: a bank behind the targets ----
    { const m = new THREE.Mesh(lumpGeo(4, 2, 0.1).scale(9, 2.6, 3), col("#c9a57c")); m.position.set(RANGE[0], RANGE[1] - 0.4, RANGE[2] + 16); sh(m); R.add(m); }
    // ---- the park: path, bench, lamp, hedge ----
    {
      R.add(patch(PARK[0] + 4.5, PARK[2] + 1, 1.3, 10, col("#e9dcc0"), false, 0.03, 0.5));
      const B = new THREE.Group();
      B.add(box(1.8, 0.08, 0.5, M.wood, 0, 0.5, 0), box(1.8, 0.5, 0.08, M.wood, 0, 0.85, 0.25), box(0.1, 0.5, 0.5, col("#3a3d47"), -0.8, 0.25, 0), box(0.1, 0.5, 0.5, col("#3a3d47"), 0.8, 0.25, 0));
      B.position.set(PARK[0] + 2.6, PARK[1], PARK[2] + 5.2); sh(B); R.add(B);
      const L = new THREE.Group(); L.add(cyl(0.06, 3.4, col("#2e2f38"), 0, 1.7, 0), cyl(0.2, 0.36, col("#fff3b0"), 0, 3.55, 0, "y", 0.14, 8), cyl(0.26, 0.06, col("#2e2f38"), 0, 3.76, 0));
      L.position.set(PARK[0] - 3.4, PARK[1], PARK[2] + 5.6); sh(L); R.add(L);
      for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(lumpGeo(i + 50, 1, 0.16).scale(1.7, 1.0, 1.0), col(i % 2 ? "#5f9a4e" : "#6fae58")); m.position.set(PARK[0] - 10 + i * 2.6, PARK[1] + 0.7, PARK[2] + 9.5); sh(m); R.add(m); }
    }
    // ---- the bounty office ----
    {
      const O = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), lam("bountyE", () => ({ map: tex("bountyE", 1024, 768, bountyTex) }))); face.rotation.y = Math.PI; face.position.set(0, 3, -0.02);
      O.add(box(8, 6, 6, M.wall, 0, 3, 3), face, new THREE.Mesh(roofGeo(8.8, 7.2, 2.2), M.iron), box(3.5, 0.1, 0.7, M.wood, 0, 1.1, -0.85), box(3.3, 1.05, 0.5, M.wood, 0, 0.53, -0.85), box(9, 0.12, 2.6, M.iron, 0, 4.3, -1.3));
      O.children[2].position.set(0, 6, 3);
      O.position.set(BOUNTY[0], BOUNTY[1], BOUNTY[2]); sh(O); R.add(O);
      R.add(patch(BOUNTY[0], BOUNTY[2] - 4, 12, 5, lam("roadE", () => ({ map: earth, color: "#c9a57c" })), false, 0.03, 0, 7));
    }
    // ---- ten thousand rounds, spent ----
    { const m = new THREE.Mesh(lumpGeo(9, 2, 0.14).scale(1.5, 1.05, 1.3), col("#d9aa3a")); m.position.set(BRASS[0] - 0.9, BRASS[1] + 0.25, BRASS[2] - 0.2); sh(m); R.add(m); }
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
    const name = SHOTS[id - 1].name, t = f / FPS, A = this.gunA, B = this.gunB;
    // the gun: where it stands in each shot (x, z, yaw, lift)
    const G: Record<string, [number, number, number, number]> = {
      hookGun: [HG[0], HG[2], 0, 0], hookMen: [HG[0], HG[2], 0, 0], dayOne: [G5[0], G5[2], Math.atan2(-(RIDGE[0] - G5[0]), -(RIDGE[2] - G5[2])), 0],
      horde: [BANK[0], BANK[2], 0, 0.02], wait: [BANK[0], BANK[2], 0, 0.02], blank: [BANK[0], BANK[2], 0, 0.02],
      fire: [BANK[0], BANK[2], 0, 0.02], jam: [BANK[0], BANK[2], 0, 0.02], range: [RANGE[0], RANGE[2], Math.PI, 0], split: [SPLIT[0], SPLIT[2], 0, 0],
      army: [ARMY[0] - 1.4, ARMY[2] - 1.5, 0.4, 0], end: [FARM[0] - 2.5, FARM[2] + 1.6, 0.9, 0],
    };
    const g = G[name];
    A.visible = !!g && (name !== "army" || f >= POP[3]);
    A.rotation.set(0, 0, 0); A.scale.setScalar(1);
    if (g) {
      A.position.set(g[0], gy(g[0], g[1]) + g[3], g[1]); A.rotation.y = g[2];
      if (name === "fire" && f - 864 < 70) A.position.z += 0.05 * (f % 2);                       // recoil chatter
      if (name === "split") A.rotation.y = f < 1609 ? 0 : 0.7 * Math.sin((f - 1609) * 0.35);      // which way?
      if (name === "range" && f >= 1436 && f < 1460) A.rotation.y = Math.PI + 0.45 * ((f - 1436) / 24 - 0.5);
      if (name === "jam") A.rotation.x = -0.2 * easeOut((f - JAM) / 6);
      if (name === "end") A.rotation.z = 1.35;
      if (name === "army") A.scale.setScalar(1 + 0.3 * Math.sin(clamp01((f - POP[3]) / 6) * Math.PI));
    }
    B.visible = name === "army" && f >= POP[4];
    B.position.set(ARMY[0] + 1.4, gy(ARMY[0] + 1.4, ARMY[2] - 1.5), ARMY[2] - 1.5); B.rotation.y = -0.4; B.scale.setScalar(1 + 0.3 * Math.sin(clamp01((f - POP[4]) / 6) * Math.PI));
    // ammunition tower: grows two crates at a time, sways
    this.crates.forEach((m, k) => {
      const f0 = AMMO0 + ((AMMO1 - AMMO0) * Math.floor(k / 2)) / 10, n = f - f0;
      m.visible = id >= 8 && (name !== "army" || n >= 0);
      m.scale.setScalar(name === "army" ? Math.max(0.001, 1 + 0.25 * Math.sin(clamp01(n / 6) * Math.PI) * (1 - clamp01(n / 6))) : 1);
    });
    // the truck
    const T = this.truck;
    let tx = ARMY[0] + 6.5, tz = ARMY[2] + 6, yaw = 0.5, moving = false;
    if (name === "truck") { tx = truckX(f); tz = ROAD_Z; yaw = Math.PI; moving = true; }
    if (name === "home") { tx = -2 + (f - 1697) * 0.32; tz = ROAD_Z; yaw = Math.PI; moving = true; }
    T.g.visible = name === "army" || name === "luckily" || moving;
    T.g.position.set(tx, gy(tx, tz), tz); T.g.rotation.y = yaw;
    T.body.position.y = moving ? 0.06 * Math.sin(f * 0.9) + 0.04 * Math.sin(f * 1.7) : 0; T.body.rotation.z = moving ? 0.02 * Math.sin(f * 0.7) : 0;
    for (const w of T.wheels) w.rotation.z = moving ? -f * 0.5 : 0;
    this.truckGun.visible = name === "truck";
    this.fan.rotation.z = t * 2.2;
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
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
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

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz * 3.0 + vec2(0.15 * wTime, 0.1 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
