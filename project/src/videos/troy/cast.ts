// (whale short: pool / actors / lighting helpers are the bridge template's; the staging below is new)
// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxScroll, fxYear, fxBoard, fxSerpent, fxFish, fxPoseidon, fxCrackH, fxRubble, fxFlame, fxBang, horseIcon } from "./fxr";
import { fxCloud2 } from "./fxw";
import {
  FPS, V3, gy, smooth, clamp01, easeOut, lerp, SHOTS, GATE, HORSE0, CAMP, BEACH, LIB, YARD, HILL, LAYERS, LAYER_H, horseAt, trenchAt,
  TRICK, PROBLEM, ILIAD, TEN, NOWHERE, BUILD, HIDE, SAIL, DRAG, CELEBRATE, BEWARE, SERPENTS, CRUSH, CLIMB, GATES, FALLS, EXCEPT, BARELY,
  ROMAN, THOUSAND, REALLY, GROW, BIGGER, RAM, HIDES, QUAKE, POSEIDON, SHAKEN, REAL, SCHLIE, TURKEY, TRENCH, SMASH, WAR, GREEKS, IN3,
} from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

export type Stage = { places: Place[]; fx: FxPlace[] };

// ---------------- the cast ----------------
const GREEK = [0, 1, 2].map((v): Outfit => ({ jacket: ["#c0353a", "#8c3b4a", "#b5653f"][v], pants: "#d9a441", boots: "#5a3b2a", hat: "cap", cap: "#d9a441", skin: SKINS[[1, 3, 0][v]], moustache: v === 1 ? "#2a201a" : undefined, buttons: "#e8c45a" }));
const TROJAN = [0, 1, 2].map((v): Outfit => ({ jacket: ["#3f6fb5", "#5d7a9a", "#7b5ac9"][v], pants: "#e9dcc0", boots: "#5a3b2a", hat: v === 2 ? "hair" : "cap", cap: "#e8c45a", hair: "#2a201a", skin: SKINS[[0, 2, 1][v]], dress: v === 2 ? "#9a7ad9" : undefined }));
const PRIEST: Outfit = { jacket: "#f2ecdc", dress: "#f2ecdc", pants: "#f2ecdc", boots: "#8a6a4a", hat: "hair", hair: "#c9c9cc", moustache: "#c9c9cc", skin: SKINS[0], build: "stout" };
const SCHOLAR: Outfit = { jacket: "#5a4a3a", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hair: "#c9c9cc", tie: "#8c3b4a", skin: SKINS[0] };
const POET: Outfit = { jacket: "#f2ecdc", dress: "#f2ecdc", pants: "#f2ecdc", boots: "#8a6a4a", hat: "hair", hair: "#5a3b2a", skin: SKINS[1], sash: "#7a2a7a" };
const UNCLE: Outfit = { jacket: "#e2733c", pants: "#3b5b9a", boots: "#4a3426", hat: "cap", cap: "#2f5f6a", moustache: "#5a3b2a", skin: SKINS[0], build: "stout" };
const KIDS = [0, 1].map((v): Outfit => ({ ...KID, jacket: ["#3f9a4a", "#d95f8a"][v], cap: ["#3f6fb5", "#c9a227"][v] }));
const SCHLIEMANN: Outfit = { jacket: "#3a3d47", vest: "#8a6a3a", pants: "#5a4a3a", boots: "#2e2a36", hat: "fedora", cap: "#d9c9a4", moustache: "#5a3b2a", skin: SKINS[0] };
const DIGGER = [0, 1].map((v): Outfit => ({ jacket: ["#f2ecdc", "#d9c9a4"][v], pants: "#5a4a3a", boots: "#4a3426", hat: "cap", cap: "#c0353a", skin: SKINS[[1, 3][v]], moustache: "#2a201a" }));
const FRONT = { side: false, mirror: false };

