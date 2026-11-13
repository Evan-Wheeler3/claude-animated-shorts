// "The Trojan Horse" as one three.js scene: the walls of Troy, the plain and the beach, the wooden horse, the study,
// the backyard and the mound at Hisarlik cut open in layers.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V, lam } from "./build";
import { ctex, cloudHD, waterNear, waterFar } from "./paint";
import { horseWood, stoneWall, sandTex, woodTex2, shelfTex, strataTex } from "./fxr";
import { woodTex } from "./fxw";
import { shade } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, gy, V3, GATE, HORSE0, CAMP, BEACH, LIB, YARD, HILL, LAYERS, LAYER_H, horseAt, gateAt, trenchAt, shakeAt, CLIMB, smooth, easeOut, clamp01 } from "./story";

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

// ---------------- the wooden horse ----------------
/** a limb or neck: a tapered cylinder from a to b */
const limb = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: THREE.Material, seg = 12) => {
  const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), seg); const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return m;
};
type Horse = { g: THREE.Group; hatch: THREE.Group; wheels: THREE.Mesh[] };
/** the horse faces -z; about 13 m to the ears, on a wheeled platform */
const makeHorse = (): Horse => {
  const g = new THREE.Group(), W = lam("horseW", () => ({ map: tex("horseW", 512, 512, horseWood) })), dark = col("#5a3a22"), V3v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // platform and wheels
  g.add(box(4.2, 0.6, 9.6, W, 0, 1.2, 0));
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [[2.25, 3.4], [-2.25, 3.4], [2.25, -3.4], [-2.25, -3.4]]) { const w = cyl(0.95, 0.35, dark, x, 0.95, z, "x", 0.95, 18); wheels.push(w); g.add(w, cyl(0.25, 0.4, W, x, 0.95, z, "x", 0.25, 10)); }
  // legs: slimmer, with knee/hock joints and hooves
  for (const [x, z, fwd] of [[1.0, -2.7, 1], [-1.0, -2.7, 1], [1.0, 2.8, -1], [-1.0, 2.8, -1]]) {
    const hip = V3v(x, 6.4, z), knee = V3v(x * 1.04, 3.8, z + (fwd > 0 ? -0.1 : 0.35)), hoof = V3v(x * 1.04, 1.75, z);
    g.add(limb(hip, knee, 0.58, 0.4, W), limb(knee, hoof, 0.36, 0.32, W));
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), W); j.position.copy(knee); g.add(j);
    g.add(cyl(0.5, 0.4, dark, hoof.x, 1.7, hoof.z, "y", 0.42, 14));
  }
  // body: a long barrel with a deep chest at the front and a rounded rump at the back
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18).scale(1.6, 1.55, 3.9), W); body.position.set(0, 7.2, 0); g.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).scale(1.55, 1.75, 1.5), W); chest.position.set(0, 7.3, -2.7); g.add(chest);
  const rump = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).scale(1.65, 1.6, 1.6), W); rump.position.set(0, 7.5, 2.8); g.add(rump);
  // neck rising from the chest, tapering to the head
  g.add(limb(V3v(0, 8.0, -3.3), V3v(0, 11.0, -5.0), 1.15, 0.72, W, 16));
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).scale(0.72, 0.85, 1.75), W); head.position.set(0, 11.2, -6.0); head.rotation.x = 0.7; g.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12).scale(0.6, 0.55, 0.8), W); muzzle.position.set(0, 10.15, -7.0); g.add(muzzle);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 8), W); ear.position.set(s * 0.38, 12.35, -5.15); ear.rotation.set(-0.25, 0, s * 0.18); g.add(ear); g.add(cyl(0.15, 0.06, col("#1d1712"), s * 0.6, 11.35, -6.35, "x")); }
  // mane: a crest of short planks down the neck
  for (let k = 0; k < 9; k++) { const u = k / 8, p = V3v(0, 11.9 - 3.2 * u, -4.9 + 1.7 * u); const m = box(0.22, 0.8, 0.45, dark, p.x, p.y, p.z); m.rotation.x = 0.6; g.add(m); }
  // tail: hangs from the top of the rump
  g.add(limb(V3v(0, 8.6, 4.2), V3v(0, 6.6, 5.0), 0.34, 0.28, dark), limb(V3v(0, 6.6, 5.0), V3v(0, 4.2, 5.0), 0.28, 0.12, dark));
  // the hatch in the belly side (+x side): a door hinged at its top edge
  const hatch = new THREE.Group(); hatch.add(box(0.12, 1.6, 2.2, dark, 0, -0.8, 0)); hatch.position.set(1.72, 7.4, 0.4); g.add(hatch);
  g.add(box(0.06, 1.7, 2.3, col("#2a1a10"), 1.68, 6.6, 0.4));
  return { g: sh(g), hatch, wheels };
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
  private horse: Horse = makeHorse(); private ram = new THREE.Group(); private gates: THREE.Group[] = []; private walls = new THREE.Group();
  private trench: THREE.Mesh; private wreck: THREE.Group = new THREE.Group(); private ships = new THREE.Group();
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

    const flatTex = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
    const sand = tex("sandT", 512, 512, sandTex), stone = tex("stoneT", 512, 512, stoneWall);
    M.stone = lam("stoneT", () => ({ map: flatTex(stone, 6, 1.2) })); M.stoneS = lam("stoneTs", () => ({ map: stone })); M.wood = lam("woodT", () => ({ map: tex("woodT", 256, 256, woodTex2) }));
    // ---- the plain, the beach, the sea ----
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1200).rotateX(-Math.PI / 2), lam("sandT", () => ({ map: flatTex(sand, 160, 120) }))); m.position.set(300, 0, 0); m.receiveShadow = true; R.add(m); }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(500, 400).rotateX(-Math.PI / 2), col("#2f7fae")); m.position.set(0, 0.05, 320); R.add(m); }
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(lumpGeo(i, 1, 0.15).scale(40 + hh(i, 1) * 50, 14 + hh(i, 2) * 26, 30), col(i % 2 ? "#8aa060" : "#9ab070")); const a = -0.3 - hh(i, 3) * 2.5; m.position.set(Math.cos(a) * 300, -4, Math.sin(a) * 300 - 60); sh(m, false); R.add(m); }
    // ---- the walls of Troy: battered stone with towers, the Scaean gate at x = 0 ----
    {
      const Wg = this.walls;
      for (const s of [-1, 1]) { const w = box(64, 11, 5, M.stone, s * 35, 5.5, 0); Wg.add(w); Wg.add(box(64, 0.8, 5.6, M.stoneS, s * 35, 11.2, 0)); for (let k = 0; k < 16; k++) Wg.add(box(1.6, 1.4, 5.4, M.stoneS, s * (4.5 + k * 4), 12.3, 0)); }
      for (const x of [-60, -32, -7, 7, 32, 60]) { Wg.add(box(8, 16, 8, M.stone, x, 8, 0.8)); for (let k = 0; k < 4; k++) for (const dz of [-1, 1]) Wg.add(box(1.4, 1.4, 1.4, M.stoneS, x - 3 + k * 2, 16.7, 0.8 + dz * 3.3)); }
      Wg.add(box(6, 3.5, 5, M.stone, 0, 9.25, 0));
      for (const s of [-1, 1]) { const h = new THREE.Group(); h.add(box(2.9, 7.4, 0.5, M.wood, -s * 1.45, 3.7, 0)); for (let k = 0; k < 4; k++) h.add(box(2.9, 0.3, 0.6, col("#5a4232"), -s * 1.45, 1 + k * 1.8, 0.05)); h.position.set(s * 2.95, 0, 2.6); this.gates.push(h); Wg.add(h); }
      sh(Wg); R.add(Wg);
      // the city behind: houses, a temple on the citadel
      for (let i = 0; i < 70; i++) { const x = -55 + hh(i, 4) * 110, z = -10 - hh(i, 5) * 60, w = 4 + hh(i, 6) * 5, h = 3 + hh(i, 7) * 5; R.add(sh(box(w, h, w * 0.8, col(i % 3 ? "#e2cfa6" : "#d4bc8e"), x, h / 2, z))); }
      const T = new THREE.Group(); T.add(box(18, 2, 12, M.stoneS, 0, 1, 0)); for (let k = 0; k < 7; k++) for (const dz of [-5, 5]) T.add(cyl(0.5, 7, col("#efe6d2"), -7.5 + k * 2.5, 5.5, dz));
      T.add(new THREE.Mesh(new THREE.ConeGeometry(11, 3, 4).rotateY(Math.PI / 4).scale(1, 1, 0.66), col("#c96a4a"))); T.children[T.children.length - 1].position.y = 10.5;
      T.position.set(0, 4, -48); sh(T); R.add(T); R.add(sh(new THREE.Mesh(lumpGeo(3, 2, 0.08).scale(30, 4, 22), col("#c9b48a")))); R.children[R.children.length - 1].position.set(0, 0, -48);
      // torches on the wall for the night
      for (const x of [-12, -4, 4, 12]) R.add(cyl(0.18, 0.5, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5) }), x, 13.2, 2.4, "y", 0.1, 8));
    }
    // ---- the Greek camp and ships ----
    for (let i = 0; i < 16; i++) { const x = CAMP[0] - 30 + (i % 8) * 8 + hh(i, 8) * 3, z = CAMP[2] + Math.floor(i / 8) * 9 + hh(i, 9) * 3; const t = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.2, 4), col(i % 2 ? "#e9dcc0" : "#d9c9a4")); t.position.set(x, 1.6, z); t.rotation.y = 0.78; sh(t); R.add(t); }
    for (let i = 0; i < 9; i++) { const g2 = new THREE.Group(); g2.add(box(2.4, 1.6, 13, col("#5a3a22"), 0, 0.6, 0), box(2.6, 0.3, 13.4, col("#c0353a"), 0, 1.45, 0), cyl(0.12, 8, M.wood, 0, 5, 0), box(0.1, 4.4, 5.6, col("#f2ecdc"), 0, 6.2, 0)); g2.position.set(-40 + i * 10, 0, BEACH[2] + 8 + (i % 2) * 6); sh(g2); this.ships.add(g2); }
    R.add(this.ships);
    // ---- the horse; a battering ram under a hide roof ----
    R.add(this.horse.g);
    { const Rm = this.ram; Rm.add(box(3.4, 0.4, 7, M.wood, 0, 3.6, 0)); const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 7, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), col("#8a6a4a")); roof.position.y = 3.8; Rm.add(roof); Rm.add(cyl(0.45, 8, M.wood, 0, 2.4, -0.6, "z", 0.45, 12)); for (const [x, z] of [[1.7, 2.6], [-1.7, 2.6], [1.7, -2.6], [-1.7, -2.6]]) Rm.add(cyl(0.8, 0.3, col("#3a2a1e"), x, 0.8, z, "x")); sh(Rm); R.add(Rm); }

    // ---- the study: a desk with a scroll, scroll shelves, a lamp ----
    {
      const L = new THREE.Group(), C = LIB;
      L.add(box(8, 0.02, 6, M.wood, 0, 0.01, 0), box(8, 4, 0.2, col("#d9c9a4"), 0, 2, -2.6));
      const sh2 = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), lam("shelfT", () => ({ map: tex("shelfT", 512, 512, shelfTex) }))); sh2.position.set(0, 2.0, -2.48); L.add(sh2);
      L.add(box(2.2, 0.08, 1.1, M.wood, 0, 0.92, 0), box(2.0, 0.9, 1.0, col("#6a4028"), 0, 0.45, 0), box(1.6, 0.08, 0.9, M.wood, -2.6, 0.92, -0.2), box(1.4, 0.9, 0.8, col("#6a4028"), -2.6, 0.45, -0.2));
      L.add(cyl(0.2, 0.3, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.0) }), 0.9, 1.1, -0.2, "y", 0.12, 10));
      L.position.set(C[0], 0, C[2]); sh(L); R.add(L);
    }
    // ---- the backyard: lawn, fence, grill ----
    {
      const Y = new THREE.Group(), C = YARD;
      Y.add(box(20, 0.04, 16, col("#7fb05a"), 0, 0.02, 0));
      for (let k = -9; k <= 9; k++) Y.add(box(0.12, 1.4, 0.12, col("#f2ecdc"), k, 0.7, -3.5)); Y.add(box(19, 0.12, 0.08, col("#f2ecdc"), 0, 1.2, -3.5), box(19, 0.12, 0.08, col("#f2ecdc"), 0, 0.6, -3.5));
      Y.add(box(1.2, 0.5, 0.7, col("#2a2428"), 1.6, 1.0, -1.2), cyl(0.05, 0.9, col("#2a2428"), 1.2, 0.45, -1.2), cyl(0.05, 0.9, col("#2a2428"), 2.0, 0.45, -1.2));
      Y.add(box(16, 5, 0.3, col("#e9dcc0"), 0, 2.5, -8)); for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), col("#5f9a4e")); t.position.set(-8 + i * 4, 3.6, -6); Y.add(t); }
      Y.position.set(C[0], 0, C[2]); sh(Y); R.add(Y);
    }
    // ---- the mound at Hisarlik, cut open toward +z: nine stacked cities ----
    {
      const Hg = new THREE.Group(), C = HILL;
      for (let k = 0; k < LAYERS; k++) {
        const y = k * LAYER_H, w = 34 - k * 2.2, d = 18 - k * 1.0;
        const mat = lam(`strata${k}`, () => ({ map: tex(`strata${k}`, 512, 128, strataTex(k)) }));
        const top = col(k % 2 ? "#b8a888" : "#a8977a");
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, LAYER_H, d), [top, top, top, top, mat, top]); b.position.set(0, y + LAYER_H / 2, -d / 2 + 8); Hg.add(b);
      }
      // grass on top, the plain round it
      Hg.add(box(34 - LAYERS * 2.2 + 1, 0.2, 18 - LAYERS + 1, col("#8aa060"), 0, LAYERS * LAYER_H + 0.1, -(18 - LAYERS) / 2 + 8));
      Hg.position.set(C[0], 0, C[2]); sh(Hg); R.add(Hg);
      // the trench: a dark cut down the middle of the cutaway face, deepening from the top
      this.trench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 0.4), col("#2e2318")); this.trench.position.set(C[0], 0, C[2] + 8.1); R.add(this.trench);
      // the war layers (VI-VII) cracked and spilling once the trench reaches them
      for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(lumpGeo(i + 40, 0, 0.3).scale(0.4 + hh(i, 1) * 0.4, 0.3 + hh(i, 2) * 0.3, 0.4), col(i % 2 ? "#cdb48a" : "#a8977a")); m.position.set(C[0] - 4 + hh(i, 3) * 8, 0.3, C[2] + 9 + hh(i, 4) * 3); m.rotation.y = i; sh(m); this.wreck.add(m); }
      R.add(this.wreck);
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
    const name = SHOTS[id - 1].name, H = this.horse;
    const hp = horseAt(id, f);
    H.g.visible = ["hook", "build", "drag", "priest", "serpents", "night", "really"].includes(name);
    H.g.position.set(hp[0], hp[1], hp[2]);
    if (name === "drag") for (const w of H.wheels) w.rotation.x = (22 - hp[2]) / 0.95;
    H.hatch.rotation.z = name === "night" || name === "build" ? -1.3 * smooth((f - (name === "night" ? 575 : 255)) / 10) : 0;
    const g = gateAt(id, f);
    this.gates.forEach((h, k) => { h.rotation.y = (k ? -1 : 1) * 1.6 * g; });
    this.ram.visible = name === "ram";
    const rz = name === "ram" ? 5.2 - 1.2 * Math.max(0, Math.sin(((f - 1100) / 24) * Math.PI)) : 6;
    this.ram.position.set(0, 0, rz);
    const sk = shakeAt(id, f); this.walls.position.set(sk, 0, 0);
    this.ships.visible = ["siege", "sail", "hook"].includes(name);
    if (name === "sail") this.ships.position.z = 0.25 * (f - 290);
    else this.ships.position.z = 0;
    const tr = trenchAt(id, f), H2 = LAYERS * LAYER_H, depth = tr * (H2 - 1.2);
    this.trench.visible = tr > 0; this.trench.scale.y = Math.max(0.01, depth); this.trench.position.y = H2 - depth / 2;
    this.wreck.visible = tr > 0.45;
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

