// 2D drawings for the whale short: effect cards (Pen, drawn into the cast pool) and painted textures (canvas, via
// paint.ts ctex). Same construction as toon.ts: flat fills, plum ink, no gradients except soft dust.
import { Pen, INK, mix, shade } from "./toon";
type P2 = [number, number];
type G = CanvasRenderingContext2D;
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export const MEAT = "#c4232b", MEAT_D = "#8f1820", FAT = "#f6e3d0", SKIN_W = "#56637a";
const lump = (cx: number, cy: number, r: number, seed: number, n = 28, amp = 0.22, ry = 1): P2[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, k = 1 + amp * (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 5 + seed * 2.3) * 0.5);
    return [cx + r * k * Math.cos(a), cy + r * k * ry * Math.sin(a)] as P2;
  });

// ---------------- seagulls (300 x 300, feet at y = 285) ----------------
export type GullPose = "perch" | "up" | "down";
export const fxGull = (p: Pen, pose: GullPose, expr: "neutral" | "grin" | "shock", bib = false) => {
  const W = "#fbfaf5", GR = "#aab4c2", BK = "#f2a73b";
  if (pose === "perch") {
    for (const s of [-1, 1]) p.stroke([[150 + s * 14, 232], [150 + s * 16, 280], [150 + s * 30, 284]], 6, BK);
    p.poly([[86, 214], [40, 232], [80, 240]], GR, 7); // tail
    p.ell(150, 196, 62, 46, W, 8);
    p.poly([[100, 176], [176, 170], [190, 212], [120, 226]], GR, 7); // folded wing
    p.ell(180, 124, 40, 38, W, 8);
    p.poly([[212, 122], [262, 134], [214, 144]], BK, 6);
    if (expr === "grin") { p.arc(196, 140, 14, 9, 10, 150, 4); }
    const ey = 114;
    if (expr === "shock") { p.ell(188, ey, 10, 11, "#ffffff", 4); p.dot(190, ey, 3.5); }
    else { p.dot(188, ey, 5); p.stroke([[176, ey - 12], [198, expr === "grin" ? ey - 16 : ey - 10]], 4); }
    if (bib) { p.poly([[150, 158], [206, 158], [196, 214], [160, 214]], "#f4f1ea", 6); p.stroke([[160, 176], [196, 176]], 3, "#d9455a"); p.stroke([[162, 192], [194, 192]], 3, "#d9455a"); }
  } else {
    const d = pose === "up" ? -1 : 1;
    p.poly([[150, 150], [60, 150 + d * 70], [30, 150 + d * 56], [110, 138]], GR, 8);
    p.poly([[150, 150], [240, 150 + d * 70], [270, 150 + d * 56], [190, 138]], GR, 8);
    p.ell(150, 152, 46, 26, W, 8);
    p.ell(196, 140, 24, 22, W, 7);
    p.poly([[214, 138], [248, 146], [214, 152]], BK, 5);
    if (expr === "shock") { p.ell(200, 134, 7, 8, "#ffffff", 3); p.dot(201, 134, 2.5); } else p.dot(200, 134, 4);
    p.poly([[108, 150], [70, 160], [104, 164]], GR, 6);
  }
};
/** far gull: a plain "m" stroke (200 x 100) */
export const fxGullFar = (p: Pen, k: number) => p.stroke([[20, 60 - 20 * k], [70, 40], [100, 62], [130, 40], [180, 60 - 20 * k]], 12);
export const fxFeather = (p: Pen) => {
  p.poly([[40, 150], [90, 60], [160, 30], [150, 100], [80, 160]], "#fbfaf5", 7);
  p.stroke([[36, 164], [150, 44]], 4);
};

// ---------------- smell, flies ----------------
export const fxStink = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const x0 = 70 + k * 80, pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const v = i / 16; pts.push([x0 + 22 * Math.sin(v * 7 + t * 6.283 + k * 2), 380 - v * 340]); }
    p.stroke(pts, 20, INK); p.stroke(pts, 11, "#a8c24a");
  }
};
export const fxFlies = (p: Pen, t: number) => {
  for (let k = 0; k < 4; k++) {
    const a = t * 6.283 * (1 + k * 0.5) + k * 1.7, x = 150 + 100 * Math.cos(a) * (0.5 + 0.12 * k), y = 150 + 80 * Math.sin(a * 1.3 + k);
    p.ell(x - 7, y - 8, 9, 5, "#dfe8f2", 2, 0, 360, -30); p.ell(x + 7, y - 8, 9, 5, "#dfe8f2", 2, 0, 360, 30);
    p.dot(x, y, 8);
  }
};

