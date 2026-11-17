// Putting the 2D cast into a 3D set (PHYSICS-AND-COLLISIONS.md). Shared by every short and the QA lab:
//  - person()/catCard(): lit character cards, sized by distance, lit from the scene's sun
//  - toCard(): ATTACHMENT. Converts a world point (a barrel rim, a purse handle, a wall) into the card's design units,
//    so a hand target lands exactly on the 3D object from the current camera
//  - CardStage.render(): turns a Stage into Actor/Fx meshes, SNAPS every grounded card and contact shadow onto the
//    registered ground (Ground.heightAt), aligns shadows to the surface normal, poses the main-character glow, and
//    reports what it measured (foot gaps on slopes, missing ground) as QA lines.
import * as THREE from "three";
import { Pen, bodyFront, cat, fxContact, fxShadow, Outfit, FrontOpts, CatOpts } from "./toon";
import { Pool, Actor, Fx, SU, GlowLevel, GLOW_TINT } from "./actors";
import { Ground } from "./ground";

export type Light = "day" | "golden";
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number;
  geo?: "body" | "cat"; size: [number, number, number];
  /** snap the soles to the ground under (x, z) (default true); false = y is exact (inside a barrel, on a seat you placed) */
  ground?: boolean;
  /** start height of the downward ground ray (default 200 m: the highest registered surface wins). Set it below a
   *  bridge / deck when someone stands UNDER it. */
  groundTop?: number;
  /** main-character glow: GLOW preset name or {halo, presence}; default off */
  glow?: GlowLevel; name?: string;
};
export type FxPlace = {
  key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number;
  flat?: boolean; rot?: number; soft?: boolean;
  /** lie on the ground: y = ground + groundOffset, rotated to the surface normal */
  groundOffset?: number;
};
export type Stage = { places: Place[]; fx: FxPlace[] };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3; light: Light };

export const q = (v: number, n = 120) => Math.round(v * n) / n;
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const tier = (d: number): [number, number, number] => (d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4]);
const tierCat = (d: number): [number, number, number] => (d < 4 ? [1200, 1200, 2.0] : d < 9 ? [600, 600, 1.0] : [300, 300, 0.5]);
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps */
export const light2D = (cam: CamInfo, mirror = false) => {
  const sx = cam.sun.dot(cam.right) * (mirror ? -1 : 1), sy = -cam.sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const LID = [0.5, 1, 1, 0.5];
/** eyelid 0..1: blinks every 0.5-2.3 s, 4 frames (reference) */
export const lidAt = (t: number, i: number, fps = 30) => {
  const f = Math.round(t * fps);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
export const CAT_SU = 0.00095; // cat card: 600 x 600 design units -> ~0.57 m

/** one person card (600 x 1000 design units, soles at y 975) */
export const person = (cam: CamInfo, i: number, o: Outfit, okey: string, x: number, y: number, z: number, fo: FrontOpts, scale = 1, extra: Partial<Place> = {}): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 1.2 * scale, z)) / scale, [w, h, k] = tier(d);
  const f2: FrontOpts = { ...fo, light: light2D(cam, !!extra.mirror), seed: fo.seed ?? (i % 7) + 1 };
  return { key: `F|${okey}|${fkey(f2)}`, x, y, z, scale, size: [w, h, k], draw: (p) => bodyFront(p, o, f2), ...extra };
};
export const catCard = (cam: CamInfo, x: number, y: number, z: number, o: CatOpts, extra: Partial<Place> = {}): Place => {
  const d = cam.pos.distanceTo(new THREE.Vector3(x, y + 0.3, z)), [w, h, k] = tierCat(d);
  const o2 = { ...o, light: light2D(cam) };
  return { key: `C|${fkey(o2)}`, x, y, z, geo: "cat", size: [w, h, k], draw: (p) => cat(p, o2), ...extra };
};

/** ATTACHMENT: a world point in the design units of a card standing at (x, y, z) facing the camera (yaw-only
 *  billboard, as CardStage poses it). Returns [canvas x, canvas y] for FrontOpts.hands. */
export const toCard = (camPos: THREE.Vector3, x: number, y: number, z: number, scale: number, P: THREE.Vector3, su = SU): [number, number] => {
  const yaw = Math.atan2(camPos.x - x, camPos.z - z), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const lx = ((P.x - x) * rx + (P.z - z) * rz) / (su * scale), ly = (P.y - y) / (su * scale);
  return [300 + lx, 975 - ly];
};
/** the two side points of a horizontal ring (barrel rim, pot, tub) as seen from the camera: where hands grip it.
 *  They lie in the plane through the ring's axis facing the camera, i.e. in the card plane of someone standing in it. */
