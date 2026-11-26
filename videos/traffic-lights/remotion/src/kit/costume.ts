// Costume pieces for the reference-style cast. Every piece is built from the body geometry the toon code hands over
// (Kit: real head outline, torso outline, shoulders, hands) and drawn with the same Pen tools as the body
// (shaded fill toward the light + thick-thin ink ring), so hats sit on the head, clothes follow the torso and all of it
// shades and tilts with the character. Use: bodyFront(p, outfit, {costume: dress(tricorn('#3a2a20'), apron(), ...)}).
import {INK, mix, shade, type Costume, type Kit} from '../../../../../templates/bridge/toon';

type P2 = [number, number];
const ellipse = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, n = 48): P2[] =>
  Array.from({length: n + 1}, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
const fill = (k: Kit, pts: P2[], col: string, dark = .72, R?: number) => { k.p.shadedFill(pts, col, shade(col, dark), k.light, R ?? k.Ha, .4); k.p.inkRing(pts, k.ow * .85, k.thick); };
const gloss = (k: Kit, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) => k.p.arc(cx, cy, rx, ry, a0, a1, 2.2 * k.u, 'rgba(255,255,255,.55)');
/** points of the head outline above a given height (the crown), in order left -> right */
const crownArc = (k: Kit, yCut: number, grow = 1.04): P2[] => {
  const cx = 300; const top = k.head.filter(([, y]) => y <= yCut).map(([x, y]) => [cx + (x - cx) * grow, k.hc + (y - k.hc) * grow] as P2);
  return top.sort((a, b) => a[0] - b[0]);
};

/** combine pieces into one costume */
export const dress = (...cs: Costume[]): Costume => ({
  torso: k => cs.forEach(c => c.torso?.(k)), behindHead: k => cs.forEach(c => c.behindHead?.(k)),
  head: k => cs.forEach(c => c.head?.(k)), hand: k => cs.forEach(c => c.hand?.(k)),
});

// ---------------- hats ----------------
/** 1690s tricorn: a low felt crown hugging the head + three turned-up brim corners, gold braid edge */
export const tricorn = (col = '#2f2622', braid = '#c9a24a'): Costume => ({head: k => {
  const u = k.u, y0 = k.crown + .42 * k.Hb, w = k.Ha * 1.42;
  const brim: P2[] = [[300 - w, y0 - 6 * u], [300 - w * .55, y0 - 22 * u], [300, y0 - 12 * u], [300 + w * .55, y0 - 22 * u], [300 + w, y0 - 6 * u],
    [300 + w * .6, y0 + 10 * u], [300, y0 + 16 * u], [300 - w * .6, y0 + 10 * u]];
  const dome = [...crownArc(k, y0, 1.06), [300 + k.Ha, y0] as P2, [300 - k.Ha, y0] as P2];
  fill(k, dome, col, .62); fill(k, brim, col, .6, w);
  k.p.stroke([brim[0], brim[1], brim[2], brim[3], brim[4]], 3 * u, braid);
  gloss(k, 300 - .2 * k.Ha, k.crown + .3 * k.Hb, .55 * k.Ha, .3 * k.Hb, 205, 260);
}});
/** flat working cap: soft crown following the head + a short peak toward the facing side */
export const flatCap = (col = '#4f5a3a'): Costume => ({head: k => {
  const u = k.u, y0 = k.crown + .4 * k.Hb;
  const dome = [...crownArc(k, y0, 1.07), [300 + k.Ha * 1.05, y0 + 2 * u] as P2, [300 - k.Ha * 1.05, y0 + 2 * u] as P2];
  fill(k, dome, col, .6);
  const peak: P2[] = [[300 - .2 * k.Ha, y0 - 2 * u], [300 + .9 * k.Ha, y0 - 6 * u], [300 + 1.35 * k.Ha, y0 + 4 * u], [300 + .3 * k.Ha, y0 + 9 * u]];
  fill(k, peak, shade(col, .75), .7);
  k.p.dot(300, k.crown - 1 * u, 4 * u, shade(col, .8));
  gloss(k, 300 - .25 * k.Ha, k.crown + .32 * k.Hb, .55 * k.Ha, .28 * k.Hb, 200, 255);
}});
/** motoring cap with brass goggles pushed up on the front */
export const motorCap = (col = '#6b5a3a'): Costume => dress(flatCap(col), {head: k => {
  const u = k.u, y = k.crown + .36 * k.Hb;
  k.p.band([[300 - 1.02 * k.Ha, y + 4 * u], [300 + 1.02 * k.Ha, y + 4 * u]], '#4a3220', 5 * u, 1.6 * u);
  for (const s of [-1, 1]) { const x = 300 + s * .38 * k.Ha;
    k.p.ell(x, y, 15 * u, 15 * u, '#c9a24a', 3 * u); k.p.ell(x, y, 10 * u, 10 * u, '#8fc4ec', 2.4 * u);
    k.p.ell(x - 3 * u, y - 3 * u, 3 * u, 2.4 * u, '#ffffff', 0); }
}});
/** full-bottomed periwig: one cloud of curls around the actual head outline down to the shoulders + a crown fringe */
export const periwig = (col = '#ece7dc'): Costume => {
  const curls = (k: Kit): P2[] => { const out: P2[] = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 + i / 10); out.push([300 + 1.07 * k.Ha * Math.cos(a), k.hc + 1.07 * k.Hb * Math.sin(a)]); }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) out.push([300 + s * (1.08 * k.Ha + 4 * k.u * (i % 2)), k.hc + .3 * k.Hb + i * .4 * k.Hb]);
    return out; };
  return {
    behindHead: k => { const r = .34 * k.Ha; const cs = curls(k);
      cs.forEach(([x, y]) => k.p.ell(x, y, r + k.ow * .5, r + k.ow * .5, INK, 0));            // one shared outline
      cs.forEach(([x, y]) => { const c = ellipse(x, y, r, r); k.p.shadedFill(c, col, shade(col, .8), k.light, r, .35); });
      cs.forEach(([x, y], i) => k.p.arc(x, y, r * .5, r * .5, 40 * i, 40 * i + 170, 1.8 * k.u, shade(col, .72))); },
    head: k => { const r = .26 * k.Ha;
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + .76 * i / 6); const x = 300 + .86 * k.Ha * Math.cos(a), y = k.hc - .05 * k.Hb + .86 * k.Hb * Math.sin(a);
        const c = ellipse(x, y, r, r); k.p.shadedFill(c, shade(col, 1.03), shade(col, .82), k.light, r, .35); k.p.inkRing(c, k.ow * .7, k.thick);
        k.p.arc(x, y, r * .45, r * .45, 30 * i, 30 * i + 160, 1.6 * k.u, shade(col, .72)); } },
  };
};

