// Vasa animatic (GATE B): every picture of SHOTLIST.md blocked at final timing to the recorded voice.
// Real cameras, layout and accepted assets; rough poses, no polish (no DOF, grade, music). Picture only: the voice is
// muxed afterwards (render-animatic.sh).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {GradeEffect, GRADES} from '../../../../templates/bridge/grade';
import {shoreline, skyDome, toonWater, type Water} from './look';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {bodyFront, bodySide, fxPuff, fxSplash, type Outfit, type Expr} from '../../../../templates/bridge/toon';
import {Card, DECK_Y, GUNDECK_Y, WATER_Y, clone, dot, faceCards, loadLib, openLids, put, rig, type Lib} from './lib';
import {FPS, SHOTS, TOTAL, kick, lerp, lerp3, shotAt, smooth, tw} from './story';

export const VASA_FRAMES = TOTAL;

// ---------- characters (1628: no uniforms; research/vasa) ----------
const SAILORS: Outfit[] = [
  {jacket: '#7a5a3a', pants: '#4a4f5a', boots: '#3a2a20', hat: 'hair', hair: '#5a3b2a'},
  {jacket: '#8a3b2e', pants: '#5a4a3a', boots: '#3a2a20', hat: 'cap', cap: '#3d4a5a'},
  {jacket: '#4d5e3a', pants: '#4a4f5a', boots: '#3a2a20', hat: 'hair', hair: '#2f2418'},
  {jacket: '#6b6a5a', pants: '#3a3f4a', boots: '#3a2a20', hat: 'cap', cap: '#7a3b2e'},
];
const OFFICER: Outfit = {jacket: '#2f3f6b', pants: '#2b2b33', boots: '#1d1a1a', hat: 'hair', hair: '#4a3020', moustache: '#4a3020', buttons: '#e8c45a', build: 'stout'};
const OFFICIAL: Outfit = {jacket: '#2b2b33', pants: '#2b2b33', boots: '#1d1a1a', hat: 'hair', hair: '#d8d4cc', buttons: '#d9dde0', build: 'stout'};
const KING: Outfit = {jacket: '#5b2a6e', pants: '#3a2a40', boots: '#1d1a1a', hat: 'hair', hair: '#7a4a2a', moustache: '#7a4a2a', buttons: '#e8c45a', sash: '#2f6fb0'};
const VISITORS: Outfit[] = [
  {jacket: '#e2453c', pants: '#3b5b9a', boots: '#f4f1ea', hat: 'hair', hair: '#5a3b2a'},
  {jacket: '#f08a2c', pants: '#3b3f52', boots: '#5a3b2a', hat: 'cap', cap: '#3b5b9a'},
  {jacket: '#7b5ac9', pants: '#3b3f52', boots: '#5a3b2a', hat: 'hair', hair: '#2f2418'},
  {jacket: '#3aa37a', pants: '#3b3f52', boots: '#f4f1ea', hat: 'hair', hair: '#c9a05a'},
];

const front = (o: Outfit, seed: number, opts: Parameters<typeof bodyFront>[2] = {}) =>
  new Card(o.build === 'stout' ? 1.8 : 1.75).draw(p => bodyFront(p, o, {mode: 'stand', seed, ...opts}));
const crown = (c: Card) => { // gold crown on top of the King's head
  const g = c.g; g.save(); g.setTransform(c.res, 0, 0, c.res, 0, 0);
  g.fillStyle = '#e8c45a'; g.strokeStyle = '#241726'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(232, 150); g.lineTo(232, 80); g.lineTo(266, 118); g.lineTo(300, 62); g.lineTo(334, 118); g.lineTo(368, 80); g.lineTo(368, 150); g.closePath();
  g.fill(); g.stroke(); g.restore(); c.tex.needsUpdate = true; return c;
};

