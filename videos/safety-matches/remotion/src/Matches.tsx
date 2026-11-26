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
import {candle, captionCss, grassField, lightRig, loadCaptionFont, makePost, place, refStyle} from './kit/world';
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
/** two sticks held crossed in front of the body (fire drill) */
const sticks = (phase: number): Costume => ({hand: (k: Kit) => { const u = k.u, [a, b] = k.hands, dx = 6 * u * Math.sin(phase);
  k.p.band([[a[0] + dx, a[1]], [b[0] - dx, b[1] - 30 * u]], '#8a5a32', 5 * u, 1.6 * u, 'round'); k.p.band([[a[0] - 10 * u, a[1] + 20 * u], [b[0] + 10 * u, b[1] + 22 * u]], '#7a4a2a', 6 * u, 1.6 * u, 'round'); }});
/** the jaw glows green (phossy jaw, kept comic: a soft green glow on the chin) */
const glowJaw: Costume = {head: (k: Kit) => { const u = k.u;
  for (const [r, a] of [[46, .18], [34, .3], [24, .55]] as const) k.p.ell(300, k.hc + .55 * k.Hb, r * u * 1.6, r * u, `rgba(150,255,140,${a})`, 0); }};
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
const sandpaper = () => { const m = new THREE.Mesh(new THREE.BoxGeometry(.07, .002, .05), std('#b98a52', 1)); m.castShadow = m.receiveShadow = true; return m; };
const rug = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d')!; g.fillStyle = '#9a2a24'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#e8c45a'; g.lineWidth = 14; g.strokeRect(20, 20, 216, 216); g.strokeStyle = '#2f4a6a'; g.lineWidth = 8; g.strokeRect(48, 48, 160, 160);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({map: t, roughness: 1}));
  m.rotation.x = -Math.PI / 2; m.position.y = .022; m.receiveShadow = true; return m; };
const tin = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .05, 32), std('#9aa2ae', .35)); b.position.y = .025; g.add(b);
  const lid = new THREE.Group(); const l = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .012, 32), std('#b8c0cc', .3)); l.position.set(0, 0, .042); lid.add(l); lid.position.set(0, .05, -.042); g.add(lid);
  g.traverse(o => { (o as THREE.Mesh).castShadow = (o as THREE.Mesh).receiveShadow = true; }); return {g, lid}; };
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
      g.fillStyle = grd; g.beginPath(); g.moveTo(100, 300); g.bezierCurveTo(10, 270, 40 + wob, 160 - 40 * s, 100 + wob * .6, 300 - 290 * s); g.bezierCurveTo(160 + wob, 160 - 40 * s, 190, 270, 100, 300); g.fill(); }); }};
};
/** drifting green fume puffs */
const fumes = (scene: THREE.Scene, n = 14, col = '#8af07a') => Array.from({length: n}, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.12 + .05 * (i % 3), 12, 8),
  new THREE.MeshBasicMaterial({color: col, transparent: true, opacity: .22, depthWrite: false})); m.layers.set(NOINK); scene.add(m);
  return (t: number, base: number[]) => { const k = (t * .15 + i / n) % 1; m.position.set(base[0] + 1.6 * Math.sin(i * 2.3) * k, base[1] + 1.4 * k, base[2] + .8 * Math.cos(i * 1.7) * k); (m.material as THREE.MeshBasicMaterial).opacity = .25 * Math.sin(Math.PI * k); }; });

// ---------- sets ----------
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera; env: THREE.DataTexture; renderer: THREE.WebGLRenderer; look: number[]; dof: number; near?: number};
const cam = (c: Ctx, p: number[], t: number[], fov = 40) => { c.look = t; c.camera.fov = fov; c.camera.near = c.near ?? .05; c.camera.updateProjectionMatrix(); c.camera.position.set(p[0], p[1], p[2]); c.camera.lookAt(t[0], t[1], t[2]); };
const glide = (c: Ctx, A: number[][], B: number[][], u: number, fov = 40) => cam(c, lerp3(A[0], B[0], smooth(u)), lerp3(A[1], B[1], smooth(u)), fov);
const meadow = (c: Ctx) => { lightRig(c.renderer, c.scene, c.env); const s = c.scene;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), std('#4f8a2a', 1)); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; s.add(g);
  s.add(grassField(120000, -6, 6, -6, 6, (x, z) => Math.hypot(x, z - .8) < .55));
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
const factory = (c: Ctx, night: boolean) => { lightRig(c.renderer, c.scene, c.env, {night: true}); const s = c.scene; s.background = new THREE.Color(night ? '#05040a' : '#1c1820');
  for (let x = -6; x <= 6; x += 2) for (let z = -2; z <= 4; z += 2) s.add(place(c.L, 'medieval-village-megakit/floor-wooddark', x, 0, z));
  for (let i = 0; i < 7; i++) s.add(place(c.L, 'medieval-village-megakit/wall-unevenbrick-straight', -6 + i * 2, 0, -2.4));
  [-1.4, 1.4].forEach(x => s.add(place(c.L, 'fantasy-props-megakit/table-large', x, 0, -.4, Math.PI / 2)));
  if (!night) { [[-1.4, 2.2, .2], [1.4, 2.2, .2]].forEach(p => { const l = new THREE.PointLight('#ffe0a8', 10, 8, 1.6); l.position.set(p[0], p[1], p[2]); l.castShadow = true; s.add(l); }); }
  s.add(place(c.L, 'fantasy-props-megakit/crate-wooden', -3.6, 0, -1.4)); s.add(place(c.L, 'fantasy-props-megakit/crate-wooden', 3.6, 0, -1.4, .4)); };

