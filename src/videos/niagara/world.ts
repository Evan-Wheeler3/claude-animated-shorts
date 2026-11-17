// The Niagara set as one three.js scene: sky + clouds (pipeline/sky.ts), the Horseshoe Falls (falls.ts), banks with
// trees, the Table Rock promenade, the launch landing, the lower-river shore with the rescue boat, the barrel (one per
// staging), the cast cards (pipeline/cast.ts CardStage). update(id, f, camera) poses everything for shot `id` at frame f.
// Grounding (docs/learning/PHYSICS-AND-COLLISIONS.md): walkable surfaces are registered in a Ground; every prop is
// RESTED on it, every standing card is SNAPPED to it; the barrel floats on the measured water surface and rides the
// computed sheet over the brink. With inputProps { qa: true } the world logs [QA] lines for every frame it renders.
import * as THREE from "three";
import { getInputProps } from "remotion";
import { Batch, addVeg, VegKind } from "../../pipeline/build";
import { NOINK } from "../../pipeline/ink";
import { SkyRig } from "../../pipeline/sky";
import { Ground } from "../../pipeline/ground";
import { CardStage } from "../../pipeline/cast";
import { GlowLevel } from "../../pipeline/actors";
import { stage, Anchors, CAST_GLOW } from "./crew";
import { buildFalls, FallsSet, setWaterLook, WATER_DAY, WATER_GOLD, curtainAt } from "./falls";
import { toonify } from "../../pipeline/props3d";
import { FPS, SHOTS, ShotDef, camAt, V3, LAND_Y, POOL_Y, PHI_M, RIM_L, RIM_R, DOCK, DOCK_Y, BARREL_AT_DOCK, BARREL_SHORE, BARREL_RESCUE, BARREL_HOOK, RUN_PHI, outward, lip } from "./story";
import {
  BARREL, createBarrel, createBarrelLid, createRescueBoat, createRopeCoil, createHammer, createDock, createRailing, createLampPost, createCoinPurse, createCoinStack, createBoulder,
} from "../../../assets/props/holdup-props.js";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** the lid is modelled in barrel space (origin = barrel bottom): re-centre it on its own disc */
const centred = (lid: THREE.Object3D) => { const g = new THREE.Group(); lid.position.y = -(lid.userData.lidY ?? 1.325); g.add(lid); return g; };
/** depth of the ballasted barrel below the waterline (m) */
const DRAFT = 0.62;
/** fall parameter k on the sheet where it is `out` metres beyond the lip (bisection on the curtain function) */
const brinkK = (s: number, out: number) => {
  const l = lip(s * PHI_M); let a = 0, b = 0.4;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2, p = curtainAt(s, m).p; if (Math.hypot(p[0] - l[0], p[2] - l[2]) < out) a = m; else b = m; }
  return (a + b) / 2;
};
/** every shot camera at its still frame, as segments to keep trees out of */
const sightLines = () => SHOTS.map((s) => { const c = camAt(s.id, s.still); return { o: V(...c.pos), l: V(...c.look) }; });
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
};
type Props = { qa?: boolean; glow?: GlowLevel; cam?: { pos: V3; look: V3; fov?: number } };

export class World {
  root = new THREE.Group();
  private sky: SkyRig;
  private ground = new Ground();
  private water = new Ground();
  private cards: CardStage;
  private falls: FallsSet;
  private sunCache = new Map<number, THREE.Vector3>();
  private byShot: { o: THREE.Object3D; keys: string[] }[] = [];
  private props: { name: string; o: THREE.Object3D; r: number; sink?: number }[] = [];
  private anchors!: Anchors;
  private brink = V(0, 0, 0);
  private ray = new THREE.Raycaster();
  private inp = getInputProps() as Props;

