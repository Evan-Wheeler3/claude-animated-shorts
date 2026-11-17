// CHARACTER + GROUNDING QA LAB (docs/learning/VISUAL-QA.md). One small test set rendered through the production
// pipeline (sky, two-tone world, cards, ink, lens, grade) with scenarios for character construction, headwear, poses,
// ground contact, containers, seats, leaning, floating and motion. inputProps:
//   toon: "v1" draws characters with the frozen Gate-1 code (pipeline/legacy/toon_v1.ts) for BEFORE renders
//   snap: false places cards / props at hand-typed heights (the old method) for BEFORE renders
//   glow: GLOW preset for the primary character; qa: true logs [QA] lines
// Each scenario owns 100 frames (frame = 100 * index + local); stills use local frame 40; motion tests use 0..99.
import * as THREE from "three";
import { getInputProps } from "remotion";
import { SkyRig } from "../../pipeline/sky";
import { Ground } from "../../pipeline/ground";
import { CardStage, Stage, Place, CamInfo, blob, toCard, ringGrips, lidAt, light2D, tier, catCard, CAT_SU } from "../../pipeline/cast";
import { GlowLevel, SU } from "../../pipeline/actors";
import { bodyFront, ANNIE, RIVERMAN, KID, soldier, townsfolk, Outfit, FrontOpts, Expr } from "../../pipeline/toon";
import { bodyFront as bodyFrontV1 } from "../../pipeline/legacy/toon_v1";
import { lam } from "../../pipeline/build";
import { grassHD, stoneHD, rep, planksHD } from "../../pipeline/paint";
import { toonify } from "../../pipeline/props3d";
import { waterMat, initWaterTextures, setWaterLook, WATER_DAY, grid, orient } from "../../pipeline/water";
import { NOINK } from "../../pipeline/ink";
import { createBarrel, createBarrelLid, createCrate, createRopeCoil, createRescueBoat, createDock, createHammer, createAnvil, createCoinPurse, createCoinStack, createBoulder, createLampPost, createRailing, createCatStandIn, BARREL, barrelR } from "../../../assets/props/holdup-props.js";

export const C0 = new THREE.Vector3(0, 0, 600); // far from the Niagara pool shader's foam ring (world-xz based)
const W = (x: number, y: number, z: number) => new THREE.Vector3(C0.x + x, C0.y + y, C0.z + z);
type V3 = [number, number, number];
export type Scenario = { key: string; label: string; cam: { pos: V3; look: V3; fov: number }; motion?: boolean };
const cam = (pos: V3, look: V3, fov = 40) => ({ pos, look, fov });
export const POSES: [string, string][] = [["stand", "neutral"], ["walk", "walking"], ["point", "pointing"], ["up", "arms raised"], ["hips", "hands on hips"],
  ["cross", "arms crossed"], ["clasp", "hands clasped"], ["grab", "grabbing the post"], ["hold", "holding the purse"], ["lean", "leaning + turned"]];
