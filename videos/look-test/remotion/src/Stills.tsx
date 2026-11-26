// Review stills in the upgraded look, built from the Quaternius library (assets/library, catalog.json) + our cast.
//   frame 0: coin-ridges, 1690s market street: the Clipper at his coin stall, Isaac Newton watching
//   frame 1: black-tires, country road 1900s: a motorist and the first white tyre, wheat field behind
// Characters: our toon cards with drawn, shaded costume pieces (apron, cravat, periwig, goggles, duster, scarf).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect} from 'postprocessing';
import {N8AOPostPass} from 'n8ao';
import {NOINK} from '../../../../templates/bridge/ink';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {bodyFront, INK, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import {Card, faceCards} from './kit/cards';
import {skyDome} from './kit/look';

export const STILL_FRAMES = 2;
const fontFamily = 'LilitaOneLocal';
if (typeof document !== 'undefined' && !document.getElementById('lilita')) { const st = document.createElement('style'); st.id = 'lilita';
  st.textContent = `@font-face{font-family:'${fontFamily}';src:url('${staticFile('fonts/LilitaOne.woff2')}') format('woff2');}`; document.head.appendChild(st); }

const NEED: Record<number, string[]> = {
  0: ['medieval-village-megakit/floor-unevenbrick', 'medieval-village-megakit/wall-plaster-door-round', 'medieval-village-megakit/wall-plaster-window-wide-round',
    'medieval-village-megakit/wall-unevenbrick-window-thin-round', 'medieval-village-megakit/wall-plaster-woodgrid', 'medieval-village-megakit/wall-unevenbrick-door-flat',
    'medieval-village-megakit/roof-roundtiles-4x4', 'medieval-village-megakit/windowshutters-wide-round-open', 'medieval-village-megakit/prop-chimney',
    'fantasy-props-megakit/stall-empty', 'fantasy-props-megakit/coin-pile', 'fantasy-props-megakit/coin-pile-2', 'fantasy-props-megakit/barrel', 'fantasy-props-megakit/barrel-apples',
    'fantasy-props-megakit/crate-wooden', 'fantasy-props-megakit/farmcrate-apple', 'fantasy-props-megakit/bag', 'fantasy-props-megakit/candlestick', 'fantasy-props-megakit/lantern-wall',
    'stylized-nature-megakit/commontree-3', 'stylized-nature-megakit/bush-common-flowers', 'stylized-nature-megakit/flower-3-group', 'medieval-village-megakit/prop-wagon',
    'medieval-village-megakit/prop-vine5'],
  1: ['stylized-nature-megakit/commontree-1', 'stylized-nature-megakit/commontree-4', 'stylized-nature-megakit/commontree-5', 'stylized-nature-megakit/bush-common',
    'stylized-nature-megakit/bush-common-flowers', 'stylized-nature-megakit/flower-3-group', 'stylized-nature-megakit/flower-4-group', 'stylized-nature-megakit/grass-common-short',
    'stylized-nature-megakit/grass-wispy-tall', 'ultimate-crops/wheat-4', 'medieval-village-megakit/prop-woodenfence-single', 'pirate-kit/environment-rock-2'],
};

// ---------- our cast: costume pieces drawn on the 600 x 1000 toon card (adult head centre ~ (300, 309), chin ~420) ----------
const HX = 300, HY = 309;
const shadeFill = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, light: string, dark: string) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, light); gr.addColorStop(1, dark); return gr; };
const stubble = (g: CanvasRenderingContext2D) => { g.fillStyle = 'rgba(70,50,40,.55)'; for (let i = 0; i < 34; i++) { const a = Math.PI * (.1 + .8 * i / 33); g.beginPath(); g.arc(HX + 90 * Math.cos(a) * (i % 2 ? .92 : .8), HY + 34 + 70 * Math.sin(a) * (i % 2 ? .92 : .78), 3.2, 0, 7); g.fill(); } };
const goldTooth = (g: CanvasRenderingContext2D) => { g.fillStyle = '#f2c23a'; g.strokeStyle = INK; g.lineWidth = 3; g.fillRect(HX + 8, HY + 52, 14, 12); g.strokeRect(HX + 8, HY + 52, 14, 12); };
/** leather apron with a neck strap, stitched hem and a coin pocket */
const apron = (g: CanvasRenderingContext2D) => {
  g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 9;
  g.fillStyle = shadeFill(g, 250, 470, 360, 690, '#a8743f', '#6e4524');
  g.beginPath(); g.moveTo(236, 470); g.quadraticCurveTo(300, 455, 364, 470); g.lineTo(372, 660); g.quadraticCurveTo(300, 690, 228, 660); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(244, 472); g.lineTo(262, 432); g.moveTo(356, 472); g.lineTo(338, 432); g.stroke();
  g.fillStyle = '#5a3820'; g.beginPath(); g.roundRect(266, 560, 68, 52, 10); g.fill(); g.stroke();
  g.setLineDash([8, 8]); g.strokeStyle = '#e8c890'; g.lineWidth = 3; g.beginPath(); g.moveTo(240, 648); g.quadraticCurveTo(300, 674, 360, 648); g.stroke(); g.setLineDash([]);
};
/** flat cap with a peak and a highlight */
const flatCap = (col: string) => (g: CanvasRenderingContext2D) => {
  g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 9; g.fillStyle = shadeFill(g, 200, 170, 400, 250, col, '#2a3020');
  g.beginPath(); g.moveTo(178, 246); g.quadraticCurveTo(190, 170, 300, 166); g.quadraticCurveTo(420, 168, 432, 238); g.quadraticCurveTo(300, 226, 178, 246); g.fill(); g.stroke();
  g.fillStyle = '#20261a'; g.beginPath(); g.moveTo(330, 236); g.quadraticCurveTo(420, 232, 470, 256); g.quadraticCurveTo(410, 262, 330, 252); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 7; g.beginPath(); g.arc(270, 236, 70, 3.6, 4.3); g.stroke();
};
/** white lace cravat (jabot) under the chin */
const cravat = (g: CanvasRenderingContext2D) => { g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 7; g.fillStyle = '#fbf8f0';
  [[300, 438, 34], [284, 470, 28], [316, 470, 28], [300, 500, 26]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * .7, 0, 0, 7); g.fill(); g.stroke(); }); };
