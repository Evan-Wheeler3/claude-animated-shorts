// The retired couple who cracked the lottery (script v2, owner-approved 2026-11-28). 27 pictures on the voice-B narration,
// built to ANIMATION-PLAYBOOK.md 1b (the experiment): ONE subject per picture, plain bright flat-colour sets, a new picture
// every ~2 s, the picture becomes the named thing on its word. Beats on words via T(line, i). Picture only; run_mac.sh
// muxes audio/mix.m4a.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import type {EffectComposer} from 'postprocessing';
import {NOINK} from '../../../../templates/bridge/ink';
import {bodyFront, INK, type Costume, type Expr, type Kit, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import type {LensBlur} from '../../../../templates/bridge/lensblur';
import {Card, faceCards} from './kit/cards';
import {dress, apron} from './kit/costume';
import {CAPTION_BOTTOM, captionActive, captionCss, captionWord, lightRig, loadCaptionFont, makePost, place, refStyle} from './kit/world';
import {type P} from './kit/acting';
import {FPS, SHOTS, TOTAL, kick, lerp, shotAt, smooth, tw} from './story';
import words from '../../voice/words.json';

export const LOTTERY_FRAMES = TOTAL;
loadCaptionFont(staticFile('fonts/LilitaOne.woff2'));
type Word = {word: string; line: string; start: number; end: number};
const W = words as Word[];
/** frame of word i of a line (beats are tied to words, never to frame numbers) */
const T = (line: string, i = 0) => Math.round(tw(line, i) * FPS);
const FONT = 'LilitaOneLocal, Arial Black, sans-serif';

const IDS = ['kenney-car-kit/sedan'];
type Lib = Record<string, THREE.Group>;
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera; env: THREE.DataTexture; renderer: THREE.WebGLRenderer; look: number[]; dof: number};
type Upd = (f: number, l: number, u: number) => void;
const cam = (c: Ctx, p: number[], t: number[], fov = 40) => { c.look = t; c.camera.fov = fov; c.camera.updateProjectionMatrix(); c.camera.position.set(p[0], p[1], p[2]); c.camera.lookAt(t[0], t[1], t[2]); };
/** overshoot pop 0 -> 1 starting at frame f0 */
const pop = (f: number, f0: number) => f < f0 ? 0 : 1 + .35 * Math.exp(-6 * (f - f0) / FPS) * Math.cos(18 * (f - f0) / FPS) - Math.exp(-14 * (f - f0) / FPS);

// ---------- plain bright sets (playbook 1b: flat colour, no textures, high key) ----------
const std = (c: string, rough = .75, metal = 0) => new THREE.MeshStandardMaterial({color: c, roughness: rough, metalness: metal});
const shadows = <O extends THREE.Object3D>(o: O) => { o.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return o; };
const box = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: number[] = [0, 0, 0]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(p[0], p[1], p[2]); b.castShadow = b.receiveShadow = true; return b; };
/** a room corner in two flat colours: floor at y = 0, wall at z = back. Bright: strong sun from the left, high ambient. */
const room = (c: Ctx, wall: string, floor: string, back = -1.6) => { const rig = lightRig(c.renderer, c.scene, c.env);
  c.scene.fog = null; c.scene.background = new THREE.Color(wall); c.scene.environmentIntensity = .75; rig.hemi.intensity = .9; rig.sun.intensity = 3.4;
  rig.sun.position.set(-4, 7, 6); rig.sun.color.set('#fff2dc'); Object.assign(rig.sun.shadow.camera, {left: -6, right: 6, top: 6, bottom: -6}); rig.sun.shadow.camera.updateProjectionMatrix();
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std(floor, .9)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true;
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), std(wall, .95)); wl.position.set(0, 15, back); wl.receiveShadow = true;
  c.scene.add(fl, wl); return rig; };
const tabletop = (c: Ctx, top = '#efdcbc', wall = '#f4c95d') => room(c, wall, top, -1.2);

// ---------- canvas textures for printed things (tickets, signs, papers) ----------
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!; draw(g); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return {t, g, cv}; };
/** a flat printed sheet lying on its back (y up) or standing (stand = true), size in metres */
const sheet = (wM: number, hM: number, px: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, stand = false) => {
  const w = Math.round(px), h = Math.round(px * hM / wM), ct = canvasTex(w, h, g => draw(g, w, h));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), new THREE.MeshStandardMaterial({map: ct.t, roughness: .8, transparent: true, alphaTest: .05, side: THREE.DoubleSide}));
  if (!stand) m.rotation.x = -Math.PI / 2; m.castShadow = true; m.receiveShadow = true;
  return Object.assign(m, {redraw: (fn: (g: CanvasRenderingContext2D, w: number, h: number) => void) => { ct.g.clearRect(0, 0, w, h); fn(ct.g, w, h); ct.t.needsUpdate = true; }});
};
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, stroke = 0, align: CanvasTextAlign = 'center') => {
  g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = stroke; g.strokeStyle = '#1a1a1a'; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y); };
const rrect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
/** the WinFall ticket: cream slip, purple header, six numbers, barcode */
const drawTicket = (g: CanvasRenderingContext2D, w: number, h: number, nums = [4, 11, 17, 23, 35, 42]) => {
  rrect(g, 4, 4, w - 8, h - 8, h * .08); g.fillStyle = '#fff6e2'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1a1a1a'; g.stroke();
  g.fillStyle = '#7a3fb0'; g.fillRect(4, 4, w - 8, h * .3); text(g, 'WINFALL', w / 2, h * .17, h * .2, '#ffd84a', h * .03);
  nums.forEach((n, i) => { const x = w * (.13 + i * .148), y = h * .55; g.beginPath(); g.arc(x, y, h * .12, 0, 7); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#7a3fb0'; g.stroke();
    text(g, String(n), x, y + 2, h * .13, '#2a2a2a'); });
  for (let i = 0; i < 40; i++) { g.fillStyle = '#1a1a1a'; g.fillRect(w * .15 + i * w * .0175, h * .76, (i * 7) % 3 + 2, h * .14); } };
const TICKET_W = .18, TICKET_H = .09;
const ticket = (px = 900, nums?: number[]) => sheet(TICKET_W, TICKET_H, px, (g, w, h) => drawTicket(g, w, h, nums));
/** a stack of tickets (cream block, ticket printed on top) of height h, base at y = 0 */
const ticketStack = (h = .3) => { const top = canvasTex(600, 300, g => drawTicket(g, 600, 300));
  const side = std('#f3e6c8', .9), mats = [side, side, new THREE.MeshStandardMaterial({map: top.t, roughness: .8}), side, side, side];
  const g = new THREE.Group(), b = box(TICKET_W, 1, TICKET_H, mats, [0, .5, 0]);
  for (let i = 1; i < 12; i++) { const ln = box(TICKET_W + .002, .002, TICKET_H + .002, std('#d8c7a4', .9), [0, i / 12, 0]); b.add(ln); ln.position.y = i / 12 - .5; }
  g.add(b); g.scale.y = h; return g; };