// ---------------- thought bubble (700 x 600): tail bottom-left ----------------
const miniWhale = (p: Pen, cx: number, cy: number, s: number, dead = true) => {
  const body: P2[] = [[-150, 10], [-120, -34], [-20, -52], [90, -50], [150, -30], [156, 20], [130, 44], [0, 48], [-110, 36]].map(([x, y]) => [cx + x * s, cy + y * s]);
  p.poly([[cx - 140 * s, cy + 6 * s], [cx - 200 * s, cy - 40 * s], [cx - 176 * s, cy + 8 * s], [cx - 204 * s, cy + 50 * s]], SKIN_W, 7 * s);
  p.poly(body, SKIN_W, 8 * s);
  p.stroke([[cx + 60 * s, cy + 30 * s], [cx + 150 * s, cy + 24 * s]], 4 * s);
  if (dead) { for (const d of [-1, 1]) p.stroke([[cx + 96 * s - 9 * s, cy - 12 * s - 9 * s * d], [cx + 96 * s + 9 * s, cy - 12 * s + 9 * s * d]], 5 * s); }
  else { p.dot(cx + 96 * s, cy - 12 * s, 7 * s); p.arc(cx + 110 * s, cy + 22 * s, 22 * s, 12 * s, 20, 150, 4 * s); }
};
const miniBoulder = (p: Pen, cx: number, cy: number, s: number) => {
  p.poly(lump(cx, cy, 120 * s, 3, 14, 0.2, 0.62), "#9a9aa2", 8 * s);
  p.stroke([[cx - 40 * s, cy - 30 * s], [cx - 10 * s, cy - 6 * s], [cx - 30 * s, cy + 20 * s]], 4 * s);
  p.stroke([[cx + 50 * s, cy - 20 * s], [cx + 30 * s, cy + 10 * s]], 4 * s);
};
export const fxBubble = (p: Pen, kind: "boulder" | "poof", t: number) => {
  p.ell(96, 560, 20, 16, "#ffffff", 8); p.ell(150, 500, 34, 26, "#ffffff", 9);
  const cl: P2[] = [];
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, k = 1 + 0.07 * Math.abs(Math.sin(a * 5)); cl.push([370 + 300 * k * Math.cos(a), 250 + 210 * k * Math.sin(a)]); }
  p.poly(cl, "#ffffff", 10);
  if (kind === "boulder") {
    miniWhale(p, 240, 250, 0.62);
    p.stroke([[392, 236], [432, 236]], 9); p.stroke([[392, 262], [432, 262]], 9);
    miniBoulder(p, 540, 252, 0.62);
  } else {
    // t < 0.45: the whale; then a "poof" of sparkles and an empty patch of sand
    p.stroke([[160, 330], [580, 330]], 6, "#d9b98a");
    if (t < 0.45) { miniWhale(p, 370, 268, 1.0); p.band([[330, 322], [410, 322]], "#d63a2f", 16, 3, "round"); }
    else {
      const u = (t - 0.45) / 0.55;
      for (let i = 0; i < 7; i++) {
        const a = rad(i * 51 + 10), d = 60 + 130 * u, x = 370 + d * Math.cos(a), y = 250 + d * 0.7 * Math.sin(a), r = 26 * (1 - 0.5 * u), pts: P2[] = [];
        for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * 0.35 : r, b = rad(k * 45); pts.push([x + rr * Math.cos(b), y + rr * Math.sin(b)]); }
        p.poly(pts, "#ffe066", 5);
      }
      if (u < 0.5) p.poly(lump(370, 260, 110 * (0.6 + u), 5, 18, 0.25, 0.7), "#ffffff", 7);
    }
  }
};