// ---------------- clothes (drawn inside the torso clip) ----------------
/** leather work apron with stitched hem and a coin pocket; straps run to the shoulders */
export const apron = (col = '#9a6a3a'): Costume => ({torso: k => {
  const u = k.u, top = k.tcy - .45 * k.Tb, w0 = .55 * k.Ta, w1 = .85 * k.Ta;
  const body: P2[] = [[k.tcx - w0, top], [k.tcx + w0, top], [k.tcx + w1, k.torsoBot + 6 * u], [k.tcx - w1, k.torsoBot + 6 * u]];
  k.p.gradFill(body, col, shade(col, .66), k.light); k.p.poly(body, null, k.ow * .7);
  for (const s of [-1, 1]) k.p.band([[k.tcx + s * w0 * .8, top], [k.shoulders[s < 0 ? 0 : 1][0] - s * 6 * u, k.chin]], shade(col, .8), 6 * u, 1.8 * u);
  const pk: P2[] = [[k.tcx - 12 * u, k.tcy + .1 * k.Tb], [k.tcx + 12 * u, k.tcy + .1 * k.Tb], [k.tcx + 11 * u, k.tcy + .45 * k.Tb], [k.tcx - 11 * u, k.tcy + .45 * k.Tb]];
  k.p.poly(pk, shade(col, .78), k.ow * .6);
  k.p.stroke([[k.tcx - w1 * .9, k.torsoBot - 2 * u], [k.tcx + w1 * .9, k.torsoBot - 2 * u]], 1.6 * u, '#e8c890');
}});
/** lace cravat (jabot) at the collar */
export const cravat = (col = '#fbf8f0'): Costume => ({torso: k => {
  const u = k.u, y = k.chin + 4 * u;
  [[0, 0, 14], [-9, 14, 11], [9, 14, 11], [0, 27, 10]].forEach(([dx, dy, r]) => { const c = ellipse(k.tcx + dx * u, y + dy * u, r * u, r * .72 * u);
    k.p.shadedFill(c, col, shade(col, .86), k.light, r * u, .3); k.p.inkRing(c, k.ow * .55, k.thick); });
}});
/** belt with a brass buckle at the waist */
export const belt = (col = '#3a2618', buckle = '#e8c45a'): Costume => ({torso: k => {
  const u = k.u, y = k.torsoBot - .22 * k.Tb;
  k.p.band([[k.tcx - 1.3 * k.Ta, y], [k.tcx + 1.3 * k.Ta, y]], col, 9 * u, 2 * u);
  k.p.poly([[k.tcx - 7 * u, y - 7 * u], [k.tcx + 7 * u, y - 7 * u], [k.tcx + 7 * u, y + 7 * u], [k.tcx - 7 * u, y + 7 * u]], buckle, 2 * u);
  k.p.poly([[k.tcx - 3 * u, y - 3 * u], [k.tcx + 3 * u, y - 3 * u], [k.tcx + 3 * u, y + 3 * u], [k.tcx - 3 * u, y + 3 * u]], col, 1.2 * u);
}});
/** gold chain dipping across the chest with a round pendant */
export const chain = (col = '#e8c45a'): Costume => ({torso: k => {
  const u = k.u, [L, R] = k.shoulders, y = k.chin + .55 * k.Tb;
  for (let i = 0; i <= 18; i++) { const t = i / 18, x = L[0] + (R[0] - L[0]) * t, yy = L[1] + (y - L[1]) * Math.sin(Math.PI * t); k.p.ell(x, yy, 2.6 * u, 2 * u, col, 1.1 * u); }
  k.p.ell(k.tcx, y + 7 * u, 6 * u, 6 * u, col, 1.6 * u); k.p.dot(k.tcx - 1.5 * u, y + 5.5 * u, 1.6 * u, '#fff6cc');
}});
/** knitted scarf wrapped at the collar, one tail blowing to the side (tail drawn outside the torso) */
export const scarf = (col = '#d9443a'): Costume => ({
  torso: k => { const u = k.u; const b: P2[] = [[k.tcx - 1.1 * k.Ta, k.chin - 2 * u], [k.tcx + 1.1 * k.Ta, k.chin - 2 * u], [k.tcx + 1.1 * k.Ta, k.chin + 14 * u], [k.tcx - 1.1 * k.Ta, k.chin + 14 * u]];
    k.p.gradFill(b, col, shade(col, .7), k.light); for (let i = -3; i <= 3; i++) k.p.stroke([[k.tcx + i * 9 * u, k.chin], [k.tcx + i * 9 * u, k.chin + 12 * u]], 1.4 * u, shade(col, .78)); },
  hand: k => { const u = k.u, x = k.tcx + .5 * k.Ta, y = k.chin + 10 * u;
    const tail: P2[] = [[x, y], [x + 30 * u, y + 6 * u], [x + 52 * u, y - 4 * u], [x + 56 * u, y + 8 * u], [x + 30 * u, y + 20 * u], [x - 2 * u, y + 16 * u]];
    k.p.shadedFill(tail, col, shade(col, .7), k.light, 30 * u, .3); k.p.inkRing(tail, k.ow * .6, k.thick);
    for (const dx of [50, 54]) k.p.stroke([[x + dx * u, y + 4 * u], [x + (dx + 6) * u, y + 10 * u]], 1.6 * u); },
});