/** a $ brick (banded stack of bills), 0.156 x 0.03 x 0.066 m */
const BILL = std('#7fbf6a', .8), BAND = std('#f6f1e2', .7);
const brick = () => { const g = new THREE.Group(); g.add(box(.156, .03, .066, BILL, [0, .015, 0]), box(.03, .032, .068, BAND, [0, .015, 0])); return g; };
/** a pyramid of bricks; set(n) shows the first n (bottom layers first). Base centred on the origin. */
const cashPile = (layers = 6, s = 1) => { const g = new THREE.Group(), bricks: THREE.Group[] = [];
  for (let L = 0; L < layers; L++) { const n = layers - L; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const b = brick(); b.position.set((i - (n - 1) / 2) * .16, L * .031, (j - (n - 1) / 2) * .07); b.rotation.y = (i * 7 + j * 3 + L) % 5 === 0 ? .08 : 0; g.add(b); bricks.push(b); } }
  g.scale.setScalar(s); return {g, n: bricks.length, set: (k: number) => bricks.forEach((b, i) => { b.visible = i < k; })}; };
const coin = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .003, 24), std('#d9b44a', .35, .8)); m.castShadow = true; return m; };
/** a rubber-stamp mark that thumps onto a surface: big -> 1 with a pop */
const stampMark = (label: string, col: string, wM = .2, rot = -.15) => sheet(wM, wM * .38, 700, (g, w, h) => {
  g.save(); g.translate(w / 2, h / 2); g.rotate(rot); g.lineWidth = h * .07; g.strokeStyle = col; rrect(g, -w * .44, -h * .38, w * .88, h * .76, h * .1); g.stroke();
  text(g, label, 0, h * .03, h * .48, col); g.restore(); });

// ---------- cast (reference style) ----------
const JERRY = refStyle({jacket: '#5d7fb8', pants: '#4a4a52', boots: '#3a2a1a', hat: 'hair', hair: '#dadada', buttons: '#efe6cf'});
const MARGE = refStyle({jacket: '#d0587e', pants: '#5a4a5a', boots: '#3a2a2a', hat: 'hair', hair: '#e8e2dc'});
const CLERK = refStyle({jacket: '#3aa070', pants: '#2a3a4a', boots: '#222222', hat: 'cap', cap: '#d9443a'});
const SLEUTH = refStyle({jacket: '#b89357', pants: '#4a4038', boots: '#222222', hat: 'hair', hair: '#3a2a1a'});
/** round glasses on the eyes (head hook): eyes sit 15 % of the head width either side of the centre */
const glasses: Costume = {head: k => { const u = k.W / 100, y = k.hc;
  for (const s of [-1, 1]) k.p.ell(300 + s * 15 * u, y, 10.5 * u, 9 * u, null, 3 * u);
  k.p.stroke([[300 - 4.5 * u, y - 1 * u], [300 + 4.5 * u, y - 1 * u]], 3 * u); }};
/** Marge's short curls: bumps round the crown */
const curls = (col = '#e8e2dc'): Costume => ({behindHead: k => { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.0 + i / 8), r = 1.02;
  k.p.ell(300 + r * k.Ha * Math.cos(a), k.hc + r * k.Hb * Math.sin(a) + .1 * k.Hb, .26 * k.Ha, .22 * k.Hb, col, 2.4 * k.u); } }});
const fedora = (col = '#5a4630'): Costume => ({head: k => { const u = k.u, y0 = k.crown + .38 * k.Hb, w = k.Ha;
  k.p.ell(300, y0, w * 1.45, 12 * u, col, k.ow * .8);
  k.p.poly([[300 - w * .85, y0], [300 - w * .78, y0 - .62 * k.Hb], [300, y0 - .5 * k.Hb], [300 + w * .78, y0 - .62 * k.Hb], [300 + w * .85, y0]], col, k.ow * .8);
  k.p.stroke([[300 - w * .84, y0 - 12 * u], [300 + w * .84, y0 - 12 * u]], 7 * u, '#2a2018'); }});
/** something held in both hands at the chest (drawn in the hand hook, between the hands) */
const holding = (draw: (p: Pen, x: number, y: number, u: number) => void): Costume => ({hand: k => { const [a, b] = k.hands; if (!a || !b) return; draw(k.p, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, k.u); }});
const chestHands = (spread = 34) => (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number}) => [S, [S[0] + side * 26 * g.u, S[1] + .3 * g.HH], [300 + side * spread * g.u, g.chin + .5 * g.HH]] as P[];
const armsCrossed = (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number}) => [S, [S[0] + side * 22 * g.u, S[1] + .35 * g.HH], [300 - side * 14 * g.u, g.chin + .45 * g.HH]] as P[];
const armUp = (which: -1 | 1, k: number) => (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number}) => side !== which ? null :
  [S, [S[0] + side * 40 * g.u, S[1] + lerp(.3, -.05, k) * g.HH], [S[0] + side * lerp(30, 44, k) * g.u, S[1] + lerp(.55, -.55, k) * g.HH]] as P[];
type Actor = {k: Card; draw: (o: Outfit, opts: Parameters<typeof bodyFront>[2]) => void};
const actor = (c: Ctx, at: number[], h = 1.72, seed = 1): Actor => { const k = new Card(h, 1.3); k.mesh.position.set(at[0], at[1], at[2]); c.scene.add(k.mesh);
  const a = {k, draw: (o: Outfit, opts: Parameters<typeof bodyFront>[2]) => { k.draw((p: Pen) => bodyFront(p, o, {mode: 'stand', seed, ...opts})); }}; a.draw(JERRY, {}); return a; };
const blinkAt = (t: number) => (t % 3.1) < .12;
const jerry = (a: Actor, t: number, expr: Expr, o: Partial<Parameters<typeof bodyFront>[2]> = {}) => a.draw(JERRY, {expr, blink: blinkAt(t), ...o, costume: dress(glasses, o?.costume ?? {})});
const marge = (a: Actor, t: number, expr: Expr, o: Partial<Parameters<typeof bodyFront>[2]> = {}) => a.draw(MARGE, {expr, blink: blinkAt(t + 1.3), ...o, costume: dress(curls(), glasses, o?.costume ?? {})});