/** Newton's periwig: one mass of curls behind the head to the shoulders + a fringe over the crown */
const WIG: [number, number][] = [];
for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 + i / 10); WIG.push([HX + 126 * Math.cos(a), HY + 4 + 120 * Math.sin(a)]); }
for (const s of [-1, 1]) for (let i = 0; i < 4; i++) WIG.push([HX + s * (128 + 6 * (i % 2)), HY + 40 + i * 44]);
const wigBack = (g: CanvasRenderingContext2D) => { g.strokeStyle = INK; g.lineWidth = 18; WIG.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 40, 0, 7); g.stroke(); });
  WIG.forEach(([x, y]) => { g.fillStyle = shadeFill(g, x - 30, y - 30, x + 30, y + 30, '#f2eee6', '#c9c2b4'); g.beginPath(); g.arc(x, y, 40, 0, 7); g.fill(); });
  g.strokeStyle = '#b3ab9c'; g.lineWidth = 5; WIG.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, 20, i * .7, i * .7 + 3.2); g.stroke(); }); };
const wigTop = (g: CanvasRenderingContext2D) => { for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + .76 * i / 6), x = HX + 104 * Math.cos(a), y = HY - 8 + 104 * Math.sin(a);
  g.fillStyle = shadeFill(g, x - 25, y - 25, x + 25, y + 25, '#fbf8f2', '#d6cfc0'); g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = '#c9c2b4'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 14, i, i + 3); g.stroke(); } };
