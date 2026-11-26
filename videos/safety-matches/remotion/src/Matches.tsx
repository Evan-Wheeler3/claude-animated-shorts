// Why Safety Matches Are Safe: 16 shots at final timing to the approved voice B narration, look v2 (kit/world.ts),
// library sets (assets/library), reference-style cast with fitted costumes (kit/costume.ts), read-along captions.
// Picture only; run_mac.sh muxes audio/mix.m4a.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import type {EffectComposer} from 'postprocessing';
import {NOINK} from '../../../../templates/bridge/ink';
import {bodyFront, INK, shade, type Costume, type Kit, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import type {LensBlur} from '../../../../templates/bridge/lensblur';
import {Card, faceCards} from './kit/cards';
import {apron, cravat, dress} from './kit/costume';
import {candle, CAPTION_BOTTOM, captionActive, captionWord, captionCss, grassField, lightRig, loadCaptionFont, makePost, place, refStyle} from './kit/world';
import {FPS, SHOTS, TOTAL, lerp, lerp3, shotAt, smooth, tw} from './story';
import words from '../../voice/words.json';

export const MATCH_FRAMES = TOTAL;
loadCaptionFont(staticFile('fonts/LilitaOne.woff2'));
type Word = {word: string; line: string; start: number; end: number};
const W = words as Word[];
const T = (line: string, i = 0) => Math.round(tw(line, i) * FPS);

const IDS = ['medieval-village-megakit/floor-wooddark', 'medieval-village-megakit/floor-unevenbrick', 'medieval-village-megakit/wall-plaster-straight',
  'medieval-village-megakit/wall-plaster-window-wide-round', 'medieval-village-megakit/wall-unevenbrick-straight', 'fantasy-props-megakit/workbench',
  'fantasy-props-megakit/candlestick', 'fantasy-props-megakit/book-stack-1', 'fantasy-props-megakit/crate-wooden', 'fantasy-props-megakit/barrel',
  'fantasy-props-megakit/table-large', 'fantasy-props-megakit/shelf-small-bottles', 'fantasy-props-megakit/stool',
  'stylized-nature-megakit/commontree-1', 'stylized-nature-megakit/commontree-4', 'stylized-nature-megakit/bush-common',
  'stylized-nature-megakit/bush-common-flowers', 'stylized-nature-megakit/flower-3-group', 'pirate-kit/environment-rock-2'];
type Lib = Record<string, THREE.Group>;

// ---------- cast ("you" across the eras + the match girls) ----------
const CAVE = refStyle({jacket: '#8a5a32', pants: '#6b4a2a', boots: '#3a2a20', hat: 'hair', hair: '#2a1d16'});
const GENT = refStyle({jacket: '#3b5b9a', pants: '#2b2b33', boots: '#1d1a1a', hat: 'tophat', buttons: '#e8c45a'});
const GIRL = (c: string) => refStyle({jacket: c, pants: '#3b3f52', boots: '#3a2a20', hat: 'bonnet', dress: '#cdbf9a'});
/** a 2D match (and optional flame) held in a hand */
const matchInHand = (hand: number, lit: number): Costume => ({hand: (k: Kit) => {
  const [x, y] = k.hands[hand] ?? k.hands[0], u = k.u;
  k.p.band([[x, y + 4 * u], [x + 4 * u, y - 34 * u]], '#e8c48a', 3.5 * u, 1.2 * u, 'round'); k.p.ell(x + 4.5 * u, y - 37 * u, 4.5 * u, 6 * u, '#c0353a', 1.4 * u);
  if (lit > 0) { const s = lit; k.p.ell(x + 5 * u, y - 52 * u, 9 * u * s, 16 * u * s, '#ffb23a', 0); k.p.ell(x + 5 * u, y - 48 * u, 5 * u * s, 9 * u * s, '#fff2a8', 0); }
  k.p.dot(x, y, 5.5 * u);
}});
/** a glass bottle of acid hugged in a hand */
const acidBottle = (hand: number): Costume => ({hand: (k: Kit) => { const [x, y] = k.hands[hand], u = k.u;
  k.p.poly([[x - 14 * u, y - 10 * u], [x + 14 * u, y - 10 * u], [x + 14 * u, y + 30 * u], [x - 14 * u, y + 30 * u]], 'rgba(170,230,190,.85)', 2.4 * u);
  k.p.poly([[x - 13 * u, y + 8 * u], [x + 13 * u, y + 8 * u], [x + 13 * u, y + 29 * u], [x - 13 * u, y + 29 * u]], 'rgba(120,220,120,.9)', 0);
  k.p.poly([[x - 6 * u, y - 22 * u], [x + 6 * u, y - 22 * u], [x + 6 * u, y - 10 * u], [x - 6 * u, y - 10 * u]], '#7a5a3a', 2 * u);
  k.p.dot(x, y, 5.5 * u); }});
/** hand drill (bow-less fire drill): seated, a spindle spun between flat palms into a fireboard between the feet.
 *  t = seconds; the palms rub opposite ways ~3.5x/s and slide down the spindle, then hop back to the top. */
const SIT_H = (h: number) => h * (1.2 + 1.1) / (1 + 1.1 + 1.4);   // a seated adult card is this tall (crown to soles)
type P = [number, number];
const lerp2 = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
/** a noodle arm: a sagging curve from S to H through C, wobbling like jelly (amp in design units) */
const noodle = (S: P, C: P, H: P, amp: number, t: number): P[] => Array.from({length: 13}, (_, i) => { const s = i / 12, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
  const x = a * S[0] + b * C[0] + c * H[0], y = a * S[1] + b * C[1] + c * H[1], dx = H[0] - S[0], dy = H[1] - S[1], L = Math.hypot(dx, dy) || 1, w = amp * Math.sin(Math.PI * s) * Math.sin(t * 9 - s * 5);
  return [x - dy / L * w, y + dx / L * w]; });
/** hand drill (bow-less fire drill): seated, a spindle spun between flat palms into a fireboard pinned by the feet.
 *  t = seconds; weak 0..1 slows the rubbing and makes the arms wobble; drop 0..1 the arms give out: hands slide off,
 *  arms flop to the ground like noodles, the spindle tips over. */
const drill = (t: number, weak = 0, drop = 0) => {
  const rub = Math.sin(t * 22 * (1 - .6 * weak)) * (1 - .6 * weak) * (1 - drop), slide = drop > 0 ? 1 : (t * .55) % 1;
  const armPose = (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number}): P[] => { const u = g.u;
    const hy0 = g.chin + (.3 + .35 * slide) * g.HH + side * rub * 5 * u, hx0 = 300 + side * (9 * u) + side * rub * 3 * u;
    const hx = lerp(hx0, 300 + side * 82 * u, drop), hy = lerp(hy0, 975 - 12 * u, drop);                              // hands flop to the ground beside him
    const C: P = [lerp(S[0] + side * (30 + 10 * weak) * u, S[0] + side * 70 * u, drop), lerp((S[1] + hy0) / 2 + (8 + 25 * weak) * u, g.chin + .75 * g.HH, drop)];
    const jelly = drop > 0 ? 16 * u * Math.exp(-2.5 * drop) * Math.sin(drop * 40) + 7 * u * drop : 7 * u * weak;
    return noodle(S, C, [hx, hy], jelly, t + side); };
  const costume: Costume = {hand: (k: Kit) => { const u = k.u, p = k.p, rot = p.rot; const [a, b] = k.hands;
    const grip = p.P((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 40 * u); p.rot = null;
    const tip: P = [300, 975 - 13 * u], len = Math.hypot(grip[0] - tip[0], grip[1] - tip[1]), fall = drop > 0 ? 1.25 * smooth(drop * 1.6) : 0;
    const top: P = drop > 0 ? [tip[0] + Math.sin(fall) * 150 * u, tip[1] - Math.cos(fall) * 150 * u] : [grip[0], tip[1] - len];
    for (const sd of [-1, 1]) { const hip: P = [300 + sd * 16 * u, k.torsoBot - .12 * k.HH], knee: P = [300 + sd * 62 * u, k.torsoBot - .42 * k.HH],   // knees up, feet pin the board
      ft: P = [300 + sd * 38 * u, 975 - 20 * u]; p.stroke([hip, knee, ft], 5.8 * u, INK);
      p.stroke([[ft[0] - sd * 4 * u, ft[1]], [ft[0] + sd * 10 * u, ft[1] - 2 * u]], 10.5 * u, INK); p.stroke([[ft[0] - sd * 4 * u, ft[1]], [ft[0] + sd * 10 * u, ft[1] - 2 * u]], 7.5 * u, '#3a2a20'); }
    p.poly([[300 - 46 * u, 975 - 16 * u], [300 + 46 * u, 975 - 16 * u], [300 + 50 * u, 975 - 3 * u], [300 - 50 * u, 975 - 3 * u]], '#9a6a3c', 2 * u);   // fireboard
    p.ell(300, 975 - 15 * u, 7 * u, 2.6 * u, '#3a2414', 0);                                                                                       // burnt notch
    const glow = Math.min(1, t / 3) * (1 - smooth(drop * 2));
    if (glow > 0) p.ell(300, 975 - 15 * u, 4 * u * (.6 + .4 * Math.sin(t * 13)), 1.8 * u, `rgba(255,140,40,${glow})`, 0);                         // ember glow builds, dies when he stops
    p.band([tip, top], '#c49a62', 5 * u, 1.6 * u, 'round');                                                                                       // spindle
    if (drop === 0) for (let i = 0; i < 4; i++) { const sx = Math.sin(t * 22 * (1 - .6 * weak) + i * 1.6) * 2 * u, f = .15 + .22 * i;          // spin marks
      const q: P = [tip[0] + (top[0] - tip[0]) * f, tip[1] + (top[1] - tip[1]) * f]; p.stroke([[q[0] + sx - 1.2 * u, q[1]], [q[0] + sx + 1.2 * u, q[1] - 2 * u]], 1.4 * u, '#7a5430'); }
    p.rot = rot; }};
  return {armPose, costume, armFront: true, mode: 'sit' as const, tilt: 3.5 * rub + 7 * drop, headTilt: -2 * rub + 12 * drop};
};
/** sweat drops flicking off the head + a pant puff (head hook) */
const sweat = (t: number, on: number): Costume['head'] => (k: Kit) => { if (on <= 0) return; const u = k.u;
  for (const [sx, ph] of [[-1, 0], [1, .45], [1, .8]] as const) { const q = (t * .9 + ph) % 1, x = 300 + sx * (k.Ha + 6 * u + 14 * u * q), y = k.hc - .2 * k.Hb + 30 * u * q * q;
    k.p.poly([[x, y - 9 * u], [x + 5 * u, y + 2 * u], [x, y + 7 * u], [x - 5 * u, y + 2 * u]], `rgba(140,200,255,${on * (1 - q)})`, 1.6 * u); } };
/** a 3D puff of smoke rising from a point: grey, grows with `amount` (0..1) */
const smoke = (scene: THREE.Scene, n = 8, col = '#d8d4cc', size = .018) => Array.from({length: n}, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(size * (1 + .4 * (i % 3)), 12, 8),
  new THREE.MeshBasicMaterial({color: col, transparent: true, opacity: 0, depthWrite: false})); m.layers.set(NOINK); scene.add(m);
  return (t: number, p: number[], amount: number) => { const k = (t * .45 + i / n) % 1; m.scale.setScalar(.5 + 2.2 * k);
    const sc = size / .018; m.position.set(p[0] + ((.08 + .25 * k) * Math.sin(i * 2.3) * k + .06 * k) * sc, p[1] + .3 * k * sc, p[2] + .04 * sc); (m.material as THREE.MeshBasicMaterial).opacity = .5 * amount * Math.sin(Math.PI * k); }; });
