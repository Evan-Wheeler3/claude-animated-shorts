// The whole place as one three.js scene: sea, beach, dunes, the car park, the whale (whole / boulder / blasted),
// the dynamite stack, plungers, sign, truck, plan board, news camera, cars, the sale lot, the chunks and the cast.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V, lam } from "./build";
import { ctex, cloudHD, waterNear, waterFar, rng } from "./paint";
import { Pen, INK } from "./toon";
import { whaleSkin, meatTex, chunkTex, crateTex, crateTop, woodTex, signTex, planTex, bannerTex, packetTex, sandTex, asphaltTex, tuftTex, showroomTex } from "./fxw";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, stateAt, gy, PL, V3, WH, CRATE, HOOKPLG, SIGN, TRUCK, EASEL, LOG, REP, PLG, CAR, KET, DEAL, CHUNKS, chunkAt,
  smooth, easeOut, clamp01, CRATES0, CRATES1, STOMP, SLAB, State } from "./story";

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

// ---------------- the whale ----------------
const PROF: [number, number][] = [[0, 0.22], [0.08, 0.42], [0.2, 0.78], [0.35, 1.25], [0.5, 1.55], [0.65, 1.7], [0.8, 1.76], [0.93, 1.72], [0.975, 1.5], [1, 1.0]];
const prof = (u: number) => { for (let i = 1; i < PROF.length; i++) if (u <= PROF[i][0]) { const [a, ra] = PROF[i - 1], [b, rb] = PROF[i]; return ra + ((rb - ra) * (u - a)) / (b - a); } return 1; };
const ringPt = (u: number, a: number, jag = 0): [number, number, number] => {
  const R = prof(u), y = Math.max(Math.cos(a) * R * 0.86, -0.5 * R);
  return [-7 + 14 * u + jag, y + 0.5 * R, Math.sin(a) * R];
};
const whaleGeo = (u0: number, u1: number, jagA = 0, jagB = 0) => {
  const NR = 30, NS = 32, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NR; j++) {
    const u = u0 + ((u1 - u0) * j) / NR;
    for (let k = 0; k <= NS; k++) {
      const a = (k / NS) * Math.PI * 2, jg = j === 0 ? jagA * (hh(k % NS, 3) - 0.3) : j === NR ? jagB * (hh(k % NS, 4) - 0.7) : 0;
      pos.push(...ringPt(u, a, jg)); uv.push(u * 2, k / NS);
    }
  }
  for (let j = 0; j < NR; j++) for (let k = 0; k < NS; k++) { const a = j * (NS + 1) + k, b = a + 1, d = a + NS + 1, e = d + 1; idx.push(a, b, d, b, e, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** end cap at u (a fan); dir = +1 faces +x, -1 faces -x; jag follows the ragged ring */
const capGeo = (u: number, dir: number, jag = 0, key = 3) => {
  const NS = 32, pos: number[] = [], uv: number[] = [], idx: number[] = [], R = prof(u);
  pos.push(-7 + 14 * u + dir * 0.25 * (jag ? 1 : 0.6), 0.5 * R, 0); uv.push(0.5, 0.5);
  for (let k = 0; k <= NS; k++) { const a = (k / NS) * Math.PI * 2, p = ringPt(u, a, jag * (hh(k % NS, key) - (key === 3 ? 0.3 : 0.7))); pos.push(...p); uv.push(0.5 + (0.48 * p[2]) / R, 0.5 + (0.48 * (p[1] - 0.5 * R)) / R); }
  for (let k = 0; k < NS; k++) idx.push(0, dir > 0 ? k + 2 : k + 1, dir > 0 ? k + 1 : k + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
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

// ---------------- vehicles ----------------
type Car = { g: THREE.Group; cabin: THREE.Group; body: THREE.Group };
const makeCar = (paint: string): Car => {
  const g = new THREE.Group(), body = new THREE.Group(), cabin = new THREE.Group();
  const P = col(paint), dark = col("#23232b"), chrome = col("#d9dee4"), glass = col("#9ed3ee"), tyre = col("#2a2a31");
  body.add(box(5.0, 0.62, 1.9, P, 0, 0.66, 0), box(5.16, 0.16, 1.96, chrome, 0, 0.42, 0), box(0.06, 0.2, 1.5, dark, -2.52, 0.72, 0),
    cyl(0.13, 0.06, col("#fff3b0"), -2.53, 0.76, 0.7, "x"), cyl(0.13, 0.06, col("#fff3b0"), -2.53, 0.76, -0.7, "x"),
    box(0.06, 0.12, 0.5, col("#d63a2f"), 2.52, 0.78, 0.6), box(0.06, 0.12, 0.5, col("#d63a2f"), 2.52, 0.78, -0.6));
  for (const [x, z] of [[-1.55, 0.92], [1.6, 0.92], [-1.55, -0.92], [1.6, -0.92]]) body.add(cyl(0.36, 0.26, tyre, x, 0.36, z, "z"), cyl(0.2, 0.28, chrome, x, 0.36, z, "z"));
  // cabin: roof slab on four posts with glass between (it squashes as a whole)
  cabin.add(box(2.5, 0.1, 1.72, P, 0.25, 0.52, 0), box(2.46, 0.46, 1.6, glass, 0.25, 0.25, 0));
  for (const [x, z] of [[-0.98, 0.83], [1.48, 0.83], [-0.98, -0.83], [1.48, -0.83], [0.25, 0.83], [0.25, -0.83]]) cabin.add(box(0.1, 0.5, 0.08, P, x, 0.25, z));
  cabin.position.y = 0.97;
  g.add(body, cabin); sh(g);
  return { g, cabin, body };
};

type Mats = Record<string, THREE.Material>;
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
  private foam: THREE.Mesh[] = [];
  private whale = new THREE.Group(); private whaleWhole = new THREE.Group(); private whaleHead = new THREE.Group(); private blasted = new THREE.Group();
  private boulder: THREE.Mesh;
  private crates: THREE.Mesh[] = [];
  private plungers: { g: THREE.Group; handle: THREE.Group }[] = [];
  private wires: THREE.Mesh[] = [];
  private roadKit = new THREE.Group(); private truck = new THREE.Group(); private easel = new THREE.Group(); private newsCam = new THREE.Group();
  private car: Car; private packet: THREE.Mesh;
  private chunks: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(shadowRes = 4096) {
    const R = this.root, M: Mats = {};
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

    // ---- terrain: sand, dunes, the grassy top ----
    {
      const X0 = -300, X1 = 700, Z0 = -40, Z1 = 300, nx = 250, nz = 170, pos: number[] = [], uv: number[] = [], colr: number[] = [], idx: number[] = [];
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        const x = X0 + ((X1 - X0) * i) / nx, z = Z0 + ((Z1 - Z0) * j) / nz;
        pos.push(x, gy(x, z), z); uv.push(x / 9, z / 9);
        const wet = 1 - smooth((z - 1) / 7), top = smooth((z - 96) / 16), dune = smooth((z - 50) / 30) * (1 - top);
        const c = [1 - 0.3 * wet - 0.04 * dune - 0.42 * top, 1 - 0.28 * wet + 0.0 * dune - 0.18 * top, 1 - 0.24 * wet - 0.1 * dune - 0.5 * top];
        colr.push(c[0], c[1], c[2]);
      }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals();
      const sand = tex("sandW", 1024, 1024, sandTex);
      const m = new THREE.Mesh(g, lam("sandW", () => ({ map: sand, vertexColors: true })));
      m.receiveShadow = true; m.castShadow = false; R.add(m);
    }
    // ---- sea ----
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
    waterM.customProgramCacheKey = () => "sea1";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1100).rotateX(-Math.PI / 2), waterM);
    sea.position.set(200, 0.02, -548.5); sea.receiveShadow = true; R.add(sea);
    // surf: wobbling white bands that slide up and down the wet sand
    for (let k = 0; k < 3; k++) {
      const n = 160, pos: number[] = [], idx: number[] = [];
      for (let i = 0; i <= n; i++) { const x = -300 + (1000 * i) / n; pos.push(x, 0, 0, x, 0, 1); }
      for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: k ? "#eaf7ff" : "#ffffff", side: THREE.DoubleSide }));
      m.frustumCulled = false; m.layers.set(NOINK); this.foam.push(m); R.add(m);
    }
    // ---- rocks, hills, pines, drift wood, dune grass ----
    M.rock = col("#565a6b"); M.rockTop = col("#5f8a4a"); M.hill = col("#4f8048"); M.pine = col("#2f6a45"); M.pine2 = col("#3d7d4c"); M.trunk = col("#7a5a3c");
    M.wood = lam("woodW", () => ({ map: tex("woodW", 256, 256, woodTex) })); M.drift = lam("driftW", () => ({ map: tex("woodW", 256, 256, woodTex), color: "#f3e3cc" }));
    for (const [x, z, s, hgt] of [[-70, -95, 16, 30], [-52, -112, 9, 17], [46, -150, 22, 38], [120, -80, 12, 22], [150, -100, 7, 13], [-150, -200, 26, 44]]) {
      const g = lumpGeo(x, 2, 0.25); g.scale(s, hgt, s * 0.8);
      const m = new THREE.Mesh(g, M.rock); m.position.set(x, hgt * 0.25, z); sh(m); R.add(m);
      const t = new THREE.Mesh(lumpGeo(z, 1, 0.2).scale(s * 0.62, hgt * 0.14, s * 0.5), M.rockTop); t.position.set(x, hgt * 1.13, z); sh(t); R.add(t);
    }
    for (let i = 0; i < 14; i++) {
      const x = -260 + i * 70 + hh(i, 1) * 30, z = 250 + hh(i, 2) * 60, s = 60 + hh(i, 3) * 50;
      const m = new THREE.Mesh(lumpGeo(i, 2, 0.12).scale(s, 22 + hh(i, 4) * 26, s * 0.7), M.hill); m.position.set(x, PL - 4, z); sh(m, false); R.add(m);
    }
    {
      const cone = mergeGeometries([new THREE.ConeGeometry(1, 2.2, 7).translate(0, 3.3, 0), new THREE.ConeGeometry(1.35, 2.4, 7).translate(0, 2.1, 0), new THREE.ConeGeometry(1.7, 2.6, 7).translate(0, 0.9, 0).toNonIndexed() as THREE.BufferGeometry].map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
      const N = 320, im = new THREE.InstancedMesh(cone, M.pine, N), q = new THREE.Quaternion(), c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const x = -280 + hh(i, 5) * 960, z = 190 + hh(i, 6) * 70 + (Math.abs(x - 400) < 40 ? 20 : 0), s = 2.2 + hh(i, 7) * 2.4;
        im.setMatrixAt(i, this.m4.compose(V(x, gy(x, z) + 0.6, z), q, V(s, s * (1.1 + 0.5 * hh(i, 8)), s)));
        im.setColorAt(i, c.set(i % 3 ? "#2f6a45" : "#3f7f50").multiplyScalar(0.85 + 0.3 * hh(i, 9)));
      }
      im.castShadow = true; im.receiveShadow = true; R.add(im);
    }
    for (const [x, z, L, yaw] of [[LOG[0], LOG[2], 2.7, 0.04], [-22, 7, 4.6, 0.5], [26, 12, 3.0, -0.4], [-34, 30, 5, 1.1]]) {
      const g = new THREE.Group();
      g.add(cyl(0.24, L, M.drift, 0, 0.22, 0, "x", 0.19, 10), cyl(0.09, 0.8, M.drift, L * 0.22, 0.5, 0.1, "y", 0.05, 7));
      g.position.set(x, gy(x, z) + 0.06, z); g.rotation.y = yaw; sh(g); R.add(g);
    }
    {
      const tt = tex("tuftW", 256, 256, tuftTex); tt.wrapS = tt.wrapT = THREE.ClampToEdgeWrapping;
      const pl = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), g = mergeGeometries([pl, pl.clone().rotateY(Math.PI / 2)], false)!;
      const nrm = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
      const mat = lam("tuftW", () => ({ map: tt, alphaTest: 0.5, side: THREE.DoubleSide }));
      const N = 900, im = new THREE.InstancedMesh(g, mat, N), q = new THREE.Quaternion(), up = V(0, 1, 0);
      let n = 0;
      for (let i = 0; n < N && i < 6000; i++) {
        const x = -90 + hh(i, 11) * 190, z = 44 + hh(i, 12) * 96;
        if (z > 100 && z < 124 && Math.abs(x + 2) < 16) continue; // the viewing spot stays clear
        if (z > 60 && z < 100 && Math.abs(x) < 4 && hh(i, 15) < 0.8) continue; // a sandy path up the dune
        const s = 0.7 + hh(i, 13) * 0.9;
        im.setMatrixAt(n++, this.m4.compose(V(x, gy(x, z) - 0.03, z), q.setFromAxisAngle(up, hh(i, 14) * 6.28), V(s * 1.1, s, s * 1.1)));
      }
      im.count = n; im.layers.set(NOINK); im.receiveShadow = true; R.add(im);
    }

    // ---- the whale ----
    const skin = tex("whaleSkin", 1024, 512, whaleSkin), meat = tex("meat", 512, 512, meatTex);
    M.skin = lam("whaleSkin", () => ({ map: skin })); M.meat = lam("meat", () => ({ map: meat, side: THREE.DoubleSide })); M.skinFlat = col("#4f5b73"); M.pale = col("#c9c7c2");
    const flukeShape = new THREE.Shape([[0.6, 0.3], [-1.6, 2.5], [-2.3, 2.3], [-1.5, 0], [-2.3, -2.3], [-1.6, -2.5], [0.6, -0.3]].map(([x, y]) => new THREE.Vector2(x, y)));
    const flukes = () => { const g = new THREE.ExtrudeGeometry(flukeShape, { depth: 0.2, bevelEnabled: false }).rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, M.skinFlat); m.position.set(-7.1, 0.12, 0); return m; };
    this.whaleWhole.add(new THREE.Mesh(whaleGeo(0, 1), M.skin), new THREE.Mesh(capGeo(1, 1), M.skinFlat), flukes());
    this.whaleHead.add(new THREE.Mesh(whaleGeo(0.47, 1, 0.9), M.skin), new THREE.Mesh(capGeo(1, 1), M.skinFlat), new THREE.Mesh(capGeo(0.47, -1, 0.9), M.meat));
    // parts both versions share: jaw, teeth, tongue, fin, the X eyes
    const front = new THREE.Group();
    const jaw = box(4.4, 0.24, 0.62, M.pale, 4.9, 0.2, 1.72); jaw.rotation.y = 0.1; front.add(jaw);
    for (let i = 0; i < 9; i++) front.add(cyl(0.07, 0.2, col("#f7f5ee"), 3.2 + i * 0.44, 0.4, 1.93 - i * 0.043, "y", 0.02, 6));
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10).scale(1.0, 0.13, 0.5), col("#e86e78")); tongue.position.set(6.3, 0.16, 2.45); tongue.rotation.y = -0.5; front.add(tongue);
    const fin = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(1.0, 0.14, 0.5), M.skinFlat); fin.position.set(2.0, 0.3, 2.0); fin.rotation.set(0.0, 0.5, 0.15); front.add(fin);
    const eyeT = ctex("eyeX", 128, 128, (g) => { const p = new Pen(g); p.stroke([[30, 30], [98, 98]], 20, INK); p.stroke([[98, 30], [30, 98]], 20, INK); });
    for (const s of [1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: eyeT, transparent: true, depthWrite: false, side: THREE.DoubleSide })); e.position.set(4.25, 1.12, s * 1.79); e.rotation.x = -s * 0.3; e.layers.set(NOINK); e.renderOrder = 0.6; front.add(e); }
    this.whale.add(this.whaleWhole, this.whaleHead, front);
    this.whale.position.set(WH[0], WH[1] - 0.12, WH[2]); sh(this.whale); R.add(this.whale);
    for (const o of this.whale.children[2].children) if ((o as THREE.Mesh).material instanceof THREE.MeshBasicMaterial) o.castShadow = false;
    // what the blast leaves: the tail thrown aside, a scorched pit, puddles
    const tail = new THREE.Group();
    tail.add(new THREE.Mesh(whaleGeo(0, 0.2, 0, 0.7), M.skin), new THREE.Mesh(capGeo(0.2, 1, 0.7, 4), M.meat), flukes());
    tail.position.set(WH[0] - 7.5, gy(-9, 13) - 0.1, 13.2); tail.rotation.y = 0.5; sh(tail);
    this.blasted.add(tail, patch(WH[0] - 3.2, WH[2] + 0.4, 6.5, 4.6, col("#6b5a54")), patch(WH[0] - 2.6, WH[2] + 0.6, 3.6, 2.6, col("#8f1820"), true, 0.05),
      patch(WH[0] - 6.5, WH[2] + 3.4, 1.6, 1.1, col("#c4232b"), true, 0.05), patch(WH[0] + 1.5, WH[2] + 4.4, 1.3, 0.9, col("#c4232b"), true, 0.05));
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(lumpGeo(i + 20, 1, 0.3).scale(0.9, 0.5, 0.7), M.meat); const x = WH[0] - 6 + i * 1.6, z = WH[2] + (i % 2 ? 1.6 : -0.4); m.position.set(x, gy(x, z) + 0.3, z); m.rotation.y = i; sh(m); this.blasted.add(m); }
    R.add(this.blasted);
    this.boulder = new THREE.Mesh(lumpGeo(7, 2, 0.16).scale(7.2, 1.9, 2.1), col("#9a9aa2")); this.boulder.position.set(WH[0], WH[1] + 1.35, WH[2]); sh(this.boulder); R.add(this.boulder);

    // ---- dynamite: 20 cases, plungers, wires ----
    const cSide = unlitLam("crateSide", tex("crateSide", 512, 320, crateTex)), cTop = unlitLam("crateTop", tex("crateTop", 256, 256, crateTop));
    for (let k = 0; k < 20; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.5, 0.62), [cTop, cTop, cTop, cTop, cSide, cSide]);
      m.position.set(CRATE[0] + ((k % 5) - 2) * 1.02 + (hh(k, 21) - 0.5) * 0.08, CRATE[1] + 0.25 + Math.floor(k / 5) * 0.51, CRATE[2] + (hh(k, 22) - 0.5) * 0.1);
      m.rotation.y = (hh(k, 23) - 0.5) * 0.12; sh(m); this.crates.push(m); R.add(m);
    }
    for (const P of [[HOOKPLG[0] + 0.78, HOOKPLG[1], HOOKPLG[2]], PLG] as V3[]) {
      const g = new THREE.Group(), handle = new THREE.Group();
      g.add(box(0.5, 0.46, 0.4, col("#b3251f"), 0, 0.23, 0), box(0.54, 0.05, 0.44, col("#3a3d47"), 0, 0.48, 0));
      handle.add(cyl(0.035, 0.6, col("#8d949c"), 0, 0.3, 0), cyl(0.045, 0.5, col("#3a3d47"), 0, 0.62, 0, "z"));
      g.add(handle); g.position.set(P[0], P[1], P[2]); sh(g); this.plungers.push({ g, handle }); R.add(g);
    }
    const wire = (pts: V3[]) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], gy(p[0], p[2]) + 0.03, p[2]))), 80, 0.03, 5), col("#2a2a31")); R.add(m); return m; };
    this.wires.push(wire([[CRATE[0] + 2.4, 0, CRATE[2] + 0.4], [3.6, 0, 15.0], [HOOKPLG[0] + 0.78, 0, HOOKPLG[2] + 0.25]]),
      wire([[CRATE[0] + 2.4, 0, CRATE[2] + 0.4], [3.5, 0, 30], [1.5, 0, 60], [4.5, 0, 90], [PLG[0], 0, PLG[2] - 0.3]]));

    // ---- highway things: sign, centre line, cones, the department's truck ----
    {
      const g = this.roadKit;
      const post = box(0.1, 3.0, 0.1, col("#8d949c"), SIGN[0], SIGN[1] + 1.5, SIGN[2]);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.35), unlit(tex("signW", 512, 640, (c) => signTex(c)))); face.position.set(SIGN[0], SIGN[1] + 2.3, SIGN[2] + 0.07);
      const back = box(1.1, 1.37, 0.03, col("#8d949c"), SIGN[0], SIGN[1] + 2.3, SIGN[2] + 0.04);
      const sg = new THREE.Group(); sg.add(post, back, face); sg.position.set(SIGN[0], 0, SIGN[2]); for (const o of sg.children) o.position.x -= SIGN[0], o.position.z -= SIGN[2]; sg.rotation.y = -0.55; sh(sg); R.add(sg);
      for (let i = 0; i < 14; i++) g.add(patch(-34 + i * 5.2, 16.3, 1.3, 0.14, new THREE.MeshBasicMaterial({ color: "#f4c430" }), false, 0.035));
      for (const [x, z] of [[-8.2, 16.0], [-6.9, 14.4], [-11.2, 15.6]]) { const c = new THREE.Group(); c.add(cyl(0.2, 0.62, col("#ff7a2a"), 0, 0.33, 0, "y", 0.045, 12), box(0.5, 0.05, 0.5, col("#ff7a2a"), 0, 0.03, 0), cyl(0.13, 0.12, col("#f7f5ee"), 0, 0.36, 0, "y", 0.1, 12)); c.position.set(x, gy(x, z), z); sh(c); g.add(c); }
      R.add(g);
      const T = this.truck, Y = col("#f4c430"), tyre = col("#2a2a31");
      T.add(box(5.2, 0.7, 2.0, Y, 0, 0.95, 0), box(1.9, 0.85, 1.9, Y, -1.0, 1.72, 0), box(1.7, 0.6, 1.94, col("#9ed3ee"), -1.0, 1.78, 0), box(1.94, 0.1, 1.96, Y, -1.0, 2.18, 0),
        box(2.5, 0.5, 0.08, Y, 1.3, 1.5, 0.96), box(2.5, 0.5, 0.08, Y, 1.3, 1.5, -0.96), box(0.08, 0.5, 2.0, Y, 2.56, 1.5, 0), box(5.3, 0.18, 2.06, col("#3a3d47"), 0, 0.62, 0),
        cyl(0.3, 0.02, col("#2f5f9a"), -1.0, 1.25, 1.01, "z"));
      for (const [x, z] of [[-1.7, 1.02], [1.6, 1.02], [-1.7, -1.02], [1.6, -1.02]]) T.add(cyl(0.44, 0.3, tyre, x, 0.44, z, "z"), cyl(0.22, 0.32, col("#d9dee4"), x, 0.44, z, "z"));
      T.position.set(TRUCK[0], TRUCK[1], TRUCK[2]); T.rotation.y = 0.45; sh(T); R.add(T);
    }
    // ---- the plan board ----
    {
      const E = this.easel, face = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), unlit(tex("planW", 512, 1024, (c) => planTex(c))));
      face.position.set(0, 2.0, 0.05);
      E.add(face, box(1.2, 2.3, 0.06, M.wood, 0, 2.0, 0), box(0.08, 3.3, 0.08, M.wood, -0.5, 1.6, -0.3), box(0.08, 3.3, 0.08, M.wood, 0.5, 1.6, -0.3));
      E.children[2].rotation.x = 0.16; E.children[3].rotation.x = 0.16;
      E.position.set(EASEL[0], EASEL[1], EASEL[2]); sh(E); face.castShadow = false; R.add(E);
    }
    // ---- the news camera ----
    {
      const N = this.newsCam, dk = col("#3a3d47"), mid = col("#5b6170");
      for (const a of [0, 2.1, 4.2]) { const l = box(0.05, 1.5, 0.05, dk, 0.28 * Math.cos(a), 0.7, 0.28 * Math.sin(a)); l.rotation.set(-0.36 * Math.sin(a), 0, 0.36 * Math.cos(a)); N.add(l); }
      N.add(box(0.56, 0.36, 0.3, mid, 0, 1.58, 0), cyl(0.1, 0.3, dk, 0.42, 1.58, 0, "x", 0.13), cyl(0.17, 0.07, dk, -0.12, 1.92, 0, "z"), cyl(0.17, 0.07, dk, 0.16, 1.92, 0, "z"));
      N.position.set(REP[0] - 1.1, gy(REP[0] - 1.1, REP[2] + 0.9), REP[2] + 0.9); sh(N); R.add(N);
    }
    // ---- the car park and the sale lot ----
    const asp = tex("asphaltW", 512, 512, asphaltTex);
    M.asphalt = lam("asphaltW", () => ({ map: asp }));
    const lot = (cx: number, cz: number, w: number, d: number) => {
      R.add(patch(cx, cz, w / 2, d / 2, M.asphalt, false, 0.04, 0, 6));
      for (let i = -4; i <= 4; i++) R.add(patch(cx + i * 3.1 + 1.5, cz - 2.2, 0.07, 2.6, new THREE.MeshBasicMaterial({ color: "#e9e6da" }), false, 0.055));
    };
    lot(CAR[0], CAR[2] + 3, 90, 26); lot(DEAL[0], DEAL[2] + 2, 70, 30);
    R.add(patch(KET[0] + 1.5, KET[2] + 1, 14, 9, M.asphalt, false, 0.045, 0, 6));
    this.car = makeCar("#2fa59a"); this.car.g.position.set(CAR[0], CAR[1] + 0.04, CAR[2]); R.add(this.car.g);
    for (const [dx, dz, c, yaw] of [[6.3, -0.2, "#c8443c", 0.03], [-6.2, 0.2, "#e9dcb8", -0.04], [12.5, 0.1, "#3f6fb5", 0], [-12.4, -0.1, "#8c6f4a", 0.05]] as const) {
      const o = makeCar(c); o.g.position.set(CAR[0] + dx, PL + 0.04, CAR[2] + dz - 2.2); o.g.rotation.y = Math.PI / 2 + yaw; R.add(o.g);
    }
    this.car.g.rotation.y = 0.12;
    {
      const D = new THREE.Group();
      const hero = makeCar("#2fa59a"); hero.g.position.set(0.9, 0.04, -0.6); hero.g.rotation.y = 0.5; D.add(hero.g);
      for (const [dx, c] of [[-7.5, "#c8443c"], [8.6, "#e9dcb8"], [-14, "#3f6fb5"]] as const) { const o = makeCar(c); o.g.position.set(dx, 0.04, -4.5); o.g.rotation.y = Math.PI / 2 - 0.2; D.add(o.g); }
      const wall = box(30, 5.6, 8, col("#f1e6cf"), 0, 2.8, -15); D.add(wall);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(30, 5.6), lam("showroomW", () => ({ map: tex("showroomW", 1024, 512, (c) => showroomTex(c)) }))); front.position.set(0, 2.8, -10.98); D.add(front);
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), unlit(tex("bannerW", 1024, 1024, (c) => bannerTex(c)))); ban.position.set(0, 5.2, -2.5); D.add(ban);
      D.add(box(0.16, 7.4, 0.16, col("#d9dee4"), -2.3, 3.7, -2.56), box(0.16, 7.4, 0.16, col("#d9dee4"), 2.3, 3.7, -2.56));
      const cols = ["#e2453c", "#ffd84a", "#3f8fb5", "#f7f5ee"];
      for (let i = 0; i < 22; i++) { // pennants on two strings
        const u = i / 21, x = -13 + 26 * u, y = 9.3 - 1.3 * 4 * u * (1 - u);
        const tr = new THREE.Mesh(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.55, 0], 3)), new THREE.MeshBasicMaterial({ color: cols[i % 4], side: THREE.DoubleSide }));
        tr.position.set(x, y, -4.4); tr.scale.setScalar(1.5); D.add(tr);
      }
      D.position.set(DEAL[0], PL, DEAL[2]); sh(D); ban.castShadow = false; R.add(D);
    }
    this.packet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.21), [col("#e2453c"), col("#e2453c"), unlit(tex("packetW", 256, 160, (c) => packetTex(c))), col("#e2453c"), col("#e2453c"), col("#e2453c")]);
    this.packet.position.set(KET[0], PL + 0.065, KET[2]); this.packet.rotation.y = 0.3; sh(this.packet); R.add(this.packet);

    // ---- chunks ----
    const cm = lam("chunkW", () => ({ map: tex("chunkW", 256, 256, chunkTex) }));
    CHUNKS.forEach((c, i) => {
      const flat = i === 0;
      const m = new THREE.Mesh(lumpGeo(i * 1.7 + 1, 1, 0.28).scale(flat ? 1.0 : 0.95 * c.s, flat ? 0.3 : 0.6 * c.s, flat ? 0.62 : 0.75 * c.s), cm);
      sh(m); m.visible = false; this.chunks.push(m); R.add(m);
    });
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

  private props(id: number, f: number, st: State, camPos: THREE.Vector3) {
    const name = SHOTS[id - 1].name, t = f / FPS;
    // whale
    this.whale.visible = st.whale === "whole" || st.whale === "blasted";
    this.whaleWhole.visible = st.whale === "whole"; this.whaleHead.visible = st.whale === "blasted";
    this.blasted.visible = st.whale === "blasted"; this.boulder.visible = st.whale === "boulder";
    if (st.whale === "boulder") { const k = 1 + 0.12 * Math.sin(clamp01((f - 548) / 8) * Math.PI); this.boulder.scale.set(k, k, k); }
    // crates pop in with a little overshoot
    this.crates.forEach((m, k) => {
      m.visible = k < st.crates;
      let s = 1;
      if (name === "crates") { const n = f - (CRATES0 + ((CRATES1 - CRATES0) * k) / 20); s = n < 0 ? 0 : 1 + 0.25 * Math.sin(clamp01(n / 7) * Math.PI) * (1 - clamp01(n / 7)) - (1 - clamp01(n / 3)) * 0.6; }
      m.scale.setScalar(Math.max(0.001, s));
    });
    this.plungers[0].g.visible = st.hookPlunger; this.plungers[1].g.visible = id >= 10 && id <= 26 && !st.hookPlunger;
    for (const p of this.plungers) p.handle.position.y = 0.36 - 0.36 * st.plunger;
    this.wires[0].visible = st.hookPlunger; this.wires[1].visible = id >= 10 && id <= 14;
    this.roadKit.visible = id >= 4 && id <= 6; this.truck.visible = id >= 5 && id <= 13 || id === 24;
    this.easel.visible = id >= 6 && id <= 9; this.newsCam.visible = id >= 11 && id <= 18;
    // the car: the roof gives way, the body dips and settles
    const k = st.carCrush, n = f - SLAB;
    this.car.cabin.scale.set(1 + 0.05 * k, 1 - 0.72 * k, 1 + 0.06 * k);
    this.car.body.position.y = k > 0 ? -0.07 * Math.exp(-n / 9) * Math.cos(n * 0.9) - 0.03 : 0;
    this.car.cabin.position.y = 0.97 + this.car.body.position.y;
    this.packet.visible = id === 22 || id === 23;
    this.packet.scale.y = f >= STOMP ? 0.35 : 1;
    // surf
    this.foam.forEach((m, i) => {
      const p = m.geometry.attributes.position as THREE.BufferAttribute, ph = t * 0.55 + i * 2.1, reach = 2.2 + 1.8 * Math.sin(ph) - i * 1.6;
      for (let j = 0; j < p.count / 2; j++) {
        const x = p.getX(j * 2), z = reach + 0.6 * Math.sin(x * 0.09 + t * 0.7 + i * 1.3) + 0.3 * Math.sin(x * 0.31 + i), w = 0.35 + 0.2 * Math.sin(x * 0.17 + i * 2 + t);
        const y = Math.max(0.02, gy(x, z)) + 0.025 + 0.004 * i;
        p.setXYZ(j * 2, x, y, z); p.setXYZ(j * 2 + 1, x, Math.max(0.02, gy(x, z - w)) + 0.025 + 0.004 * i, z - w);
      }
      p.needsUpdate = true;
    });
    // chunks
    const showChunks = st.blast >= 0 && id !== 27;
    this.chunks.forEach((m, i) => {
      const c = CHUNKS[i];
      m.visible = showChunks;
      if (!showChunks) return;
      if (id === 1 || id === 21) { // the hook's first frames and the replay from above: straight out in every direction
        const nb = st.blast, a = (i / 12) * Math.PI * 2 + hh(i, 71), r = (4 + 34 * easeOut(nb / (id === 1 ? 26 : 56)) * (0.5 + 0.5 * hh(i, 72)));
        const x = WH[0] + r * Math.cos(a), z = WH[2] + r * Math.sin(a) * (id === 1 ? 0.4 : 1) + (id === 1 ? 2 : 0), up = id === 1 ? 14 * easeOut(nb / 20) * hh(i, 73) : 3 * Math.sin(clamp01(nb / 56) * Math.PI);
        m.position.set(x, gy(x, z) + 0.4 + up, z); m.rotation.set(nb * 0.2 * c.spin * 0.2, nb * 0.13, i);
        m.visible = i < 30;
        return;
      }
      const { p, landed, u } = chunkAt(c, f);
      m.position.set(p[0], p[1], p[2]);
      if (landed) { m.rotation.set(0, i * 1.3, i === 0 ? 0.04 : 0.12 * Math.sin(i)); const sq = 1 - 0.25 * Math.exp(-(f - c.land) / 3); m.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); }
      else { m.rotation.set(u * 14 * c.spin, u * 9, i); m.scale.setScalar(1); }
      if (i === 0 && id < 19) m.visible = !landed;
      if (id === 16) m.scale.setScalar(2.2 + 2.2 * clamp01((f - 1203) / 31));
      if (m.position.distanceTo(camPos) < (id === 20 ? 14 : 4.5) && id !== 16 && id !== 17) m.visible = false;
    });
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], st = stateAt(id, f);
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
    this.props(id, f, st, cam.position);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, f, st, { pos: cam.position, right });
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
/** crate faces keep their painted colours in shade (lit Lambert with the map, two-tone like everything else) */
function unlitLam(key: string, map: THREE.Texture) { return lam(key, () => ({ map })); }

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
  vec2 wp = vWP.xz + vec2(0.2 * wTime, 0.5 * wTime);     // swell rolling toward the beach
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
