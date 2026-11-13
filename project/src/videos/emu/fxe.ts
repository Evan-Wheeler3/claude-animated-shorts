// Drawings for the Emu War: the emus (side / front cards on the 600 x 1000 character canvas, soles at y = 975),
// pigeons, plywood targets, thought bubbles, brass, coins, and the painted textures of the wheat country.
import { Pen, INK, mix, shade } from "./toon";
type P2 = [number, number];
type G = CanvasRenderingContext2D;
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const TWO = Math.PI * 2;
export const EMU = { body: "#6f5c4a", dark: "#4d4036", neck: "#7d95ae", cap: "#35302e", beak: "#3a3838", leg: "#8d8672", eye: "#f08a24" };
const curve3 = (a: P2, b: P2, c: P2, d: P2, n = 16): P2[] => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, s = 1 - t;
  return [s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0], s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1]] as P2;
});
/** shaggy feather lump: an ellipse whose lower half ends in soft points */
const shag = (cx: number, cy: number, rx: number, ry: number, seed: number, n = 44): P2[] => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * TWO, low = Math.max(0, Math.sin(a)), k = 1 + (i % 2 ? 0.11 : -0.02) * low + 0.03 * Math.sin(a * 5 + seed);
  return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)] as P2;
});
export type EmuExpr = "neutral" | "smug" | "alarm" | "shut";
export type EmuOpts = { phase?: number; run?: number; pose?: "walk" | "stand" | "eat" | "look"; expr?: EmuExpr; hat?: boolean; seed?: number; chew?: number };
const eye = (p: Pen, x: number, y: number, r: number, expr: EmuExpr, side = 1) => {
  if (expr === "shut") { p.arc(x, y, r, r * 0.5, 20, 160, 5); return; }
  p.ell(x, y, r, r, EMU.eye, 4);
  p.dot(x + side * r * 0.15, y + (expr === "alarm" ? 0 : r * 0.15), r * (expr === "alarm" ? 0.3 : 0.45));
  if (expr !== "alarm") p.poly([[x - r - 3, y - r - 3], [x + r + 3, y - r - 3], [x + r + 3, y - r * (expr === "smug" ? -0.05 : 0.25)], [x - r - 3, y - r * (expr === "smug" ? 0.3 : 0.25)]], EMU.cap, 0);
  if (expr !== "alarm") p.stroke([[x - r - 3, y - r * (expr === "smug" ? 0.3 : 0.25)], [x + r + 3, y - r * (expr === "smug" ? -0.05 : 0.25)]], 5);
};
const hatOnEmu = (p: Pen, x: number, y: number, s = 1) => {
  p.ell(x, y, 78 * s, 13 * s, "#7a6c40", 6);
  p.poly([[x - 44 * s, y - 2 * s], [x - 36 * s, y - 50 * s], [x, y - 42 * s], [x + 36 * s, y - 50 * s], [x + 44 * s, y - 2 * s]], "#8a7a4a", 6);
  p.stroke([[x - 44 * s, y - 10 * s], [x + 44 * s, y - 10 * s]], 7 * s, "#544a2a");
};
/** emu in profile, facing screen-right; phase = step cycle, run 0..1 = stroll .. flat out */
export const emuSide = (p: Pen, o: EmuOpts) => {
  const { phase = 0, run = 0, pose = "walk", expr = "neutral", seed = 1, chew = 0 } = o;
  const moving = pose === "walk", S = moving ? 62 + 120 * run : 0, L = moving ? 46 + 60 * run : 0;
  const bob = moving ? (6 + 10 * run) * Math.cos(2 * TWO * phase) : 0, by = 560 + bob, lean = moving ? 0.1 * run : 0;
  // legs: hip under the body, a backward-bending ankle joint, three toes
  for (const [ph, col, dx] of [[0.5, shade(EMU.leg, 0.78), -14], [0, EMU.leg, 10]] as const) {
    const c = (((phase + ph) % 1) + 1) % 1, st = c < 0.5, s = st ? c / 0.5 : (c - 0.5) / 0.5;
    const fx = 300 + dx + (st ? S / 2 - S * s : -S / 2 + S * s) * (moving ? 1 : 0), fy = 975 - (st ? 0 : L * Math.sin(Math.PI * s));
    const hip: P2 = [292 + dx, by + 70], knee: P2 = [(hip[0] + fx) / 2 - 34 - 10 * run, (hip[1] + fy) / 2 + 10];
    p.stroke([hip, knee, [fx, fy - 6]], 24, INK); p.stroke([hip, knee, [fx, fy - 6]], 15, col);
    for (const t of [-14, 6, 26]) { p.stroke([[fx, fy - 6], [fx + 34 + t * 0.4, fy - 2 + Math.abs(t) * 0.12]], 13, INK); p.stroke([[fx, fy - 6], [fx + 34 + t * 0.4, fy - 2 + Math.abs(t) * 0.12]], 6, col); }
  }
  // tail droop + body
  p.poly([[150, by - 10], [84, by + 90], [130, by + 100], [190, by + 60]], EMU.dark, 9);
  const body = shag(285 + 20 * lean * 10, by, 168, 116, seed);
  p.poly(body, EMU.body, 10);
  p.clip(body, () => { p.ell(300, by + 80, 190, 70, EMU.dark, 0); for (let i = 0; i < 7; i++) p.stroke([[180 + i * 34, by - 60 + 10 * rnd(seed, i)], [168 + i * 34, by + 20 + 16 * rnd(seed, i + 9)]], 5, EMU.dark); });
  p.poly(body, null, 10);
  // neck + head
  let head: P2, pts: P2[];
  const nb: P2 = [405, by - 50];
  if (pose === "eat") { head = [560, 880 + 26 * Math.sin(chew * TWO)]; pts = curve3(nb, [520, by + 10], [585, 700], [head[0] - 6, head[1] - 30]); }
  else {
    const hb = moving ? 16 * Math.sin(2 * TWO * phase + 0.6) : 0;
    head = [462 + 70 * run + hb, 222 + 70 * run + bob * 0.4];
    pts = curve3(nb, [470 + 30 * run, by - 150], [410 + 60 * run, 380 + 40 * run], [head[0] - 6, head[1] + 30]);
  }
  p.stroke(pts, 46, INK); p.stroke(pts, 30, EMU.neck);
  p.poly(shag(nb[0] - 4, nb[1] + 14, 46, 40, seed + 3, 20), EMU.body, 8);
  const [hx, hy] = head, down = pose === "eat";
  if (pose === "look") {
    p.ell(hx, hy, 50, 42, EMU.neck, 9);
    p.ell(hx, hy - 24, 44, 22, EMU.cap, 7, 180, 360);
    p.poly([[hx - 15, hy + 6], [hx, hy + 40], [hx + 15, hy + 6], [hx, hy - 2]], EMU.beak, 6);
    eye(p, hx - 22, hy - 6, 12, expr, 1); eye(p, hx + 22, hy - 6, 12, expr, -1);
  } else {
    const ba = down ? rad(62) : rad(12), bl = 62;
    p.poly([[hx + 30 * Math.cos(ba - 0.5), hy + 30 * Math.sin(ba - 0.5)], [hx + (40 + bl) * Math.cos(ba), hy + (40 + bl) * Math.sin(ba)], [hx + 30 * Math.cos(ba + 0.6), hy + 30 * Math.sin(ba + 0.6)]], EMU.beak, 7);
    p.ell(hx, hy, 48, 39, EMU.neck, 9);
    p.ell(hx - 4, hy - 20, 44, 22, EMU.cap, 7, 180, 360);
    eye(p, hx + 14, hy - 4, 12, expr, 1);
  }
  if (o.hat) hatOnEmu(p, hx, hy - 34);
};
/** emu facing the lens */
export const emuFront = (p: Pen, o: EmuOpts) => {
  const { phase = 0, pose = "stand", expr = "neutral", seed = 1 } = o;
  const walk = pose === "walk", bob = walk ? 12 * Math.cos(2 * TWO * phase) : 0, by = 610 + bob;
  for (const [s, ph] of [[-1, 0], [1, 0.5]] as const) {
    const up = walk ? Math.max(0, Math.sin(TWO * (phase + ph))) * 60 : 0, fx = 300 + s * 50, fy = 975 - up;
    p.stroke([[300 + s * 40, by + 110], [fx + s * 6, (by + 110 + fy) / 2], [fx, fy - 6]], 24, INK); p.stroke([[300 + s * 40, by + 110], [fx + s * 6, (by + 110 + fy) / 2], [fx, fy - 6]], 15, EMU.leg);
    for (const t of [-1, 0, 1]) { p.stroke([[fx, fy - 6], [fx + t * 26, fy + 2]], 13, INK); p.stroke([[fx, fy - 6], [fx + t * 26, fy + 2]], 6, EMU.leg); }
  }
  const body = shag(300, by, 138, 150, seed, 40);
  p.poly(body, EMU.body, 10);
  p.clip(body, () => { p.ell(300, by + 110, 170, 80, EMU.dark, 0); for (let i = 0; i < 6; i++) p.stroke([[220 + i * 32, by - 70], [214 + i * 32, by + 30 + 20 * rnd(seed, i)]], 5, EMU.dark); });
  p.poly(body, null, 10);
  const tilt = 14 * Math.sin(seed * 3.1), hx = 300 + tilt + (walk ? 8 * Math.sin(TWO * phase) : 0), hy = 232 + bob * 0.5;
  const pts = curve3([300, by - 120], [300 - tilt, by - 220], [300 + tilt * 2, 380], [hx, hy + 30]);
  p.stroke(pts, 46, INK); p.stroke(pts, 30, EMU.neck);
  p.poly(shag(300, by - 118, 50, 40, seed + 3, 20), EMU.body, 8);
  p.ell(hx, hy, 52, 44, EMU.neck, 9);
  p.ell(hx, hy - 24, 46, 24, EMU.cap, 7, 180, 360);
  p.stroke([[hx - 8, hy - 50], [hx - 14, hy - 70]], 6); p.stroke([[hx + 6, hy - 50], [hx + 10, hy - 74]], 6);
  p.poly([[hx - 16, hy + 6], [hx, hy + 44], [hx + 16, hy + 6], [hx, hy - 2]], EMU.beak, 6);
  eye(p, hx - 23, hy - 6, 13, expr, 1); eye(p, hx + 23, hy - 6, 13, expr, -1);
  if (o.hat) hatOnEmu(p, hx, hy - 36, 1.05);
};

