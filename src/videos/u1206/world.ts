// U-1206 sets as one three.js scene, built from the Codex asset package (videos/u1206-toilet-disaster/assets, imported
// unchanged) inside the current Hold Up renderer: shared SkyRig / two-tone shading / ink / CardStage cast.
// Integration additions live HERE only (never in the assets): enclosure walls/ceiling so interior views do not look out
// into the sky, an underwater dome + light shafts, per-look light overrides, cartoon FX cards, crew staging.
// Gate 1 scope: poses and effects are sampled at each shot's still frame; Gate 2 animates them to the narration.
import * as THREE from "three";
import { getInputProps } from "remotion";
import { NOINK } from "../../pipeline/ink";
import { SkyRig } from "../../pipeline/sky";
import { Ground } from "../../pipeline/ground";
import { CardStage, person, blob, toCard, lidAt, q, Stage, CamInfo, Place } from "../../pipeline/cast";
import { Pen, fxSplash, FrontOpts, Expr } from "../../pipeline/toon";
import { spray } from "../../pipeline/effects";
import { TONE, CHAR, untone, twoTone } from "../../pipeline/shade";
import { ctex } from "../../pipeline/paint";
import { finish } from "./materials";
import { CREW, CAPTAIN } from "./cast";
import {
  createCompartment, createSection, createBatteryRoom, createSubmarine, createToilet, createAircraft, createRaft, createBubbles,
  createWarningLamp, createGasCue, createWaterSurface, createCutawayFlow, setValveAngle, setHatchAngle,
} from "../../../videos/u1206-toilet-disaster/assets/index.js";
import { FPS, SHOTS, V3, Look, COMP, SECT, BATT, camAt, subAt, smooth, clamp01, BLAST_F, FLOOD_F, SURF_KEEL, DEPTH_KEEL, TOILET14 } from "./story";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (o: V3, x: number, y: number, z: number) => V(o[0] + x, o[1] + y, o[2] + z);
type Props = { qa?: boolean; cam?: { pos: V3; look: V3; fov?: number } };
type Wave = { width: number; amplitude: number; period: number };
/** height of createWaterSurface's waves (assets/water.js, same formula) at world (x, z) for a mesh centred at cx, cz */
const waveY = (w: Wave, level: number, x: number, z: number, t: number) => {
  const ph = (x / w.period) * 6.283 + t * 1.25, ph2 = (z / w.period) * 4.7 - t * 0.9;
  return level + w.amplitude * (Math.sin(ph) + 0.45 * Math.sin(ph2 + (x / w.period) * 1.7));
};
const OCEAN: Wave = { width: 900, amplitude: 0.32, period: 14 };
/** life rafts on the camera side of the scuttled boat (s12 view line) */
const RAFTS: [number, number][] = [[-17.5, -11.5], [-14.5, -14.5], [-10.5, -6.5]];

// ---------------- light looks (shade.ts uniforms, linear multipliers) ----------------
type LookDef = { lit: V3; shade: V3; lift: V3; char: V3; fog: string; fogNear: number; fogFar: number; az: number; el: number };
const LOOKS: Record<Exclude<Look, "surface">, LookDef> = {
  // a caged ceiling lamp: warm key, slate-green shade (the shot list's slate-green interior)
  interior: { lit: [1.42, 1.32, 1.1], shade: [0.3, 0.36, 0.37], lift: [0.04, 0.07, 0.07], char: [1.0, 0.95, 0.88], fog: "#203a3c", fogNear: 40, fogFar: 200, az: 150, el: 58 },
  // emergency: red lamp key, darker shade
  alarm: { lit: [1.55, 0.86, 0.74], shade: [0.22, 0.2, 0.26], lift: [0.05, 0.03, 0.05], char: [1.0, 0.72, 0.66], fog: "#2a1c22", fogNear: 40, fogFar: 200, az: 150, el: 60 },
  // deep water: blue-green light from above, navy shade, dense blue fog (persistent navy-blue exterior)
  underwater: { lit: [0.78, 1.08, 1.22], shade: [0.13, 0.22, 0.34], lift: [0.02, 0.06, 0.1], char: [0.8, 0.95, 1.05], fog: "#1b5f80", fogNear: 8, fogFar: 150, az: 120, el: 72 },
};

