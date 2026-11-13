// Drawings for the duel: effect cards (Pen) and painted textures for the saloon and the street.
import { Pen, INK, shade } from "./toon";
type P2 = [number, number];
type G = CanvasRenderingContext2D;
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const TWO = Math.PI * 2;
export const WHISKEY = "#c98a2a";

/** whiskey flying out of a tipped glass, side-on (500 x 300): t 0..1, travelling +x */
export const fxSlosh = (p: Pen, t: number) => {
  const e = 1 - (1 - t) ** 2;
  const pts: P2[] = [];
  for (let i = 0; i <= 12; i++) { const s = i / 12, x = 40 + 420 * e * s, y = 150 - 90 * Math.sin(Math.PI * s) * (1 - t) + 40 * t * s; pts.push([x, y - 22 * (1 - s) * (1 - t)]); }
  for (let i = 12; i >= 0; i--) { const s = i / 12, x = 40 + 420 * e * s, y = 150 - 90 * Math.sin(Math.PI * s) * (1 - t) + 40 * t * s; pts.push([x, y + 22 * (1 - s) * (1 - t) + 10]); }
  p.poly(pts, WHISKEY, 7);
  for (let i = 0; i < 7; i++) { const s = 0.4 + i * 0.09, x = 40 + 440 * e * s + 20 * rnd(i, 1), y = 120 + 80 * rnd(i, 2) + 60 * t; p.ell(x, y, 12 * (1 - 0.4 * t), 14 * (1 - 0.4 * t), WHISKEY, 5); }
};
/** the glass spinning through the air (200 x 200) */
export const fxGlass = (p: Pen, fill = 0.5) => {
  p.poly([[60, 30], [140, 30], [130, 170], [70, 170]], "#e6f2f8", 7);
  const ly = 170 - 130 * fill; p.poly([[66 + (ly - 30) * 0.02, ly], [134 - (ly - 30) * 0.02, ly], [129, 164], [71, 164]], WHISKEY, 0);
  p.poly([[60, 30], [140, 30], [130, 170], [70, 170]], null, 7);
  p.stroke([[78, 50], [84, 140]], 6, "#ffffff");
};
/** a bullet hole in planks (100 x 100) */
export const fxHole = (p: Pen, seed: number) => {
  for (let i = 0; i < 6; i++) { const a = rnd(seed, i) * TWO; p.stroke([[50, 50], [50 + 34 * Math.cos(a), 50 + 34 * Math.sin(a)]], 4, "#5a3a22"); }
  p.ell(50, 50, 15, 15, "#1d1715", 4); p.ell(46, 46, 5, 4, "#3a2a22", 0);
};
/** a tin can (100 x 140) */
export const fxCan = (p: Pen) => {
  p.poly([[16, 24], [84, 24], [84, 130], [16, 130]], "#c9ced6", 7);
  p.poly([[16, 50], [84, 50], [84, 100], [16, 100]], "#d63a2f", 5);
  p.ell(50, 24, 34, 9, "#e8ecf0", 6); p.stroke([[30, 30], [30, 124]], 6, "#ffffff");
  p.ell(50, 75, 14, 14, "#f2c94c", 4);
};
/** a bottle (100 x 260), colour per seed; burst = 0..1 shatter */
export const fxBottle = (p: Pen, seed: number, burst = 0) => {
  const col = ["#3f8a4a", "#8a5a2a", "#4a7aa8"][seed % 3];
  if (burst <= 0) {
    p.poly([[22, 250], [78, 250], [80, 120], [62, 92], [60, 30], [40, 30], [38, 92], [20, 120]], col, 7);
    p.poly([[38, 18], [62, 18], [62, 34], [38, 34]], "#8a5a34", 5);
    p.poly([[26, 150], [74, 150], [74, 210], [26, 210]], "#f2e6c4", 5);
    p.stroke([[32, 128], [32, 238]], 7, "rgba(255,255,255,0.7)");
    return;
  }
  for (let i = 0; i < 9; i++) {
    const a = rad(200 + i * 20), d = 30 + 110 * burst, x = 50 + d * Math.cos(a), y = 170 + d * Math.sin(a) + 120 * burst * burst, r = 14 * (1 - 0.4 * burst), b = i * 1.1 + burst * 7;
    p.poly([[x + r * Math.cos(b), y + r * Math.sin(b)], [x + r * Math.cos(b + 2.3), y + r * Math.sin(b + 2.3)], [x + r * 0.6 * Math.cos(b + 4.1), y + r * 0.6 * Math.sin(b + 4.1)]], col, 4);
  }
};
/** tumbleweed (300 x 300), rolled by rotating the card */
export const fxTumble = (p: Pen) => {
  for (let i = 0; i < 26; i++) {
    const a0 = rnd(i, 1) * TWO, a1 = a0 + 1.2 + rnd(i, 2) * 2, r = 70 + 70 * rnd(i, 3);
    const pts: P2[] = []; for (let k = 0; k <= 10; k++) { const a = a0 + ((a1 - a0) * k) / 10; pts.push([150 + r * Math.cos(a), 150 + r * 0.9 * Math.sin(a)]); }
    p.stroke(pts, 9, INK); p.stroke(pts, 4.5, ["#b99a62", "#a8885a", "#c9ad74"][i % 3]);
  }
};
/** vulture on a ridge (300 x 300, feet at the bottom); nod = 0..1 */
export const fxVulture = (p: Pen, nod: number, blink = false) => {
  for (const s of [-1, 1]) p.stroke([[150 + s * 20, 250], [150 + s * 24, 290]], 9, "#c9a07a");
  p.poly([[70, 250], [100, 120], [150, 100], [200, 120], [230, 250], [150, 268]], "#2e2a30", 9);
  p.poly([[100, 140], [60, 260], [110, 250]], "#1f1c22", 7); p.poly([[200, 140], [240, 260], [190, 250]], "#1f1c22", 7);
  p.poly([[110, 112], [190, 112], [184, 92], [116, 92]], "#f3efe6", 7); // ruff
  const hy = 70 + 16 * nod, hx = 150 + 8 * nod;
  p.stroke([[150, 96], [hx, hy + 16]], 26, INK); p.stroke([[150, 96], [hx, hy + 16]], 16, "#d9827a");
  p.ell(hx, hy, 30, 26, "#d9827a", 7);
  p.poly([[hx + 20, hy - 6], [hx + 52, hy + 10], [hx + 30, hy + 22], [hx + 18, hy + 10]], "#e8dcc0", 6);
  if (blink) p.stroke([[hx - 4, hy - 4], [hx + 12, hy - 4]], 6); else { p.ell(hx + 4, hy - 4, 8, 8, "#ffffff", 4); p.dot(hx + 6, hy - 3, 3.5); }
};
/** light bulb idea (200 x 260) */
export const fxBulb = (p: Pen, t: number) => {
  if (t > 0.05) for (let i = 0; i < 8; i++) { const a = rad(-180 + i * 25.7), r0 = 92, r1 = 92 + 34 * Math.min(1, t * 2); p.stroke([[100 + r0 * Math.cos(a), 100 + r0 * Math.sin(a)], [100 + r1 * Math.cos(a), 100 + r1 * Math.sin(a)]], 9, "#ffd84a"); }
  p.ell(100, 100, 60, 64, "#fff3a0", 8);
  p.poly([[74, 156], [126, 156], [122, 210], [78, 210]], "#9aa1aa", 7);
  for (const y of [172, 190]) p.stroke([[76, y], [124, y]], 5);
  p.stroke([[86, 120], [92, 90], [100, 118], [108, 90], [114, 120]], 6, "#e8a72a");
};
/** bullet streak, pointing +x (400 x 60) */
export const fxTracer = (p: Pen) => p.poly([[10, 30], [330, 20], [392, 30], [330, 40]], "#ffe066", 5);
/** sweat drop (60 x 90) */
export const fxSweat = (p: Pen) => p.poly([[30, 6], [52, 54], [30, 84], [8, 54]], "#9fd4ff", 5);