// ---------------- pigeons, targets (character canvas), small props ----------------
export const fxPigeon = (p: Pen, pose: "peck" | "stand" | "up" | "down") => {
  const B = "#8f98a8", D = "#5f6878";
  if (pose === "up" || pose === "down") {
    const d = pose === "up" ? -1 : 1;
    p.poly([[100, 100], [40, 100 + d * 56], [20, 100 + d * 44], [76, 90]], D, 6); p.poly([[100, 100], [160, 100 + d * 56], [180, 100 + d * 44], [124, 90]], D, 6);
    p.ell(100, 104, 34, 20, B, 6); p.ell(134, 92, 16, 15, B, 6); p.poly([[148, 90], [166, 96], [148, 100]], "#f2a73b", 4); p.dot(138, 90, 3);
    return;
  }
  for (const s of [-1, 1]) p.stroke([[100 + s * 8, 150], [100 + s * 10, 186]], 5, "#d9675a");
  p.ell(96, 128, 46, 30, B, 7); p.poly([[60, 120], [24, 138], [58, 142]], D, 6);
  p.poly([[78, 116], [128, 112], [134, 140], [90, 146]], D, 5);
  const [hx, hy] = pose === "peck" ? [150, 158] : [140, 92];
  p.stroke([[128, 118], [hx - 4, hy + (pose === "peck" ? -14 : 14)]], 22, INK); p.stroke([[128, 118], [hx - 4, hy + (pose === "peck" ? -14 : 14)]], 13, "#6fa58c");
  p.ell(hx, hy, 17, 16, B, 6); p.poly(pose === "peck" ? [[hx + 6, hy + 12], [hx + 14, hy + 30], [hx - 2, hy + 14]] : [[hx + 14, hy - 2], [hx + 32, hy + 4], [hx + 14, hy + 8]], "#f2a73b", 4);
  p.dot(hx + 5, hy - 3, 3.2);
};
/** plywood soldier target on a stake (character canvas) */
export const fxTarget = (p: Pen, seed: number) => {
  p.poly([[285, 975], [315, 975], [312, 560], [288, 560]], "#8a5a34", 9);
  const pts: P2[] = [[190, 720], [190, 420], [236, 360], [236, 300], [364, 300], [364, 360], [410, 420], [410, 720]];
  p.poly(pts, "#c9a36a", 11);
  p.ell(300, 250, 78, 78, "#c9a36a", 11);
  p.clip(pts, () => { for (let i = 0; i < 5; i++) p.stroke([[190, 440 + i * 60 + 8 * rnd(seed, i)], [410, 446 + i * 60]], 3, "#a8824e"); });
  for (const [r, c] of [[70, "#f7f5ee"], [48, "#d63a2f"], [24, "#f7f5ee"]] as const) p.ell(300, 540, r, r, c, 5);
};
export const fxCasing = (p: Pen) => { p.poly([[30, 20], [70, 20], [72, 150], [28, 150]], "#e0b84a", 7); p.poly([[24, 150], [76, 150], [76, 176], [24, 176]], "#c99a34", 7); p.stroke([[40, 36], [40, 130]], 6, "#f7e08a"); };
export const fxCoin = (p: Pen) => { p.ell(50, 50, 40, 40, "#f2c94c", 7); p.ell(50, 50, 26, 26, "#e0b030", 4); p.ell(38, 38, 9, 6, "#fff3b0", 0, 0, 360, -30); };
export const fxFeatherE = (p: Pen) => { p.poly([[40, 150], [80, 70], [150, 30], [140, 96], [84, 156]], EMU.body, 7); p.stroke([[36, 164], [146, 40]], 4); };
export const fxSmokeRing = (p: Pen, t: number) => { for (let i = 0; i < 4; i++) { const a = rad(200 + i * 40), d = 30 + 90 * t; p.ell(150 + d * Math.cos(a), 220 + d * Math.sin(a) - 60 * t, 40 * (1 - 0.3 * t), 34 * (1 - 0.3 * t), "#5b5b66", 6); } };
/** tracer, pointing +x (400 x 60) */
export const fxTracer = (p: Pen) => p.poly([[10, 30], [330, 20], [392, 30], [330, 40]], "#ffe066", 5);
/** ricochet spark (200 x 200) */
export const fxPing = (p: Pen, t: number) => { for (let i = 0; i < 6; i++) { const a = rad(i * 60 + 20), r0 = 20 + 40 * t, r1 = 50 + 60 * t; p.stroke([[100 + r0 * Math.cos(a), 100 + r0 * Math.sin(a)], [100 + r1 * Math.cos(a), 100 + r1 * Math.sin(a)]], 9 * (1 - t) + 3, "#ffd84a"); } if (t < 0.5) p.ell(100, 100, 16, 16, "#ffffff", 5); };

