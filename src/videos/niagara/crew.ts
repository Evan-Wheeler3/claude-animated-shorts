// Who stands where in each Niagara shot and what their faces do, timed to the narration (story.ts W / F).
// Standing cards get x/z only: pipeline/cast.ts CardStage snaps soles and contact shadows onto the real ground.
// Contacts with props use ATTACHMENT points from the resolved prop positions (Anchors, set by world.ts).
import * as THREE from "three";
import { ANNIE, RIVERMAN, townsfolk, fxStars, fxRing, fxSplash, fxPeek, fxBubble, fxCoin, Expr, FrontOpts, Outfit } from "../../pipeline/toon";
import { spray } from "../../pipeline/effects";
import { person, catCard, blob, toCard, ringGrips, lidAt, q, CAT_SU, Stage, CamInfo, Place } from "../../pipeline/cast";
import { SU, GlowLevel } from "../../pipeline/actors";
import { SHOTS, ANNIE_BANK, F, W, FPS, HAMMER_HITS, IMPACT_F, LID_POP_F, smooth, clamp01, POOL_Y } from "./story";
import { BARREL, barrelR } from "../../../assets/props/holdup-props.js";

/** resolved world positions of props the cast touches (barrel base centres after resting), the moving barrel centre */
export type Anchors = { dock: THREE.Vector3; shore: THREE.Vector3; rescue: THREE.Vector3; brink: THREE.Vector3; river: THREE.Vector3; impact: THREE.Vector3 };
/** Annie is ~1.58 m (the stout 3.5-head build at 0.95) next to the 1.37 m barrel */
export const ANNIE_SCALE = 0.95;
/** main-character glow (owner-approved option 2 = "subtle"); inputProps { glow } overrides for comparisons */
export const CAST_GLOW: { annie: GlowLevel } = { annie: "subtle" };
const HURT: Outfit = { ...ANNIE, plaster: true };
const STRAPPED: Outfit = { ...ANNIE, harness: "#5a3b2a" };
const L = 2; // reactions land 2 frames before their word