// ---------------- painted textures ----------------
const ink = (g: G, w: number) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };
const boards = (g: G, w: number, h: number, n: number, base: string, r: () => number, vert = false, seam = "rgba(40,26,20,0.8)") => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(base, 0.88 + 0.22 * r());
    if (vert) g.fillRect((i * w) / n, 0, w / n, h); else g.fillRect(0, (i * h) / n, w, h / n);
    g.strokeStyle = "rgba(60,36,24,0.28)"; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const q = (i + r()) * ((vert ? w : h) / n); g.beginPath(); if (vert) { g.moveTo(q, 0); g.bezierCurveTo(q + 4, h * 0.3, q - 4, h * 0.6, q + 2, h); } else { g.moveTo(0, q); g.bezierCurveTo(w * 0.3, q + 4, w * 0.6, q - 4, w, q + 2); } g.stroke(); }
    g.fillStyle = seam;
    if (vert) g.fillRect((i * w) / n - 2, 0, 4, h); else g.fillRect(0, (i * h) / n - 2, w, 4);
  }
};
export const floorTex = (g: G, r: () => number) => boards(g, 512, 512, 8, "#9a6a40", r);
export const plankWall = (g: G, r: () => number) => boards(g, 512, 512, 9, "#b07a48", r, true);
export const darkWood = (g: G, r: () => number) => boards(g, 256, 256, 4, "#6a4028", r);
/** wallpaper: deep red with gold stripes and a wainscot (512 x 512, 2.4 m tall repeats) */
export const paperTex = (g: G) => {
  g.fillStyle = "#8c2f2f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) { g.fillStyle = "#a8463a"; g.fillRect(i * 64 + 24, 0, 16, 512); g.fillStyle = "#c9933a"; g.fillRect(i * 64 + 30, 0, 4, 512); }
  for (let y = 40; y < 512; y += 90) for (let i = 0; i < 8; i++) { g.fillStyle = "#c9933a"; g.beginPath(); g.ellipse(i * 64 + 0, y + (i % 2) * 45, 8, 12, 0, 0, TWO); g.fill(); }
};
export const earthTex = (g: G, r: () => number) => {
  g.fillStyle = "#e3c497"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,205,0.45)" : "rgba(170,120,80,0.28)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 8 + r() * 22, (r() - 0.5) * 0.6, 0, TWO); g.fill(); }
  g.strokeStyle = "rgba(120,80,56,0.45)"; g.lineWidth = 3; g.lineCap = "round";
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, l = 20 + r() * 60; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6 - r() * 6, x + l, y + (r() - 0.5) * 8); g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = r() < 0.5 ? "#9a7a5a" : "#fff0d0"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, TWO); g.fill(); }
};
/** a false-front building face (512 x 640): painted boards, a sign, windows, a door; door = the swinging doors' gap */
export const facadeTex = (name: string, base: string, trim: string, saloon = false) => (g: G, r: () => number) => {
  boards(g, 512, 640, 10, base, r, true);
  g.fillStyle = trim; g.fillRect(0, 0, 512, 34); g.fillRect(0, 300, 512, 20);
  g.fillStyle = "#f4ead0"; g.fillRect(40, 70, 432, 160); ink(g, 12); g.strokeRect(40, 70, 432, 160);
  g.fillStyle = "#3a2a22"; g.textAlign = "center"; g.textBaseline = "middle";
  const px = name.length > 8 ? 74 : 104; g.font = `900 ${px}px Georgia, 'DejaVu Serif', serif`; g.fillText(name, 256, 152);
  for (const x of saloon ? [36, 376] : [36, 336]) { g.fillStyle = "#9ed3ee"; g.fillRect(x, 360, 100, 150); ink(g, 10); g.strokeRect(x, 360, 100, 150); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 8; g.beginPath(); g.moveTo(x + 20, 490); g.lineTo(x + 70, 380); g.stroke(); }
  if (saloon) { g.fillStyle = "#2a1a14"; g.fillRect(186, 380, 140, 260); }
  else { g.fillStyle = shade(trim, 0.8); g.fillRect(196, 400, 120, 240); ink(g, 10); g.strokeRect(196, 400, 120, 240); }
};
export const wantedTex = (g: G) => {
  g.fillStyle = "#efe0b8"; g.fillRect(0, 0, 256, 340); ink(g, 8); g.strokeRect(4, 4, 248, 332);
  g.fillStyle = "#3a2a22"; g.textAlign = "center"; g.font = "900 46px Georgia, 'DejaVu Serif', serif"; g.fillText("WANTED", 128, 60);
  g.fillStyle = "#d9c49a"; g.fillRect(48, 86, 160, 150);
  const p = new Pen(g); p.ell(128, 168, 46, 50, "#f5c9a0", 5); p.dot(112, 160, 5); p.dot(144, 160, 5); p.stroke([[108, 190], [148, 190]], 5);
  p.poly([[66, 124], [190, 124], [176, 112], [80, 112]], "#2a2428", 5);
  g.fillStyle = "#3a2a22"; g.font = "900 40px Georgia, 'DejaVu Serif', serif"; g.fillText("$500", 128, 290);
};
export const mirrorTex = (g: G) => {
  const gr = g.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, "#c9d6dc"); gr.addColorStop(0.5, "#eef4f6"); gr.addColorStop(1, "#aebec6");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 14; for (const x of [80, 140, 330]) { g.beginPath(); g.moveTo(x, 230); g.lineTo(x + 90, 30); g.stroke(); }
  g.strokeStyle = "#c9933a"; g.lineWidth = 22; g.strokeRect(11, 11, 490, 234);
};
