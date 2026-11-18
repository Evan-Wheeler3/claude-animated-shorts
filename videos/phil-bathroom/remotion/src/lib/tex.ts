// Procedural Canvas2D textures for the built sets. Deliberately modest resolution (256-512 px, tiled) to match the
// early PC-game texel density of the approved bathroom (olive tile ~0.3 m per tile, visible but quiet variation).
// Every generator is deterministic (seeded), so stills and the animatic never shimmer between renders.
import * as THREE from "three";

let seed = 1;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const cache = new Map<string, THREE.CanvasTexture>();

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export function tex(key: string, size: number | [number, number], draw: Draw, repeat: [number, number] = [1, 1], srgb = true) {
  const k = `${key}:${repeat.join("x")}`;
  if (cache.has(k)) return cache.get(k)!;
  const [w, h] = Array.isArray(size) ? size : [size, size];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  seed = [...key].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 2147483647, 7) || 1;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(k, t);
  return t;
}

/** multi-octave blotchy noise, drawn with `alpha` in the given colours */
export function noise(g: CanvasRenderingContext2D, w: number, h: number, cols: string[], alpha = 0.18, cells = [4, 8, 16, 48]) {
  for (const n of cells) {
    const s = document.createElement("canvas");
    s.width = n;
    s.height = Math.max(1, Math.round((n * h) / w));
    const sg = s.getContext("2d")!;
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < n; x++) {
        sg.fillStyle = cols[Math.floor(rnd() * cols.length)];
        sg.globalAlpha = rnd();
        sg.fillRect(x, y, 1, 1);
      }
    g.save();
    g.globalAlpha = alpha * (n > 20 ? 0.7 : 1);
    g.imageSmoothingEnabled = true;
    // tile 3x3 so wrap edges stay continuous
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) g.drawImage(s, ox * w, oy * h, w, h);
    g.restore();
  }
}

export function speckle(g: CanvasRenderingContext2D, w: number, h: number, cols: string[], count: number, size = 1.5, alpha = 0.5) {
  for (let i = 0; i < count; i++) {
    g.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    g.fillRect(rnd() * w, rnd() * h, size * (0.5 + rnd()), size * (0.5 + rnd()));
  }
  g.globalAlpha = 1;
}

const fill = (g: CanvasRenderingContext2D, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(0, 0, w, h);
};

export const r = rnd;