/** soft vertical light shaft (additive), 64 x 512 */
const shaftTex = () => ctex("u1206Shaft2", 64, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.18, "rgba(255,255,255,0.85)"); gr.addColorStop(0.45, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
  g.globalCompositeOperation = "destination-in";
  const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, "rgba(0,0,0,0)"); gx.addColorStop(0.5, "rgba(0,0,0,1)"); gx.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gx; g.fillRect(0, 0, 64, 512);
});

// ---------------- cartoon FX drawn with the shared Pen (plum ink, flat fills) ----------------
/** a yellow-green gas billow (illustrative colour cue, not a claim about chlorine's appearance) on 256 x 256 */
const fxGas = (p: Pen, seed: number) => {
  const pts: [number, number, number][] = [[128, 150, 64], [78, 158, 44], [178, 156, 46], [104, 104, 42], [156, 100, 40], [128, 70, 30]];
  const j = (k: number) => Math.sin(seed * 12.9 + k * 7.1) * 7;
  p.g.globalAlpha = 0.82;
  for (const [i, [x, y, r]] of pts.entries()) p.ell(x + j(i), y, r, r * 0.86, "#3a3a24", 0);
  for (const [i, [x, y, r]] of pts.entries()) p.ell(x + j(i), y, r - 6, r * 0.86 - 6, "#c4d65a", 0);
  for (const [i, [x, y, r]] of pts.entries()) if (i % 2 === 0) p.ell(x + j(i) - r * 0.25, y - r * 0.3, r * 0.45, r * 0.3, "#e4ef9a", 0);
  p.g.globalAlpha = 1;
};
/** one falling water drop with a white catchlight, 128 x 192 */
const fxDrop = (p: Pen) => { p.poly([[64, 20], [96, 120], [64, 168], [32, 120]].map(([x, y]) => [x, y] as [number, number]), "#7fd2ea", 8); p.ell(64, 130, 33, 36, "#7fd2ea", 0); p.ell(52, 118, 8, 12, "#ffffff", 0); };
/** a rising bubble ring, 160 x 160 */
const fxBubbleRing = (p: Pen) => { p.ell(80, 80, 60, 60, "#d9f6ff", 9); p.ell(80, 80, 44, 44, "#3c8cb0", 0); p.ell(60, 58, 14, 10, "#ffffff", 0); };

/** the toilet geyser (Gate 1 owner note: the water must visibly come OUT OF THE BOWL, not out of the air above it).
 *  Room-local curve that starts inside the bowl below the rim, rises straight out of it, then arcs to its target.
 *  Tapered stream + pale core revealed along its length (draw range) + droplets riding the curve; t = seconds since
 *  the blast started (< 0 = hidden). Story-scoped replacement for the Codex createAnimatedBlast arc, which began 25 cm
 *  above the rim. */
const BOWL_SRC: V3 = [0.35, 0.36, -0.55]; // inside the bowl (lathe inner floor ~0.32 m, rim ~0.57 m), room-local
const makeGeyser = (pts: V3[]) => {
  const group = new THREE.Group(), curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, "centripetal");
  const SEG = 64, RAD = 12;
  const tube = (r0: number, r1: number, r2: number, col: string) => {
    const g = new THREE.TubeGeometry(curve, SEG, 1, RAD, false), pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const seg = Math.floor(i / (RAD + 1)), u = seg / SEG, c = curve.getPointAt(u);
      const r = u < 0.35 ? r0 + (r1 - r0) * (u / 0.35) : r1 + (r2 - r1) * ((u - 0.35) / 0.65);
      pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * r, c.y + (pos.getY(i) - c.y) * r, c.z + (pos.getZ(i) - c.z) * r);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ color: col }))); m.layers.set(NOINK); group.add(m); return m;
  };
  // TubeGeometry samples by arc length (getPointAt) for its rings: the per-ring centres above match
  const stream = tube(0.075, 0.1, 0.06, "#52c6dc"), core = tube(0.035, 0.05, 0.025, "#e8fbf6");
  const foam = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 32), twoTone(new THREE.MeshLambertMaterial({ color: "#e8fbf6" })));
  foam.rotation.x = Math.PI / 2; foam.position.set(BOWL_SRC[0], 0.6, BOWL_SRC[2]); foam.layers.set(NOINK); group.add(foam); // churn just inside the rim
  const dropMat = twoTone(new THREE.MeshLambertMaterial({ color: "#7fd2ea" })), drops: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.012, 10, 8), dropMat); d.layers.set(NOINK); group.add(d); drops.push(d); }
  const idx = stream.geometry.index!.count;
  const update = (t: number) => {
    group.visible = t > 0;
    if (!group.visible) return;
    const grow = smooth(t / 0.3), n = Math.max(6, Math.round((idx * grow) / (RAD * 6)) * RAD * 6);
    stream.geometry.setDrawRange(0, n); core.geometry.setDrawRange(0, n);
    foam.scale.setScalar(0.85 + 0.15 * Math.sin(t * 20));
    drops.forEach((d, i) => {
      const u = (((t * 0.9 + i / 14) % 1) + 1) % 1; d.visible = u < grow;
      const c = curve.getPointAt(Math.min(1, u)); d.position.set(c.x + Math.sin(i * 4.1 + t * 5) * 0.09 * u, c.y + 0.05 * Math.sin(i * 2.3), c.z + Math.cos(i * 3.7 + t * 4) * 0.09 * u);
    });
  };
  return { group, curve, update };
};

