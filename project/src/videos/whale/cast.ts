// (whale short: pool / actors / lighting helpers are the bridge template's; the staging below is new)
// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxGull, fxGullFar, fxFeather, fxStink, fxFlies, fxBubble, fxCloud2, fxSplat, fxBits, fxShards, fxStreak, fxHub, fxBoot, fxSquirt, MEAT, GullPose } from "./fxw";
import {
  FPS, V3, gy, at, smooth, clamp01, easeOut, lerp, State, SHOTS, WH, CRATE, HOOKPLG, SIGN, EASEL, LOG, WALT0, CROWD, REP, PLG, CAR, KET, DEAL, PL,
  STINK, CRATES0, CRATES1, BLAST, SHOCK, HIT1, HIT2, HIT3, SLAB, POOF, REPLAY, STOMP, HEAD_AT, CHUNKS, chunkAt, HOOK_BOOM, BOULDER,
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
const ENG: Outfit = { jacket: "#f1ece0", pants: "#4a5568", boots: "#4a3426", hat: "hardhat", cap: "#f7f5ee", tie: "#c0353a", skin: SKINS[0] };
const WORKER = [0, 1].map((v): Outfit => ({ jacket: ["#3f6fb5", "#5d7a3a"][v], vest: "#ff8a2a", pants: "#3b3f52", boots: "#4a3426", hat: "hardhat", cap: "#f4c430", skin: SKINS[v ? 3 : 1], moustache: v ? "#2a201a" : undefined }));
const WALT: Outfit = { jacket: "#8a5a34", pants: "#3d4440", boots: "#2e2a36", hat: "fedora", cap: "#5b6b4a", moustache: "#4a3020", skin: SKINS[1], build: "stout" };
const REPORTER: Outfit = { jacket: "#2f4f7f", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hair: "#c9953a", tie: "#d9a441", skin: SKINS[0] };
const CAMMAN: Outfit = { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#3a3d47", skin: SKINS[3] };
const SALES: Outfit = { jacket: "#d9a441", pants: "#5a3b2a", boots: "#2e2a36", hat: "hair", hair: "#2a201a", tie: "#c0353a", moustache: "#2a201a", skin: SKINS[2], build: "stout" };
const COATS = ["#e2733c", "#3f8fb5", "#c9a227", "#8c3b4a", "#5d9a6a", "#7b5ac9", "#d95f8a", "#2f5f6a"];
const HAIRS = ["#5a3b2a", "#2a201a", "#c9953a", "#8a8a92"];
const folk70 = (v: number): Outfit => {
  const o: Outfit = { jacket: COATS[v % 8], pants: ["#3b3f52", "#5a4a3a", "#3d4440"][v % 3], boots: "#4a3426", skin: SKINS[(v * 3 + 1) % 4] };
  if (v % 4 === 1) return { ...o, hat: "cap", cap: COATS[(v + 3) % 8] };
  if (v % 4 === 3) return { ...o, hat: null, moustache: HAIRS[v % 4] };
  const h: Outfit = { ...o, hat: "hair", hair: HAIRS[(v >> 1) % 4] };
  return v % 3 === 2 ? { ...h, dress: COATS[(v + 5) % 8] } : h;
};
const NFOLK = 18;
const FOLK = Array.from({ length: NFOLK }, (_, i) => (i % 6 === 4 ? { ...KID, jacket: COATS[(i + 2) % 8], cap: COATS[(i + 5) % 8] } : folk70(i)));
const withGore = (o: Outfit, n: number, col?: string): Outfit => (n > 0 ? { ...o, gore: n, goreCol: col } : o);
const FRONT = { side: false, mirror: false };
const isKid = (i: number) => i % 6 === 4;

type Cast = { out: Stage; cam: CamInfo; t: number; f: number };
const put = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, fo: FrontOpts, dy = 0, scale = 1, shadow = true) => {
  const y = gy(x, z) + dy;
  c.out.places.push(person(c.cam, { i, o, okey: okey + (o.gore ? `g${o.gore}${o.goreCol ?? ""}` : "") }, x, y, z, FRONT, { mode: "stand", blink: lidAt(c.t, i), ...fo }, {}, scale));
  if (shadow) blob(c.out, x, gy(x, z), z, scale, dy > 0.05 ? 0.6 : 1);
};
const putSide = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, so: SideOpts, mirror = false, yaw?: number) => {
  const pl = person(c.cam, { i, o, okey }, x, gy(x, z), z, { side: true, mirror }, {}, { mode: "stand", blink: lidAt(c.t, i), ...so });
  c.out.places.push(yaw === undefined ? pl : { ...pl, yaw });
  blob(c.out, x, gy(x, z), z);
};
const card = (c: Cast, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  c.out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const gull = (c: Cast, pose: GullPose, expr: "neutral" | "grin" | "shock", x: number, y: number, z: number, s = 0.62, bib = false, mirror = false) =>
  card(c, `gull${pose}${expr}${bib}`, 300, 300, (p) => fxGull(p, pose, expr, bib), x, y + s * 0.45, z, mirror ? -s : s, s);
/** gulls wheeling over a point */
const flock = (c: Cast, n: number, cx: number, cyy: number, cz: number, R: number, flee = 0) => {
  for (let i = 0; i < n; i++) {
    const a = c.t * (0.5 + 0.12 * hh(i, 21)) + i * 2.1, r = R * (0.6 + 0.5 * hh(i, 22)) + flee * 60;
    const flap = Math.sin(c.t * (9 + 3 * hh(i, 23)) + i) > 0 ? "up" : "down";
    gull(c, flap, flee ? "shock" : "neutral", cx + r * Math.cos(a), cyy + 2 * Math.sin(a * 1.7 + i) + flee * 14, cz + r * Math.sin(a) * 0.6 - flee * 40, 1.1, false, Math.sin(a) > 0);
  }
};

// ---------------- where the crowd stands ----------------
const nearSpot = (i: number, dx = 0, dz = 0): [number, number] => [-4 + (i % 8) * 1.15 + (hh(i, 31) - 0.5) * 0.3 + dx, 18 + Math.floor(i / 8) * 1.7 + (hh(i, 32) - 0.5) * 0.4 + dz];
const duneSpot = (i: number): [number, number] =>
  i === 3 ? [HEAD_AT[0], HEAD_AT[2]] : [CROWD[0] + ((i % 6) - 2.6) * 1.05 + (hh(i, 33) - 0.5) * 0.25, CROWD[2] + Math.floor(i / 6) * 1.5 + (hh(i, 34) - 0.5) * 0.3 + (i % 6 === 3 ? 0.5 : 0)];
const WALT_DUNE: [number, number] = [CROWD[0] + 3.9, CROWD[2] - 0.6];
const crowdNear = (c: Cast, expr: (i: number) => Expr, fo: (i: number) => FrontOpts = () => ({}), dx = 0, dz = 0, skip: (i: number) => boolean = () => false) => {
  for (let i = 0; i < NFOLK; i++) {
    if (skip(i)) continue;
    const [x, z] = nearSpot(i, dx, dz);
    put(c, i, FOLK[i], `f${i}`, x, z, { expr: expr(i), ...fo(i) }, 0, isKid(i) ? 0.72 : 1);
  }
};

// ---------------- blast ----------------
const PLUME: { dx: number; h: number; s: number; col: string; d: number }[] = [
  { dx: 0, h: 27, s: 15, col: "#e9a3a0", d: 0 }, { dx: -6, h: 19, s: 13, col: "#dcc097", d: 2 }, { dx: 6.5, h: 21, s: 13, col: "#d9b98a", d: 3 },
  { dx: -2.5, h: 12, s: 14, col: "#c9a57c", d: 1 }, { dx: 3, h: 10, s: 15, col: "#e7c7a0", d: 0 }, { dx: -9, h: 7, s: 11, col: "#d9b98a", d: 4 },
  { dx: 9, h: 6, s: 11, col: "#e9a3a0", d: 4 }, { dx: 0, h: 4, s: 17, col: "#c9a57c", d: 0 }, { dx: 1, h: 33, s: 10, col: "#f0b8b4", d: 5 },
];
const blastFx = (c: Cast, n: number, plume = true, k = 1) => {
  if (n < 0) return;
  if (n < 12) {
    const u = q(n / 12, 30);
    card(c, `boomA${u}`, 500, 500, (p) => fxBurst(p, u, "#ffd84a", 14, 60, 240), WH[0], WH[1] + 3, WH[2] + 0.5, 34 * k, 34 * k);
    card(c, `boomB${u}`, 500, 500, (p) => fxBurst(p, u, "#ff7a2a", 9, 40, 170), WH[0], WH[1] + 3, WH[2] + 0.7, 22 * k, 22 * k);
  }
  if (!plume) return;
  PLUME.forEach((pl, i) => {
    const m = n - pl.d;
    if (m < 0) return;
    const r = easeOut(m / 44), drift = Math.max(0, m - 44) * 0.012, s = pl.s * (0.35 + 0.65 * r) * k;
    card(c, `plume${pl.col}${i % 3}`, 400, 400, (p) => fxCloud2(p, pl.col, i % 3), WH[0] + pl.dx * (0.4 + 0.6 * r) + drift * 6, WH[1] + 1.5 + (pl.h * r + drift * 8) * k, WH[2] - 0.2 * i, s, s * 0.9, { rot: 0.1 * Math.sin(i * 2.3) });
  });
};
/** the smoke that keeps rising from the crater */
const smokeFx = (c: Cast) => {
  for (let i = 0; i < 5; i++) {
    const u = (c.t * 0.13 + i / 5) % 1, s = 1.6 + 4.2 * u;
    card(c, `smoke${i % 3}`, 400, 400, (p) => fxCloud2(p, "#8f8d96", i % 3), WH[0] - 2.2 + 4 * u + Math.sin(i * 3) * 0.6, WH[1] + 2.4 + 16 * u, WH[2] - 1.2, s, s * 0.9);
  }
};
/** what a landing chunk does to the ground: a splat that stays, and a short spray of bits */
const chunkFx = (c: Cast, from: number, to: number) => {
  for (let i = from; i < Math.min(to, CHUNKS.length); i++) {
    const ch = CHUNKS[i], n = c.f - ch.land;
    if (n < 0 || i === 0 || i === 3) continue;
    const gyy = gy(ch.to[0], ch.to[2]);
    card(c, `splat${i % 4}`, 400, 400, (p) => fxSplat(p, i % 4), ch.to[0], gyy + 0.03, ch.to[2], 2.6 * ch.s + 0.6, 2.6 * ch.s + 0.6, { flat: true, rot: i * 1.3 });
    if (n < 12) { const u = q(n / 12, 30); card(c, `bits${u}`, 300, 300, (p) => fxBits(p, u), ch.to[0], gyy + 0.9, ch.to[2], 2.2, 2.2); }
  }
};

// ---------------- staging by shot ----------------
export const stage = (id: number, f: number, st: State, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS, c: Cast = { out, cam, t, f };
  LNAME = s.light;
  findSun(cam, SUN);
  const name = s.name;
  const engAtPlunger = (P: V3, expr: Expr) => {
    const handY = 0.98 - 0.36 * st.plunger; // the T handle (world.ts draws it at P + 0.78 m in x)
    putSide(c, 50, ENG, "eng", P[0], P[2], { mode: "push", pose: q(0.55 + 0.45 * st.plunger, 30), expr, hand: [300 + 0.78 / SU, 975 - handY / SU] }, false, 0);
  };
  if (name === "hook") {
    engAtPlunger(HOOKPLG, f < 118 ? "grin" : "laugh");
    put(c, 51, WORKER[0], "w0", -3.6, 15.4, { expr: "nervous" });
    put(c, 52, WORKER[1], "w1", -2.3, 16.3, { expr: "nervous", look: 1 });
    const u = q(((t * 0.8) % 1), 30);
    card(c, `flies${u}`, 300, 300, (p) => fxFlies(p, u), 5.4, WH[1] + 2.9, 11.6, 1.5, 1.5);
    blastFx(c, st.blast, true, 0.8);
  }
  if (name === "beach") {
    crowdNear(c, (i) => (["neutral", "shock", "nervous", "stern"] as Expr[])[i % 4], () => ({}), -6, -0.5);
    flock(c, 6, 2, 9, 6, 9);
  }
  if (name === "smell") {
    const swap = [STINK / FPS];
    crowdNear(c, (i) => (i % 3 === 1 ? "dazed" : "pained"), (i) => ({ prop: "pinch", blink: lidAt(t, i, swap), headTilt: q(3 * Math.sin(t * 2 + i), 4) }));
    for (let k = 0; k < 5; k++) {
      const u = q(((t * 0.5 + k * 0.37) % 1), 24), x = -4.5 + k * 2.2;
      card(c, `stink${u}`, 300, 400, (p) => fxStink(p, u), x, gy(x, 17) + 1.5 + 0.9 * u, 17.0 + (k % 2) * 0.5, 0.6, 0.8);
    }
  }
  if (name === "sign") {
    gull(c, "perch", "neutral", SIGN[0] + 0.1, SIGN[1] + 3.02, SIGN[2], 0.6);
    const u = q(((t * 0.8) % 1), 30);
    card(c, `flies${u}`, 300, 300, (p) => fxFlies(p, u), 3, WH[1] + 3.2, 11, 1.6, 1.6);
  }
  if (name === "dept" || (name === "boulder" && f < 506)) {
    const think = name === "boulder" && f >= 486;
    put(c, 50, ENG, "eng", -1.5, 17.2, { expr: name === "dept" ? "stern" : think ? "smile_closed" : "neutral", prop: "clipboard", blink: lidAt(t, 50, [486 / FPS]) });
    put(c, 51, WORKER[0], "w0", -3.05, 17.45, { expr: "neutral", look: 1 });
    put(c, 52, WORKER[1], "w1", 0.1, 17.4, { expr: name === "dept" ? "nervous" : "neutral", look: -1 });
    crowdNear(c, (i) => (["neutral", "stern", "nervous"] as Expr[])[i % 3], () => ({}), 0, 3.6);
    if (think) {
      const pop = 0.6 + 0.4 * easeOut((f - 486) / 6);
      card(c, "bubbleB", 700, 600, (p) => fxBubble(p, "boulder", 0), -0.62, gy(-1.5, 17.2) + 2.5, 17.15, 1.15 * pop, 0.99 * pop);
    }
  }
  if (name === "boulder" && f >= BOULDER && f < BOULDER + 10) {
    const u = q((f - BOULDER) / 10, 30);
    card(c, `pop${u}`, 500, 500, (p) => fxBurst(p, u, "#ffffff", 12, 60, 240), WH[0], WH[1] + 1.6, WH[2] + 2, 16, 16);
  }
  if (name === "plan") put(c, 50, ENG, "eng", EASEL[0] - 1.35, EASEL[2] + 0.25, { expr: "grin", wave: q(0.5 + 0.5 * Math.sin(t * 5), 20) });
  if (name === "gulls" || name === "gone") {
    const there = name === "gulls";
    if (there) for (let k = 0; k < 4; k++) {
      const hop = f >= 672 + k * 3 ? Math.max(0, Math.sin((f - 672 - k * 3) * 0.5)) * 0.12 : 0;
      gull(c, "perch", f >= 660 ? "grin" : "neutral", LOG[0] - 0.85 + k * 0.58, LOG[1] + 0.52 + hop, LOG[2] + 0.05, 0.66, k === 1, k === 3);
    } else {
      const u = (f - 1881) / 47;
      card(c, "feather", 200, 200, fxFeather, LOG[0] + 0.3 + 0.35 * Math.sin(u * 7), LOG[1] + 2.3 - 1.5 * u, LOG[2] + 0.1, 0.34, 0.34, { rot: 0.5 * Math.sin(u * 9) });
      for (let k = 0; k < 5; k++) card(c, `far${k % 2}`, 200, 100, (p) => fxGullFar(p, k % 2), LOG[0] - 30 + k * 9 - 20 * u, 22 + 3 * Math.sin(k * 2) + 4 * u, -160 - k * 12, 3.4, 1.7);
    }
  }
  if (name === "crates") {
    put(c, 51, WORKER[0], "w0", -2.5, 14.9, { expr: "grin", wave: f % 18 < 9 ? 0.2 : 0.8 });
    put(c, 52, WORKER[1], "w1", 2.5, 15.2, { expr: "nervous", look: -1 });
    for (let k = 0; k < 20; k++) {
      const f0 = CRATES0 + ((CRATES1 - CRATES0) * k) / 20, n = f - f0;
      if (n >= 0 && n < 9) { const u = q(n / 9, 30); const sz = 0.5 + 0.9 * u; card(c, `dust${k % 3}`, 400, 400, (p) => fxCloud2(p, "#f3e6c8", k % 3), CRATE[0] + ((k % 5) - 2) * 1.02 + (k % 2 ? 0.5 : -0.5) * (0.4 + u), CRATE[1] + 0.2 + Math.floor(k / 5) * 0.51 + 0.3 * u, CRATE[2] + 0.45, sz * (1 - 0.6 * u * u), sz * 0.9 * (1 - 0.6 * u * u)); }
    }
  }
  if (name === "walt") {
    const two = f >= 850 && f < 905, wx = WALT0[0], wz = WALT0[2];
    put(c, 60, WALT, "walt", wx, wz, { expr: f < 796 ? "neutral" : two ? "stern" : f < 850 ? "stern" : "neutral", prop: two ? "sticks" : null, blink: lidAt(t, 60, [850 / FPS, 905 / FPS, 916 / FPS]), look: two ? 1 : 0 });
    if (two) put(c, 50, ENG, "eng", wx + 1.2, wz + 0.1, { expr: "whistle", look: 1, headTilt: 5 });
    crowdNear(c, (i) => (["neutral", "smile", "nervous", "stern"] as Expr[])[i % 4], (i) => ({ look: i % 2 ? 1 : -1 }), 6.2, 2.4, (i) => i >= 12);
  }
  if (name === "retreat") {
    for (let i = 0; i < NFOLK + 4; i++) {
      const x = -7 + (i % 7) * 2.9 + hh(i, 41) * 2, z = 26 + Math.floor(i / 7) * 6 + hh(i, 42) * 4 + (f - 933) * 0.05;
      const o = i < NFOLK ? FOLK[i] : i === NFOLK ? WALT : i === NFOLK + 1 ? ENG : WORKER[i % 2];
      const pl = person(cam, { i, o, okey: `r${i}` }, x, gy(x, z), z, { side: true, mirror: i % 2 === 0 }, {}, { mode: "march", phase: q(((t * 1.6 + hh(i, 43)) % 1), 24), stomp: 0.6, stride: 0.5 }, isKid(i) && i < NFOLK ? 0.72 : 1);
      out.places.push(pl);
      blob(out, x, gy(x, z), z);
    }
    flock(c, 5, 4, 12, 8, 10);
  }
  if (name === "news") {
    put(c, 61, REPORTER, "rep", REP[0], REP[2], { expr: f % 16 < 8 ? "smile" : "grin", prop: "mic" });
    putSide(c, 62, CAMMAN, "cam", REP[0] - 1.85, REP[2] + 0.95, { mode: "stand", expr: "neutral" }, false, 0);
  }
  if (name === "plunger") {
    engAtPlunger([PLG[0] - 0.78, PLG[1], PLG[2]], f < 1062 ? "grin" : "laugh");
    put(c, 51, WORKER[0], "w0", PLG[0] - 2.5, PLG[2] - 1.3, { expr: "nervous" });
  }
  if (name === "blast") { blastFx(c, st.blast); flock(c, 7, 4, 12, 8, 10, clamp01(st.blast / 40)); chunkFx(c, 30, 46); }
  const dune = (expr: (i: number) => Expr, fo: (i: number) => FrontOpts, gore: (i: number) => number, moveX: (i: number) => [number, number] = () => [0, 0]) => {
    for (let i = 0; i < NFOLK; i++) {
      const [x0, z0] = duneSpot(i), [mx, mz] = moveX(i);
      put(c, i, withGore(FOLK[i], gore(i)), `f${i}`, x0 + mx, z0 + mz, { expr: expr(i), ...fo(i) }, 0, isKid(i) ? 0.72 : 1);
    }
    put(c, 60, withGore(WALT, gore(60) > 1 ? 1 : 0), "walt", WALT_DUNE[0] + moveX(60)[0], WALT_DUNE[1] + moveX(60)[1], { expr: "stern", blink: lidAt(t, 60) });
  };
  if (name === "cheer") {
    const sh = f >= SHOCK, swap = [SHOCK / FPS];
    dune((i) => (sh ? (i % 3 ? "shock" : "nervous") : (["laugh", "grin", "laugh", "smile"] as Expr[])[i % 4]),
      (i) => ({ wave: sh || i % 3 === 2 ? undefined : q(Math.sin(t * 10 + i * 1.3), 20), armsUp: !sh && i % 3 === 2, headTilt: sh ? -6 : 0, blink: lidAt(t, i, swap) }), () => 0);
  }
  if (name === "luckily") {
    const un = f >= 1313, swap = [1313 / FPS, HIT1 / FPS, HIT3 / FPS];
    const g = (i: number) => (f >= HIT3 ? (i === 3 ? 3 : Math.abs((i % 6) - 3) <= 1 ? 2 : 1) : f >= HIT2 && i % 6 >= 4 ? 1 : f >= HIT1 && i % 6 <= 1 ? 1 : 0);
    dune((i) => (f >= HIT3 ? (i === 3 ? "dazed" : i % 2 ? "pained" : "shock") : f >= HIT1 ? "shock" : un ? "nervous" : (["relief", "smile", "relief_open", "smile_closed"] as Expr[])[i % 4]),
      (i) => ({ blink: lidAt(t, i, swap), mode: f >= HIT3 && i === 3 ? "sit" : "stand", headTilt: f >= HIT1 && f < HIT3 ? -5 : 0, look: f >= HIT1 && f < HIT3 ? (i % 2 ? 1 : -1) : 0 }), g);
    chunkFx(c, 1, 30);
    if (f >= HIT3) { const u = q(((t * 0.9) % 1), 30); card(c, `stars${u}`, 420, 210, (p) => fxStars(p, u), HEAD_AT[0], gy(HEAD_AT[0], HEAD_AT[2]) + 2.15, HEAD_AT[2] - 0.05, 0.8, 0.4); }
  }
  if (name === "rain") {
    dune((i) => (i === 3 ? "dazed" : (["shock", "pained", "shock", "nervous"] as Expr[])[i % 4]),
      (i) => (i === 3 ? { mode: "sit" } : { mode: "stroll", phase: q(((t * 3 + hh(i, 51)) % 1), 24), armsUp: i % 2 === 0, tilt: q(6 * Math.sin(t * 6 + i), 3) }),
      (i) => (i === 3 ? 3 : 1 + (i % 3)), (i) => (i === 3 ? [0, 0] : [3.2 * Math.sin(f * 0.09 + i * 1.9), 2.4 * Math.cos(f * 0.075 + i * 2.7)]));
    chunkFx(c, 1, 30);
  }
  if (name === "car") {
    const n = f - SLAB, fall = clamp01((f - 1437) / (SLAB - 1437));
    if (n < 0) { // the shadow that grows on the roof and the ground
      const sc = 0.5 + 2.2 * fall;
      out.fx.push({ key: `blob|contact|#5a5e78`, cw: 128, ch: 128, draw: (p) => fxContact(p, "#5a5e78"), x: CAR[0] + 0.2, y: PL + 0.03, z: CAR[2] + 1.6, w: 2.2 * sc, h: 1.3 * sc, flat: true });
    } else {
      if (n < 14) { const u = q(n / 14, 30); card(c, `shards${u}`, 400, 400, (p) => fxShards(p, u), CAR[0], PL + 1.7, CAR[2] + 0.9, 4.6, 4.6); card(c, `bits${u}`, 300, 300, (p) => fxBits(p, u), CAR[0], PL + 2.0, CAR[2] + 0.2, 3.4, 3.4); }
      if (n < 8) { const u = q(n / 8, 30); card(c, `slam${u}`, 500, 500, (p) => fxBurst(p, u, "#ffffff", 10, 70, 240), CAR[0], PL + 1.2, CAR[2] + 1.0, 6.5, 6.5); }
      const roll = Math.min(1, n / 46), hx = CAR[0] - 1.7 - 3.0 * easeOut(roll), hop = Math.abs(Math.sin(roll * 9)) * 0.3 * (1 - roll);
      card(c, "hub", 200, 200, fxHub, hx, PL + 0.2 + hop, CAR[2] + 1.15, 0.4, 0.4, { rot: -roll * 12 });
    }
    chunkFx(c, 46, 54);
  }
  if (name === "poof") {
    put(c, 50, withGore(ENG, 2), "eng", -6.0, 20, { expr: f < POOF ? "smile_closed" : "dazed", prop: "sticks", blink: lidAt(t, 50, [POOF / FPS]) });
    const u = q(clamp01((f - 1545) / 62), 40), pop = 0.6 + 0.4 * easeOut((f - 1545) / 6);
    if (f >= 1545) card(c, `bubbleP${u}`, 700, 600, (p) => fxBubble(p, "poof", u), -5.0, gy(-5.6, 20) + 2.82, 19.95, 1.4 * pop, 1.2 * pop);
    chunkFx(c, 30, 46);
  }
  if (name === "replay") {
    const n = st.blast;
    if (n >= 0) {
      if (n < 12) { const u = q(n / 12, 30); card(c, `boomT${u}`, 500, 500, (p) => fxBurst(p, u, "#ffd84a", 14, 60, 240), WH[0], WH[1] + 3.4, WH[2], 30, 30, { flat: true }); }
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + 0.2, r = 9 + 26 * easeOut(n / 50) * (0.7 + 0.3 * hh(i, 61)), L = 7 * (1 - 0.5 * clamp01(n / 60));
        const x = WH[0] + r * Math.cos(a), z = WH[2] + r * Math.sin(a);
        card(c, "streak", 400, 80, (p) => fxStreak(p), x, gy(x, z) + 0.25, z, L, 1.3, { flat: true, rot: -a });
        if (n > 26) card(c, `splat${i % 4}`, 400, 400, (p) => fxSplat(p, i % 4), WH[0] + (r + 4) * Math.cos(a), gy(x, z) + 0.2, WH[2] + (r + 4) * Math.sin(a), 3.6, 3.6, { flat: true, rot: i });
      }
    }
  }
  const KP = [0.75, 1.6, 2.45, 3.3, 4.2];
  if (name === "stomp") {
    const drop = clamp01((f - (STOMP - 6)) / 6), y = PL + 0.05 + (1 - drop * drop) * 1.4;
    card(c, "boot", 300, 400, fxBoot, KET[0] - 0.06, y + 0.28, KET[2] - 0.02, 0.44, 0.59);
    const n = f - STOMP;
    if (n >= 0 && n < 16) { const u = q(n / 16, 30); card(c, `squirt${u}`, 500, 300, (p) => fxSquirt(p, u), KET[0] + 0.05, PL + 0.3, KET[2] + 0.12, 1.25, 0.75); }
    if (n >= 3) card(c, "splatK", 400, 400, (p) => fxSplat(p, 2, "#d42a2a"), KET[0] + 0.3, PL + 0.012, KET[2] + 0.25, 1.1, 1.1, { flat: true });
  }
  if (name === "ketchup") {
    const ex: Expr[] = ["stern", "neutral", "pained", "stern", "dazed"];
    KP.forEach((dx, k) => put(c, 70 + k, withGore(folk70(k + 9), 2 + (k % 2), "#d42a2a"), `k${k}`, KET[0] + dx, KET[2] + (k % 2) * 0.25, { expr: ex[k], blink: lidAt(t, 70 + k) }));
    put(c, 76, KID, "kid", KET[0] - 0.35, KET[2] + 0.3, { expr: f < 1783 ? "nervous" : "smile", look: 1 }, 0, 0.72);
    for (let k = 0; k < 5; k++) card(c, `splatK${k % 3}`, 400, 400, (p) => fxSplat(p, k % 3, "#d42a2a"), KET[0] + 0.4 + k * 0.95, PL + 0.012, KET[2] + 0.9 + (k % 2) * 0.5, 1.0, 1.0, { flat: true, rot: k });
  }
  if (name === "carcass") {
    const ex: Expr[] = ["dazed", "pained", "dazed"];
    [[-3.4, 16.6, ENG, "eng", 50], [-1.6, 17.6, WORKER[0], "w0", 51], [-5.6, 18.2, WORKER[1], "w1", 52]].forEach((r, k) => {
      const [x, z, o, key, i] = r as [number, number, Outfit, string, number];
      put(c, i, withGore(o, 3), key, x, z, { mode: "sit", expr: ex[k] });
      const u = q(((t * 0.9 + k * 0.3) % 1), 30);
      card(c, `stars${u}`, 420, 210, (p) => fxStars(p, u), x, gy(x, z) + 1.35, z, 0.75, 0.375);
    });
    chunkFx(c, 30, 46);
  }
  if (name === "owner") {
    put(c, 60, withGore(WALT, 1), "walt", CAR[0] - 2.9, CAR[2] + 1.9, { expr: f < 1994 ? "stern" : "neutral", blink: lidAt(t, 60, [1994 / FPS, 2004 / FPS]) });
    chunkFx(c, 46, 54);
  }
  if (name === "deal") {
    put(c, 60, WALT, "walt", DEAL[0] - 1.75, DEAL[2] + 1.3, { expr: "grin" });
    put(c, 63, SALES, "sales", DEAL[0] - 0.35, DEAL[2] + 1.45, { expr: "laugh", prop: "keys" });
  }
  if (st.smoke && name !== "blast" && name !== "sky") smokeFx(c);
  if (st.smoke && (name === "cheer" || name === "luckily")) { /* the plume is behind the lens in these shots */ }
  return out;
};
export { FPS, lerp, smooth, at, BLAST, REPLAY, CRATE, PLG };
