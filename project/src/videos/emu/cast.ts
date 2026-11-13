// (whale short: pool / actors / lighting helpers are the bridge template's; the staging below is new)
// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { emuSide, emuFront, EmuOpts, fxPigeon, fxTarget, fxCasing, fxCoin, fxFeatherE, fxSmokeRing, fxTracer, fxPing, fxBubbleE } from "./fxe";
import { fxCloud2 } from "./fxw";
import {
  FPS, V3, gy, smooth, clamp01, easeOut, lerp, SHOTS, HG, FARM, ARMY, G5, BANK, DESK, E9, UNL, RANGE, PARK, SPLIT, BRASS, BOUNTY, ROAD_Z, RIDGE,
  SALUTE, WANT, POP, STROLL, FIRE, JAM, OUTRUN, TANK, CHARGE, SWEEP, RUNKID, SCATTER, SPLIT0, BRASS0, COINS, truckX,
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
const KHAKI = "#8a7a4a";
const MAJOR: Outfit = { jacket: KHAKI, pants: "#7a6c40", boots: "#4a3426", hat: "peaked", cap: KHAKI, moustache: "#6a4a2a", skin: SKINS[0], build: "stout", buttons: "#e8c45a" };
const SOLDIER = [0, 1].map((v): Outfit => ({ jacket: KHAKI, pants: "#7a6c40", boots: "#4a3426", hat: "slouch", cap: "#8a7a4a", skin: SKINS[v ? 3 : 1], buttons: "#e8c45a" }));
const FARMER = [0, 1, 2].map((v): Outfit => ({ jacket: ["#b5653f", "#5d7a9a", "#7a8a4a"][v], pants: "#5a4a3a", boots: "#4a3426", hat: "fedora", cap: "#d9b46a", skin: SKINS[[1, 0, 3][v]], moustache: v === 1 ? "#8a8a92" : undefined, build: v === 2 ? "stout" : "adult" }));
const CLERK: Outfit = { jacket: "#3b3f52", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hair: "#2a201a", tie: "#c0353a", skin: SKINS[2] };
const FRONT = { side: false, mirror: false };

type Cast = { out: Stage; cam: CamInfo; t: number; f: number };
const put = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, fo: FrontOpts, dy = 0, scale = 1, shadow = true) => {
  const y = gy(x, z) + dy;
  c.out.places.push(person(c.cam, { i, o, okey }, x, y, z, FRONT, { mode: "stand", blink: lidAt(c.t, i), ...fo }, {}, scale));
  if (shadow && dy > -0.2) blob(c.out, x, gy(x, z), z, scale, dy > 0.05 ? 0.6 : 1);
};
const putSide = (c: Cast, i: number, o: Outfit, okey: string, x: number, z: number, so: SideOpts, mirror = false, dy = 0, scale = 1) => {
  c.out.places.push(person(c.cam, { i, o, okey }, x, gy(x, z) + dy, z, { side: true, mirror }, {}, { mode: "stand", blink: lidAt(c.t, i), ...so }, scale));
  if (dy > -0.2) blob(c.out, x, gy(x, z), z, scale);
};
const card = (c: Cast, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  c.out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
/** an emu card: view "side" (walking along dx, dz; mirrored for the lens automatically) or "front" */
const emu = (c: Cast, i: number, x: number, z: number, view: "side" | "front", o: EmuOpts = {}, dir: [number, number] = [1, 0], extra: { dy?: number; roll?: number; scale?: number; shadow?: boolean } = {}) => {
  const scale = extra.scale ?? 0.9 * (0.92 + 0.16 * hh(i, 81)), y = gy(x, z) + (extra.dy ?? 0);
  const d = c.cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale, [w, h, k] = tier(d);
  let expr = o.expr ?? "neutral";
  if (expr !== "alarm" && lidAt(c.t, i + 300) > 0.6) expr = "shut";
  const oo: EmuOpts = { ...o, expr, seed: (i % 3) + 1, phase: o.phase === undefined ? undefined : q(o.phase, 16), chew: o.chew === undefined ? undefined : q(o.chew, 8) };
  const mirror = view === "side" && dir[0] * c.cam.right.x + dir[1] * c.cam.right.z < 0;
  c.out.places.push({ key: `E${view}|${fkey(oo)}`, x, y, z, scale, mirror, size: [w, h, k], roll: extra.roll, draw: (p) => (view === "side" ? emuSide(p, oo) : emuFront(p, oo)) });
  if (extra.shadow !== false) blob(c.out, x, gy(x, z), z, scale * 1.2);
};
const dust = (c: Cast, x: number, z: number, s: number, k = 0, col = "#e8c9a0") => card(c, `dust${col}${k % 3}`, 400, 400, (p) => fxCloud2(p, col, k % 3), x, gy(x, z) + s * 0.4, z, s, s * 0.85);
const muzzle = (c: Cast, at: V3, f: number, s = 1.6) => {
  const u = q(((f % 3) / 3) * 0.5, 30);
  card(c, `mz${u}`, 500, 500, (p) => fxBurst(p, u, "#ffd84a", 9, 50, 240), at[0], at[1], at[2], s, s);
};

// ---------------- staging by shot ----------------
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS, c: Cast = { out, cam, t, f }, name = s.name;
  LNAME = s.light;
  findSun(cam, SUN);
  const trio = (P: V3, ex: Expr[], fo: (k: number) => FrontOpts = () => ({}), dy = 0) => {
    put(c, 10, MAJOR, "maj", P[0], P[2], { expr: ex[0], ...fo(0) }, dy);
    put(c, 11, SOLDIER[0], "s0", P[0] - 1.0, P[2] + 0.1, { expr: ex[1], ...fo(1) }, dy);
    put(c, 12, SOLDIER[1], "s1", P[0] + 1.0, P[2] + 0.12, { expr: ex[2], ...fo(2) }, dy);
  };
  const farmers = (ex: Expr[], fo: (k: number) => FrontOpts = () => ({})) =>
    [-1.0, 0, 1.0].forEach((dx, k) => put(c, 20 + k, FARMER[k], `fm${k}`, FARM[0] + dx, FARM[2] + (k === 1 ? 0 : 0.14), { expr: ex[k], ...fo(k) }));

  if (name === "hookGun") for (let r = 0; r < 5; r++) for (let k = -4; k <= 4; k++) {
    const i = r * 9 + k + 4;
    emu(c, i, k * 1.3 + (hh(i, 1) - 0.5) * 0.5 + (r % 2) * 0.6, -11.5 - r * 2.3 - hh(i, 2) * 0.6, "front", { pose: "stand", expr: i % 4 === 1 ? "smug" : "neutral" });
  }
  if (name === "hookMen") trio([0, 0, -4.8], ["stern", "nervous", "stern"], (k) => ({ look: k === 1 ? 1 : 0 }));
  if (name === "hookMob") for (let i = 0; i < 170; i++)
    emu(c, i, -22 + hh(i, 3) * 44, -13 - hh(i, 4) * 50 + (f - 82) * 0.03, "front", { pose: "walk", phase: (t * 1.2 + hh(i, 5)) % 1 }, [0, 1], { shadow: i % 2 === 0 });
  if (name === "hookEmu") emu(c, 1, 0, -12, "front", { pose: "stand", expr: "smug", hat: true }, [0, 1], { scale: 0.95 });
  if (name === "arrive") for (let i = 0; i < 80; i++) {
    const z = -78 + i * 1.5 + (f - 136) * 0.05, x = 4.5 * Math.sin(i * 1.7) + (hh(i, 6) - 0.5) * 3;
    if (z > 7 + hh(i, 7) * 8) emu(c, i, x * 1.6, 7 + hh(i, 7) * 8, "side", { pose: "eat", chew: (t * 2 + hh(i, 8)) % 1 }, [i % 2 ? 1 : -1, 0.3]);
    else emu(c, i, x, z, "side", { pose: "walk", phase: (t * 1.1 + hh(i, 5)) % 1 }, [0, 1]);
  }
  if (name === "eat") for (let i = 0; i < 11; i++) {
    const x = -6 + i * 1.25 + (hh(i, 9) - 0.5) * 0.5, z = 6 + (i % 3) * 2.4 + hh(i, 10);
    const look = i === 4 || i === 7;
    emu(c, i, x, z, "side", look ? { pose: "look", expr: "smug" } : { pose: "eat", chew: (t * 2.2 + hh(i, 8)) % 1 }, [i % 2 ? 1 : -1, 0]);
  }
  if (name === "farmers") {
    const sal = f >= SALUTE && f < 326, want = f >= WANT - 4;
    farmers(sal ? ["stern", "stern", "stern"] : want ? ["grin", "smile_closed", "grin"] : ["stern", "neutral", "pained"], () => ({ prop: sal ? "salute" : null }));
    if (want) { const pop = 0.6 + 0.4 * easeOut((f - WANT + 4) / 6); card(c, "bubGun", 700, 600, (p) => fxBubbleE(p, "gun"), FARM[0] - 0.5, FARM[1] + 2.66, FARM[2] - 0.05, 1.25 * pop, 1.07 * pop); }
  }
  if (name === "army") {
    const hop = (k: number) => 0.3 * Math.sin(clamp01((f - POP[k]) / 6) * Math.PI);
    if (f >= POP[0]) put(c, 10, MAJOR, "maj", ARMY[0], ARMY[2], { expr: "stern" }, hop(0));
    if (f >= POP[1]) put(c, 11, SOLDIER[0], "s0", ARMY[0] - 1.05, ARMY[2] + 0.1, { expr: "neutral" }, hop(1));
    if (f >= POP[2]) put(c, 12, SOLDIER[1], "s1", ARMY[0] + 1.05, ARMY[2] + 0.12, { expr: "smile_closed" }, hop(2));
  }
  if (name === "dayOne") {
    putSide(c, 11, SOLDIER[0], "s0", G5[0] - 0.85, G5[2] + 0.5, { mode: "push", pose: 0.8, expr: f < STROLL ? "stern" : "nervous" }, false);
    for (let i = 0; i < 50; i++) {
      const x0 = RIDGE[0] + ((i % 10) - 4.5) * 2.3 + hh(i, 11), z0 = RIDGE[2] - 4 + Math.floor(i / 10) * 2.2 + hh(i, 12), n = Math.max(0, f - STROLL - (i % 7) * 2);
      if (n === 0) emu(c, i, x0, z0, "front", { pose: "stand" });
      else emu(c, i, x0 + n * 0.035, z0 - n * 0.02, "side", { pose: "walk", phase: (n / 26 + hh(i, 5)) % 1 }, [1, -0.5]);
    }
  }
  if (name === "ambush") trio([BANK[0], 0, BANK[2] + 1.2], ["stern", "nervous", "nervous"], (k) => ({ look: k === 1 ? 1 : k === 2 ? -1 : 0 }), -0.85);
  if (name === "horde") {
    for (let i = 0; i < 150; i++) {
      const x = -90 + ((i % 15) - 7) * 2.7 + (hh(i, 13) - 0.5) * 1.6, z = BANK[2] - 16 - Math.floor(i / 15) * 5 - hh(i, 14) * 3 + (f - 741) * 0.07;
      emu(c, i, x, z, "front", { pose: "walk", phase: (t * 1.2 + hh(i, 5)) % 1 }, [0, 1], { shadow: i < 60 });
    }
    for (let k = 0; k < 6; k++) dust(c, -106 + k * 6.5, BANK[2] - 64 + (f - 741) * 0.07, 9 + (k % 3) * 2, k);
  }
  if (name === "wait") put(c, 11, SOLDIER[0], "s0", BANK[0] - 0.8, BANK[2] + 1.1, { expr: "nervous", look: f % 20 < 10 ? 1 : 0 }, -0.5);
  if (name === "blank") {
    emu(c, 1, BANK[0], BANK[2] - 2.9, "front", { pose: "stand", expr: "neutral" }, [0, 1], { scale: 1.0 });
    for (let i = 2; i < 30; i++) emu(c, i, BANK[0] + ((i % 7) - 3) * 1.9 + hh(i, 1), BANK[2] - 6 - Math.floor(i / 7) * 2.5, "front", { pose: "stand" });
  }
  if (name === "fire") {
    const n = f - FIRE;
    if (n < 70) { muzzle(c, [BANK[0], BANK[1] + 0.75, BANK[2] - 0.9], f, 2.0); for (let k = 0; k < 3; k++) { const u = ((n * 0.31 + k * 0.33) % 1); card(c, "tracer", 400, 60, fxTracer, BANK[0] + (k - 1) * 0.5, BANK[1] + 0.8 - 0.2 * u, BANK[2] - 2 - 16 * u, 1.6, 0.24, { rot: Math.PI / 2 }); } }
    for (let i = 0; i < 64; i++) {
      const x0 = BANK[0] + ((i % 8) - 3.5) * 2.2 + hh(i, 1), z0 = BANK[2] - 4 - Math.floor(i / 8) * 2.6 - hh(i, 2), dirx = x0 > BANK[0] ? 1 : -1, m = Math.max(0, n - 3 - (i % 5));
      if (i < 3 && n > 8) { emu(c, i, x0, z0, "side", { pose: "stand", expr: "shut" }, [dirx, 0], { roll: dirx * -1.45 * easeOut((n - 8) / 6), shadow: false }); continue; }
      if (m === 0) emu(c, i, x0, z0, "front", { pose: "stand", expr: n > 0 ? "alarm" : "neutral" });
      else emu(c, i, x0 + dirx * m * 0.33, z0 - m * 0.1 * hh(i, 3), "side", { pose: "walk", run: 1, expr: "alarm", phase: (m / 9 + hh(i, 5)) % 1 }, [dirx, -0.2]);
    }
    for (let k = 0; k < 8; k++) { const u = clamp01((n - 6 - k * 4) / 50); if (u > 0 && u < 1) card(c, "featherE", 200, 200, fxFeatherE, BANK[0] + (k - 4) * 1.8 + 1.5 * Math.sin(u * 6 + k), BANK[1] + 2.6 - 1.8 * u, BANK[2] - 5 - k, 0.45, 0.45, { rot: u * 5 }); }
  }
  if (name === "jam") {
    put(c, 11, SOLDIER[0], "s0", BANK[0] - 0.8, BANK[2] + 1.1, { expr: f < JAM + 8 ? "shock" : "dazed", wave: f > JAM + 8 ? q(Math.sin(t * 16), 8) : undefined }, -0.5);
    const u = q(((f - JAM) % 24) / 24, 24);
    card(c, `smk${u}`, 300, 300, (p) => fxSmokeRing(p, u), BANK[0] + 0.1, BANK[1] + 1.25, BANK[2] - 0.5, 1.1, 1.1);
    if (f >= JAM + 12) emu(c, 1, BANK[0] + 1.9 - 0.7 * easeOut((f - JAM - 12) / 8), BANK[2] - 0.9, "side", { pose: "look", expr: "smug" }, [-1, 0], { scale: 1.0, dy: -0.3 });
  }
  if (name === "truck") {
    const x = truckX(f), bounce = 0.06 * Math.sin(f * 0.9) + 0.04 * Math.sin(f * 1.7);
    put(c, 11, SOLDIER[0], "s0", x - 1.3, ROAD_Z, { expr: f < OUTRUN ? "stern" : "shock", look: f < OUTRUN ? 0 : -1, tilt: q(4 * Math.sin(f * 0.9), 2) }, 1.02 + bounce, 1, false);
    for (let k = 0; k < 4; k++) dust(c, x - 3.6 - k * 1.5, ROAD_Z + 0.4, 1.4 + k * 0.7, (k + Math.floor(f / 4)) % 3);
    if (f >= OUTRUN - 12) for (let k = 0; k < 8; k++) {
      const ex = x - 8 - k * 1.9 + (f - (OUTRUN - 12)) * 0.3, ez = 66.6 + (k % 3) * 0.8;
      emu(c, k, ex, ez, "side", k === 2 && ex > x - 1 ? { pose: "look", expr: "smug" } : { pose: "walk", run: 1, phase: (f / 8 + hh(k, 5)) % 1 }, [1, 0]);
      if (k % 2 === 0) dust(c, ex - 1.2, ez + 0.2, 1.0, k);
    }
  }
  if (name === "report") {
    put(c, 10, MAJOR, "maj", DESK[0], DESK[2], { expr: f < TANK ? "stern" : "nervous", prop: "clipboard", blink: lidAt(t, 10, [TANK / FPS]) });
    if (f >= TANK - 4) { const pop = 0.6 + 0.4 * easeOut((f - TANK + 4) / 6); card(c, "bubTank", 700, 600, (p) => fxBubbleE(p, "tank"), DESK[0] - 0.5, DESK[1] + 2.72, DESK[2] - 0.05, 1.25 * pop, 1.07 * pop); }
  }
  if (name === "tank") {
    emu(c, 1, E9[0], E9[2], "front", { pose: "stand", expr: f < 1174 ? "neutral" : "smug" }, [0, 1], { scale: 1.0 });
    for (let k = 0; k < 4; k++) {
      const u = ((f * 0.21 + k * 0.27) % 1), hit = u > 0.8;
      const px = E9[0] + (hh(k + Math.floor(f * 0.21 + k * 0.27), 3) - 0.5) * 0.5, py = E9[1] + 0.9 + hh(k + Math.floor(f * 0.21 + k * 0.27), 4) * 0.5;
      if (!hit) card(c, "tracer", 400, 60, fxTracer, px + 0.6 + 4.5 * (1 - u / 0.8), py + 0.3 * (1 - u / 0.8), E9[2] + 0.4, 0.7, 0.11, { rot: Math.PI - 0.07 });
      else { const v = q((u - 0.8) / 0.2, 10); card(c, `ping${v}`, 200, 200, (p) => fxPing(p, v), px, py, E9[2] + 0.35, 0.6, 0.6); }
    }
  }
  if (name === "luckily") trio(ARMY, ["relief", "smile", "relief_open"]);
  if (name === "unluckily") [-1.2, 0, 1.2].forEach((dx, k) => emu(c, k + 1, UNL[0] + dx, UNL[2] + (k === 1 ? 0 : 0.14), "front", { pose: "stand", expr: k === 1 ? "smug" : "neutral", hat: k === 2 }, [0, 1], { scale: 0.98 }));
  if (name === "range") {
    putSide(c, 11, SOLDIER[0], "s0", RANGE[0] - 0.9, RANGE[2] - 0.2, { mode: "push", pose: 0.8, expr: f < SWEEP ? "stern" : "grin" }, false);
    const adv = 9 * (1 - smooth((f - CHARGE) / 17)), n = f - SWEEP;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
      const i = r * 5 + k, x = RANGE[0] + (k - 2) * 0.95, z = RANGE[2] + 8.5 + r * 1.2 + adv, hop = f >= CHARGE && adv > 0.05 ? 0.25 * Math.abs(Math.sin((f - CHARGE) * 0.9 + i)) : 0;
      const fall = clamp01((n - k * 2.5 - r) / 6);
      out.places.push({ key: `target${i % 3}`, x, y: gy(x, z) + hop, z, size: [480, 800, 0.8], roll: (k % 2 ? 1 : -1) * 1.5 * (fall * fall), draw: (p) => fxTarget(p, i % 3) });
    }
    if (n >= -2 && n < 24) { muzzle(c, [RANGE[0], RANGE[1] + 0.55, RANGE[2] + 1.0], f, 1.6); card(c, "tracer", 400, 60, fxTracer, RANGE[0] + (n / 24 - 0.5) * 3.6, RANGE[1] + 0.8, RANGE[2] + 5, 1.6, 0.24, { rot: Math.PI / 2 }); }
  }
  const PIG = Array.from({ length: 14 }, (_, i) => [PARK[0] - 1.6 + (i % 5) * 0.85 + hh(i, 21) * 0.6, PARK[2] + 0.6 + Math.floor(i / 5) * 1.2 + hh(i, 22) * 0.5] as [number, number]);
  if (name === "park") {
    PIG.forEach(([x, z], i) => { const pose = (t * 2 + hh(i, 23) * 3) % 1.6 < 0.5 ? "peck" : "stand"; card(c, `pig${pose}`, 200, 200, (p) => fxPigeon(p, pose), x, gy(x, z) + 0.2, z, i % 2 ? 0.42 : -0.42, 0.42); });
    const run = Math.max(0, f - RUNKID), kx = PARK[0] - 3.3 + run * 0.07;
    putSide(c, 30, KID, "kid", kx, PARK[2] + 1.6, run ? { mode: "march", phase: q((run / 9) % 1, 24), expr: "laugh", stomp: 1.2 } : { mode: "stand", expr: "grin" }, false, 0, 0.72);
  }
  if (name === "scatter") {
    const n = f - SCATTER;
    PIG.forEach(([x, z], i) => {
      const a = (i / 14) * Math.PI * 2 + hh(i, 24), flap = Math.sin(f * 1.3 + i) > 0 ? "up" : "down", r = n * (0.16 + 0.08 * hh(i, 25));
      card(c, `pig${flap}`, 200, 200, (p) => fxPigeon(p, flap), x + r * Math.cos(a), gy(x, z) + 0.3 + n * (0.07 + 0.06 * hh(i, 26)), z + r * Math.sin(a) * 0.5, Math.cos(a) > 0 ? 0.5 : -0.5, 0.5);
    });
    putSide(c, 30, KID, "kid", PARK[0] - 1.8, PARK[2] + 1.6, { mode: "stand", expr: n < 10 ? "shock" : "dazed" }, false, 0, 0.72);
    for (let k = 0; k < 4; k++) { const u = clamp01((n - k * 3) / 40); if (u < 1) card(c, "featherP", 200, 200, fxFeatherE, PARK[0] - 1 + k * 0.9 + 0.4 * Math.sin(u * 8 + k), PARK[1] + 2.2 - 1.6 * u, PARK[2] + 1 + k * 0.3, 0.22, 0.22, { rot: u * 6 }); }
  }
  if (name === "split") {
    putSide(c, 11, SOLDIER[0], "s0", SPLIT[0] - 0.9, SPLIT[2] + 0.4, { mode: "push", pose: 0.8, expr: f < SPLIT0 ? "stern" : "dazed" }, false);
    put(c, 10, MAJOR, "maj", SPLIT[0] + 1.6, SPLIT[2] + 0.8, { expr: f < SPLIT0 ? "stern" : "pained" });
    const n = Math.max(0, f - SPLIT0);
    for (let i = 0; i < 42; i++) {
      const g = i % 7, a = (g / 7) * Math.PI * 2 + 0.5, cx = SPLIT[0] + (hh(i, 31) - 0.5) * 9, cz = SPLIT[2] - 13 + (hh(i, 32) - 0.5) * 7;
      if (n === 0) emu(c, i, cx, cz, "front", { pose: "stand" });
      else { const r = n * 0.42 * (0.85 + 0.3 * hh(i, 33)); emu(c, i, cx + r * Math.cos(a), cz + r * Math.sin(a), "side", { pose: "walk", run: 1, phase: (n / 8 + hh(i, 5)) % 1 }, [Math.cos(a), Math.sin(a)], { shadow: i % 2 === 0 }); if (i < 7 && n > 6) dust(c, cx + (r - 2.5) * Math.cos(a), cz + (r - 2.5) * Math.sin(a), 2.2, i); }
    }
  }
  if (name === "home") {
    const x = -2 + (f - 1697) * 0.32, b = 0.05 * Math.sin(f * 0.9);
    put(c, 11, SOLDIER[0], "s0", x - 0.9, ROAD_Z - 0.35, { expr: "pained" }, 1.02 + b, 1, false);
    put(c, 12, SOLDIER[1], "s1", x - 1.9, ROAD_Z + 0.35, { expr: "dazed" }, 1.02 + b, 1, false);
    for (let k = 0; k < 5; k++) dust(c, x - 3.4 - k * 1.6, ROAD_Z + 0.3, 1.5 + k * 0.8, (k + Math.floor(f / 4)) % 3);
    emu(c, 1, 9, ROAD_Z - 4.2, "side", { pose: "look", expr: "smug" }, [1, 0]);
  }
  if (name === "brass") {
    emu(c, 1, BRASS[0] + 1.5, BRASS[2] + 0.3, "front", { pose: "stand", expr: "smug" }, [0, 1], { scale: 1.0 });
    for (let k = 0; k < 10; k++) {
      const n = f - (BRASS0 + k * 3.5);
      if (n < 0) continue;
      const hop = 0.18 * Math.sin(clamp01(n / 6) * Math.PI);
      card(c, "casing", 100, 200, fxCasing, BRASS[0] - 0.9 + k * 0.3, BRASS[1] + 0.2 + hop, BRASS[2] + 2.3, 0.16, 0.32);
    }
  }
  if (name === "bounty") {
    put(c, 40, CLERK, "clerk", BOUNTY[0], BOUNTY[2] - 0.45, { expr: f % 40 < 20 ? "smile" : "smile_closed" }, 0, 1, false);
    put(c, 20, FARMER[0], "fm0", BOUNTY[0] + 1.35, BOUNTY[2] - 1.9, { expr: "grin", prop: "coin" });
    for (let k = 0; k < 4; k++) {
      const x = BOUNTY[0] - 1.1 - k * 1.25 + ((f - 1815) % 60 < 14 ? ((f - 1815) % 60) * 0.02 : 0.28) - 0.28;
      putSide(c, 21 + k, FARMER[(k + 1) % 3], `fq${(k + 1) % 3}`, x, BOUNTY[2] - 1.7 - (k % 2) * 0.15, { mode: (f - 1815) % 60 < 14 ? "march" : "stand", phase: q((((f - 1815) % 60) / 14) % 1, 12), stomp: 0.5, stride: 0.4, expr: k % 2 ? "smile" : "grin" });
    }
    const N = Math.min(46, Math.max(0, Math.floor((f - COINS) / 1.2)));
    for (let k = 0; k < N; k++) card(c, "coin", 100, 100, fxCoin, BOUNTY[0] + 2.45 + 0.03 * Math.sin(k * 2.1), BOUNTY[1] + 0.2 + k * 0.085, BOUNTY[2] - 1.5, 0.4, 0.2);
  }
  if (name === "end") {
    farmers(["grin", "smile_closed", "laugh"], () => ({ prop: "coin" }));
    const u = easeOut((f - 2030) / 24);
    if (f >= 2030) emu(c, 1, FARM[0] + 4.6 - 2.5 * u, FARM[2] + 2.6, "side", u < 1 ? { pose: "walk", phase: ((f - 2030) / 14) % 1 } : { pose: "look", expr: "smug", hat: true }, [-1, 0], { scale: 1.0 });
  }
  return out;
};
export { FPS, lerp, smooth };