// ---------------- blast: clouds, splats, bits ----------------
/** cartoon cloud lump (400 x 400) with an ink edge */
export const fxCloud2 = (p: Pen, col: string, seed: number) => {
  const pts: P2[] = [];
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, k = 1 + 0.1 * Math.abs(Math.sin(a * 4 + seed)) + 0.05 * Math.sin(a * 9 + seed * 3); pts.push([200 + 160 * k * Math.cos(a), 200 + 150 * k * Math.sin(a)]); }
  p.poly(pts, col, 9);
  p.clip(pts, () => { p.ell(250, 270, 150, 120, shade(col, 0.86), 0); p.ell(150, 140, 60, 40, mix(col, "#ffffff", 0.35), 0); });
  p.poly(pts, null, 9);
};
/** wet splat seen from above (400 x 400), for the ground */
export const fxSplat = (p: Pen, seed: number, col = MEAT) => {
  const pts: P2[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, spike = i % 5 === Math.floor(rnd(seed, 1) * 5) ? 1.5 + 0.5 * rnd(seed, i) : 1;
    pts.push([200 + 105 * spike * (0.85 + 0.25 * rnd(seed, i + 9)) * Math.cos(a), 200 + 105 * spike * (0.85 + 0.25 * rnd(seed, i + 9)) * Math.sin(a)]);
  }
  p.poly(pts, col, 7);
  for (let i = 0; i < 6; i++) { const a = rnd(seed, i + 50) * 6.283, d = 150 + 35 * rnd(seed, i + 60); p.ell(200 + d * Math.cos(a), 200 + d * Math.sin(a), 12 + 8 * rnd(seed, i), 10 + 6 * rnd(seed, i), col, 5); }
  p.ell(170, 170, 34, 20, mix(col, "#ffffff", 0.45), 0, 0, 360, -30);
};
/** small flying bits, upright (300 x 300): t spreads them */
export const fxBits = (p: Pen, t: number, col = MEAT) => {
  for (let i = 0; i < 9; i++) {
    const a = rad(200 + i * 17 + 9 * (i % 2)), d = 30 + 130 * t * (0.6 + 0.4 * rnd(i, 2)), x = 150 + d * Math.cos(a), y = 250 + d * Math.sin(a) + 150 * t * t, r = 13 * (1 - 0.4 * t) * (0.6 + 0.6 * rnd(i, 4));
    if (y < 285) p.ell(x, y, r, r * 0.8, i % 3 ? col : FAT, 4);
  }
};
export const fxShards = (p: Pen, t: number) => {
  for (let i = 0; i < 10; i++) {
    const a = rad(190 + i * 18), d = 40 + 170 * t, x = 200 + d * Math.cos(a), y = 300 + d * Math.sin(a) + 220 * t * t, r = 22 * (1 - 0.3 * t), b = i * 1.3 + t * 9;
    p.poly([[x + r * Math.cos(b), y + r * Math.sin(b)], [x + r * Math.cos(b + 2.2), y + r * Math.sin(b + 2.2)], [x + r * 0.7 * Math.cos(b + 4), y + r * 0.7 * Math.sin(b + 4)]], "#d7f1ff", 4);
  }
};
/** radial speed line, pointing +x (400 x 80) */
export const fxStreak = (p: Pen, col = MEAT) => { p.poly([[10, 40], [300, 22], [390, 40], [300, 58]], col, 5); };
/** a hub cap (200 x 200) */
export const fxHub = (p: Pen) => { p.ell(100, 100, 84, 84, "#cfd4da", 9); p.ell(100, 100, 50, 50, "#9aa1aa", 6); p.ell(100, 100, 16, 16, "#e8ecf0", 5); };
/** a boot coming down, side-on (300 x 400): sole at y = 380 */
export const fxBoot = (p: Pen) => {
  p.poly([[110, 0], [200, 0], [204, 250], [280, 300], [286, 352], [96, 352]], "#f4f1ea", 10);
  p.poly([[88, 348], [292, 348], [292, 380], [88, 380]], "#e2453c", 9);
  p.stroke([[120, 60], [196, 60]], 8, "#3b5b9a"); p.stroke([[120, 86], [196, 86]], 8, "#3b5b9a");
};
/** ketchup squirt, side-on fan (500 x 300): origin bottom centre */
export const fxSquirt = (p: Pen, t: number) => {
  const e = 1 - (1 - t) ** 2;
  for (let i = 0; i < 13; i++) {
    const a = rad(188 + i * 13.5), d = (60 + 190 * e) * (0.55 + 0.45 * rnd(i, 1)), x = 250 + d * Math.cos(a), y = 285 + d * 0.85 * Math.sin(a), r = (9 + 9 * rnd(i, 2)) * (1 - 0.4 * t);
    const x0 = 250 + 0.45 * d * Math.cos(a), y0 = 285 + 0.4 * d * Math.sin(a), nx = -Math.sin(a) * r * 0.5, ny = Math.cos(a) * r * 0.5;
    p.poly([[x0, y0], [x + nx, y + ny], [x - nx, y - ny]], "#d42a2a", 4);
    p.ell(x, y, r, r * 0.85, "#d42a2a", 4);
  }
};