/** world position of a point on a figure card (design units, 600 x 1000) */
const onCard = (c: Card, x: number, y: number) => { c.mesh.updateMatrixWorld(true); return c.mesh.localToWorld(new THREE.Vector3(x / 600 - .5, .975 - y / 1000, 0)).toArray(); };
/** striking a match on a hand-held box (front view). Screen-left hand holds the box at the chest, the other hand holds the match.
 *  strokes = [frame, frame, ...] (each ~6 frames, head dragged along the box's striker strip, left to right); lit = frame it catches;
 *  raise 0..1 lifts the lit match up to show it; gone = the match has been tossed (only the box remains) */
const striker = (f: number, strokes: number[], lit: number, raise: number, gone: boolean, t: number) => {
  let st = 0, inStroke = false; for (const s0 of strokes) { const k = (f - s0) / 6; if (k >= 0 && k <= 1) { st = k; inStroke = true; } else if (k > 1 && k < 2.2) st = 1 - (k - 1) / 1.2; }
  const geo = (g: {u: number; HH: number; chin: number; tcx: number}) => { const u = g.u, B: P = [g.tcx - 4 * u, g.chin + .62 * g.HH];
    const head: P = [B[0] - 20 * u + 44 * u * (inStroke ? st * st : st), B[1] + 9 * u];
    const rest: P = [B[0] + 34 * u, B[1] + 10 * u], up: P = [g.tcx + 62 * u, g.chin + .05 * g.HH];
    const H: P = gone ? [g.tcx + 50 * u, g.chin + .9 * g.HH] : raise > 0 ? lerp2(rest, up, raise) : [head[0] + 28 * u, head[1] + 8 * u + (inStroke ? 0 : 6 * u * (1 - st))];
    return {u, B, H}; };
  const armPose = (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number; tcx: number}): P[] => { const {u, B, H} = geo(g);
    const L: P = [B[0] - 4 * u, B[1] + 12 * u]; return side < 0 ? [S, [S[0] - 20 * u, (S[1] + L[1]) / 2 + 14 * u], L] : [S, [S[0] + 26 * u, (S[1] + H[1]) / 2 + 12 * u], H]; };
  const costume: Costume = {hand: (k: Kit) => { const u = k.u, p = k.p, B: P = [k.tcx - 4 * u, k.chin + .62 * k.HH];
    p.poly([[B[0] - 24 * u, B[1] - 12 * u], [B[0] + 24 * u, B[1] - 12 * u], [B[0] + 24 * u, B[1] + 12 * u], [B[0] - 24 * u, B[1] + 12 * u]], '#e8d6a0', 2.2 * u);   // the box
    p.poly([[B[0] - 12 * u, B[1] - 8 * u], [B[0] + 12 * u, B[1] - 8 * u], [B[0] + 12 * u, B[1] + 2 * u], [B[0] - 12 * u, B[1] + 2 * u]], '#c0353a', 0);
    p.poly([[B[0] - 24 * u, B[1] + 6 * u], [B[0] + 24 * u, B[1] + 6 * u], [B[0] + 24 * u, B[1] + 12 * u], [B[0] - 24 * u, B[1] + 12 * u]], '#5a2a1e', 1.6 * u);   // striker strip
    const [lx, ly] = k.hands[0]; p.dot(lx, ly, 5.5 * u);
    if (gone) return; const [hx, hy] = k.hands[1] ?? k.hands[0], on = f >= lit;
    const hd: P = on && raise > 0 ? [hx + 3 * u, hy - 32 * u] : [hx - 28 * u, hy - 8 * u];                     // head end: on the strip while striking, up when shown
    p.band([[hx, hy], hd], '#e8c48a', 3.5 * u, 1.2 * u, 'round'); p.ell(hd[0], hd[1], 4.5 * u, 6 * u, '#c0353a', 1.4 * u);
    if (inStroke && st > .6) for (let i = 0; i < 4; i++) p.dot(hd[0] - (6 + 8 * i) * u, hd[1] + (2 - 3 * i) * u - 4 * u * Math.sin(i + t * 30), 1.8 * u, '#ffe27a');   // sparks off the strip
    if (on) { const e = (f - lit) / FPS, s2 = e < .15 ? 1.5 - 3 * e : 1 + .08 * Math.sin(t * 17);
      p.ell(hd[0] + 1 * u, hd[1] - 14 * u * s2, 9 * u * s2, 16 * u * s2, '#ffb23a', 0); p.ell(hd[0] + 1 * u, hd[1] - 10 * u * s2, 5 * u * s2, 9 * u * s2, '#fff2a8', 0); }
    p.dot(hx, hy, 5.5 * u); }};
  return {armPose, costume, armFront: true};
};
/** acid bottle crammed into the coat pocket. k 0..1: 0 = held at the chest in the screen-right hand, .7 = shoved in, 1 = settled.
 *  Returns the arm pose for that hand and a costume drawing the bottle / the bulging pocket. */
const cramBottle = (k: number, t: number, jacket: string) => {
  const reach = smooth(k / .7), inP = k > .62, settle = inP ? (k - .62) / .38 : 0;
  const tgt = (g: {u: number; HH: number; chin: number; torsoBot: number; tcx: number; Ta: number}): P =>
    [lerp(g.tcx + 6 * g.u, g.tcx + 1.05 * g.Ta, reach), lerp(g.chin + .5 * g.HH, g.torsoBot - .32 * g.HH, reach)];
  const armPose = (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number; torsoBot: number; tcx: number; Ta: number}): P[] | null => {
    if (side < 0 && !inP) { const h: P = [g.tcx - 8 * g.u, g.chin + .62 * g.HH]; return [S, [S[0] - 22 * g.u, (S[1] + h[1]) / 2 + 12 * g.u], h]; }   // other hand steadies it
    if (side < 0 || settle > .5) return null;
    const h = tgt(g); return [S, [S[0] + 26 * g.u, (S[1] + h[1]) / 2 + 6 * g.u], h]; };
  const costume: Costume = {hand: (k2: Kit) => { const u = k2.u, p = k2.p;
    const px = k2.tcx + .78 * k2.Ta, py = k2.torsoBot - .26 * k2.HH;
    const bottleAt = (x: number, y: number, sq = 1) => {
      p.poly([[x - 14 * u * sq, y - 10 * u], [x + 14 * u * sq, y - 10 * u], [x + 14 * u * sq, y + 30 * u / sq], [x - 14 * u * sq, y + 30 * u / sq]], 'rgba(170,230,190,.92)', 2.4 * u);
      p.poly([[x - 13 * u * sq, y + 8 * u], [x + 13 * u * sq, y + 8 * u + 3 * u * Math.sin(t * 9)], [x + 13 * u * sq, y + 29 * u / sq], [x - 13 * u * sq, y + 29 * u / sq]], 'rgba(120,220,120,.95)', 0);
      p.poly([[x - 6 * u, y - 22 * u], [x + 6 * u, y - 22 * u], [x + 6 * u, y - 10 * u], [x - 6 * u, y - 10 * u]], '#7a5a3a', 2 * u); };
    if (!inP) { const h = k2.hands[1] ?? k2.hands[0]; bottleAt(h[0], h[1] - 6 * u, 1 - .15 * smooth((k - .45) / .17)); p.dot(h[0], h[1], 5.5 * u); return; }
    // the bulge: overshoots as it goes in, then wobbles with each step
    const pop = 1 + .35 * Math.exp(-6 * settle) * Math.cos(settle * 18), wob = 1 + .06 * Math.sin(t * 11);
    const rx = 22 * u * pop * wob, ry = 32 * u / pop;
    p.poly([[px - 4 * u, py - 40 * u], [px + 9 * u, py - 40 * u], [px + 9 * u, py - 22 * u], [px - 4 * u, py - 22 * u]], '#7a5a3a', 2 * u);          // cork + neck poking out
    p.poly([[px - 7 * u, py - 26 * u], [px + 12 * u, py - 26 * u], [px + 12 * u, py - 12 * u], [px - 7 * u, py - 12 * u]], 'rgba(170,230,190,.92)', 2.2 * u);
    const e = Array.from({length: 40}, (_, i) => { const a = i / 40 * Math.PI * 2; return [px + 4 * u + Math.cos(a) * rx, py + 12 * u + Math.sin(a) * ry] as P; });
    p.gradFill(e, jacket, shade(jacket, .7), k2.light); p.inkRing(e, k2.ow * .8, k2.thick);
    p.stroke([[px - rx + 9 * u, py - 4 * u], [px + rx - 2 * u, py - 6 * u]], 2.6 * u, INK);                                                     // pocket flap seam
    for (const dy of [12, 24]) p.stroke([[px + rx - 10 * u, py + dy * u], [px + rx - 3 * u, py + (dy + 3) * u]], 1.8 * u, shade(jacket, .5));   // strain creases
    if (settle < .5) { const h = k2.hands[1] ?? k2.hands[0]; p.dot(h[0], h[1], 5.5 * u); }
  }};
  return {armPose, costume, armFront: true};
};
/** X-ray of the head: the face goes dark, an anatomical skull (cranium, sutures, orbits, nasal cavity, cheekbones, teeth,
 *  mandible, neck vertebrae) is revealed by a scan line moving down; the mandible glows green (phossy jaw).
 *  scan 0..1 = reveal, glow 0..1 = jaw glow, t = seconds */