export class World {
  root = new THREE.Group();
  private sky: SkyRig;
  private ground = new Ground();
  private cards: CardStage;
  private inp = getInputProps() as Props;
  private dome: THREE.Mesh; private domeMat: THREE.ShaderMaterial;
  private shafts: THREE.Mesh[] = [];
  private room: THREE.Group; private section: THREE.Group; private battery: THREE.Group;
  private sub: THREE.Group; private ocean: { mesh: THREE.Mesh; update: (t: number) => void };
  private floodWater: { mesh: THREE.Mesh; update: (t: number) => void };
  private deckWater: { mesh: THREE.Mesh; update: (t: number) => void };
  private geysers: Record<string, ReturnType<typeof makeGeyser>> = {};
  private flow: { group: THREE.Group; update: (t: number) => void };
  private lamp: THREE.Group; private gasCue: THREE.Group;
  private aircraft: THREE.Group[] = []; private rafts: THREE.Group[] = [];
  private bubbles: THREE.Group; private loneToilet: THREE.Group;
  private sets: { o: THREE.Object3D; keys: string[] }[] = [];
  private skyParts: THREE.Object3D[] = [];
  /** valve wheels of the compartment by role (world centre + number for setValveAngle/valveGripPoint) */
  private wheel = { low: 0, high: 0 };

