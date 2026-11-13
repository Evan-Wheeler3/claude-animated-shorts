// (whale short: pool / actors / lighting helpers are the bridge template's; the staging below is new)
// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxPermit, fxSign, fxLetter, fxCal, fxRings, fxBars, fxWifi, fxMorse, fxRuler, fxRing, fxWatch, fxPhones, fxSpark, fxSweat } from "./fxt";
import { fxCloud2 } from "./fxw";
import {
  FPS, V3, gy, smooth, clamp01, easeOut, lerp, SHOTS, TOWER, TOP, PLAZA, RESTO, ROOM, LAND, HOUSE, SEA, halfW, mastAt, newAntAt,
  SECRET, PERMIT, YEARS, DOWN, WAIT, LETTER, MONSTER, LUNCH, CANT, Y1909, JOB, RADIO, SPREADS, BLOCK, CURVE, HIGHER, FARTHER, WIFI, UP, BASE,
  TALL, BIGGEST, ARMY, RENEW, SHIPS, WHERE, WAR, LISTEN, TODAY, NEWONE, TALLER, PROPOSE, KNEEL, ROUTER,
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
const MEN = [0, 1, 2].map((v): Outfit => ({ jacket: ["#3a3d47", "#5a4a3a", "#2f3f5a"][v], pants: "#3b3f52", boots: "#2e2a36", hat: v === 1 ? "fedora" : "tophat", cap: "#3a3d47", tie: ["#8c3b4a", "#2f5f6a", "#c9a227"][v], skin: SKINS[[0, 1, 3][v]], moustache: v === 0 ? "#4a3020" : undefined }));
const LADIES = [0, 1].map((v): Outfit => ({ jacket: ["#7b5ac9", "#c25a7a"][v], dress: ["#9a7ad9", "#e9a3b8"][v], pants: "#3b3f52", boots: "#4a3426", hat: "bonnet", skin: SKINS[[0, 2][v]] }));
const ARTIST = [0, 1, 2].map((v): Outfit => ({ jacket: ["#2a2428", "#6a5a8a", "#8c3b4a"][v], pants: "#3b3f52", boots: "#2e2a36", hat: "cap", cap: ["#2a2428", "#3a3d47", "#2a2428"][v], skin: SKINS[[0, 1, 2][v]], moustache: v !== 1 ? ["#2a201a", "", "#8a8a92"][v] : undefined }));
const WRITER: Outfit = { jacket: "#3a3d47", vest: "#8a6a3a", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hair: "#5a3b2a", moustache: "#5a3b2a", skin: SKINS[0], build: "stout" };
const EIFFEL: Outfit = { jacket: "#2a2428", pants: "#3b3f52", boots: "#2e2a36", hat: "tophat", cap: "#2a2428", moustache: "#c9c9cc", tie: "#c9c9cc", skin: SKINS[0], build: "stout" };
const SOLDIER: Outfit = { jacket: "#3a5a9a", pants: "#c0353a", boots: "#2e2a36", hat: "peaked", cap: "#c0353a", skin: SKINS[1], buttons: "#e8c45a" };
const OFFICIAL: Outfit = { jacket: "#2a2428", pants: "#3b3f52", boots: "#2e2a36", hat: "tophat", cap: "#2a2428", tie: "#c0353a", skin: SKINS[2], moustache: "#2a201a" };
const OPERATOR: Outfit = { jacket: "#5a6a4a", pants: "#3d4440", boots: "#2e2a36", hat: "hair", hair: "#2a201a", skin: SKINS[1] };
const CAPTAIN: Outfit = { jacket: "#2f3f5a", pants: "#2f3f5a", boots: "#2e2a36", hat: "peaked", cap: "#2f3f5a", moustache: "#f2f2f2", skin: SKINS[0], buttons: "#e8c45a", build: "stout" };
const YOU: Outfit = { jacket: "#2fa59a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", skin: SKINS[0] };
const HER: Outfit = { jacket: "#c25a7a", dress: "#e9a3b8", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#c9953a", skin: SKINS[2] };
const UPSTAIRS: Outfit = { jacket: "#d9a441", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#2a201a", skin: SKINS[3] };
const FRONT = { side: false, mirror: false };

type Cast = { out: Stage; cam: CamInfo; t: number; f: number };
const put = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, fo: FrontOpts, dy = 0, scale = 1, shadow = true) => {
  c.out.places.push(person(c.cam, { i, o, okey }, x, gy(x, z) + dy, z, FRONT, { mode: "stand", blink: lidAt(c.t, i), ...fo }, {}, scale));
  if (shadow) blob(c.out, x, gy(x, z) + dy, z, scale);
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
  const P = PLAZA;
  const crowd = (n: number, exprs: (i: number) => Expr, fo: (i: number) => FrontOpts = () => ({}), spread = 1) => {
    for (let i = 0; i < n; i++) {
      const o = i % 3 === 1 ? LADIES[i % 2] : MEN[i % 3];
      put(c, 10 + i, o, `c${i}`, P[0] - 7 * spread + (i % 7) * 2.1 * spread + hh(i, 1), P[2] - 6 - Math.floor(i / 7) * 3.2 - hh(i, 2), { expr: exprs(i), ...fo(i) });
    }
  };
  if (name === "fair") {
    crowd(21, (i) => (["grin", "smile", "laugh"] as Expr[])[i % 3], (i) => ({ wave: i % 4 === 0 ? q(Math.sin(t * 9 + i), 8) : undefined, look: -1 }));
    if (f >= PERMIT - 6) {
      put(c, 40, OFFICIAL, "off", P[0] + 3.0, P[2], { expr: "stern" });
      card(c, "permit0", 360, 480, (p) => fxPermit(p, 0), P[0] + 2.0, 1.55, P[2] + 0.2, 0.9 * pop(f, PERMIT - 6), 1.2 * pop(f, PERMIT - 6));
    }
  }
  if (name === "down") {
    put(c, 40, OFFICIAL, "off", P[0] + 3.0, P[2], { expr: f < DOWN - 8 ? "stern" : "grin" });
    const u = q(clamp01((f - (DOWN - 8)) / 6), 8);
    card(c, `permit${u}`, 360, 480, (p) => fxPermit(p, u), P[0] + 2.0, 1.55, P[2] + 0.2, 0.9, 1.2);
  }
  if (name === "artists") {
    const signs: [string, string][] = [["NO!", "#c0353a"], ["UGLY", "#2a2428"], ["MONSTROUS", "#c0353a"]];
    [-0.8, 0, 0.8].forEach((dx, k) => {
      put(c, 20 + k, ARTIST[k], `a${k}`, P[0] + dx, P[2] + (k === 1 ? 0 : 0.2), { expr: f < MONSTER ? (k === 1 ? "stern" : "pained") : "shock", prop: k === 1 && f >= LETTER - 10 ? "clipboard" : null, armsUp: k !== 1 });
      if (k !== 1) card(c, `sign${k}`, 300, 400, (p) => fxSign(p, signs[k][0], signs[k][1]), P[0] + dx * 1.15, 2.55 + 0.05 * Math.sin(t * 6 + k), P[2] + 0.25, 0.6, 0.8);
    });
    if (f >= LETTER - 6) card(c, "letter", 300, 400, fxLetter, P[0] - 0.5, 1.7, P[2] + 1.2, 0.66 * pop(f, LETTER - 6), 0.88 * pop(f, LETTER - 6));
  }
  if (name === "lunch") {
    const R = RESTO;
    put(c, 30, WRITER, "wr", R[0], R[2] - 0.55, { mode: "sit", expr: f < 500 ? "smile_closed" : "grin", headTilt: 4 }, 0.42, 1, false);
  }
  if (name === "reveal") card(c, "tiny", 200, 200, (p) => { p.ell(100, 100, 60, 60, "#ffe2c2", 7); p.dot(80, 96, 6); p.dot(120, 96, 6); p.arc(100, 116, 20, 12, 20, 160, 6); }, 0, 58.8, 39.3, 1.4, 1.4);
  if (name === "deadline") {
    put(c, 41, EIFFEL, "eif", P[0] + 3.2, P[2], { expr: f < JOB - 30 ? "nervous" : "smile_closed", prop: f >= JOB - 30 ? "salute" : null, blink: lidAt(t, 41, [(JOB - 30) / FPS]) });
    card(c, `cal`, 240, 300, (p) => fxCal(p, "1909"), P[0] + 2.3, 2.35, P[2] + 0.2, 0.62 * pop(f, Y1909 - 4), 0.78 * pop(f, Y1909 - 4));
    if (f >= JOB - 30) card(c, `bulb${q(clamp01((f - JOB + 30) / 8), 8)}`, 200, 260, (p) => { p.ell(100, 100, 60, 64, "#fff3a0", 8); p.poly([[74, 156], [126, 156], [122, 210], [78, 210]], "#9aa1aa", 7); }, P[0] + 3.6, 2.5, P[2] + 0.1, 0.3, 0.39);
  }
  if (name === "radio") { const u = q(clamp01((f - RADIO + 6) / 14), 10); card(c, `spark${u}`, 500, 500, (p) => fxSpark(p, u), 0, 318, 0, 22, 22); card(c, `ringsT${q((t * 0.9) % 1, 16)}`, 800, 800, (p) => fxRings(p, q((t * 0.9) % 1, 16), 0), 0, 318, 0, 80, 80); }
  if (name === "spread" || name === "higher") {
    const h = mastAt(id, f), L = LAND, block = name === "spread" ? 0.6 : 0;
    const ph = q((t * 0.7) % 1, 16);
    card(c, `ringsL${ph}${block}`, 800, 800, (p) => fxRings(p, ph, block), L[0], h + 0.5, L[2], name === "spread" ? 70 : 160, name === "spread" ? 70 : 160);
    // the town behind the hills: no signal; the farm in the open: full bars
    const town = name === "higher" && f > FARTHER ? 3 : 0;
    for (const [x, z] of [[-62, -60], [-74, -48], [-58, -78]]) card(c, `bars${town}`, 200, 200, (p) => fxBars(p, town), L[0] + x, 11, L[2] + z, 6, 6);
    for (const [x, z] of [[40, -30], [52, -44]]) card(c, "bars3", 200, 200, (p) => fxBars(p, 3), L[0] + x, 11, L[2] + z, 6, 6);
  }
  if (name === "wifi") {
    const H = HOUSE;
    put(c, 50, UPSTAIRS, "up", H[0] - 0.6, H[2] - 1.0, { expr: "grin", prop: null, wave: q(Math.sin(t * 6), 8) }, 2.92);
    put(c, 51, YOU, "you", H[0] + 0.6, H[2] - 0.8, { expr: f > BASE - 6 ? "pained" : "nervous", armsUp: f > BASE + 6 }, 0.1);
    card(c, "wifi3", 200, 200, (p) => fxWifi(p, 3), H[0] - 0.6, 5.15, H[2] - 0.9, 0.7, 0.7);
    card(c, "wifi0", 200, 200, (p) => fxWifi(p, 0), H[0] + 0.6, 2.25, H[2] - 0.7, 0.7, 0.7);
  }
  if (name === "tallest") { const ph = q((t * 0.6) % 1, 16); if (f >= BIGGEST - 8) card(c, `ringsB${ph}`, 800, 800, (p) => fxRings(p, ph, 0), 0, 318, 0, 420 * pop(f, BIGGEST - 8), 420 * pop(f, BIGGEST - 8)); }
  if (name === "army") {
    [-1.3, 0, 1.3].forEach((dx, k) => put(c, 60 + k, SOLDIER, `s${k}`, P[0] + dx - 0.6, P[2] - 0.6, { expr: k === 1 ? "grin" : "smile", prop: "salute" }));
    put(c, 40, OFFICIAL, "off", P[0] + 1.6, P[2] + 0.3, { expr: f < RENEW ? "neutral" : "grin" });
    card(c, `permitR${q(clamp01((f - RENEW) / 8), 8)}`, 360, 480, (p) => fxPermit(p, 1, q(clamp01((f - RENEW) / 8), 8)), P[0] + 0.7, 2.05, P[2] + 0.6, 0.8, 1.07);
  }
  if (name === "ships") {
    const S = SEA, ph = q((t * 0.5) % 1, 16);
    card(c, `ringsS${ph}`, 800, 800, (p) => fxRings(p, ph, 0, "#9fe0ff"), S[0] - 30, 30, S[2] - 260, 300, 300);
    put(c, 70, CAPTAIN, "cap", S[0] + 0.4, S[2] - 9.2, { expr: f < WHERE ? "neutral" : "grin", prop: "coin" }, 4.3);
    card(c, `watch${q((t * 0.4) % 1, 12)}`, 200, 200, (p) => fxWatch(p, q((t * 0.4) % 1, 12)), S[0] + 1.0, 5.3, S[2] - 8.9, 0.36, 0.36);
  }
  if (name === "war") {
    const R = ROOM;
    put(c, 71, OPERATOR, "op", R[0], R[2] - 0.6, { mode: "sit", expr: f < LISTEN ? "stern" : "shock", blink: lidAt(t, 71, [LISTEN / FPS]) }, 0.42, 1, false);
    card(c, "phones", 200, 120, fxPhones, R[0], 1.92, R[2] - 0.55, 0.62, 0.37);
    card(c, `morse${q((t * 0.8) % 1, 16)}`, 500, 120, (p) => fxMorse(p, q((t * 0.8) % 1, 16)), R[0] - 0.2, 2.5, R[2] - 0.5, 1.6, 0.38);
  }
  if (name === "today") {
    const u = newAntAt(f);
    if (f > TALLER - 10) card(c, `ruler${u > 0.9 ? 1 : 0}`, 200, 500, (p) => fxRuler(p, u > 0.9 ? 1 : 0), 6, 327, 2, 3, 7.5);
    if (f > NEWONE - 20) card(c, "heli", 300, 200, (p) => { p.ell(150, 120, 90, 46, "#c0353a", 8); p.stroke([[20, 50], [280, 50]], 10); p.stroke([[150, 50], [150, 76]], 8); p.poly([[60, 110], [10, 100], [10, 120]], "#c0353a", 6); }, 0, TOP + 70 + (1 - u) * 30, 0, 14, 9.3);
  }
  if (name === "propose") {
    const kneel = f >= KNEEL - 20;
    put(c, 80, HER, "her", 6.7, 1.6, { expr: f < KNEEL ? "smile" : f < ROUTER ? "shock" : "nervous", look: 1 }, TOP);
    put(c, 81, YOU, "you", 6.4, 2.7, { mode: kneel ? "sit" : "stand", expr: "grin", look: -1 }, TOP);
    if (kneel) card(c, "ring", 200, 200, fxRing, 6.62, TOP + 0.62, 3.05, 0.24, 0.24);
    if (f > ROUTER - 6) card(c, "wifiTop", 200, 200, (p) => fxWifi(p, 3), 0, TOP + 46, 0, 14 * pop(f, ROUTER - 6), 14 * pop(f, ROUTER - 6));
  }
  return out;
};
export { FPS, lerp, smooth };