// ---------------- thought bubbles (700 x 600) ----------------
const lewis = (p: Pen, cx: number, cy: number, s: number) => {
  p.poly([[cx - 190 * s, cy - 22 * s], [cx + 60 * s, cy - 22 * s], [cx + 60 * s, cy + 22 * s], [cx - 190 * s, cy + 22 * s]], "#5b6170", 8 * s); // cooling shroud
  p.poly([[cx - 210 * s, cy - 8 * s], [cx - 190 * s, cy - 8 * s], [cx - 190 * s, cy + 8 * s], [cx - 210 * s, cy + 8 * s]], "#2a2a31", 6 * s);
  p.poly([[cx + 60 * s, cy - 16 * s], [cx + 130 * s, cy - 16 * s], [cx + 130 * s, cy + 20 * s], [cx + 60 * s, cy + 20 * s]], "#3a3d47", 8 * s);
  p.poly([[cx + 130 * s, cy - 10 * s], [cx + 220 * s, cy + 6 * s], [cx + 220 * s, cy + 50 * s], [cx + 130 * s, cy + 20 * s]], "#8a5a34", 8 * s); // stock
  p.ell(cx + 70 * s, cy - 30 * s, 62 * s, 16 * s, "#3a3d47", 8 * s); // pan magazine
  p.stroke([[cx - 120 * s, cy + 22 * s], [cx - 160 * s, cy + 100 * s]], 9 * s); p.stroke([[cx - 120 * s, cy + 22 * s], [cx - 84 * s, cy + 100 * s]], 9 * s);
  p.stroke([[cx + 96 * s, cy + 20 * s], [cx + 100 * s, cy + 52 * s]], 9 * s);
};
export const fxBubbleE = (p: Pen, kind: "gun" | "tank") => {
  p.ell(96, 560, 20, 16, "#ffffff", 8); p.ell(150, 500, 34, 26, "#ffffff", 9);
  const cl: P2[] = [];
  for (let i = 0; i < 60; i++) { const a = (i / 60) * TWO, k = 1 + 0.07 * Math.abs(Math.sin(a * 5)); cl.push([370 + 300 * k * Math.cos(a), 250 + 210 * k * Math.sin(a)]); }
  p.poly(cl, "#ffffff", 10);
  if (kind === "gun") { lewis(p, 370, 240, 1.0); for (let i = 0; i < 3; i++) p.stroke([[110 - i * 0, 220 + i * 20], [70, 214 + i * 26]], 7, "#ffb02a"); }
  else {
    // an emu as a tank: riveted hull on tracks, the neck as a turret
    p.poly([[190, 330], [560, 330], [590, 380], [560, 420], [190, 420], [160, 380]], "#3a3d47", 9);
    for (let i = 0; i < 6; i++) p.ell(210 + i * 66, 378, 24, 24, "#8d949c", 6);
    p.poly([[210, 230], [520, 230], [550, 330], [180, 330]], "#6b7a4a", 9);
    for (let i = 0; i < 6; i++) p.dot(230 + i * 54, 250, 6);
    const pts = curve3([420, 230], [470, 150], [420, 110], [455, 70]); p.stroke(pts, 44, INK); p.stroke(pts, 28, EMU.neck);
    p.ell(458, 62, 44, 36, EMU.neck, 8); p.ell(455, 44, 40, 20, EMU.cap, 6, 180, 360);
    p.poly([[494, 54], [556, 64], [494, 76]], EMU.beak, 6); eye(p, 470, 58, 11, "smug", 1);
  }
};