// ---------- environments ----------
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera; water?: Water; ship?: THREE.Object3D; look?: number[]; dof?: number};
const sky = (c: Ctx, k: 'day' | 'afternoon' | 'morning61', _far = 0) => { skyDome(c.scene, k === 'afternoon' ? 'afternoon' : 'day'); (c as Ctx & {pal?: string}).pal = k; };
const water = (c: Ctx) => { const w = toonWater((c as Ctx & {pal?: string}).pal === 'afternoon' ? 'afternoon' : 'day'); c.scene.add(w.mesh); c.water = w; return w.mesh; };
let shoreSeed = 1;
const shore = (c: Ctx) => {
  shoreline(c.scene, 150, 1, -260, 260, shoreSeed);           // town side (+X), seen behind the ship from the port-side camera
  shoreline(c.scene, -150, -1, -260, 260, shoreSeed + 4, true); // Sodermalm-style cliffs (-X), seen from the quay
  c.scene.add(put(clone(c.L, 'tre-kronor-castle'), [205, WATER_Y + 1.5, 95], -Math.PI / 2));
};
/** ship inside a roll pivot at the waterline: root.rotation.z = heel (+ = to port, masts toward -X), root.position.y = sink */
const ship = (c: Ctx, sails: 'set' | 'furled' | 'none') => {
  const root = new THREE.Group();
  root.position.y = WATER_Y;
  const v = clone(c.L, 'vasa');
  v.position.y = -WATER_Y;
  rig(v, sails);
  root.add(v);
  c.scene.add(root);
  c.ship = root;
  return {root, v};
};
const quay = (c: Ctx) => { for (let i = -2; i <= 2; i++) c.scene.add(put(clone(c.L, 'quay-segment'), [12.5, WATER_Y - 1.2, i * 8], Math.PI / 2)); return WATER_Y + 1.3; };
const room = (c: Ctx) => {
  c.scene.background = new THREE.Color('#1c2a2e');
  const m = (col: string) => new THREE.MeshLambertMaterial({color: col});
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), m('#8a4a30')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), m('#b8322a')); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .01, .6); rug.receiveShadow = true;
  const rugB = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.4), m('#e0b44a')); rugB.rotation.x = -Math.PI / 2; rugB.position.set(0, .005, .6);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), m('#2f6b66')); back.position.set(0, 3, -2.6); back.receiveShadow = true;
  const wains = new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, .1), m('#5a3424')); wains.position.set(0, .55, -2.55);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(14, .12, .14), m('#d8a94a')); rail.position.set(0, 1.12, -2.52);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshBasicMaterial({color: '#fff1c8'})); win.position.set(-3.4, 2.5, -2.57);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, .08), m('#5a3424')); frame.position.set(-3.4, 2.5, -2.6);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(4.05, .02, 1.25), m('#2f6b3a')); cloth.position.set(0, .81, 0); cloth.receiveShadow = true;
  c.scene.add(floor, rugB, rug, back, wains, rail, frame, win, cloth);
  const key = new THREE.SpotLight('#ffe3b0', 90, 18, .5, .6, 1.2); key.position.set(-2.5, 6.5, 4.5); key.target.position.set(0, 1, -.5);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  const beam = new THREE.DirectionalLight('#fff0d0', .9); beam.position.set(-6, 5, -1);
  c.scene.add(new THREE.HemisphereLight('#bfd8d6', '#4a2a20', .75), key, key.target, beam);
  c.scene.add(clone(c.L, 'inquiry-table'));
};
const toySet = (c: Ctx) => {
  c.scene.background = new THREE.Color('#bfe0f2');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({color: '#f3e6c8'}));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; c.scene.add(floor);
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(-3, 6, 4); key.castShadow = true;
  c.scene.add(new THREE.HemisphereLight('#ffffff', '#c8b8a0', 1.3), key);
};
/** punching-bag toy: weighted round base, tall body, painted face band. Pivot at the floor contact. */
const toy = (headHeavy = false) => {
  const g = new THREE.Group(), body = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({color: '#e2453c'}), white = new THREE.MeshLambertMaterial({color: '#f4f1ea'});
  const base = new THREE.Mesh(new THREE.SphereGeometry(.34, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), red); base.position.y = .34;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.24, .34, .7, 32), white); tube.position.y = .69;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.26, 32, 16), red); head.position.y = 1.1;
  [base, tube, head].forEach(m => { m.castShadow = true; body.add(m); });
  const d = dot(headHeavy ? .12 : .16); d.position.y = headHeavy ? 1.1 : .22; body.add(d);
  g.add(body);
  return {g, body};
};
const museum = (c: Ctx) => {
  c.scene.background = new THREE.Color('#2a2530');
  c.scene.fog = new THREE.Fog('#2a2530', 110, 260);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(180, 80, 120), new THREE.MeshLambertMaterial({color: '#2e2a33', side: THREE.BackSide}));
  hall.position.y = 39.9; hall.receiveShadow = true; c.scene.add(hall);
  c.scene.add(new THREE.HemisphereLight('#b0a6b8', '#3a3038', 1.8));
  const fill = new THREE.DirectionalLight('#ffe6c2', 1.2); fill.position.set(-60, 30, 60); c.scene.add(fill);
  [[-40, 50, 40], [-30, 60, -30], [30, 55, 20]].forEach(p => {
    const s = new THREE.SpotLight('#ffcf8a', 6000, 0, .5, .5, 1.6); s.position.set(p[0], p[1], p[2]); s.target.position.set(0, 18, 0);
    s.castShadow = true; c.scene.add(s, s.target);
  });
};