const xray = (scan: number, glow: number, t: number): Costume => ({torso: (k: Kit) => { if (scan < .55) return; const u = k.u, p = k.p, sy = k.chin + (scan - .55) / .45 * (k.torsoBot - k.chin) * 1.2;
  p.clip([[0, 0], [600, 0], [600, sy], [0, sy]], () => { p.poly(k.torso, '#0a1830', 0);
    for (let i = 0; i < 7; i++) { const yy = k.chin + (8 + i * 15) * u; p.ell(k.tcx, yy, 8 * u, 5 * u, '#cfe3f2', 1.2 * u); }                       // spine
    for (const sd of [-1, 1]) { p.stroke([[k.tcx + sd * 6 * u, k.chin + 10 * u], [k.tcx + sd * .5 * k.Ta, k.chin + 4 * u], [k.tcx + sd * .85 * k.Ta, k.chin + 9 * u]], 4 * u, '#dbeaf6');   // collarbones
      for (let r = 0; r < 4; r++) p.stroke([[k.tcx + sd * 10 * u, k.chin + (26 + r * 16) * u], [k.tcx + sd * .7 * k.Ta, k.chin + (30 + r * 16) * u], [k.tcx + sd * .8 * k.Ta, k.chin + (44 + r * 16) * u]], 2.6 * u, 'rgba(200,225,245,.8)'); } }); },   // ribs
  head: (k: Kit) => { if (scan <= 0) return;
  const p = k.p, g = p.g, u = k.u, A = k.Ha, Bh = k.Hb, cx = 300, cy = k.hc;
  const X = (x: number) => cx + x * A * .84, Y = (y: number) => cy + (y * .84 + .04) * Bh, pt = (x: number, y: number): P => [X(x), Y(y)];
  const sy = Y(-1.15 + 2.6 * scan);
  p.clip([[0, 0], [600, 0], [600, sy], [0, sy]], () => {
    const head = k.head; p.poly(head, '#0a1830', 0); p.inkRing(head, 2.5 * u, k.thick);                              // dark flesh
    for (const r of [1, .97]) p.stroke([...head, head[0]].map(q => [cx + (q[0] - cx) * r, cy + (q[1] - cy) * r] as P), 2 * u, 'rgba(120,200,255,.55)');
    for (let i = 0; i < 2; i++) { const yy = Y(1.08 + i * .2); p.poly([[cx - .13 * A, yy - .045 * Bh], [cx + .13 * A, yy - .045 * Bh], [cx + .16 * A, yy + .03 * Bh], [cx - .16 * A, yy + .03 * Bh]], '#b8cfe2', 1.2 * u); }   // neck vertebrae
    const bone = '#dbeaf6', dark = '#071226';
    // cranium + cheekbones + upper jaw (maxilla) as one outline
    const sk: P[] = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI * (1 + i / 24); sk.push(pt(.84 * Math.cos(a), -.12 + .86 * Math.sin(a))); }      // dome, left temple -> right temple
    sk.push(pt(.86, .05), pt(.9, .18), pt(.74, .3), pt(.5, .42), pt(.42, .55), pt(-.42, .55), pt(-.5, .42), pt(-.74, .3), pt(-.9, .18), pt(-.86, .05));
    p.gradFill(sk, bone, '#9fb8cc', k.light); p.stroke([...sk, sk[0]], 1.8 * u, '#7f9bb3');
    p.stroke([pt(-.05, -.95), pt(.04, -.8), pt(-.03, -.66), pt(.05, -.52)], 1.2 * u, '#8aa4ba');                                     // sagittal suture
    p.stroke([pt(-.78, -.35), pt(-.4, -.6), pt(0, -.68), pt(.4, -.6), pt(.78, -.35)], 1.2 * u, '#8aa4ba');                            // coronal suture
    for (const sd of [-1, 1]) {                                                                                                         // orbits
      const o: P[] = Array.from({length: 24}, (_, i) => { const a = i / 24 * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a);
        return pt(sd * .34 + .2 * Math.sign(c) * Math.abs(c) ** .7, -.02 + .19 * Math.sign(s2) * Math.abs(s2) ** .8 + (s2 < 0 ? -.02 * sd * c : 0)); });
      p.poly(o, dark, 1.6 * u); p.stroke([pt(sd * .16, -.24), pt(sd * .52, -.24)], 2.4 * u, '#eef6fc');                                // brow ridge highlight
      p.stroke([pt(sd * .55, .2), pt(sd * .85, .14)], 2.2 * u, '#eef6fc'); }                                                            // zygomatic arch
    p.poly([pt(0, .1), pt(.1, .3), pt(.07, .37), pt(0, .34), pt(-.07, .37), pt(-.1, .3)], dark, 1.4 * u);                             // nasal cavity
    p.stroke([pt(0, .14), pt(0, .34)], 1.2 * u, '#9fb8cc');                                                                              // septum
    const teeth = (y: number, h: number, w: number) => { for (let i = -4; i < 4; i++) { const x0 = X((i + .08) * w), x1 = X((i + .92) * w);
      p.poly([[x0, Y(y)], [x1, Y(y)], [x1, Y(y + h)], [x0, Y(y + h)]], '#f4f9fd', .9 * u); } };
    teeth(.5, .1, .085);
    // mandible: ramus up to the ear, angle, body, chin: a thick U that glows on cue
    const md: P[] = [pt(-.66, .12), pt(-.68, .45), pt(-.56, .72), pt(-.3, .9), pt(0, .95), pt(.3, .9), pt(.56, .72), pt(.68, .45), pt(.66, .12)];
    const inner: P[] = [pt(.5, .2), pt(.5, .46), pt(.42, .6), pt(.24, .68), pt(0, .7), pt(-.24, .68), pt(-.42, .6), pt(-.5, .46), pt(-.5, .2)];
    const jawShape = [...md, ...inner], gc = `rgba(140,255,120,${.35 + .65 * glow})`;
    if (glow > 0) { g.save(); g.shadowColor = '#7dff6a'; g.shadowBlur = (30 + 20 * Math.sin(t * 8)) * glow; }
    p.poly(jawShape, glow > 0 ? `rgb(${Math.round(219 - 80 * glow)},${Math.round(234 + 21 * glow)},${Math.round(246 - 126 * glow)})` : bone, 1.6 * u);
    if (glow > 0) { p.poly(jawShape, gc, 0); g.restore(); }
    teeth(.6, .085, .075);
  });
  if (scan < 1) p.stroke([[X(-1.3), sy], [X(1.3), sy]], 3 * u, 'rgba(140,220,255,.9)');                                               // scan line
}});
const person = (o: Outfit, h: number, opts: Parameters<typeof bodyFront>[2]) => new Card(h, .8).draw((p: Pen) => bodyFront(p, o, {mode: 'stand', ...opts}));
const actor = (h = 1.74) => { const k = new Card(h, .8); return {k, draw: (o: Outfit, opts: Parameters<typeof bodyFront>[2]) => k.draw((p: Pen) => bodyFront(p, o, {mode: 'stand', ...opts}))}; };

// ---------- props built in code ----------
const std = (c: string, rough = .7) => new THREE.MeshStandardMaterial({color: c, roughness: rough});
const match3d = (len = .05) => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.BoxGeometry(len * .05, len, len * .05), std('#e8c48a')); st.position.y = len / 2; g.add(st);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(len * .065, 14, 10), std('#c0353a', .5)); hd.scale.set(1, 1.4, 1); hd.position.y = len; g.add(hd); g.traverse(o => { (o as THREE.Mesh).castShadow = true; }); return g; };
const matchbox = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.05, .016, .035), std('#e8d6a0')); b.position.y = .008; g.add(b);
  const lab = new THREE.Mesh(new THREE.BoxGeometry(.03, .0005, .02), std('#c0353a')); lab.position.set(0, .0163, 0); g.add(lab);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(.05, .012, .0006), std('#5a2a1e', 1)); strip.position.set(0, .008, .0178); g.add(strip); g.traverse(o => { (o as THREE.Mesh).castShadow = (o as THREE.Mesh).receiveShadow = true; }); return g; };