// ---------- the 16 pictures ----------
type Upd = (f: number, l: number, u: number) => void;
const B: Record<number, (c: Ctx) => Upd> = {
  // 1 rub two sticks together (caveman, meadow)
  1: c => { meadow(c); const a = actor(1.7); a.k.mesh.position.set(-.2, 0, .3); c.scene.add(a.k.mesh); const sm = fumes(c.scene, 6, '#d8d4cc');
    sm.forEach(f => f(0, [0, 0, .8]));
    return (f, l, u) => { a.draw(CAVE, {expr: 'stern', seed: 5, look: .3, costume: sticks(l * .9)});
      sm.forEach(fn => fn(l / FPS * 2, [.1, .2, .8]));
      c.dof = 5; glide(c, [[.6, 1.3, 4.2], [0, 1.0, .5]], [[.5, 1.25, 3.6], [0, 1.0, .5]], u, 40); }; },
  // 2 it takes so long your arms give out
  2: c => { meadow(c); const a = actor(1.7); a.k.mesh.position.set(-.2, 0, .3); c.scene.add(a.k.mesh);
    return (f, l, u) => { a.draw(CAVE, {expr: u > .4 ? 'dazed' : 'nervous', seed: 5, tilt: 8 * smooth(u * 2), costume: sticks(l * .2)});
      c.dof = 7; cam(c, [.2, 1.5, 2.2], [-.15, 1.35, .3], 40 * (1 - .002 * l)); }; },
  // 3 chemical match dipped in acid bursts into flame (ECU on the bench; close-up props are drawn 4x real size)
  3: c => { c.near = .01; const top = room(c); const bt = bottle(); bt.scale.setScalar(3.2); bt.position.set(.08, top, -1.0); c.scene.add(bt);
    const m = match3d(.2); c.scene.add(m); const fl = flame(c.scene, .16, 3); const burst = T('L02', 6);
    return (f, l, u) => { const dip = smooth((f - burst + 14) / 10) * (1 - smooth((f - burst) / 8));
      const y = top + .62 - .22 * dip; m.position.set(.08, y, -1.0); m.rotation.z = Math.PI;
      fl.at([.08, y - .23, -1.0], l / FPS, smooth((f - burst) / 6) * (1 - dip)); c.dof = 6; cam(c, [.25, top + .45, .1], [.08, top + .35, -1.0], 40); }; },
  // 4 then you had to carry a bottle of acid around (gent tiptoes along the street)
  4: c => { street(c); const a = actor(1.78); c.scene.add(a.k.mesh);
    return (f, l, u) => { a.k.mesh.position.set(lerp(-1.2, .6, u), 0, .2);
      a.draw(GENT, {mode: 'stroll', phase: l / FPS * 1.2, expr: 'nervous', seed: 21, look: -.6, costume: dress(cravat(), acidBottle(1))});
      c.dof = 5; glide(c, [[-.6, 1.5, 3.8], [-.4, 1.2, 0]], [[.6, 1.5, 3.8], [.5, 1.2, 0]], u, 42); }; },
  // 5 a match dragged through folded sandpaper: whoosh (ECU, 4x props)
  5: c => { c.near = .01; const top = room(c); const sp = sandpaper(); sp.scale.setScalar(4); sp.position.set(0, top + .008, -1.0); c.scene.add(sp);
    const sp2 = sandpaper(); sp2.scale.setScalar(4); sp2.position.set(0, top + .05, -1.0); sp2.rotation.z = .2; c.scene.add(sp2);
    const m = match3d(.2); c.scene.add(m); const fl = flame(c.scene, .16, 3.5); const lit = T('L03', 7);
    return (f, l, u) => { const x = lerp(-.32, -.08, smooth((f - lit + 18) / 18)); m.position.set(x, top + .07, -.94); m.rotation.z = -Math.PI / 2;
      fl.at([x + .22, top + .06, -.94], l / FPS, smooth((f - lit) / 4)); c.dof = 6; cam(c, [.12, top + .32, -.25], [.05, top + .04, -1.0], 40); }; },
  // 6 it stank of sulfur and burning bits fell onto the carpet
  6: c => { room(c); const r = rug(); r.position.set(.2, .022, .6); c.scene.add(r); const a = actor(1.78); a.k.mesh.position.set(-.3, 0, .1); c.scene.add(a.k.mesh);
    const fl = flame(c.scene, .18, 3); const blob = new THREE.Mesh(new THREE.SphereGeometry(.02, 10, 8), new THREE.MeshBasicMaterial({color: '#ffb23a', toneMapped: false})); c.scene.add(blob);
    const fall = T('L03', 16);
    return (f, l, u) => { const s = (f - fall + 12) / FPS; const y = s < 0 ? 1.55 : Math.max(.03, 1.55 - 4.9 * s * s * 1.6); blob.position.set(.25, y, .55); blob.visible = s < .55;
      fl.at([.25, .03, .55], l / FPS, smooth((f - fall - 2) / 10));
      a.draw(GENT, {expr: f > fall ? 'shock' : 'pained', seed: 21, look: .5, wave: 1, costume: dress(cravat(), matchInHand(1, 1))});
      c.dof = 4; cam(c, [.3, 1.4, 3.6], [0, .9, .3], 44); }; },
  // 7 white phosphorus lit on anything you struck it against (strike on the wall)
  7: c => { street(c); const a = actor(1.78); a.k.mesh.position.set(.1, 0, -.9); c.scene.add(a.k.mesh); const strike = T('L04', 12);
    return (f, l, u) => { a.draw(GENT, {expr: f > strike ? 'smile' : 'neutral', seed: 21, look: -1, wave: 1, costume: dress(cravat(), matchInHand(1, smooth((f - strike) / 4)))});
      c.dof = 5; glide(c, [[1.4, 1.6, 2.6], [0, 1.4, -1.2]], [[1.1, 1.6, 2.2], [0, 1.45, -1.2]], u, 40); }; },
  // 8 it lit so easily it had to be kept in a sealed tin (lid slams; 4x props)
  8: c => { c.near = .01; const top = room(c); const t = tin(); t.g.scale.setScalar(3); t.g.position.set(0, top, -1.0); c.scene.add(t.g);
    for (let i = 0; i < 7; i++) { const m = match3d(.2); m.rotation.z = Math.PI / 2 + .08 * (i - 3); m.position.set(-.1 + .006 * i, top + .1 + .012 * i, -1.0 + .02 * (i % 3)); c.scene.add(m); }
    const slam = T('L04', 28);
    return (f, l, u) => { t.lid.rotation.x = -1.9 * (1 - smooth((f - slam + 8) / 8)); c.dof = 6; cam(c, [.25, top + .55, -.15], [0, top + .1, -1.0], 40); }; },
  // 9 worse, it was poison: the match factory, green fumes over the tables
  9: c => { factory(c, false); const girls = ['#8c3b4a', '#3f6fb5', '#5d7a3a'].map((col, i) => { const a = person(GIRL(col), 1.62, {expr: i === 1 ? 'nervous' : 'neutral', seed: 40 + i, look: i - 1, costume: apron('#cfc2a0')}); a.mesh.position.set(-1.4 + i * 1.4, 0, -1.2); c.scene.add(a.mesh); return a; });
    void girls; const fm = fumes(c.scene, 16);
    return (f, l, u) => { fm.forEach(fn => fn(l / FPS, [0, .8, -.6])); c.dof = 3; glide(c, [[0, 1.8, 4.2], [0, 1.2, -.6]], [[0, 1.7, 3.6], [0, 1.25, -.6]], u, 44); }; },
  // 10 their bones even glowed in the dark (lights out: a green chin glow)
  10: c => { factory(c, true); const a = person(GIRL('#8c3b4a'), 1.62, {expr: 'dazed', seed: 40, costume: glowJaw}); a.mesh.position.set(0, 0, -1.0); c.scene.add(a.mesh);
    const gl = new THREE.PointLight('#8aff7a', 2.5, 3, 1.6); gl.position.set(0, 1.25, -.8); c.scene.add(gl);
    return (f, l, u) => { c.dof = 6; cam(c, [0, 1.35, .9], [0, 1.3, -1.0], 40 * (1 - .002 * l)); }; },
  // 11 split the match in two: head and box striker drift apart (ECU, 4x props)
  11: c => { c.near = .01; const top = room(c); const m = match3d(.2); c.scene.add(m); const bx = matchbox(); bx.scale.setScalar(4); c.scene.add(bx);
    return (f, l, u) => { const k = smooth(u * 1.4); m.position.set(-.3 - .06 * k, top + .015, -.9); m.rotation.z = -Math.PI / 2; bx.position.set(.1 + .06 * k, top, -1.0); bx.rotation.y = -.35;
      c.dof = 6; cam(c, [0, top + .32, -.2], [0, top + .04, -.95], 42); }; },
  // 12 neither half can catch fire on its own: struck on a stone, nothing
  12: c => { c.near = .01; const top = room(c); const st = place(c.L, 'pirate-kit/environment-rock-2', .12, top, -1.0, 0, .2); c.scene.add(st);
    const m = match3d(.2); c.scene.add(m);
    return (f, l, u) => { const k = Math.sin(l * .4); m.position.set(-.27 + .05 * k, top + .04, -.86); m.rotation.z = -Math.PI / 2 + .25;
      c.dof = 6; cam(c, [-.05, top + .3, -.2], [.02, top + .08, -.95], 42); }; },
  // 13 they only light when you rub them together: struck on the box, flare (4x props)
  13: c => { c.near = .01; const top = room(c); const bx = matchbox(); bx.scale.setScalar(4); bx.position.set(.02, top, -1.0); c.scene.add(bx); const m = match3d(.2); c.scene.add(m);
    const fl = flame(c.scene, .18, 4); const lit = T('L07', 13);
    return (f, l, u) => { const x = lerp(-.36, -.1, smooth((f - lit + 10) / 10)); m.position.set(x, top + .035, -.92); m.rotation.z = -Math.PI / 2 + .15;
      fl.at([x + .21, top + .06, -.92], l / FPS, smooth((f - lit) / 3)); c.dof = 6; cam(c, [.05, top + .26, -.25], [.03, top + .04, -.97], 42); }; },
  // 14 that is why it is called a safety match (gent, proud, lit match)
  14: c => { street(c); const a = person(GENT, 1.78, {expr: 'smile', seed: 21, wave: 1, costume: dress(cravat(), matchInHand(1, 1))}); a.mesh.position.set(0, 0, 0); c.scene.add(a.mesh);
    return (f, l, u) => { c.dof = 6; cam(c, [.2, 1.55, 2.6], [0, 1.4, 0], 40 * (1 - .002 * l)); }; },
  // 15 striking a match still works like the very first fire (back in the meadow, caveman with a matchbox)
  15: c => { meadow(c); const a = actor(1.7); a.k.mesh.position.set(-.3, 0, .3); c.scene.add(a.k.mesh); const strike = T('L08', 3);
    return (f, l, u) => { a.draw(CAVE, {expr: f > strike ? 'smile' : 'neutral', seed: 5, wave: 1, costume: matchInHand(1, smooth((f - strike) / 4))});
      c.dof = 5; glide(c, [[.8, 1.4, 3.8], [0, 1.1, .5]], [[.6, 1.35, 3.2], [0, 1.1, .5]], u, 40); }; },
  // 16 rubbing two things together, with some chemical help: the woodpile catches, campfire
  16: c => { const wp = meadow(c); void wp; const a = person(CAVE, 1.7, {expr: 'relief', seed: 5}); a.mesh.position.set(-.7, 0, .2); c.scene.add(a.mesh);
    const fl = flame(c.scene, .7, 6); const go = T('L08', 13);
    return (f, l, u) => { fl.at([0, .05, .8], l / FPS, smooth((f - go) / 20)); c.dof = 4; cam(c, [.3, 1.2, 3.6], [-.2, .8, .5], 42); }; },
};

const captionAt = (t: number) => { // groups of <= 3 words, shown while spoken
  const idx = W.findIndex(w => t >= w.start - .05 && t < w.end + .25); if (idx < 0) return '';
  const g = Math.floor(idx / 3) * 3; return W.slice(g, g + 3).map(w => w.word.replace(/[.,!?]/g, '')).join(' ');
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
  const cap = captionAt(frame / FPS);
  return <AbsoluteFill>
    <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '28%'}}><div style={captionCss(cap)}>{cap}</div></AbsoluteFill>
  </AbsoluteFill>;
};
export {SHOTS, candle, shade, INK};