/** motoring goggles pushed up on the cap + a long scarf */
const goggles = (g: CanvasRenderingContext2D) => { g.strokeStyle = INK; g.lineWidth = 8; g.fillStyle = '#5a3820'; g.fillRect(180, 205, 240, 18); g.strokeRect(180, 205, 240, 18);
  for (const x of [255, 345]) { g.fillStyle = '#c99a3a'; g.beginPath(); g.arc(x, 210, 34, 0, 7); g.fill(); g.stroke();
    g.fillStyle = shadeFill(g, x - 24, 186, x + 24, 234, '#bfe6ff', '#5a8ab8'); g.beginPath(); g.arc(x, 210, 24, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 8, 202, 7, 0, 7); g.fill(); } };
const scarf = (g: CanvasRenderingContext2D) => { g.strokeStyle = INK; g.lineWidth = 8; g.lineJoin = 'round'; g.fillStyle = shadeFill(g, 230, 420, 380, 560, '#e2453c', '#9a2a24');
  g.beginPath(); g.moveTo(222, 425); g.quadraticCurveTo(300, 455, 378, 425); g.lineTo(380, 455); g.quadraticCurveTo(300, 485, 220, 455); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(350, 450); g.quadraticCurveTo(420, 480, 470, 440); g.lineTo(480, 470); g.quadraticCurveTo(420, 515, 352, 480); g.closePath(); g.fill(); g.stroke(); };

const CLIPPER: Outfit = {jacket: '#7a5a36', pants: '#4a3a2a', boots: '#2a1d16', hat: 'hair', hair: '#3a2a1e', skin: '#f5c9a0'};
const NEWTON: Outfit = {jacket: '#1f2433', pants: '#1f2433', boots: '#141018', hat: 'hair', hair: '#ece7dc', buttons: '#e8c45a', skin: '#ffe2c2'};
const SHOPPER: Outfit = {jacket: '#3f6fb5', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', dress: '#d9a441'};
const MOTORIST: Outfit = {jacket: '#c9b48a', pants: '#5a4a3a', boots: '#2a1d16', hat: 'hair', hair: '#5a3b2a', moustache: '#5a3b2a', buttons: '#5a3820', skin: '#ffe2c2'};
type Ex = {back?: (g: CanvasRenderingContext2D) => void; over?: (g: CanvasRenderingContext2D) => void};
const person = (o: Outfit, h: number, opts: Parameters<typeof bodyFront>[2], ex: Ex = {}) =>
  new Card(h, .8).draw((p: Pen, g) => { ex.back?.(g); bodyFront(p, o, {mode: 'stand', ...opts}); ex.over?.(g); });

// ---------- world helpers ----------
type L = Record<string, THREE.Group>;
const shadowAll = (o: THREE.Object3D) => { o.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
/** place a library model so its bounding box sits on the ground at (x, z), rotated ry, optionally scaled */
const place = (lib: L, id: string, x: number, y: number, z: number, ry = 0, s = 1) => {
  const o = lib[id].clone(true); o.rotation.y = ry; o.scale.setScalar(s); o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o); o.position.set(x - (b.min.x + b.max.x) / 2, y - b.min.y, z - (b.min.z + b.max.z) / 2); return shadowAll(o); };
const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** instanced grass blades (dark root -> sunlit tip) on a rectangle, skipping `avoid` */
const grassField = (n: number, x0: number, x1: number, z0: number, z1: number, avoid: (x: number, z: number) => boolean) => {
  const geo = new THREE.PlaneGeometry(.035, .18, 1, 3); geo.translate(0, .09, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute, col: number[] = [];
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / .18; pos.setX(i, pos.getX(i) * (1 - y * .9)); pos.setZ(i, .03 * y * y);
    const cc = new THREE.Color('#1f5a16').lerp(new THREE.Color('#78c534'), y); col.push(cc.r, cc.g, cc.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .8}), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (let i = 0; k < n && i < n * 3; i++) { const x = x0 + (x1 - x0) * rnd(i, 1), z = z0 + (z1 - z0) * rnd(i, 2); if (avoid(x, z)) continue;
    e.set((rnd(i, 3) - .5) * .5, rnd(i, 4) * 6.28, (rnd(i, 5) - .5) * .5); q.setFromEuler(e); const sc = .6 + .6 * rnd(i, 6);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(sc, sc, sc)); mesh.setMatrixAt(k++, m); }
  mesh.count = k; mesh.receiveShadow = true; return mesh;
};

