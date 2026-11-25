// coin-ridges GATE B look stills: key pictures of SHOTLIST.md in the final look (ink, lens blur, grade), one per frame.
//   0 hook ECU (pic 1)      1 shaving gag (pic 4)      2 back room + crucible (pic 9-10)   3 mint screw press (pic 13)
//   4 Tower exterior (pic 19)   5 Newton by candlelight (pic 25)   6 coin lineup (pic 15, asset check)   7 payoff callback (pic 30)
// Render: ./stills.sh CoinLooks <outdir> 0.5 0 1 2 3 4 5 6 7
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {GradeEffect, GRADES} from '../../../../templates/bridge/grade';
import {bodyFront, INK, type Expr, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import {Card, faceCards, put, toLambert} from './kit/cards';
import {skyDome} from './kit/look';

export const LOOK_FRAMES = 8;

// ---------- library ----------
const IDS = ['coin-modern-quarter', 'coin-hammered', 'coin-milled', 'straight-razor', 'shaving-brush', 'shaving-mug', 'clipping-shears',
  'crucible', 'silver-ingot', 'workbench', 'candle', 'screw-press', 'interrogation-table', 'courtroom-bench', 'gallows',
  'mint-interior', 'mint-furnace', 'tower-mint-exterior', 'market-stall', 'apple', 'modern-table'] as const;
type Id = typeof IDS[number];
type Lib = Record<Id, THREE.Group>;
const loadLib = (): Promise<Lib> => {
  const L = new GLTFLoader();
  return Promise.all(IDS.map(id => L.loadAsync(staticFile(`${id}.glb`)).then(g => { toLambert(g.scene); return [id, g.scene] as const; })))
    .then(a => Object.fromEntries(a) as Lib);
};
const clone = (L: Lib, id: Id) => L[id].clone(true);
/** recolour materials by name (Codex names them per the brief) */
const paint = (o: THREE.Object3D, cols: Record<string, string>) => o.traverse(x => {
  const m = x as THREE.Mesh; if (!m.isMesh) return;
  (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => { const c = cols[mt.name]; if (c) (mt as THREE.MeshLambertMaterial).color.set(c); });
});
const paint2 = (o: THREE.Object3D, cols: Record<string, string>) => { paint(o, cols); return o; };
const SILVER = {silver: '#eef2f8', coin_edge: '#dfe5ee', coin_face: '#e8edf4'};

// ---------- cast (2D cards) ----------
const CLIPPER: Outfit = {jacket: '#6b5a3a', pants: '#4a3a2a', boots: '#2a1d16', hat: 'cap', cap: '#3d4a3a', skin: '#f5c9a0'};
const CLIPPER_NOW: Outfit = {jacket: '#3f6fb5', pants: '#3b3f52', boots: '#f4f1ea', hat: 'cap', cap: '#3d4a3a', skin: '#f5c9a0'};
const NEWTON: Outfit = {jacket: '#2b2b33', pants: '#2b2b33', boots: '#1d1a1a', hat: 'hair', hair: '#ece7dc', buttons: '#d9dde0'};
const WITNESS: Outfit = {jacket: '#8a3b2e', pants: '#4a3a2a', boots: '#2a1d16', hat: 'hair', hair: '#5a3b2a'};
const WORKER: Outfit[] = [{jacket: '#e8dcc0', pants: '#4a3a2a', boots: '#2a1d16', hat: 'hair', hair: '#2f2418'}, {jacket: '#d8c8a8', pants: '#3b3f52', boots: '#2a1d16', hat: 'cap', cap: '#7a3b2e'}];
// head geometry in the 600 x 1000 toon space for build 'adult' (headBlob a = 118): centre (300, 309), half-size ~118 x 111
const HX = 300, HY = 309;
const stubble = (g: CanvasRenderingContext2D) => { g.fillStyle = '#5a4636'; for (let i = 0; i < 26; i++) { const a = Math.PI * (.12 + .76 * i / 25); g.beginPath(); g.arc(HX + 92 * Math.cos(a) * (i % 2 ? .9 : .8), HY + 30 + 72 * Math.sin(a) * (i % 2 ? .9 : .78), 3.5, 0, 7); g.fill(); } };
const goldTooth = (g: CanvasRenderingContext2D) => { g.fillStyle = '#f2c23a'; g.strokeStyle = INK; g.lineWidth = 3; g.fillRect(HX + 8, HY + 52, 14, 12); g.strokeRect(HX + 8, HY + 52, 14, 12); };
/** Newton's full-bottomed periwig: one cloud of curls hugging the top of the head and falling to the shoulders, drawn
 *  BEHIND the head (outlines first, fills second, so it reads as one mass), then a fringe of curls overlapping the crown. */
const WIG_PTS: [number, number][] = [];
for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 + i / 10); WIG_PTS.push([HX + 126 * Math.cos(a), HY + 4 + 120 * Math.sin(a)]); }
for (const s of [-1, 1]) for (let i = 0; i < 4; i++) WIG_PTS.push([HX + s * (128 + 6 * (i % 2)), HY + 40 + i * 44]);
const wigBack = (g: CanvasRenderingContext2D) => {
  g.strokeStyle = INK; g.lineWidth = 18; WIG_PTS.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 40, 0, 7); g.stroke(); });
  g.fillStyle = '#ddd7ca'; WIG_PTS.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 40, 0, 7); g.fill(); });
  g.strokeStyle = '#b9b2a4'; g.lineWidth = 5; WIG_PTS.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, 20, i * .7, i * .7 + 3.2); g.stroke(); });
};
const wigTop = (g: CanvasRenderingContext2D) => {
  for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + .76 * i / 6), x = HX + 104 * Math.cos(a), y = HY - 8 + 104 * Math.sin(a);
    g.fillStyle = '#ece7dc'; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = '#c9c2b4'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 14, i, i + 3); g.stroke(); }
};
/** straight razor held in the raised right hand (bodyFront wave = 1 puts the hand at ~(471, 313) for an adult) */
const razorInHand = (g: CanvasRenderingContext2D) => {
  g.save(); g.translate(471, 313); g.rotate(-.55); g.lineJoin = 'round';
  g.fillStyle = '#7a4a2a'; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.roundRect(-10, -6, 78, 14, 6); g.fill(); g.stroke();
  g.fillStyle = '#e6ecf2'; g.beginPath(); g.moveTo(-10, -8); g.lineTo(-108, -14); g.quadraticCurveTo(-118, 4, -104, 12); g.lineTo(-10, 8); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(-20, -4); g.lineTo(-96, -9); g.stroke(); g.restore();
};
/** coin face decal: a crowned (or plain) profile head + bead border + a ring of lettering dots, painted on a lit disc that
 *  covers the asset's abstract face marks. Placed on both faces (+-Z) just inside the rim. */
