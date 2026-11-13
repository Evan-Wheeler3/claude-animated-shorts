// Drawings for "The Eiffel Tower's Secret Job": effect / explainer cards (Pen) and painted textures.
import { Pen, INK, shade, mix } from "./toon";
type P2 = [number, number];
type G = CanvasRenderingContext2D;
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const TWO = Math.PI * 2;
const ink = (g: G, w: number) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };
const serif = (g: G, px: number) => { g.font = `900 ${px}px Georgia, 'DejaVu Serif', serif`; g.textAlign = "center"; g.textBaseline = "middle"; };
const label = (g: G, txt: string, x: number, y: number, px: number, fill: string, stroke = INK) => { serif(g, px); g.lineJoin = "round"; g.lineWidth = px * 0.14; g.strokeStyle = stroke; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); };

/** a document on a board (360 x 480): the permit; stamped = the red DEMOLISH stamp slams on (0..1) */
export const fxPermit = (p: Pen, stamp: number, renewed = 0) => {
  const g = p.g;
  p.poly([[14, 14], [346, 14], [346, 466], [14, 466]], "#f2ecdc", 8);
  label(g, "PERMIT", 180, 70, 54, "#3a2a22", "#f2ecdc");
  g.fillStyle = "#3a2a22"; serif(g, 26); g.fillText("TOUR EIFFEL", 180, 118);
  label(g, "20 YEARS", 180, 200, 58, "#2f4f8a", "#f2ecdc");
  for (let i = 0; i < 5; i++) p.stroke([[50, 262 + i * 22], [310, 262 + i * 22]], 4, "#b8ad98");
  p.stroke([[60, 420], [170, 400], [190, 420]], 5, "#3a2a22");
  if (stamp > 0) {
    const s = 1.6 - 0.6 * Math.min(1, stamp);
    g.save(); g.translate(180, 330); g.rotate(-0.25); g.scale(s, s); g.globalAlpha = Math.min(1, stamp * 1.5);
    g.strokeStyle = "#c0353a"; g.lineWidth = 10; g.strokeRect(-150, -46, 300, 92);
    g.fillStyle = "#c0353a"; serif(g, 50); g.fillText("DEMOLISH", 0, -10); serif(g, 30); g.fillText("IN 1909", 0, 28); g.restore();
  }
  if (renewed > 0) {
    const s = 1.6 - 0.6 * Math.min(1, renewed);
    g.save(); g.translate(180, 330); g.rotate(0.18); g.scale(s, s); g.globalAlpha = Math.min(1, renewed * 1.5);
    g.fillStyle = "rgba(242,236,220,0.92)"; g.fillRect(-160, -60, 320, 120);
    g.strokeStyle = "#3f8a4a"; g.lineWidth = 10; g.strokeRect(-150, -54, 300, 108);
    g.fillStyle = "#3f8a4a"; serif(g, 46); g.fillText("RENEWED", 0, -14); serif(g, 36); g.fillText("+70 YEARS", 0, 30); g.restore();
  }
};
/** a protest sign on a stick (300 x 400) */
export const fxSign = (p: Pen, txt: string, col: string) => {
  const g = p.g; p.poly([[140, 200], [160, 200], [160, 396], [140, 396]], "#8a5a34", 6);
  p.poly([[16, 16], [284, 16], [284, 210], [16, 210]], "#f7f3ea", 9); label(g, txt, 150, 113, txt.length > 7 ? 46 : 58, col, "#f7f3ea");
};
/** the letter (300 x 400): "useless and monstrous" */
export const fxLetter = (p: Pen) => {
  const g = p.g; p.poly([[10, 10], [290, 10], [290, 390], [10, 390]], "#f2ecdc", 7);
  g.fillStyle = "#3a2a22"; serif(g, 28); g.fillText("LE TEMPS", 150, 44); p.stroke([[24, 62], [276, 62]], 3);
  label(g, "USELESS", 150, 120, 40, "#c0353a", "#f2ecdc"); label(g, "AND", 150, 162, 26, "#3a2a22", "#f2ecdc"); label(g, "MONSTROUS", 150, 204, 36, "#c0353a", "#f2ecdc");
  for (let i = 0; i < 6; i++) p.stroke([[34, 250 + i * 20], [266, 250 + i * 20]], 3, "#b8ad98");
  for (let i = 0; i < 4; i++) p.stroke([[40 + i * 60, 370], [80 + i * 60, 356], [92 + i * 60, 372]], 3, "#3a2a22");
};
/** a tear-off calendar page (240 x 300) */
export const fxCal = (p: Pen, year: string) => { const g = p.g; p.poly([[10, 30], [230, 30], [230, 290], [10, 290]], "#f7f3ea", 7); p.poly([[10, 30], [230, 30], [230, 96], [10, 96]], "#c0353a", 7); label(g, "DEADLINE", 120, 63, 30, "#ffffff", "#c0353a"); label(g, year, 120, 196, 84, "#2a2428", "#f7f3ea"); for (const x of [60, 180]) p.ell(x, 30, 10, 14, "#8d949c", 4); };
/** radio rings round a mast top (800 x 800): t phase; block = fraction of the left half cut off at the hill (0 = free) */
export const fxRings = (p: Pen, t: number, block: number, col = "#ffd84a") => {
  const g = p.g, cx = 400, cy = 400;
  for (let k = 0; k < 4; k++) {
    const u = (t + k / 4) % 1, r = 30 + 360 * u, a = 1 - u;
    g.lineCap = "round";
    const left = block > 0 && r > 400 * (1 - block) ? rad(150) : rad(205);
    for (const [a0, a1, w] of [[rad(-25), rad(25), 1], [left === rad(150) ? rad(160) : rad(155), rad(205), 1]] as const) {
      if (left === rad(150) && a0 > 1) continue;
      g.beginPath(); g.arc(cx, cy, r, a0, a1); g.strokeStyle = `rgba(36,23,38,${0.9 * a})`; g.lineWidth = 16 * w; g.stroke();
      g.beginPath(); g.arc(cx, cy, r, a0, a1); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = 9 * w; g.stroke(); g.globalAlpha = 1;
    }
  }
};
/** a little "no signal" / "full signal" badge (200 x 200) */
export const fxBars = (p: Pen, n: number) => {
  p.ell(100, 100, 90, 90, n ? "#3f9a4a" : "#c0353a", 8);
  for (let i = 0; i < 4; i++) { const h = 24 + i * 20; p.poly([[48 + i * 30, 150], [70 + i * 30, 150], [70 + i * 30, 150 - h], [48 + i * 30, 150 - h]], i < n ? "#ffffff" : "rgba(255,255,255,0.3)", 4); }
  if (!n) p.stroke([[40, 40], [160, 160]], 16, "#ffffff");
};
/** wifi fan (200 x 200), n arcs lit of 3 */
export const fxWifi = (p: Pen, n: number) => {
  const g = p.g;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(100, 160, 40 + i * 40, rad(225), rad(315)); g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 24; g.stroke(); g.strokeStyle = i < n ? "#3f9ad0" : "#c9ced6"; g.lineWidth = 14; g.stroke(); }
  p.ell(100, 160, 14, 14, n ? "#3f9ad0" : "#c9ced6", 5);
};
/** morse dots and dashes flying (500 x 120), t phase */
export const fxMorse = (p: Pen, t: number) => { const pat = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1]; pat.forEach((d, i) => { const x = ((i * 44 + t * 500) % 540) - 20; if (d) p.poly([[x, 48], [x + 34, 48], [x + 34, 72], [x, 72]], "#ffd84a", 5); else p.ell(x + 10, 60, 11, 11, "#ffd84a", 5); }); };
/** a ruler "+6 m" (200 x 500) */
export const fxRuler = (p: Pen, u: number) => { const g = p.g; p.poly([[60, 20], [140, 20], [140, 480], [60, 480]], "#ffd84a", 7); for (let i = 0; i < 12; i++) p.stroke([[60, 40 + i * 38], [i % 2 ? 90 : 110, 40 + i * 38]], 5); if (u > 0.5) label(g, "+6 m", 100, 250, 44, "#c0353a", "#ffffff"); };
/** an engagement ring box (200 x 200) */
export const fxRing = (p: Pen) => { p.poly([[40, 110], [160, 110], [160, 180], [40, 180]], "#c0353a", 7); p.poly([[40, 110], [160, 110], [150, 60], [50, 60]], "#8f1820", 7); p.ell(100, 98, 30, 22, null, 0); p.g.strokeStyle = "#f2c94c"; p.g.lineWidth = 10; p.g.beginPath(); p.g.ellipse(100, 100, 26, 20, 0, 0, TWO); p.g.stroke(); p.poly([[88, 74], [112, 74], [100, 56]], "#bfe8ff", 4); };
/** a pocket watch (200 x 200) */
export const fxWatch = (p: Pen, t: number) => { p.ell(100, 110, 70, 70, "#f2c94c", 8); p.ell(100, 110, 56, 56, "#fbfaf5", 4); p.ell(100, 34, 14, 10, "#f2c94c", 5); const a = t * TWO; p.stroke([[100, 110], [100 + 40 * Math.sin(a), 110 - 40 * Math.cos(a)]], 6); p.stroke([[100, 110], [100 + 26 * Math.sin(a / 12), 110 - 26 * Math.cos(a / 12)]], 8); };
/** headphones (200 x 120) over a head */
export const fxPhones = (p: Pen) => { p.g.beginPath(); p.g.arc(100, 110, 84, Math.PI, TWO); p.g.lineWidth = 14; p.g.strokeStyle = INK; p.g.stroke(); p.g.lineWidth = 8; p.g.strokeStyle = "#5b6170"; p.g.stroke(); for (const x of [18, 182]) p.ell(x, 106, 20, 26, "#3a3d47", 6); };
/** a crack-of-light spark for the radio switching on (500 x 500) */
export const fxSpark = (p: Pen, t: number) => { for (let i = 0; i < 10; i++) { const a = rad(i * 36 + 8), r0 = 40 + 60 * t, r1 = 90 + 140 * t; p.stroke([[250 + r0 * Math.cos(a), 250 + r0 * Math.sin(a)], [250 + (r0 + r1) / 2 * Math.cos(a + 0.12), 250 + (r0 + r1) / 2 * Math.sin(a + 0.12)], [250 + r1 * Math.cos(a), 250 + r1 * Math.sin(a)]], 12 * (1 - t) + 3, "#9fe0ff"); } };
export const fxSweat = (p: Pen) => p.poly([[30, 6], [52, 54], [30, 84], [8, 54]], "#9fd4ff", 5);

