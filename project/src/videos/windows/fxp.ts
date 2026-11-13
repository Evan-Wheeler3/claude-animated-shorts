// Drawings for "Why Plane Windows Are Round": effect / explainer cards (Pen) and painted textures.
import { Pen, INK, shade, mix } from "./toon";
type P2 = [number, number];
type G = CanvasRenderingContext2D;
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const TWO = Math.PI * 2;
const ink = (g: G, w: number) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };

/** a jagged crack growing from (0, 0) toward +x/+y (400 x 400, origin top-left at 60,60); u = 0..1 */
export const fxCrack = (p: Pen, u: number, seed = 1) => {
  const pts: P2[] = [[60, 60]];
  let x = 60, y = 60;
  const n = Math.max(1, Math.round(14 * u));
  for (let i = 0; i < n; i++) { x += 18 + 10 * rnd(seed, i); y += 12 + 14 * (rnd(seed, i + 30) - 0.3); pts.push([x, y]); }
  p.stroke(pts, 9, INK);
  for (let i = 2; i < n; i += 3) { const [bx, by] = pts[i]; p.stroke([[bx, by], [bx + 18 * (rnd(seed, i + 9) - 0.2), by + 26 * (rnd(seed, i + 19) - 0.6)]], 5, INK); }
};
/** horizontal speed lines (500 x 300) */
export const fxSpeed = (p: Pen, seed: number) => { for (let i = 0; i < 9; i++) { const y = 20 + i * 32 + 10 * rnd(seed, i), x0 = 30 + 160 * rnd(seed, i + 7), l = 120 + 200 * rnd(seed, i + 3); p.stroke([[x0, y], [x0 + l, y]], 7, "#ffffff"); } };
/** air arrows pointing outward (300 x 300) */
export const fxAir = (p: Pen, t: number) => {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO, r0 = 40 + 40 * t, r1 = r0 + 70;
    const x0 = 150 + r0 * Math.cos(a), y0 = 150 + r0 * Math.sin(a), x1 = 150 + r1 * Math.cos(a), y1 = 150 + r1 * Math.sin(a);
    p.stroke([[x0, y0], [x1, y1]], 14, INK); p.stroke([[x0, y0], [x1, y1]], 8, "#9fd4ff");
    const hx = x1 + 14 * Math.cos(a), hy = y1 + 14 * Math.sin(a);
    p.poly([[hx, hy], [x1 + 14 * Math.cos(a + 2.2), y1 + 14 * Math.sin(a + 2.2)], [x1 + 14 * Math.cos(a - 2.2), y1 + 14 * Math.sin(a - 2.2)]], "#9fd4ff", 5);
  }
};
/** a newspaper front page (300 x 400): headline by state */
export const fxPaper = (p: Pen, which: 0 | 1) => {
  const g = p.g;
  p.poly([[10, 10], [290, 10], [290, 390], [10, 390]], "#f2ecdc", 7);
  g.fillStyle = "#2a2428"; g.textAlign = "center"; g.font = "900 26px Georgia, 'DejaVu Serif', serif"; g.fillText("THE DAILY", 150, 46);
  p.stroke([[24, 60], [276, 60]], 4);
  g.font = "900 46px Georgia, 'DejaVu Serif', serif";
  const L = which ? ["SECOND", "COMET", "LOST"] : ["COMET", "JET", "LOST"];
  L.forEach((l, i) => g.fillText(l, 150, 112 + i * 48));
  g.fillStyle = "#c9c2b0"; g.fillRect(30, 250, 110, 110);
  const q = new Pen(g); q.poly([[40, 300], [130, 290], [118, 312], [44, 318]], "#8d949c", 3); q.poly([[78, 296], [100, 270], [104, 296]], "#8d949c", 3);
  for (let i = 0; i < 7; i++) p.stroke([[156, 262 + i * 14], [272, 262 + i * 14]], 4, "#a8a090");
};
/** pressure gauge (300 x 300), needle 0..1 */
export const fxGauge = (p: Pen, v: number) => {
  p.ell(150, 150, 130, 130, "#e8ecf0", 10); p.ell(150, 150, 110, 110, "#fbfaf5", 4);
  for (let i = 0; i <= 10; i++) { const a = rad(-210 + i * 24); p.stroke([[150 + 92 * Math.cos(a), 150 + 92 * Math.sin(a)], [150 + 106 * Math.cos(a), 150 + 106 * Math.sin(a)]], i % 5 ? 4 : 8); }
  p.g.fillStyle = "#d63a2f"; p.g.beginPath(); p.g.arc(150, 150, 100, rad(42), rad(30 + 0.5), false); p.g.arc(150, 150, 88, rad(30), rad(42), true); p.g.fill();
  const a = rad(-210 + 240 * v); p.stroke([[150, 150], [150 + 88 * Math.cos(a), 150 + 88 * Math.sin(a)]], 9, "#d63a2f"); p.ell(150, 150, 14, 14, "#3a3d47", 4);
};
/** the flight counter board (512 x 256) */
export const fxBoard = (p: Pen, n: number) => {
  const g = p.g;
  p.poly([[8, 8], [504, 8], [504, 248], [8, 248]], "#2f3f5a", 8);
  g.fillStyle = "#f2ecdc"; g.textAlign = "center"; g.font = "900 40px Georgia, 'DejaVu Serif', serif"; g.fillText("FLIGHTS", 256, 64);
  const s = String(n).padStart(4, "0");
  for (let i = 0; i < 4; i++) { p.poly([[64 + i * 100, 92], [148 + i * 100, 92], [148 + i * 100, 222], [64 + i * 100, 222]], "#141820", 5); g.fillStyle = "#ffd84a"; g.font = "900 104px 'DejaVu Sans Mono', monospace"; g.fillText(s[i], 106 + i * 100, 196); }
};
/** a sparrow in an oxygen mask, gasping (300 x 300) */
export const fxBird = (p: Pen, flap: number, gasp: number) => {
  const d = flap > 0.5 ? -1 : 1;
  p.poly([[150, 160], [60, 160 + d * 60], [40, 150 + d * 46], [120, 150]], "#8a6a4a", 7);
  p.poly([[150, 160], [240, 160 + d * 60], [260, 150 + d * 46], [180, 150]], "#8a6a4a", 7);
  p.ell(150, 168, 58, 40, "#a8845a", 8); p.ell(150, 182, 34, 20, "#f2e6c4", 0);
  p.ell(196, 132, 36, 34, "#a8845a", 8);
  p.ell(204, 122, 12, 13, "#ffffff", 4); p.dot(207, 121, 5);
  p.poly([[214, 142], [262, 148], [214, 160]], "#f2a73b", 5);
  p.ell(222, 150, 26, 20 + 6 * gasp, "#e6f2f8", 6); p.stroke([[246, 150], [270, 196], [256, 236]], 6, "#7a8a9a");
  p.ell(256, 252, 18, 26, "#4a8a5a", 6);
  if (gasp > 0.5) for (const [x, y] of [[176, 100], [190, 86]]) p.ell(x, y, 6, 9, "#9fd4ff", 3);
};
/** the explainer: stress flowing round a window. shape round/square, t = flow phase 0..1, heat 0..1 at the corners */
export const fxFlow = (p: Pen, shape: "round" | "square" | "none", t: number, heat = 0, crack = 0) => {
  const g = p.g, W = 800, H = 800, cx = 400, cy = 400, R = 130;
  g.clearRect(0, 0, W, H);
  const obstacle = (y: number) => {
    if (shape === "none") return 0;
    const dy = Math.abs(y - cy);
    if (shape === "round") return dy < R + 30 ? Math.sqrt(Math.max(0, (R + 30) ** 2 - dy * dy)) : 0;
    return dy < R + 26 ? R + 26 : 0;
  };
  for (let i = 0; i < 13; i++) {
    const y0 = 50 + i * 58, pts: P2[] = [];
    for (let k = 0; k <= 60; k++) {
      const x = (k / 60) * W, dx = x - cx;
      let y = y0;
      const ob = obstacle(y0);
      if (ob > 0) {
        const push = (R + 40 - Math.abs(y0 - cy) * 0.3) * (shape === "square" ? 1.05 : 1);
        const fall = shape === "square" ? Math.max(0, 1 - Math.max(0, Math.abs(dx) - (R - 10)) / 40) : Math.exp(-((dx / (R + 60)) ** 2));
        const dir = y0 < cy ? -1 : 1;
        y = cy + dir * Math.max(Math.abs(y0 - cy), push * (shape === "square" ? Math.min(1, fall) : fall) + Math.abs(y0 - cy) * (1 - fall));
      }
      pts.push([x, y]);
    }
    g.strokeStyle = "rgba(36,23,38,0.9)"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.strokeStyle = shape === "square" && Math.abs(y0 - cy) < R + 60 ? mix("#7ec8f0", "#ff6a3a", heat) : "#7ec8f0"; g.lineWidth = 7; g.stroke();
    // moving dashes = the flow
    g.setLineDash([26, 60]); g.lineDashOffset = -t * 86 * 4; g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.stroke(); g.setLineDash([]);
  }
  if (shape === "round") p.ell(cx, cy, R, R, "#2a3a5a", 12);
  if (shape === "square") {
    p.poly([[cx - R, cy - R], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R]], "#2a3a5a", 12);
    if (heat > 0) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const r = 34 + 30 * heat;
      const gr = g.createRadialGradient(cx + sx * R, cy + sy * R, 0, cx + sx * R, cy + sy * R, r);
      gr.addColorStop(0, `rgba(255,80,40,${0.95 * heat})`); gr.addColorStop(1, "rgba(255,80,40,0)"); g.fillStyle = gr; g.beginPath(); g.arc(cx + sx * R, cy + sy * R, r, 0, TWO); g.fill();
    }
    if (crack > 0) { g.save(); g.translate(cx + R, cy - R); g.rotate(-0.5); fxCrack(new Pen(g), crack, 3); g.restore(); }
  }
};
/** water flowing round a rock, seen from above (800 x 800) */
export const fxStream = (p: Pen, t: number) => {
  const g = p.g; g.clearRect(0, 0, 800, 800);
  for (let i = 0; i < 12; i++) {
    const x0 = 40 + i * 66, pts: P2[] = [];
    for (let k = 0; k <= 50; k++) { const y = (k / 50) * 800, dy = y - 400, dx = x0 - 400, d = Math.exp(-((dy / 200) ** 2)), push = Math.abs(dx) < 220 ? (220 - Math.abs(dx)) * d * Math.sign(dx || 1) : 0; pts.push([x0 + push, y]); }
    g.setLineDash([30, 50]); g.lineDashOffset = t * 80 * 5; g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]);
  }
};
/** two hands bending a paperclip (600 x 500); bend -1..1, snapped */
export const fxClip = (p: Pen, bend: number, snapped: boolean) => {
  const g = p.g, a = bend * 0.9;
  const clip = (ox: number, oy: number, ang: number, flip: number) => {
    g.save(); g.translate(ox, oy); g.rotate(ang); g.scale(flip, 1);
    g.lineCap = "round"; g.lineJoin = "round";
    const path = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(150, 0); g.arc(150, 26, 26, -Math.PI / 2, Math.PI / 2); g.lineTo(30, 52); g.arc(30, 32, 20, Math.PI / 2, -Math.PI / 2); g.lineTo(130, 12); };
    path(); g.strokeStyle = INK; g.lineWidth = 16; g.stroke(); path(); g.strokeStyle = "#c9ced6"; g.lineWidth = 9; g.stroke();
    g.restore();
  };
  const gap = snapped ? 26 : 0;
  clip(300 + gap, 240, -a, 1); clip(300 - gap, 240, a, -1);
  // the bend glows a little warmer each time
  if (!snapped) { const gr = g.createRadialGradient(300, 240, 0, 300, 240, 30); gr.addColorStop(0, `rgba(255,120,60,${0.5 * Math.abs(bend)})`); gr.addColorStop(1, "rgba(255,120,60,0)"); g.fillStyle = gr; g.beginPath(); g.arc(300, 240, 30, 0, TWO); g.fill(); }
  // hands
  for (const s of [-1, 1]) {
    const hx = 300 + s * (190 + gap), hy = 240 + s * a * -60;
    p.ell(hx, hy + 6, 60, 46, "#ffe2c2", 9); p.ell(hx - s * 40, hy - 16, 22, 16, "#ffe2c2", 7);
    p.stroke([[hx + s * 40, hy + 30], [hx + s * 110, hy + 120]], 46, INK); p.stroke([[hx + s * 40, hy + 30], [hx + s * 110, hy + 120]], 34, "#2fa59a");
  }
  if (snapped) for (let i = 0; i < 6; i++) { const r0 = 30, r1 = 60, an = rad(i * 60 + 15); p.stroke([[300 + r0 * Math.cos(an), 240 + r0 * Math.sin(an)], [300 + r1 * Math.cos(an), 240 + r1 * Math.sin(an)]], 7, "#ffd84a"); }
};
/** "ding": a call light (200 x 200) */
export const fxDing = (p: Pen, on: boolean) => { p.ell(100, 100, 60, 60, on ? "#ffd84a" : "#c9ced6", 8); p.poly([[70, 104], [100, 60], [130, 104]], on ? "#fff3b0" : "#e8ecf0", 5); p.ell(100, 112, 30, 10, on ? "#ffd84a" : "#c9ced6", 5); if (on) for (let i = 0; i < 6; i++) { const a = rad(-160 + i * 28); p.stroke([[100 + 72 * Math.cos(a), 100 + 72 * Math.sin(a)], [100 + 94 * Math.cos(a), 100 + 94 * Math.sin(a)]], 7, "#ffd84a"); } };
/** a highlight ring (200 x 200) */
export const fxRing = (p: Pen) => { p.ell(100, 100, 12, 12, "#2a3a5a", 0); p.g.strokeStyle = "#ffd84a"; p.g.lineWidth = 12; p.g.beginPath(); p.g.arc(100, 100, 80, 0, TWO); p.g.stroke(); };
export const fxSweat = (p: Pen) => p.poly([[30, 6], [52, 54], [30, 84], [8, 54]], "#9fd4ff", 5);

