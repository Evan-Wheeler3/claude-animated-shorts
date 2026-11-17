// The Niagara set as one three.js scene: sky + clouds, the Horseshoe Falls (falls.ts), banks with trees, the
// Table Rock promenade, the launch landing, the lower-river shore with the rescue boat, the barrel (one per staging),
// the cast cards. update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
// Adapted from templates/bridge/world.ts: same sky shader, camera-relative frozen sun, two-tone uniforms, card pool.
import * as THREE from "three";
import { getInputProps } from "remotion";
import { Batch, lam, addVeg, VegKind } from "./build";
import { ctex, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, SU } from "./actors";
import { stage, CAT_SU } from "./crew";
import { buildFalls, FallsSet, setWaterLook, WATER_DAY, WATER_GOLD } from "./falls";
import { toonify } from "./props3d";
import {
  FPS, SHOTS, ShotDef, camAt, V3, LAND_Y, POOL_Y, R, RIM_L, RIM_R, ANNIE_BANK, DOCK, DOCK_Y, BARREL_AT_DOCK, BARREL_SHORE, BARREL_RESCUE,
  BARREL_HOOK, BARREL_BRINK, RUN_PHI, outward, SHORE,
} from "./story";
import {
  createBarrel, createBarrelLid, createRescueBoat, createRopeCoil, createHammer, createDock, createRailing, createLampPost, createCoinPurse, createCoinStack, createBoulder,
} from "../../../videos/niagara-barrel/assets/niagara-props.js";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** the lid is modelled in barrel space (origin = barrel bottom): re-centre it on its own disc */
const centred = (lid: THREE.Object3D) => { const g = new THREE.Group(); lid.position.y = -(lid.userData.lidY ?? 1.325); g.add(lid); return g; };
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