type Ctx = {scene: THREE.Scene; camera: THREE.PerspectiveCamera; focus: THREE.Vector3; dof: number; caption: string};
const BUILD: Record<number, (c: Ctx, lib: L) => void> = {
  0: (c, lib) => { const s = c.scene;
    // cobbled street
    for (let x = -10; x <= 10; x += 2) for (let z = -6; z <= 8; z += 2) s.add(place(lib, 'medieval-village-megakit/floor-unevenbrick', x, 0, z));
    // a row of plaster + brick houses (2 m wall modules, two storeys) facing the camera along z = -4
    const walls = [['wall-plaster-door-round', 'wall-plaster-woodgrid'], ['wall-plaster-window-wide-round', 'wall-plaster-window-wide-round'],
      ['wall-unevenbrick-door-flat', 'wall-unevenbrick-window-thin-round'], ['wall-unevenbrick-window-thin-round', 'wall-unevenbrick-window-thin-round'],
      ['wall-plaster-window-wide-round', 'wall-plaster-woodgrid'], ['wall-plaster-door-round', 'wall-plaster-window-wide-round']];
    walls.forEach(([lo, hi], i) => { const x = -6 + i * 2; s.add(place(lib, `medieval-village-megakit/${lo}`, x, 0, -4)); s.add(place(lib, `medieval-village-megakit/${hi}`, x, 3.12, -4)); });
    const inside = new THREE.Mesh(new THREE.BoxGeometry(12.4, 6.2, 3), new THREE.MeshStandardMaterial({color: '#2a2020', roughness: 1, side: THREE.BackSide})); inside.position.set(-1, 3.1, -5.8); s.add(inside);
    [-5, -1, 3].forEach((x, i) => s.add(place(lib, 'medieval-village-megakit/roof-roundtiles-4x4', x, 6.2, -5.2, i % 2 ? 0 : Math.PI / 2)));
    s.add(place(lib, 'medieval-village-megakit/prop-chimney', -2.2, 8.4, -5));
    s.add(place(lib, 'medieval-village-megakit/windowshutters-wide-round-open', -4, 4.2, -3.6));
    s.add(place(lib, 'medieval-village-megakit/prop-vine5', 4.2, 0, -3.5));
    // the Clipper's stall: coins piled on the counter, barrels and crates around
    s.add(place(lib, 'fantasy-props-megakit/stall-empty', 0, 0, -.6));
    s.add(place(lib, 'fantasy-props-megakit/coin-pile', -.3, 1.0, -.25, 0, 1.4)); s.add(place(lib, 'fantasy-props-megakit/coin-pile-2', .35, 1.0, -.2, .5, 1.4));
    s.add(place(lib, 'fantasy-props-megakit/candlestick', .9, 1.0, -.3));
    s.add(place(lib, 'fantasy-props-megakit/barrel', -1.9, 0, .2)); s.add(place(lib, 'fantasy-props-megakit/barrel-apples', -2.6, 0, .9, .4));
    s.add(place(lib, 'fantasy-props-megakit/crate-wooden', 2.0, 0, .3, .3)); s.add(place(lib, 'fantasy-props-megakit/farmcrate-apple', 2.1, .75, .3, .1));
    s.add(place(lib, 'fantasy-props-megakit/bag', 1.4, 0, 1.0));
    s.add(place(lib, 'medieval-village-megakit/prop-wagon', 6.5, 0, 1.5, .5));
    s.add(place(lib, 'stylized-nature-megakit/commontree-3', -7.5, 0, -1.5, 0, 1.1));
    s.add(place(lib, 'stylized-nature-megakit/bush-common-flowers', -5.2, 0, -2.8)); s.add(place(lib, 'stylized-nature-megakit/flower-3-group', 4.6, 0, -2.9));
    // cast
    const cl = person(CLIPPER, 1.72, {expr: 'grin', seed: 7, look: -.5}, {over: g => { stubble(g); goldTooth(g); apron(g); flatCap('#4f5a3a')(g); }});
    cl.mesh.position.set(-.1, 0, -1.25); s.add(cl.mesh);
    const nw = person(NEWTON, 1.74, {expr: 'stern', seed: 12, look: -1}, {back: wigBack, over: g => { cravat(g); wigTop(g); }});
    nw.mesh.position.set(1.15, 0, 2.6); s.add(nw.mesh);
    const sh = person(SHOPPER, 1.62, {expr: 'nervous', seed: 31, look: .6}); sh.mesh.position.set(-1.25, 0, 1.6); s.add(sh.mesh);
    c.camera.position.set(.5, 1.6, 6.4); c.camera.lookAt(.2, 1.5, 0); c.focus = new THREE.Vector3(-.1, 1.5, -1.25); c.dof = 4; c.caption = 'shave'; },
  1: (c, lib) => { const s = c.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({color: '#4f8a2a', roughness: 1})); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 300), new THREE.MeshStandardMaterial({color: '#b08a5a', roughness: 1})); road.rotation.x = -Math.PI / 2; road.rotation.z = .25; road.position.set(.6, .01, 0); road.receiveShadow = true; s.add(road);
    s.add(grassField(160000, -7, 7, -4.4, 6, (x, z) => Math.abs(x - .6 + z * .25) < 1.8));
    [[-14, -26], [-7, -24], [0, -28], [8, -25], [15, -27], [20, -22]].forEach(([x, z], i) => s.add(place(lib, `stylized-nature-megakit/commontree-${[1, 4, 5][i % 3]}`, x, 0, z, i, 1.5)));
    // wheat field rising behind a wooden fence
    for (let r = 0; r < 18; r++) for (let i = 0; i < 44; i++) { const x = -16 + i * .65 + .3 * rnd(r * 40 + i, 1), z = -5.4 - r * .7; if (Math.abs(x - .6 - z * -.25) < 2.4) continue;
      s.add(place(lib, 'ultimate-crops/wheat-4', x, 0, z, rnd(r, i) * 6, .9 + .3 * rnd(i, r))); }
    for (let i = -4; i <= 4; i++) if (i !== 0 && i !== 1) s.add(place(lib, 'medieval-village-megakit/prop-woodenfence-single', -1 + i * 2.06, 0, -4.6));
    [[-6, -9, 'commontree-1', 1.2], [6.5, -11, 'commontree-4', 1.3], [-11, -18, 'commontree-5', 1.4], [12, -20, 'commontree-1', 1.2], [-3.6, -3.2, 'commontree-4', .9]].forEach(([x, z, id, k]) =>
      s.add(place(lib, `stylized-nature-megakit/${id}`, x as number, 0, z as number, rnd(x as number, 2) * 6, k as number)));
    for (let i = 0; i < 70; i++) { const x = -7 + 14 * rnd(i, 3), z = -4 + 10 * rnd(i, 4); if (Math.abs(x - .6 + z * .25) < 2) continue;
      s.add(place(lib, `stylized-nature-megakit/${['grass-common-short', 'grass-wispy-tall', 'flower-3-group', 'flower-4-group', 'grass-common-short'][i % 5]}`, x, 0, z, rnd(i, 5) * 6)); }
    s.add(place(lib, 'stylized-nature-megakit/bush-common-flowers', -3.4, 0, 1.2)); s.add(place(lib, 'stylized-nature-megakit/bush-common', 3.6, 0, -1.6));
    s.add(place(lib, 'pirate-kit/environment-rock-2', 3.2, 0, 2.4, 0, .35));
    // the first white tyre on a wooden-spoked wheel, leaning on the fence post
    const R = .36, tyre = new THREE.Group();
    const pts: THREE.Vector2[] = []; for (let i = 0; i <= 32; i++) { const a = -Math.PI / 2 + 2 * Math.PI * i / 32; pts.push(new THREE.Vector2(R - .09 + .09 * Math.cos(a), .1 * Math.sin(a))); }
    const tm = new THREE.MeshStandardMaterial({color: '#f1ead8', roughness: .55}); const tb = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), tm); tb.rotation.x = Math.PI / 2; tyre.add(tb);
    for (let i = 0; i < 12; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.36, .03, .03), new THREE.MeshStandardMaterial({color: '#8a5a32'})); sp.rotation.z = Math.PI * i / 12; tyre.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .1, 20), new THREE.MeshStandardMaterial({color: '#3a2a20'})); hub.rotation.x = Math.PI / 2; tyre.add(hub);
    tyre.position.set(-1.1, R, .9); tyre.rotation.set(0, .5, .12); shadowAll(tyre); s.add(tyre);
    const mo = person(MOTORIST, 1.74, {expr: 'grin', seed: 18, look: -.7, wave: 1}, {over: g => { scarf(g); flatCap('#6b5a3a')(g); goggles(g); }});
    mo.mesh.position.set(-.1, 0, 1.4); s.add(mo.mesh);
    c.camera.position.set(.4, 1.4, 6.4); c.camera.lookAt(-.3, 1.15, 0); c.focus = new THREE.Vector3(-.1, 1.2, 1.4); c.dof = 5; c.caption = 'white!'; },
};