const bottle = () => { const g = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .1, 24), new THREE.MeshStandardMaterial({color: '#bfeacc', transparent: true, opacity: .45, roughness: .1}));
  gl.position.y = .05; const liq = new THREE.Mesh(new THREE.CylinderGeometry(.027, .027, .055, 24), new THREE.MeshStandardMaterial({color: '#7fe07a', emissive: '#2a6a20', roughness: .2})); liq.position.y = .03;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .03, 16), new THREE.MeshStandardMaterial({color: '#bfeacc', transparent: true, opacity: .45})); neck.position.y = .115; g.add(gl, liq, neck); return g; };
/** a sheet of sandpaper folded over at the back edge (gap = the space between the leaves), grit texture, 1x real size */
const sandpaper = (gap = .01) => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d')!; g.fillStyle = '#b98a52'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = Math.sin(i * 91.7) * 43758.5; const r = v - Math.floor(v), q = Math.sin(i * 17.3) * 9631.1 - Math.floor(Math.sin(i * 17.3) * 9631.1);
    g.fillStyle = r > .5 ? 'rgba(80,50,20,.55)' : 'rgba(240,210,160,.6)'; g.fillRect(r * 256, q * 256, 2, 2); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const mat = new THREE.MeshStandardMaterial({map: t, roughness: 1, side: THREE.DoubleSide});
  const G = new THREE.Group(), th = .0008, W = .07, D = .05;
  const lo = new THREE.Mesh(new THREE.BoxGeometry(W, th, D), mat); lo.position.set(0, th / 2, 0);
  const hi = new THREE.Mesh(new THREE.BoxGeometry(W, th, D), mat); hi.position.set(0, th * 1.5 + gap, 0);
  const fold = new THREE.Mesh(new THREE.CylinderGeometry(gap / 2 + th, gap / 2 + th, W, 16, 1, true, Math.PI, Math.PI), mat); fold.rotation.z = Math.PI / 2; fold.position.set(0, th + gap / 2, -D / 2);
  G.add(lo, hi, fold); G.traverse(o => { const m = o as THREE.Mesh; m.castShadow = m.receiveShadow = true; }); return G; };
const rug = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d')!; g.fillStyle = '#9a2a24'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#e8c45a'; g.lineWidth = 14; g.strokeRect(20, 20, 216, 216); g.strokeStyle = '#2f4a6a'; g.lineWidth = 8; g.strokeRect(48, 48, 160, 160);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({map: t, roughness: 1}));
  m.rotation.x = -Math.PI / 2; m.position.y = .022; m.receiveShadow = true; return m; };
/** a hollow tuna can (4x real: r .17, h .13): open wall, bottom, rolled rim, ribbed sides, "TUNA" label with a fish,
 *  pull-tab lid hinged at the back edge (lid.rotation.x < 0 opens it) */
const tunaCan = () => { const r = .17, h = .13, g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({color: '#c9ced6', metalness: .85, roughness: .32, side: THREE.DoubleSide});
  const inner = new THREE.MeshStandardMaterial({color: '#e2e6ec', metalness: .7, roughness: .4, side: THREE.BackSide});
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), steel); wall.position.y = h / 2;
  const wallIn = new THREE.Mesh(new THREE.CylinderGeometry(r - .003, r - .003, h, 64, 1, true), inner); wallIn.position.y = h / 2;
  const bot = new THREE.Mesh(new THREE.CircleGeometry(r - .002, 64), inner.clone()); (bot.material as THREE.Material).side = THREE.DoubleSide; bot.rotation.x = -Math.PI / 2; bot.position.y = .004;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 8, 64), steel); rim.rotation.x = Math.PI / 2; rim.position.y = h;
  const base = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 8, 64), steel); base.rotation.x = Math.PI / 2; base.position.y = .005;
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d')!; x.fillStyle = '#1f5fa8'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#f2c230'; x.fillRect(0, 18, 1024, 14); x.fillRect(0, 224, 1024, 14);
  for (const ox of [130, 642]) { x.fillStyle = '#ffffff'; x.font = 'bold 120px sans-serif'; x.textBaseline = 'middle'; x.fillText('TUNA', ox, 132);
    x.fillStyle = '#ffb04a'; x.beginPath(); x.ellipse(ox - 70, 130, 52, 30, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(ox - 118, 130); x.lineTo(ox - 150, 100); x.lineTo(ox - 150, 160); x.fill();
    x.fillStyle = '#222'; x.beginPath(); x.arc(ox - 40, 122, 6, 0, 7); x.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(r + .002, r + .002, h * .62, 64, 1, true), new THREE.MeshStandardMaterial({map: tex, roughness: .6})); label.position.y = h * .5; label.rotation.y = Math.PI * .55;
  g.add(wall, wallIn, bot, rim, base, label);
  for (const y of [.18, .82]) { const rib = new THREE.Mesh(new THREE.TorusGeometry(r + .001, .003, 6, 64), steel); rib.rotation.x = Math.PI / 2; rib.position.y = h * y; g.add(rib); }
  const lid = new THREE.Group(); lid.position.set(0, h + .004, -r);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r - .004, r - .004, .004, 64), steel); disc.position.set(0, 0, r); lid.add(disc);
  for (const rr of [.13, .07]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, .003, 6, 48), steel); ring.rotation.x = Math.PI / 2; ring.position.set(0, .003, r); lid.add(ring); }
  const tab = new THREE.Mesh(new THREE.TorusGeometry(.028, .007, 8, 24), steel); tab.rotation.x = Math.PI / 2; tab.scale.set(1, 1.5, 1); tab.position.set(0, .006, r + .1); lid.add(tab);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(.01, 10, 8), steel); rivet.position.set(0, .004, r + .06); lid.add(rivet);
  g.add(lid); g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return {g, lid, r, h}; };
const woodPile = () => { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .55, 10), std(i % 2 ? '#7a4a2a' : '#8a5a32', 1));
  l.rotation.z = Math.PI / 2; l.rotation.y = i * .9; l.position.set(0, .04 + (i > 3 ? .07 : 0), 0); l.castShadow = l.receiveShadow = true; g.add(l); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.38, .07, 8, 16), std('#7a7a72', 1)); ring.rotation.x = Math.PI / 2; ring.position.y = .03; ring.receiveShadow = ring.castShadow = true; g.add(ring); return g; };
/** a camera-facing flame card (flickers) + its orange light */
const flame = (scene: THREE.Scene, size: number, light = 3) => {
  const c = new Card(size, 1, 200, 300, false); c.mesh.userData.figure = false; scene.add(c.mesh);
  const pl = new THREE.PointLight('#ff9a3a', light, size * 12, 1.8); scene.add(pl);
  return {c, pl, at: (p: number[], t: number, on: number) => {
    c.mesh.visible = on > .02; pl.intensity = light * on * (.85 + .15 * Math.sin(t * 23)); if (!c.mesh.visible) return;
    c.mesh.position.set(p[0], p[1], p[2]); pl.position.set(p[0], p[1] + size * .5, p[2]);
    c.draw((_p, g) => { const s = on, wob = 10 * Math.sin(t * 17);
      const grd = g.createRadialGradient(100, 220, 10, 100, 190, 120); grd.addColorStop(0, '#fff6c0'); grd.addColorStop(.35, '#ffcf4a'); grd.addColorStop(.75, '#ff7a1a'); grd.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(100, 300); const w = .4 + .6 * s; g.bezierCurveTo(100 - 90 * w, 300 - 30 * s, 100 - 60 * w + wob, 300 - 180 * s, 100 + wob * .6, 300 - 290 * s); g.bezierCurveTo(100 + 60 * w + wob, 300 - 180 * s, 100 + 90 * w, 300 - 30 * s, 100, 300); g.fill();
      if (s < .6) { const a = 1 - s / .6, r = 90 * (1 - .5 * s), fg = g.createRadialGradient(100, 230, 0, 100, 230, r); fg.addColorStop(0, `rgba(255,255,235,${a})`); fg.addColorStop(.4, `rgba(255,220,120,${.8 * a})`); fg.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = fg; g.fillRect(0, 100, 200, 200); } }); }};   // ignition flash
};
/** drifting green fume puffs */
const fumes = (scene: THREE.Scene, n = 14, col = '#8af07a') => Array.from({length: n}, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.12 + .05 * (i % 3), 12, 8),
  new THREE.MeshBasicMaterial({color: col, transparent: true, opacity: .22, depthWrite: false})); m.layers.set(NOINK); scene.add(m);
  return (t: number, base: number[]) => { const k = (t * .15 + i / n) % 1; m.position.set(base[0] + 1.6 * Math.sin(i * 2.3) * k, base[1] + 1.4 * k, base[2] + .8 * Math.cos(i * 1.7) * k); (m.material as THREE.MeshBasicMaterial).opacity = .25 * Math.sin(Math.PI * k); }; });