const coinFace = (coin: THREE.Object3D, r: number, crown: boolean, base = '#e8edf4') => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d')!;
  g.fillStyle = base; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
  g.strokeStyle = '#8f98a6'; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.stroke();
  g.fillStyle = '#8f98a6'; for (let i = 0; i < 30; i++) { const a = Math.PI * (.62 + 1.76 * i / 29); g.fillRect(256 + 200 * Math.cos(a) - 7, 256 + 200 * Math.sin(a) - 9, 14, 18); }
  // classic coin bust facing left: shoulders cut flat, neck, chin, lips, nose, brow, then hair over the back of the head
  g.fillStyle = '#b4bcc9'; g.strokeStyle = '#3f4652'; g.lineWidth = 11; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(170, 372); g.quadraticCurveTo(200, 330, 250, 322); g.lineTo(248, 296);
  g.quadraticCurveTo(222, 292, 214, 270); g.lineTo(204, 262); g.lineTo(212, 250); g.lineTo(200, 240); g.lineTo(210, 230);
  g.lineTo(196, 214); g.quadraticCurveTo(204, 196, 214, 186); g.quadraticCurveTo(224, 148, 276, 144);
  g.quadraticCurveTo(330, 146, 336, 210); g.quadraticCurveTo(338, 270, 300, 300); g.lineTo(304, 322);
  g.quadraticCurveTo(350, 330, 362, 372); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#8a93a2'; g.beginPath(); g.moveTo(232, 156); g.quadraticCurveTo(300, 120, 340, 196); g.quadraticCurveTo(346, 262, 312, 296);
  g.quadraticCurveTo(290, 250, 300, 214); g.quadraticCurveTo(270, 190, 232, 156); g.fill(); g.stroke();
  g.lineWidth = 6; [[316, 214], [326, 246], [312, 272]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, 5); g.stroke(); });
  g.fillStyle = '#3f4652'; g.beginPath(); g.arc(232, 210, 6, 0, 7); g.fill();
  g.lineWidth = 6; g.beginPath(); g.moveTo(222, 198); g.lineTo(244, 194); g.stroke();
  if (crown) { g.fillStyle = '#c9b46a'; g.lineWidth = 9; g.beginPath(); g.moveTo(232, 158); g.lineTo(226, 104); g.lineTo(252, 128); g.lineTo(274, 92); g.lineTo(296, 128); g.lineTo(322, 104); g.lineTo(318, 160); g.closePath(); g.fill(); g.stroke(); }
  coin.traverse(o => { if (/^(Stamped relief|Dot)/.test(o.name)) o.visible = false; });   // Codex's abstract face marks
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const depth = new THREE.Box3().setFromObject(coin).getSize(new THREE.Vector3()).z;
  for (const sd of [-1, 1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshLambertMaterial({map: tex}));
    d.position.z = sd * (depth / 2 + .00004); if (sd < 0) d.rotation.y = Math.PI; coin.add(d); }
  return coin;
};
const foamDots = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => { g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 5;
  [[0, 0, 1], [-.9, .2, .7], [.9, .15, .75], [-.4, -.6, .6], [.45, -.55, .65]].forEach(([dx, dy, k]) => { g.beginPath(); g.arc(x + dx * r, y + dy * r, r * k, 0, 7); g.fill(); g.stroke(); }); };