/** toon splash card (bridge fxSplash, 800 x 800 design canvas); call .at(t) with t in 0..1 */
const splash = (parent: THREE.Object3D, pos: number[], size = 4) => {
  const c = new Card(size, .3, 800, 800, false);
  c.mesh.position.set(pos[0], pos[1], pos[2]); parent.add(c.mesh);
  return {c, at: (t: number) => { c.mesh.visible = t > 0 && t < 1; if (c.mesh.visible) c.draw(p => fxSplash(p, t)); }};
};
/** white wind streaks racing across the frame along +X */
const windStreaks = (scene: THREE.Scene, n = 10) => Array.from({length: n}, (_, i) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(10 + (i % 3) * 5, .25), new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}));
  m.rotation.y = -Math.PI / 2; m.layers.set(NOINK); scene.add(m);
  return (t: number) => { const k = (t * 70 + i * 19) % 120; m.position.set(-26 + (i * 13 % 16), WATER_Y + 1 + (i * 37 % 15), -60 + k); (m.material as THREE.MeshBasicMaterial).opacity = .8 * Math.sin(Math.PI * k / 120); };
});

// ---------- the 35 pictures ----------
type Upd = (f: number, local: number, u: number) => void;
type Build = (c: Ctx) => Upd;
const cam = (c: Ctx, p: number[], t: number[], fov = 40, roll = 0) => {
  c.look = t;
  c.camera.fov = fov; c.camera.updateProjectionMatrix();
  c.camera.position.set(p[0], p[1], p[2]); c.camera.up.set(0, 1, 0); c.camera.lookAt(t[0], t[1], t[2]);
  if (roll) c.camera.rotateZ(roll * Math.PI / 180);
};
/** glide from A to B over the shot with smootherstep; holds creep (fov push 0.25 %/frame) */
const glide = (c: Ctx, A: number[][], B: number[][], u: number, local: number, fov = 40, roll = 0, creep = .0025) =>
  cam(c, lerp3(A[0], B[0], smooth(u)), lerp3(A[1], B[1], smooth(u)), fov * Math.max(.75, 1 - creep * local), roll);
const sec = (f: number) => f / FPS;
const T = (line: string, i = 0) => Math.round(tw(line, i) * FPS);   // frame of a word

const deckSailors = (root: THREE.Object3D, n: number, rows = 3) => Array.from({length: n}, (_, i) => {
  const c = new Card(1.75, .35);
  c.mesh.position.set(0, DECK_Y - WATER_Y, -6 + (i % rows) * 2.4 + Math.floor(i / rows) * .45);
  root.add(c.mesh);
  return c;
});