// ---------- sets ----------
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera; env: THREE.DataTexture; renderer: THREE.WebGLRenderer; look: number[]; dof: number; near?: number};
const cam = (c: Ctx, p: number[], t: number[], fov = 40) => { c.look = t; c.camera.fov = fov; c.camera.near = c.near ?? .05; c.camera.updateProjectionMatrix(); c.camera.position.set(p[0], p[1], p[2]); c.camera.lookAt(t[0], t[1], t[2]); };
const glide = (c: Ctx, A: number[][], B: number[][], u: number, fov = 40) => cam(c, lerp3(A[0], B[0], smooth(u)), lerp3(A[1], B[1], smooth(u)), fov);
const meadow = (c: Ctx, clear = .55) => { lightRig(c.renderer, c.scene, c.env); const s = c.scene;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), std('#4f8a2a', 1)); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; s.add(g);
  s.add(grassField(120000, -6, 6, -6, 6, (x, z) => Math.hypot(x, z - .8) < clear));
  if (clear > .6) { const d = new THREE.Mesh(new THREE.CircleGeometry(clear * .9, 40), std('#7a6a48', 1)); d.rotation.x = -Math.PI / 2; d.position.set(0, .004, .8); d.receiveShadow = true; s.add(d); }
  [[-4, -6, 'commontree-1', 1.3], [4.5, -8, 'commontree-4', 1.4], [-8, -14, 'commontree-4', 1.5], [9, -15, 'commontree-1', 1.5]].forEach(([x, z, id, k]) => s.add(place(c.L, `stylized-nature-megakit/${id}`, x as number, 0, z as number, x as number, k as number)));
  s.add(place(c.L, 'stylized-nature-megakit/bush-common-flowers', -2.4, 0, -1.5)); s.add(place(c.L, 'stylized-nature-megakit/bush-common', 2.6, 0, -2));
  s.add(place(c.L, 'pirate-kit/environment-rock-2', 1.8, 0, 1.4, 0, .3)); s.add(place(c.L, 'stylized-nature-megakit/flower-3-group', -1.6, 0, 1.6));
  const wp = woodPile(); wp.position.set(0, 0, .8); s.add(wp); return wp; };
const room = (c: Ctx, night = false) => { lightRig(c.renderer, c.scene, c.env, {night}); const s = c.scene; c.scene.background = new THREE.Color(night ? '#141016' : '#2a2224');
  for (let x = -4; x <= 4; x += 2) for (let z = -2; z <= 4; z += 2) s.add(place(c.L, 'medieval-village-megakit/floor-wooddark', x, 0, z));
  for (let i = 0; i < 5; i++) { const x = -4 + i * 2; s.add(place(c.L, i === 2 ? 'medieval-village-megakit/wall-plaster-window-wide-round' : 'medieval-village-megakit/wall-plaster-straight', x, 0, -2.4)); }
  const inside = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 3), new THREE.MeshStandardMaterial({color: night ? '#05040a' : '#9fc4e8', side: THREE.BackSide})); inside.position.set(0, 3, -4); s.add(inside);
  if (!night) { const sunIn = new THREE.DirectionalLight('#fff0d6', 1.2); sunIn.position.set(-3, 5, 4); s.add(sunIn); }
  s.add(place(c.L, 'fantasy-props-megakit/shelf-small-bottles', 2.6, 1.3, -2.1)); s.add(place(c.L, 'fantasy-props-megakit/barrel', -2.8, 0, -1.6));
  const wb = place(c.L, 'fantasy-props-megakit/workbench', 0, 0, -1.2); s.add(wb);
  return new THREE.Box3().setFromObject(wb).max.y; };
const street = (c: Ctx) => { lightRig(c.renderer, c.scene, c.env); const s = c.scene;
  for (let x = -8; x <= 8; x += 2) for (let z = -4; z <= 6; z += 2) s.add(place(c.L, 'medieval-village-megakit/floor-unevenbrick', x, 0, z));
  for (let i = 0; i < 7; i++) { const x = -6 + i * 2; s.add(place(c.L, i % 3 === 1 ? 'medieval-village-megakit/wall-plaster-window-wide-round' : 'medieval-village-megakit/wall-unevenbrick-straight', x, 0, -2.6));
    s.add(place(c.L, 'medieval-village-megakit/wall-plaster-straight', x, 3.12, -2.6)); }
  const inside = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 3), new THREE.MeshStandardMaterial({color: '#2a2020', side: THREE.BackSide})); inside.position.set(0, 3.5, -4.2); s.add(inside);
  s.add(place(c.L, 'fantasy-props-megakit/crate-wooden', -2.6, 0, -1.6, .3)); s.add(place(c.L, 'fantasy-props-megakit/barrel', 2.8, 0, -1.7)); };
const factory = (c: Ctx, night: boolean, tables = [-1.4, 1.4]) => { lightRig(c.renderer, c.scene, c.env, {night: true}); const s = c.scene; s.background = new THREE.Color(night ? '#05040a' : '#1c1820');
  for (let x = -6; x <= 6; x += 2) for (let z = -2; z <= 4; z += 2) s.add(place(c.L, 'medieval-village-megakit/floor-wooddark', x, 0, z));
  for (let i = 0; i < 7; i++) s.add(place(c.L, 'medieval-village-megakit/wall-unevenbrick-straight', -6 + i * 2, 0, -2.4));
  const tops = tables.map(x => { const t = place(c.L, 'fantasy-props-megakit/table-large', x, 0, -.4, Math.PI / 2); s.add(t); return new THREE.Box3().setFromObject(t).max.y; });
  if (!night) { [[-1.4, 2.2, .2], [1.4, 2.2, .2]].forEach(p => { const l = new THREE.PointLight('#ffe0a8', 10, 8, 1.6); l.position.set(p[0], p[1], p[2]); l.castShadow = true; s.add(l); }); }
  s.add(place(c.L, 'fantasy-props-megakit/crate-wooden', -3.6, 0, -1.4)); s.add(place(c.L, 'fantasy-props-megakit/crate-wooden', 3.6, 0, -1.4, .4)); return tops[0] ?? .8; };