// ---------------- painted textures ----------------
/** where the windows sit on the fuselage texture (v, fraction of the circumference from the belly) */
export const WIN_V0 = 0.355, WIN_DV = 0.045;
/** window i (0..21) spans u = WIN_U0 + i * WIN_DU .. + WIN_W */
export const WIN_U0 = 356 / 2048, WIN_DU = 64 / 2048, WIN_W = 40 / 2048;
/** fuselage skin, u along the body (0 = tail, 1 = nose), v around (0.25 = left side, 0.5 = top, 0.75 = right); round / square windows */
export const fuselageTex = (round: boolean, livery: string, stripe: string, title: string) => (g: G, r: () => number) => {
  const W = 2048, H = 512;
  g.fillStyle = "#d9dee4"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#f7f7f5"; g.fillRect(0, H * 0.3, W, H * 0.4);                     // white top half (v 0.3..0.7)
  g.fillStyle = livery; g.fillRect(0, H * 0.31, W, 22); g.fillRect(0, H * 0.67, W, 22);   // cheat lines
  g.fillStyle = stripe; g.fillRect(0, H * 0.33, W, 10); g.fillRect(0, H * 0.655, W, 10);
  for (const vc of [0.33, 0.67]) {
    for (let i = 0; i < 22; i++) {
      const x = 360 + i * 64, y = H * (vc < 0.5 ? WIN_V0 : 1 - WIN_V0 - WIN_DV);
      if (round) { g.fillStyle = "#2a3a5a"; g.beginPath(); g.roundRect(x + 4, y, 26, WIN_DV * H, 10); g.fill(); ink(g, 4); g.stroke(); }
      else { g.fillStyle = "#2a3a5a"; g.fillRect(x - 4, y, 40, WIN_DV * H); ink(g, 4); g.strokeRect(x - 4, y, 40, WIN_DV * H); }
    }
    void title;
  }
  g.strokeStyle = "rgba(60,70,90,0.25)"; g.lineWidth = 2; for (let x = 0; x < W; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let x = 0; x < W; x += 16) for (const y of [H * 0.2, H * 0.8]) { g.fillStyle = "rgba(60,70,90,0.35)"; g.fillRect(x, y, 3, 3); }
  void r;
};
export const terminalTex = (g: G, r: () => number) => {
  g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 12; i++) { g.fillStyle = "#8fc7e8"; g.fillRect(30 + i * 82, 160, 60, 220); ink(g, 6); g.strokeRect(30 + i * 82, 160, 60, 220); }
  g.fillStyle = "#2f5f6a"; g.fillRect(0, 0, 1024, 90); g.fillStyle = "#f7f0d0"; g.textAlign = "center"; g.font = "900 64px Georgia, 'DejaVu Serif', serif"; g.fillText("AIRPORT", 512, 68);
  void r;
};
export const hangarTex = (g: G, r: () => number) => { g.fillStyle = "#8a96a4"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 16; i++) { g.fillStyle = shade("#8a96a4", 0.88 + 0.2 * r()); g.fillRect(i * 32, 0, 30, 512); } };
export const panelTex = (g: G, r: () => number) => {
  g.fillStyle = "#c9d2dc"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "rgba(60,70,90,0.35)"; g.lineWidth = 3; for (let x = 0; x <= 1024; x += 256) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let x = 8; x < 1024; x += 24) for (const y of [16, 496]) { g.fillStyle = "#8a96a4"; g.beginPath(); g.arc(x, y, 4, 0, TWO); g.fill(); }
  void r;
};
export const cabinWallTex = (g: G) => {
  g.fillStyle = "#eef0f2"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#d9dde2"; g.fillRect(0, 380, 512, 132);
  g.strokeStyle = "rgba(120,130,140,0.4)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 380); g.lineTo(512, 380); g.stroke();
};
export const seatTex = (g: G, r: () => number) => { g.fillStyle = "#2f4f7f"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 140; i++) { g.fillStyle = r() < 0.5 ? "#3a5f94" : "#28446d"; g.fillRect(r() * 256, r() * 256, 6, 6); } g.fillStyle = "#f2ecdc"; g.fillRect(40, 0, 176, 50); };
export const tankTex = (g: G) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#6fb7d9"); gr.addColorStop(1, "#2f7fae"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 10; for (const x of [60, 120, 330]) { g.beginPath(); g.moveTo(x, 480); g.lineTo(x + 90, 40); g.stroke(); } };