const B: Record<number, Build> = {
  1: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'set'); const crew = deckSailors(s.root, 4, 4);
    crew.forEach((k, i) => { k.mesh.position.set(-3.7, DECK_Y - WATER_Y, -16 + i * 1.6); k.draw(p => bodyFront(p, SAILORS[i % 4], {mode: 'stand', expr: i % 2 ? 'shock' : 'nervous', seed: i + 3, tilt: -10, wave: i === 1 ? 1 : undefined})); });
    const sp = splash(c.scene, [-7.5, WATER_Y - .4, -30], 8);
    return (f, l, u) => { s.root.rotation.z = .2 + .02 * Math.sin(sec(l) * 3); s.root.position.z = -sec(f) * 1.2; sp.c.mesh.position.z = s.root.position.z - 30; sp.at((l % 40) / 40);
      glide(c, [[-8.5, 15.6, -22], [-3.6, 14.2, -13.5]], [[-60, 11, -10], [0, 17, -6]], u, 0, 42, 5); }; },
  2: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    const sps = [-16, -9.5, -3].map(z => splash(c.scene, [-9.5, WATER_Y - .5, z], 9));
    return (f, l, u) => { s.root.rotation.z = lerp(.2, .48, smooth(l / 8)); s.root.position.z = -sec(f) * 1.2;
      sps.forEach((p, i) => { p.c.mesh.position.z = s.root.position.z - 16 + i * 6.5; p.at((l - 4 - i * 2) / 22); });
      cam(c, [-40, 8 + kick(l, .5), -4], [0, 12, s.root.position.z - 4], 42, 7 + 3 * kick(l)); }; },
  3: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled');
    const guns = [0, 1, 2, 3].map(k => { const g = put(clone(c.L, 'cannon-24pdr'), [-1.5, GUNDECK_Y, -13.2 + k * 3.22], Math.PI / 2); s.v.add(g); return g; });
    return (f, l, u) => { guns.forEach((g, k) => { g.position.x = lerp(-2.5, -6.6, smooth((l - k * 5) / 8)); });
      glide(c, [[-13, 10.6, -18], [-5.5, 10.2, -10]], [[-13, 10.6, -6], [-5.5, 10.2, 2]], u, 0, 40); }; },
  4: c => { sky(c, 'day'); water(c); shore(c); ship(c, 'furled');
    return (f, l, u) => glide(c, [[-34, 7, 4], [0, 8, 2]], [[-34, 9, 4], [0, 19, 2]], u, 0, 40); },
  5: c => { sky(c, 'day'); water(c); shore(c); ship(c, 'furled');
    return (f, l, u) => glide(c, [[-14, 22, 54], [0, 20, 33]], [[-10, 21, 46], [0, 20, 33]], u, 0, 34); },
  6: c => { room(c); const k = crown(front(KING, 11, {expr: 'grin'})); put(k.mesh, [0, 0, -.9]); c.scene.add(k.mesh);
    const plans = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .8), new THREE.MeshLambertMaterial({color: '#efe2bd'})); plans.rotation.x = -Math.PI / 2; plans.position.set(0, .81, .1); c.scene.add(plans);
    const stamp = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, .12), new THREE.MeshLambertMaterial({color: '#8a3b2e'})); c.scene.add(stamp);
    return (f, l, u) => { const hit = T('L03', 6) - 2; stamp.position.set(.35, f < hit ? .81 + .3 * smooth((hit - f) / 6) + .08 : .89, .1);
      glide(c, [[0, 1.6, 4.4], [0, 1.25, 0]], [[0, 1.55, 3.6], [0, 1.25, 0]], u, 0, 40); }; },
  7: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled'); const top = quay(c);
    const off = front(OFFICER, 21, {expr: 'stern'}); put(off.mesh, [12.8, top, 6]); c.scene.add(off.mesh);
    SAILORS.forEach((o, i) => { const k = front(o, i + 4); put(k.mesh, [13.6, top, -1 - i * 1.1]); c.scene.add(k.mesh); });
    return (f, l, u) => { s.root.rotation.z = 0; glide(c, [[16.8, top + .9, 13], [10, 9, -6]], [[16.8, top + .9, 12], [10, 10, -6]], u, l, 50); }; },
  8: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled'); quay(c); const crew = deckSailors(s.root, 12);
    return (f, l, u) => { crew.forEach((k, i) => { k.mesh.position.x = lerp(-4.5, 4.5, smooth((l - (i % 3) * 2) / 26)); k.mesh.userData.flip = false;
        k.draw(p => bodySide(p, SAILORS[i % 4], {mode: 'march', phase: sec(l) * 2.6 + i * .17, stomp: 1.4, stride: 1.2, seed: i + 2})); });
      cam(c, [-2.5, 31, 12], [0, DECK_Y, -2], 36); }; },
  9: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled'); quay(c); const crew = deckSailors(s.root, 9); crew.forEach((k, i) => { k.mesh.position.z = 7 + (i % 3) * 1.4 + Math.floor(i / 3) * .4; });
    return (f, l, u) => { crew.forEach((k, i) => { k.mesh.position.x = lerp(3.2, -4.5, smooth((l - (i % 3) * 2) / 24)); k.mesh.userData.flip = true;
        k.draw(p => bodySide(p, SAILORS[i % 4], {mode: 'march', phase: sec(l) * 2.6 + i * .17, stomp: 1.4, stride: 1.2, seed: i + 2})); });
      glide(c, [[1.5, DECK_Y + 1.5, 16.5], [.5, DECK_Y + 1.1, 8.5]], [[.5, DECK_Y + 1.5, 16], [-.5, DECK_Y + 1.1, 8.5]], u, l, 56, -3); }; },
  10: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled'); quay(c);
    return (f, l, u) => { s.root.rotation.z = .12 * Math.sin(2 * Math.PI * sec(l) / 1.5);
      glide(c, [[30, WATER_Y + 2.6, 34], [0, 15, 0]], [[28, WATER_Y + 2.6, 31], [0, 15, 0]], u, l, 40); }; },
  11: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled'); const top = quay(c);
    const off = new Card(1.8, .5); put(off.mesh, [13, top, 6]); c.scene.add(off.mesh);
    return (f, l, u) => { s.root.rotation.z = .12 * Math.sin(2 * Math.PI * sec(l + 60) / 1.5);
      off.draw(p => bodyFront(p, OFFICER, {mode: 'stand', expr: l < 6 ? 'stern' : 'shock', seed: 21}));
      cam(c, [13.2, top + 1.55, 8.4 - .02 * l], [13, top + 1.5, 6], 40 * (1 - .006 * Math.min(l, 25))); }; },
  12: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'furled'); quay(c);
    const off = new Card(1.8, .5); off.mesh.position.set(-2.5, DECK_Y - WATER_Y, 8); s.root.add(off.mesh);
    const crew = deckSailors(s.root, 4, 4);
    crew.forEach((k, i) => k.mesh.position.set(1.6 + i * .5, DECK_Y - WATER_Y, 7 + i * .9));
    return (f, l, u) => { off.draw(p => bodyFront(p, OFFICER, {mode: 'stand', expr: 'stern', wave: 1, seed: 21}));
      crew.forEach((k, i) => { const x = lerp(4 + i * .6, .4 + i * .32, smooth(l / 10)); k.mesh.position.x = x;
        k.draw(p => bodyFront(p, SAILORS[i % 4], {mode: 'stand', expr: l > 10 ? 'dazed' : 'nervous', tilt: l > 10 ? (i % 2 ? 9 : -9) : 0, seed: i + 2})); });
      cam(c, [3.6, DECK_Y + 1.5, 17], [-.4, DECK_Y + 1.1, 7.6], 46 * (1 - .002 * l)); }; },
  13: c => { sky(c, 'day'); water(c); shore(c); ship(c, 'furled'); const top = quay(c);
    const a = front(OFFICER, 21, {expr: 'nervous', look: -1}); put(a.mesh, [12.6, top, 2]);
    const b = front(OFFICIAL, 31, {expr: 'neutral', look: 1}); put(b.mesh, [13.6, top, 2.6]); c.scene.add(a.mesh, b.mesh);
    return (f, l, u) => { const n = l - (SHOTS.find(s => s.pic === 13)!.b - SHOTS.find(s => s.pic === 13)!.a - 7);
      a.draw(p => bodyFront(p, OFFICER, {mode: 'stand', expr: 'nervous', look: -1, seed: 21, lift: n > -14 ? 0 : 0}));
      const whip = Math.max(0, n) * 9;
      cam(c, [16.5, top + 1.5, 7.5], [13.1 - whip * .4, top + 1.35, 2.3 - whip * .2], 40 * (1 - .002 * l)); }; },
  14: c => { sky(c, 'afternoon', 1200); water(c); shore(c); const s = ship(c, 'furled');
    const rb = put(clone(c.L, 'rowboat'), [30, WATER_Y - .3, -30], .3); c.scene.add(rb);
    return (f, l, u) => { s.root.position.z = -sec(l) * 1.0; glide(c, [[-70, 40, -48], [60, 18, 40]], [[-70, 16, -48], [60, 18, 40]], u, 0, 44); }; },
  15: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set');
    return (f, l, u) => { rig(s.v, 'set', lerp(.15, 1, smooth(l / 14))); glide(c, [[-52, 12, -4], [0, 18, -4]], [[-52, 12, -4], [0, 34, -4]], u, 0, 40); }; },
  16: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    const puff = new Card(6, .5, 300, 300, false); puff.mesh.position.set(-8.5, 8.6 - WATER_Y, -6.5); s.root.add(puff.mesh);
    return (f, l, u) => { puff.draw(p => fxPuff(p, Math.min(1, l / 18)));
      cam(c, [-13 + kick(l, .25), 10.8, -1.5], [-6.5, 10.4, -6.5], 44, 2 * kick(l)); }; },
  17: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set');
    const k = new Card(1.75, .5); k.mesh.position.set(-4.4, DECK_Y - WATER_Y, 2); s.root.add(k.mesh);
    k.draw(p => bodyFront(p, SAILORS[0], {mode: 'stand', expr: 'relief', tilt: 7, seed: 3}));
    return (f, l, u) => { glide(c, [[-.5, DECK_Y + 1.6, 7.5], [-4.4, DECK_Y + 1.1, 2]], [[-1, DECK_Y + 1.6, 6.8], [-4.4, DECK_Y + 1.1, 2]], u, l, 42); }; },
  18: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set');
    const band = new THREE.Mesh(new THREE.PlaneGeometry(14, 200), new THREE.MeshBasicMaterial({color: '#123f63'})); band.rotation.x = -Math.PI / 2; band.position.y = WATER_Y + .02; c.scene.add(band);
    const streaks = windStreaks(c.scene, 14);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .1, 20), new THREE.MeshLambertMaterial({color: '#3a2a20'})); c.scene.add(hat);
    return (f, l, u) => { band.position.x = lerp(-90, -6, l / 22); streaks.forEach(st => st(sec(l)));
      s.root.rotation.z = lerp(0, .08, smooth((l - 16) / 10));
      const hu = Math.max(0, (l - 14) / 10); hat.position.set(-5.5 + 6 * hu, DECK_Y + 1.7 + 3 * hu, 0); hat.rotation.z = hu * 6;
      cam(c, [-38, WATER_Y + .7, 6], [0, WATER_Y + 7, 0], 46); }; },
  19: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    const sps = [-18, -11, -4, 3, 10].map(z => splash(c.scene, [-9.5, WATER_Y - .5, z], 10));
    return (f, l, u) => { s.root.rotation.z = lerp(0, .55, smooth(u * 1.2));
      sps.forEach((p, i) => p.at((s.root.rotation.z - .3) * 4 - i * .08));
      cam(c, [-88, 11, 2], [0, 14, 0], 40, 10 * s.root.rotation.z); }; },
  20: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set'); openLids(s.v, 'lower', 1.1);
    // exterior ECU: heeled port side, the lower cannon hatches dip to the waterline, water pours in at each one
    const lids = [4, 5, 6, 7].map(n => s.v.getObjectByName(`gunport_lid_port_lower_${String(n).padStart(2, '0')}`)!);
    const pours = lids.map(() => splash(c.scene, [0, 0, 0], 3.4));
    const wp = new THREE.Vector3();
    return (f, l, u) => { s.root.rotation.z = lerp(.62, .7, u); c.scene.updateMatrixWorld(true);
      lids.forEach((lid, i) => { lid.getWorldPosition(wp); pours[i].c.mesh.position.set(wp.x - .9, Math.max(WATER_Y - .5, wp.y - 1.6), wp.z); pours[i].at(((l + i * 6) % 20) / 20); });
      lids[1].getWorldPosition(wp);
      cam(c, [wp.x - 8 + kick(l, .2), WATER_Y + 4.2, wp.z - 7], [wp.x, WATER_Y + .2, wp.z + 1], 46, 10 + 2 * kick(l)); }; },
  21: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set');
    const boats = [0, 1, 2].map(i => { const b = put(clone(c.L, 'rowboat'), [26 + i * 9, WATER_Y - .3, 18 - i * 14], -1.3 + i * .2); c.scene.add(b);
      [-.9, .9].forEach((dz, j) => { const k = front(SAILORS[(i + j) % 4], 80 + i * 2 + j, {expr: 'shock', wave: 1}); put(k.mesh, [0, .45, dz]); k.mesh.scale.multiplyScalar(.95); b.add(k.mesh); }); return b; });
    const sps = [[-6, -20], [-7, -6], [-6, 8], [5, -12], [6, 4]].map(([x, z]) => splash(c.scene, [x, WATER_Y - .3, z], 10));
    return (f, l, u) => { s.root.rotation.z = lerp(.6, 1.05, u); s.root.position.y = WATER_Y - 24 * smooth(u);
      sps.forEach((p, i) => p.at(((l + i * 11) % 34) / 34));
      boats.forEach((b, i) => { b.position.x = 26 + i * 9 - 12 * u; });
      glide(c, [[-78, 40, 74], [2, 6, 0]], [[-70, 32, 64], [2, 4, 0]], u, l, 40); }; },
  22: c => { sky(c, 'afternoon'); water(c); shore(c);
    const hats = [0, 1, 2, 3].map(i => { const h = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .1, 20), new THREE.MeshLambertMaterial({color: ['#3a2a20', '#5a3b2a', '#2f2418', '#4a3020'][i]})); c.scene.add(h); return h; });
    return (f, l, u) => { hats.forEach((h, i) => { h.position.set(-3 + i * 2.2, WATER_Y + .05 + .05 * Math.sin(sec(l) * 2 + i), i * 1.3 - 2); h.rotation.z = .1 * Math.sin(sec(l) * 1.6 + i); });
      glide(c, [[-14, WATER_Y + 3.6, 12], [0, WATER_Y, 0]], [[-12, WATER_Y + 3.2, 10], [0, WATER_Y, 0]], u, l, 40); }; },
  23: c => { toySet(c); const t = toy(); c.scene.add(t.g);
    return (f, l, u) => { const s = sec(l); t.body.rotation.z = .55 * Math.exp(-2.2 * s) * Math.cos(6 * s) * (l < 4 ? l / 4 : 1);
      glide(c, [[0, 1, 3.4], [0, .7, 0]], [[0, .95, 3.1], [0, .7, 0]], u, l, 40); }; },
  24: c => { toySet(c); const t = toy(); c.scene.add(t.g);
    return (f, l, u) => { const s = sec(l + 30); t.body.rotation.z = .55 * Math.exp(-2.2 * s) * Math.cos(6 * s);
      glide(c, [[0, .95, 3.1], [0, .6, 0]], [[0, .45, 1.6], [0, .3, 0]], u, l, 40, 0, 0); }; },
  25: c => { c.scene.background = new THREE.Color('#f3e6c8'); c.scene.add(new THREE.HemisphereLight('#ffffff', '#e8dcc0', 2.6));
    const s = ship(c, 'none'); s.root.position.y = 0; s.v.position.y = 0;
    const big = [[-14, 12.5], [-5, 13], [4, 12.5], [13, 13], [-10, 10], [0, 10], [10, 10]].map(([z, y]) => { const d = dot(1.1); d.position.set(-8, y, z); c.scene.add(d); return d; });
    const small = dot(.45); small.position.set(-8, 1.5, 0); c.scene.add(small);
    return (f, l, u) => { big.forEach((d, i) => d.scale.setScalar(smooth((l - i * 2) / 6))); small.scale.setScalar(smooth((l - 16) / 6));
      cam(c, [-170, 22, 0], [0, 20, 0], 26); }; },
  26: c => { toySet(c); const t = toy(true); c.scene.add(t.g);
    return (f, l, u) => { t.body.rotation.z = lerp(0, 1.45, smooth((l - 6) / 14)) + (l < 6 ? .08 * Math.sin(l) : 0);
      glide(c, [[0, 1, 3.4], [0, .7, 0]], [[0, .9, 3.2], [0, .6, 0]], u, l, 40); }; },
  27: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set');
    return (f, l, u) => { s.root.rotation.z = .2; s.root.position.y = WATER_Y - lerp(26, 44, smooth(u));
      cam(c, [-60, WATER_Y + 5, 10], [0, WATER_Y + 7, 0], 40); }; },
  28: c => { room(c);
    const officials = [OFFICIAL, {...OFFICIAL, hair: '#5a3b2a', jacket: '#3a2b2b'}, {...OFFICIAL, hair: '#9a9a9a', jacket: '#2b3340'}].map((o, i) => { const k = new Card(1.8, .45); put(k.mesh, [-1.3 + i * 1.3, 0, -1]); c.scene.add(k.mesh); return {k, o}; });
    const wit = [OFFICER, SAILORS[1]].map((o, i) => { const k = new Card(1.75, .45); put(k.mesh, [-1 + i * 2, 0, 1.9]); k.mesh.userData.flip = false; c.scene.add(k.mesh); return {k, o}; });
    c.scene.add(put(clone(c.L, 'inquiry-bench'), [0, 0, 1.4]));
    return (f, l, u) => { officials.forEach(({k, o}, i) => k.draw(p => bodyFront(p, o, {mode: 'stand', expr: 'stern', look: i - 1, seed: 31 + i})));
      wit.forEach(({k, o}, i) => k.draw(p => bodyFront(p, o, {mode: 'stand', expr: 'nervous', wave: f >= T('L17', 4) - 2 + i * 6 ? 1 : undefined, look: i ? -1 : 1, seed: 21 + i})));
      glide(c, [[0, 2.1, 7.5], [0, 1.2, 0]], [[0, 1.9, 6], [0, 1.2, 0]], u, l, 42); }; },
  29: c => { room(c); const k = new Card(1.8, .5); put(k.mesh, [0, 0, -1]); c.scene.add(k.mesh);
    const stamp = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, .12), new THREE.MeshLambertMaterial({color: '#8a3b2e'})); c.scene.add(stamp);
    return (f, l, u) => { k.draw(p => bodyFront(p, OFFICIAL, {mode: 'stand', expr: 'neutral', seed: 31}));
      const hit = T('L18', 1) - 2; stamp.position.set(.3, f < hit ? .89 + .35 * smooth((hit - f) / 6) : .89, -.2);
      cam(c, [0, 1.7, 1.5], [0, 1.45, -1], 40 * (1 - .002 * l), 0); }; },
  30: c => { room(c);
    const portrait = new Card(1.25, .5, 400, 500, false);
    portrait.draw((p, g) => { g.fillStyle = '#b8892e'; g.fillRect(0, 0, 400, 500); g.fillStyle = '#3a3038'; g.fillRect(30, 30, 340, 440);
      const src = new Card(1.75, 1); src.draw(pp => bodyFront(pp, {jacket: '#4a3a2a', pants: '#3a2a20', boots: '#1d1a1a', hat: 'hair', hair: '#d8d4cc', moustache: '#d8d4cc'}, {mode: 'stand', expr: 'neutral', seed: 41}));
      g.drawImage(src.canvas, 130, 60, 340, 430, 30, 40, 340, 430); });
    portrait.mesh.userData.fixed = true; put(portrait.mesh, [0, 1.8, -2.55]); c.scene.add(portrait.mesh);
    const ppl = [OFFICIAL, SAILORS[1], OFFICER].map((o, i) => { const k = new Card(1.78, .45); put(k.mesh, [-1.4 + i * 1.4, 0, .9 + (i % 2) * .5]); c.scene.add(k.mesh); return {k, o}; });
    return (f, l, u) => { ppl.forEach(({k, o}, i) => k.draw(p => bodyFront(p, o, {mode: 'stand', expr: 'neutral', look: lerp(i - 1, i < 1 ? 1 : -1, smooth(l / 12)), seed: 50 + i})));
      glide(c, [[1.3, 1.7, 5.5], [0, 1.9, -2.5]], [[.5, 1.9, 3.2], [0, 2.2, -2.5]], u, 0, 40); }; },
  31: c => { room(c); const portrait = new Card(1.25, .5, 400, 500, false);
    portrait.draw((p, g) => { g.fillStyle = '#b8892e'; g.fillRect(0, 0, 400, 500); g.fillStyle = '#3a3038'; g.fillRect(30, 30, 340, 440);
      const src = new Card(1.75, 1); src.draw(pp => bodyFront(pp, {jacket: '#4a3a2a', pants: '#3a2a20', boots: '#1d1a1a', hat: 'hair', hair: '#d8d4cc', moustache: '#d8d4cc'}, {mode: 'stand', expr: 'neutral', seed: 41}));
      g.drawImage(src.canvas, 130, 60, 340, 430, 30, 40, 340, 430); });
    portrait.mesh.userData.fixed = true; put(portrait.mesh, [0, 1.8, -2.55]); c.scene.add(portrait.mesh);
    return (f, l, u) => cam(c, [0, 2.4, -.6], [0, 2.4, -2.55], 40 * (1 - .0025 * l)); },
  32: c => { sky(c, 'morning61'); water(c); shore(c); const s = ship(c, 'none');
    c.scene.add(put(clone(c.L, 'salvage-pontoon-crane'), [-14, WATER_Y - 2, 0]), put(clone(c.L, 'salvage-pontoon-crane'), [14, WATER_Y - 2, 0], Math.PI));
    return (f, l, u) => { s.root.position.y = WATER_Y - lerp(14, 5, smooth(u)); s.root.rotation.z = .05;
      glide(c, [[-58, WATER_Y + 3, -48], [0, WATER_Y + 6, 0]], [[-52, WATER_Y + 3.5, -42], [0, WATER_Y + 7, 0]], u, l, 40); }; },
  33: c => { museum(c); const s = ship(c, 'none'); s.root.position.y = WATER_Y + 1;
    VISITORS.concat(VISITORS).forEach((o, i) => { const k = front(o, 60 + i, {expr: i % 3 ? 'grin' : 'laugh', look: 1}); put(k.mesh, [-24 - (i % 4) * 1.8, 0, 34 + (i >> 2) * 2.4 + (i % 2)]); c.scene.add(k.mesh); });
    return (f, l, u) => glide(c, [[-36, 2.2, 46], [-12, 3.5, 22]], [[-38, 12, 50], [0, 11, 6]], u, 0, 46); },
  34: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    return (f, l, u) => { s.root.rotation.z = lerp(.35, .5, u); cam(c, [-55, 10, -4], [0, 14, 0], 40, 6 + 2 * kick(l)); }; },
  35: c => { museum(c); const s = ship(c, 'none'); s.root.position.y = WATER_Y + 1;
    const crowd = Array.from({length: 10}, (_, i) => { const k = new Card(1.75, .35); c.scene.add(k.mesh); return k; });
    return (f, l, u) => { crowd.forEach((k, i) => { put(k.mesh, [-10 - (i % 3) * 1.5, 0, 54 - ((l * .1 + i * 2.2) % 18)]);
        k.draw(p => bodyFront(p, VISITORS[i % 4], {mode: 'stroll', phase: sec(l) * 1.8 + i * .3, expr: i % 3 ? 'grin' : 'neutral', seed: 70 + i})); });
      glide(c, [[-16, 2.4, 64], [-5, 5, 36]], [[-14, 3.2, 58], [-3, 8, 34]], u, l, 50); }; },
};