/** every shot camera at its still frame, as segments to keep trees out of */
const sightLines = () => SHOTS.map((s) => { const c = camAt(s.id, s.still); return { o: V(...c.pos), l: V(...c.look) }; });
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private cats: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private falls: FallsSet;
  private byShot: { o: THREE.Object3D; keys: string[] }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private catGeo: THREE.BufferGeometry;

  constructor() {
    const Rt = this.root;
    // ---- sky (5 stops by elevation, tone-map inverted), sun, clouds: as in the bridge world ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); Rt.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.renderOrder = -0.5; this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); Rt.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    Rt.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 34;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); Rt.add(m);
    }

    // ---- the falls, gorge, banks, water, mist ----
    this.falls = buildFalls(Rt);

    // ---- trees: Goat Island woods (+x), parkland behind the Canadian promenade (-x), kept off every sight line ----
    const rays = sightLines(), b = new Batch(), rnd = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    const tree = (x: number, z: number, h: number, k: VegKind) => {
      const c = V(x, LAND_Y + h * 0.6, z), rad = h * 0.45;
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
        r.position.set(x0, LAND_Y, z0); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); Rt.add(r);
      }
    };
    rail([[-93.2, -70], [-91.2, -40], [-88.2, -18], [-84.6, 0], [-80.6, 14], [-77.6, 40], [-74.6, 80]]);
    for (const [x, z] of [[-94.2, -48], [-90, -6], [-81.6, 30], [-78.2, 62]] as const) { const l = toonify(createLampPost()); l.position.set(x - 1.5, LAND_Y, z); Rt.add(l); }

    // ---- the launch landing upstream (C) ----
    const dock = toonify(createDock(3.2, 6.5, DOCK_Y - (LAND_Y - 3.0)));
    dock.position.set(DOCK[0] - 0.5, LAND_Y - 3.0, DOCK[2]); dock.rotation.y = -Math.PI / 2; Rt.add(dock);
    const barrelDock = toonify(createBarrel({ seed: 3 }));
    barrelDock.position.set(...BARREL_AT_DOCK); barrelDock.rotation.y = 0.5; Rt.add(barrelDock);
    const rope = toonify(createRopeCoil()); rope.position.set(BARREL_AT_DOCK[0] + 0.85, DOCK_Y, BARREL_AT_DOCK[2] - 0.75); Rt.add(rope);
    const hammer = toonify(createHammer()); hammer.position.set(BARREL_AT_DOCK[0] - 0.55, DOCK_Y, BARREL_AT_DOCK[2] - 0.55); hammer.rotation.y = 0.9; Rt.add(hammer);
    this.only(barrelDock, ["C_barrel"]);

    // ---- in the rapids (A) and over the brink (E) ----
    const barrelHook = toonify(createBarrel({ seed: 3 }));
    barrelHook.position.set(...BARREL_HOOK); barrelHook.rotation.set(0.1, 0.4, -0.07); Rt.add(barrelHook);
    this.only(barrelHook, ["A_hook"]);
    const barrelBrink = toonify(createBarrel({ seed: 3 }));
    const o = outward(RUN_PHI), inward = V(-o[0], 0, -o[1]), axis = V(0, 1, 0).cross(inward).normalize();
    barrelBrink.quaternion.setFromAxisAngle(axis, 0.95).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.4));
    barrelBrink.position.set(...BARREL_BRINK); Rt.add(barrelBrink);
    this.only(barrelBrink, ["E_plunge"]);

    // ---- lower-river shore: cat test (D), rescue (F), purse (G) ----
    const barrelCat = toonify(createBarrel({ lid: false, seed: 3 }));
    barrelCat.position.set(...BARREL_SHORE); barrelCat.rotation.y = 0.3; Rt.add(barrelCat);
    const lidCat = centred(toonify(createBarrelLid())); // standing on its edge against the barrel's side
    lidCat.position.set(BARREL_SHORE[0] + 0.66, BARREL_SHORE[1] + 0.36, BARREL_SHORE[2] + 0.3);
    lidCat.rotation.set(0.1, 0.5, 1.32); Rt.add(lidCat);
    this.only(barrelCat, ["D_cat"]); this.only(lidCat, ["D_cat"]);
    const barrelRescue = toonify(createBarrel({ lid: false, seed: 5 }));
    barrelRescue.position.set(...BARREL_RESCUE); barrelRescue.rotation.y = -0.5; Rt.add(barrelRescue);
    this.only(barrelRescue, ["F_rescue", "G_purse"]);
    const boat = toonify(createRescueBoat({ oarsIn: true }));
    boat.position.set(BARREL_RESCUE[0] + 0.9, POOL_Y - 0.05, BARREL_RESCUE[2] - 4.6); boat.rotation.set(0.04, 2.6, 0.06); Rt.add(boat);
    const lidG = centred(toonify(createBarrelLid())); // the sawn-off lid on a flat rock, two coins on it
    // the sawn-off lid laid back on the rim, the takings on it: two coins and the flattened purse
    const top = SHORE[1] + 1.37 + 0.02, lx = BARREL_RESCUE[0], lz = BARREL_RESCUE[2];
    lidG.position.set(lx, top, lz); lidG.rotation.set(0.03, 0.6, -0.02); Rt.add(lidG);
    const coins = toonify(createCoinStack(2)); coins.position.set(lx + 0.1, top + 0.02, lz + 0.14); coins.scale.setScalar(2.2); Rt.add(coins);
    const purse = toonify(createCoinPurse()); purse.position.set(lx - 0.12, top + 0.02, lz + 0.08); purse.rotation.y = 2.2; purse.scale.setScalar(1.6); Rt.add(purse);
    const rock = toonify(createBoulder(0.55, 9, 0.5, 2)); rock.position.set(BARREL_RESCUE[0] + 1.6, SHORE[1] - 0.05, BARREL_RESCUE[2] + 0.9); Rt.add(rock);
    this.only(lidG, ["G_purse"]); this.only(coins, ["G_purse"]); this.only(purse, ["G_purse"]);
    const ropeShore = toonify(createRopeCoil(3, 0.22)); ropeShore.position.set(BARREL_SHORE[0] - 0.4, SHORE[1] - 0.02, BARREL_SHORE[2] + 1.6); Rt.add(ropeShore);

    // cat card geometry: 600 x 600 design units, feet at y = 575
    this.catGeo = new THREE.PlaneGeometry(600 * CAT_SU, 600 * CAT_SU); this.catGeo.translate(0, (575 - 300) * CAT_SU, 0);
    void ANNIE_BANK; void R; void SU;
  }

  private only(o: THREE.Object3D, keys: string[]) { this.byShot.push({ o, keys }); }

  /** camera-relative sun, frozen per shot (bridge rule): the shot's mean view direction turned by az, lifted by el */
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
  private catActor(i: number) { while (this.cats.length <= i) this.cats.push(new Actor(this.root, this.catGeo)); return this.cats[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const dbg = (getInputProps() as { cam?: { pos: V3; look: V3; fov?: number } }).cam; // look-dev only: override the camera
    const c = dbg ? { pos: dbg.pos, look: dbg.look, fov: dbg.fov ?? 50, roll: 0 } : camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.2 + 8, 10, 140);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
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
    untone(L.fog, this.fog.color); this.fog.near = Math.max(L.fogNear, 140); this.fog.far = Math.max(L.fogFar, 900); // a 160 m set: haze only far away
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    // ---- water + mist ----
    setWaterLook(s.light === "golden" ? WATER_GOLD : WATER_DAY, t);
    for (const mm of this.falls.mist) {
      const u = (t * 0.06 + mm.k) % 1, rise = 6 * u;
      mm.m.position.set(mm.base[0], mm.base[1] + rise, mm.base[2] + 3 * u);
      const sz = mm.size * (0.85 + 0.3 * u); mm.m.scale.set(sz, sz, 1); mm.m.quaternion.copy(cam.quaternion);
      mm.mat.opacity = mm.op * Math.min(1, u * 5) * (u > 0.8 ? (1 - u) / 0.2 : 1);
      mm.mat.map = this.falls.mistMaps[s.light][this.falls.mist.indexOf(mm) % 4];
    }
    const rb = this.falls.rainbow;
    rb.visible = s.key === "A_hook";
    if (rb.visible) { rb.position.set(14, POOL_Y + 14, 22); rb.scale.set(110, 55, 1); rb.quaternion.copy(cam.quaternion); }
    // ---- per-shot props ----
    for (const o of this.byShot) o.o.visible = o.keys.includes(s.key);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir, light: s.light });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0, ci = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "cat" ? this.catActor(ci++) : this.actor(ai++);
      const [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = ci; i < this.cats.length; i++) this.cats[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}
export const V3_ = null as unknown as V3;
