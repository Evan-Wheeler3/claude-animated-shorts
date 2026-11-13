// Drawings for "The Trojan Horse": effect / explainer cards (Pen) and painted textures.
import { Pen, INK, shade } from "./toon";
type P2 = [number, number];
type G = CanvasRenderingContext2D;
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const TWO = Math.PI * 2;
const serif = (g: G, px: number) => { g.font = `900 ${px}px Georgia, 'DejaVu Serif', serif`; g.textAlign = "center"; g.textBaseline = "middle"; };
const label = (g: G, txt: string, x: number, y: number, px: number, fill: string, stroke = INK) => { serif(g, px); g.lineJoin = "round"; g.lineWidth = px * 0.14; g.strokeStyle = stroke; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); };

/** an open scroll seen from above (600 x 360): kind iliad (with a big ? where the horse should be) / end / aeneid */
export const fxScroll = (p: Pen, kind: "iliad" | "end" | "aeneid", u = 1) => {
  const g = p.g, w = 120 + 360 * u;
  p.poly([[300 - w / 2, 40], [300 + w / 2, 40], [300 + w / 2, 320], [300 - w / 2, 320]], "#efe0b8", 6);
  for (const s of [-1, 1]) { p.poly([[300 + s * w / 2 - 22, 24], [300 + s * w / 2 + 22, 24], [300 + s * w / 2 + 22, 336], [300 + s * w / 2 - 22, 336]], "#c9a46a", 6); }
  if (u < 0.6) return;
  label(g, kind === "aeneid" ? "AENEID" : "ILIAD", 300, 84, 46, "#7a2a2a", "#efe0b8");
  if (kind === "iliad") { for (let i = 0; i < 4; i++) p.stroke([[150, 130 + i * 22], [450, 130 + i * 22]], 4, "#a8977a"); p.poly([[200, 220], [400, 220], [400, 300], [200, 300]], "#e2d2a6", 4); label(g, "?", 300, 262, 70, "#c0353a", "#efe0b8"); }
  if (kind === "end") { for (let i = 0; i < 5; i++) p.stroke([[150, 128 + i * 22], [450, 128 + i * 22]], 4, "#a8977a"); label(g, "THE END", 300, 270, 44, "#2a2428", "#efe0b8"); }
  if (kind === "aeneid") { for (let i = 0; i < 3; i++) p.stroke([[150, 128 + i * 22], [450, 128 + i * 22]], 4, "#a8977a"); horseIcon(p, 300, 250, 0.55); }
};
/** a little horse silhouette (for scrolls and signs) */
export const horseIcon = (p: Pen, cx: number, cy: number, s: number) => {
  const pts: P2[] = [[-80, 10], [-60, -30], [40, -34], [60, -60], [90, -90], [110, -80], [96, -50], [70, -26], [70, 30], [60, 30], [56, 0], [-40, 0], [-50, 30], [-60, 30], [-62, 4], [-100, 20]];
  p.poly(pts.map(([x, y]) => [cx + x * s, cy + y * s] as P2), "#a8744a", 5);
};
/** a wooden siege board (360 x 240): "YEAR n" */
export const fxYear = (p: Pen, n: number) => { const g = p.g; p.poly([[10, 10], [350, 10], [350, 230], [10, 230]], "#a8744a", 8); label(g, "YEAR", 180, 70, 50, "#f7ead0"); label(g, String(n), 180, 160, 100, "#ffd84a"); };
/** a sign (300 x 240) with big text */
export const fxBoard = (p: Pen, txt: string, col: string) => { const g = p.g; p.poly([[10, 10], [290, 10], [290, 230], [10, 230]], "#f7f3ea", 8); label(g, txt, 150, 120, txt.length > 4 ? 56 : 110, col, "#f7f3ea"); };
/** a sea serpent, rising (400 x 600), coil = 0..1 */
export const fxSerpent = (p: Pen, coil: number, flip = false) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([200 + (flip ? -1 : 1) * (80 * Math.sin(t * 7 + coil * 3) * (1 - t * 0.4)), 580 - t * 480]); }
  const g = p.g; g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  path(); g.strokeStyle = INK; g.lineWidth = 78; g.stroke(); path(); g.strokeStyle = "#3f8a6a"; g.lineWidth = 64; g.stroke(); path(); g.strokeStyle = "#7fc29a"; g.lineWidth = 20; g.setLineDash([16, 26]); g.stroke(); g.setLineDash([]);
  const [hx, hy] = pts[pts.length - 1];
  p.ell(hx, hy - 10, 56, 40, "#3f8a6a", 9); p.poly([[hx + (flip ? -40 : 40), hy - 4], [hx + (flip ? -90 : 90), hy + 6], [hx + (flip ? -40 : 40), hy + 16]], "#c0353a", 5);
  p.ell(hx + (flip ? -18 : 18), hy - 24, 12, 12, "#ffd84a", 4); p.dot(hx + (flip ? -20 : 20), hy - 24, 5);
};
/** a fish held up (500 x 300); size 0..1 */
export const fxFish = (p: Pen, s: number) => {
  const k = 0.45 + 0.55 * s, cx = 250, cy = 150;
  p.poly([[cx + 200 * k, cy], [cx + 260 * k, cy - 60 * k], [cx + 260 * k, cy + 60 * k]], "#6fa0c8", 7);
  p.ell(cx, cy, 210 * k, 80 * k, "#8fbfe0", 8); p.ell(cx - 150 * k, cy - 18 * k, 14 * k, 14 * k, "#ffffff", 4); p.dot(cx - 150 * k, cy - 18 * k, 6 * k);
  p.arc(cx - 186 * k, cy + 22 * k, 20 * k, 10 * k, 20, 160, 5);
};
/** Poseidon on a horse, rearing (400 x 500) */
export const fxPoseidon = (p: Pen) => {
  horseIcon(p, 200, 360, 1.6);
  p.ell(220, 200, 56, 70, "#7fc2c9", 8); p.ell(220, 120, 44, 44, "#ffe2c2", 7); p.poly([[180, 140], [260, 140], [250, 210], [190, 210]], "#f2f2f2", 6);
  p.dot(206, 116, 6); p.dot(234, 116, 6);
  p.stroke([[300, 40], [300, 300]], 12, "#f2c94c"); for (const dx of [-24, 0, 24]) p.stroke([[300 + dx, 40], [300 + dx, 76]], 10, "#f2c94c"); p.stroke([[276, 76], [324, 76]], 10, "#f2c94c");
  p.stroke([[262, 200], [300, 160]], 18, "#ffe2c2");
};
/** a jagged crack across a card (400 x 120) */
export const fxCrackH = (p: Pen, seed: number) => { const pts: P2[] = []; for (let i = 0; i <= 12; i++) pts.push([10 + i * 32, 60 + 34 * (rnd(seed, i) - 0.5)]); p.stroke(pts, 9); };
/** flying rubble (300 x 300), t 0..1 */
export const fxRubble = (p: Pen, t: number) => { for (let i = 0; i < 10; i++) { const a = rad(200 + i * 16), d = 30 + 150 * t, x = 150 + d * Math.cos(a), y = 230 + d * Math.sin(a) + 160 * t * t, r = 16 * (1 - 0.3 * t); p.poly([[x - r, y], [x, y - r], [x + r, y + r * 0.4]], i % 2 ? "#a8977a" : "#8a7a62", 5); } };
/** a campfire / torch flame (200 x 300), t phase */
export const fxFlame = (p: Pen, t: number) => { const w = Math.sin(t * TWO) * 10; p.poly([[60, 280], [100 + w, 40], [140, 280]], "#ff8a2a", 6); p.poly([[78, 280], [100 - w * 0.6, 120], [122, 280]], "#ffd84a", 0); };
/** hammer swing burst (200 x 200) */
export const fxBang = (p: Pen, t: number) => { for (let i = 0; i < 6; i++) { const a = rad(i * 60 + 10), r0 = 20 + 40 * t, r1 = 50 + 60 * t; p.stroke([[100 + r0 * Math.cos(a), 100 + r0 * Math.sin(a)], [100 + r1 * Math.cos(a), 100 + r1 * Math.sin(a)]], 9 * (1 - t) + 3, "#ffffff"); } };

