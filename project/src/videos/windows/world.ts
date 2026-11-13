// "Why Plane Windows Are Round" as one three.js scene: the Comet at cruise, the airport, the water-tank hangar, the explainer wall, the stream, the desk, the modern jet and its cabin.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V, lam } from "./build";
import { ctex, cloudHD, waterNear, waterFar } from "./paint";
import { fuselageTex, terminalTex, hangarTex, panelTex, cabinWallTex, seatTex, tankTex } from "./fxp";
import { woodTex } from "./fxw";
import { shade } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, gy, V3, SKY, TARMAC, NEWS, HANGAR, PANEL, STREAM, DESK, MODERN, CABIN, FR, PLANE_SKY, PLANE_TAR, PLANE_TANK, PLANE_MOD, swellAt, pulseAt, LAND, SHRINK, smooth, easeOut, clamp01 } from "./story";

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

// ---------------- the airliner ----------------
/** fuselage tube along x (x0..x1), radius r; uv u along the body (tail 0 .. nose 1), v around from the belly (v 0.25 = +z side) */
const tubeGeo = (x0: number, x1: number, r: number, nx = 48, nr = 40) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nx; i++) for (let k = 0; k <= nr; k++) {
    const u = i / nx, v = k / nr, a = 2 * Math.PI * v;
    pos.push(x0 + (x1 - x0) * u, -Math.cos(a) * r, Math.sin(a) * r); uv.push(u, v);
  }
  for (let i = 0; i < nx; i++) for (let k = 0; k < nr; k++) { const a = i * (nr + 1) + k, b = a + 1, c = a + nr + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
type Plane = { g: THREE.Group; body: THREE.Group };
const makePlane = (round: boolean, livery: string, stripe: string, title: string, gear: boolean, wings = true): Plane => {
  const g = new THREE.Group(), body = new THREE.Group();
  const skin = lam(`fus${round}${title}`, () => ({ map: tex(`fus${round}${title}`, 2048, 512, fuselageTex(round, livery, stripe, title)) }));
  const metal = col("#d9dee4"), dark = col("#3a3d47"), tailCol = col(livery);
  body.add(new THREE.Mesh(tubeGeo(-12, 12, FR), skin));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(FR, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(2.6, 1, 1), metal); nose.position.x = 12; body.add(nose);
  const cock = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.5, 1.15), col("#2a3a5a")); cock.position.set(13.4, 0.8, 0); body.add(cock);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(FR, 7, 32, 1, true).rotateZ(Math.PI / 2), metal); tail.position.x = -15.5; body.add(tail);
  g.add(body);
  if (wings) {
    const wing = (s: number) => {
      const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(14, -6), new THREE.Vector2(14, -8.2), new THREE.Vector2(-1, -6.6)]);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: false }).rotateX(-Math.PI / 2), metal);
      m.scale.set(1, 1, s); m.position.set(3.4, -0.9, 0); m.rotation.y = 0; return m;
    };
    // the shape is drawn in x (span) / y (chord): turn it so the span runs along z
    for (const s of [1, -1]) { const w = wing(1); w.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; w.scale.z = 1; w.position.set(3.4 - 0.5, -0.9, 0); if (s < 0) w.scale.x = -1; g.add(w);
      // the Comet's engines sit buried in the wing roots: intakes at the leading edge
      for (const k of [0, 1]) { const e = cyl(0.36, 3.2, dark, 2.6, -0.75, s * (2.0 + k * 0.85), "x"); g.add(e); g.add(cyl(0.3, 0.06, col("#16171b"), 4.22, -0.75, s * (2.0 + k * 0.85), "x")); } }
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(5, 0), new THREE.Vector2(1.6, 5.4), new THREE.Vector2(-0.6, 5.4)]), { depth: 0.24, bevelEnabled: false }), tailCol);
    fin.position.set(-17.5, 0.6, -0.12); g.add(fin);
    for (const s of [1, -1]) { const st = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(3.6, 0), new THREE.Vector2(1.4, 5), new THREE.Vector2(-0.4, 5)]), { depth: 0.18, bevelEnabled: false }).rotateX(Math.PI / 2), metal); st.position.set(-17.4, 0.6, 0); st.scale.y = s; if (s < 0) st.scale.z = -1; g.add(st); }
  }
  if (gear) for (const [x, z] of [[10.5, 0], [1.8, 2.6], [1.8, -2.6]]) g.add(cyl(0.1, 1.4, dark, x, -FR - 0.2, z), cyl(0.5, 0.36, col("#2a2a31"), x, -FR - 0.95, z, "z"));
  return { g: sh(g), body };
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
  private pSky: Plane; private pTar: Plane; private pTank: Plane; private pMod: Plane;
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

    // ---- ground: grass everywhere, concrete aprons ----
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1400).rotateX(-Math.PI / 2), col("#7fae5a")); m.position.set(500, 0, 0); m.receiveShadow = true; R.add(m); }
    M.concrete = col("#c9c6be"); M.metal = col("#8a96a4"); M.wood = lam("woodW", () => ({ map: tex("woodW", 256, 256, woodTex) }));
    const slab = (x: number, z: number, w: number, d: number, m = M.concrete) => { const s = box(w, 0.04, d, m, x, 0.02, z); s.receiveShadow = true; R.add(s); };

    // ---- the Comet at cruise, and its twin parked at the airport ----
    this.pSky = makePlane(false, "#2f4f8a", "#c9a227", "COMET", false); this.pSky.g.position.set(...PLANE_SKY); R.add(this.pSky.g);
    this.pTar = makePlane(false, "#2f4f8a", "#c9a227", "COMET", true); this.pTar.g.position.set(...PLANE_TAR); R.add(this.pTar.g);
    {
      const T = TARMAC; slab(T[0], T[2], 160, 70);
      const term = new THREE.Group(); term.add(box(60, 9, 14, col("#e9dcc0"), 0, 4.5, 0));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(60, 9), lam("termW", () => ({ map: tex("termW", 1024, 512, terminalTex) }))); face.position.set(0, 4.5, 7.02); term.add(face);
      term.add(cyl(2.2, 14, col("#e9dcc0"), 24, 7, 0), cyl(3.2, 3, col("#9ed3ee"), 24, 15.5, 0, "y", 3.2, 16), cyl(3.6, 0.4, col("#2f5f6a"), 24, 17.2, 0));
      term.position.set(T[0] - 6, 0, T[2] - 34); sh(term); R.add(term);
      // boarding stairs at the front door
      const st = new THREE.Group(); for (let k = 0; k < 9; k++) st.add(box(1.2, 0.12, 0.42, M.metal, 0, 0.3 + k * 0.3, k * -0.36)); st.add(box(0.06, 1, 3.4, M.metal, 0.6, 2.2, -1.5), box(0.06, 1, 3.4, M.metal, -0.6, 2.2, -1.5), box(1.4, 0.5, 1.6, col("#c9a227"), 0, 0.25, 0.9));
      st.position.set(T[0] + 8, 0, T[2] + 5.0); st.rotation.y = 0; sh(st); R.add(st);
      // the newsstand
      const N = new THREE.Group(); N.add(box(2.6, 1.0, 1.0, col("#8c3b4a"), 0, 0.5, -0.4), box(2.8, 0.12, 1.6, col("#c9a227"), 0, 2.5, -0.2), box(0.1, 2.5, 0.1, M.metal, -1.3, 1.25, -0.9), box(0.1, 2.5, 0.1, M.metal, 1.3, 1.25, -0.9), box(2.6, 1.4, 0.06, col("#5a3a22"), 0, 1.6, -0.9));
      N.position.set(NEWS[0], 0, NEWS[2]); sh(N); R.add(N);
    }

    // ---- the water-tank hangar ----
    {
      const H = HANGAR; slab(H[0], H[2], 60, 40);
      const wallM = lam("hangW", () => ({ map: tex("hangW", 512, 512, hangarTex) }));
      const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 18), wallM); back.position.set(H[0], 9, H[2] - 12); R.add(back);
      for (const x of [-30, 30]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), wallM); sw.position.set(H[0] + x, 9, H[2] + 4); sw.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; R.add(sw); }
      for (let k = -2; k <= 2; k++) R.add(sh(box(0.5, 16, 0.5, col("#5b6170"), H[0] + k * 12, 8, H[2] - 11.5)), sh(box(0.5, 0.6, 24, col("#5b6170"), H[0] + k * 12, 16, H[2])));
      // the tank: frame, glass sides, water
      const T = new THREE.Group(), fr = col("#3a4a5a");
      for (const x of [-14, 14]) for (const z of [-3.2, 3.2]) T.add(box(0.3, 4.8, 0.3, fr, x, 2.4, z));
      for (const z of [-3.2, 3.2]) T.add(box(28.3, 0.3, 0.3, fr, 0, 4.7, z), box(28.3, 0.3, 0.3, fr, 0, 0.15, z));
      const water = new THREE.Mesh(new THREE.BoxGeometry(28, 4.3, 6.4), new THREE.MeshLambertMaterial({ color: "#6fc0e6", transparent: true, opacity: 0.32, depthWrite: false }));
      water.position.y = 2.3; water.renderOrder = 2; water.castShadow = false; T.add(water);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(28, 6.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex("tankW", 512, 512, (g) => tankTex(g)), transparent: true, opacity: 0.55, depthWrite: false }));
      surf.position.y = 4.45; surf.renderOrder = 3; T.add(surf);
      T.position.set(H[0], 0, H[2]); sh(T); water.castShadow = false; surf.castShadow = false; R.add(T);
      this.pTank = makePlane(false, "#8a96a4", "#c9ced6", "", false, false); this.pTank.g.position.set(...PLANE_TANK); this.pTank.g.scale.set(0.96, 0.96, 0.96); R.add(this.pTank.g);
      // crane over the tank, the pump machine with its gauge, the board stand
      R.add(sh(box(0.6, 0.8, 26, col("#c9a227"), H[0], 11, H[2])), sh(box(1.4, 1, 1.4, col("#c9a227"), H[0], 10.4, H[2])), sh(cyl(0.03, 6, col("#2a2a31"), H[0] - 0.4, 7.4, H[2])), sh(cyl(0.03, 6, col("#2a2a31"), H[0] + 0.4, 7.4, H[2])));
      R.add(sh(box(1.6, 1.8, 1.0, col("#5d7a3a"), H[0] - 9.3, 0.9, H[2] + 6.0)), sh(cyl(0.12, 6, col("#3a3d47"), H[0] - 9.3, 0.6, H[2] + 4.6, "z")));
      R.add(sh(box(0.12, 2.4, 0.12, col("#3a3d47"), H[0] - 12.2, 1.2, H[2] + 7.25)));
    }

    // ---- the explainer wall, the stream, the desk ----
    {
      const P = PANEL;
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), lam("panelW", () => ({ map: tex("panelW", 1024, 512, panelTex) }))); wall.position.set(P[0], 4.5, P[2] - 0.02); wall.receiveShadow = true; R.add(wall);
      slab(P[0], P[2] + 6, 24, 14, col("#d9dde2"));
      const S = STREAM;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(9, 16).rotateX(-Math.PI / 2), col("#3f9ad0")); water.position.set(S[0], 0.28, S[2]); water.receiveShadow = true; R.add(water);
      for (const s of [-1, 1]) { const b = new THREE.Mesh(lumpGeo(s + 4, 2, 0.1).scale(3, 0.8, 9), col("#6f9a4a")); b.position.set(S[0] + s * 6, 0.2, S[2]); sh(b); R.add(b); }
      const rock = new THREE.Mesh(lumpGeo(3, 1, 0.2).scale(1.2, 0.8, 1.0), col("#8d8a86")); rock.position.set(S[0], 0.45, S[2]); sh(rock); R.add(rock);
      const D = DESK; R.add(sh(box(3.0, 0.1, 1.4, M.wood, D[0], 0.95, D[2] - 0.4)), sh(box(3.0, 0.9, 1.2, col("#6a4028"), D[0], 0.45, D[2] - 0.45)));
      const dw = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), col("#e9dcc0")); dw.position.set(D[0], 2.5, D[2] - 1.2); R.add(dw);
    }

    // ---- the modern jet at a gate ----
    {
      this.pMod = makePlane(true, "#2fa59a", "#f2c94c", "SKYLINE", true); this.pMod.g.position.set(...PLANE_MOD); this.pMod.g.scale.setScalar(1.05); R.add(this.pMod.g);
      slab(MODERN[0], MODERN[2], 120, 70);
      const term = box(70, 12, 10, col("#9ed3ee"), MODERN[0] - 4, 6, MODERN[2] - 30); R.add(sh(term));
      R.add(sh(box(2.6, 2.6, 16, col("#c9ced6"), MODERN[0] + 9, 3.2, MODERN[2] - 11)));
    }

    // ---- the modern cabin (seats face +x, the window wall at z = -1.6) ----
    {
      const C = CABIN, Cg = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 4).rotateX(-Math.PI / 2), col("#5a6070")); floor.position.set(0, 0.01, 0); Cg.add(floor);
      const wallM = lam("cabW", () => ({ map: tex("cabW", 512, 512, (g) => cabinWallTex(g)) }));
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), wallM); wall.position.set(0, 1.3, -1.6); Cg.add(wall);
      const wall2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), wallM); wall2.position.set(0, 1.3, 2.0); wall2.rotation.y = Math.PI; Cg.add(wall2);
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.6).rotateX(Math.PI / 2), col("#f2f3f5")); ceil.position.set(0, 2.5, 0.2); Cg.add(ceil);
      Cg.add(box(14, 0.5, 0.7, col("#e8eaee"), 0, 2.15, -1.25));
      // windows: a dark oval frame with a bright sky behind, one per row
      for (let k = -3; k <= 3; k++) {
        const x = k * 1.9 + 0.05;
        const frame = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24).scale(1, 1.35, 1), col("#c9ced6")); frame.position.set(x, 1.18, -1.585); Cg.add(frame);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24).scale(1, 1.35, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.35, 1.6) })); glass.position.set(x, 1.18, -1.58); Cg.add(glass);
        // seats (three abreast by the window)
        const seat = lam("seatW", () => ({ map: tex("seatW", 256, 256, seatTex) }));
        for (const z of [-1.0, -0.4, 0.2]) Cg.add(box(0.5, 0.12, 0.5, seat, x - 0.6, 0.45, z), box(0.14, 0.9, 0.5, seat, x - 0.92, 0.9, z), box(0.5, 0.45, 0.06, col("#3a3d47"), x - 0.6, 0.22, z + 0.22));
      }
      Cg.position.set(C[0], 0, C[2]); sh(Cg); for (const o of [wall, wall2, ceil]) o.castShadow = false; R.add(Cg);
    }
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
    const name = SHOTS[id - 1].name, sw = swellAt(id, f);
    // the cruise: a slow bank and bob; the hit rocks it
    const bob = 0.25 * Math.sin(f / 26), roll = 0.04 * Math.sin(f / 33) + (name === "break" ? 0.06 * Math.sin((f - 111) * 0.9) * Math.exp(-(f - 111) / 30) : 0);
    this.pSky.g.position.set(PLANE_SKY[0], PLANE_SKY[1] + bob, PLANE_SKY[2]); this.pSky.g.rotation.set(roll, 0, 0.02 * Math.sin(f / 41));
    this.pSky.g.visible = ["cruise", "break", "windows", "fast", "quiet", "thin", "swell"].includes(name);
    if (name === "fast") this.pSky.g.position.x = PLANE_SKY[0] + 30 - 1.9 * (f - 300);
    this.pSky.body.scale.set(1, 1 + 0.12 * sw, 1 + 0.12 * sw);
    // landing: the parked twin becomes the landing plane, coming in along x and squashing back
    if (name === "land") {
      const n = f - 1115, x = PLANE_TAR[0] + 30 - 0.35 * n, y = PLANE_TAR[1] + Math.max(0, (LAND - f) * 0.09);
      this.pTar.g.position.set(x, y, PLANE_TAR[2]); this.pTar.g.rotation.set(0, 0, Math.max(0, (LAND - f) * 0.002));
      this.pTar.body.scale.set(1, 1 + 0.12 * sw, 1 + 0.12 * sw);
    } else { this.pTar.g.position.set(...PLANE_TAR); this.pTar.g.rotation.set(0, 0, 0); this.pTar.body.scale.set(1, 1, 1); }
    // the tank: every pump swells the fuselage a little
    const pu = name === "pump" ? pulseAt(f) : 0; this.pTank.body.scale.set(1, 1 + 0.04 * pu, 1 + 0.04 * pu);
    this.pTank.g.position.y = name === "tank" ? PLANE_TANK[1] + 6 * (1 - smooth((f - 520) / 70)) : PLANE_TANK[1];
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