  constructor() {
    const Rt = this.root;
    this.sky = new SkyRig(Rt);
    this.falls = buildFalls(Rt);
    Rt.updateMatrixWorld(true);
    this.ground.add(...this.falls.ground);
    this.water.add(...this.falls.water);
    this.cards = new CardStage(Rt, this.ground);
    if (this.inp.glow) CAST_GLOW.annie = this.inp.glow;

    // ---- trees: Goat Island woods (+x), parkland behind the Canadian promenade (-x), kept off every sight line ----
    const rays = sightLines(), b = new Batch(), rnd = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    const tree = (x: number, z: number, h: number, k: VegKind) => {
      const c = V(x, LAND_Y + h * 0.6, z), rad = h * 0.45;
      void c;
      if (rays.some((r) => segDist(c, r.o, r.l) < rad + 2.5 || r.o.distanceTo(c) < rad + 8)) return;
      addVeg(b, k, x, LAND_Y, z, h, Math.round(x * 13 + z * 7), Math.hypot(x, z) > 260 ? 2 : Math.hypot(x, z) > 140 ? 1 : 0);
    };
    const kinds: VegKind[] = ["round", "fat", "round", "cone", "tall"];
    const rimX = (rim: [number, number][], z: number) => { for (let i = 0; i < rim.length - 1; i++) if (z >= rim[i][1] && z <= rim[i + 1][1]) return rim[i][0] + (rim[i + 1][0] - rim[i][0]) * (z - rim[i][1]) / (rim[i + 1][1] - rim[i][1]); return rim[rim.length - 1][0]; };
    for (let k = 0; k < 520; k++) { // Goat Island + American side: dense
      const z = -420 + rnd() * 820, edge = z < 14 ? 96 : rimX(RIM_R, z) + 4, x = edge + 6 + rnd() ** 1.4 * 240;
      tree(x, z, 9 + rnd() * 9, kinds[k % 5]);
    }
    for (let k = 0; k < 260; k++) { // Canadian parkland: behind the promenade, thinner
      const z = -420 + rnd() * 820, edge = z < 14 ? -96 : rimX(RIM_L, z) - 4, x = edge - 22 - rnd() ** 1.2 * 260;
      tree(x, z, 8 + rnd() * 8, kinds[(k + 2) % 5]);
    }
    for (let k = 0; k < 14; k++) tree(-100 - rnd() * 8, -60 + k * 9 + rnd() * 3, 3 + rnd() * 1.5, "bush");
    b.build(Rt);

    // ---- Table Rock promenade: iron railing along the brink, gas lamps ----
    const rail = (pts: [number, number][]) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), r = toonify(createRailing(L, 1.6, 1.0));
        r.position.set(x0, LAND_Y, z0); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); Rt.add(r); this.ground.rest(r, 0.05);
      }
    };
    rail([[-93.2, -70], [-91.2, -40], [-88.2, -18], [-84.6, 0], [-80.6, 14], [-77.6, 40], [-74.6, 80]]);
    for (const [x, z] of [[-94.2, -48], [-90, -6], [-81.6, 30], [-78.2, 62]] as const) this.rest("lamp", toonify(createLampPost()), x - 1.5, z, 0, 0.18);

    // ---- the launch landing upstream (C) ----
    const dock = toonify(createDock(3.2, 6.5, DOCK_Y - (LAND_Y - 3.0)));
    dock.position.set(DOCK[0] - 0.5, LAND_Y - 3.0, DOCK[2]); dock.rotation.y = -Math.PI / 2; Rt.add(dock);
    Rt.updateMatrixWorld(true); this.ground.add(dock); // the deck is walkable: Annie, barrel, rope and hammer rest on it
    const barrelDock = this.rest("barrel@dock", toonify(createBarrel({ seed: 3 })), BARREL_AT_DOCK[0], BARREL_AT_DOCK[2], 0.5, 0.42);
    this.rest("rope@dock", toonify(createRopeCoil()), BARREL_AT_DOCK[0] + 0.85, BARREL_AT_DOCK[2] - 0.75, 0, 0.3);
    this.rest("hammer@dock", toonify(createHammer()), BARREL_AT_DOCK[0] - 0.55, BARREL_AT_DOCK[2] - 0.55, 0.9, 0.15);
    this.only(barrelDock, ["C_barrel"]);

    // ---- in the rapids (A) and over the brink (E) ----
    // FLOATING: the barrel's waterline is read off the actual river surface (waves included); the anvil ballast keeps
    // it upright with ~0.62 m below the water (DRAFT)
    const barrelHook = toonify(createBarrel({ seed: 3 }));
    const wy = this.water.heightAt(BARREL_HOOK[0], BARREL_HOOK[2], BARREL_HOOK[1] + 0.62, 20);
    barrelHook.position.set(BARREL_HOOK[0], wy - DRAFT, BARREL_HOOK[2]); barrelHook.rotation.set(0.1, 0.4, -0.07); Rt.add(barrelHook);
    this.only(barrelHook, ["A_hook"]);
    // RIDING THE SHEET: the barrel's centre sits ON the computed curtain surface just past the brink, its axis tipped
    // toward the fall, sunk 35 % of its radius into the sheet so it neither hovers in front of the water nor vanishes
    const barrelBrink = toonify(createBarrel({ seed: 3 }));
    const sB = RUN_PHI / PHI_M, sheetK = brinkK(sB, 2.2), cA = V(...curtainAt(sB, sheetK).p), cB = V(...curtainAt(sB, sheetK + 0.01).p);
    const down = cB.clone().sub(cA).normalize(), o = outward(RUN_PHI), inward = V(-o[0], 0, -o[1]);
    const nrm = down.clone().cross(inward.clone().cross(V(0, 1, 0))).normalize(); if (nrm.dot(inward) < 0) nrm.negate(); // sheet normal, facing the bowl
    const axisUp = V(0, 1, 0).lerp(down.clone().negate(), 0.35).add(inward.clone().multiplyScalar(0.55)).normalize();
    barrelBrink.quaternion.setFromUnitVectors(V(0, 1, 0), axisUp).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.4));
    const centre = cA.clone().addScaledVector(nrm, BARREL.RB * 0.65);
    barrelBrink.position.copy(centre).addScaledVector(axisUp, -BARREL.H / 2); Rt.add(barrelBrink);
    this.brink = centre;
    this.only(barrelBrink, ["E_plunge"]);

    // ---- lower-river shore: cat test (D), rescue (F), purse (G) ----
    // RESTING: every shore prop is put down on the pebble mesh under its footprint (Ground.rest)
    const barrelCat = this.rest("barrel@shore", toonify(createBarrel({ lid: false, seed: 3 })), BARREL_SHORE[0], BARREL_SHORE[2], 0.3, 0.42);
    // the lid leans on the barrel: its lowest edge on the pebbles, its face against the staves (centre .5 m out)
    const lidCat = centred(toonify(createBarrelLid()));
    lidCat.rotation.set(0.1, 0.5, 1.32); lidCat.position.set(BARREL_SHORE[0] + 0.68, 0, BARREL_SHORE[2] + 0.3); Rt.add(lidCat); this.ground.rest(lidCat, 0.05);
    this.props.push({ name: "lid@shore", o: lidCat, r: 0.05 });
    this.only(barrelCat, ["D_cat"]); this.only(lidCat, ["D_cat"]);
    const barrelRescue = this.rest("barrel@rescue", toonify(createBarrel({ lid: false, seed: 5 })), BARREL_RESCUE[0], BARREL_RESCUE[2], -0.5, 0.42);
    this.only(barrelRescue, ["F_rescue", "G_purse"]);
    // FLOATING: the boat is beached half in the water: keel on the pebbles where they are, waterline elsewhere
    const boat = toonify(createRescueBoat({ oarsIn: true }));
    boat.position.set(BARREL_RESCUE[0] + 0.9, POOL_Y - 0.05, BARREL_RESCUE[2] - 4.6); boat.rotation.set(0.04, 2.6, 0.06); Rt.add(boat);
    this.ground.rest(boat, 0.5, 0.06);
    const lidG = centred(toonify(createBarrelLid())); // the sawn-off lid laid back on the rim, the takings on it
    const top = barrelRescue.position.y + BARREL.H + 0.02, lx = barrelRescue.position.x, lz = barrelRescue.position.z;
    lidG.position.set(lx, top, lz); lidG.rotation.set(0.03, 0.6, -0.02); Rt.add(lidG);
    const coins = toonify(createCoinStack(2)); coins.position.set(lx + 0.1, top + 0.02, lz + 0.14); coins.scale.setScalar(2.2); Rt.add(coins);
    const purse = toonify(createCoinPurse()); purse.position.set(lx - 0.12, top + 0.02, lz + 0.08); purse.rotation.y = 2.2; purse.scale.setScalar(1.6); Rt.add(purse);
    this.rest("rock@shore", toonify(createBoulder(0.55, 9, 0.5, 2)), BARREL_RESCUE[0] + 1.6, BARREL_RESCUE[2] + 0.9, 0, 0.3, 0.12);
    this.only(lidG, ["G_purse"]); this.only(coins, ["G_purse"]); this.only(purse, ["G_purse"]);
    this.rest("rope@shore", toonify(createRopeCoil(3, 0.22)), BARREL_SHORE[0] - 0.4, BARREL_SHORE[2] + 1.6, 0, 0.25);
    this.anchors = { dock: barrelDock.position.clone(), shore: barrelCat.position.clone(), rescue: barrelRescue.position.clone(), brink: this.brink.clone() };

  }

  /** add a prop and rest it on the ground under its footprint; tracked for the QA support check */
  private rest(name: string, o: THREE.Object3D, x: number, z: number, yaw: number, footprint: number, sink = 0) {
    o.position.set(x, 0, z); o.rotation.y = yaw; this.root.add(o);
    this.ground.rest(o, footprint, sink);
    this.props.push({ name, o, r: footprint, sink });
    return o;
  }
  private only(o: THREE.Object3D, keys: string[]) { this.byShot.push({ o, keys }); }

  /** camera-relative sun, frozen per shot (bridge rule): the shot's mean view direction turned by az, lifted by el */
  private shotSun(id: number, s: ShotDef) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    v = SkyRig.sunFrom(fx, fz, s.sunAz ?? 75, s.sunEl ?? 48);
    this.sunCache.set(id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1];
    const dbg = this.inp.cam; // look-dev only: override the camera
    const c = dbg ? { pos: dbg.pos, look: dbg.look, fov: dbg.fov ?? 50, roll: 0 } : camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    const sunDir = this.shotSun(id, s);
    this.sky.update(cam, scene, s.light, sunDir, focus, { fogNear: 140, fogFar: 900 });
    // ---- water + mist ----
    setWaterLook(s.light === "golden" ? WATER_GOLD : WATER_DAY, t);
    this.falls.mist.forEach((mm, i) => {
      const u = (t * 0.06 + mm.k) % 1, rise = 6 * u;
      mm.m.position.set(mm.base[0], mm.base[1] + rise, mm.base[2] + 3 * u);
      const sz = mm.size * (0.85 + 0.3 * u); mm.m.scale.set(sz, sz, 1); mm.m.quaternion.copy(cam.quaternion);
      mm.mat.opacity = mm.op * Math.min(1, u * 5) * (u > 0.8 ? (1 - u) / 0.2 : 1);
      mm.mat.map = this.falls.mistMaps[s.light][i % 4];
    });
    const rb = this.falls.rainbow;
    rb.visible = s.key === "A_hook";
    if (rb.visible) { rb.position.set(14, POOL_Y + 14, 22); rb.scale.set(110, 55, 1); rb.quaternion.copy(cam.quaternion); }
    for (const o of this.byShot) o.o.visible = o.keys.includes(s.key);
    // ---- cast + effects (grounded by CardStage) ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir, light: s.light }, this.anchors);
    this.cards.render(st, cam, right, s.light, s.light === "golden");
    if (this.inp.qa) this.qa(id, f, cam, st.places.filter((p) => p.glow && p.glow !== "off"));
    return focus;
  }

  /** automated checks for this frame (VISUAL-QA.md): props supported, camera clear of geometry, primaries visible */
  private qa(id: number, f: number, cam: THREE.PerspectiveCamera, primaries: { x: number; y: number; z: number; scale?: number; name?: string }[]) {
    const out: string[] = [...this.cards.qa], key = SHOTS[id - 1].key;
    this.root.updateMatrixWorld(true);
    for (const p of this.props) {
      if (!p.o.visible) continue;
      const box = new THREE.Box3().setFromObject(p.o), y = this.ground.supportAt(p.o.position.x, p.o.position.z, p.r, NaN, box.max.y + 0.5);
      const dy = box.min.y + (p.sink ?? 0) - y; // a declared sink (a boulder bedded in pebbles) is intended
      if (Number.isFinite(y) && Math.abs(dy) > 0.03) out.push(`prop ${p.name} ${dy > 0 ? "floats" : "sinks"} ${(Math.abs(dy) * 100).toFixed(1)} cm`);
    }
    const g = this.ground.heightAt(cam.position.x, cam.position.z, -Infinity, cam.position.y + 50);
    if (cam.position.y < g + 0.2) out.push(`camera ${(cam.position.y - g).toFixed(2)} m above ground (inside terrain?)`);
    const solids = this.root.children.filter((o) => o.layers.mask !== 1 << NOINK);
    const ndc = [[0, 0], [-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9], [0, -0.95], [0, 0.95]];
    let near = Infinity;
    for (const [x, y] of ndc) {
      this.ray.setFromCamera(new THREE.Vector2(x, y), cam); this.ray.far = 1.0;
      const h = this.ray.intersectObjects(solids, true).find((i) => i.object.visible && (i.object as THREE.Mesh).isMesh && i.object.layers.mask !== 1 << NOINK);
      if (h) near = Math.min(near, h.distance);
    }
    if (near < 0.6) out.push(`near-plane risk: geometry ${near.toFixed(2)} m from the lens`);
    for (const p of primaries) {
      const head = V(p.x, p.y + 1.35 * (p.scale ?? 1), p.z), d = head.distanceTo(cam.position);
      this.ray.set(cam.position, head.clone().sub(cam.position).normalize()); this.ray.far = d - 0.3;
      const h = this.ray.intersectObjects(solids, true).find((i) => i.object.visible && (i.object as THREE.Mesh).isMesh && i.object.layers.mask !== 1 << NOINK && !((i.object as THREE.Mesh).material as THREE.Material).transparent);
      if (h) out.push(`${p.name ?? "primary"} face blocked by ${h.object.name || ((h.object as THREE.Mesh).material as THREE.Material).name || "mesh"} at ${h.distance.toFixed(2)} m`);
    }
    console.warn(`[QA] ${key} f${f}: ${out.length ? out.join(" | ") : "clean"}`);
  }
}
