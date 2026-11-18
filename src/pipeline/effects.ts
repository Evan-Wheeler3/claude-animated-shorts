// Reusable 2D/2.5D effects (assets/ASSET-CATALOG.md "effects"): painted mist billows (day / golden palettes), a
// rainbow band, cartoon water-spray puffs. Character effects (stars, burst, splash, ring, notes, contact shadows) live
// in toon.ts with the drawing code. Extracted from the Niagara set during the 2026-11-17 fix pass.
import { ctex } from "./paint";
import { Pen } from "./toon";
const TAU = Math.PI * 2;

/** soft painted mist billow (lit cream top, cool lavender belly), 512 x 512, alpha edges */
export const mistTex = (seed: number, gold = false) => ctex(`nfMist${seed}${gold ? "g" : ""}`, 512, 512, (g, r) => {
  const lit = gold ? "255,240,222" : "250,252,255", mid = gold ? "236,214,214" : "228,236,246", sh = gold ? "190,180,214" : "188,202,228";
  const blobs: [number, number, number][] = [];
  for (let k = 0; k < 9; k++) blobs.push([130 + r() * 250, 170 + r() * 200, 70 + r() * 75]);
  blobs.push([256, 300, 150]);
  for (const [x, y, rad] of blobs) {
    const gr = g.createRadialGradient(x - rad * 0.25, y - rad * 0.35, rad * 0.1, x, y, rad);
    gr.addColorStop(0, `rgba(${lit},0.95)`); gr.addColorStop(0.55, `rgba(${mid},0.9)`); gr.addColorStop(0.85, `rgba(${sh},0.6)`); gr.addColorStop(1, `rgba(${sh},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
});
export const rainbowTex = () => ctex("nfRainbow", 1024, 512, (g) => {
  const cols = ["255,70,70", "255,160,60", "255,235,90", "90,210,110", "80,150,255", "150,100,230"];
  cols.forEach((c, i) => {
    const r0 = 440 - i * 16;
    g.strokeStyle = `rgba(${c},0.85)`; g.lineWidth = 17; g.beginPath(); g.arc(512, 500, r0, Math.PI, TAU); g.stroke();
  });
  // fade the feet into the mist
  g.globalCompositeOperation = "destination-out";
  const gr = g.createLinearGradient(0, 260, 0, 512); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = gr; g.fillRect(0, 260, 1024, 252);
});


/** a white spray puff (cartoon water burst, plum rim, soft-edged) on a 256 x 256 card */
export const spray = (p: Pen, seed: number) => {
  const pts: [number, number, number][] = [[128, 140, 70], [80, 150, 45], [176, 150, 48], [110, 98, 40], [158, 104, 36]];
  for (const [x, y, r] of pts) p.ell(x + (seed - 1) * 8, y, r, r * 0.85, "#2a2030", 0);
  for (const [x, y, r] of pts) p.ell(x + (seed - 1) * 8, y, r - 6, r * 0.85 - 6, "#f4fbff", 0);
  p.ell(118, 120, 30, 18, "#ffffff", 0);
};