type Extra = {back?: (g: CanvasRenderingContext2D) => void; over?: (g: CanvasRenderingContext2D) => void};
const person = (o: Outfit, h: number, opts: Parameters<typeof bodyFront>[2], ex: Extra = {}) =>
  new Card(h, .6).draw((p: Pen, g) => { ex.back?.(g); bodyFront(p, o, {mode: 'stand', ...opts}); ex.over?.(g); });

// ---------- sets + light ----------
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera; look: number[]; dof?: number; grade: 'day' | 'golden'; near?: number};
const cam = (c: Ctx, p: number[], t: number[], fov = 40, roll = 0) => {
  c.look = t; c.camera.fov = fov; c.camera.near = c.near ?? .05; c.camera.updateProjectionMatrix();
  c.camera.position.set(p[0], p[1], p[2]); c.camera.lookAt(t[0], t[1], t[2]); if (roll) c.camera.rotateZ(roll * Math.PI / 180);
};
const lam = (col: string) => new THREE.MeshLambertMaterial({color: col});
const plane = (w: number, h: number, col: string) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(col)); m.receiveShadow = true; return m; };
const candleLight = (c: Ctx, p: number[], i = 6, d = 6) => {
  const l = new THREE.PointLight('#ffd6a0', i, d, 1.6); l.position.set(p[0], p[1], p[2]); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -.002; c.scene.add(l);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({color: '#ffe08a', toneMapped: false}));
  fl.position.set(p[0], p[1], p[2]); fl.layers.set(NOINK); c.scene.add(fl);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(.12, 24), new THREE.MeshBasicMaterial({color: '#ffcf7a', transparent: true, opacity: .35, depthWrite: false, toneMapped: false}));
  halo.position.set(p[0], p[1], p[2]); halo.layers.set(NOINK); halo.userData.card = true; halo.userData.figure = false; c.scene.add(halo);
};
/** 1690s back room: plank floor, plaster walls with timber posts, a small night window (warm candle key, cool moon fill) */
const backRoom = (c: Ctx) => {
  c.scene.background = new THREE.Color('#1d1820'); c.grade = 'day';
  const floor = plane(10, 10, '#6b4a32'); floor.rotation.x = -Math.PI / 2; c.scene.add(floor);
  const wall = plane(10, 4, '#a88a66'); wall.position.set(0, 2, -1.6); c.scene.add(wall);
  const side = plane(6, 4, '#9a7d5c'); side.rotation.y = Math.PI / 2; side.position.set(-2.6, 2, 1); c.scene.add(side);
  [-1.8, 0.6, 2.8].forEach(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, 4, .12), lam('#4a3020')); b.position.set(x, 2, -1.55); b.castShadow = true; c.scene.add(b); });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.7, .9), new THREE.MeshBasicMaterial({color: '#3f5f9a'})); win.position.set(1.7, 2.1, -1.58); c.scene.add(win);
  const mull = new THREE.Mesh(new THREE.BoxGeometry(.04, .9, .03), lam('#3a2818')); mull.position.set(1.7, 2.1, -1.56); c.scene.add(mull);
  c.scene.add(new THREE.HemisphereLight('#b8c4e0', '#5a4030', 1.25));
  const moon = new THREE.DirectionalLight('#c8d4f0', 1.1); moon.position.set(2, 4, -3); c.scene.add(moon);
};
const bench = (c: Ctx) => { c.scene.add(put(clone(c.L, 'workbench'), [0, 0, -.6])); return .79; };