// ---------- the sets with a character in them ----------
/** convenience-store counter (mint wall): a white counter front with a red stripe, top at 1.0 m */
const store = (c: Ctx) => { room(c, '#9fdcc6', '#e9e4d6'); const g = new THREE.Group();
  g.add(box(2.4, 1.0, .6, std('#f7f4ec'), [0, .5, .35]), box(2.42, .1, .62, std('#e2463a'), [0, .62, .35]), box(2.5, .05, .7, std('#d9d2c2', .5), [0, 1.025, .35]));
  c.scene.add(g); return g; };
/** kitchen: warm yellow wall, wood floor, a cream table (top at 0.76 m) */
const kitchen = (c: Ctx) => { room(c, '#f6d36b', '#c99c6e'); const g = new THREE.Group(), legs = std('#8a5a3a');
  g.add(box(1.5, .05, .8, std('#f4ead2', .6), [0, .76, .45])); for (const x of [-.68, .68]) for (const z of [.12, .78]) g.add(box(.06, .74, .06, legs, [x, .37, z]));
  c.scene.add(g); return g; };
const closeUp = (c: Ctx, a: Actor, push: number, dz = 1.35, y = 1.42) => { const p = a.k.mesh.position; c.dof = 4; cam(c, [p.x, y + .2, p.z + dz + .65 - .2 * push], [p.x, y + .14, p.z], 40); };