// ---------- material families ----------
export const T = {
  stucco: (rep: [number, number]) =>
    tex("stucco", 256, (g, w, h) => {
      fill(g, w, h, "#c9bba1");
      noise(g, w, h, ["#a89878", "#ddd0b6", "#b8a888"], 0.25);
      speckle(g, w, h, ["#8f826a", "#efe6d2"], 2500, 1.2, 0.35);
    }, rep),
  siding: (rep: [number, number]) =>
    tex("siding", 256, (g, w, h) => {
      fill(g, w, h, "#d8d2c2");
      noise(g, w, h, ["#bfb8a6", "#e8e2d4"], 0.2);
      for (let y = 0; y < h; y += h / 8) {
        const gr = g.createLinearGradient(0, y, 0, y + h / 8);
        gr.addColorStop(0, "rgba(60,50,40,0.35)");
        gr.addColorStop(0.12, "rgba(255,255,255,0.08)");
        gr.addColorStop(1, "rgba(0,0,0,0.05)");
        g.fillStyle = gr;
        g.fillRect(0, y, w, h / 8);
      }
    }, rep),
  shingles: (rep: [number, number]) =>
    tex("shingles", 256, (g, w, h) => {
      fill(g, w, h, "#4a3f3a");
      const rows = 10, cols = 8;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const v = 50 + rnd() * 30;
          g.fillStyle = `rgb(${v + 14},${v + 4},${v - 2})`;
          const ox = (y % 2) * (w / cols / 2);
          g.fillRect(x * (w / cols) + ox + 1, y * (h / rows) + 1, w / cols - 2, h / rows - 3);
        }
      noise(g, w, h, ["#2b2420", "#6d5f55"], 0.2);
    }, rep),
  grass: (rep: [number, number]) =>
    tex("grass", 256, (g, w, h) => {
      fill(g, w, h, "#4f6a2e");
      noise(g, w, h, ["#3c5524", "#6a8538", "#5b6d2c"], 0.35, [4, 8, 16, 32, 64]);
      speckle(g, w, h, ["#7e9a45", "#2f4219", "#8a9a50"], 5000, 1.3, 0.45);
    }, rep),
  concrete: (rep: [number, number]) =>
    tex("concrete", 256, (g, w, h) => {
      fill(g, w, h, "#9c978e");
      noise(g, w, h, ["#857f76", "#b3aea4"], 0.28);
      speckle(g, w, h, ["#6f6a62", "#c8c3b9"], 3000, 1, 0.4);
      g.strokeStyle = "rgba(60,55,50,0.6)";
      g.lineWidth = 2;
      g.strokeRect(0, 0, w, h);
    }, rep),
  asphalt: (rep: [number, number]) =>
    tex("asphalt", 256, (g, w, h) => {
      fill(g, w, h, "#45444a");
      noise(g, w, h, ["#333238", "#5a5960"], 0.3);
      speckle(g, w, h, ["#77767c", "#222"], 6000, 1, 0.5);
    }, rep),
  /** 8" concrete block, 0.4 x 0.2 m units; one tile = 4 x 8 blocks = 1.6 m x 1.6 m */
  block: (rep: [number, number]) =>
    tex("block", 512, (g, w, h) => {
      fill(g, w, h, "#7b766c");
      const bw = w / 4, bh = h / 8;
      for (let y = 0; y < 8; y++)
        for (let x = -1; x < 4; x++) {
          const ox = (y % 2) * (bw / 2);
          const v = 150 + rnd() * 28;
          g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
          g.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
        }
      noise(g, w, h, ["#5f5a51", "#bdb6a6"], 0.22);
      speckle(g, w, h, ["#4d4840", "#d2cbbd"], 9000, 1.2, 0.35);
    }, rep),
  plywood: (rep: [number, number]) =>
    tex("plywood", 256, (g, w, h) => {
      fill(g, w, h, "#b48a55");
      for (let i = 0; i < 60; i++) {
        g.strokeStyle = `rgba(${90 + rnd() * 40},${60 + rnd() * 20},30,${0.15 + rnd() * 0.2})`;
        g.lineWidth = 1 + rnd() * 3;
        g.beginPath();
        const y = rnd() * h;
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 30, w * 0.6, y + (rnd() - 0.5) * 30, w, y);
        g.stroke();
      }
      noise(g, w, h, ["#7d5a31", "#d4ad78"], 0.2);
    }, rep),
  woodFloor: (rep: [number, number]) =>
    tex("woodfloor", 256, (g, w, h) => {
      fill(g, w, h, "#6b4528");
      const n = 6;
      for (let i = 0; i < n; i++) {
        const v = rnd() * 30;
        g.fillStyle = `rgb(${110 + v},${70 + v * 0.6},${40 + v * 0.3})`;
        g.fillRect((i * w) / n + 1, 0, w / n - 2, h);
        g.fillStyle = "rgba(30,15,5,0.7)";
        g.fillRect((i * w) / n, rnd() * h, w / n, 2);
      }
      noise(g, w, h, ["#4a2c15", "#9a6a40"], 0.25);
    }, rep),
  wallpaper: (rep: [number, number]) =>
    tex("wallpaper", 256, (g, w, h) => {
      fill(g, w, h, "#c8b78e");
      g.fillStyle = "rgba(150,120,70,0.35)";
      for (let x = 0; x < w; x += w / 8) g.fillRect(x, 0, w / 32, h);
      for (let y = 0; y < h; y += h / 8)
        for (let x = 0; x < w; x += w / 8) {
          g.fillStyle = "rgba(120,95,55,0.3)";
          g.beginPath();
          g.arc(x + w / 16, y + h / 16, 3, 0, Math.PI * 2);
          g.fill();
        }
      noise(g, w, h, ["#a8976e", "#ddd0ae"], 0.2);
    }, rep),
  paint: (key: string, base: string, rep: [number, number] = [1, 1]) =>
    tex(`paint-${key}`, 128, (g, w, h) => {
      fill(g, w, h, base);
      noise(g, w, h, ["#000000", "#ffffff"], 0.06);
      speckle(g, w, h, ["#000", "#fff"], 600, 1, 0.08);
    }, rep),
  garageDoor: () =>
    tex("garagedoor", [512, 384], (g, w, h) => {
      fill(g, w, h, "#e2ddd0");
      noise(g, w, h, ["#c4bfb1", "#f2eee4"], 0.18);
      const rows = 4, cols = 4;
      for (let y = 0; y < rows; y++) {
        g.fillStyle = "rgba(70,65,55,0.55)";
        g.fillRect(0, (y * h) / rows, w, 3);
        for (let x = 0; x < cols; x++) {
          const px = (x * w) / cols + 14, py = (y * h) / rows + 14, pw = w / cols - 28, ph = h / rows - 28;
          g.fillStyle = "rgba(0,0,0,0.12)";
          g.fillRect(px, py, pw, ph);
          g.fillStyle = "rgba(255,255,255,0.18)";
          g.fillRect(px + 3, py + 3, pw - 6, ph - 6);
        }
      }
    }),
  frontDoor: () =>
    tex("frontdoor", [256, 512], (g, w, h) => {
      fill(g, w, h, "#6e2a22");
      noise(g, w, h, ["#4c1b15", "#8b3a2d"], 0.25);
      for (const [x, y, pw, ph] of [[0.12, 0.06, 0.32, 0.38], [0.56, 0.06, 0.32, 0.38], [0.12, 0.5, 0.32, 0.44], [0.56, 0.5, 0.32, 0.44]]) {
        g.strokeStyle = "rgba(20,5,5,0.6)";
        g.lineWidth = 5;
        g.strokeRect(x * w, y * h, pw * w, ph * h);
        g.strokeStyle = "rgba(255,200,180,0.15)";
        g.lineWidth = 2;
        g.strokeRect(x * w + 6, y * h + 6, pw * w - 12, ph * h - 12);
      }
    }),
  steel: (rep: [number, number] = [1, 1]) =>
    tex("steel", 256, (g, w, h) => {
      fill(g, w, h, "#7d838a");
      for (let y = 0; y < h; y++) {
        g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},255,${rnd() * 0.06})`;
        g.fillRect(0, y, w, 1);
      }
      noise(g, w, h, ["#5d636a", "#a3a9b0"], 0.18);
    }, rep),
  leaves: () =>
    tex("leaves", 256, (g, w, h) => {
      fill(g, w, h, "#33471f");
      for (let i = 0; i < 900; i++) {
        const v = rnd();
        g.fillStyle = `rgb(${40 + v * 50},${60 + v * 60},${25 + v * 20})`;
        g.beginPath();
        g.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 4, 2 + rnd() * 2, rnd() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }),
  fur: (base: string, key: string) =>
    tex(`fur-${key}`, 256, (g, w, h) => {
      fill(g, w, h, base);
      noise(g, w, h, ["#000000", "#ffffff"], 0.08);
      for (let i = 0; i < 4000; i++) {
        g.strokeStyle = rnd() > 0.5 ? "rgba(60,40,20,0.12)" : "rgba(255,240,210,0.12)";
        g.lineWidth = 1;
        const x = rnd() * w, y = rnd() * h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() - 0.5) * 3, y + 4 + rnd() * 4);
        g.stroke();
      }
    }),
};

/** single-use texture with text, e.g. the GREGORY tag or the bank statement insert */
export function label(key: string, w: number, h: number, draw: Draw) {
  return tex(`label-${key}`, [w, h], draw);
}