// ---------- the stills ----------
type Build = (c: Ctx) => void;
const S: Build[] = [
  // 0: hook ECU, a modern quarter on its edge on a sunny kitchen table, ridges raking in the light
  c => { c.near = .002; c.grade = 'day';
    c.scene.background = new THREE.Color('#cfe3f2');
    c.scene.add(put(clone(c.L, 'modern-table'), [0, 0, 0]));
    const top = .75, q = coinFace(paint2(clone(c.L, 'coin-modern-quarter'), SILVER), .0098, false); q.position.set(0, top + .01215, 0); q.rotation.y = .9; c.scene.add(q);
    const back = plane(6, 3, '#f2dcb8'); back.position.set(0, 1.5, -1.4); c.scene.add(back);
    c.scene.add(new THREE.HemisphereLight('#ffffff', '#c8a87a', 1.2));
    const rim = new THREE.DirectionalLight('#ffffff', 2.2); rim.position.set(1.2, .8, -1); c.scene.add(rim);
    const sun = new THREE.DirectionalLight('#fff1d6', 4.2); sun.position.set(-1.5, 1.6, .6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -.1; sun.shadow.camera.right = sun.shadow.camera.top = .1; sun.target.position.set(0, top, 0); c.scene.add(sun, sun.target);
    c.dof = 10; cam(c, [.06, top + .018, .055], [0, top + .012, 0], 30, -4); },
  // 1: the shaving gag: Clipper behind the bench lathering a silver coin, foam piled up, razor raised
  c => { backRoom(c); const top = bench(c);
    const coin = clone(c.L, 'coin-hammered'); paint(coin, SILVER); coin.rotation.x = -Math.PI / 2; coin.position.set(.05, top + .002, -.35); c.scene.add(coin);
    const foam = new THREE.Group(); [[0, 0, 0, .03], [.03, .01, .01, .022], [-.028, .008, -.01, .024], [.01, .03, 0, .02], [-.01, .02, .02, .018]].forEach(([x, y, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshToonMaterial({color: '#ffffff', emissive: '#9a9a9a'})); s.position.set(x, y, z); s.castShadow = true; foam.add(s); });
    foam.position.set(.05, top + .015, -.35); c.scene.add(foam);
        const brush = clone(c.L, 'shaving-brush'); brush.position.set(-.18, top, -.42); brush.rotation.z = .25; c.scene.add(brush);
    c.scene.add(put(clone(c.L, 'shaving-mug'), [-.32, top, -.62]));
    c.scene.add(put(clone(c.L, 'candle'), [.45, top, -.75]));
    candleLight(c, [.45, top + .24, -.75], 3, 5);
    const cl = person(CLIPPER, 1.72, {expr: 'grin', seed: 7, look: -.6, wave: 1}, {over: g => { stubble(g); goldTooth(g); foamDots(g, HX + 50, HY + 10, 16); razorInHand(g); }});
    put(cl.mesh, [.05, 0, -1.05]); c.scene.add(cl.mesh);
    c.dof = 9; cam(c, [.35, 1.3, 1.55], [.02, 1.05, -.6], 44); },
  // 2: back room wide: crucible glowing on the brazier, silver ingot on the bench, Clipper grinning (pic 9-10)
  c => { backRoom(c); const top = bench(c);
    const cru = clone(c.L, 'crucible'); cru.position.set(-1.1, 0, .1); c.scene.add(cru);
    const glow = new THREE.PointLight('#ff7a2a', 6, 3.5, 1.6); glow.position.set(-1.1, .55, .1); c.scene.add(glow);
    const molten = new THREE.Mesh(new THREE.CircleGeometry(.1, 24), new THREE.MeshBasicMaterial({color: '#ffd27a', toneMapped: false})); molten.rotation.x = -Math.PI / 2; molten.position.set(-1.1, .52, .1); molten.layers.set(NOINK); c.scene.add(molten);
    const bar = clone(c.L, 'silver-ingot'); paint(bar, SILVER); bar.position.set(.1, top, -.35); bar.rotation.y = .3; c.scene.add(bar);
    for (let i = 0; i < 9; i++) { const k = clone(c.L, 'coin-hammered'); paint(k, SILVER); k.rotation.x = -Math.PI / 2; k.position.set(.35 + (i % 3) * .035, top + .002 + Math.floor(i / 3) * .0013, -.3 + (i % 2) * .02); c.scene.add(k); }
    c.scene.add(put(clone(c.L, 'clipping-shears'), [.5, top + .01, -.5], .7));
    c.scene.add(put(clone(c.L, 'candle'), [-.5, top, -.75])); candleLight(c, [-.5, top + .24, -.75], 5, 5);
    const cl = person(CLIPPER, 1.72, {expr: 'laugh', seed: 7, look: .4}, {over: g => { stubble(g); goldTooth(g); }});
    put(cl.mesh, [.15, 0, -1.0]); c.scene.add(cl.mesh);
    c.dof = 5; cam(c, [-.1, 1.7, 3.6], [-.4, .8, -.4], 50); },
  // 3: 1662 mint: the screw press inside the stone workshop, two workers hauling the bar
  c => { c.grade = 'day'; c.scene.background = new THREE.Color('#2a2630');
    const room = clone(c.L, 'mint-interior'); c.scene.add(room);
    const pr = clone(c.L, 'screw-press'); pr.position.set(0, 0, .6); pr.rotation.y = Math.PI; c.scene.add(pr);
    c.scene.add(new THREE.HemisphereLight('#d8dcf0', '#5a4636', 1.1));
    const shaft = new THREE.SpotLight('#fff0d0', 120, 20, .45, .6, 1.4); shaft.position.set(-2.5, 4.2, -2); shaft.target.position.set(0, 1, .6); shaft.castShadow = true; shaft.shadow.mapSize.set(2048, 2048); c.scene.add(shaft, shaft.target);
    WORKER.forEach((o, i) => { const k = person(o, 1.72, {expr: i ? 'shock' : 'stern', seed: 30 + i, tilt: i ? 8 : -8, wave: 1}); put(k.mesh, [i ? 1.15 : -1.15, 0, -.35]); c.scene.add(k.mesh); });
    c.dof = 4; cam(c, [.3, 1.35, -5.6], [0, 1.25, .4], 48); },
  // 4: Tower of London with the Mint, morning, smoke from a chimney (pic 19)
  c => { c.grade = 'day'; skyDome(c.scene, 'day'); c.scene.fog = new THREE.Fog('#b8d0ec', 200, 900);
    c.scene.add(put(clone(c.L, 'tower-mint-exterior'), [0, 0, 0]));
    const g = plane(800, 400, '#7f9a5a'); g.rotation.x = -Math.PI / 2; g.position.z = -175; c.scene.add(g);
    const river = plane(800, 120, '#4f86b8'); river.rotation.x = -Math.PI / 2; river.position.set(0, -1.6, 100); c.scene.add(river);
    c.scene.add(new THREE.HemisphereLight('#cfe0ff', '#7a6650', 1.3));
    const sun = new THREE.DirectionalLight('#ffd9a8', 3.0); sun.position.set(-90, 45, 70); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {left: -60, right: 60, top: 60, bottom: -60, far: 300}); c.scene.add(sun);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(800, 3, 4), lam('#a89a86')); quay.position.set(0, -.6, 40); quay.castShadow = quay.receiveShadow = true; c.scene.add(quay);
    const bank = plane(800, 14, '#9a8a6a'); bank.rotation.x = -Math.PI / 2; bank.position.set(0, .03, 32); c.scene.add(bank);
    [[-70, 10], [-58, 22], [44, 14], [60, 6], [72, 20], [-40, -50], [50, -48]].forEach(([x, z], i) => { const t = new THREE.Group();
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.6, .8, 4, 8), lam('#5a3b2a')); tr.position.y = 2;
      const cr = new THREE.Mesh(new THREE.SphereGeometry(4 + (i % 3), 14, 10), lam(['#5d7a3a', '#6b8a40', '#4f6e34'][i % 3])); cr.position.y = 7 + (i % 3);
      [tr, cr].forEach(m => { m.castShadow = true; t.add(m); }); t.position.set(x, 0, z); c.scene.add(t); });
    c.dof = 0; cam(c, [-62, 16, 176], [0, 12, 0], 40); },
  // 5: Newton questions a nervous witness by candlelight (pic 25)
  c => { backRoom(c); c.scene.background = new THREE.Color('#141016');
    const t = clone(c.L, 'interrogation-table'); c.scene.add(t);
    c.scene.add(put(clone(c.L, 'candle'), [.1, .75, 0])); candleLight(c, [.1, .99, 0], 7, 6);
    const nw = person(NEWTON, 1.74, {expr: 'stern', seed: 12, look: .8}, {back: wigBack, over: wigTop}); put(nw.mesh, [-.6, 0, -1.0]); c.scene.add(nw.mesh);
    const wt = person(WITNESS, 1.7, {expr: 'nervous', seed: 23, look: -.8}); put(wt.mesh, [-.6, 0, 1.0]); c.scene.add(wt.mesh);
    c.dof = 9; cam(c, [4.4, 1.55, .05], [0, 1.2, 0], 44); },
  // 6: coin lineup ECU: hammered (lumpy, smooth edge), milled (crisp edge pattern), modern (reeds) + a clipped sliver
  c => { c.near = .002; backRoom(c); const top = bench(c);
    [['coin-hammered', -.045], ['coin-milled', 0], ['coin-modern-quarter', .045]].forEach(([id, x]) => { const k = clone(c.L, id as Id); paint(k, SILVER);
      coinFace(k, id === 'coin-hammered' ? .0128 : id === 'coin-milled' ? .0165 : .0098, id !== 'coin-modern-quarter');
      const r = new THREE.Box3().setFromObject(k).getSize(new THREE.Vector3()).y / 2; k.position.set(x as number, top + r, -.35); k.rotation.y = .5; c.scene.add(k);
      const sl = k.getObjectByName('sliver') ?? k.getObjectByName('bite'); if (sl) sl.position.y -= .004; });
    candleLight(c, [-.12, top + .12, -.2], 1.2, 2);
    const key = new THREE.DirectionalLight('#ffe2b0', 1.6); key.position.set(-.5, 1.2, .5); key.target.position.set(0, top, -.35); c.scene.add(key, key.target);
    c.dof = 6; cam(c, [0, top + .07, .12], [0, top + .016, -.35], 32); },
  // 7: payoff callback: the Clipper today (hoodie) lathering a modern coin on the kitchen table, shrugging
  c => { c.grade = 'day'; c.scene.background = new THREE.Color('#cfe3f2');
    c.scene.add(put(clone(c.L, 'modern-table'), [0, 0, 0]));
    const back = plane(8, 3, '#f2dcb8'); back.position.set(0, 1.5, -1.6); c.scene.add(back);
    const fl = plane(8, 8, '#c8a27a'); fl.rotation.x = -Math.PI / 2; c.scene.add(fl);
    const q = clone(c.L, 'coin-modern-quarter'); paint(q, SILVER); q.rotation.x = -Math.PI / 2; q.position.set(.05, .752, .1); c.scene.add(q);
    c.scene.add(put(clone(c.L, 'shaving-mug'), [-.3, .75, -.1]));
    const raz = clone(c.L, 'straight-razor'); raz.position.set(.25, .76, .15); raz.rotation.y = .6; c.scene.add(raz);
    c.scene.add(new THREE.HemisphereLight('#ffffff', '#c8a87a', 1.3));
    const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(-2, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); c.scene.add(sun);
    const cl = person(CLIPPER_NOW, 1.72, {expr: 'dazed', seed: 7, look: .2, tilt: -6}, {over: g => { stubble(g); foamDots(g, HX - 40, HY + 40, 18); }});
    put(cl.mesh, [0, 0, -.6]); c.scene.add(cl.mesh);
    c.dof = 10; cam(c, [.2, 1.3, 2.2], [0, 1.05, -.2], 40); },
];