// ---------------- hand props ----------------
/** straight razor held in a raised hand (hands[1] = right hand) */
export const razor = (hand = 1): Costume => ({hand: k => {
  const [x, y] = k.hands[hand] ?? k.hands[k.hands.length - 1], u = k.u, a = -.55, c = Math.cos(a), s = Math.sin(a);
  const R = (pts: P2[]): P2[] => pts.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
  k.p.poly(R([[-4 * u, -3 * u], [34 * u, -3 * u], [34 * u, 4 * u], [-4 * u, 4 * u]]), '#8a5a32', 1.8 * u);
  const blade = R([[-4 * u, -4 * u], [-46 * u, -7 * u], [-50 * u, 2 * u], [-44 * u, 6 * u], [-4 * u, 4 * u]]);
  k.p.shadedFill(blade, '#f4f8fc', '#a9b4c2', k.light, 20 * u, .3); k.p.inkRing(blade, k.ow * .55, k.thick);
  k.p.dot(x, y, 5.5 * u);
}});
/** a fat coin purse hanging from a hand */
export const coinBag = (hand = 0, col = '#b08048'): Costume => ({hand: k => {
  const [x, y] = k.hands[hand] ?? k.hands[0], u = k.u;
  const bag = ellipse(x, y + 22 * u, 16 * u, 18 * u); k.p.shadedFill(bag, col, shade(col, .65), k.light, 18 * u, .35); k.p.inkRing(bag, k.ow * .6, k.thick);
  k.p.band([[x - 8 * u, y + 5 * u], [x + 8 * u, y + 5 * u]], shade(col, .6), 4 * u, 1.2 * u);
  k.p.ell(x + 4 * u, y + 30 * u, 4 * u, 4 * u, '#e8c45a', 1.2 * u); k.p.dot(x, y, 5.5 * u);
}});
/** stubble dots + a gold tooth (face extras, drawn with the head) */
export const rough = (tooth = true): Costume => ({head: k => {
  const u = k.u; for (let i = 0; i < 30; i++) { const a = Math.PI * (.12 + .76 * i / 29); k.p.dot(300 + .78 * k.Ha * Math.cos(a) * (i % 2 ? 1 : .9), k.hc + .25 * k.Hb + .62 * k.Hb * Math.sin(a) * (i % 2 ? 1 : .88), 1.3 * u, 'rgba(70,60,60,.55)'); }
  if (tooth) k.p.poly([[300 + 6 * u, k.hc + .43 * k.Hb], [300 + 12 * u, k.hc + .43 * k.Hb], [300 + 12 * u, k.hc + .52 * k.Hb], [300 + 6 * u, k.hc + .52 * k.Hb]], '#f2c23a', 1 * u);
}});
/** shaving foam blob on the nose */
export const foam = (): Costume => ({head: k => { const u = k.u, x = 300 + .42 * k.Ha, y = k.hc + .12 * k.Hb;
  [[0, 0, 1], [-.9, .2, .7], [.9, .15, .75], [-.4, -.6, .6], [.45, -.55, .65]].forEach(([dx, dy, r]) => { const c = ellipse(x + dx * 15 * u, y + dy * 15 * u, 15 * r * u, 15 * r * u);
    k.p.shadedFill(c, '#ffffff', '#d6dee8', k.light, 15 * u, .3); k.p.inkRing(c, k.ow * .5, k.thick); }); }});
export {mix};