// ---------------- painted textures ----------------
const ink = (g: G, w: number) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };
/** a clump of ripe wheat (256 x 256): a solid golden mass (so small, far clumps keep their colour) with heads on top */
export const wheatTex = (g: G, r: () => number) => {
  g.clearRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 96, 0, 256); gr.addColorStop(0, "#edc552"); gr.addColorStop(1, "#dcae3c");
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 256);
  for (let i = 0; i <= 16; i++) g.lineTo(i * 16, 104 + (i % 2 ? 0 : 22) + r() * 10);
  g.lineTo(256, 256); g.closePath(); g.fill();
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) { const x = 6 + i * 9.6 + (r() - 0.5) * 6; g.strokeStyle = i % 2 ? "rgba(248,220,130,0.9)" : "rgba(200,150,50,0.6)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x, 180, x + (r() - 0.5) * 20, 112); g.stroke(); }
  for (let i = 0; i < 10; i++) {
    const tx = 16 + i * 25 + (r() - 0.5) * 10, ty = 40 + r() * 40;
    g.strokeStyle = "#d9a93a"; g.lineWidth = 10; g.beginPath(); g.moveTo(tx, 130); g.lineTo(tx, ty + 40); g.stroke();
    g.save(); g.translate(tx, ty + 22); g.rotate((r() - 0.5) * 0.6);
    g.beginPath(); g.ellipse(0, 0, 12, 30, 0, 0, TWO); g.fillStyle = ["#f5d368", "#eec650", "#fbe08a"][i % 3]; g.fill(); g.strokeStyle = "#9a7420"; g.lineWidth = 4; g.stroke();
    g.lineWidth = 2.5; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-9, k * 10); g.lineTo(9, k * 10 - 6); g.stroke(); }
    g.restore();
  }
};
const boards = (g: G, w: number, h: number, n: number, base: string, r: () => number, vert = false) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(base, 0.9 + 0.2 * r());
    if (vert) g.fillRect((i * w) / n, 0, w / n, h); else g.fillRect(0, (i * h) / n, w, h / n);
    g.fillStyle = "rgba(40,26,20,0.8)";
    if (vert) g.fillRect((i * w) / n - 2, 0, 4, h); else g.fillRect(0, (i * h) / n - 2, w, 4);
  }
};
export const ammoTex = (g: G, r: () => number) => {
  boards(g, 512, 320, 4, "#6f7a4a", r); ink(g, 14); g.strokeRect(7, 7, 498, 306);
  g.fillStyle = "#f4f1e0"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 110px Arial Black, Arial, sans-serif"; g.fillText("AMMO", 256, 135);
  g.font = "900 60px Arial Black, Arial, sans-serif"; g.fillText(".303", 256, 240);
};
export const ammoTop = (g: G, r: () => number) => { boards(g, 256, 256, 3, "#667043", r); ink(g, 12); g.strokeRect(6, 6, 244, 244); };
export const wallTex = (g: G, r: () => number) => boards(g, 512, 512, 9, "#e9dcc0", r);
export const ironTex = (g: G, r: () => number) => boards(g, 512, 256, 16, "#b0544a", r, true);
export const postTex = (g: G, r: () => number) => boards(g, 128, 256, 3, "#9a8266", r, true);
/** the bounty office front (1024 x 1024 = 5 m square): the sign right over a counter window, so both fit a vertical frame */
export const bountyTex = (g: G, r: () => number) => {
  boards(g, 1024, 1024, 14, "#d9c9a4", r);
  g.fillStyle = "#2f5f4a"; g.fillRect(150, 70, 724, 250); ink(g, 16); g.strokeRect(150, 70, 724, 250);
  g.fillStyle = "#f7f0d0"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 130px Arial Black, Arial, sans-serif"; g.fillText("EMU", 512, 140); g.fillText("BOUNTY", 512, 252);
  g.fillStyle = "#3a302a"; g.fillRect(300, 410, 424, 330); ink(g, 18); g.strokeRect(300, 410, 424, 330);
  g.fillStyle = "#8a6a4a"; g.fillRect(270, 740, 484, 44); ink(g, 12); g.strokeRect(270, 740, 484, 44);
};
/** dirt road ruts / dry earth cracks (512 x 512) */
export const earthTex = (g: G, r: () => number) => {
  g.fillStyle = "#ead3a8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,205,0.45)" : "rgba(170,120,80,0.28)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 8 + r() * 22, (r() - 0.5) * 0.6, 0, TWO); g.fill(); }
  g.strokeStyle = "rgba(120,80,56,0.5)"; g.lineWidth = 3; g.lineCap = "round";
  for (let i = 0; i < 34; i++) { const x = r() * 512, y = r() * 512, l = 20 + r() * 60; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6 - r() * 6, x + l, y + (r() - 0.5) * 8); g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = r() < 0.5 ? "#9a7a5a" : "#fff0d0"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, TWO); g.fill(); }
};
/** scrub bush (256 x 256) */
export const scrubTex = (g: G, r: () => number) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 9; i++) {
    const x = 128 + (r() - 0.5) * 150, y = 150 + (r() - 0.5) * 90, rr = 34 + r() * 30;
    g.beginPath(); for (let k = 0; k <= 16; k++) { const a = (k / 16) * TWO, q = rr * (1 + 0.18 * Math.sin(k * 2.7 + i)); g.lineTo(x + q * Math.cos(a), y + q * 0.8 * Math.sin(a)); }
    g.closePath(); g.fillStyle = ["#7f9a5a", "#93a868", "#6f8a50"][i % 3]; g.fill(); ink(g, 5); g.stroke();
  }
  g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(128, 256); g.lineTo(128, 200); g.stroke();
};