export const VasaAnimatic: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [lib, setLib] = useState<Lib | null>(null);
  const [handle] = useState(() => delayRender('glbs'));
  const st = useRef<{renderer?: THREE.WebGLRenderer; pic?: number; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; composer?: EffectComposer; upd?: Upd; ctx?: Ctx; lens?: LensBlur}>({});
  useLayoutEffect(() => { loadLib().then(l => { setLib(l); continueRender(handle); }).catch(e => { console.error(e); continueRender(handle); }); }, [handle]);
  useLayoutEffect(() => () => { st.current.composer?.dispose(); st.current.renderer?.dispose(); }, []);

  useLayoutEffect(() => {
    if (!lib) return;
    const S = st.current;
    if (!S.renderer) {
      S.renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
      S.renderer.setSize(width, height, false);
      S.renderer.shadowMap.enabled = true;
      S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    const shot = shotAt(frame);
    if (S.pic !== shot.pic) {
      S.composer?.dispose();
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, .05, 3000);
      camera.layers.enable(NOINK);
      S.lens?.dispose();
      const ctx: Ctx = {L: lib, scene, camera};
      S.upd = B[shot.pic](ctx);
      const composer = new EffectComposer(S.renderer, {multisampling: 4, frameBufferType: THREE.HalfFloatType});
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new InkPass(scene, camera, {distFar: 120}));
      const lens = new LensBlur({maxCoC: 24, nearScale: 1.2});
      composer.addPass(new EffectPass(camera, lens.pre));
      composer.addPass(new EffectPass(camera, lens.main));
      composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), new GradeEffect(GRADES.day, .85)));
      Object.assign(S, {pic: shot.pic, scene, camera, composer, ctx, lens});
    }
    const local = frame - shot.a;
    S.upd!(frame, local, local / Math.max(1, shot.b - shot.a - 1));
    const C = S.ctx!;
    if (C.water) {
      const sp = C.ship;
      const on = sp ? Math.max(0, 1 - Math.abs(sp.position.y - WATER_Y) / 3) * Math.max(0, 1 - Math.abs(sp.rotation.z) / .6) : 0;
      C.water.set(sec(frame), sp ? {x: sp.position.x, z: sp.position.z, on} : undefined);
    }
    // depth of field: focus on the look target; blur by shot size (bridge dofAt: CU 12-14, MS 10-12, wide 0)
    const d = C.look ? S.camera!.position.distanceTo(new THREE.Vector3(C.look[0], C.look[1], C.look[2])) : 50;
    S.lens!.focus = d;
    S.lens!.cInf = C.dof ?? (d < 4 ? 13 : d < 12 ? 10 : d < 30 ? 6 : 0);
    S.camera!.updateMatrixWorld();
    S.scene!.updateMatrixWorld(true);
    faceCards(S.scene!, S.camera!);
    S.composer!.render();
  }, [frame, width, height, lib]);

  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