export const ringGrips = (camPos: THREE.Vector3, c: THREE.Vector3, r: number): [THREE.Vector3, THREE.Vector3] => {
  const yaw = Math.atan2(camPos.x - c.x, camPos.z - c.z), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  return [new THREE.Vector3(c.x - rx * r, c.y, c.z - rz * r), new THREE.Vector3(c.x + rx * r, c.y, c.z + rz * r)];
};

// contact shadows (bridge review rounds 2-4): a tight multiply pool under the feet + a soft day tail away from the sun
const CONTACT: Record<Light, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = Math.max(0, Math.min(1, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
/** contact shadow under a standing card: ALWAYS grounded (CardStage snaps it to the same surface as the feet) */
export const blob = (cam: CamInfo, out: Stage, x: number, z: number, sc = 1, k = 1) => {
  const S = cam.sun, hl = Math.hypot(S.x, S.z) || 1, ox = -S.x / hl, oz = -S.z / hl, rot = Math.atan2(-ox, -oz);
  const el = Math.asin(Math.min(0.99, Math.max(0.1, S.y)));
  const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h, tc = hexOf(TAIL, k);
  out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: 0, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot, groundOffset: 0.012 });
  const cc = hexOf(CONTACT[cam.light], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: 0, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot, groundOffset: 0.016 });
};

/** draws a Stage with pooled cards; owns the actor / fx meshes for one world root */
export class CardStage {
  private pool = new Pool();
  private actors: Actor[] = []; private cats: Actor[] = []; private fxs: Fx[] = [];
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private catGeo: THREE.BufferGeometry;
  qa: string[] = [];
  constructor(private root: THREE.Object3D, private ground: Ground | null) {
    this.catGeo = new THREE.PlaneGeometry(600 * CAT_SU, 600 * CAT_SU); this.catGeo.translate(0, (575 - 300) * CAT_SU, 0);
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private catActor(i: number) { while (this.cats.length <= i) this.cats.push(new Actor(this.root, this.catGeo)); return this.cats[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  render(st: Stage, cam: THREE.PerspectiveCamera, right: THREE.Vector3, light: Light, castShadow: boolean) {
    this.qa = [];
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const G = this.ground;
    let ai = 0, ci = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc = p.scale ?? 1;
      // ---- grounding: soles on the surface under the card; on a slope use the mean of the two feet ----
      if (G && p.ground !== false) {
        const fx = right.x * 0.11 * sc, fz = right.z * 0.11 * sc, top = p.groundTop ?? 200;
        const a = G.hit(p.x - fx, p.z - fz, top), b = G.hit(p.x + fx, p.z + fz, top);
        if (!a || !b) this.qa.push(`no ground under ${p.name ?? p.key.slice(0, 24)} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
        else {
          p.y = (a.y + b.y) / 2;
          const gap = Math.abs(a.y - b.y) / 2;
          if (gap > 0.04) this.qa.push(`foot gap ${(gap * 100).toFixed(1)} cm (slope) for ${p.name ?? "card"}`);
        }
      }
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc, p.z), 3.5))) continue;
      const act = p.geo === "cat" ? this.catActor(ci++) : this.actor(ai++);
      const [w, h, k] = p.size;
      act.r = this.pool.req(p.key, w, h, k, p.draw, !!p.glow && p.glow !== "off");
      act.mesh.visible = true; act.mesh.position.set(p.x, p.y, p.z);
      act.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      act.mesh.scale.set(p.mirror ? -sc : sc, sc, sc);
      act.mesh.castShadow = castShadow;
      act.setGlow(p.glow ?? "off", GLOW_TINT[light], cam.position);
      used.push(act);
    }
    for (let i = ai; i < this.actors.length; i++) { this.actors[i].mesh.visible = false; this.actors[i].glow.visible = false; }
    for (let i = ci; i < this.cats.length; i++) { this.cats[i].mesh.visible = false; this.cats[i].glow.visible = false; }
    let fi = 0;
    const fused: Fx[] = [], up = new THREE.Vector3(0, 1, 0), qn = new THREE.Quaternion(), qf = new THREE.Quaternion(), eu = new THREE.Euler();
    for (const p of st.fx) {
      let normal: THREE.Vector3 | null = null;
      if (p.groundOffset !== undefined && G) {
        const hit = G.hit(p.x, p.z, 200);
        if (hit) { p.y = hit.y + p.groundOffset; normal = hit.normal; }
      }
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft); e.mesh.visible = true; e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) {
        qf.setFromEuler(eu.set(-Math.PI / 2, 0, p.rot ?? 0));
        if (normal) e.mesh.quaternion.copy(qn.setFromUnitVectors(up, normal).multiply(qf)); else e.mesh.quaternion.copy(qf);
      } else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
  }
}