// ---------------- painted textures ----------------
const boards = (g: G, w: number, h: number, n: number, base: string, r: () => number, vert = false) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(base, 0.86 + 0.24 * r()); if (vert) g.fillRect((i * w) / n, 0, w / n, h); else g.fillRect(0, (i * h) / n, w, h / n);
    g.strokeStyle = "rgba(60,36,24,0.3)"; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const q = (i + r()) * ((vert ? w : h) / n); g.beginPath(); if (vert) { g.moveTo(q, 0); g.lineTo(q + 3, h); } else { g.moveTo(0, q); g.lineTo(w, q + 3); } g.stroke(); }
    g.fillStyle = "rgba(40,24,16,0.85)"; if (vert) g.fillRect((i * w) / n - 2, 0, 4, h); else g.fillRect(0, (i * h) / n - 2, w, 4);
  }
  for (let i = 0; i < 18; i++) { g.fillStyle = "#3a2a1e"; g.beginPath(); g.arc(r() * w, r() * h, 3, 0, TWO); g.fill(); }
};
export const horseWood = (g: G, r: () => number) => boards(g, 512, 512, 10, "#b07a46", r);
export const stoneWall = (g: G, r: () => number) => {
  g.fillStyle = "#cdb48a"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) { let x = -((row % 2) * 40); while (x < 512) { const w = 60 + r() * 50; g.fillStyle = shade("#cdb48a", 0.86 + 0.24 * r()); g.fillRect(x + 2, row * 64 + 2, w - 4, 60); g.strokeStyle = "rgba(90,70,48,0.8)"; g.lineWidth = 4; g.strokeRect(x + 2, row * 64 + 2, w - 4, 60); x += w; } }
};
export const sandTex = (g: G, r: () => number) => { g.fillStyle = "#e3c897"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,205,0.4)" : "rgba(160,130,80,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 50, 8 + r() * 18, r(), 0, TWO); g.fill(); } };
export const woodTex2 = (g: G, r: () => number) => boards(g, 256, 256, 5, "#8a5a34", r);
export const shelfTex = (g: G, r: () => number) => {
  g.fillStyle = "#6a4028"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 14; i++) { const x = 16 + i * 35, y = 20 + row * 124; g.fillStyle = shade("#efe0b8", 0.85 + 0.2 * r()); g.beginPath(); g.arc(x + 14, y + 50, 14, 0, TWO); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = "#c9a46a"; g.beginPath(); g.arc(x + 14, y + 50, 5, 0, TWO); g.fill(); }
  g.fillStyle = "#4a2c1a"; for (let row = 0; row < 5; row++) g.fillRect(0, row * 124 + 92, 512, 14);
};
/** the cutaway mound: one stratum (512 x 128); ruin = draw broken wall stubs; tone by layer */
export const strataTex = (k: number) => (g: G, r: () => number) => {
  const base = ["#a8977a", "#b8a27c", "#9a8a6a", "#c2a878", "#a88e68", "#b89a6a", "#c9a678", "#a8977a", "#b8a888"][k % 9];
  g.fillStyle = base; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,210,0.25)" : "rgba(60,40,24,0.2)"; g.beginPath(); g.ellipse(r() * 512, r() * 128, 4 + r() * 10, 2 + r() * 5, r(), 0, TWO); g.fill(); }
  for (let i = 0; i < 5; i++) { const x = 30 + i * 100 + r() * 30, h = 30 + r() * 40; g.fillStyle = shade("#cdb48a", 0.8 + 0.2 * r()); g.fillRect(x, 128 - h - 10, 40, h); g.strokeStyle = "rgba(60,40,24,0.7)"; g.lineWidth = 3; g.strokeRect(x, 128 - h - 10, 40, h); }
  g.fillStyle = "rgba(36,23,38,0.85)"; g.fillRect(0, 0, 512, 5);
};