// ---------------- painted textures (plain canvas) ----------------
const ink = (g: G, w: number) => { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; };
/** whale skin: u around the body (0 = back, 0.5 = belly), v along it; slate back, pale scarred belly */
export const whaleSkin = (g: G, r: () => number) => {
  const W = 1024, H = 512;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#4a566e"); gr.addColorStop(0.3, "#56637a"); gr.addColorStop(0.42, "#8b93a3"); gr.addColorStop(0.5, "#c9c7c2"); gr.addColorStop(0.58, "#8b93a3"); gr.addColorStop(0.7, "#56637a"); gr.addColorStop(1, "#4a566e");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(30,36,52,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * H, l = 30 + r() * 110; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l * 0.3, y + 6, x + l * 0.7, y - 6, x + l, y + (r() - 0.5) * 12); g.stroke(); }
  g.strokeStyle = "rgba(236,238,240,0.5)"; g.lineWidth = 2.5;
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, l = 20 + r() * 50; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 20); g.stroke(); }
  g.fillStyle = "rgba(40,46,62,0.3)";
  for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(r() * W, r() * H, 6 + r() * 16, 4 + r() * 8, r() * 3, 0, 6.3); g.fill(); }
};
/** the cut end / a chunk: meat with a blubber rim and marbling (512 x 512, radial) */
export const meatTex = (g: G, r: () => number) => {
  g.fillStyle = SKIN_W; g.fillRect(0, 0, 512, 512);
  g.fillStyle = FAT; g.beginPath(); g.arc(256, 256, 236, 0, 6.3); g.fill();
  g.fillStyle = MEAT; g.beginPath();
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * 6.283, k = 186 + 14 * Math.sin(a * 6); g.lineTo(256 + k * Math.cos(a), 256 + k * Math.sin(a)); }
  g.fill();
  g.strokeStyle = MEAT_D; g.lineWidth = 9; g.lineCap = "round";
  for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = r() * 150, x = 256 + d * Math.cos(a), y = 256 + d * Math.sin(a); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y + 10, x + 44 * Math.cos(a + 1), y + 44 * Math.sin(a + 1)); g.stroke(); }
  g.strokeStyle = "rgba(246,227,208,0.75)"; g.lineWidth = 6;
  for (let i = 0; i < 9; i++) { const a = r() * 6.283, d = 40 + r() * 120, x = 256 + d * Math.cos(a), y = 256 + d * Math.sin(a); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 * Math.cos(a + 2), y + 30 * Math.sin(a + 2)); g.stroke(); }
  g.fillStyle = "#e8eef2"; g.beginPath(); g.arc(256, 250, 34, 0, 6.3); g.fill(); ink(g, 6); g.stroke(); // the spine
};
/** chunk wrap: bands of skin / fat / meat (256 x 256, v = latitude) */
export const chunkTex = (g: G, r: () => number) => {
  g.fillStyle = MEAT; g.fillRect(0, 0, 256, 256);
  g.fillStyle = FAT; g.fillRect(0, 0, 256, 92);
  g.fillStyle = SKIN_W; g.fillRect(0, 0, 256, 52);
  g.fillStyle = MEAT_D;
  for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * 256, 120 + r() * 130, 8 + r() * 14, 4 + r() * 6, r() * 3, 0, 6.3); g.fill(); }
  g.fillStyle = "rgba(255,170,170,0.6)";
  for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(r() * 256, 110 + r() * 130, 5 + r() * 8, 3, r() * 3, 0, 6.3); g.fill(); }
};
const boards = (g: G, w: number, h: number, n: number, base: string, r: () => number) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(base, 0.9 + 0.2 * r()); g.fillRect(0, (i * h) / n, w, h / n);
    g.strokeStyle = "rgba(60,36,24,0.35)"; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const y = (i + r()) * (h / n); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y + 2); g.stroke(); }
    g.fillStyle = "rgba(40,26,20,0.85)"; g.fillRect(0, (i * h) / n - 2, w, 4);
  }
};
export const crateTex = (g: G, r: () => number) => {
  boards(g, 512, 320, 4, "#c99a5b", r);
  ink(g, 14); g.strokeRect(7, 7, 498, 306);
  g.fillStyle = "#b3251f"; g.font = "900 78px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("DYNAMITE", 256, 150);
  g.font = "900 40px Arial Black, Arial, sans-serif"; g.fillText("DANGER", 256, 240);
  g.strokeStyle = "#b3251f"; g.lineWidth = 8; g.strokeRect(40, 80, 432, 196);
};
export const crateTop = (g: G, r: () => number) => { boards(g, 256, 256, 3, "#b98a4e", r); ink(g, 12); g.strokeRect(6, 6, 244, 244); };
export const woodTex = (g: G, r: () => number) => boards(g, 256, 256, 5, "#a8744a", r);
/** highway sign face (512 x 640) */
export const signTex = (g: G) => {
  g.fillStyle = "#f7f5ee"; g.fillRect(0, 0, 512, 640); ink(g, 22); g.strokeRect(11, 11, 490, 618);
  g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 82px Arial Black, Arial, sans-serif"; g.fillText("STATE", 256, 110); g.fillText("HIGHWAY", 256, 205);
  // shield
  g.beginPath(); g.moveTo(126, 290); g.quadraticCurveTo(256, 250, 386, 290); g.quadraticCurveTo(410, 470, 256, 585); g.quadraticCurveTo(102, 470, 126, 290); g.closePath();
  g.fillStyle = "#f7f5ee"; g.fill(); ink(g, 18); g.stroke();
  g.fillStyle = INK; g.font = "900 54px Arial Black, Arial, sans-serif"; g.fillText("OREGON", 256, 345);
  g.font = "900 150px Arial Black, Arial, sans-serif"; g.fillText("101", 256, 455);
};
/** the plan (512 x 1024): three panels top to bottom, no words */
export const planTex = (g: G) => {
  g.fillStyle = "#2f5f9a"; g.fillRect(0, 0, 512, 1024);
  g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = 2;
  for (let i = 0; i < 1024; i += 32) { g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); if (i < 512) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke(); } }
  g.strokeStyle = "#f4f8ff"; g.lineWidth = 6; g.strokeRect(16, 16, 480, 992);
  for (const y of [345, 680]) { g.beginPath(); g.moveTo(16, y); g.lineTo(496, y); g.stroke(); }
  const p = new Pen(g);
  // 1: whale + sticks under it
  miniWhale(p, 270, 170, 1.05);
  for (let i = 0; i < 6; i++) p.band([[150 + i * 34, 262], [150 + i * 34, 222]], "#e2453c", 20, 4, "butt");
  p.stroke([[354, 240], [420, 280], [470, 262]], 5, "#f4f8ff");
  // 2: boom
  const star: P2[] = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283, rr = i % 2 ? 80 : 150; star.push([256 + rr * Math.cos(a), 512 + rr * Math.sin(a)]); }
  p.poly(star, "#ffd84a", 9);
  const st2: P2[] = star.map(([x, y]) => [256 + (x - 256) * 0.5, 512 + (y - 512) * 0.5]);
  p.poly(st2, "#ff8a2a", 7);
  // 3: tiny bits and a happy gull
  for (let i = 0; i < 14; i++) p.ell(70 + (i % 7) * 34 + (i > 6 ? 16 : 0), 800 + (i > 6 ? 60 : 0) + 14 * Math.sin(i * 2.1), 9, 7, i % 3 ? "#e2453c" : FAT, 4);
  g.save(); g.translate(300, 720); g.scale(0.72, 0.72); fxGull(new Pen(g), "perch", "grin", true); g.restore();
  g.fillStyle = "#e2453c"; g.beginPath(); // heart
  g.moveTo(452, 760); g.bezierCurveTo(420, 720, 400, 770, 452, 806); g.bezierCurveTo(504, 770, 484, 720, 452, 760); g.fill(); ink(g, 5); g.stroke();
  // arrows between panels
  g.fillStyle = "#f4f8ff";
  for (const y of [345, 680]) { g.beginPath(); g.moveTo(232, y - 22); g.lineTo(280, y - 22); g.lineTo(256, y + 22); g.closePath(); g.fill(); ink(g, 5); g.stroke(); }
};
/** the sale banner (1024 x 1024): three stacked lines so it reads in a vertical frame */
export const bannerTex = (g: G) => {
  g.fillStyle = "#ffd84a"; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#e2453c"; g.fillRect(0, 0, 1024, 56); g.fillRect(0, 968, 1024, 56);
  ink(g, 22); g.strokeRect(11, 11, 1002, 1002);
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  const line = (txt: string, y: number, px: number, fill: string) => { g.font = `900 ${px}px Arial Black, Arial, sans-serif`; g.lineWidth = px * 0.16; g.strokeStyle = INK; g.strokeText(txt, 512, y); g.fillStyle = fill; g.fillText(txt, 512, y); };
  line("GET A", 170, 130, "#ffffff");
  line("WHALE", 370, 250, "#e2453c");
  line("OF A DEAL!", 580, 150, "#ffffff");
  g.save(); g.translate(512, 800); const p = new Pen(g); miniWhale(p, 0, 0, 1.5, false);
  p.stroke([[80, -84], [70, -150]], 10, "#7ec8f0"); p.stroke([[80, -84], [120, -140]], 10, "#7ec8f0"); p.stroke([[80, -84], [30, -134]], 10, "#7ec8f0");
  g.restore();
};
export const packetTex = (g: G) => {
  g.fillStyle = "#e2453c"; g.fillRect(0, 0, 256, 160); ink(g, 12); g.strokeRect(6, 6, 244, 148);
  g.fillStyle = "#f7f5ee"; g.fillRect(6, 6, 244, 22); g.fillRect(6, 132, 244, 22);
  g.fillStyle = "#ffffff"; g.font = "900 44px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 9; g.strokeStyle = INK; g.strokeText("KETCHUP", 128, 82); g.fillText("KETCHUP", 128, 82);
};
/** sand (1024 x 1024): warm base, broad soft patches, ripple strokes, pebbles; wet = darker near the sea */
export const sandTex = (g: G, r: () => number) => {
  g.fillStyle = "#ecd2a0"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? "rgba(246,226,184,0.5)" : "rgba(214,182,132,0.35)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 110, 14 + r() * 30, (r() - 0.5) * 0.5, 0, 6.3); g.fill(); }
  g.strokeStyle = "rgba(176,140,96,0.55)"; g.lineWidth = 4; g.lineCap = "round";
  for (let i = 0; i < 70; i++) { const x = r() * 1024, y = r() * 1024, l = 50 + r() * 130; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 10 - r() * 8, x + l, y); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? "#a98d6a" : "#f7ead0"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 6, 3 + r() * 4, r() * 3, 0, 6.3); g.fill(); }
};
export const asphaltTex = (g: G, r: () => number) => {
  g.fillStyle = "#6f7480"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,146,160,0.4)" : "rgba(70,74,88,0.4)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 50, 10 + r() * 20, r() * 3, 0, 6.3); g.fill(); }
  g.strokeStyle = "rgba(40,40,52,0.6)"; g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
};
/** dune grass tuft (256 x 256), blades from the bottom centre */
export const tuftTex = (g: G, r: () => number) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    const a = rad(-90 + (i - 7.5) * 9 + (r() - 0.5) * 10), l = 150 + r() * 90, x = 128 + (i - 7.5) * 4, tx = x + l * Math.cos(a), ty = 250 + l * Math.sin(a);
    g.beginPath(); g.moveTo(x - 7, 250); g.quadraticCurveTo(x + (tx - x) * 0.3, 250 + (ty - 250) * 0.6, tx, ty); g.quadraticCurveTo(x + (tx - x) * 0.4 + 6, 250 + (ty - 250) * 0.6, x + 7, 250); g.closePath();
    g.fillStyle = ["#7fa64a", "#93b356", "#6c9440", "#a9bf62"][i % 4]; g.fill(); ink(g, 4); g.stroke();
  }
};
/** showroom wall (1024 x 512): big windows, a door */
export const showroomTex = (g: G) => {
  g.fillStyle = "#f1e6cf"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#e2453c"; g.fillRect(0, 0, 1024, 70); ink(g, 10); g.strokeRect(0, 0, 1024, 70);
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 246;
    g.fillStyle = i === 3 ? "#7a5a3a" : "#8fc7e8"; g.fillRect(x, 130, 206, 330); ink(g, 12); g.strokeRect(x, 130, 206, 330);
    if (i < 3) { g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 14; g.beginPath(); g.moveTo(x + 30, 400); g.lineTo(x + 130, 170); g.stroke(); }
  }
};