// ---------- the 16 pictures ----------
type Upd = (f: number, l: number, u: number) => void;
const B: Record<number, (c: Ctx) => Upd> = {
  // 1 the oldest way to make fire: a hand drill (seated caveman, spindle between the palms, smoke at the tip)
  1: c => { meadow(c, 1.3).visible = false; const a = actor(SIT_H(1.7)); a.k.mesh.position.set(0, 0, .6); c.scene.add(a.k.mesh); const sm = smoke(c.scene, 9);
    return (f, l, u) => { const t = l / FPS, d = drill(t);
      a.draw(CAVE, {...d, expr: t > 1.2 ? 'strain' : 'stern', seed: 5, look: 0, costume: d.costume});
      const tip = onCard(a.k, 300, 975 - 20); sm.forEach(fn => fn(t, tip, Math.min(1, .25 + t / 3)));
      c.dof = 5; glide(c, [[.7, 1.35, 3.4], [0, .5, .6]], [[.45, 1.15, 2.7], [0, .48, .6]], u, 40); }; },
  // 2 it takes so long your arms give out: drilling slows, arms wobble, then flop off the spindle like noodles
  2: c => { meadow(c, 1.3).visible = false; const a = actor(SIT_H(1.7)); a.k.mesh.position.set(0, 0, .6); c.scene.add(a.k.mesh); const sm = smoke(c.scene, 6);
    const give = T('L01', 20);   // "...arms GIVE out"
    return (f, l, u) => { const t = l / FPS + 3, drop = Math.max(0, (f - give + 6) / 26), weak = Math.min(1, (f - SHOTS[1].a) / Math.max(1, give - 6 - SHOTS[1].a));
      const d = drill(t, weak, Math.min(1, drop));
      a.draw(CAVE, {...d, expr: drop > 0 ? 'exhausted' : weak > .5 ? 'pained' : 'strain', seed: 5, look: 0, blink: drop > .6 ? .5 : false,
        costume: {...d.costume, head: sweat(t, Math.min(1, weak * 1.5))}});
      sm.forEach(fn => fn(t, onCard(a.k, 300, 975 - 20), .5 * (1 - Math.min(1, drop * 2))));
      c.dof = 7; cam(c, [.2, 1.0, 2.9], [0, .55, .6], 40 * (1 - .0008 * l)); }; },
  // 3 chemical match dipped in acid bursts into flame (ECU on the bench; close-up props are drawn 4x real size)
  3: c => { c.near = .01; const top = room(c); const bt = bottle(); bt.scale.setScalar(3.2); bt.position.set(.08, top, -1.0); c.scene.add(bt);
    const m = match3d(.2); c.scene.add(m); const fl = flame(c.scene, .16, 3); const burst = T('L02', 6);
    return (f, l, u) => { const dip = smooth((f - burst + 14) / 10) * (1 - smooth((f - burst) / 8));
      const y = top + .62 - .22 * dip; m.position.set(.08, y, -1.0); m.rotation.z = Math.PI;
      fl.at([.08, y - .23, -1.0], l / FPS, smooth((f - burst) / 6) * (1 - dip)); c.dof = 6; cam(c, [.25, top + .45, .1], [.08, top + .35, -1.0], 40); }; },
  // 4 then you had to carry a bottle of acid around: he crams it into his coat pocket (huge bulge) and walks off with it
  4: c => { street(c); const a = actor(1.78); c.scene.add(a.k.mesh); const n = SHOTS[3].b - SHOTS[3].a, cramEnd = Math.round(n * .42);
    return (f, l, u) => { const t = l / FPS, k = Math.min(1, l / cramEnd), w = Math.max(0, (l - cramEnd) / FPS);   // w = seconds walking
      const pos = [lerp(-.9, .35, Math.min(1, w / 1.6)), 0, lerp(-1.0, .55, Math.min(1, w / 1.6))]; a.k.mesh.position.set(pos[0], 0, pos[2]);
      const cb = cramBottle(k, t, GENT.jacket);
      a.draw(GENT, {mode: w > 0 ? 'stroll' : 'stand', phase: w * 1.0, lift: 48, ...cb, tilt: w > 0 ? 0 : 6 * Math.sin(Math.PI * k) , headTilt: w > 0 ? 4 * Math.sin(w * Math.PI * 2) : -6 * smooth(k),
        expr: k < .62 ? 'nervous' : w > 0 ? 'nervous' : 'strain', seed: 21, look: w > 0 ? .7 : 0, costume: dress(cravat(), cb.costume)});
      c.dof = 5; cam(c, [lerp(-.5, .3, smooth(u)), 1.45, lerp(1.6, 3.2, smooth(u))], [lerp(-.85, .25, smooth(u)), lerp(1.2, 1.0, u), lerp(-1.0, -.1, u)], 42); }; },
  // 5 a match dragged through folded sandpaper: pinched in the fold (open edge to camera), pulled out toward us, flares (ECU, 4x props)
  5: c => { c.near = .01; const top = room(c); const sp = sandpaper(.0105); sp.scale.setScalar(4); sp.position.set(0, top + .001, -1.0); c.scene.add(sp);
    const m = match3d(.2); c.scene.add(m); m.rotation.x = -Math.PI / 2; const fl = flame(c.scene, .14, 3.5); const lit = T('L03', 7), my = top + .001 + 4 * (.0008 + .0105 / 2);
    return (f, l, u) => { const k = smooth((f - lit + 16) / 18), hz = lerp(-1.06, -.84, k);   // head z: deep in the fold -> clear of the front edge (-.9)
      m.position.set(0, my, hz + .2); m.rotation.y = .04 * Math.sin(l * .9) * (1 - k);
      fl.at([0, my, hz - .005], l / FPS, smooth((f - lit) / 4) * (hz > -.885 ? 1 : 0)); c.dof = 6;
      cam(c, [.16, top + .2, -.42 + .03 * u], [0, top + .02, -.93], 40); }; },
  // 6 it stank of sulfur and burning bits fell onto the carpet: molten drips swell under the flame in his hand, drop, and set the rug smouldering
  6: c => { room(c); const r = rug(); r.position.set(.2, .022, .6); c.scene.add(r); const a = actor(1.78); a.k.mesh.position.set(-.3, 0, .1); c.scene.add(a.k.mesh);
    const stink = (t: number): Costume => ({head: k => { const [x, y] = k.hands[1] ?? k.hands[0], u = k.u;     // sulfur stink lines curling from the flame to his nose
      for (let i = 0; i < 3; i++) { const q = (t * .6 + i / 3) % 1, pts: P[] = Array.from({length: 9}, (_, j) => { const s2 = j / 8, e = s2 * (.75 + .25 * q); return [lerp(x, 300 + 18 * u, e) + 7 * u * Math.sin(s2 * 9 + t * 6 + i * 2), lerp(y - 62 * u, k.hc + (6 + (i - 1) * 12) * u, e) + 6 * u * Math.cos(s2 * 7 + t * 4 + i)]; });
        k.p.stroke(pts, 4 * u, `rgba(150,185,40,${.85 * Math.sin(Math.PI * q)})`); } }});
    const t0 = T('L03', 14), drips = [0, 11, 19].map((d, i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(.032, 12, 10), new THREE.MeshBasicMaterial({color: '#ff7a10', toneMapped: false})); b.layers.set(NOINK); c.scene.add(b);
      const fl = flame(c.scene, .2 + .04 * i, 2.6); const burn = new THREE.Mesh(new THREE.CircleGeometry(.08, 20), new THREE.MeshBasicMaterial({color: '#1a0f0a', transparent: true, opacity: .8}));
      burn.rotation.x = -Math.PI / 2; c.scene.add(burn); return {b, fl, burn, at: t0 + d, dx: [.03, -.05, .08][i], dz: [.35, .5, .28][i], land: null as number[] | null}; });
    let hand: P = [0, 0], uu = 1; const spy: Costume = {hand: k => { hand = k.hands[1] ?? k.hands[0]; uu = k.u; }};
    return (f, l, u) => { const first = drips[0].at + 10;
      a.draw(GENT, {expr: f > first ? 'shock' : 'pained', seed: 21, look: f > first ? .9 : .5, wave: 1, headTilt: f > first ? -6 : 0, costume: dress(cravat(), matchInHand(1, 1), stink(l / FPS), spy)});
      const src = onCard(a.k, hand[0] + 5 * uu, hand[1] - 38 * uu);     // underside of the flame in his hand
      for (const d of drips) { const s = (f - d.at) / FPS;
        if (s < -.25) { d.b.visible = false; } else if (s < 0) { d.b.visible = true; d.b.scale.setScalar(.4 + 2.4 * (s + .25)); d.b.position.set(src[0], src[1] - .01, src[2]); }   // swelling drip
        else { const y = src[1] - .01 - 4.9 * s * s; if (y > .035) { d.b.visible = true; d.b.scale.setScalar(1); d.b.position.set(src[0] + d.dx * s / .5, y, src[2] + d.dz * Math.min(1, s / .5)); }
          else { d.b.visible = false; if (!d.land) d.land = [d.b.position.x, .03, d.b.position.z]; } }
        const g = d.land ? (f - d.at) / FPS - Math.sqrt((src[1] - .045) / 4.9) : 0;
        d.fl.at(d.land ?? [0, -9, 0], l / FPS + d.dx * 50, d.land ? smooth(g * 3) : 0);
        d.burn.visible = !!d.land; if (d.land) { d.burn.position.set(d.land[0], .024, d.land[2]); d.burn.scale.setScalar(.4 + 1.4 * smooth(g)); } }
      c.dof = 4; cam(c, [.35, 1.25, 3.1], [.05, .75, .35], 44); }; },
  // 7 white phosphorus lit on anything you struck it against (strike on the wall)
  7: c => { street(c); const a = actor(1.78); a.k.mesh.position.set(.1, 0, -.9); c.scene.add(a.k.mesh); const strike = T('L04', 12);
    return (f, l, u) => { a.draw(GENT, {expr: f > strike ? 'smile' : 'neutral', seed: 21, look: -1, wave: 1, costume: dress(cravat(), matchInHand(1, smooth((f - strike) / 4)))});
      c.dof = 5; glide(c, [[1.4, 1.6, 2.6], [0, 1.4, -1.2]], [[1.1, 1.6, 2.2], [0, 1.45, -1.2]], u, 40); }; },
  // 8 it lit so easily it had to be kept in a sealed tin: matches lie inside an open tuna can, one fizzes by itself, the lid slams shut (4x props)
  8: c => { c.near = .01; const top = room(c); const t = tunaCan(); t.g.position.set(0, top, -1.0); c.scene.add(t.g);
    const ms = Array.from({length: 9}, (_, i) => { const m = match3d(.2), layer = i < 5 ? 0 : 1; m.rotation.z = -Math.PI / 2; m.rotation.y = .12 * (i % 3 - 1) + (layer ? .15 : 0);
      m.position.set(-.1, top + .004 + .007 + layer * .012, -1.0 + (layer ? -.035 + .023 * (i - 5) : -.06 + .03 * i)); c.scene.add(m); return m; });
    void ms; const fizz = flame(c.scene, .12, 1.5), sm = smoke(c.scene, 5, '#e8e4dc', .01); const slam = T('L04', 28), fz = T('L04', 17);
    return (f, l, u) => { const k = (f - slam + 7) / 7, shut = k >= 1;
      t.lid.rotation.x = shut ? -.12 * Math.exp(-(f - slam) / 3) * Math.abs(Math.cos((f - slam) * .9)) : -1.75 * (1 - smooth(Math.max(0, k)) ** 2);
      const fzOn = f > fz && !shut ? Math.min(1, (f - fz) / 6) * (.6 + .4 * Math.sin(l * 2.1)) : 0, hp = [.1 + .013, top + .015, -1.0 - .06 + .06];
      fizz.at(hp, l / FPS, fzOn); sm.forEach(fn => fn(l / FPS, hp, f > fz ? (shut ? Math.max(0, 1 - (f - slam) / 15) : .8) : 0));
      const shake = shut ? .006 * Math.exp(-(f - slam) / 4) * Math.sin((f - slam) * 2.5) : 0;
      c.dof = 3; cam(c, [.18 + shake, top + .78, -.42], [0, top + .1, -1.04], 40); }; },
  // 9 worse, it was poison: the match girls dip splints in the phosphorus paste and box them; on "poison" green fumes rise
  //   from the pots, and on "destroyed the jawbones" they wince and clutch their jaws; the camera pushes in on the middle girl
  9: c => { const xs = [-.8, 0, .8], top = factory(c, false, xs), gz = -.95, tz = -.4;
    xs.forEach(x => { const g = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(.11, .09, .09, 24, 1, true), new THREE.MeshStandardMaterial({color: '#3a3532', roughness: .6, side: THREE.DoubleSide})); pot.position.y = .045;
      const paste = new THREE.Mesh(new THREE.CircleGeometry(.1, 24), std('#d7e8a0', .5)); paste.rotation.x = -Math.PI / 2; paste.position.y = .07;
      const bot = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), std('#3a3532')); bot.rotation.x = -Math.PI / 2; bot.position.y = .001; g.add(pot, paste, bot);
      for (let i = 0; i < 4; i++) { const bx = matchbox(); bx.scale.setScalar(2.2); bx.position.set(-.3 + (i % 2) * .12, Math.floor(i / 2) * .036, .05); g.add(bx); }
      const bundle = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .2, 12), std('#e8c48a')); bundle.rotation.z = Math.PI / 2; bundle.position.set(.28, .035, .02); g.add(bundle);
      g.position.set(x + .1, top, tz - .22); g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; }); c.scene.add(g); });
    const cols = ['#8c3b4a', '#3f6fb5', '#5d7a3a'];
    const girls = xs.map((x, i) => { const a = actor(1.62); a.k.mesh.position.set(x, 0, gz); c.scene.add(a.k.mesh); a.draw(GIRL(cols[i]), {seed: 40 + i, costume: apron('#cfc2a0')}); return a; });
    const fm = xs.map(() => smoke(c.scene, 6, '#8af07a', .016)); const poison = T('L05', 3), jaw = T('L05', 6);
    // world point (in front of the girl, over the table) -> her card's design units
    const toCard = (a: ReturnType<typeof actor>, wx: number, wy: number): P => [((wx - a.k.mesh.position.x) / a.k.mesh.scale.x + .5) * 600, (.975 - wy / a.k.mesh.scale.y) * 1000];
    return (f, l, u) => { const t = l / FPS, hurt = smooth((f - jaw) / 8);
      girls.forEach((a, i) => { const ph = t * (1.6 + .2 * i) + i * 1.3, dip = Math.max(0, Math.sin(ph * Math.PI * 2)) ** 2;      // dip down into the pot, lift, repeat
        const work = 1 - hurt, cough = i !== 1 && f > jaw ? .5 + .5 * Math.sin(t * 14 + i) : 0;
        const dipHand = toCard(a, xs[i] + .1, top + .2 - .14 * dip), boxHand = toCard(a, xs[i] - .2 + .06 * Math.sin(ph * 3), top + .12);
        const armPose = (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number; tcx: number}): P[] => { const uu = g.u;
          const jawP: P = [g.tcx + side * 57 * uu, g.chin - 22 * uu], H = lerp2(side > 0 ? dipHand : boxHand, jawP, hurt * (side > 0 ? 1 : .9));
          return [S, [S[0] + side * (22 + 24 * hurt) * uu, (S[1] + H[1]) / 2 + (10 + 20 * hurt) * uu], H]; };
        const sticks: Costume = {hand: k => { if (work < .3) return; const [hx, hy] = k.hands[1] ?? k.hands[0], uu = k.u;          // bundle of splints, heads dipped
          for (let j = -2; j <= 2; j++) { const x2 = hx + j * 3 * uu; k.p.band([[x2, hy - 6 * uu], [x2 + j * 1.5 * uu, hy + 34 * uu]], '#e8c48a', 2.4 * uu, .8 * uu, 'round'); k.p.dot(x2 + j * 1.5 * uu, hy + 35 * uu, 3 * uu, '#e6eccf'); }
          k.p.dot(hx, hy, 5.5 * k.u); }};
        a.draw(GIRL(cols[i]), {seed: 40 + i, armPose, armFront: true, tilt: 4 * dip * work + 4 * cough, headTilt: -5 * dip * work - 6 * hurt,
          expr: f > jaw ? 'pained' : f > poison + 10 ? 'nervous' : i === 1 ? 'neutral' : 'smile_closed', look: f > poison ? .4 * (i - 1) : 0, costume: dress(apron('#cfc2a0'), sticks)});
        fm[i].forEach(fn => fn(t + i, [xs[i] + .1, top + .08, tz - .22], .7 * smooth((f - poison) / 15))); });
      c.dof = 3; glide(c, [[0, 1.85, 4.4], [0, 1.1, -.7]], [[.05, 1.45, 1.1], [0, 1.25, -.95]], Math.min(1, (f - SHOTS[8].a) / (jaw + 20 - SHOTS[8].a)), 42); }; },
  // 10 their bones even glowed in the dark: lights out, push in on her face, an X-ray scan reveals the skull, the jawbone glows green
  10: c => { factory(c, true); const a = actor(1.62); a.k.mesh.position.set(0, 0, -1.0); c.scene.add(a.k.mesh);
    const gl = new THREE.PointLight('#8aff7a', 0, 3, 1.6); gl.position.set(0, 1.3, -.7); c.scene.add(gl); const bones = T('L05', 15) - 4, glowT = T('L05', 17);
    return (f, l, u) => { const t = l / FPS, scan = Math.min(1, Math.max(0, (f - bones) / 12)), glow = smooth((f - glowT + 3) / 8);
      if (scan > 0) c.scene.background = new THREE.Color('#020812');
      gl.intensity = 3 * glow * (.85 + .15 * Math.sin(t * 8));
      a.draw(GIRL('#8c3b4a'), {seed: 40, expr: 'dazed', blink: false, costume: dress(apron('#cfc2a0'), xray(scan, glow, t))});
      c.dof = 6; const k = smooth(Math.min(1, l / 55)); cam(c, [0, lerp(1.4, 1.42, k), lerp(.9, -.05, k)], [0, lerp(1.3, 1.4, k), -1.0], 40); }; },
  // 11 split the match in two: the old head's red-phosphorus cap lifts off and paints the striker strip on the box;
  //   then the head pulses on "the head got one set of chemicals", the strip pulses on "the strip on the box got red phosphorus" (4x props, nothing drifts)
  11: c => { c.near = .01; const top = room(c); const m = match3d(.2); m.rotation.z = -Math.PI / 2; m.position.set(-.13, top + .015, -.8); c.scene.add(m);
    const bx = matchbox(); bx.scale.setScalar(4); bx.position.set(0, top, -1.04); bx.rotation.y = 0; c.scene.add(bx);
    const head = m.children[1] as THREE.Mesh, hm = head.material as THREE.MeshStandardMaterial; hm.emissive = new THREE.Color('#ffffff');
    const strip = bx.children[2] as THREE.Mesh, smat = strip.material as THREE.MeshStandardMaterial, plain = new THREE.Color('#e8d6a0'), red = new THREE.Color('#5a2a1e'); smat.emissive = new THREE.Color('#ff3a20');
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.011, 14, 10), std('#5a2a1e', .8)); cap.castShadow = true; c.scene.add(cap);
    const hp = new THREE.Vector3(), sp = new THREE.Vector3(), split = T('L06', 3), hT = T('L06', 9), sT = T('L06', 17), ring = new THREE.Mesh(new THREE.RingGeometry(.035, .045, 40), new THREE.MeshBasicMaterial({color: '#fff6c0', transparent: true, toneMapped: false}));
    ring.layers.set(NOINK); c.scene.add(ring);
    return (f, l, u) => { c.scene.updateMatrixWorld(true); head.getWorldPosition(hp); strip.getWorldPosition(sp);
      const k = Math.min(1, Math.max(0, (f - split - 6) / 22)), arc = smooth(k);                                   // cap flies head -> strip
      cap.visible = k < 1; cap.position.set(lerp(hp.x + .018, sp.x, arc), lerp(hp.y, sp.y, arc) + .09 * Math.sin(Math.PI * arc), lerp(hp.z, sp.z + .004, arc));
      cap.scale.set(1 + 2 * arc, 1 - .5 * arc, 1); smat.color.copy(plain).lerp(red, smooth((f - split - 22) / 8));
      const pulse = (t0: number, t1: number) => f < t0 || f > t1 ? 0 : (.5 + .5 * Math.sin((f - t0) * .35)) * smooth((f - t0) / 4) * smooth((t1 - f) / 6);
      hm.emissiveIntensity = .9 * pulse(hT, sT - 6); smat.emissiveIntensity = 1.2 * pulse(sT, sT + 60);
      const pr = pulse(hT, sT - 6); ring.visible = pr > .01; ring.position.copy(hp); ring.quaternion.copy(c.camera.quaternion); ring.scale.setScalar(1 + .3 * pr); (ring.material as THREE.MeshBasicMaterial).opacity = pr;
      c.dof = 6; cam(c, [.02, top + .4, -.3 + .04 * u], [0, top + .02, -.92], 42); }; },
  // 12 neither half can catch fire on its own: the head is scraped hard on the bare table (only a puff of dust), then the
  //   box's strip is scraped on the table too: nothing. Same layout as 11 (match in front, box behind) (4x props)
  12: c => { c.near = .01; const top = room(c); const m = match3d(.2); c.scene.add(m); const bx = matchbox(); bx.scale.setScalar(4); c.scene.add(bx);
    const bare = match3d(.2); (bare.children[1] as THREE.Mesh).visible = false; c.scene.add(bare);
    const dust = smoke(c.scene, 6, '#bdb4a6', .006), half = T('L07', 1), own = T('L07', 4) - 2, a = .35;
    return (f, l, u) => { const t = l / FPS;
      // match: head down on the table, scraped back and forth twice (frames 4..30)
      const ms = Math.min(1, Math.max(0, (l - 4) / 26)), sx = -.06 * Math.cos(ms * Math.PI * 4) * (ms > 0 && ms < 1 ? 1 : 0), lift = ms >= 1 ? smooth((l - 30) / 6) : 1 - smooth(l / 4);
      const tilt = a * (1 - lift) + .0 * lift; m.rotation.z = -Math.PI / 2 - tilt; m.position.set(-.13 + sx - .2 * (Math.cos(tilt) - 1), top + .013 + .2 * Math.sin(tilt) + .002 * lift, -.8);
      // then a bare stick (no head) is scraped along the box's strip (frames 34..60): nothing
      const bs = Math.min(1, Math.max(0, (l - 34) / 26)), on = l > 30;
      bare.visible = on; bare.position.set(-.07 + .07 * Math.sin(bs * Math.PI * 4) * (bs < 1 ? 1 : 0), top + .036 + .04 * (1 - smooth((l - 30) / 5)), -1.04 + .0705 + .006); bare.rotation.set(0, 0, -Math.PI / 2 - .12);
      bx.position.set(0, top, -1.04);
      const hx = m.position.x + .2 * Math.cos(tilt);
      dust.forEach(fn => fn(t * 2, [hx, top + .01, -.8], ms > 0 && ms < 1 ? .9 : Math.max(0, .9 - (l - 30) / 10)));
      void half; void own; c.dof = 6; cam(c, [.02, top + .4, -.3], [0, top + .02, -.92], 42); }; },
  // 13 they only light when you rub them together: the match is held at ~30 deg with its head on the striker strip, flicked
  //   fast along it; at the end of the stroke: flash, sparks, smoke puff, the flame flares and settles, the match lifts away (4x props)
  13: c => { c.near = .01; const top = room(c); const bx = matchbox(); bx.scale.setScalar(4); bx.position.set(0, top, -1.04); c.scene.add(bx);
    const m = match3d(.2); c.scene.add(m); const fl = flame(c.scene, .16, 4), puff = smoke(c.scene, 7, '#d8d4cc', .006), rub = T('L07', 13);
    const sparks = Array.from({length: 10}, (_, i) => { const sp = new THREE.Mesh(new THREE.SphereGeometry(.003, 6, 4), new THREE.MeshBasicMaterial({color: '#fff1a0', toneMapped: false})); sp.layers.set(NOINK); c.scene.add(sp);
      return {sp, v: [.25 + .5 * Math.abs(Math.sin(i * 3.1)), .3 + .4 * Math.abs(Math.cos(i * 1.7)), .25 * Math.sin(i * 2.3) + .15]}; });
    const sz = -1.04 + .0712 + .012, up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(.35, -.45, -.82).normalize(), tail = new THREE.Vector3(), H = new THREE.Vector3();
    const x0 = -.085, x1 = .085, s0 = rub - 5, s1 = rub + 1;                                      // the stroke: 6 frames (~0.2 s), left to right
    return (f, l, u) => { const t = l / FPS;
      const stroke = Math.min(1, Math.max(0, (f - s0) / (s1 - s0))), after = Math.max(0, f - s1);
      const press = smooth((l) / 10);                                                         // brought in onto the strip, pressed
      H.set(lerp(x0, x1, stroke * stroke) - .03 * smooth((after - 4) / 14), top + .034 + (1 - press) * .05 + .09 * smooth((after - 4) / 14), sz + (1 - press) * .06 + .12 * smooth((after - 4) / 14));
      const d2 = dir.clone(); if (after > 4) d2.lerp(new THREE.Vector3(.3, .5, -.8).normalize(), smooth((after - 4) / 14)).normalize();   // tips head-up after lighting
      tail.copy(H).addScaledVector(d2, -.2); m.position.copy(tail); m.quaternion.setFromUnitVectors(up, d2);
      const ign = f >= s1 ? 1 : 0, e = after / FPS;
      fl.at([H.x, H.y + .005, H.z], t, ign * (e < .12 ? 1.6 - 3 * e : .9 + .15 * Math.sin(t * 9) * Math.exp(-e * 2)));   // flare then settle
      sparks.forEach(({sp, v}) => { sp.visible = ign > 0 && e < .45; if (!sp.visible) return; sp.position.set(H.x + v[0] * e, H.y + v[1] * e - 4.9 * e * e, H.z + v[2] * e); });
      puff.forEach(fn => fn(t, [H.x - .03, H.y, H.z], ign * Math.max(0, 1 - e * 1.2)));
      c.dof = 6; cam(c, [.0, top + .42, -.2], [0, top + .07, -.95], 42); }; },
  // 14 that is why it is called a safety match (gent, proud, lit match)
  14: c => { street(c); const a = person(GENT, 1.78, {expr: 'smile', seed: 21, wave: 1, costume: dress(cravat(), matchInHand(1, 1))}); a.mesh.position.set(0, 0, 0); c.scene.add(a.mesh);
    return (f, l, u) => { c.dof = 6; cam(c, [.2, 1.55, 2.6], [0, 1.4, 0], 40 * (1 - .002 * l)); }; },
  // 15 striking a match still works like the very first fire: back in the meadow, the caveman studies a matchbox and a match
  15: c => { meadow(c); const a = actor(1.7); a.k.mesh.position.set(-.3, 0, .3); c.scene.add(a.k.mesh);
    return (f, l, u) => { const sk = striker(f, [], 1e9, 0, false, l / FPS);
      a.draw(CAVE, {...sk, expr: 'neutral', seed: 5, look: -.3, headTilt: 6 * Math.sin(l / FPS * 2), costume: sk.costume});
      c.dof = 5; glide(c, [[.8, 1.4, 3.8], [-.2, 1.1, .5]], [[.5, 1.3, 2.8], [-.25, 1.15, .4]], u, 40); }; },
  // 16 you are rubbing two things together. (pause) Just with some chemical help!: he strikes (one fizzle, then it catches on
  //   "together"), holds it up through the pause, tosses it into the woodpile on "Just", and it roars into a campfire on "help"
  16: c => { meadow(c); const a = actor(1.7); a.k.mesh.position.set(-.55, 0, .25); c.scene.add(a.k.mesh);
    const fire = flame(c.scene, .7, 6), mf = flame(c.scene, .1, 1.2), m3 = match3d(.08); c.scene.add(m3);
    const s1 = T('L08', 13) - 2, s2 = T('L08', 16) - 3, lit = s2 + 5, toss = T('L09', 0) - 2, land = toss + 12;   // lights on "together", shown off in the pause, tossed on "Just"
    let hand: P = [0, 0], uu = 1; const spy: Costume = {hand: k => { hand = k.hands[1] ?? k.hands[0]; uu = k.u; }};
    const from = new THREE.Vector3();
    return (f, l, u) => { const t = l / FPS, raise = smooth((f - lit - 4) / 8) * (1 - smooth((f - toss) / 4)), gone = f > toss + 2;
      const sk = striker(f, [s1, s2], lit, raise, gone, t);
      a.draw(CAVE, {...sk, expr: f > land ? 'smile' : f > lit ? 'proud' : 'strain', seed: 5, look: f > toss ? .6 : -.2, costume: dress(sk.costume, spy)});
      if (f <= toss + 2) from.fromArray(onCard(a.k, hand[0] + 3 * uu, hand[1] - 34 * uu));
      const k = Math.min(1, Math.max(0, (f - toss - 2) / (land - toss - 2)));                       // the lit match arcs into the woodpile
      m3.visible = gone && k < 1; m3.position.set(lerp(from.x, 0, k), lerp(from.y, .15, k) + .35 * Math.sin(Math.PI * k), lerp(from.z, .8, k)); m3.rotation.z = -k * 6;
      mf.at([m3.position.x, m3.position.y + .03, m3.position.z], t, m3.visible ? 1 : 0);
      fire.at([0, .05, .8], t, smooth((f - land) / 14));
      c.dof = 4; const pull = smooth((f - toss) / 14); cam(c, [lerp(.1, .2, pull), lerp(1.25, 1.3, pull), lerp(3.0, 3.7, pull)], [lerp(-.25, -.15, pull), lerp(.95, .7, pull), lerp(.45, .55, pull)], 42); }; },
};