export const stage = (id: number, t: number, cam: CamInfo, an: Anchors): Stage => {
  const out: Stage = { places: [], fx: [] }, s = SHOTS[id - 1], f = Math.round(t * FPS);
  const before = (sec: number) => f < F(sec) - L;
  const shoreY = an.rescue.y;
  const A = (x: number, z: number, fo: FrontOpts, extra: Partial<Place> = {}, o: Outfit = ANNIE) =>
    out.places.push(person(cam, 1, o, "annie", x, 0, z, { seed: 3, blink: lidAt(t, 1), ...fo }, ANNIE_SCALE, { name: "Annie", glow: CAST_GLOW.annie, ...extra }));
  const extra = (i: number, o: Outfit, key: string, x: number, z: number, fo: FrontOpts) => {
    out.places.push(person(cam, i, o, key, x, 0, z, { blink: lidAt(t, i), ...fo }, 1, { name: key }));
    blob(cam, out, x, z);
  };
  /** Annie standing in an open barrel at base b: card in the axis plane 6 cm toward the lens, hands on the rim */
  const inBarrel = (b: THREE.Vector3, lift: number, fo: FrontOpts, o: Outfit = ANNIE, grip = true) => {
    const toward = cam.pos.clone().sub(b).setY(0).normalize().multiplyScalar(0.06), cx = b.x + toward.x, cz = b.z + toward.z, cy = b.y + lift;
    const rim = new THREE.Vector3(b.x, b.y + BARREL.H + 0.005, b.z), [gl, gr] = ringGrips(cam.pos, rim, barrelR(BARREL.H) + 0.004);
    const hands: [[number, number], [number, number]] = [toCard(cam.pos, cx, cy, cz, ANNIE_SCALE, gl, SU), toCard(cam.pos, cx, cy, cz, ANNIE_SCALE, gr, SU)];
    A(cx, cz, { mode: "stand", ...(grip ? { pose: "grip", hands } : {}), ...fo }, { ground: false }, o);
    out.places[out.places.length - 1].y = cy;
    return { cx, cy, cz };
  };
  const rings = (c: THREE.Vector3, size = 2.6) => {
    for (let k = 0; k < 3; k++) { const u = (t * 0.7 + k / 3) % 1; out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x: c.x, y: c.y - 0.2, z: c.z, w: size, h: size, flat: true }); }
  };
  const puffs = (c: THREE.Vector3, n: number, r0: number, sz: number, dy = 0) => {
    for (let k = 0; k < n; k++) {
      const a = k * 1.05 + 0.3, u = (t * 0.9 + k / n) % 1, r = r0 * (0.5 + 0.9 * u);
      out.fx.push({ key: `spray${k % 3}`, cw: 256, ch: 256, draw: (p) => spray(p, k % 3), soft: true, x: c.x + Math.cos(a) * r, y: c.y + dy + 0.4 * u, z: c.z + Math.sin(a) * r, w: sz * (0.6 + 0.6 * u), h: sz * (0.6 + 0.6 * u) });
    }
  };
  const dock = an.dock, shore = an.shore, res = an.rescue;
  switch (s.key) {
    case "hook_wide": case "hook_barrel": case "current":
      rings(an.river); if (s.key === "current") puffs(an.river, 4, 0.7, 0.5, -0.35);
      break;
    case "barrel_cu": {
      rings(an.river, 2.2);
      // stylised cutaway: Annie's worried eyes peeking out of the staves (cartoon device, not a real window)
      const toward = cam.pos.clone().sub(an.river).setY(0).normalize(), lid = lidAt(t, 1) >= 1 ? 1 : 0;
      out.fx.push({ key: `peek${lid}`, cw: 400, ch: 400, draw: (p) => fxPeek(p, true, lid), x: an.river.x + toward.x * 0.5, y: an.river.y + 0.2, z: an.river.z + toward.z * 0.5, w: 0.46, h: 0.46 });
      break;
    }
    case "annie": {
      const plan = !before(W.plan);
      A(ANNIE_BANK[0], ANNIE_BANK[2], { mode: "stand", expr: plan ? "hopeful" : "determined", pose: plan ? "point" : "hips" });
      blob(cam, out, ANNIE_BANK[0], ANNIE_BANK[2], ANNIE_SCALE);
      if (plan) { // the plan: a thought bubble full of gold pops up beside her head
        const k = smooth((f - (F(W.plan) - L)) / 7), right = cam.right;
        out.fx.push({ key: `bubble${q(k, 20)}`, cw: 500, ch: 420, draw: (p) => fxBubble(p, q(k, 20)), x: ANNIE_BANK[0] - right.x * 0.16, y: ANNIE_BANK[1] + 1.86, z: ANNIE_BANK[2] - right.z * 0.16, w: 0.48, h: 0.4 });
      }
      for (const [i, dx, dz] of [[0, 1.4, 9], [3, 0.4, 14.5], [4, 1.6, -11]] as const)
        extra(20 + i, townsfolk(i), `f${i}`, ANNIE_BANK[0] + dx, ANNIE_BANK[2] + dz, { mode: "stand", expr: (["smile", "grin", "neutral"] as Expr[])[i % 3] });
      break;
    }
    case "cat_in":
      // the cat goes in first: peeking over the rim of the open barrel; Annie delighted; the riverman amused
      out.places.push(catCard(cam, dock.x, dock.y + BARREL.H - 0.3, dock.z + 0.04, { expr: before(W.cat) ? "alarm" : "indignant", pose: "sit", wet: false, blink: lidAt(t, 5) > 0.5 ? 1 : 0 }, { ground: false, name: "cat" }));
      A(dock.x - 0.88, dock.z - 0.1, { mode: "stand", expr: "hopeful", pose: "clasp" });
      blob(cam, out, dock.x - 0.88, dock.z - 0.1, ANNIE_SCALE);
      extra(31, RIVERMAN[0], "rm0", dock.x + 0.95, dock.z - 0.4, { mode: "stand", expr: "grin", pose: "shrug", seed: 4 });
      break;
    case "cat_alive":
      out.places.push(catCard(cam, shore.x, shore.y + BARREL.H - (575 - 470) * CAT_SU, shore.z + 0.06, { expr: "indignant", pose: "perch", wet: true, blink: lidAt(t, 5) > 0.5 ? 1 : 0 }, { ground: false, name: "cat" }));
      A(shore.x - 0.88, shore.z - 0.1, { mode: "stand", expr: before(W.alive) ? "worried" : "hopeful", pose: before(W.alive) ? "clasp" : "up" });
      blob(cam, out, shore.x - 0.88, shore.z - 0.1, ANNIE_SCALE);
      extra(31, RIVERMAN[0], "rm0", shore.x + 1.0, shore.z - 0.45, { mode: "stand", expr: "laugh", pose: "shrug", seed: 4 });
      break;
    case "climb": {
      const k = smooth((f - (F(W.climbed) - 4)) / 12); // she steps down in onto the cushions
      inBarrel(dock, 0.78 - 0.28 * k, { expr: "determined" });
      extra(31, RIVERMAN[0], "rm0", dock.x + 1.0, dock.z - 0.45, { mode: "stand", expr: "nervous", pose: "clasp", seed: 4 });
      break;
    }
    case "strap":
      inBarrel(dock, 0.5, { expr: before(15.0) ? "determined" : "worried", pose: "clasp" }, STRAPPED, false);
      break;
    case "seal": {
      // the riverman taps the lid fastener home: hammer up before each hit, struck on the hit (bridge hammer timing)
      const k = HAMMER_HITS.reduce((m, h) => { const n = f - h; return n >= -9 && n < -4 ? Math.min(m, 1 - smooth((n + 9) / 5)) : n >= -4 && n < 0 ? 0 : m; }, 1);
      // ATTACHMENT: the struck hand lands on the lid's near edge (seen from this camera); raised = above his shoulder
      const rx = dock.x + 0.38, rz = dock.z - 0.74, ry = dock.y, lidEdge = new THREE.Vector3(dock.x, dock.y + BARREL.H + 0.04, dock.z).addScaledVector(new THREE.Vector3(rx - dock.x, 0, rz - dock.z).normalize(), barrelR(BARREL.H) * 0.6);
      const struck = toCard(cam.pos, rx, ry, rz, 1, lidEdge.clone().add(new THREE.Vector3(0, 0.1, 0)), SU), raised: [number, number] = [struck[0] - 40, struck[1] - 230];
      const hand: [number, number] = [raised[0] + (struck[0] - raised[0]) * k, raised[1] + (struck[1] - raised[1]) * k];
      extra(31, RIVERMAN[0], "rm0", rx, rz, { mode: "stand", expr: "stern", prop: ["hammer", k], hands: [null, hand], seed: 4 });
      for (const h of HAMMER_HITS) if (f >= h && f < h + 5) {
        const u = (f - h) / 5;
        out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: dock.x + 0.15, y: dock.y + BARREL.H + 0.12, z: dock.z - 0.1, w: 0.5, h: 0.25 });
      }
      break;
    }
    case "brink":
      puffs(an.river, 6, 0.9, 0.7, -0.5);
      break;
    case "drop":
      if (f < IMPACT_F) puffs(an.river, 4, 0.8, 0.8, 0);
      else { // the plunge: a splash crown and a burst of spray where the barrel went in
        const u = clamp01((f - IMPACT_F) / 18), c = an.impact;
        out.fx.push({ key: `splash${q(u, 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 30)), x: c.x, y: POOL_Y + 3.2, z: c.z, w: 9, h: 9 });
        for (let k = 0; k < 8; k++) { const a = k * 0.8, r = 1.5 + 5 * u; out.fx.push({ key: `spray${k % 3}`, cw: 256, ch: 256, draw: (p) => spray(p, k % 3), soft: true, x: c.x + Math.cos(a) * r, y: POOL_Y + 1 + 6 * u * (0.6 + 0.4 * Math.sin(k)), z: c.z + Math.sin(a) * r * 0.5, w: 2.5 + 3 * u, h: 2.5 + 3 * u }); }
      }
      break;
    case "rescue_open": {
      // the rivermen pry the lid off (it pops on "opened", world.ts animates it); Annie is still inside
      const k = f < LID_POP_F - 10 ? 0.4 + 0.3 * Math.sin(f * 0.6) : f < LID_POP_F ? 0.1 : 1;
      extra(32, RIVERMAN[1], "rm1", res.x + 0.75, res.z - 0.2, { mode: "stand", expr: f < LID_POP_F ? "stern" : "shock", prop: ["hammer", k], seed: 6 });
      extra(33, RIVERMAN[2], "rm2", res.x - 1.15, res.z - 2.0, { mode: "stand", expr: f < LID_POP_F ? "nervous" : "shock", seed: 2 });
      break;
    }
    case "rescue_alive": {
      // up she pops (overshoot), dazed with stars; on "survived" the daze clears into relief; a plaster on the cut
      const u = clamp01((f - (F(W.annie2) - 6)) / 7), lift = -0.55 + 1.05 * (u < 1 ? Math.sin(u * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) : 1);
      const dazed = before(W.survived);
      const c = inBarrel(res, lift, { expr: dazed ? "dazed" : "relief", headTilt: dazed ? -6 : 0 }, HURT);
      if (dazed && u > 0.5) { const w = (t * 0.8) % 1; out.fx.push({ key: `stars${q(w, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(w, 30)), x: c.cx, y: c.cy + 1.68, z: c.cz + 0.05, w: 0.7, h: 0.35 }); }
      extra(32, RIVERMAN[1], "rm1", res.x + 0.95, res.z - 0.7, { mode: "stand", expr: dazed ? "shock" : "relief", pose: dazed ? "up" : "clasp", seed: 6 });
      extra(33, RIVERMAN[2], "rm2", res.x - 1.15, res.z - 2.0, { mode: "stand", expr: dazed ? "shock" : "relief_open", seed: 2 });
      break;
    }
    case "problem":
      A(res.x + 0.1, res.z + 1.25, { mode: "stand", expr: before(W.problem) ? "relief" : "worried", pose: "clasp" }, {}, HURT);
      blob(cam, out, res.x + 0.1, res.z + 1.25, ANNIE_SCALE);
      break;
    case "fortune":
      A(res.x + 0.1, res.z + 1.25, { mode: "stand", expr: "laugh", pose: "up" }, {}, HURT);
      blob(cam, out, res.x + 0.1, res.z + 1.25, ANNIE_SCALE);
      // imaginary gold rains round her (a loop of falling, spinning coins)
      for (let k = 0; k < 22; k++) {
        const ph = (((t - 29.3) * 0.9 + ((k * 0.37) % 1)) % 1 + 1) % 1, x = res.x + 0.1 + (((k * 0.618) % 1) - 0.5) * 2.0, z = res.z + 1.25 + 0.35 + ((k * 0.41) % 1) * 0.6;
        const y = shoreY + 2.8 - 3.0 * ph * ph, spin = Math.abs(Math.cos((t * 6 + k) * 1.3));
        if (y < shoreY + 0.05) continue;
        out.fx.push({ key: `coin${q(spin, 8)}`, cw: 120, ch: 120, draw: (p) => fxCoin(p, q(spin, 8)), x, y, z, w: 0.13, h: 0.13, rot: k });
      }
      break;
    case "purse": {
      A(res.x + 0.1, res.z + 1.25, { mode: "stand", expr: "deadpan", pose: "purse" }, {}, HURT);
      blob(cam, out, res.x + 0.1, res.z + 1.25, ANNIE_SCALE);
      // one lonely coin drops out of the purse on "money" and lands with a plink (sound: audio)
      const tf = (f - (F(W.money) - L)) / FPS;
      if (tf >= 0) {
        const right = cam.right, x0 = res.x + 0.1 + right.x * 0.2, z0 = res.z + 1.25 + right.z * 0.2 + 0.08, y0 = shoreY + 0.78;
        const tl = Math.sqrt((2 * 0.74) / 9.8), y = tf < tl ? y0 - 4.9 * tf * tf : shoreY + 0.05 + Math.max(0, 0.6 * (tf - tl) - 4.9 * (tf - tl) ** 2);
        const spin = tf < tl + 0.3 ? Math.abs(Math.cos(tf * 9)) : 0.25;
        out.fx.push({ key: `coin${q(spin, 8)}`, cw: 120, ch: 120, draw: (p) => fxCoin(p, q(spin, 8)), x: x0 + 0.1 * Math.min(tf, 0.6), y, z: z0, w: 0.09, h: 0.09 });
      }
      break;
    }
  }
  return out;
};
