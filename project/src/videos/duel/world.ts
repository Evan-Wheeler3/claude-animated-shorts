// The duel as one three.js scene: the saloon interior at the origin and the main street at x = 100, the props and the cast.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V, lam } from "./build";
import { ctex, cloudHD, waterNear, waterFar } from "./paint";
import { floorTex, plankWall, darkWood, paperTex, earthTex, facadeTex, wantedTex, mirrorTex } from "./fxd";
import { woodTex } from "./fxw";
import { shade } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, gy, V3, SX, YOU_ST, GUN_ST, SALOON_DOOR, WALL, ROOF, DOOR, OUTSIDE, smooth, easeOut, clamp01 } from "./story";

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
const swing = (n: number) => (n < 0 ? 0 : 1.15 * Math.exp(-n / 16) * Math.cos(n * 0.32));
const flatTex = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
/** a pair of swinging saloon doors centred on the origin, gap along x (width w); returns the two hinge groups */
const swingDoors = (M: THREE.Material, w = 1.8) => {
  const g = new THREE.Group(), leaves: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group(); h.position.x = s * w / 2;
    const leaf = new THREE.Group();
    leaf.add(box(w / 2 - 0.04, 0.9, 0.05, M, -s * (w / 4), 1.15, 0));
    for (let k = 0; k < 4; k++) leaf.add(box(0.06, 0.66, 0.06, M, -s * (0.1 + k * 0.19), 1.15, 0.0));
    leaf.add(box(w / 2 - 0.04, 0.1, 0.07, M, -s * (w / 4), 1.62, 0), box(w / 2 - 0.04, 0.1, 0.07, M, -s * (w / 4), 0.72, 0));
    h.add(leaf); g.add(h); leaves.push(h);
  }
  return { g: sh(g), leaves };
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
  private inDoors: THREE.Group[] = []; private outDoors: THREE.Group[] = [];
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

    // ---- ground: one dusty plain under everything ----
    const earth = tex("earthD", 512, 512, earthTex);
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), lam("earthD", () => ({ map: flatTex(earth, 100, 100) }))); m.position.set(100, 0, -60); m.receiveShadow = true; R.add(m); }
    M.wood = lam("woodD", () => ({ map: tex("woodD", 256, 256, woodTex) })); M.dark = lam("darkD", () => ({ map: tex("darkD", 256, 256, darkWood) }));
    M.plank = lam("plankD", () => ({ map: tex("plankD", 512, 512, plankWall) })); M.mesa = col("#c46a44"); M.mesa2 = col("#b0563a");
    M.brass = col("#d9aa3a"); M.iron = col("#3a3d47"); M.felt = col("#3f7a4a");

    // ================= the saloon (origin) =================
    {
      const S = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12).rotateX(-Math.PI / 2), lam("floorD", () => ({ map: flatTex(tex("floorD", 512, 512, floorTex), 4, 3.5) })));
      floor.position.y = 0.01; floor.receiveShadow = true; S.add(floor);
      const paper = lam("paperD", () => ({ map: flatTex(tex("paperD", 512, 512, paperTex), 3, 1) })), wains = lam("wainsD", () => ({ map: flatTex(tex("plankD", 512, 512, plankWall), 4, 0.5) }));
      const wall = (w: number, x: number, z: number, ry: number) => {
        const g = new THREE.Group();
        const up = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.1), paper); up.position.y = 2.75;
        const lo = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2), wains); lo.position.y = 0.6;
        g.add(up, lo, box(w, 0.1, 0.08, M.dark, 0, 1.22, 0.04)); g.position.set(x, 0, z); g.rotation.y = ry; return g;
      };
      S.add(wall(14, 0, -6, 0), wall(12, -7, 0, Math.PI / 2), wall(12, 7, 0, -Math.PI / 2));
      // front wall with the door gap and two bright windows
      const fw = new THREE.Group();
      for (const [x, w] of [[-4.0, 6.2], [4.0, 6.2]]) { const a = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.3), M.plank); a.position.set(x, 2.15, 0); fw.add(a); }
      const top = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.3), M.plank); top.position.set(0, 3.15, 0); fw.add(top);
      for (const x of [-4, 4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.4, 1.15) })); w.position.set(x, 1.9, -0.02); fw.add(w, box(1.9, 0.1, 0.1, M.dark, x, 1.1, -0.05), box(1.9, 0.1, 0.1, M.dark, x, 2.7, -0.05), box(0.08, 1.6, 0.08, M.dark, x, 1.9, -0.05)); }
      fw.position.z = 6; fw.rotation.y = Math.PI; S.add(fw);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.15) })); glow.position.set(0, 2.2, 9); glow.rotation.y = Math.PI; S.add(glow);
      const dIn = swingDoors(M.wood); dIn.g.position.set(0, 0, 6); S.add(dIn.g); this.inDoors = dIn.leaves;
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 12).rotateX(Math.PI / 2), M.dark); ceil.position.y = 4.3; ceil.castShadow = false; S.add(ceil);
      for (let k = -2; k <= 2; k++) S.add(box(0.25, 0.25, 12, M.dark, k * 3, 4.15, 0));
      // the bar
      S.add(box(9.2, 1.08, 0.7, M.dark, -1.4, 0.54, -3.6), box(9.5, 0.08, 0.95, M.wood, -1.4, 1.12, -3.55), cyl(0.04, 9.2, M.brass, -1.4, 0.18, -3.12, "x"));
      for (let k = 0; k < 6; k++) S.add(box(0.06, 0.8, 0.02, M.wood, -5.4 + k * 1.6, 0.55, -3.24));
      // back shelves, bottles, mirror
      S.add(box(9, 0.06, 0.4, M.wood, -1.4, 1.55, -5.75), box(9, 0.06, 0.4, M.wood, -1.4, 2.15, -5.75), box(9, 1.2, 0.3, M.dark, -1.4, 0.6, -5.8));
      const mir = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), unlit(tex("mirrorD", 512, 256, (g) => mirrorTex(g)))); mir.position.set(-1.2, 3.2, -5.95); S.add(mir);
      {
        const N = 64, im = new THREE.InstancedMesh(mergeGeometries([new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10).translate(0, 0.13, 0), new THREE.CylinderGeometry(0.025, 0.04, 0.12, 8).translate(0, 0.31, 0)], false)!, lam("bottleD", () => ({ color: "#ffffff" })), N), cc = new THREE.Color(), q0 = new THREE.Quaternion();
        for (let i = 0; i < N; i++) { const row = i % 2, x = -5.6 + Math.floor(i / 2) * 0.27 + hh(i, 1) * 0.05; im.setMatrixAt(i, this.m4.compose(V(x, row ? 1.58 : 2.18, -5.72), q0, V(1, 0.85 + 0.4 * hh(i, 2), 1))); im.setColorAt(i, cc.set(["#3f8a4a", "#8a5a2a", "#4a7aa8", "#c9933a", "#7a2a3a"][i % 5])); }
        im.castShadow = true; S.add(im);
      }
      // tables, chairs, piano, a spittoon
      for (const [x, z] of [[-3.4, 1.2], [3.6, 0.6]]) {
        S.add(cyl(0.62, 0.06, M.wood, x, 0.78, z, "y", 0.62, 24), cyl(0.07, 0.76, M.dark, x, 0.38, z), cyl(0.32, 0.04, M.dark, x, 0.02, z), cyl(0.08, 0.2, col("#e6f2f8"), x + 0.15, 0.9, z + 0.1));
        for (const a of [0.6, 2.6, 4.2]) { const cx = x + 0.95 * Math.cos(a), cz = z + 0.95 * Math.sin(a); S.add(box(0.42, 0.06, 0.42, M.wood, cx, 0.46, cz), box(0.05, 0.46, 0.05, M.dark, cx - 0.17, 0.23, cz - 0.17), box(0.05, 0.46, 0.05, M.dark, cx + 0.17, 0.23, cz + 0.17)); }
      }
      { const P = new THREE.Group(); P.add(box(1.6, 1.3, 0.6, M.dark, 0, 0.65, 0), box(1.6, 0.06, 0.66, M.wood, 0, 1.33, 0), box(1.4, 0.06, 0.25, col("#f7f5ee"), 0, 0.9, 0.38), box(1.5, 0.5, 0.06, M.wood, 0, 1.6, -0.27)); P.position.set(-6.4, 0, -1.6); P.rotation.y = Math.PI / 2; S.add(P); }
      S.add(cyl(0.18, 0.3, M.brass, 1.6, 0.15, -2.6, "y", 0.24, 14));
      const post = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), unlit(tex("wantedD", 256, 340, (g) => wantedTex(g)))); post.position.set(4.8, 2.3, -5.94); S.add(post);
      // oil lamps (bright: they bloom)
      for (const [x, z] of [[-3.2, -0.6], [3.2, 0.2], [-0.4, -3.0]]) S.add(cyl(0.012, 0.9, M.iron, x, 3.85, z), cyl(0.13, 0.26, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 0.9) }), x, 3.3, z, "y", 0.1, 12), cyl(0.2, 0.05, M.brass, x, 3.45, z));
      sh(S); for (const o of [ceil, glow]) o.castShadow = false;
      S.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.parent === S && (o as THREE.Mesh).geometry.type === "PlaneGeometry") o.castShadow = false; });
      R.add(S);
    }

    // ================= the street (x = 100) =================
    {
      const W: [string, string, string, boolean][] = [["HOTEL", "#c9a46a", "#7a2a2a", false], ["SALOON", "#a8463a", "#3a302a", true], ["BANK", "#5d7a9a", "#2f3f5a", false], ["BARBER", "#e9dcc0", "#8c3b4a", false],
        ["GENERAL STORE", "#b5653f", "#3a302a", false], ["ASSAY", "#7a8a4a", "#3a3d47", false], ["DRUGS", "#c9a227", "#5a3a22", false], ["FEED", "#8c6f4a", "#3a302a", false], ["LIVERY", "#a8463a", "#3a302a", false], ["POST", "#e9dcc0", "#2f5f6a", false], ["GUNSMITH", "#6a5a8a", "#2a2428", false], ["HOTEL", "#c9a46a", "#5a3a22", false]];
      const E: [string, string, string][] = [["SHERIFF", "#c9a46a", "#3a302a"], ["STABLE", "#8c3b4a", "#3a302a"], ["", "", ""], ["BAKERY", "#e9dcc0", "#b5653f"], ["TELEGRAPH", "#5d7a9a", "#2f3f5a"], ["SALOON", "#7a8a4a", "#3a302a"],
        ["CHURCH", "#f1ece0", "#5a3a22"], ["HARDWARE", "#b5653f", "#2a2428"], ["MILLINER", "#d95f8a", "#5a3a22"], ["THEATRE", "#7a2a2a", "#c9933a"], ["LAND OFFICE", "#c9a227", "#3a302a"], ["DOCTOR", "#e9dcc0", "#2f5f6a"]];
      const front = (x: number, z: number, side: number, name: string, base: string, trim: string, h: number, saloon = false) => {
        const g = new THREE.Group();
        const face = new THREE.Mesh(new THREE.PlaneGeometry(7.4, h), lam("fac" + name + base, () => ({ map: tex("fac" + name + base, 512, 640, facadeTex(name, base, trim, saloon)) })));
        face.position.set(0, 0.3 + h / 2, 0.01); g.add(face, box(7.4, h * 0.75, 9, col(shade(base, 0.85)), 0, 0.3 + h * 0.375, -4.6));
        g.add(box(7.6, 0.3, 2.6, M.wood, 0, 0.15, 1.3));
        for (const px of [-3.5, 3.5]) g.add(box(0.14, 3.2, 0.14, M.wood, px, 1.9, 2.45));
        g.add(box(7.6, 0.08, 2.7, col(shade(trim, 1.2)), 0, 3.5, 1.35));
        g.position.set(x, 0, z); g.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; sh(g); R.add(g);
      };
      W.forEach(([n, b, tr, sal], k) => front(92.4, 14 - k * 9, 1, n, b, tr, sal ? 8 : 6.6 + (k % 3) * 0.7, sal));
      E.forEach(([n, b, tr], k) => { if (n) front(107.6, 13 - k * 9 - (k === 2 ? 0 : 0), -1, n, b, tr, k === 1 ? 6.1 : 6.6 + (k % 3) * 0.7); });
      // the bullet-hole wall in the gap on the east side, a barrel in front with the can on it
      { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.8), lam("plankWD", () => ({ map: flatTex(tex("plankD", 512, 512, plankWall), 2, 0.8) }))); p.position.y = 1.4; g.add(p);
        g.position.set(WALL[0], 0, WALL[2]); g.rotation.y = -Math.PI / 2; R.add(g); R.add(sh(cyl(0.34, 0.95, col("#8a5a34"), WALL[0] - 0.55, 0.47, WALL[2] - 0.05, "y", 0.3, 16))); }
      // the saloon's swinging doors (street side)
      { const d = swingDoors(M.wood, 1.75); d.g.position.set(SALOON_DOOR[0] + 0.02, 0.3, SALOON_DOOR[2]); d.g.rotation.y = Math.PI / 2; R.add(d.g); this.outDoors = d.leaves; }
      // hitching rails, a trough, barrels, the fence with the bottles behind the gunfighter
      for (const z of [8, -2, -20, -40]) R.add(sh(box(0.1, 0.1, 3, M.wood, 95.2, 0.95, z)), sh(box(0.12, 0.95, 0.12, M.wood, 95.2, 0.47, z - 1.4)), sh(box(0.12, 0.95, 0.12, M.wood, 95.2, 0.47, z + 1.4)));
      R.add(sh(box(0.7, 0.55, 2.2, M.wood, 104.6, 0.28, 6)), sh(box(0.6, 0.04, 2.1, col("#4a7aa8"), 104.6, 0.5, 6)));
      for (const [x, z] of [[94.2, 0.5], [94.5, -11], [105.7, -3], [105.8, -27]]) R.add(sh(cyl(0.34, 0.95, col("#8a5a34"), x, 0.47, z, "y", 0.3, 16)));
      { const g = new THREE.Group(); g.add(box(3.2, 0.08, 0.1, M.wood, 0, 1.12, 0), box(3.2, 0.08, 0.1, M.wood, 0, 0.6, 0)); for (const x of [-1.5, 0, 1.5]) g.add(box(0.1, 1.2, 0.1, M.wood, x, 0.6, 0)); g.position.set(GUN_ST[0], 0, GUN_ST[2] - 2.4); sh(g); R.add(g); }
      // telegraph poles and the far country
      for (let k = 0; k < 8; k++) { const z = 20 - k * 30; R.add(sh(cyl(0.1, 7, M.wood, 108.6, 3.5, z)), sh(box(1.2, 0.08, 0.08, M.wood, 108.6, 6.6, z))); }
      for (let i = 0; i < 12; i++) { const x = -140 + i * 50 + hh(i, 1) * 20, z = -280 - hh(i, 2) * 60, s = 40 + hh(i, 3) * 40; const m = new THREE.Mesh(lumpGeo(i, 1, 0.1).scale(s, 22 + hh(i, 4) * 20, s * 0.6), i % 2 ? M.mesa : M.mesa2); m.position.set(x + 100, 0, z); sh(m, false); R.add(m); }
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
    const name = SHOTS[id - 1].name;
    const a = name === "outside" ? swing(f - (OUTSIDE + 22)) : 0;
    this.inDoors.forEach((d, k) => { d.rotation.y = (k ? -1 : 1) * a; });
    const b = name === "walkback" ? swing(f - DOOR) : 0;
    this.outDoors.forEach((d, k) => { d.rotation.y = (k ? 1 : -1) * b; });
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

