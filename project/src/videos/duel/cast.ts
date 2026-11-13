// (whale short: pool / actors / lighting helpers are the bridge template's; the staging below is new)
// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxCloud2 } from "./fxw";
import { fxSlosh, fxGlass, fxHole, fxCan, fxBottle, fxTumble, fxVulture, fxBulb, fxTracer, fxSweat } from "./fxd";
import {
  FPS, V3, gy, smooth, clamp01, easeOut, lerp, SHOTS, YOU_BAR, GUN_BAR, BARKEEP, SX, YOU_ST, GUN_ST, SALOON_DOOR, WALL, ROOF,
  WAKE, SPILL, SOAK, TURN, OUTSIDE, COCK, YARDS, SHOTS4, IDEA, HOLES, DRAW, AIM, MISS, NOT, FAST, IDEA2, DOOR, SLIDE, LOOK,
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
const YOU: Outfit = { jacket: "#2fa59a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#5a3b2a", skin: SKINS[0] };
const GUNMAN: Outfit = { jacket: "#3a302a", vest: "#7a2a2a", pants: "#4a3a2a", boots: "#2e2a36", hat: "cowboy", cap: "#1f1b1e", hatBand: "#8a1f1f",
  moustache: "#2a201a", skin: SKINS[1], holster: true, build: "stout" };
const WET: Outfit = { ...GUNMAN, gore: 1, goreCol: "#d9a441" };
const BARKEEP_O: Outfit = { jacket: "#f1ece0", vest: "#3a3d47", pants: "#3b3f52", boots: "#2e2a36", hat: null, moustache: "#4a3020", skin: SKINS[2], tie: "#7a2a2a" };
const HATS = ["#8a6a3a", "#5a4a3a", "#c9a46a", "#3a3d47"];
const COATS = ["#b5653f", "#5d7a9a", "#7a8a4a", "#8c3b4a", "#c9a227", "#6a5a8a"];
const PATRON = Array.from({ length: 8 }, (_, v): Outfit => v % 4 === 3
  ? { jacket: COATS[v % 6], dress: ["#c25a7a", "#5a8fc2", "#d9a441"][v % 3], pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: ["#c9953a", "#2a201a", "#8a3a2a"][v % 3], skin: SKINS[(v * 3) % 4] }
  : { jacket: COATS[v % 6], pants: ["#3b3f52", "#5a4a3a"][v % 2], boots: "#4a3426", hat: "cowboy", cap: HATS[v % 4], skin: SKINS[(v * 3 + 1) % 4], moustache: v % 2 ? "#4a3426" : undefined });
const FRONT = { side: false, mirror: false };

type Cast = { out: Stage; cam: CamInfo; t: number; f: number };
const put = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, fo: FrontOpts, dy = 0, scale = 1, shadow = true) => {
  c.out.places.push(person(c.cam, { i, o, okey: okey + (o.gore ? `g${o.gore}` : "") }, x, gy(x, z) + dy, z, FRONT, { mode: "stand", blink: lidAt(c.t, i), ...fo }, {}, scale));
  if (shadow) blob(c.out, x, gy(x, z), z, scale, dy > 0.05 ? 0.6 : 1);
};
const putSide = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, so: SideOpts, mirror = false, dy = 0, scale = 1) => {
  c.out.places.push(person(c.cam, { i, o, okey }, x, gy(x, z) + dy, z, { side: true, mirror }, {}, { mode: "stand", blink: lidAt(c.t, i), ...so }, scale));
  blob(c.out, x, gy(x, z), z, scale);
};
const card = (c: Cast, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  c.out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const muzzle = (c: Cast, x: number, y: number, z: number, n: number, s = 1.0) => {
  if (n < 0 || n >= 5) return;
  const u = q(n / 5, 10);
  card(c, `mz${u}`, 500, 500, (p) => fxBurst(p, u, "#ffd84a", 9, 50, 240), x, y, z, s, s);
};
const bulb = (c: Cast, f0: number, x: number, y: number, z: number) => {
  if (c.f < f0) return;
  const u = q(clamp01((c.f - f0) / 8), 16), pop = 0.6 + 0.4 * easeOut((c.f - f0) / 5);
  card(c, `bulb${u}`, 200, 260, (p) => fxBulb(p, u), x, y + 0.05 * Math.sin(c.t * 4), z, 0.42 * pop, 0.55 * pop);
};
const patrons = (c: Cast, exprs: (k: number) => Expr = () => "smile") => {
  // tables at (-3.4, 1.2) and (3.6, 0.6): two seated at each, one standing at the piano
  const SPOT: [number, number, "sit" | "stand"][] = [[-3.9, 1.4, "sit"], [-2.9, 1.1, "sit"], [3.2, 0.7, "sit"], [4.1, 0.4, "sit"], [-5.4, -1.0, "stand"], [5.3, -1.6, "stand"]];
  SPOT.forEach(([x, z, mode], k) => put(c, 30 + k, PATRON[k], `p${k}`, x, z, { mode, expr: exprs(k), look: k % 2 ? 1 : -1 }, 0, 1, mode === "stand"));
};
const bartender = (c: Cast, expr: Expr = "neutral") => put(c, 40, BARKEEP_O, "bk", BARKEEP[0], BARKEEP[2], { expr }, 0, 1, false);

// ---------------- staging by shot ----------------
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS, c: Cast = { out, cam, t, f }, name = s.name;
  LNAME = s.light;
  findSun(cam, SUN);
  const yb = (fo: FrontOpts) => put(c, 1, YOU, "you", YOU_BAR[0], YOU_BAR[2], { ...fo });
  const gb = (o: Outfit, fo: FrontOpts) => put(c, 2, o, "gun", GUN_BAR[0], GUN_BAR[2], { ...fo });
  const sweat = (x: number, y: number, z: number) => { const u = (t * 1.3) % 1; card(c, "sweat", 60, 90, fxSweat, x, y - 0.12 * u, z, 0.09, 0.135); };

  if (name === "wake") {
    yb({ expr: f < WAKE ? "dazed" : f < 40 ? "shock" : "nervous", prop: "glass", blink: f < WAKE ? 1 : lidAt(t, 1, [WAKE / FPS, 40 / FPS]), look: f > 46 ? (f % 40 < 20 ? -1 : 1) : 0 });
    gb(GUNMAN, { expr: "stern" }); bartender(c, "neutral"); patrons(c);
  }
  if (name === "saloon") { yb({ expr: "nervous", prop: "glass", look: 1 }); gb(GUNMAN, { expr: "stern" }); bartender(c, "smile_closed"); patrons(c, (k) => (["laugh", "grin", "smile", "laugh", "smile_closed", "grin"] as Expr[])[k]); }
  if (name === "spill") {
    const n = f - SPILL;
    yb({ expr: n < 0 ? "smile" : n < 30 ? "shock" : "nervous", prop: n < 0 ? "glass" : null, armsUp: n >= 0 && n < 22, blink: lidAt(t, 1, [SPILL / FPS]) });
    gb(f >= SOAK ? WET : GUNMAN, { expr: f < SOAK ? "neutral" : f < SOAK + 12 ? "shock" : "stern", blink: lidAt(t, 2, [SOAK / FPS]) });
    bartender(c, f < SPILL ? "neutral" : "shock");
    if (n >= 0 && n < 14) { const u = q(n / 14, 14); card(c, `slosh${u}`, 500, 300, (p) => fxSlosh(p, u), -0.05, 1.42, -2.55, 1.15, 0.69); }
    if (n >= 0 && n < 26) { const u = n / 26; card(c, "glassFly", 200, 200, (p) => fxGlass(p, 0.1), -0.45 + 0.9 * u, 1.3 + 0.9 * Math.sin(Math.PI * u) - 0.4 * u, -2.5, 0.16, 0.16, { rot: -u * 9 }); }
  }
  if (name === "turn") { gb(WET, { expr: "stern", headTilt: q(-6 * easeOut((f - TURN) / 8), 2) }); for (let k = 0; k < 3; k++) { const u = ((t * 1.6 + k * 0.33) % 1); card(c, "drip", 60, 90, (p) => p.poly([[30, 6], [52, 54], [30, 84], [8, 54]], "#c98a2a", 5), GUN_BAR[0] - 0.2 + k * 0.18, 1.55 - 0.7 * u, GUN_BAR[2] + 0.06, 0.06, 0.09); } }
  if (name === "apology") {
    yb({ expr: f < 250 ? "smile" : "nervous", wave: q(Math.sin(t * 11), 10), headTilt: 6 });
    gb(WET, { expr: "stern" }); bartender(c, "nervous"); sweat(YOU_BAR[0] + 0.22, 1.98, YOU_BAR[2] + 0.06);
  }
  if (name === "outside") {
    if (f < 296) gb(WET, { expr: "stern", wave: q(0.8 + 0.2 * Math.sin(t * 6), 10) });
    else {
      const u = clamp01((f - 300) / 16);
      putSide(c, 1, YOU, "you", -0.5 + 0.2 * u, 3.6 + 1.6 * u, { mode: "march", phase: q(((f - 300) / 12) % 1, 12), stomp: 0.6, stride: 0.6, expr: "nervous" }, true);
    }
  }
  if (name === "street") {
    putSide(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { mode: "stand", expr: "nervous" }, false);
    putSide(c, 2, WET, "gun", GUN_ST[0], GUN_ST[2], { mode: "stand", expr: "stern" }, true);
    [[94.6, -6, 0], [94.6, -9, 1], [105.4, -20, 2], [105.4, 2, 3]].forEach(([x, z, k]) => put(c, 30 + k, PATRON[k], `p${k}`, x, z, { expr: "nervous", look: x < SX ? 1 : -1 }, 0.3));
    const u = (f - 317) / 108, tx = 108 - 18 * u;
    card(c, "tumble", 300, 300, fxTumble, tx, 0.45 + 0.25 * Math.abs(Math.sin(u * 9)), -14, 0.9, 0.9, { rot: u * 14 });
  }
  if (name === "badnews") { put(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { expr: "nervous", prop: "gun", tilt: q(2 * Math.sin(t * 23), 3) }); sweat(YOU_ST[0] + 0.22, 1.98, YOU_ST[2] - 0.06); }
  if (name === "cock") put(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { expr: f < COCK ? "nervous" : "shock", prop: "gun", blink: lidAt(t, 1, [COCK / FPS]) });
  if (name === "yards") {
    putSide(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { mode: "push", pose: 0.85, expr: "nervous", gun: true }, false);
    put(c, 2, WET, "gun", GUN_ST[0], GUN_ST[2], { expr: f < 566 ? "stern" : "smile_closed", wave: f > 566 ? q(Math.sin(t * 8), 8) : undefined });
  }
  if (name === "lifelong") {
    const k = SHOTS4.findIndex((s0, i) => f >= s0 && (i === 3 || f < SHOTS4[i + 1]));
    put(c, 2, WET, "gun", GUN_ST[0], GUN_ST[2], { expr: f < SHOTS4[0] ? "stern" : "smile_closed", prop: f < SHOTS4[0] - 10 ? null : "gun" });
    SHOTS4.forEach((s0, i) => {
      const bx = GUN_ST[0] - 0.75 + i * 0.5, n = f - s0 - 2, by = 1.18;
      if (n < 0) card(c, `bottle${i % 3}`, 100, 260, (p) => fxBottle(p, i), bx, by + 0.17, GUN_ST[2] - 2.4, 0.13, 0.34);
      else if (n < 14) { const u = q(n / 14, 14); card(c, `bburst${i % 3}${u}`, 100, 260, (p) => fxBottle(p, i, Math.max(0.05, u)), bx, by + 0.17, GUN_ST[2] - 2.4, 0.5, 1.3); }
    });
    if (k >= 0) muzzle(c, GUN_ST[0] + 0.42, 1.95, GUN_ST[2] + 0.1, f - SHOTS4[k], 0.5);
  }
  if (name === "advantage") { put(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { expr: f < IDEA ? "nervous" : "grin", prop: "gun", blink: lidAt(t, 1, [IDEA / FPS]) }); bulb(c, IDEA, YOU_ST[0] - 0.24, 2.16, YOU_ST[2] - 0.05); }
  if (name === "missed") {
    card(c, "can", 100, 140, fxCan, WALL[0] - 0.55, 1.12, WALL[2] - 0.05, 0.16, 0.22);
    const n = f < HOLES[0] ? 0 : f < HOLES[1] ? 8 : f < HOLES[2] ? 16 : 40;
    for (let k = 0; k < n; k++) {
      let y = 0.25 + hh(k, 41) * 2.4, z = WALL[2] - 1.4 + hh(k, 42) * 2.8;
      if (Math.abs(y - 1.12) < 0.3 && Math.abs(z - WALL[2]) < 0.28) z += 0.6;
      card(c, `hole${k % 4}`, 100, 100, (p) => fxHole(p, k % 4), WALL[0] - 0.04, y, z, 0.13, 0.13);
    }
  }
  if (name === "draw") put(c, 2, WET, "gun", GUN_ST[0], GUN_ST[2], { expr: "stern", prop: f < DRAW ? null : "gun" });
  if (name === "aim") putSide(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2] - 0.3, { mode: "push", pose: q(smooth((f - AIM) / 50) * 0.85, 30), expr: "lick", gun: true }, false);
  if (name === "misses") {
    if (f < 978) { put(c, 2, WET, "gun", GUN_ST[0], GUN_ST[2], { expr: "stern", prop: "aim" }); muzzle(c, GUN_ST[0] + 0.02, 1.38, GUN_ST[2] + 0.3, f - MISS + 3, 0.7); }
    else {
      put(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { expr: f < 1000 ? "shock" : "relief", prop: "gun", blink: lidAt(t, 1, [1000 / FPS]) });
      const n = f - 978;
      if (n < 8) card(c, "tracer", 400, 60, fxTracer, YOU_ST[0] + 0.45 - 0.12 * n, 2.02, YOU_ST[2] + 0.1, 0.9, 0.13);
      if (n < 22) { const u = q(n / 22, 11); card(c, `puff${u}`, 400, 400, (p) => fxCloud2(p, "#e8e2d6", 1), YOU_ST[0] + 0.12, 2.0 + 0.15 * u, YOU_ST[2] - 0.05, 0.16 + 0.12 * u, 0.15 + 0.1 * u); }
    }
  }
  if (name === "ifnot") {
    putSide(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2] - 0.6, { mode: "push", pose: q(0.25 + 0.15 * clamp01((f - NOT) / 48), 30), expr: "nervous", gun: true }, false);
  }
  if (name === "vulture") { const nod = Math.max(0, Math.sin((f - FAST) * 0.22)); card(c, `vult${q(nod, 6)}${f % 50 < 4}`, 300, 300, (p) => fxVulture(p, q(nod, 6), f % 50 < 4), ROOF[0], ROOF[1] + 0.62, ROOF[2], 1.2, 1.2); }
  if (name === "strategy") { put(c, 1, YOU, "you", YOU_ST[0], YOU_ST[2], { expr: f < IDEA2 ? "neutral" : "smile_closed", blink: lidAt(t, 1, [IDEA2 / FPS]) }); bulb(c, IDEA2, YOU_ST[0] - 0.24, 2.16, YOU_ST[2] - 0.05); }
  if (name === "walkback") {
    const u = clamp01((f - 1225) / (DOOR - 1225 + 6));
    if (f < DOOR + 10) putSide(c, 1, YOU, "you", SALOON_DOOR[0] + 1.4 - 0.7 * u, SALOON_DOOR[2] + 2.4 - 2.4 * u, { mode: "march", phase: q(((f - 1225) / 13) % 1, 12), stomp: 0.6, stride: 0.6, expr: "smile_closed" }, true);
  }
  if (name === "drink") {
    const n = f - SLIDE, held = n > 20, looking = f >= LOOK;
    yb({ expr: looking ? "nervous" : "smile_closed", prop: n < 0 ? "glassFull" : null, look: looking ? 1 : 0 });
    gb(WET, { expr: looking ? "neutral" : "stern", prop: held ? "glassFull" : null, look: looking ? -1 : 0, blink: lidAt(t, 2, [LOOK / FPS]) });
    bartender(c, looking ? "nervous" : "smile_closed"); patrons(c, () => (looking ? "nervous" : "smile"));
    if (n >= 0 && n <= 20) card(c, "glassSlide", 200, 200, (p) => fxGlass(p, 0.8), lerp(YOU_BAR[0] + 0.15, GUN_BAR[0] - 0.12, easeOut(n / 20)), 1.21, -3.32, 0.15, 0.15);
  }
  return out;
};
export { FPS, lerp, smooth };