export const SCENARIOS: Scenario[] = [
  { key: "lineup", label: "body types, outfits, hats", cam: cam([-0.7, 1.5, 4.6], [-0.7, 0.9, -4], 46) },
  ...POSES.map(([k, l]) => ({ key: "pose_" + k, label: l, cam: cam([0.4, 1.15, 3.9], [0.4, 0.8, 0], 38) })),
  { key: "hats_a", label: "headwear A, level", cam: cam([0, 1.5, 4.4], [0, 1.38, 0], 34) },
  { key: "hats_b", label: "headwear B, level", cam: cam([0, 1.5, 4.4], [0, 1.38, 0], 34) },
  { key: "hats_a_tilt", label: "headwear A, tilted heads", cam: cam([0, 1.5, 4.4], [0, 1.38, 0], 34) },
  { key: "hats_b_tilt", label: "headwear B, tilted heads", cam: cam([0, 1.5, 4.4], [0, 1.38, 0], 34) },
  { key: "terrain", label: "flat, bumps, slope, step", cam: cam([-3.6, 1.5, 5.4], [-3.8, 0.45, 0.6], 48) },
  { key: "props", label: "props on slope / bumps, sitting on a crate", cam: cam([3.7, 1.6, 6.4], [3.9, 0.6, 0.6], 56) },
  { key: "container", label: "inside a barrel, hands on the rim, cat on the rim", cam: cam([0.3, 1.75, 3.2], [0, 1.25, 0], 38) },
  { key: "lean", label: "leaning on a post", cam: cam([-0.4, 1.3, 3.6], [0.9, 0.95, 2 - 2], 38) },
  { key: "water", label: "barrel floating on waves", cam: cam([-7.0, 1.7, 15.6], [-8.6, -0.1, 11.4], 42) },
  { key: "catalog_props", label: "ASSET CATALOG: shared props in the lit pipeline", cam: cam([0, 4.6, -0.4], [0, 0.2, -5.3], 54) },
  { key: "walk_motion", label: "MOTION: walking over bumps", cam: cam([-8.7, 1.05, 4.6], [-8.7, 0.55, 0], 50), motion: true },
  { key: "fall_motion", label: "MOTION: crate off a ledge, barrel down a ramp", cam: cam([9.4, 2.5, 11.5], [10.0, 0.9, 0], 52), motion: true },
];
export const LAB_FRAMES = SCENARIOS.length * 100;

// ---------------- the set ----------------
const bumpY = (x: number, z: number) => (x < -2 && x > -14 && Math.abs(z) < 6 ? (0.22 * Math.sin(x * 1.3) * Math.cos(z * 1.1) + 0.12 * Math.sin(x * 2.7 + z) + 0.05) * Math.min(1, (-2 - x) / 1.5, (x + 14) / 1.5, (6 - Math.abs(z)) / 1.5) : 0);
const RAMP = { x0: 2, x1: 10, h: 1.6 }; // rises along +x, then a ledge to x 13
const rampY = (x: number) => (x <= RAMP.x0 ? 0 : x >= RAMP.x1 ? RAMP.h : ((x - RAMP.x0) / (RAMP.x1 - RAMP.x0)) * RAMP.h);
const waveY = (x: number, z: number, t: number) => -0.25 + 0.09 * Math.sin(x * 1.7 + t * 2.2) + 0.06 * Math.sin(z * 2.3 - t * 1.6);

const LUNIT = 0.00216 * 0.95;
type In = { toon?: "v1" | "v2"; snap?: boolean; glow?: GlowLevel; qa?: boolean };