export const CoinLooks: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [lib, setLib] = useState<Lib | null>(null);
  const [handle] = useState(() => delayRender('glbs'));
  useLayoutEffect(() => { loadLib().then(l => { setLib(l); continueRender(handle); }).catch(e => { console.error(e); continueRender(handle); }); }, [handle]);
  useLayoutEffect(() => {
    if (!lib) return;
    const renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
    renderer.setSize(width, height, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, width / height, .05, 3000);
    camera.layers.enable(NOINK);
    const c: Ctx = {L: lib, scene, camera, look: [0, 0, 0], grade: 'day'};
    S[Math.min(frame, S.length - 1)](c);
    const composer = new EffectComposer(renderer, {multisampling: 4, frameBufferType: THREE.HalfFloatType});
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new InkPass(scene, camera, {distFar: 120}));
    const lens = new LensBlur({maxCoC: 24, nearScale: 1.2});
    composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main));
    composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), new GradeEffect(GRADES[c.grade], .85)));
    lens.focus = camera.position.distanceTo(new THREE.Vector3(...c.look)); lens.cInf = c.dof ?? 0;
    camera.updateMatrixWorld(); scene.updateMatrixWorld(true); faceCards(scene, camera);
    composer.render();
    return () => { composer.dispose(); renderer.dispose(); };
  }, [frame, width, height, lib]);
  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