// ---------------- painted textures ----------------
/** the tower's iron lattice (256 x 256, transparent between members): outer rails, X bracing, ties */
export const latticeTex = (g: G) => {
  g.clearRect(0, 0, 256, 256);
  const col = "#a0704a", hi = "#c4925f";
  const bar = (x0: number, y0: number, x1: number, y1: number, w: number) => { g.lineCap = "square"; g.strokeStyle = INK; g.lineWidth = w + 6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.strokeStyle = hi; g.lineWidth = Math.max(1, w * 0.3); g.stroke(); };
  bar(0, 0, 256, 256, 9); bar(256, 0, 0, 256, 9); bar(0, 128, 256, 128, 7); bar(128, 0, 128, 256, 5);
  bar(0, 64, 64, 0, 4); bar(192, 0, 256, 64, 4); bar(0, 192, 64, 256, 4); bar(192, 256, 256, 192, 4);
  bar(4, 0, 4, 256, 14); bar(252, 0, 252, 256, 14); bar(0, 4, 256, 4, 10);
};
export const ironTex = (g: G, r: () => number) => { g.fillStyle = "#7a5a40"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,230,200,0.08)" : "rgba(0,0,0,0.08)"; g.fillRect(r() * 256, r() * 256, 20, 4); } };
/** a Haussmann facade (512 x 512): cream stone, iron balconies, a grey zinc roof band on top */
export const haussTex = (g: G, r: () => number) => {
  g.fillStyle = shade("#e9dcc0", 0.92 + 0.12 * r()); g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#7d8794"; g.fillRect(0, 0, 512, 92);
  for (let k = 0; k < 4; k++) { g.fillStyle = "#5b6574"; g.fillRect(40 + k * 120, 22, 40, 50); }
  for (let row = 0; row < 5; row++) for (let k = 0; k < 6; k++) {
    const x = 26 + k * 82, y = 120 + row * 76;
    g.fillStyle = "#3a4a5a"; g.fillRect(x, y, 40, 54);
    if (row === 1 || row === 4) { g.strokeStyle = "#2a2428"; g.lineWidth = 3; g.strokeRect(x - 6, y + 40, 52, 14); }
  }
  g.fillStyle = "#c9b58e"; g.fillRect(0, 460, 512, 52);
};
/** a Paris rooftop panorama for the restaurant window (1024 x 512), with NO tower in it */
export const panoTex = (g: G, r: () => number) => {
  const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, "#7fb2e6"); sky.addColorStop(1, "#d8e6f2"); g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { const x = r() * 1024, w = 50 + r() * 90, h = 120 + r() * 160; g.fillStyle = shade("#e9dcc0", 0.85 + 0.2 * r()); g.fillRect(x, 512 - h, w, h); g.fillStyle = "#7d8794"; g.fillRect(x - 4, 512 - h - 26, w + 8, 28); }
  g.fillStyle = "#e8e2d4"; g.beginPath(); g.ellipse(760, 330, 60, 70, 0, Math.PI, TWO); g.fill(); g.fillRect(700, 330, 120, 182); // a dome
  ink(g, 3); g.strokeRect(700, 330, 120, 182);
};
export const wallpaperTex = (g: G) => { g.fillStyle = "#6a2f3a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#c9933a"; for (let y = 16; y < 256; y += 48) for (let x = 16; x < 256; x += 48) { g.beginPath(); g.arc(x + (y % 96 ? 24 : 0), y, 5, 0, TWO); g.fill(); } };
export const clothTex = (g: G) => { g.fillStyle = "#f7f3ea"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#c0353a"; g.lineWidth = 10; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } };
export const gravelTex = (g: G, r: () => number) => { g.fillStyle = "#d9c9a4"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,245,220,0.5)" : "rgba(140,120,90,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 4, 2 + r() * 3, 0, 0, TWO); g.fill(); } };
export const lawnTex = (g: G, r: () => number) => { g.fillStyle = "#7fb05a"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(160,210,110,0.4)" : "rgba(80,130,60,0.3)"; g.fillRect(0, r() * 512, 512, 8 + r() * 14); } };
void mix; void rnd;