export class LabWorld {
  root = new THREE.Group();
  sky: SkyRig; ground = new Ground(); water = new Ground(); cards: CardStage;
  private inp = getInputProps() as In;
  private v1 = this.inp.toon === "v1"; private snap = this.inp.snap !== false;
  private pond: THREE.Mesh; private pondGeo: THREE.BufferGeometry;
  private barrelPond: THREE.Object3D; private barrelSlope: THREE.Object3D; private crateBump: THREE.Object3D; private crateSeat: THREE.Object3D;
  private barrelIn: THREE.Object3D; private crateFall: THREE.Object3D; private barrelRoll: THREE.Object3D;
  private byScen: { o: THREE.Object3D; keys: string[] }[] = [];
  constructor() {
    const R = this.root;
    this.sky = new SkyRig(R, { clouds: 9, cloudDist: 500 });
    initWaterTextures();
    const grass = lam("labGrass", () => ({ map: grassHD() })), pave = lam("labPave", () => ({ map: rep(stoneHD("labPaveHD", ["#d8cdb9", "#cec2ad", "#e0d6c3", "#c7bba6"], "#a99c88"), 1, 1) }));
    const stone = lam("labWall", () => ({ map: rep(stoneHD("labWallHD", ["#bfb5a6", "#b3a897", "#c9bfb0", "#a99d8c"], "#8d8273"), 1, 1) })), wood = lam("labDeck", () => ({ map: planksHD() }));
    // paving (flat), bumpy grass, ramp + ledge, deck step, back wall, post
    const flat = new THREE.Mesh(new THREE.PlaneGeometry(40, 23).rotateX(-Math.PI / 2).translate(C0.x, 0, C0.z - 3.5), pave); // stops at z 8: the pond lies beyond
    (flat.geometry.attributes.uv as THREE.BufferAttribute).array.forEach((_, i, a) => { (a as Float32Array)[i] *= 10; });
    const bumps = new THREE.Mesh(orient(grid(60, 60, (i, j) => { const x = -14 + (12 * i) / 60, z = -6 + (12 * j) / 60; return { p: [C0.x + x, bumpY(x, z) + 0.002, C0.z + z], uv: [x / 4, z / 4] }; }), new THREE.Vector3(0, 1, 0)), grass);
    const ramp = new THREE.Mesh(orient(grid(16, 4, (i, j) => { const x = RAMP.x0 + ((13 - RAMP.x0) * i) / 16, z = -3 + (6 * j) / 4; return { p: [C0.x + x, rampY(x) + 0.003, C0.z + z], uv: [x / 3, z / 3] }; }), new THREE.Vector3(0, 1, 0)), wood);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(3, RAMP.h, 6).translate(C0.x + 11.5, RAMP.h / 2 - 0.002, C0.z), stone);
    const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.45, 3).translate(C0.x - 1.5, 0.225, C0.z + 4.5), wood);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 0.6).translate(C0.x, 1.5, C0.z - 8), stone);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.7, 14).translate(C0.x + 1.1, 0.85, C0.z), wood);
    for (const m of [flat, bumps, ramp, ledge, step, wall, post]) { m.receiveShadow = true; m.castShadow = m !== flat; R.add(m); }
    // pond: a sunk basin with a waving surface (water contact test)
    // basin = a floor and four low walls (NOT a solid box: its top would cover the water)
    for (const [w, h, d, x, y, z] of [[10, 0.1, 7, -9, -0.85, 11.5], [10, 0.9, 0.3, -9, -0.4, 8.05], [10, 0.9, 0.3, -9, -0.4, 14.95], [0.3, 0.9, 7, -13.95, -0.4, 11.5], [0.3, 0.9, 7, -4.05, -0.4, 11.5]])
      R.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(C0.x + x, y, C0.z + z), stone));
    this.pondGeo = grid(40, 28, (i, j) => { const x = -14 + (10 * i) / 40, z = 8 + (7 * j) / 28; return { p: [C0.x + x, waveY(x, z, 0), C0.z + z], uv: [x, z] }; });
    orient(this.pondGeo, new THREE.Vector3(0, 1, 0));
    this.pond = new THREE.Mesh(this.pondGeo, waterMat(2)); this.pond.receiveShadow = true; R.add(this.pond);
    R.updateMatrixWorld(true);
    this.ground.add(flat, bumps, ramp, ledge, step); this.water.add(this.pond);
    // props
    const put = (o: THREE.Object3D, x: number, z: number, yaw: number, keys: string[]) => { o.position.set(C0.x + x, 0, C0.z + z); o.rotation.y = yaw; R.add(o); this.byScen.push({ o, keys }); return o; };
    this.barrelSlope = put(toonify(createBarrel({ seed: 3 })), 5.2, -0.6, 0.4, ["props"]);
    this.crateBump = put(toonify(createCrate(0.55)), 2.8 - 9, 1.2, 0.3, ["terrain"]);
    this.crateSeat = put(toonify(createCrate(0.48)), 3.0, 1.6, 0.1, ["props"]);
    this.barrelIn = put(toonify(createBarrel({ lid: false, seed: 5 })), 0, 0, -0.4, ["container"]);
    this.barrelPond = put(toonify(createBarrel({ seed: 3 })), -8.6, 11.4, 0.5, ["water"]);
    this.crateFall = put(toonify(createCrate(0.6)), 11.5, -1.5, 0.2, ["fall_motion"]);
    // rolling barrel: a pivot at the barrel's CENTRE (the barrel hangs -H/2 inside it), so rotation never shifts it
    const rb = toonify(createBarrel({ seed: 7 })); rb.position.y = -BARREL.H / 2;
    this.barrelRoll = put(new THREE.Group().add(rb), 9, -1.5, 0, ["fall_motion"]);
    put(toonify(createRopeCoil()), 4.4, 1.9, 0, ["props"]);
    for (const o of [this.barrelSlope, this.crateBump, this.crateSeat, this.barrelIn]) this.settle(o, 0.42);
    // catalog layout (z -4.5 .. -7.5 in front of the back wall): every shared prop, rested on the paving
    const cat = (o: THREE.Object3D, x: number, z: number, yaw = 0, s = 1) => { o.scale.setScalar(s); put(o, x, z, yaw, ["catalog_props"]); this.ground.rest(o, 0.2); };
    // rows going back (the 9:16 frame is tall): small props in front, boat, then crate/rope/rock/cat, then barrels + lamp
    cat(toonify(createCoinStack(3)), -1.3, -3.3, 0, 3); cat(toonify(createCoinPurse()), -0.7, -3.3, 2.2, 2.2);
    cat(toonify(createHammer()), -0.05, -3.4, 0.5, 1.6); cat(toonify(createAnvil()), 0.8, -3.35, 0.3);
    const lid = toonify(createBarrelLid()); const lg = new THREE.Group(); lid.position.y = -1.325; lg.add(lid); cat(lg, 1.55, -3.3);
    cat(toonify(createRescueBoat({ oarsIn: true })), 0, -4.5, Math.PI / 2);
    cat(toonify(createCrate(0.55)), -1.5, -5.7, 0.3); cat(toonify(createRopeCoil()), -0.5, -5.7);
    cat(toonify(createBoulder(0.4, 5, 0.55, 1)), 0.5, -5.7); cat(toonify(createCatStandIn()), 1.4, -5.6, -0.6);
    cat(toonify(createBarrel({ seed: 3 })), -1.3, -7.0, 0.4); cat(toonify(createBarrel({ lid: false, seed: 5 })), 0.0, -7.0, 0.2);
    cat(toonify(createLampPost()), 1.3, -7.2); cat(toonify(createRailing(3.2, 1.6, 1.0)), -1.6, -7.65);

    this.cards = new CardStage(R, this.snap ? this.ground : null);
  }
  /** BEFORE (snap:false) = props at y 0 as typed; AFTER = rested / aligned on the surface under them */
  private settle(o: THREE.Object3D, r: number) { if (this.snap) (o === this.barrelSlope ? this.ground.restAligned(o, r) : this.ground.rest(o, r)); }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const si = Math.min(SCENARIOS.length - 1, Math.floor(f / 100)), sc = SCENARIOS[si], lf = f % 100, t = lf / 30;
    cam.position.copy(W(...sc.cam.pos)); cam.up.set(0, 1, 0); cam.lookAt(W(...sc.cam.look)); cam.fov = sc.cam.fov; cam.near = 0.15; cam.far = 1500;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    const fw = W(...sc.cam.look).sub(cam.position), sun = SkyRig.sunFrom(fw.x, fw.z, 62, 44), focus = W(...sc.cam.look);
    this.sky.update(cam, scene, "day", sun, focus, { fogNear: 200, fogFar: 1000, shadowR: 14 });
    setWaterLook(WATER_DAY, t);
    for (const b of this.byScen) b.o.visible = b.keys.includes(sc.key);
    // waves move: rebuild the pond surface, float the barrel on it (or leave it at the typed height: before)
    const pp = this.pondGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) pp.setY(i, waveY(pp.getX(i) - C0.x, pp.getZ(i) - C0.z, t));
    pp.needsUpdate = true; this.pondGeo.computeVertexNormals(); this.pondGeo.computeBoundingSphere(); this.pondGeo.computeBoundingBox();
    this.root.updateMatrixWorld(true);
    const bx = C0.x - 8.6, bz = C0.z + 11.4;
    if (sc.key === "water") {
      const fresh = new Ground().add(this.pond), wy = this.snap ? fresh.heightAt(bx, bz, 0, 5) : 0.15;
      const n = fresh.hit(bx, bz, 5)?.normal ?? new THREE.Vector3(0, 1, 0);
      this.barrelPond.position.set(bx, wy - 0.62, bz);
      if (this.snap) this.barrelPond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.5).normalize());
    }
    if (sc.key === "fall_motion") this.motion(lf);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const ci: CamInfo = { pos: cam.position, right, sun, light: "day" };
    const st = this.stage(sc.key, t, lf, ci);
    // BEFORE mode: cards stand at the y they were typed with (CardStage without ground); shadows at y 0.01
    if (!this.snap) for (const x of st.fx) if (x.groundOffset !== undefined) { x.y = C0.y + x.groundOffset; x.groundOffset = undefined; }
    this.cards.render(st, cam, right, "day", false);
    if (this.inp.qa) console.warn(`[QA] lab ${sc.key} f${lf}: ${this.cards.qa.length ? this.cards.qa.join(" | ") : "clean"}`);
    return { focus, cInf: sc.key.startsWith("pose") || sc.key.startsWith("hats") || sc.key === "container" ? 9 : 0 };
  }

  /** gravity + support: a crate shoved off the ledge falls (y = y0 - g t^2 / 2) onto whatever is below, bounces once;
   *  a barrel rolls down the ramp (a = 2/3 g sin(theta), rolling cylinder), across the flat with friction, rotating
   *  by distance / radius about its own axis */
  private motion(lf: number) {
    const t = lf / 30, g = 9.8;
    // crate: pushed toward the camera along the ledge top (z -1.5 -> front edge z 3), then free fall from the lip
    // onto the paving (support read from the ground), one damped bounce, rest; tips forward as it leaves the edge
    const z0 = -1.5, edge = 3 + 0.3, slideT = 1.0, z = t < slideT ? z0 + (edge - z0) * (t / slideT) ** 2 : edge + 1.4 * (t - slideT);
    let y = RAMP.h;
    if (t >= slideT) {
      const tf = t - slideT, floor = this.snap ? this.ground.heightAt(C0.x + 11.5, C0.z + Math.min(z, 4.6), 0, 1.2) : 0, drop = RAMP.h - floor, tl = Math.sqrt((2 * drop) / g);
      if (tf < tl) y = RAMP.h - 0.5 * g * tf * tf;
      else { const tb = tf - tl, vb = 0.25 * g * tl, hb = Math.max(0, vb * tb - 0.5 * g * tb * tb); y = floor + hb; }
    }
    const zr = Math.min(z, 4.6);
    this.crateFall.position.set(C0.x + 11.5, y, C0.z + zr);
    this.crateFall.rotation.set(t >= slideT ? Math.min(0.5, (t - slideT) * 1.4) * (y > 0.05 ? 1 : 0.25) : 0, 0.2, 0);
    // barrel: lying on its side across the ramp (axis along z), starts at the top
    const th = Math.atan(RAMP.h / (RAMP.x1 - RAMP.x0)), a = (2 / 3) * g * Math.sin(th), L = (RAMP.x1 - RAMP.x0) / Math.cos(th) - 0.6;
    const tr = Math.sqrt((2 * L) / a), sAlong = t < tr ? 0.5 * a * t * t : L + a * tr * (t - tr) - 0.5 * 2.0 * (t - tr) ** 2;
    const vEnd = a * tr, sMax = L + (vEnd * vEnd) / (2 * 2.0), s = Math.min(sAlong, sMax);
    const xb = RAMP.x1 - 0.3 - (s <= L ? s * Math.cos(th) : L * Math.cos(th) + (s - L));
    const r = BARREL.RB * 0.98, yb = (this.snap ? this.ground.heightAt(C0.x + xb, C0.z - 1.5, rampY(xb), 3) : rampY(xb)) + r;
    this.barrelRoll.position.set(C0.x + xb, yb, C0.z - 1.5);
    // lying on its side (axis along z), rolling toward -x = turning about +z by distance / radius
    this.barrelRoll.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), s / r).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  }

  /** who stands where in each scenario */
  private stage(key: string, t: number, lf: number, cam: CamInfo): Stage {
    const out: Stage = { places: [], fx: [] }, v1 = this.v1;
    const P = (i: number, o: Outfit, x: number, z: number, fo: FrontOpts, scale = 1, extra: Partial<Place> = {}): Place => {
      const wx = C0.x + x, wz = C0.z + z, d = cam.pos.distanceTo(new THREE.Vector3(wx, 1.2, wz)) / scale, [w, h, k] = tier(d);
      const f2: FrontOpts = { blink: lidAt(t, i), ...fo, light: light2D(cam), seed: fo.seed ?? (i % 7) + 1 };
      const draw = v1 ? (p: any) => bodyFrontV1(p, o as any, f2 as any) : (p: any) => bodyFront(p, o, f2); // eslint-disable-line @typescript-eslint/no-explicit-any
      const pl: Place = { key: `${v1 ? "v1" : "v2"}|${i}|${JSON.stringify(f2)}`, x: wx, y: (extra.y ?? 0) + C0.y, z: wz, scale, size: [w, h, k], draw, ...extra };
      if (extra.y !== undefined) pl.y = extra.y;
      out.places.push(pl);
      if (extra.ground !== false) blob(cam, out, wx, wz, scale);
      return pl;
    };
    const annieOpts = (pose: string): FrontOpts => {
      const map1: Record<string, FrontOpts> = { cross: { pose: "clasp" }, hold: { pose: "purse" }, grab: { pose: "grip" }, lean: { pose: "shrug", tilt: 7, facing: 1 } };
      if (v1 && map1[pose]) return { mode: "stand", ...map1[pose] };
      switch (pose) {
        case "stand": return { mode: "stand" };
        case "walk": return { mode: "stroll", phase: 0.3 };
        case "hold": return { mode: "stand", pose: "purse" };
        case "lean": return { mode: "stand", tilt: 7, facing: 1, pose: "reach" };
        case "grab": return { mode: "stand", pose: "reach" };
        default: return { mode: "stand", pose: pose as FrontOpts["pose"] };
      }
    };
    if (key === "lineup") {
      const cast: [Outfit, number][] = [[ANNIE, 0.95], [RIVERMAN[0], 1], [RIVERMAN[2], 1], [townsfolk(1), 1], [soldier(1), 1], [KID, 0.72]];
      cast.forEach(([o, s], i) => P(10 + i, o, -2.4 + i * 0.68, -4, { mode: "stand", expr: (["hopeful", "grin", "smile", "smile_closed", "stern", "laugh"] as Expr[])[i] }, s, { glow: i === 0 ? this.inp.glow ?? "subtle" : "off", name: "c" + i }));
    } else if (key.startsWith("pose_")) {
      const pose = key.slice(5), fo = annieOpts(pose);
      if (pose === "grab" || pose === "lean") {
        // the post is the contact: hand target = the post's surface at shoulder height, seen from this camera
        // the post is the contact: hand target = the post's surface at chest height, seen from this camera
        const ax = 0.62, postP = new THREE.Vector3(C0.x + 1.1 - 0.11, 1.0, C0.z);
        if (!v1) fo.hands = [null, toCard(cam.pos, C0.x + ax, 0, C0.z, 0.95, postP, SU)];
      }
      P(1, ANNIE, pose === "grab" || pose === "lean" ? 0.62 : 0.15, 0, { expr: pose === "point" ? "hopeful" : pose === "cross" ? "deadpan" : pose === "up" ? "laugh" : "determined", ...fo }, 0.95, { glow: this.inp.glow ?? "off", name: "Annie" });
    } else if (key.startsWith("hats")) {
      const b = key.startsWith("hats_b"), tilt = key.endsWith("tilt");
      const cast: Outfit[] = b ? [townsfolk(1), soldier(0), { ...RIVERMAN[1], hat: "hair", hair: "#5a3b2a" }] : [ANNIE, RIVERMAN[0], RIVERMAN[2]];
      cast.forEach((o, i) => P(30 + i, o, -0.66 + i * 0.66, 0, { mode: "stand", expr: "smile", headTilt: tilt ? [-12, 10, -9][i] : 0, seed: 1 + i }, o === ANNIE ? 0.95 : 1));
    } else if (key === "terrain" || key === "walk_motion") {
      if (key === "terrain") {
        P(40, RIVERMAN[0], -6.0, 0.3, { mode: "stand", expr: "smile" });               // on bumps
        P(41, ANNIE, -4.4, -0.4, { mode: "stand", expr: "hopeful" }, 0.95);              // on bumps
        P(42, RIVERMAN[1], -1.6, 4.0, { mode: "stand", expr: "grin" });                 // on the deck step (0.45 m)
        P(43, KID, -2.6, 1.2, { mode: "stand", expr: "laugh" }, 0.72);                  // flat paving
        const crate = this.crateBump; void crate;
      } else {
        const x = -10.6 + 1.2 * t, ph = ((x + 10.6) / 1.4) % 1;                          // 1.2 m/s, phase from distance (0.7 m steps)
        P(44, RIVERMAN[0], x, 0.5, { mode: "stroll", phase: ph, expr: "smile" }, 1, { name: "walker" });
        P(45, ANNIE, x - 1.1, -0.5, { mode: "stroll", phase: (ph + 0.5) % 1, expr: "hopeful" }, 0.95, { name: "walker2" });
      }
    } else if (key === "props") {
      // sitting ON the crate: hips at the crate top (FrontOpts.seat), card a little in front of the crate's centre
      const seatTop = this.snap ? new THREE.Box3().setFromObject(this.crateSeat).max.y : 0.48, sx = 3.0, sz = 1.6 + 0.3;
      const seat = (seatTop - (this.snap ? this.ground.heightAt(C0.x + sx, C0.z + sz, 0, 3) : 0)) / LUNIT;
      P(50, ANNIE, sx, sz, { mode: "sit", expr: "smile", ...(v1 ? {} : { seat }) }, 0.95, { name: "sitter" });
    } else if (key === "container") {
      const b = this.barrelIn.position, lift = 0.5, toward = cam.pos.clone().sub(b).setY(0).normalize().multiplyScalar(0.06);
      const cx = b.x + toward.x, cz = b.z + toward.z, cy = b.y + lift;
      const fo: FrontOpts = { mode: "stand", expr: "dazed", pose: "grip", headTilt: -6 };
      if (v1) fo.gripY = 975 - (BARREL.H - lift) / LUNIT;
      else { const [gl, gr] = ringGrips(cam.pos, new THREE.Vector3(b.x, b.y + BARREL.H + 0.005, b.z), barrelR(BARREL.H) + 0.004); fo.hands = [toCard(cam.pos, cx, cy, cz, 0.95, gl, SU), toCard(cam.pos, cx, cy, cz, 0.95, gr, SU)]; }
      P(60, ANNIE, cx - C0.x, cz - C0.z, fo, 0.95, { ground: false, y: cy, name: "Annie" });
      out.places.push(catCard(cam, b.x + 0.62, b.y + BARREL.H - (575 - 470) * CAT_SU, b.z - 0.25, { expr: "smug", pose: "perch", wet: false }, { ground: false }));
    } else if (key === "lean") {
      const postP = new THREE.Vector3(C0.x + 1.1 - 0.12, 1.12, C0.z), ax = 0.45;
      const fo: FrontOpts = { mode: "stand", expr: "smile_closed", tilt: 8, facing: 1, ...(v1 ? { pose: "shrug" } : { pose: "reach", hands: [null, toCard(cam.pos, C0.x + ax, 0, C0.z + 0.05, 1, postP, SU)] }) };
      P(70, RIVERMAN[0], ax, 0.05, fo, 1, { name: "leaner" });
    }
    void lf;
    return out;
  }
}