export const Stills: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [st, setSt] = useState<{lib: L; env: THREE.DataTexture} | null>(null);
  const [handle] = useState(() => delayRender('assets'));
  const [fh] = useState(() => delayRender('font'));
  useLayoutEffect(() => { document.fonts.load(`120px ${fontFamily}`).then(() => continueRender(fh)).catch(() => continueRender(fh)); }, [fh]);
  useLayoutEffect(() => {
    const ld = new GLTFLoader();
    Promise.all([Promise.all(NEED[frame].map(id => ld.loadAsync(staticFile(`${id}.glb`)).then(g => [id, g.scene] as const))), new RGBELoader().loadAsync(staticFile('meadow_2.hdr'))])
      .then(([a, env]) => { setSt({lib: Object.fromEntries(a), env}); continueRender(handle); }).catch(e => { console.error(e); continueRender(handle); });
  }, [handle, frame]);
  const [cap, setCap] = useState('');
  useLayoutEffect(() => {
    if (!st) return;
    const renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
    renderer.setSize(width, height, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, width / height, .05, 3000); camera.layers.enable(NOINK);
    st.env.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(st.env).texture; scene.environmentIntensity = .85;
    skyDome(scene, 'day'); scene.fog = new THREE.Fog('#b9d3e8', 40, 220);
    const sun = new THREE.DirectionalLight('#fff0d6', 3.0); sun.position.set(-10, 16, 9); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, {left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun);
    const c: Ctx = {scene, camera, focus: new THREE.Vector3(), dof: 0, caption: ''};
    BUILD[frame](c, st.lib); setCap(c.caption);
    camera.updateMatrixWorld(); scene.updateMatrixWorld(true); faceCards(scene, camera);
    const composer = new EffectComposer(renderer, {frameBufferType: THREE.HalfFloatType});
    composer.addPass(new RenderPass(scene, camera));
    const ao = new N8AOPostPass(scene, camera, width, height); ao.configuration.aoRadius = 1.0; ao.configuration.distanceFalloff = .6; ao.configuration.intensity = 2.2; composer.addPass(ao);
    const lens = new LensBlur({maxCoC: 12, nearScale: 1.0}); lens.focus = camera.position.distanceTo(c.focus); lens.cInf = c.dof;
    composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main));
    composer.addPass(new EffectPass(camera, new BloomEffect({intensity: .3, luminanceThreshold: .85, mipmapBlur: true}), new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC}), new VignetteEffect({darkness: .3, offset: .3})));
    composer.render();
    return () => { composer.dispose(); renderer.dispose(); pm.dispose(); };
  }, [st, width, height, frame]);
  return <AbsoluteFill>
    <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '30%'}}>
      <div style={{fontFamily, fontSize: 124, color: '#ffffff', WebkitTextStroke: '15px #111', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)'}}>{cap}</div>
    </AbsoluteFill>
  </AbsoluteFill>;
};