type Cast = { out: Stage; cam: CamInfo; t: number; f: number };
const put = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, fo: FrontOpts, dy = 0, scale = 1, shadow = true) => {
  c.out.places.push(person(c.cam, { i, o, okey }, x, gy(x, z) + dy, z, FRONT, { mode: "stand", blink: lidAt(c.t, i), ...fo }, {}, scale));
  if (shadow) blob(c.out, x, gy(x, z) + dy, z, scale);
};
const putSide = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, so: SideOpts, mirror = false, dy = 0, scale = 1) => {
  c.out.places.push(person(c.cam, { i, o, okey }, x, gy(x, z) + dy, z, { side: true, mirror }, {}, { mode: "stand", blink: lidAt(c.t, i), ...so }, scale));
  blob(c.out, x, gy(x, z) + dy, z, scale);
};
const card = (c: Cast, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  c.out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const pop = (f: number, f0: number) => 0.6 + 0.4 * easeOut((f - f0) / 6);

// ---------------- staging by shot ----------------
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS, c: Cast = { out, cam, t, f }, name = s.name;
  LNAME = s.light;
  findSun(cam, SUN);
  if (name === "scroll") card(c, "scrollI", 600, 360, (p) => fxScroll(p, "iliad"), LIB[0], 0.97, LIB[2], 1.2, 0.72, { flat: true });
  if (name === "siege") {
    const yr = Math.min(10, 1 + Math.floor(((f - 130) / 60) * 9));
    for (let i = 0; i < 6; i++) put(c, 10 + i, GREEK[i % 3], `g${i % 3}`, CAMP[0] - 1.6 + (i % 3) * 1.2 + (i > 2 ? 0.6 : 0), CAMP[2] - (i > 2 ? 1.6 : 0), { expr: f < NOWHERE - 8 ? "stern" : (["dazed", "pained", "nervous"] as Expr[])[i % 3] });
    card(c, `yr${yr}`, 360, 240, (p) => fxYear(p, yr), CAMP[0] - 0.2, 2.75, CAMP[2] - 0.8, 1.0, 0.67);
  }
  if (name === "build") {
    for (let i = 0; i < 4; i++) putSide(c, 10 + i, GREEK[i % 3], `gb${i}`, 2.9 + (i % 2) * 0.4, 22 - 3 + i * 2, { mode: "push", pose: q(0.5 + 0.5 * Math.sin(t * 9 + i), 10), expr: "stern" }, true);
    for (let k = 0; k < 3; k++) { const n = f - (BUILD + k * 8); if (n >= 0 && n < 8) { const u = q(n / 8, 8); card(c, `bang${u}`, 200, 200, (p) => fxBang(p, u), 2.2, 4 + k * 1.2, 20 + k, 1.2, 1.2); } }
    if (f >= HIDE - 6) for (let k = 0; k < 2; k++) { const u = clamp01((f - HIDE - k * 10) / 16); if (u > 0 && u < 1) put(c, 20 + k, GREEK[k], `gh${k}`, 1.75, 22.4 + 0.3 * k, { expr: "grin" }, 4.4 + 2.2 * u, 0.9, false); }
  }
  if (name === "drag") {
    const hz = horseAt(id, f)[2];
    for (let i = 0; i < 6; i++) putSide(c, 30 + i, TROJAN[i % 3], `t${i}`, (i % 2 ? 2.2 : -2.2), hz - 8 - Math.floor(i / 2) * 1.6, { mode: "march", phase: q(((f / 12) + i * 0.3) % 1, 12), expr: (["laugh", "grin", "smile"] as Expr[])[i % 3], stomp: 0.6, stride: 0.5 }, true);
    if (f > CELEBRATE - 10) for (let i = 0; i < 4; i++) put(c, 40 + i, TROJAN[i % 3], `tc${i}`, -5 + i * 3.2, -6, { expr: "laugh", armsUp: true });
  }
  if (name === "priest") {
    put(c, 50, PRIEST, "pr", 2.2, 8, { expr: f < BEWARE ? "stern" : "shock", wave: q(0.7 + 0.3 * Math.sin(t * 10), 10) });
    for (let i = 0; i < 3; i++) put(c, 30 + i, TROJAN[i], `t${i}`, -0.6 + i * 1.0, 5.6, { expr: "laugh" });
  }
  if (name === "serpents") {
    const u = smooth((f - SERPENTS + 10) / 24);
    put(c, 50, PRIEST, "pr", 2.2, 8, { expr: f < CRUSH ? "shock" : "dazed", armsUp: f < CRUSH }, 0, 1, true);
    for (const s2 of [-1, 1]) card(c, `serp${s2}${q(t % 1, 8)}`, 400, 600, (p) => fxSerpent(p, q(t % 1, 8), s2 < 0), 2.2 + s2 * 1.4 * (1 - 0.5 * smooth((f - CRUSH + 6) / 10)), -3 + u * 5.4, 8.1, 2.6, 3.9);
  }
  if (name === "night") {
    const hz = horseAt(id, f)[2];
    if (f < 612) for (let k = 0; k < 3; k++) { const u = clamp01((f - CLIMB + 12 - k * 8) / 14); if (u > 0) put(c, 60 + k, GREEK[k], `gn${k}`, 2.3 + 1.2 * u + k * 0.4, hz + 0.4 - k * 0.6, { expr: "grin" }, Math.max(0, 5.6 * (1 - u)), 1, u > 0.95); }
    if (f >= 612) for (let i = 0; i < 6; i++) putSide(c, 70 + i, GREEK[i % 3], `gr${i}`, -1.6 + (i % 3) * 1.4, 4 - 1.6 * (f - 612) * 0.12 - Math.floor(i / 3) * 2, { mode: "march", phase: q(((f / 9) + i * 0.3) % 1, 12), expr: "grin", stomp: 1.1, stride: 0.7 }, false);
    for (const x of [-12, -4, 4, 12]) card(c, `fl${q((t * 3) % 1, 8)}`, 200, 300, (p) => fxFlame(p, q((t * 3) % 1, 8)), x, 13.9, 2.4, 0.6, 0.9);
  }
  if (name === "iliad") {
    const u = smooth((f - 660) / 16);
    card(c, `scrollE${q(u, 8)}`, 600, 360, (p) => fxScroll(p, "end", q(u, 8)), LIB[0], 0.97, LIB[2], 1.2, 0.72, { flat: true });
    put(c, 80, SCHOLAR, "sch", LIB[0] + 0.6, LIB[2] - 0.7, { expr: f < BARELY ? "neutral" : "shock", prop: f >= BARELY ? "pinch" : null });
  }
  if (name === "roman") {
    put(c, 81, POET, "poet", LIB[0] - 2.6, LIB[2] - 0.9, { expr: f < THOUSAND ? "smile_closed" : "grin", prop: "clipboard" });
    card(c, "scrollA", 600, 360, (p) => fxScroll(p, "aeneid"), LIB[0] - 2.6, 0.97, LIB[2] - 0.15, 1.0, 0.6, { flat: true });
    if (f >= THOUSAND - 6) card(c, "plus1000", 300, 240, (p) => fxBoard(p, "+1000 YRS", "#c0353a"), LIB[0] - 2.0, 2.3, LIB[2] - 0.6, 0.9 * pop(f, THOUSAND - 6), 0.72 * pop(f, THOUSAND - 6));
  }
  if (name === "really") card(c, "qm", 300, 240, (p) => fxBoard(p, "?", "#c0353a"), 2.5, 13.2, -8, 2.2, 1.8);
  if (name === "uncle") {
    const size = clamp01(0.15 + 0.85 * smooth((f - GROW) / 90));
    put(c, 90, UNCLE, "un", YARD[0], YARD[2] - 0.4, { expr: "grin", armsUp: true });
    card(c, `fish${q(size, 10)}`, 500, 300, (p) => fxFish(p, q(size, 10)), YARD[0], 2.45, YARD[2] - 0.3, 1.0 + 1.6 * size, (1.0 + 1.6 * size) * 0.6);
    put(c, 91, KIDS[0], "k0", YARD[0] - 1.3, YARD[2] + 0.6, { expr: f < BIGGER ? "smile" : "dazed" }, 0, 0.72); put(c, 92, KIDS[1], "k1", YARD[0] + 1.3, YARD[2] + 0.6, { expr: f < BIGGER ? "smile" : "stern" }, 0, 0.72);
  }
  if (name === "ram") { for (let i = 0; i < 4; i++) putSide(c, 10 + i, GREEK[i % 3], `gr${i}`, (i % 2 ? 2.4 : -2.4), 6.5 + Math.floor(i / 2) * 2, { mode: "push", pose: q(0.5 + 0.5 * Math.sin(((f - 1100) / 24) * Math.PI * 2), 10), expr: "stern" }, false); for (const f0 of [RAM, RAM + 24]) { const n = f - f0; if (n >= 0 && n < 8) { const u = q(n / 8, 8); card(c, `bangR${u}`, 200, 200, (p) => fxBang(p, u), 0, 3, 3, 2.2, 2.2); } } }
  if (name === "quake") {
    if (f >= POSEIDON - 10) card(c, "pos", 400, 500, fxPoseidon, 8, 17, 10, 12 * pop(f, POSEIDON - 10), 15 * pop(f, POSEIDON - 10));
    if (f >= QUAKE) for (let k = 0; k < 3; k++) card(c, `crackW${k}`, 400, 120, (p) => fxCrackH(p, k), -20 + k * 18, 5 + k, 2.7, 10, 3);
    for (let i = 0; i < 3; i++) put(c, 30 + i, TROJAN[i], `tq${i}`, 2.2 + i * 1.1, 6, { expr: f < QUAKE ? "neutral" : "shock", armsUp: f >= QUAKE, tilt: f >= QUAKE ? q(6 * Math.sin(t * 20 + i), 3) : 0 });
  }
  if (name === "layer") {
    const k = 5, y = k * LAYER_H + LAYER_H / 2;
    card(c, "crackL", 400, 120, (p) => fxCrackH(p, 3), HILL[0], y, HILL[2] + 8.2, 18, 1.6);
    card(c, "layerSign", 300, 240, (p) => fxBoard(p, "TROY VI", "#7a2a2a"), HILL[0] + 1.6, y + 2.0, HILL[2] + 8.6, 2.4, 1.9);
  }
  if (name === "dig" || name === "trench") {
    const top = LAYERS * LAYER_H;
    put(c, 95, SCHLIEMANN, "sch", HILL[0] + 1.4, HILL[2] + 3.0, { expr: f < TURKEY ? "grin" : "smile_closed", wave: q(Math.sin(t * 5), 8) }, top);
    for (let i = 0; i < 2; i++) putSide(c, 96 + i, DIGGER[i], `d${i}`, HILL[0] - 1.2 + i * 2.6, HILL[2] + 4.2, { mode: "push", pose: q(0.5 + 0.5 * Math.sin(t * 8 + i * 2), 10), expr: "stern" }, i === 1, top);
    if (name === "trench") {
      const n = f - SMASH;
      for (let k = 0; k < 3; k++) { const m = n - k * 9; if (m >= 0 && m < 14) { const u = q(m / 14, 10); card(c, `rub${u}`, 300, 300, (p) => fxRubble(p, u), HILL[0] + (k - 1) * 1.6, 5.5 * LAYER_H + 1, HILL[2] + 8.6, 3.2, 3.2); } }
      if (f >= WAR - 20) card(c, "warSign", 300, 240, (p) => fxBoard(p, "WAR ERA", "#c0353a"), HILL[0] + 2.4, 6.2 * LAYER_H, HILL[2] + 8.6, 2.0, 1.6);
    }
  }
  if (name === "payoff") {
    const top = LAYERS * LAYER_H;
    put(c, 10, GREEK[0], "g0", HILL[0] - 0.15, HILL[2] + 3.0, { expr: f < IN3 ? "smile" : "shock" }, top);
    card(c, "ten", 300, 240, (p) => fxBoard(p, "10 YRS", "#3f6fb5"), HILL[0] - 0.15, top + 2.6, HILL[2] + 3.1, 0.8, 0.64);
    put(c, 95, SCHLIEMANN, "sch", HILL[0] + 0.95, HILL[2] + 3.0, { expr: f < IN3 ? "smile_closed" : "grin" }, top);
    if (f >= IN3 - 4) card(c, "three", 300, 240, (p) => fxBoard(p, "3", "#c0353a"), HILL[0] + 0.95, top + 2.6, HILL[2] + 3.1, 0.9 * pop(f, IN3 - 4), 0.72 * pop(f, IN3 - 4));
  }
  void horseIcon; void GATE; void HORSE0; void BEACH; void trenchAt; void SCHLIE; void REAL; void HIDES; void SHAKEN; void TRENCH; void GREEKS; void EXCEPT; void ROMAN; void REALLY; void FALLS; void GATES; void DRAG; void SAIL; void TEN; void ILIAD; void PROBLEM; void TRICK;
  return out;
};
export { FPS, lerp, smooth };
