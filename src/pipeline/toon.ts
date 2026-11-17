// Our own flat 2D cartoon cast, drawn on a canvas. Copied from the bridge short (templates/bridge/toon.ts) and
// extended for "Niagara Barrel": Annie Edson Taylor (1901 blouse with leg-of-mutton sleeves, high collar + cameo,
// long skirt, pompadour + bun, small hat, age lines), arm poses, four new expressions, 1901 rivermen, and the cat.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
  /** Niagara additions: long skirt colour (blouse = jacket), high collar, leg-of-mutton sleeves, crow's feet, hat colours */
  skirt?: string; collar?: string; puff?: boolean; age?: boolean; hatCol?: string; ribbon?: string; brooch?: string; waist?: string;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw everything OUTSIDE a closed shape (even-odd clip against a huge rectangle) */
  clipOut(pts: P2[], fn: () => void) {
    const g = this.g; g.save(); g.beginPath(); g.rect(-1e5, -1e5, 2e5, 2e5);
    pts.forEach((q, i) => { const [x, y] = this.P(q[0], q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath(); g.clip("evenodd"); fn(); g.restore();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- rig (construction rules, docs/learning/CHARACTER-ANATOMY.md) ----------------
/** one set of proportions for every pose; lengths in head-heights (HH), widths in u (1 % of the head width) */
export const RIG = {
  shoulderDrop: 0.17, // shoulder joint below the chin
  shoulderIn: 0.88,   // joint at 88 % of the torso half width at that height: inside the silhouette, so the seam hides the root
  upperArm: 0.44, foreArm: 0.42, // bone lengths: hanging hand ends ~0.82 HH below the shoulder (hip level)
  armW: 4.4, rimW: 1.25, // sleeve fill + ink rim each side (total ~0.07 W: still a cartoon stick arm)
  waist: 0.38,        // waist line above the torso bottom (skirts, waistbands, hands-on-hips)
  hipW: 0.17,         // trouser seat half width in W
};
/** horizontal span [xmin, xmax] of a closed contour at height y (null when the line misses it) */
export const spanAt = (pts: P2[], y: number): [number, number] | null => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
    const x = x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    lo = Math.min(lo, x); hi = Math.max(hi, x);
  }
  return lo <= hi ? [lo, hi] : null;
};
/** two-bone IK in the drawing plane: shoulder S reaching for H with bones l1 / l2. The elbow bends toward `out`
 *  (+1 = screen right). Out-of-reach targets clamp to a straight arm along the same line (arm length never changes). */
export const ik2 = (S: P2, H: P2, l1: number, l2: number, out: number): { e: P2; h: P2 } => {
  let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy) || 1e-6;
  const max = (l1 + l2) * 0.998, min = Math.abs(l1 - l2) + 1;
  const dd = clamp(d, min, max);
  const h: P2 = [S[0] + (dx / d) * dd, S[1] + (dy / d) * dd];
  dx = h[0] - S[0]; dy = h[1] - S[1]; d = dd;
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = Math.atan2(dy, dx);
  const c1: P2 = [S[0] + l1 * Math.cos(base + a), S[1] + l1 * Math.sin(base + a)], c2: P2 = [S[0] + l1 * Math.cos(base - a), S[1] + l1 * Math.sin(base - a)];
  const mx = (S[0] + h[0]) / 2, score = (e: P2) => (e[0] - mx) * out + 0.25 * (e[1] - (S[1] + h[1]) / 2); // outward, then down
  return { e: score(c1) >= score(c2) ? c1 : c2, h };
};
/** a waistband that wraps a round body: top and bottom edges sag `sag` at the centre (we look down on it a little),
 *  ends land exactly on the given edges, ink rim */
export const waistband = (p: Pen, x0: number, x1: number, y: number, h: number, sag: number, fill: string, rim: number) => {
  const top: P2[] = [], bot: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, x = x0 + (x1 - x0) * t, s = sag * (1 - (2 * t - 1) ** 2); top.push([x, y - h / 2 + s]); bot.push([x, y + h / 2 + s]); }
  p.poly([...top, ...bot.reverse()], fill, rim);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "determined" | "hopeful" | "deadpan" | "worried";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  determined: { eye: ["lid", "lid"], brow: [3, -2], mouth: "smirk" },
  hopeful: { eye: ["dot", "dot"], brow: [-5, -3], mouth: "grin" },
  deadpan: { eye: ["slit", "slit"], brow: [1, 1], mouth: "dash" },
  worried: { eye: ["small", "small"], brow: [-6, 3], mouth: "wave" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false, age = false, watchcap = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = watchcap ? F.brow.map(v => clamp(v, -3, 3)) : F.brow, by = ey - (watchcap ? 13 : brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else if (watchcap) p.stroke([[x - 6 * u, by + (side < 0 ? dO : dI) * u], [x + 6 * u, by + (side < 0 ? dI : dO) * u]], 2.6 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  if (age) for (const side of [-1, 1]) { // crow's feet + a soft cheek fold: reads as 60-ish without adding detail
    const x = fx + side * (ex + 12 * u);
    p.stroke([[x, ey - 3 * u], [x + side * 5 * u, ey - 5.5 * u]], 1.7 * u);
    p.stroke([[x, ey + 1 * u], [x + side * 5 * u, ey + 2 * u]], 1.7 * u);
    p.arc(mx + side * 15 * u, my - 4 * u, 4 * u, 7 * u, side > 0 ? -60 : 170, side > 0 ? 10 : 240, 1.6 * u);
  }
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false, watchcap = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (watchcap ? 13 : brim ? 17 : 20) * u, [dI, dO] = watchcap ? F.brow.map(v => clamp(v, -3, 3)) : F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else if (watchcap) p.stroke([[ex - 6 * u, by + dO * u], [ex + 6 * u, by + dI * u]], 2.6 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat === "annie") {
    // 1901 pompadour: a fuller hair mass behind the crown, and the bun on top toward the back
    const hair = o.hair ?? "#8a7768", HHb = 2 * H.b, u = H.a / 50;
    const pp = blobPts(cx, hc - 0.1 * HHb, { ...H, a: H.a * 1.1, b: H.b * 0.98, asym: 0, egg: 0.1, seed: H.seed + 5 });
    const top = pp.filter(([, y]) => y < hc + 0.05 * HHb);
    p.shadedFill(top, hair, mul(hair, SH_FELT), light, H.a * 1.1, 0.35);
    p.inkRing(top, ow * 0.85, thick);
    const bx = cx + (side ? -0.3 : 0.12) * H.a, by = hc - H.b - 0.06 * HHb;
    const bun = blobPts(bx, by, { a: 0.36 * H.a, b: 0.28 * H.a, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: 0.2, noise: 0.01, seed: H.seed + 6 });
    p.shadedFill(bun, hair, mul(hair, SH_FELT), light, 0.36 * H.a, 0.35);
    p.inkRing(bun, ow * 0.8, thick);
    p.arc(bx, by, 0.2 * H.a, 0.14 * H.a, 200, 330, 1.4 * u);
    return;
  }
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

/** HEADWEAR FIT (CHARACTER-ANATOMY.md "Headwear"): a worn hat is built from the HEAD CONTOUR, not fixed widths.
 *  bandY  = where the band meets the head (fraction of HH below the crown); the band's ends are the contour's span
 *           there x `fit`, joined by a sagging arc (the band wraps a round head);
 *  crown  = rises `ht` from the band, top half width x `top`;
 *  brim   = ellipse `brim` x band half width: its BACK half is drawn before the crown (behind), its FRONT half after
 *           (over the forehead). Everything is rotated with the head (R about the head centre). Returns the band ends. */
const wornHat = (p: Pen, hp: P2[], R: (pts: P2[]) => P2[], cx: number, crown: number, HH: number, u: number, light: number, ow: number,
  o: { bandK: number; fit: number; ht: number; top: number; brim: number; brimT: number; col: string; brimCol?: string; dx?: number; band?: [string, number] }) => {
  const by = crown + o.bandK * HH, sp = spanAt(hp, by) ?? [cx - 50 * u, cx + 50 * u];
  const mid = (sp[0] + sp[1]) / 2 + (o.dx ?? 0), hw = ((sp[1] - sp[0]) / 2) * o.fit, sag = 0.035 * HH;
  const base: P2[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([mid - hw + 2 * hw * t, by + sag * (1 - (2 * t - 1) ** 2)]); }
  const tw = hw * o.top, body = R([...base.reverse(), [mid - tw, by - o.ht], [mid - tw * 0.92, by - o.ht - 0.02 * HH], [mid + tw * 0.92, by - o.ht - 0.02 * HH], [mid + tw, by - o.ht]]);
  const [bx, bcy] = R([[mid, by + sag * 0.6]])[0], deg = (Math.atan2(R([[mid + 1, by]])[0][1] - R([[mid, by]])[0][1], R([[mid + 1, by]])[0][0] - R([[mid, by]])[0][0]) * 180) / Math.PI;
  const brimCol = o.brimCol ?? shade(o.col, 0.85);
  if (o.brim > 0) p.ell(bx, bcy, hw * o.brim, o.brimT * HH, brimCol, ow, 180, 360, deg); // back half, behind the crown
  p.shadedFill(body, o.col, mul(o.col, SH_FELT), light, hw, 0.4);
  if (o.band) p.clip(body, () => p.band(R([[mid - hw * 1.3, by - o.band![1] * HH], [mid + hw * 1.3, by - o.band![1] * HH]]), o.band![0], 0.06 * HH, 0.8 * u));
  p.poly(body, null, ow);
  if (o.brim > 0) p.ell(bx, bcy, hw * o.brim, o.brimT * HH, brimCol, ow, 0, 180, deg); // front half, over the forehead
  return { mid, by, hw };
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall";
    if (side) {
      const { mid, by, hw } = wornHat(p, hp, R, cx, crown, HH, u, light, ow, { bandK: 0.27, fit: 1.03, ht: (tall ? 0.66 : 0.56) * HH, top: 1.1, brim: 0, brimT: 0, col: "#3a3d47", band: tall ? ["#e8c45a", (tall ? 0.6 : 0.5)] : undefined });
      p.poly(R([[mid + hw * 0.7, by - 1 * u], [mid + hw * 1.25, by + 8 * u], [mid + hw * 0.66, by + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[mid + hw * 0.4, by - (tall ? 0.66 : 0.56) * HH - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const ht = (tall ? 0.66 : 0.56) * HH;
      const { mid, by, hw } = wornHat(p, hp, R, cx, crown, HH, u, light, ow, { bandK: 0.27, fit: 1.03, ht, top: 1.1, brim: 0, brimT: 0, col: "#3a3d47", band: tall ? ["#e8c45a", 0.6] : undefined });
      const deg = (a * 180) / Math.PI, [px, py] = R([[mid + 3 * u * facing, by + 3 * u]])[0];
      p.ell(px, py, hw * 0.74, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak over the brow
      const [bx, bly] = R([[mid, by - 0.45 * ht]])[0];
      p.ell(bx, bly, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg);
      p.arc(bx, bly, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[mid, by - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    }
  } else if (o.hat === "annie") {
    // parted hair over the forehead (cut like "hair" but higher), then a small dark hat with a ribbon and a feather
    const hair = o.hair ?? "#8a7768", cut = crown + 0.34 * HH;
    const n = hp.length, keep = (y: number) => y < cut;
    const startIdx = Math.max(0, hp.findIndex(([, y], i) => keep(y) && !keep(hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([, y]) => keep(y)).map(([x, y]) => [cx + (x - cx) * 1.04, hc + (y - hc) * 1.04] as P2);
    if (arc.length >= 3) {
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0], s = side ? -1 : facing || 1;
      // soft centre parting: the lower edge sweeps up to the part and back down
      const px = cx + s * 8 * u, py = cut - 0.13 * HH;
      for (let i = 1; i < 10; i++) { const t = i / 10, x = x0 + (x1 - x0) * t; arc.push([x, (y0 + (y1 - y0) * t) - (0.13 * HH) * Math.exp(-(((x - px) / (22 * u)) ** 2))]); }
      p.shadedFill(arc, hair, mul(hair, SH_FELT), light, H.a, 0.35);
      p.poly(arc, null, ow);
      p.stroke([[px - s * 14 * u, py + 9 * u], [px - s * 30 * u, cut - 4 * u]], 1.4 * u, mix(hair, "#ffffff", 0.35)); // grey streak
      p.stroke([[px + s * 12 * u, py + 8 * u], [px + s * 30 * u, cut - 6 * u]], 1.2 * u);
    }
    // small felt hat WORN on the pompadour: band on the hair contour (hair sits ~4 % outside the skull), tipped
    // forward with the head, brim front over the hairline, plume tucked in the band at the back
    const hairHp = hp.map(([x, y]) => [cx + (x - cx) * 1.04, hc + (y - hc) * 1.04] as P2);
    const hat = o.hatCol ?? "#2e2a36", rib = o.ribbon ?? "#8c3b4a";
    const { mid, by, hw } = wornHat(p, hairHp, R, cx, crown, HH, u, light, ow, { bandK: 0.075, fit: 1.0, ht: 0.17 * HH, top: 0.88, brim: 1.38, brimT: 0.045, col: hat, dx: (side ? 6 : 3 * (facing || 1)) * u, band: [rib, 0.045] });
    const base = R([[mid - hw * 0.72, by - 0.1 * HH]])[0], tipP = R([[mid - hw * 1.12, by - 0.27 * HH]])[0];
    const md = lerp2(base, tipP, 0.5), nx = -(tipP[1] - base[1]), ny = tipP[0] - base[0], nl = Math.hypot(nx, ny);
    const plume: P2[] = [base, [md[0] + (nx / nl) * 7 * u, md[1] + (ny / nl) * 7 * u], tipP, [md[0] - (nx / nl) * 5 * u, md[1] - (ny / nl) * 5 * u]];
    p.poly(curve(plume[0], plume[1], plume[2], 8).concat(curve(plume[2], plume[3], plume[0], 8)), "#efe3c4", 2.2 * u);
    p.stroke([base, lerp2(base, tipP, 0.8)], 1.2 * u);
    const [rx, ry] = R([[mid + hw * 0.55, by - 0.05 * HH]])[0];
    p.dot(rx, ry, 4 * u, rib);
  } else if (o.hat === "cap" || o.hat === "subcap" || o.hat === "hair") {
    const cut = crown + (o.hat === "subcap" ? 0.18 : o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" || o.hat === "subcap" ? o.cap! : o.hair!;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "subcap") {
      // A turned-up watch-cap band: no projecting peak to cross the face.
      const sp = spanAt(hp, cut) ?? [cx - 40 * u, cx + 40 * u];
      const left = sp[0] + 3 * u, right = sp[1] - 3 * u;
      p.stroke(R([[left, cut - 9 * u], [cx, cut - 6 * u], [right, cut - 9 * u]]), 3 * u, shade(col, 0.65));
      p.stroke(R([[left, cut - 5 * u], [cx, cut - 2 * u], [right, cut - 5 * u]]), 1.6 * u, mix(col, "#ffffff", 0.22));
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), sp = spanAt(hp, cut) ?? [cx - 40 * u, cx + 40 * u], [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, ((sp[1] - sp[0]) / 2) * 0.72, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg); // peak spans the brow it shades
      }
    }
  } else if (o.hat === "tophat") {
    wornHat(p, hp, R, cx, crown, HH, u, light, ow, { bandK: 0.24, fit: 0.98, ht: 0.78 * HH, top: 1.06, brim: 1.42, brimT: 0.055, col: "#2e2a36", brimCol: "#1d1b22", band: [shade(o.jacket, 0.9), 0.1] });
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | ["hammer", number];

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** Niagara arm poses: hands on hips, point up-right, both up, clasped, gripping a rim in front, palms-up shrug,
   *  holding the empty purse out; gripY = rim height (design units) for "grip" */
  pose?: "hips" | "point" | "up" | "clasp" | "cross" | "grip" | "shrug" | "purse" | "hold" | "reach"; gripY?: number;
  /** contact targets for the [screen-left, screen-right] hands in FINAL canvas units (scene attachment points,
   *  see pipeline/cast.ts toCard); they override the pose for that hand. The IK keeps arm lengths constant. */
  hands?: [P2 | null, P2 | null];
  /** sit: hip height above the soles in design units (default .32 HH = sitting on the ground) */
  seat?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - (opts.seat ?? 0.32 * HH) + 0.12 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress || o.skirt) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  // ---- rig: anchors read off the actual torso contour (CHARACTER-ANATOMY.md) ----
  const shY = chin + RIG.shoulderDrop * HH, shSpan = spanAt(tp, shY) ?? [tcx - T.a, tcx + T.a];
  const sh = (side: number): P2 => [tcx + side * RIG.shoulderIn * (side > 0 ? shSpan[1] - tcx : tcx - shSpan[0]), shY];
  const l1 = RIG.upperArm * HH, l2 = RIG.foreArm * HH;
  const wy = torsoBot - RIG.waist * HH, wSpan = spanAt(tp, wy) ?? [tcx - T.a, tcx + T.a];
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  // hand targets per side (index 0 = screen-left arm), in the body frame; null = hang
  // a hanging hand rests just OUTSIDE the body's silhouette at its height (torso, or the skirt / dress flare), so it is
  // never hidden behind the body; walking swings it a little forward/back (foreshortened in a front view)
  // skirt silhouette (built here, before the arms, so hanging hands can clear its REAL edge)
  const hem = mode === "sit" ? sole - 0.3 * HH : sole - 0.1 * HH, hwS = mode === "sit" ? 0.55 * W : 0.52 * W;
  const skirtEdge = (side: number, y: number) => {
    const t = clamp((y - wy) / (hem - wy), 0, 1), w0 = side > 0 ? wSpan[1] - tcx : tcx - wSpan[0];
    const tor = spanAt(tp, y), tw = tor ? (side > 0 ? tor[1] - tcx : tcx - tor[0]) + 1.5 * u : 0;
    return tcx + side * Math.max(w0 + 0.5 * u + (hwS - w0) * t ** 1.35, tw);
  };
  const outer = (side: number, y: number) => {
    const t = spanAt(tp, y), tw = t ? (side > 0 ? t[1] : t[0]) : sh(side)[0];
    const sk = o.skirt && mode !== "fall" && y > wy ? skirtEdge(side, y) : tw;
    return side > 0 ? Math.max(tw, sk) : Math.min(tw, sk);
  };
  const hang = (side: number, fwd = 0): P2 => { const S = sh(side), y = S[1] + 0.8 * HH - 0.05 * HH * Math.abs(fwd); return [outer(side, y) + side * (0.075 * HH + 0.03 * HH * Math.max(0, -fwd * side)), y]; };
  const T2: (P2 | null)[] = [null, null];
  const pose = opts.pose;
  for (const [i, side] of [[0, -1], [1, 1]] as const) {
    const S = sh(side);
    let h: P2 | null = null;
    if (mode === "sit") h = [tcx + side * (T.a + 0.12 * HH), torsoBot + 0.02 * HH];
    else if (mode === "fall") h = [S[0] + side * 0.42 * HH, S[1] - 0.62 * HH];
    else if (pose) {
      const ps = pose === "point" ? (side > 0 ? "point" : "hips") : pose === "purse" || pose === "hold" ? (side > 0 ? "hold" : "hang") : pose;
      if (ps === "hips") h = [side > 0 ? wSpan[1] + 0.01 * HH : wSpan[0] - 0.01 * HH, wy - 0.04 * HH];
      else if (ps === "point") h = [S[0] + 0.5 * HH, S[1] - 0.66 * HH];
      else if (ps === "up") h = [S[0] + side * 0.32 * HH, S[1] - 0.78 * HH];
      else if (ps === "clasp") h = [tcx + side * 0.05 * HH, S[1] + 0.6 * HH];
      else if (ps === "cross") h = [tcx - side * 0.3 * HH, S[1] + (side > 0 ? 0.42 : 0.5) * HH];
      else if (ps === "grip") h = [tcx + side * (T.a + 0.16 * HH), opts.gripY ?? torsoBot];
      else if (ps === "shrug") h = [S[0] + side * 0.55 * HH, S[1] + 0.3 * HH];
      else if (ps === "hold") h = [S[0] - 0.02 * HH, S[1] + 0.55 * HH];
      else if (ps === "reach") h = side > 0 ? [S[0] + 0.82 * HH, S[1] + 0.1 * HH] : hang(side); // only the reaching hand moves
      else h = hang(side);
    } else if (side > 0 && rifle) h = lerp2(R0, R1, 0.1);
    else if (side > 0 && wave !== undefined) h = [S[0] + 0.3 * HH + 0.06 * HH * wave, S[1] - 0.66 * HH];
    else if (side > 0 && prop === "icecream") h = [tcx + 0.5 * T.a, S[1] + 0.42 * HH];
    else if (side > 0 && Array.isArray(prop)) { const k = clamp(prop[1], 0, 1); h = lerp2([S[0] + 0.3 * HH, S[1] - 0.6 * HH], [S[0] + 0.6 * HH, S[1] + 0.32 * HH], k); }
    else h = hang(side, side > 0 ? sw : -sw);
    T2[i] = h;
  }
  // explicit contact targets (attachment points from the scene, final canvas units) win; undo the body rotation
  if (opts.hands) opts.hands.forEach((hd, i) => {
    if (!hd) return;
    const th = -rad(A), dx = hd[0] - 300, dy = hd[1] - hipY;
    T2[i] = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
  });
  type Arm2 = { S: P2; E: P2; H: P2; side: number; front: boolean };
  const arms: Arm2[] = [-1, 1].map((side, i) => {
    const S = sh(side), { e, h } = ik2(S, T2[i]!, l1, l2, side);
    const sp = spanAt(tp, h[1]);
    // in front of the body when the hand ends over the torso (hips, clasp, cross, hold, grip near the body)
    const front = !!sp && h[0] > sp[0] - 0.04 * HH && h[0] < sp[1] + 0.04 * HH && mode !== "sit";
    return { S, E: e, H: h, side, front };
  });
  const sleeve = mix(o.jacket, mul(o.jacket, SH_CLOTH), 0.35), cuff = mul(o.jacket, SH_CLOTH);
  const aw = RIG.armW * u, rw = RIG.rimW * u;
  const armPath = (a: Arm2) => curve(a.S, a.E, a.H, 14);
  const strokeArm = (pts: P2[]) => { p.stroke(pts, aw + 2 * rw, INK); p.stroke(pts, aw, sleeve); };
  /** arm = sleeve tube with an ink rim; the shoulder root is never drawn over the torso (it emerges from the seam),
   *  a front forearm is drawn over the torso; cuff band, then the ink-dot hand just past the wrist */
  const drawArm2 = (a: Arm2) => {
    const pts = armPath(a);
    p.clipOut(tp, () => strokeArm(pts));
    if (a.front) p.clip(tp, () => strokeArm(pts.slice(Math.floor(pts.length * 0.45))));
    const n = pts.length, w0 = pts[n - 3], w1 = pts[n - 1], dx = w1[0] - w0[0], dy = w1[1] - w0[1], dl = Math.hypot(dx, dy) || 1;
    const c0: P2 = [w1[0] - (dx / dl) * 5 * u, w1[1] - (dy / dl) * 5 * u], c1: P2 = [w1[0] - (dx / dl) * 1.5 * u, w1[1] - (dy / dl) * 1.5 * u];
    p.stroke([c0, c1], aw + 2 * rw + 1.2 * u, INK); p.stroke([c0, c1], aw + 1.2 * u, cuff);
    p.dot(w1[0] + (dx / dl) * 2.5 * u, w1[1] + (dy / dl) * 2.5 * u, 5.5 * u);
  };
  // behind the body: rifle, sword, back arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  // trouser seat: the pants rise into the coat so the legs have hips to hang from (hidden under skirts/dresses)
  if (!o.skirt && !o.dress && mode !== "fall") {
    const hw = RIG.hipW * W, y0 = torsoBot - 0.18 * HH, y1 = hipY + 0.1 * HH;
    const seat: P2[] = [[tcx - hw, y0], [tcx + hw, y0], [tcx + hw * 0.92, y1], [tcx, y1 + 0.02 * HH], [tcx - hw * 0.92, y1]];
    p.poly(seat, mix(o.pants, INK, 0.35), 0);
  }
  for (const a of arms) if (!a.front) drawArm2(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (o.skirt && mode !== "fall") {
    // 1901 walking skirt tucked at the waist: blouse torso (o.jacket), then a bell skirt whose top edge IS the torso's
    // width at the waist (read off the contour, so nothing bulges past it), widening at least as fast as the torso
    // below; a waistband that wraps the body (curved, ends on the skirt edges, no overhang).
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => { p.stroke([[tcx, chin + 0.1 * HH], [tcx, wy]], 1.6 * u, mul(o.jacket, SH_CLOTH)); for (let i = 0; i < 3; i++) p.dot(tcx, chin + 0.2 * HH + i * 0.14 * HH, 2.2 * u, shade(o.jacket, 0.72)); });
    p.inkRing(tp, ow, thick);
    const hw = hwS, edge = skirtEdge;
    const sk: P2[] = [];
    for (let i = 0; i <= 14; i++) { const y = wy + ((hem - wy) * i) / 14; sk.push([edge(1, y), y]); }
    for (let i = 1; i < 14; i++) { const t = i / 14, x = edge(1, hem) - (edge(1, hem) - edge(-1, hem)) * t; sk.push([x, hem + 2.5 * u * Math.sin(t * Math.PI * 5)]); }
    for (let i = 14; i >= 0; i--) { const y = wy + ((hem - wy) * i) / 14; sk.push([edge(-1, y), y]); }
    p.gradFill(sk, o.skirt, mul(o.skirt, SH_CLOTH), light, 0.3);
    p.clip(sk, () => { for (const k of [-0.5, 0, 0.5]) p.stroke([[tcx + k * (wSpan[1] - wSpan[0]) * 0.45, wy + 0.1 * HH], [tcx + k * hw * 1.05, hem - 4 * u]], 1.5 * u, mul(o.skirt!, SH_CLOTH)); });
    p.inkRing(sk, ow, thick);
    waistband(p, edge(-1, wy), edge(1, wy), wy, 0.075 * HH, 0.02 * HH, o.waist ?? shade(o.skirt, 0.7), 1.4 * u);
  } else if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  if (o.collar) { // high collar band under the chin + cameo brooch
    const cb: P2[] = rrect(300 - 0.15 * W, chin - 0.07 * HH, 300 + 0.15 * W, chin + 0.09 * HH, 4 * u);
    p.poly(cb, o.collar, 3.2 * u);
    for (const k of [-0.07, 0.07]) p.stroke([[300 + k * W, chin - 0.04 * HH], [300 + k * W, chin + 0.07 * HH]], 1.2 * u, shade(o.collar, 0.8));
    if (o.brooch) { p.ell(300, chin + 0.13 * HH, 5.5 * u, 6.5 * u, o.brooch, 2 * u); p.ell(300, chin + 0.13 * HH, 2.4 * u, 3.2 * u, "#f3e6d8", 0); }
  }
  // in front of the body: front arms (forearms over the torso), then the sleeve heads on top of every arm root
  for (const a of arms) if (a.front) drawArm2(a);
  if (o.puff) for (const a of arms) { // leg-of-mutton sleeve heads: centred on the joint, hanging along the upper arm
    const dir = Math.atan2(a.E[1] - a.S[1], a.E[0] - a.S[0]), c: P2 = [a.S[0] + Math.cos(dir) * 0.09 * HH, a.S[1] + Math.sin(dir) * 0.09 * HH];
    const pf = blobPts(c[0], c[1], { a: 0.115 * W, b: 0.16 * HH, nTop: 2, nBot: 2.2, egg: -0.1, asym: 0, rot: dir - Math.PI / 2, noise: 0.01, seed: seed + 20 + a.side });
    p.gradFill(pf, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(pf, ow * 0.85, thick);
    p.arc(c[0], c[1], 0.06 * W, 0.09 * HH, a.side > 0 ? 200 : -20, a.side > 0 ? 260 : 40, 1.4 * u);
  }
  const hand = (side: number) => { const a = arms.find((x) => x.side === side)!, pts = armPath(a), w0 = pts[pts.length - 3], w1 = pts[pts.length - 1], dl = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) || 1; return [w1[0] + ((w1[0] - w0[0]) / dl) * 2.5 * u, w1[1] + ((w1[1] - w0[1]) / dl) * 2.5 * u] as P2; };
  // held props attach to the hand anchor
  if (prop === "icecream") {
    const [hx, hy] = hand(1);
    p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
    p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
    p.dot(hx, hy, 5.5 * u);
  } else if (Array.isArray(prop)) {
    const [hx, hy] = hand(1), ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
    const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
    p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
    p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  if (pose === "point") { const [hx, hy] = hand(1), a = arms[1], d = Math.atan2(a.H[1] - a.E[1], a.H[0] - a.E[0]); p.stroke([[hx, hy], [hx + Math.cos(d) * 13 * u, hy + Math.sin(d) * 13 * u]], 3.2 * u); }
  if (pose === "purse") { // the empty purse hangs from the right hand by its cord
    const [hx, hy] = hand(1);
    p.stroke([[hx, hy], [hx - 2 * u, hy + 10 * u]], 1.8 * u, "#d8b67a");
    const k = 1.7, bag: P2[] = [[hx - 9 * k * u, hy + 10 * u], [hx + 7 * k * u, hy + 10 * u], [hx + 13 * k * u, hy + (10 + 14 * k) * u], [hx + 8 * k * u, hy + (10 + 22 * k) * u], [hx - 10 * k * u, hy + (10 + 21 * k) * u], [hx - 14 * k * u, hy + (10 + 12 * k) * u]];
    p.poly(bag, "#7e4a33", 2.4 * u); p.stroke([[hx - 7 * k * u, hy + 15 * u], [hx + 7 * k * u, hy + 15 * u]], 1.8 * u, "#d8b67a");
    p.arc(hx - 2 * u, hy + (14 + 12 * k) * u, 6 * u, 4 * u, 200, 340, 1.6 * u, "#5a3020"); // a sad crease
    p.dot(hx, hy, 5.5 * u);
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = hand(-1);
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "subcap";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout", !!o.age, o.hat === "subcap");
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "subcap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout", o.hat === "subcap");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

// ================= Niagara Barrel cast =================
/** Annie Edson Taylor, 63 (ANNIE-DESIGN.md): pale cream face, grey-brown pompadour + bun, small dark hat with a plum
 *  ribbon and a cream feather, cream high-collar blouse with leg-of-mutton sleeves and a cameo, muted teal long skirt,
 *  brown ankle boots. Compact: "stout" build at 3.5 head-heights. */
export const ANNIE: Outfit = {
  jacket: "#f1e6d0", skirt: "#4f8783", waist: "#2f4f53", pants: "#3b3f52", boots: "#5a3b2a", hat: "annie", hair: "#8a7768",
  hatCol: "#2e2a36", ribbon: "#8c3b4a", collar: "#f7efe0", brooch: "#8c3b4a", puff: true, age: true, skin: "#fbe7cf", build: "stout",
};
/** 1901 rivermen for the cat test and the rescue: wool coats, flat caps, one moustache */
export const RIVERMAN: Outfit[] = [
  { jacket: "#4f6280", pants: "#3d3a36", boots: "#3a2a20", hat: "cap", cap: "#4a4a52", moustache: "#5a3b2a", skin: "#f5c9a0" },
  { jacket: "#8a5a3a", pants: "#3b3f52", boots: "#3a2a20", hat: "cap", cap: "#6b5a44", skin: "#ecd0b6", build: "stout" },
  { jacket: "#5d7a3a", pants: "#3d3a36", boots: "#3a2a20", hat: "tophat", skin: SKIN, moustache: "#2a201a" },
];

export type CatExpr = "indignant" | "dazed" | "smug" | "alarm";
export type CatOpts = { expr?: CatExpr; light?: number; blink?: number; wet?: boolean; pose?: "sit" | "perch" };
/** the test cat: an orange tabby on a 600 x 600 design card, sitting, feet at y = 575 (perch: paws over a rim at y 470).
 *  Same construction as the people: bean blobs with a painted crescent, thick-thin plum ink, no catchlights. */
export const cat = (p: Pen, opts: CatOpts = {}) => {
  const { expr = "indignant", light = DEF_LIGHT, blink = 0, wet = true, pose = "sit" } = opts;
  const FUR = "#e8913f", FURD = "#c26a24", BIB = "#fbf1e0", PINK = "#f2a3a3", thick = thickAngle(light), ow = 9;
  const perch = pose === "perch";
  // tail first (behind), bottle-brushed when indignant / alarmed
  const puff = expr === "indignant" || expr === "alarm" ? 1.6 : 1;
  const tail: P2[] = perch ? curve([370, 470], [480, 430], [470, 300], 14) : curve([380, 540], [520, 520], [500, 380], 14);
  p.line(tail, FUR, 34 * puff, true);
  for (let i = 3; i < tail.length - 1; i += 3) p.stroke([[tail[i][0] - 12, tail[i][1] + 4], [tail[i][0] + 14, tail[i][1] - 6]], 6, FURD);
  if (puff > 1) for (let i = 2; i < tail.length; i += 2) { const [x, y] = tail[i]; for (const s of [-1, 1]) p.stroke([[x, y], [x + s * 26, y - 10 + s * 6]], 5, INK); }
  // body
  const B: Blob = { a: 112, b: perch ? 105 : 128, nTop: 2.1, nBot: 2.6, egg: 0.22, asym: 0.03, rot: 0, noise: 0.012, seed: 41 };
  const bcy = perch ? 400 : 440, bp = blobPts(300, bcy, B);
  p.shadedFill(bp, FUR, mul(FUR, SH_CLOTH), light, B.a, 0.4);
  p.clip(bp, () => {
    p.ell(300, bcy - 10, 58, 88, BIB, 0);
    for (const s of [-1, 1]) for (const k of [0, 1, 2]) p.arc(300 + s * (78 + 6 * k), bcy - 30 + k * 34, 28, 10, s > 0 ? 160 : -20, s > 0 ? 220 : 40, 9, FURD);
  });
  p.inkRing(bp, ow, thick);
  // front paws (over the rim when perched)
  for (const s of [-1, 1]) {
    const px = 300 + s * 46, py = perch ? 470 : 560;
    p.ell(px, py, 32, 20, BIB, 7);
    for (const k of [-1, 0, 1]) p.stroke([[px + k * 10, py + 4], [px + k * 10, py + 14]], 4);
  }
  // head
  const H: Blob = { a: 118, b: 100, nTop: 2.3, nBot: 2.4, egg: -0.08, asym: 0, rot: rad(-4), noise: 0.008, seed: 42 };
  const hcx = 300, hcy = perch ? 228 : 262;
  // ears: back and flat when indignant, up when alarmed
  const flat = expr === "indignant" ? 1 : expr === "dazed" ? 0.5 : 0;
  for (const s of [-1, 1]) {
    const base0: P2 = [hcx + s * 30, hcy - 82], base1: P2 = [hcx + s * 104, hcy - 40];
    const tip: P2 = [hcx + s * (96 + 70 * flat), hcy - 150 + 85 * flat];
    p.poly([base0, tip, base1], FUR, ow);
    p.poly([lerp2(base0, base1, 0.25), lerp2(tip, lerp2(base0, base1, 0.5), 0.25), lerp2(base0, base1, 0.75)], PINK, 0);
  }
  const hp = blobPts(hcx, hcy, H);
  p.shadedFill(hp, FUR, mul(FUR, SH_SKIN), light, H.a, 0.45);
  p.clip(hp, () => {
    for (const s of [-1, 1]) p.ell(hcx + s * 40, hcy + 52, 50, 38, BIB, 0); // muzzle cheeks
    for (const dx of [-26, 0, 26]) p.stroke([[hcx + dx, hcy - 98], [hcx + dx * 0.7, hcy - 58]], 9, FURD); // forehead stripes
    for (const s of [-1, 1]) p.stroke([[hcx + s * 116, hcy - 4], [hcx + s * 84, hcy + 2]], 8, FURD);
  });
  p.inkRing(hp, ow, thick);
  // eyes
  for (const s of [-1, 1]) {
    const ex = hcx + s * 44, ey = hcy - 4;
    if (blink >= 1 || expr === "smug") { p.arc(ex, ey + 4, 18, 8, 200, 340, 6); continue; }
    if (expr === "dazed") { const sp: P2[] = []; for (let t = 1; t < 16; t++) sp.push([ex + Math.cos(t * 0.9) * t * 1.3, ey + Math.sin(t * 0.9) * t * 1.3]); p.stroke(sp, 5); continue; }
    const big = expr === "alarm";
    p.ell(ex, ey, big ? 24 : 22, big ? 24 : 19, "#e3e88a", 5);
    p.ell(ex + s * -2, ey + 2, big ? 7 : 5, big ? 15 : 13, INK, 0);
    if (expr === "indignant" || blink > 0) {
      // heavy flat upper lid, angled down to the nose: a glare
      p.clip(ellPts(ex, ey, 26, 22), () => p.poly([[ex - 30, ey - 30], [ex + 30, ey - 30], [ex + 30, ey - 4 + s * 7], [ex - 30, ey - 4 - s * 7]], FUR, 0));
      p.stroke([[ex - s * 26, ey - 2 - 8], [ex + s * 24, ey - 2 + 4]], 6);
    }
  }
  // nose, mouth, whiskers
  p.poly([[hcx - 11, hcy + 30], [hcx + 11, hcy + 30], [hcx, hcy + 42]], PINK, 4);
  if (expr === "alarm") p.ell(hcx, hcy + 66, 14, 16, MOUTH, 4);
  else if (expr === "smug") { p.arc(hcx - 12, hcy + 46, 12, 9, 10, 170, 5); p.arc(hcx + 12, hcy + 46, 12, 9, 10, 170, 5); }
  else { p.arc(hcx, hcy + 66, 22, 10, 200, 340, 5); p.stroke([[hcx, hcy + 42], [hcx, hcy + 52]], 4); } // flat little frown
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) p.stroke([[hcx + s * 62, hcy + 44 + k * 10], [hcx + s * 150, hcy + 34 + k * 22]], 3);
  // drenched: drips off the chin, ears and tail tip, and a few wet spikes on the crown
  if (wet) {
    for (const [x, y, r] of [[hcx - 70, hcy + 100, 9], [hcx + 82, hcy + 92, 8], [hcx + 20, hcy + 118, 10], [hcx - 118, hcy - 30, 7], [tail[tail.length - 1][0] + 6, tail[tail.length - 1][1] + 40, 8]] as const) {
      p.poly([[x, y - 2.2 * r], [x + r, y], [x, y + r], [x - r, y]], "#9fd4ff", 4);
    }
    for (const dx of [-16, 8, 28]) p.poly([[hcx + dx - 12, hcy - 94], [hcx + dx, hcy - 122], [hcx + dx + 10, hcy - 94]], FUR, 6);
  }
};