  constructor() {
    const R = this.root;
    this.sky = new SkyRig(R, { clouds: 11 });
    this.skyParts = [...R.children].filter((o) => (o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite);
    // ---- underwater dome (fog-free gradient by view elevation; tone-map inverted like the sky) ----
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: untone("#8fd0de") }, mid: { value: untone("#2f86a6") }, hor: { value: untone("#1b5f80") }, low: { value: untone("#0b2a44") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 top, mid, hor, low; varying vec3 vP;
        void main(){ float y = normalize(vP).y; vec3 c = mix(hor, low, smoothstep(0.0, -0.6, y));
          c = mix(c, mid, smoothstep(0.05, 0.45, y)); c = mix(c, top, smoothstep(0.55, 0.95, y)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), this.domeMat);
    this.dome.renderOrder = -1; this.dome.frustumCulled = false; this.dome.layers.set(NOINK); R.add(this.dome);
    const sm = new THREE.MeshBasicMaterial({ map: shaftTex(), color: new THREE.Color(0.55, 0.85, 0.9), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sm); m.layers.set(NOINK); m.renderOrder = 3; this.shafts.push(m); R.add(m); }

    // ---- toilet compartment (Codex createCompartment) + enclosure so interior shots never see sky ----
    this.room = finish(createCompartment()); this.room.position.set(...COMP); R.add(this.room);
    const encl = (o: V3, w: number, d: number, h: number) => {
      const g = new THREE.Group();
      const mat = twoTone(new THREE.MeshLambertMaterial({ color: "#6f8783" })), dark = twoTone(new THREE.MeshLambertMaterial({ color: "#33474a" }));
      const box = (x: number, y: number, z: number, bw: number, bh: number, bd: number, mm = mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mm); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
      box(w / 2 + 0.05, h / 2, 0, 0.1, h, d);                                   // right wall (camera side x+)
      for (let z = -d / 2 + 0.3; z < d / 2; z += 0.7) box(w / 2 - 0.02, h / 2, z, 0.05, h - 0.1, 0.06, dark); // frames
      box(0, h + 0.05, 0, w + 0.2, 0.1, d);                                     // deckhead
      for (let x = -w / 2 + 0.2; x < w / 2; x += 0.55) box(x, h - 0.03, 0, 0.06, 0.06, d, dark); // overhead ribs
      for (const [x, r] of [[-0.7, 0.05], [-0.45, 0.035], [0.9, 0.06]] as const) { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, 12), dark); p.rotation.x = Math.PI / 2; p.position.set(x, h - 0.16, 0); p.castShadow = true; g.add(p); }
      // a caged lamp (the motivated key light)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6) }));
      bulb.position.set(0.3, h - 0.18, 0.35); g.add(bulb);
      const cage = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), dark); cage.position.copy(bulb.position); cage.rotation.x = Math.PI / 2; g.add(cage);
      g.position.set(...o); return g;
    };
    const roomEncl = encl(COMP, 3.2, 2.7, 2.7); R.add(roomEncl);
    // flood: an interior water surface bounded by the room walls, and the geyser out of the bowl (one aim per shot)
    this.floodWater = createWaterSurface({ width: 3.1, depth: 2.62, segments: 36, level: 0.16, amplitude: 0.035, period: 0.7, color: "#3e9fb8", opacity: 0.8 });
    twoTone(this.floodWater.mesh.material as THREE.MeshLambertMaterial); this.floodWater.mesh.layers.set(NOINK); this.room.add(this.floodWater.mesh);
    const [bx, by, bz] = BOWL_SRC;
    this.geysers = {
      // 01: straight up out of the bowl, curling over toward the lens / the sailor at screen-left
      s01_blast: makeGeyser([[bx, by, bz], [bx, 0.8, bz], [bx - 0.05, 1.3, bz + 0.1], [bx - 0.35, 1.25, bz + 0.5], [-0.45, 0.25, 0.3]]),
      // 07: out of the bowl and over to the doorway, landing on the braced sailor's boots
      s07_flood: makeGeyser([[bx, by, bz], [bx, 0.8, bz], [bx - 0.1, 1.3, bz - 0.1], [-0.55, 1.0, -0.85], [-1.1, 0.12, -0.9]]),
    };
    for (const g of Object.values(this.geysers)) this.room.add(g.group);
    // valve wheels by role: the two on the toilet's pipes (low = right/brass line, high = left/outlet line)
    R.updateMatrixWorld(true);
    const wheels: { n: number; p: THREE.Vector3; toilet: boolean }[] = [];
    this.room.traverse((o) => { const m = /^valve-wheel-(\d+)$/.exec(o.name); if (m) { let t = false; o.traverseAncestors((a) => { if (a.name === "pressure-toilet") t = true; }); wheels.push({ n: +m[1], p: o.getWorldPosition(V(0, 0, 0)), toilet: t }); } });
    const tw = wheels.filter((w) => w.toilet).sort((a, b) => a.p.y - b.p.y);
    this.wheel = { low: tw[0].n, high: tw[1].n };
    this.ground.add(this.room.getObjectByName("floor")!);

    // ---- two-level illustrative section (Codex createSection), upper deck raised 0.5 m so the battery bay reads ----
    this.section = finish(createSection()); this.section.position.set(...SECT); R.add(this.section);
    const upper = this.section.getObjectByName("compartment")!; upper.position.y = 1.5;
    const rib = this.section.getObjectByName("pressure-hull-rib"); if (rib) { rib.position.y = 2.3; rib.scale.setScalar(1.12); }
    this.deckWater = createWaterSurface({ width: 3.1, depth: 2.62, segments: 30, level: 0.14, amplitude: 0.025, period: 0.6, color: "#3e9fb8", opacity: 0.82 });
    twoTone(this.deckWater.mesh.material as THREE.MeshLambertMaterial); this.deckWater.mesh.layers.set(NOINK); upper.add(this.deckWater.mesh);
    // the Codex droplet path, moved onto a deck drain above the front battery row and squeezed into the bay height
    this.flow = createCutawayFlow(); finish(this.flow.group);
    this.flow.group.position.set(-0.35, 0.66, -0.65); this.flow.group.scale.set(1, 0.6, 1);
    this.flow.group.traverse((o) => { if (o.name === "flow-drop") o.scale.set(0.7, 2.0, 0.7); });
    this.section.add(this.flow.group);
    const drain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 24), twoTone(new THREE.MeshLambertMaterial({ color: "#222c2e" })));
    drain.rotation.x = Math.PI / 2; drain.position.set(0.35, 1.505, 0.75); this.section.add(drain);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), twoTone(new THREE.MeshLambertMaterial({ color: "#5cc0d6" })));
    puddle.rotation.x = -Math.PI / 2; puddle.position.set(0.35, 0.875, 0.75); this.section.add(puddle);
    this.ground.add(upper.getObjectByName("floor")!);

    // ---- battery room (Codex createBatteryRoom) + enclosure, warning lamp, Codex gas cue (kept for comparison) ----
    this.battery = finish(createBatteryRoom()); this.battery.position.set(...BATT); R.add(this.battery);
    const battEncl = encl(BATT, 3.6, 2.8, 2.8); R.add(battEncl);
    this.lamp = createWarningLamp(); this.lamp.position.set(-1.74, 2.15, 0.1); this.lamp.rotation.y = Math.PI / 2; this.battery.add(this.lamp); // on the side bulkhead, facing the s09 camera
    const glow = this.lamp.getObjectByName("lamp-glow") as THREE.Mesh; (glow.material as THREE.MeshBasicMaterial).color.setRGB(5, 0.9, 0.5);
    // Codex gas cue (sprites): kept loaded for comparison renders (inputProps codexGas), replaced by inked billow cards
    this.gasCue = createGasCue(); this.gasCue.position.set(0.3, 0.9, 0); this.gasCue.traverse((o) => o.layers.set(NOINK)); this.battery.add(this.gasCue);
    this.gasCue.visible = !!(getInputProps() as { codexGas?: boolean }).codexGas;
    this.ground.add(this.battery.getObjectByName("floor")!);

    // ---- exterior: the boat, the ocean, aircraft, rafts, bubbles; the lone toilet of the end gag ----
    this.sub = finish(createSubmarine()); R.add(this.sub);
    this.ocean = createWaterSurface({ width: OCEAN.width, depth: OCEAN.width, segments: 180, level: 0, amplitude: OCEAN.amplitude, period: OCEAN.period, color: "#21789a" });
    twoTone(this.ocean.mesh.material as THREE.MeshLambertMaterial); R.add(this.ocean.mesh);
    for (let i = 0; i < 2; i++) { const a = finish(createAircraft()); a.scale.setScalar(1.4); R.add(a); this.aircraft.push(a); }
    for (let i = 0; i < 3; i++) { const r = finish(createRaft()); R.add(r); this.rafts.push(r); }
    this.bubbles = finish(createBubbles()); this.bubbles.scale.setScalar(2.4); R.add(this.bubbles);
    this.loneToilet = finish(createToilet()); R.add(this.loneToilet);

    this.cards = new CardStage(R, this.ground);
    const interior = ["s01_blast", "s04_captain", "s05_specialist", "s06_valve", "s07_flood", "s13_drip"];
    this.sets.push({ o: this.room, keys: interior }, { o: roomEncl, keys: interior }, { o: this.section, keys: ["s08_cutaway"] },
      { o: this.battery, keys: ["s09_gas"] }, { o: battEncl, keys: ["s09_gas"] },
      { o: this.sub, keys: ["s02_hero", "s03_depth", "s10_surface", "s11_aircraft", "s12_scuttle", "s14_deadpan"] },
      { o: this.ocean.mesh, keys: ["s02_hero", "s03_depth", "s10_surface", "s11_aircraft", "s12_scuttle", "s14_deadpan"] },
      { o: this.bubbles, keys: ["s02_hero", "s12_scuttle", "s14_deadpan"] }, { o: this.loneToilet, keys: ["s14_deadpan"] },
      ...this.aircraft.map((o) => ({ o, keys: ["s11_aircraft"] })), ...this.rafts.map((o) => ({ o, keys: ["s12_scuttle"] })));
  }

  private applyLook(look: Look, cam: THREE.PerspectiveCamera, scene: THREE.Scene, focus: THREE.Vector3, fwd: THREE.Vector3, fogFar?: number) {
    const under = look === "underwater";
    if (look === "surface") {
      const sun = SkyRig.sunFrom(fwd.x, fwd.z, 120, 38);
      this.sky.update(cam, scene, "day", sun, focus, { fogNear: 140, fogFar: 1000, shadowR: 60 });
      this.dome.visible = false; this.skyMesh(true);
      return sun;
    }
    const L = LOOKS[look], sun = SkyRig.sunFrom(fwd.x, fwd.z, L.az, L.el);
    this.sky.update(cam, scene, "day", sun, focus, { shadowR: under ? 60 : 4.5 });
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    CHAR.uCharTint.value.set(...L.char);
    untone(L.fog, this.sky.fog.color); this.sky.fog.near = L.fogNear; this.sky.fog.far = fogFar ?? L.fogFar;
    this.skyMesh(false);
    this.dome.visible = under; this.dome.position.copy(cam.position);
    if (!under) { scene.background = untone(L.fog); }
    return sun;
  }
  /** SkyRig keeps its dome, clouds and sun disc private: hide them for interiors and underwater (sun disc stays off: day light) */
  private skyMesh(on: boolean) { for (const o of this.skyParts) o.visible = on && !(o as THREE.Sprite).isSprite; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], key = s.key;
    const dbg = this.inp.cam;
    const c = dbg ? { pos: dbg.pos, look: dbg.look, fov: dbg.fov ?? 50, roll: 0 } : camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.look === "interior" || s.look === "alarm" ? 0.05 : 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), fwd = focus.clone().sub(cam.position);
    for (const o of this.sets) o.o.visible = o.keys.includes(key);
    const sun = this.applyLook(s.look, cam, scene, focus, fwd, key === "s03_depth" ? 260 : key === "s14_deadpan" ? 170 : undefined);
    // deep shots never see the surface; the surfacing shot sees it from below without world ink on the wave crests
    this.ocean.mesh.visible = this.ocean.mesh.visible && key !== "s02_hero" && key !== "s03_depth" && key !== "s14_deadpan";
    this.ocean.mesh.layers.set(s.look === "underwater" ? NOINK : 0);
    // light shafts: only underwater, slanted planes around the view, facing the camera about Y
    this.shafts.forEach((m, i) => {
      m.visible = s.look === "underwater";
      if (!m.visible) return;
      const a = i * 2.4 + 0.5, r = 14 + (i % 3) * 9, cx = c.look[0] + Math.cos(a) * r, cz = c.look[2] + Math.sin(a) * r;
      m.position.set(cx, -55, cz); m.scale.set(4 + (i % 3) * 3, 110, 1); m.lookAt(cam.position.x, -55, cam.position.z); m.rotateZ(0.12 * Math.sin(i * 1.7));
    });
    // ---- exterior posing ----
    this.ocean.update(t);
    if (this.sub.visible) {
      const p = subAt(key, f); this.sub.position.set(...p); this.sub.rotation.set(0, 0, 0);
      if (key === "s10_surface") this.sub.rotation.x = -0.2;
      if (key === "s12_scuttle") { const u = smooth((t - 31) / 3.9); this.sub.position.y = SURF_KEEL - 0.4 - 2.0 * u; this.sub.rotation.set(-0.03 - 0.05 * u, 0, 0.03); } // stern settles first
      if (key === "s14_deadpan") this.sub.rotation.set(0.1, 1.15, 0.04);
      this.sub.traverse((o) => { if (o.name === "propeller") o.rotation.z = t * (key === "s12_scuttle" ? 0 : 4); });
    }
    this.aircraft.forEach((a, i) => { a.position.set(48 + i * 11 - 9 * (t - 27.6), 46 + i * 4, 34 + i * 9 + 4 * (t - 27.6)); a.rotation.set(0, -1.2, 0.1); });
    const raftAt = RAFTS;
    this.rafts.forEach((r, i) => { const [x, z] = raftAt[i]; r.position.set(x, waveY(OCEAN, 0, x, z, t) - 0.06, z); r.rotation.set(0.05 * Math.sin(t + i), i, 0.05 * Math.cos(t * 1.3 + i)); });
    if (key === "s14_deadpan") { this.bubbles.position.set(12, DEPTH_KEEL - 6, 70); this.bubbles.scale.setScalar(5); }
    else { this.bubbles.position.set(2, key === "s12_scuttle" ? -1.5 : DEPTH_KEEL + 7, 6); this.bubbles.scale.setScalar(2.4); }
    if (key === "s14_deadpan") { this.loneToilet.position.set(...TOILET14); this.loneToilet.rotation.set(0.1, 0.9, -0.06); }
    // ---- interior posing (Codex controls: setValveAngle / setHatchAngle) ----
    const blastK = key === "s01_blast" ? (f - BLAST_F) / FPS : key === "s07_flood" ? (f - FLOOD_F) / FPS + 1.2 : -1;
    setValveAngle(this.room, this.wheel.low, key === "s01_blast" ? -1.6 * smooth((f - BLAST_F + 8) / 8) : key === "s06_valve" ? -0.6 : 0);
    setHatchAngle(this.room, 0);
    for (const [k, g] of Object.entries(this.geysers)) { g.update(k === key ? blastK : -1); }
    this.floodWater.mesh.visible = key === "s07_flood"; this.floodWater.update(t);
    this.deckWater.update(t); this.flow.update(t);
    const lampOn = Math.sin(t * 9) > -0.2; (this.lamp.getObjectByName("lamp-glow") as THREE.Mesh).visible = lampOn;
    const seat = this.room.getObjectByName("seat-hinge"); if (seat) seat.rotation.x = key === "s13_drip" ? -0.06 * Math.sin(t * 9) : 0;
    this.root.updateMatrixWorld(true);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const ci: CamInfo = { pos: cam.position, right, sun, light: "day" };
    const st = this.stage(key, t, f, ci);
    this.cards.render(st, cam, right, "day", false);
    if (this.inp.qa) console.warn(`[QA] ${key} f${f}: ${this.cards.qa.length ? this.cards.qa.join(" | ") : "cards grounded"}`);
    return focus;
  }

  /** world point on a toilet valve's rim (Codex valveGripPoint semantics, re-evaluated after posing) */
  private rim(n: number, side: number) {
    const w = this.room.getObjectByName(`valve-wheel-${n}`)!; const r = w.userData.rimRadius as number;
    return w.localToWorld(V(Math.sign(side) * r, 0, 0.04));
  }

  private stage(key: string, t: number, f: number, cam: CamInfo): Stage {
    const out: Stage = { places: [], fx: [] };
    const P = (i: number, o: typeof CREW, name: string, p: THREE.Vector3, fo: FrontOpts, extra: Partial<Place> = {}, scale = 1) => {
      out.places.push(person(cam, i, o, name, p.x, p.y, p.z, { blink: lidAt(t, i), seed: i, ...fo }, scale, { name, ...extra }));
      if (extra.ground !== false) blob(cam, out, p.x, p.z, scale, 0.7);
    };
    /** hands for a card standing at p: [screen-left target | null, screen-right target | null] */
    /** ATTACHMENT from THIS camera: slide the world contact point along the view ray into the card's plane, then convert
     *  (toCard alone projects orthogonally, which misses when the prop is not in the card plane) */
    const onCard = (p: THREE.Vector3, P: THREE.Vector3) => {
      const n = cam.pos.clone().sub(p).setY(0).normalize(), d = P.clone().sub(cam.pos), den = d.dot(n);
      const k = Math.abs(den) < 1e-6 ? 1 : p.clone().sub(cam.pos).dot(n) / den;
      return cam.pos.clone().addScaledVector(d, k);
    };
    const grip = (p: THREE.Vector3, l: THREE.Vector3 | null, r: THREE.Vector3 | null, scale = 1): [[number, number] | null, [number, number] | null] =>
      [l ? toCard(cam.pos, p.x, p.y, p.z, scale, onCard(p, l)) : null, r ? toCard(cam.pos, p.x, p.y, p.z, scale, onCard(p, r)) : null];
    const puff = (x: number, y: number, z: number, sz: number, k: number) =>
      out.fx.push({ key: `spray${k % 3}`, cw: 256, ch: 256, draw: (p) => spray(p, k % 3), soft: true, x, y, z, w: sz, h: sz });
    const splash = (x: number, y: number, z: number, w: number, u: number) =>
      out.fx.push({ key: `splash${q(u, 20)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 20)), x, y, z, w, h: w });
    switch (key) {
      case "s01_blast": {
        const p = at(COMP, -0.5, 0, -0.45), u = clamp01((f - BLAST_F) / 10);
        P(2, CREW, "sailor", p, { mode: "stand", expr: u > 0 ? "shock" : "worried", pose: u > 0 ? "up" : undefined, tilt: u > 0 ? -7 : 0 });
        // spray bursts AT THE RIM (the source), not in mid-air
        if (u > 0) for (let k = 0; k < 4; k++) { const a = k * 1.7; puff(COMP[0] + 0.35 + Math.cos(a) * 0.3, 0.62 + 0.03 * k, -0.55 + Math.sin(a) * 0.25, 0.2 + 0.04 * k, k); }
        break;
      }
      case "s04_captain": {
        const p = at(COMP, -0.62, 0, -0.32);
        P(1, CAPTAIN, "captain", p, { mode: "stand", expr: "worried", look: 0.6, tilt: 6, headTilt: -4 }, { glow: "subtle" });
        break;
      }
      case "s05_specialist": {
        const p = at(COMP, 1.2, 0, -0.66);
        P(3, CREW, "specialist", p, { mode: "stand", expr: "determined", pose: "grip", hands: grip(p, this.rim(this.wheel.low, 1), null) });
        break;
      }
      case "s06_valve": {
        const p = at(COMP, 1.2, 0, -0.66);
        P(3, CREW, "specialist", p, { mode: "stand", expr: "nervous", pose: "grip", hands: grip(p, this.rim(this.wheel.low, 1), null) });
        break;
      }
      case "s07_flood": {
        const p = at(COMP, -1.2, 0, -0.95), frame = at(COMP, -0.85 - 0.5, 1.35, -1.2);
        P(2, CREW, "sailor", p, { mode: "stand", expr: "shock", pose: "grip", hands: grip(p, frame, null), tilt: -5 });
        const end = this.room.localToWorld(this.geysers.s07_flood.curve.getPointAt(1).clone()), u = ((t * 1.6) % 1);
        for (let k = 0; k < 3; k++) { const a = k * 2.1; puff(COMP[0] + 0.35 + Math.cos(a) * 0.3, 0.7, -0.55 + Math.sin(a) * 0.25, 0.25, k); }
        splash(end.x, COMP[1] + 0.16, end.z, 0.9, u); for (let k = 0; k < 3; k++) puff(end.x + 0.1 * k, 0.32 + 0.1 * k, end.z + 0.05, 0.3, k);
        break;
      }
      case "s09_gas": {
        const a = at(BATT, -1.5, 0, 0.55), b = at(BATT, -0.35, 0, 1.2);
        P(2, CREW, "sailor", a, { mode: "stand", expr: "shock", pose: "up", tilt: -8 });
        P(4, CREW, "sailor2", b, { mode: "stand", expr: "pained", pose: "clasp", tilt: 6 });
        // billows leave the cell vents and rise/spread (cells at x -1.1..1, z -.75..75; tops at 0.87 m)
        for (let k = 0; k < 7; k++) {
          const u = ((t * 0.3 + k / 7) % 1), cx = BATT[0] - 1.1 + (k % 4) * 0.7 + 0.12 * Math.sin(k * 2.1 + t * 2), cz = -0.75 + (k % 3) * 0.75;
          const sz = 0.28 + 0.55 * u;
          out.fx.push({ key: `gas${k % 4}`, cw: 256, ch: 256, draw: (p) => fxGas(p, k % 4), soft: true, x: cx, y: 0.98 + 0.9 * u, z: cz, w: sz, h: sz * 0.9 });
        }
        break;
      }
      case "s12_scuttle": {
        RAFTS.forEach(([x, z], i) => {
          const y = waveY(OCEAN, 0, x, z, t) + 0.1;
          for (let k = 0; k < 2; k++) {
            const o = V(x + (k ? 0.45 : -0.45), y, z + (k ? 0.2 : -0.1));
            out.places.push(person(cam, 10 + i * 2 + k, k ? CREW : i === 0 && !k ? CAPTAIN : CREW, `raft${i}${k}`, o.x, o.y, o.z, { mode: "stand", expr: (["worried", "deadpan", "nervous"] as Expr[])[(i + k) % 3], seed: 10 + i + k }, 1, { ground: false, name: `raft${i}${k}` }));
          }
        });
        for (let k = 0; k < 6; k++) puff(-1 + Math.sin(k * 2) * 2.4, 0.4 + (k % 2) * 0.3, -8 + k * 3.2, 2.4, k);
        break;
      }
      case "s13_drip": {
        const d = this.rim(this.wheel.low, -1), u = ((t * 0.9) % 1);
        out.fx.push({ key: "drop", cw: 128, ch: 192, draw: fxDrop, x: d.x + 0.02, y: d.y - 0.12 - 0.5 * u * u, z: d.z + 0.03, w: 0.045, h: 0.07 });
        break;
      }
      case "s14_deadpan": {
        const u = ((t * 0.5) % 1);
        out.fx.push({ key: "bubble", cw: 160, ch: 160, draw: fxBubbleRing, x: TOILET14[0] + 0.05, y: TOILET14[1] + 0.75 + 0.9 * u, z: TOILET14[2], w: 0.12, h: 0.12 });
        break;
      }
    }
    return out;
  }
}