const captionAt = (t: number) => { // groups of <= 3 words within a line, shown while spoken; active = the word being said
  const idx = W.findIndex(w => t >= w.start - .05 && t < w.end + .25); if (idx < 0) return {words: [] as string[], active: -1};
  const first = W.findIndex(w => w.line === W[idx].line), g = first + Math.floor((idx - first) / 3) * 3;   // groups never cross a line (keeps the pause clean)
  const grp = W.slice(g, g + 3).filter(w => w.line === W[idx].line);
  const active = grp.findIndex(w => t >= w.start - .03 && t < w.end + .08);   // -1 between words: nothing highlighted
  return {words: grp.map(w => w.word.replace(/[.,!?]/g, '')), active};
};

export const MatchesShort: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [st, setSt] = useState<{lib: Lib; env: THREE.DataTexture} | null>(null);
  const [handle] = useState(() => delayRender('assets'));
  const [fh] = useState(() => delayRender('font'));
  useLayoutEffect(() => { document.fonts.load('120px LilitaOneLocal').then(() => continueRender(fh)).catch(() => continueRender(fh)); }, [fh]);
  useLayoutEffect(() => { const ld = new GLTFLoader();
    Promise.all([Promise.all(IDS.map(id => ld.loadAsync(staticFile(`${id}.glb`)).then(g => [id, g.scene] as const))), new RGBELoader().loadAsync(staticFile('meadow_2.hdr'))])
      .then(([a, env]) => { setSt({lib: Object.fromEntries(a), env}); continueRender(handle); }).catch(e => { console.error(e); continueRender(handle); }); }, [handle]);
  const S = useRef<{renderer?: THREE.WebGLRenderer; pic?: number; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; composer?: EffectComposer; lens?: LensBlur; upd?: Upd; ctx?: Ctx}>({});
  useLayoutEffect(() => () => { S.current.composer?.dispose(); S.current.renderer?.dispose(); }, []);
  useLayoutEffect(() => {
    if (!st) return; const R = S.current;
    if (!R.renderer) { R.renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true}); R.renderer.setSize(width, height, false); }
    const shot = shotAt(frame);
    if (R.pic !== shot.pic) {
      R.composer?.dispose();
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, width / height, .05, 3000); camera.layers.enable(NOINK);
      const ctx: Ctx = {L: st.lib, scene, camera, env: st.env, renderer: R.renderer, look: [0, 0, 0], dof: 0};
      R.upd = B[shot.pic](ctx);
      const {composer, lens} = makePost(R.renderer, scene, camera, width, height);
      Object.assign(R, {pic: shot.pic, scene, camera, composer, lens, ctx});
    }
    const local = frame - shot.a;
    R.upd!(frame, local, local / Math.max(1, shot.b - shot.a - 1));
    R.lens!.focus = R.camera!.position.distanceTo(new THREE.Vector3(...R.ctx!.look)); R.lens!.cInf = R.ctx!.dof;
    R.camera!.updateMatrixWorld(); R.scene!.updateMatrixWorld(true); faceCards(R.scene!, R.camera!);
    R.composer!.render();
  }, [frame, width, height, st]);
  const cap = captionAt(frame / FPS), capText = cap.words.join(' ');
  return <AbsoluteFill>
    <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: CAPTION_BOTTOM}}><div style={captionCss(capText)}>
      {cap.words.map((w, i) => <span key={i} style={i === cap.active ? {...captionWord, ...captionActive} : captionWord}>{w}</span>)}</div></AbsoluteFill>
  </AbsoluteFill>;
};
export {SHOTS, candle, shade, INK};
