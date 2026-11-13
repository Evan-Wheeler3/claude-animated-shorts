// (whale short: pool / actors / lighting helpers are the bridge template's; the staging below is new)
// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxCloud2 } from "./fxw";
import { fxCrack, fxSpeed, fxAir, fxPaper, fxGauge, fxBoard, fxBird, fxFlow, fxStream, fxClip, fxDing, fxRing, fxSweat } from "./fxp";
import {
  FPS, V3, gy, smooth, clamp01, easeOut, lerp, SHOTS, SKY, TARMAC, NEWS, HANGAR, PANEL, STREAM, DESK, MODERN, CABIN, winRel, PLANE_SKY, PLANE_TAR, PLANE_TANK,
  WIN_SKY, WIN_TANK, CRACK1, CRACK2, FAST, QUIET, TWO, PUMP, FLIGHTS0, SPLIT, CORNER, WHY, BREATHE, FLOW, ROUND, SQ, SHARP, EVERY, CLIP, NOTFIRST, SNAP,
  HOLE, DING, ATTEND, STOP, pulseAt, flightsAt, crackAt,
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
const MEN50 = [0, 1, 2].map((v): Outfit => ({ jacket: ["#5a6a7a", "#7a5a3a", "#3a4a3a"][v], pants: "#3b3f52", boots: "#2e2a36", hat: "fedora", cap: ["#4a3a2a", "#3a3d47", "#6a5a48"][v], tie: ["#8c3b4a", "#2f5f6a", "#c9a227"][v], skin: SKINS[[0, 1, 3][v]] }));
const WOMEN50 = [0, 1].map((v): Outfit => ({ jacket: ["#c25a7a", "#5a8fc2"][v], dress: ["#e9a3b8", "#9fc3e6"][v], pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: ["#c9953a", "#5a3b2a"][v], skin: SKINS[[0, 2][v]] }));
const ENG = [0, 1, 2].map((v): Outfit => ({ jacket: "#f4f4f0", pants: ["#3b3f52", "#5a4a3a", "#3d4440"][v], boots: "#2e2a36", hat: "hair", hair: ["#2a201a", "#8a8a92", "#c9953a"][v], tie: ["#2f5f6a", "#8c3b4a", "#3a3d47"][v], skin: SKINS[[1, 0, 2][v]], moustache: v === 1 ? "#8a8a92" : undefined }));
const NEWSBOY: Outfit = { ...KID, jacket: "#8a6a4a", cap: "#5a4a3a" };
const YOU: Outfit = { jacket: "#2fa59a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", skin: SKINS[0] };
const ATTENDANT: Outfit = { jacket: "#2f3f5a", dress: "#2f3f5a", pants: "#2f3f5a", boots: "#1f1b1e", hat: "hair", hair: "#2a201a", tie: "#c0353a", skin: SKINS[2] };
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
const add = (a: V3, b: V3, dx = 0, dy = 0, dz = 0): V3 => [a[0] + b[0] + dx, a[1] + b[1] + dy, a[2] + b[2] + dz];
/** a face in a fuselage window (200 x 200): asleep / waving / worried */
const winFace = (mood: "sleep" | "smile" | "wave") => (p: Pen) => {
  p.poly([[8, 8], [192, 8], [192, 192], [8, 192]], "#9ccbe6", 8);
  p.ell(100, 120, 62, 66, "#ffe2c2", 7);
  p.ell(100, 70, 60, 30, ["#5a3b2a", "#c9953a", "#2a201a"][mood === "sleep" ? 0 : mood === "smile" ? 1 : 2], 6, 180, 360);
  if (mood === "sleep") { p.arc(80, 118, 10, 6, 20, 160, 5); p.arc(120, 118, 10, 6, 20, 160, 5); p.ell(100, 150, 8, 6, "#5a1e28", 3); }
  else { p.dot(80, 116, 7); p.dot(120, 116, 7); p.arc(100, 140, 22, 14, 20, 160, 6); }
  if (mood === "wave") { p.stroke([[160, 190], [176, 120]], 18, "#5a8fc2"); p.dot(178, 112, 14, "#ffe2c2"); }
  p.poly([[8, 8], [192, 8], [192, 192], [8, 192]], null, 10);
};
/** a zzz (120 x 120) */
const zzz = (p: Pen) => { p.g.fillStyle = "#ffffff"; p.g.strokeStyle = "#241726"; p.g.lineWidth = 6; p.g.font = "900 52px Georgia, serif"; p.g.strokeText("z", 20, 100); p.g.fillText("z", 20, 100); p.g.font = "900 36px Georgia, serif"; p.g.strokeText("z", 70, 50); p.g.fillText("z", 70, 50); };

// ---------------- staging by shot ----------------
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS, c: Cast = { out, cam, t, f }, name = s.name;
  LNAME = s.light;
  findSun(cam, SUN);
  const sky = name === "cruise" || name === "break" || name === "windows" || name === "fast" || name === "quiet" || name === "thin" || name === "swell";
  if (sky) {
    // a cloud deck sliding past below and a few clouds at cruise height: the plane is fast
    const v = name === "fast" ? 2.2 : 0.55;
    for (let i = 0; i < 26; i++) {
      const x = ((hh(i, 1) * 360 - v * f * 2.2) % 360 + 360) % 360 - 180, z = -150 + hh(i, 2) * 300, y = SKY[1] - 30 - hh(i, 3) * 20, w = 40 + hh(i, 4) * 50;
      card(c, `cl${i % 3}`, 400, 400, (p) => fxCloudW(p, i % 3), x, y, z, w, w * 0.45, { flat: true, rot: hh(i, 5) * 6 });
    }
    for (let i = 0; i < 7; i++) {
      const x = ((hh(i, 6) * 240 - v * f * 1.4) % 240 + 240) % 240 - 120, z = -60 + hh(i, 7) * 120, y = SKY[1] - 6 + hh(i, 8) * 14, w = 14 + hh(i, 9) * 14;
      if (Math.abs(z) > 10) card(c, `cs${i % 3}`, 400, 400, (p) => fxCloudW(p, i % 3), x, y, z, w, w * 0.6);
    }
  }
  if (name === "break" || name === "windows") {
    const u1 = clamp01((f - CRACK1) / 10), u2 = clamp01((f - CRACK2) / 12);
    const w = add(PLANE_SKY, winRel(WIN_SKY));
    if (f >= CRACK1) card(c, `crk${q(u1, 10)}`, 400, 400, (p) => fxCrack(p, u1, 2), w[0] + 0.55, w[1] + 0.32, w[2] + 0.06, 1.2, 1.2);
    if (f >= CRACK2) card(c, `crk2${q(u2, 10)}`, 400, 400, (p) => fxCrack(p, u2, 5), w[0] - 2.4, w[1] + 0.3, w[2] + 0.06, 1.4, 1.4, { rot: 0.4 });
    if (name === "break") for (let k = 0; k < 3; k++) { const n = f - CRACK1 - k * 6; if (n >= 0 && n < 14) { const u = q(n / 14, 14); card(c, `bang${u}`, 500, 500, (p) => fxBurst(p, u, "#ffffff", 10, 40, 200), w[0] + 0.6 - k * 1.4, w[1] + 0.4, w[2] + 0.3, 1.2, 1.2); } }
  }
  if (name === "fast") for (let k = 0; k < 4; k++) card(c, `spd${k}`, 500, 300, (p) => fxSpeed(p, k), SKY[0] - 14 - k * 3, SKY[1] + 0.6 + (k - 1.5) * 1.2, SKY[2] + 1.2, 8, 4.8);
  if (name === "quiet") {
    const w = add(PLANE_SKY, winRel(WIN_SKY));
    [[-3, "sleep"], [-2, "smile"], [-1, "sleep"], [0, "wave"], [1, "smile"], [2, "sleep"]].forEach(([k, m]) => {
      const wk = add(PLANE_SKY, winRel(WIN_SKY + (k as number)));
      card(c, `wf${m}`, 200, 200, winFace(m as "sleep"), wk[0], wk[1], wk[2] + 0.03, 0.47, 0.45);
      void w;
    });
    const zx = add(PLANE_SKY, winRel(WIN_SKY - 3));
    const u = (t * 0.8) % 1; card(c, "zzz", 120, 120, zzz, zx[0] + 0.3 + 0.2 * u, zx[1] + 0.35 + 0.3 * u, zx[2] + 0.1, 0.3, 0.3);
  }
  if (name === "tarmac") {
    const T = TARMAC;
    [[12, 7, MEN50[0], "m0"], [10.5, 7.6, WOMEN50[0], "w0"], [7.6, 9.4, MEN50[1], "m1"], [6.4, 9.8, WOMEN50[1], "w1"], [4.8, 11.2, MEN50[2], "m2"]].forEach(([dx, dz, o, k], i) => {
      const walk = (f - 215) * 0.02;
      putSide(c, 10 + i, o as Outfit, k as string, T[0] + (dx as number) - walk * 0.8, T[2] + (dz as number) - walk * 1.6, { mode: "march", phase: q(((f / 16) + i * 0.3) % 1, 12), stomp: 0.5, stride: 0.5, expr: i % 2 ? "smile" : "grin" }, true);
    });
  }
  if (name === "news") {
    put(c, 20, NEWSBOY, "boy", NEWS[0] - 0.75, NEWS[2] + 0.4, { expr: f < TWO ? "shock" : "nervous", prop: null, wave: q(Math.sin(t * 10), 8) }, 0, 0.72);
    put(c, 21, MEN50[1], "m1", NEWS[0] + 0.8, NEWS[2] + 0.3, { expr: f < TWO ? "nervous" : "shock", blink: lidAt(t, 21, [TWO / FPS]) });
    const which = f < TWO ? 0 : 1;
    card(c, `paper${which}`, 300, 400, (p) => fxPaper(p, which as 0 | 1), NEWS[0], 1.45, NEWS[2] + 0.12, 0.62, 0.83);
  }
  if (name === "tank" || name === "pump" || name === "crack" || name === "why") {
    const H = HANGAR;
    const eng = (i: number, x: number, z: number, fo: FrontOpts) => put(c, 30 + i, ENG[i], `e${i}`, H[0] + x, H[2] + z, { prop: i === 0 ? "clipboard" : null, ...fo });
    if (name === "tank") { eng(0, -3, 6.6, { expr: "smile_closed" }); eng(1, -1.6, 6.9, { expr: f < 585 ? "neutral" : "grin" }); eng(2, 2.6, 6.8, { expr: "smile", look: -1 }); }
    if (name === "pump") {
      put(c, 31, ENG[1], "e1", H[0] - 10.6, H[2] + 6.7, { expr: f < FLIGHTS0 ? "stern" : "grin", wave: q(0.5 + 0.5 * Math.sin(((f - PUMP) / (f < FLIGHTS0 ? 16 : 5)) * Math.PI * 2), 8) });
      card(c, `g${q(pulseAt(f), 16)}`, 300, 300, (p) => fxGauge(p, 0.15 + 0.7 * q(pulseAt(f), 16)), H[0] - 9.3, 2.0, H[2] + 6.62, 0.6, 0.6);
      const n = flightsAt(f); card(c, `board${n}`, 512, 256, (p) => fxBoard(p, n), H[0] - 12.2, 3.1, H[2] + 7.3, 2.0, 1.0);
    }
    if (name === "crack") {
      const w = add(PLANE_TANK, winRel(WIN_TANK)), u = crackAt(f);
      if (u > 0) card(c, `crk${q(u, 16)}`, 400, 400, (p) => fxCrack(p, u, 7), w[0] + 0.23 + 0.6 * 0.85, w[1] + 0.22 + 0.6 * -0.5, w[2] + 0.02, 1.2, 1.2);
    }
    if (name === "why") { eng(1, 3.1, 4.5, { expr: "dazed", headTilt: 8, blink: lidAt(t, 31, [WHY / FPS]) }); card(c, "q", 120, 160, qmark, H[0] + 3.5, 2.55, H[2] + 4.5, 0.32, 0.42); }
  }
  if (name === "thin") {
    const w = add(PLANE_SKY, winRel(WIN_SKY)), gasp = Math.sin(t * 9) > 0 ? 1 : 0;
    card(c, `bird${gasp}${Math.sin(t * 14) > 0}`, 300, 300, (p) => fxBird(p, Math.sin(t * 14) > 0 ? 1 : 0, gasp), w[0] - 0.4, w[1] + 0.5, w[2] + 0.9, 0.9, 0.9);
    card(c, "wfsmile", 200, 200, winFace("smile"), w[0], w[1], w[2] + 0.03, 0.47, 0.45);
  }
  if (name === "swell") {
    const u = (t * 0.9) % 1;
    for (let k = 0; k < 3; k++) card(c, `air${q((u + k / 3) % 1, 12)}`, 300, 300, (p) => fxAir(p, q((u + k / 3) % 1, 12)), PLANE_SKY[0] - 6 + k * 6, PLANE_SKY[1], PLANE_SKY[2] + FRZ, 3.4, 3.4);
  }
  if (name === "flow") card(c, `flow0${q((t * 0.6) % 1, 24)}`, 800, 800, (p) => fxFlow(p, "round", q((t * 0.6) % 1, 24)), PANEL[0], 3.0, PANEL[2] + 0.05, 5.6, 5.6);
  if (name === "rock") card(c, `strm${q((t * 0.7) % 1, 24)}`, 800, 800, (p) => fxStream(p, q((t * 0.7) % 1, 24)), STREAM[0], 0.32, STREAM[2], 7, 7, { flat: true });
  if (name === "round") card(c, `flowR${q((t * 0.6) % 1, 24)}`, 800, 800, (p) => fxFlow(p, "round", q((t * 0.6) % 1, 24)), PANEL[0] - 4.5, 3.0, PANEL[2] + 0.05, 5.6, 5.6);
  if (name === "square" || name === "every") {
    const heat = name === "square" ? smooth((f - SHARP + 16) / 20) : 1, cr = name === "every" ? q(smooth((f - EVERY) / 40), 10) : 0;
    const ph = q((t * (name === "square" ? 0.6 : 1.4)) % 1, 24);
    card(c, `flowS${ph}${q(heat, 8)}${cr}`, 800, 800, (p) => fxFlow(p, "square", ph, q(heat, 8), cr), PANEL[0] + 4.5, 3.0, PANEL[2] + 0.05, 5.6, 5.6);
  }
  if (name === "clip") {
    const snapped = f >= SNAP, bend = snapped ? 0.3 : Math.sin(((f - CLIP) / 12) * Math.PI) * (f < NOTFIRST ? 0.8 : 1);
    card(c, `clip${q(bend, 10)}${snapped}`, 600, 500, (p) => fxClip(p, q(bend, 10), snapped), DESK[0], 1.25, DESK[2] + 0.1, 1.5, 1.25);
  }
  if (name === "hole" || name === "attend") {
    const C = CABIN, worried = f >= HOLE + 12;
    put(c, 40, YOU, "you", C[0] + 0.05, C[2] - 0.55, { mode: "sit", expr: name === "attend" ? (f < STOP ? "nervous" : "smile_closed") : worried ? "shock" : "smile", look: name === "hole" && worried ? -1 : 0, headTilt: 4 }, 0.45, 1, false);
    card(c, "ring", 200, 200, fxRing, C[0] + 0.05, 1.18, C[2] - 1.53, 0.05, 0.05);
    if (name === "hole" && f >= DING) card(c, `ding${(f - DING) % 12 < 6}`, 200, 200, (p) => fxDing(p, (f - DING) % 12 < 6), C[0] + 0.35, 2.05, C[2] - 0.8, 0.22, 0.22);
    if (name === "attend") {
      const u = clamp01((f - ATTEND) / 18);
      put(c, 41, ATTENDANT, "fa", C[0] + 2.4 - 1.2 * u, C[2] + 0.35, { expr: f < STOP ? "neutral" : "stern", wave: f >= STOP ? q(0.6 + 0.2 * Math.sin(t * 4), 10) : undefined, look: -1 });
    }
  }
  return out;
};
const FRZ = 2.4;
/** puffy cloud seen from above or the side (400 x 400) */
const fxCloudW = (p: Pen, seed: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, k = 1 + 0.12 * Math.abs(Math.sin(a * 3 + seed)) + 0.05 * Math.sin(a * 7 + seed); pts.push([200 + 180 * k * Math.cos(a), 200 + 170 * k * Math.sin(a)]); }
  p.poly(pts, "#ffffff", 0);
  p.clip(pts, () => { p.ell(230, 260, 170, 110, "#e3ecf7", 0); p.ell(160, 140, 80, 50, "#ffffff", 0); });
};
const qmark = (p: Pen) => { p.g.fillStyle = "#ffd84a"; p.g.strokeStyle = "#241726"; p.g.lineWidth = 10; p.g.font = "900 140px Georgia, serif"; p.g.textAlign = "center"; p.g.strokeText("?", 60, 130); p.g.fillText("?", 60, 130); };
export { FPS, lerp, smooth };