// ---------- the 27 pictures ----------
const B: Record<number, (c: Ctx) => Upd> = {
  // 1 L01 "A retired shop owner...": Jerry at a store counter picks up a brochure; on "figured" his eyes go wide.
  1: c => { store(c); const a = actor(c, [0, 0, -.2]); const wow = T('L01', 4);
    const brochure = holding((p, x, y, u) => { p.poly([[x - 34 * u, y - 40 * u], [x + 34 * u, y - 46 * u], [x + 36 * u, y + 10 * u], [x - 32 * u, y + 14 * u]], '#7a3fb0', 3 * u);
      p.stroke([[x - 20 * u, y - 24 * u], [x + 20 * u, y - 28 * u]], 6 * u, '#ffd84a'); p.stroke([[x - 18 * u, y - 6 * u], [x + 18 * u, y - 9 * u]], 4 * u, '#ffffff'); });
    return (f, l, u) => { const t = l / FPS; jerry(a, t, f < wow ? 'neutral' : 'shock', {armPose: chestHands(30), armFront: true, look: f < wow ? .25 : 0, costume: brochure});
      closeUp(c, a, u, 1.45, 1.38); }; },
  // 2 "beat the lottery": one WinFall ticket fills the frame; a red tick stamps onto it.
  2: c => { tabletop(c); const tk = ticket(1200); tk.position.y = .002; c.scene.add(tk); const tick = stampMark('✔', '#e23b2e', .09, 0); c.scene.add(tick); const at = T('L01', 9);
    return (f, l, u) => { const k = pop(f, at); tick.visible = f >= at; tick.position.set(.035, .006, 0); tick.scale.setScalar(Math.max(.01, 2.2 - 1.2 * Math.min(1, k)));
      c.dof = 2; cam(c, [0, .26 - .02 * u, .14 - .02 * u], [0, 0, -.005], 40); }; },
  // 3 "in under two minutes": a stopwatch on the table, the hand sweeps round to 1:59 and dings.
  3: c => { tabletop(c, '#efdcbc', '#8fd0f0'); const g = new THREE.Group(); c.scene.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .03, 48), std('#d23b3b', .45)); body.rotation.x = Math.PI / 2; body.position.y = .085; body.castShadow = true;
    const knob = box(.025, .025, .02, std('#c9ccd2', .3, .7), [0, .18, 0]), ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .006, 8, 24), std('#c9ccd2', .3, .7)); ring.position.y = .21;
    const face = sheet(.14, .14, 700, () => {}, true); face.position.set(0, .085, .0155); g.add(body, knob, ring, face);
    const ding = T('L01', 13);
    return (f, l, u) => { const sec = Math.min(119, 119 * smooth((f - SHOTS[2].a) / Math.max(1, ding - SHOTS[2].a))), on = f >= ding;
      face.redraw((gg, w, h) => { gg.beginPath(); gg.arc(w / 2, h / 2, w * .48, 0, 7); gg.fillStyle = on && (f - ding) % 8 < 4 ? '#fff3a0' : '#ffffff'; gg.fill();
        for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; gg.fillStyle = '#333'; gg.fillRect(w / 2 + Math.sin(a) * w * .42 - 2, h / 2 - Math.cos(a) * w * .42 - 2, i % 5 ? 4 : 9, i % 5 ? 4 : 9); }
        text(gg, `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`, w / 2, h * .68, w * .17, '#d23b3b');
        const a = sec / 60 * 6.283; gg.strokeStyle = '#1a1a1a'; gg.lineWidth = 12; gg.lineCap = 'round'; gg.beginPath(); gg.moveTo(w / 2, h / 2); gg.lineTo(w / 2 + Math.sin(a) * w * .38, h / 2 - Math.cos(a) * w * .38); gg.stroke(); });
      g.rotation.z = on ? .06 * Math.sin((f - ding) * 1.3) * Math.exp(-(f - ding) / 10) : 0;
      c.dof = 2; cam(c, [0, .12, .42 - .04 * u], [0, .1, 0], 40); }; },
  // 4 L02 "Normally, if nobody matches all six numbers": six drawn balls above a ticket; every ticket number gets a red cross.
  4: c => { tabletop(c, '#efdcbc', '#b5e3a8'); const drawn = [7, 13, 21, 29, 38, 44];
    const balls = drawn.map((n, i) => { const tex = canvasTex(256, 128, g => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); text(g, String(n), 64, 64, 70, '#1a1a1a'); text(g, String(n), 192, 64, 70, '#1a1a1a'); });
      const m = new THREE.Mesh(new THREE.SphereGeometry(.026, 32, 20), new THREE.MeshStandardMaterial({map: tex.t, roughness: .3})); m.position.set((i - 2.5) * .062, .026, -.07); m.castShadow = true; c.scene.add(m); const d = sheet(.03, .03, 200, (g, w, h) => { g.beginPath(); g.arc(w / 2, h / 2, w * .48, 0, 7); g.fillStyle = '#ffffff'; g.fill(); text(g, String(n), w / 2, h / 2 + 3, h * .62, '#1a1a1a'); }, true); d.position.set(0, .008, .0245); d.rotation.set(-.7, 0, 0); m.add(d); return m; });
    const tk = ticket(1200); tk.position.set(0, .002, .05); tk.scale.setScalar(1.8); c.scene.add(tk);
    const xs = [0, 1, 2, 3, 4, 5].map(i => { const x = stampMark('✖', '#e23b2e', .05, 0); c.scene.add(x); x.position.set((-.5 + (.13 + i * .148)) * TICKET_W * 1.8, .005, .05 + (.55 - .5) * TICKET_H * 1.8); return x; });
    const t0 = T('L02', 2), t1 = T('L02', 6);
    return (f, l, u) => { balls.forEach((b, i) => { b.position.y = .026 + .05 * Math.max(0, 1 - pop(f, SHOTS[3].a + 2 + i * 3)) ; });
      xs.forEach((x, i) => { const at = t0 + (t1 - t0) * i / 5; x.visible = f >= at; x.scale.setScalar(Math.max(.01, 1.8 - .8 * Math.min(1, pop(f, at)))); });
      c.dof = 2; cam(c, [0, .42, .42], [0, 0, -.025], 40); }; },
  // 5 "the jackpot just keeps growing": a cash pile on the table grows in pops.
  5: c => { tabletop(c, '#efdcbc', '#f4c95d'); const P = cashPile(7); c.scene.add(P.g); const sign = sheet(.3, .12, 700, (g, w, h) => { rrect(g, 6, 6, w - 12, h - 12, 20); g.fillStyle = '#7a3fb0'; g.fill(); text(g, 'JACKPOT', w / 2, h / 2 + 4, h * .55, '#ffd84a', 10); }, true);
    sign.position.set(0, .34, -.05); c.scene.add(sign); const a0 = SHOTS[4].a, grow = [T('L02', 8), T('L02', 10), T('L02', 11)];
    return (f, l, u) => { const steps = grow.filter(g => f >= g).length; const base = Math.round(P.n * (.25 + .25 * steps)); P.set(Math.min(P.n, base + (steps === 3 ? Math.floor((f - grow[2]) / 2) : 0)));
      P.g.scale.setScalar(1 + .06 * Math.max(0, ...grow.map(g => f >= g ? Math.exp(-(f - g) / 4) : 0)));
      c.dof = 2; cam(c, [0, .45, .95 - .1 * u], [0, .12, 0], 40); void a0; }; },
  // 6 L03 "But in a game called WinFall": the brochure slaps down on the table.
  6: c => { tabletop(c, '#efdcbc', '#c7a6f0'); const br = sheet(.22, .3, 900, (g, w, h) => { g.fillStyle = '#7a3fb0'; rrect(g, 0, 0, w, h, 30); g.fill();
      text(g, 'WIN', w / 2, h * .26, w * .3, '#ffd84a', 14); text(g, 'FALL', w / 2, h * .48, w * .3, '#ffd84a', 14); text(g, 'Mass. Lottery', w / 2, h * .7, w * .09, '#ffffff');
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * (.15 + i * .14), h * .86, w * .055, 0, 7); g.fillStyle = '#ffffff'; g.fill(); } });
    c.scene.add(br); const land = T('L03', 5) - 3;
    return (f, l, u) => { const e = (f - land) / FPS; br.position.set(0, e < 0 ? .002 + 1.2 * e * e * 4 : .002, 0); br.rotation.z = e < 0 ? .5 * e : 0;
      const sh = kick(f - land, .01); c.dof = 2; cam(c, [sh, .52, .26], [0, 0, -.02], 40); }; },
  // 7 "once the jackpot got big and nobody won": a huge pile, NO WINNER stamped on it.
  7: c => { tabletop(c, '#efdcbc', '#f4c95d'); const P = cashPile(9); P.set(P.n); c.scene.add(P.g); const st = stampMark('NO WINNER', '#e23b2e', .7, -.12); st.rotation.set(0, 0, 0); c.scene.add(st);
    const at = T('L03', 12);
    return (f, l, u) => { const k = pop(f, at); st.visible = f >= at; st.position.set(0, .3, .45); st.scale.setScalar(Math.max(.01, 2.5 - 1.5 * Math.min(1, k)));
      c.dof = 1; cam(c, [0, .55, 1.45 - .1 * u], [0, .18, 0], 40); }; },
  // 8 "it was split between everyone who matched just a few numbers": the pile slides down a staircase into small piles 5, 4, 3.
  8: c => { tabletop(c, '#efdcbc', '#9fdcc6'); const stepCol = ['#7a3fb0', '#9a5fd0', '#b98ae6', '#d6b8f4'], H = [.6, .4, .2, 0];
    H.forEach((h, i) => { if (h > 0) c.scene.add(box(.42, h, .4, std(stepCol[i]), [-.63 + i * .42, h / 2, 0])); });
    const lab = ['', 'MATCH 5', 'MATCH 4', 'MATCH 3'].map((s, i) => { if (!s) return null; const m = sheet(.3, .08, 600, (g, w, h) => { rrect(g, 0, 0, w, h, 16); g.fillStyle = '#ffffff'; g.fill(); text(g, s, w / 2, h / 2 + 3, h * .62, '#7a3fb0'); }, true);
      m.position.set(-.63 + i * .42, H[i] + .005, .205); m.rotation.x = 0; c.scene.add(m); return m; });
    const bricks = Array.from({length: 27}, (_, i) => { const b = brick(); c.scene.add(b); const L = i % 3, k = Math.floor(i / 3);
      return {b, home: [-.63 + ((k % 3) - 1) * .1, H[0] + Math.floor(k / 3) * .031, ((k % 3) - 1) * .07 + (k > 4 ? .04 : 0)], dest: [-.63 + (L + 1) * .42 + ((k % 3) - 1) * .12, H[L + 1] + Math.floor(k / 3) * .031, ((k % 3) - 1) * .08], delay: k * 1.2 + L}; });
    const go = T('L03', 16);
    return (f, l, u) => { bricks.forEach(({b, home, dest, delay}) => { const s = smooth((f - go - delay) / 12), arc = Math.sin(Math.PI * s) * .25;
      b.position.set(lerp(home[0], dest[0], s), lerp(home[1], dest[1], s) + arc, lerp(home[2], dest[2], s)); b.rotation.z = -Math.PI * 2 * s * .5; });
      c.dof = 1; cam(c, [0, 1.0, 3.7 - .15 * u], [0, .34, 0], 40); }; },
  // 9 L04 "And matching a few numbers is easy, if you buy enough tickets": one ticket becomes a tall stack; green ticks rain on.
  9: c => { tabletop(c, '#efdcbc', '#b5e3a8'); const S = ticketStack(.002); c.scene.add(S);
    const ticks = Array.from({length: 8}, (_, i) => { const m = stampMark('✔', '#2aa04a', .06, 0); m.rotation.set(0, 0, 0); c.scene.add(m); return m; });
    const easy = T('L04', 6), buy = T('L04', 9), full = T('L04', 11);
    return (f, l, u) => { S.scale.y = .002 + .38 * smooth((f - buy) / Math.max(4, full - buy));
      ticks.forEach((m, i) => { const at = easy + i * 3, k = pop(f, at); m.visible = f >= at; m.position.set(((i * 37) % 7 - 3) * .03, .02 + .38 * smooth((f - buy) / Math.max(4, full - buy)) * (.2 + .1 * (i % 8)), .05); m.scale.setScalar(Math.max(.01, Math.min(1, k))); });
      c.dof = 1; cam(c, [0, .3, .95 - .06 * u], [0, .19, 0], 40); }; },
  // 10 L05 "Jerry did the math": kitchen table, pencil flying over a notepad, tongue out; a smile on "math".
  10: c => { kitchen(c); const a = actor(c, [0, 0, .05]); const pad = sheet(.2, .26, 600, (g, w, h) => { g.fillStyle = '#fffbe8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9ac4e8'; g.lineWidth = 3;
      for (let y = h * .12; y < h; y += h * .08) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } text(g, '100 → 120', w / 2, h * .3, w * .13, '#1a1a1a'); text(g, '+20%', w / 2, h * .48, w * .15, '#2aa04a'); });
    pad.position.set(0, .79, .5); pad.rotation.z = .1; c.scene.add(pad); const done = T('L05', 3);
    return (f, l, u) => { const t = l / FPS, writing = f < done + 6;
      jerry(a, t, writing ? 'lick' : 'proud', {armFront: true, look: writing ? .6 : 0, armPose: (side, S, g) => side < 0 ? [S, [S[0] - 26 * g.u, S[1] + .35 * g.HH], [300 - 20 * g.u, g.chin + .75 * g.HH]] as P[] :
        [S, [S[0] + 24 * g.u, S[1] + .35 * g.HH], [300 + (14 + (writing ? 14 * Math.sin(t * 24) : 0)) * g.u, g.chin + (.72 + (writing ? .04 * Math.sin(t * 17) : 0)) * g.HH]] as P[]});
      c.dof = 3; cam(c, [0, 1.35, 1.75 - .12 * u], [0, 1.08, .1], 40); }; },
  // 11 "every hundred dollars ... about a hundred and twenty": $100 stack in, a taller $120 stack pops out.
  11: c => { tabletop(c, '#efdcbc', '#f4c95d'); const mk = (n: number, x: number) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const b = brick(); b.position.y = i * .031; g.add(b); } g.position.x = x; c.scene.add(g); return g; };
    const A = mk(5, -.16), Bq = mk(6, .16); const lab = (s: string, x: number, col: string) => { const m = sheet(.14, .063, 600, (g, w, h) => text(g, s, w / 2, h / 2, h * .8, col, 12), true); m.position.set(x, .3, .02); c.scene.add(m); return m; };
    const la = lab('$100', -.14, '#ffffff'), lb = lab('$120', .14, '#ffd84a'), arrow = lab('→', 0, '#ffffff'); arrow.position.y = .1;
    const in0 = T('L05', 7), out = T('L05', 15), big = T('L05', 17);
    return (f, l, u) => { const ka = pop(f, in0), kb = pop(f, out); A.scale.setScalar(Math.max(.01, Math.min(1.2, ka))); la.visible = f >= in0; la.position.y = .21;
      Bq.visible = f >= out; Bq.scale.set(1, Math.max(.01, kb), 1); lb.visible = f >= out; lb.position.y = .25; lb.scale.setScalar(f >= big ? 1 + .4 * Math.exp(-(f - big) / 5) : 1); arrow.visible = f >= out - 6;
      c.dof = 1; cam(c, [0, .3, 1.25 - .05 * u], [0, .15, 0], 40); }; },
  // 12 L06 "So he bet twenty-two hundred dollars": at the counter, Jerry slides a fat bundle of cash to the cashier.
  12: c => { store(c); const a = actor(c, [-.45, 0, .82], 1.72, 3), cl = actor(c, [.42, 0, -.2], 1.68, 7); const cash = new THREE.Group(); [0, 1, 2].forEach(i => { const b = brick(); b.position.y = i * .031; cash.add(b); }); c.scene.add(cash);
    const slide = T('L06', 3);
    return (f, l, u) => { const t = l / FPS, s = smooth((f - slide) / 14); cash.position.set(lerp(-.3, .3, s), 1.05, lerp(.6, .3, s)); cash.rotation.y = .3; cash.scale.setScalar(1.6);
      jerry(a, t, 'grin', {armFront: true, armPose: (side, S, g) => side > 0 ? [S, [S[0] + 30 * g.u, S[1] + .3 * g.HH], [S[0] + lerp(40, 75, s) * g.u, g.chin + .5 * g.HH]] as P[] : null});
      cl.draw(CLERK, {expr: f > slide + 10 ? 'shock' : 'neutral', blink: blinkAt(t + .7), costume: apron('#2a7a50')});
      c.dof = 1; cam(c, [0, 1.45, 4.3 - .15 * u], [0, 1.15, .3], 40); }; },
  // 13 "...and lost fifty": Jerry's face drops; a red -$50 floats up and a lone coin rolls away.
  13: c => { store(c); const a = actor(c, [0, 0, -.2]); const minus = sheet(.22, .09, 600, (g, w, h) => text(g, '-$50', w / 2, h / 2, h * .85, '#e23b2e', 12), true); c.scene.add(minus);
    const cn = coin(); cn.rotation.x = Math.PI / 2; c.scene.add(cn); const lost = T('L06', 7);
    return (f, l, u) => { const t = l / FPS, e = (f - lost) / FPS; jerry(a, t, f < lost ? 'smile' : e < .5 ? 'shock' : 'pained', {headTilt: f < lost ? 0 : -4});
      minus.visible = e >= 0; minus.position.set(.12, 1.3 + .1 * Math.max(0, e), .25); (minus.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - Math.max(0, e - .9));
      cn.visible = e >= 0; cn.position.set(-.1 + .35 * Math.max(0, e), 1.062, .3); cn.rotation.y = -e * 12;
      closeUp(c, a, u, 1.35, 1.38); }; },
  // 14 L07 "He hadn't bought enough tickets": the aha - finger up, proud face.
  14: c => { kitchen(c); const a = actor(c, [0, 0, .05]); const aha = T('L07', 3);
    return (f, l, u) => { const t = l / FPS, k = smooth((f - aha + 4) / 6); jerry(a, t, f < aha ? 'stern' : 'proud', {armPose: armUp(1, k), look: f < aha ? -.4 : 0});
      closeUp(c, a, u, 1.4, 1.36); }; },
  // 15 "So he bet eight thousand": a much taller ticket stack thumps down.
  15: c => { tabletop(c, '#efdcbc', '#8fd0f0'); const S = ticketStack(.75); c.scene.add(S); const lab = sheet(.32, .11, 700, (g, w, h) => text(g, '$8,000', w / 2, h / 2, h * .8, '#ffffff', 14), true); c.scene.add(lab);
    const land = T('L07', 8) - 1;
    return (f, l, u) => { const e = (f - land) / FPS; S.position.y = e < 0 ? Math.min(2, 5 * e * e * 6) : 0; lab.visible = f >= land; lab.position.set(0, .85, .1); lab.scale.setScalar(Math.max(.01, Math.min(1, pop(f, land + 2))));
      const sh = kick(f - land, .03); c.dof = 1; cam(c, [sh, .55, 1.65 - .08 * u], [0, .45, 0], 40); }; },
  // 16 "and won almost sixteen thousand": the cash pile doubles with a pop; Jerry pops up behind it, grinning.
  16: c => { tabletop(c, '#efdcbc', '#f4c95d'); const P = cashPile(8, 1.4); c.scene.add(P.g); const a = actor(c, [0, 0, -.5], 1.0, 3); const dbl = T('L07', 13);
    return (f, l, u) => { const t = l / FPS; P.set(f < dbl ? Math.round(P.n * .45) : P.n); P.g.scale.setScalar(1.4 * (f < dbl ? 1 : 1 + .08 * Math.exp(-(f - dbl) / 4)));
      const up = smooth((f - dbl - 4) / 8); a.k.mesh.position.y = lerp(-.75, -.32, up); jerry(a, t, 'laugh', {});
      c.dof = 1; cam(c, [0, .5, 1.6 - .08 * u], [0, .32, 0], 40); }; },
  // 17 L08 "He told his wife Marge": Marge, arms crossed, unimpressed.
  17: c => { kitchen(c); const a = actor(c, [0, 0, .05], 1.66, 5);
    return (f, l, u) => { const t = l / FPS; marge(a, t, 'stern', {armPose: armsCrossed, armFront: true, look: -.3}); closeUp(c, a, u, 1.35, 1.32); }; },
  // 18 "and she was in": a huge grin and a thumbs up.
  18: c => { kitchen(c); const a = actor(c, [0, 0, .05], 1.66, 5); const yes = T('L08', 8);
    return (f, l, u) => { const t = l / FPS, k = smooth((f - yes + 6) / 6); marge(a, t, f < yes - 4 ? 'smile' : 'laugh', {armPose: armUp(-1, k), tilt: f >= yes ? 3 * Math.sin((f - yes) * .5) * Math.exp(-(f - yes) / 15) : 0});
      closeUp(c, a, u, 1.25, 1.34); }; },
  // 19 L09 "Friends and family chipped in": bundles drop one by one into a big LOTTERY FUND jar.
  19: c => { tabletop(c, '#efdcbc', '#f7a9a0'); const glass = new THREE.MeshStandardMaterial({color: '#dff3ff', transparent: true, opacity: .28, roughness: .05, side: THREE.DoubleSide});
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .5, 48, 1, true), glass); jar.position.y = .25; const lid = box(.36, .03, .36, std('#d9b44a', .3, .6)); lid.visible = false;
    const label = sheet(.3, .1, 700, (g, w, h) => { rrect(g, 0, 0, w, h, 18); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#7a3fb0'; g.stroke(); text(g, 'LOTTERY FUND', w / 2, h / 2 + 3, h * .5, '#7a3fb0'); }, true);
    label.position.set(0, .2, .205); c.scene.add(jar, lid, label);
    const drops = Array.from({length: 9}, (_, i) => { const b = brick(); c.scene.add(b); return {b, at: T('L09', 0) + i * 4, x: ((i * 3) % 5 - 2) * .05, z: ((i * 7) % 3 - 1) * .05, y: .01 + Math.floor(i / 3) * .032}; });
    return (f, l, u) => { drops.forEach(d => { const e = (f - d.at) / FPS; d.b.visible = e > -.4; d.b.position.set(d.x, Math.max(d.y, d.y + .9 - 4.9 * (e + .43) ** 2 * (e > -.43 ? 1 : 0)), d.z); d.b.rotation.y = d.x * 8; });
      c.dof = 1; cam(c, [0, .6, 1.55 - .06 * u], [0, .24, 0], 40); }; },
  // 20 "and they bought hundreds of thousands of tickets": the store printer spits an endless ribbon of tickets; the clerk is buried.
  20: c => { store(c); const cl = actor(c, [.3, 0, -.25], 1.68, 7); const pr = new THREE.Group(); pr.add(box(.36, .22, .32, std('#3a3f4a', .5), [0, .11, 0]), box(.24, .02, .04, std('#111111'), [0, .2, .16]));
    pr.position.set(-.3, 1.05, .4); c.scene.add(pr);
    const fly = Array.from({length: 70}, (_, i) => { const tk = ticket(300); tk.scale.setScalar(1.5); c.scene.add(tk);
      return {tk, at: i * .045, vx: ((i * 37) % 13 - 6) * .12, vz: .6 + ((i * 11) % 7) * .12, vy: 1.6 + ((i * 7) % 5) * .25, rz: (i * 29) % 9, land: .01 + (i % 9) * .012}; });
    return (f, l, u) => { const t = l / FPS;
      fly.forEach(q => { const e = t - q.at; q.tk.visible = e > 0; if (e <= 0) return; const y0 = 1.27, y = y0 + q.vy * e - 4.9 * e * e;
        const tl = (q.vy + Math.sqrt(q.vy * q.vy + 19.6 * (y0 - q.land))) / 9.8, te = Math.min(e, tl);
        q.tk.position.set(-.3 + q.vx * te, Math.max(q.land, y), .5 + q.vz * te); q.tk.rotation.set(-Math.PI / 2 + (e < tl ? e * 6 : 0), 0, q.rz + (e < tl ? e * 4 : 0)); });
      cl.draw(CLERK, {expr: t < .5 ? 'neutral' : 'shock', blink: blinkAt(t), costume: apron('#2a7a50'), armPose: (side, S, g) => [S, [S[0] + side * 40 * g.u, S[1] - .1 * g.HH], [S[0] + side * 30 * g.u, S[1] - .55 * g.HH]] as P[]});
      c.dof = 1; cam(c, [0, 1.5, 3.4 - .15 * u], [0, 1.05, .3], 40); }; },
  // 21 L10 "Then a newspaper spotted stores selling millions in tickets": a newspaper slams onto a desk.
  21: c => { tabletop(c, '#c8a47a', '#d9dde4'); const np = sheet(.42, .56, 1000, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
      text(g, 'THE DAILY GLOBE', w / 2, h * .07, w * .08, '#1a1a1a'); g.fillStyle = '#1a1a1a'; g.fillRect(w * .05, h * .12, w * .9, 6);
      text(g, 'STORES SELL', w / 2, h * .2, w * .11, '#1a1a1a'); text(g, 'MILLIONS IN', w / 2, h * .3, w * .11, '#1a1a1a'); text(g, 'LOTTO TICKETS', w / 2, h * .4, w * .11, '#c22a2a');
      g.fillStyle = '#bcb6aa'; g.fillRect(w * .08, h * .48, w * .4, h * .3); for (let y = h * .5; y < h * .95; y += h * .035) { g.fillRect(w * .54, y, w * .38, h * .012); } });
    c.scene.add(np); const land = T('L10', 2) - 2;
    return (f, l, u) => { const e = (f - land) / FPS; np.position.set(0, e < 0 ? .002 + 8 * e * e : .002, 0); np.rotation.z = e < 0 ? -.8 * e : .04;
      c.dof = 2; cam(c, [kick(f - land, .015), .7, .38], [0, 0, -.03], 40); }; },
  // 22 "and the state suspected organized crime": an investigator, fedora and magnifier, squints; a red-string board behind.
  22: c => { room(c, '#e9e2d0', '#a88a66'); const board = sheet(1.4, .9, 1000, (g, w, h) => { g.fillStyle = '#c69a5e'; g.fillRect(0, 0, w, h);
      const pts = [[.18, .25], [.5, .18], [.82, .3], [.3, .7], [.7, .72]]; g.strokeStyle = '#d42a2a'; g.lineWidth = 6; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h)); g.lineTo(.18 * w, .25 * h); g.stroke();
      pts.forEach(([x, y]) => { g.fillStyle = '#fffbe8'; g.fillRect(x * w - 60, y * h - 40, 120, 80); g.fillStyle = '#d42a2a'; g.beginPath(); g.arc(x * w, y * h - 40, 10, 0, 7); g.fill(); });
      text(g, '?', .5 * w, .5 * h, h * .3, '#d42a2a', 10); }, true); board.position.set(0, 1.55, -1.55); c.scene.add(board);
    const a = actor(c, [0, 0, -.1], 1.78, 9); const mag = holding((p, x, y, u) => { p.line([[x, y], [x + 22 * u, y - 46 * u]], '#6a4a2a', 9 * u); p.ell(x + 32 * u, y - 70 * u, 26 * u, 26 * u, 'rgba(210,235,255,.5)', 6 * u); });
    const sus = T('L10', 13);
    return (f, l, u) => { const t = l / FPS; a.draw(SLEUTH, {expr: f < sus ? 'stern' : 'nervous', blink: blinkAt(t), look: .3 * Math.sin(t * 2), armFront: true, costume: dress(fedora(), mag),
      armPose: (side, S, g) => side > 0 ? [S, [S[0] + 30 * g.u, S[1] + .32 * g.HH], [300 + 40 * g.u, g.chin + .4 * g.HH]] as P[] : null});
      closeUp(c, a, u * (f >= sus ? 1.6 : 1), 1.5, 1.45); }; },
  // 23 L11 "Investigators found a retired couple...": a giant lens sweeps the kitchen and stops on Jerry and Marge, waving.
  23: c => { kitchen(c); const j = actor(c, [-.3, 0, .05], 1.72, 3), m = actor(c, [.32, 0, .05], 1.66, 5);
    const lens = new THREE.Group(), rim = new THREE.Mesh(new THREE.TorusGeometry(.42, .04, 12, 64), std('#6a4a2a', .5)), handle = box(.08, .7, .06, std('#6a4a2a', .5), [.34, -.62, 0]); handle.rotation.z = .5;
    lens.add(rim, handle); lens.traverse(o => o.layers.set(NOINK)); c.scene.add(lens); const stop = T('L11', 3);
    return (f, l, u) => { const t = l / FPS, s = smooth((f - SHOTS[22].a) / Math.max(6, stop - SHOTS[22].a)), found = f >= stop;
      lens.position.set(lerp(-1.4, .0, s), 1.25, 1.1); lens.rotation.z = lerp(.3, 0, s);
      jerry(j, t, found ? 'grin' : 'neutral', {wave: found ? t * 8 : undefined}); marge(m, t, found ? 'smile' : 'neutral', {wave: found ? t * 8 + 1 : undefined});
      c.dof = 0; cam(c, [0, 1.35, 2.6], [0, 1.2, 0], 40); }; },
  // 24 "...doing math": a calculator on the kitchen table, keys pressing, the display ends on the answer.
  24: c => { tabletop(c, '#f4ead2', '#f6d36b'); const calc = new THREE.Group(); calc.add(box(.16, .02, .24, std('#3a3f4a', .5), [0, .01, 0])); c.scene.add(calc);
    const keys: THREE.Mesh[] = []; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { const k = box(.03, .012, .03, std(q === 3 ? '#ff9a3a' : '#e9e6df', .5), [(q - 1.5) * .036, .024, (r - .6) * .036]); calc.add(k); keys.push(k); }
    const disp = sheet(.13, .06, 600, () => {}); disp.position.set(0, .0205, -.075); calc.add(disp); const ans = T('L11', 6);
    return (f, l, u) => { const t = l / FPS; keys.forEach((k, i) => { k.position.y = .024 - (Math.floor(t * 7) % 16 === (i * 5) % 16 && f < ans ? .006 : 0); });
      disp.redraw((g, w, h) => { g.fillStyle = '#b8d8b0'; g.fillRect(0, 0, w, h); text(g, f < ans ? String(100 + Math.floor(t * 37) % 900) : '+20%', w * .93, h / 2 + 4, h * .62, '#1a2a1a', 0, 'right'); });
      c.dof = 1; cam(c, [0, .32, .3 - .02 * u], [0, 0, -.02], 40); }; },
  // 25 "And it was all legal": a green LEGAL stamp thumps onto a ticket.
  25: c => { tabletop(c, '#efdcbc', '#b5e3a8'); const tk = ticket(1200); tk.position.y = .002; tk.scale.setScalar(1.6); c.scene.add(tk); const st = stampMark('LEGAL', '#1f9a45', .13, -.18); c.scene.add(st);
    const at = T('L11', 11);
    return (f, l, u) => { const k = pop(f, at); st.visible = f >= at; st.position.set(0, .006, .005); st.scale.setScalar(Math.max(.01, 2.4 - 1.4 * Math.min(1, k)));
      c.dof = 1; cam(c, [kick(f - at, .006), .5, .3], [0, 0, -.01], 40); }; },
  // 26 L12 "In the end, their group won nearly twenty-seven million dollars": a counter rolls up to $27,000,000 over a mountain of cash.
  26: c => { tabletop(c, '#efdcbc', '#f4c95d'); const P = cashPile(10, 1.6); P.set(P.n); c.scene.add(P.g);
    const ctr = sheet(.9, .24, 1000, () => {}, true); ctr.position.set(0, 1.05, -.2); c.scene.add(ctr); const end = T('L12', 7), a0 = SHOTS[25].a;
    return (f, l, u) => { const k = smooth((f - a0) / Math.max(1, end - a0)), v = Math.round(27000000 * (1 - (1 - k) ** 3));
      ctr.redraw((g, w, h) => { rrect(g, 0, 0, w, h, 30); g.fillStyle = '#1a1a1a'; g.fill(); text(g, '$' + v.toLocaleString('en-US'), w / 2, h / 2 + 6, h * .62, f >= end ? '#ffd84a' : '#7fe08a'); });
      ctr.scale.setScalar(f >= end ? 1 + .12 * Math.exp(-(f - end) / 5) : 1);
      c.dof = 0; cam(c, [0, .9, 3.3 - .2 * u], [0, .62, 0], 40); }; },
  // 27 (pause) L13 "And they kept every ticket in tubs in their barn, in case of an audit": barn doors open on a wall of ticket tubs;
  //   Jerry and Marge sit on top; on "audit" Marge waves a ticket.
  27: c => { room(c, '#c8463a', '#b8925e', -2.2); const tubs = new THREE.Group(), lidM = std('#3a6fd0', .5), clear = new THREE.MeshStandardMaterial({color: '#eaf6ff', transparent: true, opacity: .35, roughness: .1}), fill = std('#f3e6c8', .9);
    for (let y = 0; y < 5; y++) for (let x = -3; x <= 3; x++) { const t = new THREE.Group(); t.add(box(.5, .3, .4, fill, [0, .13, 0]), box(.54, .34, .44, clear, [0, .17, 0]), box(.56, .03, .46, lidM, [0, .355, 0])); t.position.set(x * .56, y * .37, -1.6); tubs.add(t); }
    c.scene.add(shadows(tubs));
    const j = actor(c, [-.3, 1.86, -1.5], 1.2, 3), m = actor(c, [.3, 1.86, -1.5], 1.15, 5);
    const doorL = new THREE.Group(), doorR = new THREE.Group(), wood = std('#a8322a', .8), trim = std('#f4efe4', .7);
    for (const [d, s] of [[doorL, -1], [doorR, 1]] as const) { const p = box(1.6, 3.4, .08, wood, [-s * .8, 1.7, 0]); const x1 = box(.1, 3.6, .09, trim, [-s * .8, 1.7, .01]); x1.rotation.z = s * .44; const x2 = x1.clone(); x2.rotation.z = -s * .44;
      d.add(p, x1, x2, box(1.6, .1, .09, trim, [-s * .8, .05, .01]), box(1.6, .1, .09, trim, [-s * .8, 3.35, .01])); d.position.set(s * 1.6, 0, .6); c.scene.add(shadows(d)); }
    const tk = holding((p, x, y, u) => { p.poly([[x - 26 * u, y - 14 * u], [x + 26 * u, y - 14 * u], [x + 26 * u, y + 12 * u], [x - 26 * u, y + 12 * u]], '#fff6e2', 3 * u); p.poly([[x - 26 * u, y - 14 * u], [x + 26 * u, y - 14 * u], [x + 26 * u, y - 5 * u], [x - 26 * u, y - 5 * u]], '#7a3fb0', 0); });
    const open = SHOTS[26].a + 2, audit = T('L13', 14);
    return (f, l, u) => { const t = l / FPS, o = smooth((f - open) / 16); doorL.rotation.y = -1.9 * o; doorR.rotation.y = 1.9 * o;
      jerry(j, t, 'grin', {}); marge(m, t, f >= audit ? 'laugh' : 'smile', {costume: f >= audit ? tk : {}, armPose: f >= audit ? armUp(1, 1) : undefined, wave: f >= audit ? t * 9 : undefined});
      c.dof = 0; cam(c, [0, 2.0, lerp(4.4, 2.3, smooth(u * 1.3))], [0, lerp(1.5, 2.2, smooth(u * 1.3)), -1.5], 40); }; },
};
const placeholder = (c: Ctx): Upd => { tabletop(c); return () => cam(c, [0, .5, 1], [0, 0, 0], 40); };

const captionAt = (t: number) => { // groups of <= 3 words within a line, shown while spoken; active = the word being said
  const idx = W.findIndex(w => t >= w.start - .05 && t < w.end + .25); if (idx < 0) return {words: [] as string[], active: -1};
  const first = W.findIndex(w => w.line === W[idx].line), g = first + Math.floor((idx - first) / 3) * 3;   // groups never cross a line
  const grp = W.slice(g, g + 3).filter(w => w.line === W[idx].line);
  const active = grp.findIndex(w => t >= w.start - .03 && t < w.end + .08);
  return {words: grp.map(w => w.word.replace(/[.,!?:]|\.\.\./g, '')), active};
};

export const LotteryShort: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [st, setSt] = useState<{lib: Lib; env: THREE.DataTexture} | null>(null);
  const [handle] = useState(() => delayRender('assets'));
  useLayoutEffect(() => { const ld = new GLTFLoader();
    Promise.all([Promise.all(IDS.map(id => ld.loadAsync(staticFile(`${id}.glb`)).then(g => [id, g.scene] as const))), new RGBELoader().loadAsync(staticFile('meadow_2.hdr')),
      document.fonts.load(`120px LilitaOneLocal`).catch(() => null)])   // printed props draw with the caption font: load it first
      .then(([a, env]) => { setSt({lib: Object.fromEntries(a), env}); continueRender(handle); }).catch(e => { console.error(e); continueRender(handle); }); }, [handle]);
  const S = useRef<{renderer?: THREE.WebGLRenderer; pic?: number; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; composer?: EffectComposer; lens?: LensBlur; upd?: Upd; ctx?: Ctx}>({});
  useLayoutEffect(() => () => { S.current.composer?.dispose(); S.current.renderer?.dispose(); }, []);
  useLayoutEffect(() => {
    if (!st) return; const R = S.current;
    if (!R.renderer) { R.renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true}); R.renderer.setSize(width, height, false); }
    const shot = shotAt(frame);
    if (R.pic !== shot.pic) {
      R.composer?.dispose();
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, width / height, .02, 400); camera.layers.enable(NOINK);
      const ctx: Ctx = {L: st.lib, scene, camera, env: st.env, renderer: R.renderer, look: [0, 0, 0], dof: 0};
      R.upd = (B[shot.pic] ?? placeholder)(ctx);
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
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: CAPTION_BOTTOM}}><div style={{transform: `scale(${width / 1080})`, transformOrigin: '50% 100%', display: 'flex', justifyContent: 'center', width: '100%'}}><div style={captionCss(capText)}>
      {cap.words.map((w, i) => <span key={i} style={i === cap.active ? {...captionWord, ...captionActive} : captionWord}>{w}</span>)}</div></div></AbsoluteFill>
  </AbsoluteFill>;
};
export {INK, place};
