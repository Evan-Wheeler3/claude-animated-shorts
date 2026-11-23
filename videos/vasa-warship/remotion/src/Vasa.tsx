// Vasa animatic (GATE B): every picture of SHOTLIST.md blocked at final timing to the recorded voice.
// Real cameras, layout and accepted assets; rough poses, no polish (no DOF, grade, music). Picture only: the voice is
// muxed afterwards (render-animatic.sh).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, RenderPass} from 'postprocessing';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {bodyFront, bodySide, fxPuff, type Outfit, type Expr} from '../../../../templates/bridge/toon';
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
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera};
const LIGHTS = {
  day: {sky: '#8fb6e4', fog: '#b8d0ec', sun: '#fff1d6', sunI: 2.4, hemi: 1.4},
  afternoon: {sky: '#9ab7dc', fog: '#d9cdb8', sun: '#ffdcae', sunI: 2.5, hemi: 1.25},
  morning61: {sky: '#a9bfd4', fog: '#c9d4de', sun: '#e6eefc', sunI: 1.9, hemi: 1.5},
};
const sky = (c: Ctx, k: keyof typeof LIGHTS, far = 420) => {
  const l = LIGHTS[k];
  c.scene.background = new THREE.Color(l.sky);
  c.scene.fog = new THREE.Fog(l.fog, 140, far);
  const sun = new THREE.DirectionalLight(l.sun, l.sunI);
  sun.position.set(-40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -70, right: 70, top: 70, bottom: -70, far: 300});
  sun.shadow.normalBias = .03;
  c.scene.add(new THREE.HemisphereLight('#dbe5ff', '#6d5a4d', l.hemi), sun);
};
const water = (c: Ctx) => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({color: '#2f7fae'}));
  w.rotation.x = -Math.PI / 2; w.position.y = WATER_Y; w.receiveShadow = true;
  c.scene.add(w);
  return w;
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
  return {root, v};
};
const quay = (c: Ctx) => { for (let i = -2; i <= 2; i++) c.scene.add(put(clone(c.L, 'quay-segment'), [12.5, WATER_Y - 1.2, i * 8], Math.PI / 2)); return WATER_Y + 1.3; };
const shore = (c: Ctx) => {
  c.scene.add(put(clone(c.L, 'tre-kronor-castle'), [175, WATER_Y, 115], -Math.PI / 2));
  const cols = ['#b5654a', '#e3d3b0', '#c99a4a', '#a8533e', '#d9c7a0'];
  for (let i = 0; i < 14; i++) {
    const h = 7 + (i * 37 % 5), b = new THREE.Mesh(new THREE.BoxGeometry(9, h, 8), new THREE.MeshLambertMaterial({color: cols[i % 5]}));
    b.position.set(205 + (i % 2) * 10, WATER_Y + h / 2, -90 + i * 13); b.castShadow = true; c.scene.add(b);
    const r = new THREE.Mesh(new THREE.ConeGeometry(6.6, 4, 4), new THREE.MeshLambertMaterial({color: '#7a3b2e'}));
    r.rotation.y = Math.PI / 4; r.position.set(b.position.x, WATER_Y + h + 2, b.position.z); c.scene.add(r);
  }
};
const room = (c: Ctx) => {
  c.scene.background = new THREE.Color('#3a3038');
  const m = (col: string) => new THREE.MeshLambertMaterial({color: col});
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), m('#7a5a3e')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), m('#c8b48a')); back.position.set(0, 3, -2.6); back.receiveShadow = true;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2), new THREE.MeshBasicMaterial({color: '#fff3d6'})); win.position.set(-3.2, 2.4, -2.58);
  c.scene.add(floor, back, win);
  const key = new THREE.DirectionalLight('#fff0d0', 2.2); key.position.set(-6, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  c.scene.add(new THREE.HemisphereLight('#f2e6d0', '#5a4a3a', 1.1), key);
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
  c.scene.background = new THREE.Color('#1d1a22');
  c.scene.fog = new THREE.Fog('#1d1a22', 90, 220);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(180, 80, 120), new THREE.MeshLambertMaterial({color: '#2e2a33', side: THREE.BackSide}));
  hall.position.y = 39.9; hall.receiveShadow = true; c.scene.add(hall);
  c.scene.add(new THREE.HemisphereLight('#8a8090', '#302a30', 1.1));
  [[-40, 50, 40], [-30, 60, -30], [30, 55, 20]].forEach(p => {
    const s = new THREE.SpotLight('#ffcf8a', 6000, 0, .5, .5, 1.6); s.position.set(p[0], p[1], p[2]); s.target.position.set(0, 18, 0);
    s.castShadow = true; c.scene.add(s, s.target);
  });
};

// ---------- the 35 pictures ----------
type Upd = (f: number, local: number, u: number) => void;
type Build = (c: Ctx) => Upd;
const cam = (c: Ctx, p: number[], t: number[], fov = 40, roll = 0) => {
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
  1: c => { sky(c, 'day'); water(c); shore(c); const s = ship(c, 'set'); const crew = deckSailors(s.root, 3, 3);
    crew.forEach((k, i) => { k.mesh.position.set(-4.5, DECK_Y - WATER_Y, -20 + i * 2.2); k.draw(p => bodyFront(p, SAILORS[i % 4], {mode: 'stand', expr: 'nervous', seed: i + 3, tilt: -8})); });
    return (f, l, u) => { s.root.rotation.z = .17; s.root.position.z = -sec(f) * 1.2;
      glide(c, [[-14, 9, -40], [0, 14, -30]], [[-75, 9, -20], [0, 18, 0]], u, 0, 40, 4); }; },
  2: c => { sky(c, 'day'); water(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    return (f, l, u) => { s.root.rotation.z = lerp(.17, .44, smooth(l / 8)); s.root.position.z = -sec(f) * 1.2;
      cam(c, [-42, 9 + kick(l, .4), -6], [0, 12, s.root.position.z], 40, 6 + 2 * kick(l)); }; },
  3: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled');
    const guns = [0, 1, 2, 3].map(k => { const g = put(clone(c.L, 'cannon-24pdr'), [-1.5, GUNDECK_Y, -13.2 + k * 3.22], Math.PI / 2); s.v.add(g); return g; });
    return (f, l, u) => { guns.forEach((g, k) => { g.position.x = lerp(-2.5, -6.6, smooth((l - k * 5) / 8)); });
      glide(c, [[-13, 10.6, -18], [-5.5, 10.2, -10]], [[-13, 10.6, -6], [-5.5, 10.2, 2]], u, 0, 40); }; },
  4: c => { sky(c, 'day'); water(c); ship(c, 'furled');
    return (f, l, u) => glide(c, [[-34, 7, 4], [0, 8, 2]], [[-34, 9, 4], [0, 19, 2]], u, 0, 40); },
  5: c => { sky(c, 'day'); water(c); ship(c, 'furled');
    return (f, l, u) => glide(c, [[-14, 22, 54], [0, 20, 33]], [[-10, 21, 46], [0, 20, 33]], u, 0, 34); },
  6: c => { room(c); const k = crown(front(KING, 11, {expr: 'grin'})); put(k.mesh, [0, 0, -.9]); c.scene.add(k.mesh);
    const plans = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .8), new THREE.MeshLambertMaterial({color: '#efe2bd'})); plans.rotation.x = -Math.PI / 2; plans.position.set(0, .81, .1); c.scene.add(plans);
    const stamp = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, .12), new THREE.MeshLambertMaterial({color: '#8a3b2e'})); c.scene.add(stamp);
    return (f, l, u) => { const hit = T('L03', 6) - 2; stamp.position.set(.35, f < hit ? .81 + .3 * smooth((hit - f) / 6) + .08 : .89, .1);
      glide(c, [[0, 1.6, 4.4], [0, 1.25, 0]], [[0, 1.55, 3.6], [0, 1.25, 0]], u, 0, 40); }; },
  7: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled'); const top = quay(c);
    const off = front(OFFICER, 21, {expr: 'stern'}); put(off.mesh, [12.8, top, 6]); c.scene.add(off.mesh);
    SAILORS.forEach((o, i) => { const k = front(o, i + 4); put(k.mesh, [13.6, top, -1 - i * 1.1]); c.scene.add(k.mesh); });
    return (f, l, u) => { s.root.rotation.z = 0; glide(c, [[16.8, top + .9, 13], [10, 9, -6]], [[16.8, top + .9, 12], [10, 10, -6]], u, l, 50); }; },
  8: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled'); quay(c); const crew = deckSailors(s.root, 12);
    return (f, l, u) => { crew.forEach((k, i) => { k.mesh.position.x = lerp(-4.5, 4.5, smooth((l - (i % 3) * 2) / 26)); k.mesh.userData.flip = false;
        k.draw(p => bodySide(p, SAILORS[i % 4], {mode: 'march', phase: sec(l) * 2.6 + i * .17, stomp: 1.4, stride: 1.2, seed: i + 2})); });
      cam(c, [-2.5, 31, 12], [0, DECK_Y, -2], 36); }; },
  9: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled'); quay(c); const crew = deckSailors(s.root, 9); crew.forEach((k, i) => { k.mesh.position.z = 7 + (i % 3) * 1.4 + Math.floor(i / 3) * .4; });
    return (f, l, u) => { crew.forEach((k, i) => { k.mesh.position.x = lerp(3.2, -4.5, smooth((l - (i % 3) * 2) / 24)); k.mesh.userData.flip = true;
        k.draw(p => bodySide(p, SAILORS[i % 4], {mode: 'march', phase: sec(l) * 2.6 + i * .17, stomp: 1.4, stride: 1.2, seed: i + 2})); });
      glide(c, [[1.5, DECK_Y + 1.5, 16.5], [.5, DECK_Y + 1.1, 8.5]], [[.5, DECK_Y + 1.5, 16], [-.5, DECK_Y + 1.1, 8.5]], u, l, 56, -3); }; },
  10: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled'); quay(c);
    return (f, l, u) => { s.root.rotation.z = .12 * Math.sin(2 * Math.PI * sec(l) / 1.5);
      glide(c, [[30, WATER_Y + 2.6, 34], [0, 15, 0]], [[28, WATER_Y + 2.6, 31], [0, 15, 0]], u, l, 40); }; },
  11: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled'); const top = quay(c);
    const off = new Card(1.8, .5); put(off.mesh, [13, top, 6]); c.scene.add(off.mesh);
    return (f, l, u) => { s.root.rotation.z = .12 * Math.sin(2 * Math.PI * sec(l + 60) / 1.5);
      off.draw(p => bodyFront(p, OFFICER, {mode: 'stand', expr: l < 6 ? 'stern' : 'shock', seed: 21}));
      cam(c, [13.2, top + 1.55, 8.4 - .02 * l], [13, top + 1.5, 6], 40 * (1 - .006 * Math.min(l, 25))); }; },
  12: c => { sky(c, 'day'); water(c); const s = ship(c, 'furled'); quay(c);
    const off = new Card(1.8, .5); off.mesh.position.set(-2.5, DECK_Y - WATER_Y, 8); s.root.add(off.mesh);
    const crew = deckSailors(s.root, 4, 4);
    crew.forEach((k, i) => k.mesh.position.set(1.6 + i * .5, DECK_Y - WATER_Y, 7 + i * .9));
    return (f, l, u) => { off.draw(p => bodyFront(p, OFFICER, {mode: 'stand', expr: 'stern', wave: 1, seed: 21}));
      crew.forEach((k, i) => { const x = lerp(4 + i * .6, .4 + i * .32, smooth(l / 10)); k.mesh.position.x = x;
        k.draw(p => bodyFront(p, SAILORS[i % 4], {mode: 'stand', expr: l > 10 ? 'dazed' : 'nervous', tilt: l > 10 ? (i % 2 ? 9 : -9) : 0, seed: i + 2})); });
      cam(c, [3.6, DECK_Y + 1.5, 17], [-.4, DECK_Y + 1.1, 7.6], 46 * (1 - .002 * l)); }; },
  13: c => { sky(c, 'day'); water(c); ship(c, 'furled'); const top = quay(c);
    const a = front(OFFICER, 21, {expr: 'nervous', look: -1}); put(a.mesh, [12.6, top, 2]);
    const b = front(OFFICIAL, 31, {expr: 'neutral', look: 1}); put(b.mesh, [13.6, top, 2.6]); c.scene.add(a.mesh, b.mesh);
    return (f, l, u) => { const n = l - (SHOTS.find(s => s.pic === 13)!.b - SHOTS.find(s => s.pic === 13)!.a - 7);
      a.draw(p => bodyFront(p, OFFICER, {mode: 'stand', expr: 'nervous', look: -1, seed: 21, lift: n > -14 ? 0 : 0}));
      const whip = Math.max(0, n) * 9;
      cam(c, [16.5, top + 1.5, 7.5], [13.1 - whip * .4, top + 1.35, 2.3 - whip * .2], 40 * (1 - .002 * l)); }; },
  14: c => { sky(c, 'afternoon', 1200); water(c); shore(c); const s = ship(c, 'furled');
    const rb = put(clone(c.L, 'rowboat'), [30, WATER_Y - .3, -30], .3); c.scene.add(rb);
    return (f, l, u) => { s.root.position.z = -sec(l) * 1.0; glide(c, [[-70, 40, -48], [60, 18, 40]], [[-70, 16, -48], [60, 18, 40]], u, 0, 44); }; },
  15: c => { sky(c, 'afternoon'); water(c); const s = ship(c, 'set');
    return (f, l, u) => { rig(s.v, 'set', lerp(.15, 1, smooth(l / 14))); glide(c, [[-52, 12, -4], [0, 18, -4]], [[-52, 12, -4], [0, 34, -4]], u, 0, 40); }; },
  16: c => { sky(c, 'afternoon'); water(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    const puff = new Card(6, .5, 300, 300, false); puff.mesh.position.set(-8.5, 8.6 - WATER_Y, -6.5); s.root.add(puff.mesh);
    return (f, l, u) => { puff.draw(p => fxPuff(p, Math.min(1, l / 18)));
      cam(c, [-13 + kick(l, .25), 10.8, -1.5], [-6.5, 10.4, -6.5], 44, 2 * kick(l)); }; },
  17: c => { sky(c, 'afternoon'); water(c); const s = ship(c, 'set');
    const k = new Card(1.75, .5); k.mesh.position.set(-4.4, DECK_Y - WATER_Y, 2); s.root.add(k.mesh);
    k.draw(p => bodyFront(p, SAILORS[0], {mode: 'stand', expr: 'relief', tilt: 7, seed: 3}));
    return (f, l, u) => { glide(c, [[-.5, DECK_Y + 1.6, 7.5], [-4.4, DECK_Y + 1.1, 2]], [[-1, DECK_Y + 1.6, 6.8], [-4.4, DECK_Y + 1.1, 2]], u, l, 42); }; },
  18: c => { sky(c, 'afternoon'); const w = water(c); ship(c, 'set');
    const band = new THREE.Mesh(new THREE.PlaneGeometry(14, 200), new THREE.MeshBasicMaterial({color: '#1f5c84'})); band.rotation.x = -Math.PI / 2; band.position.y = WATER_Y + .02; c.scene.add(band);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .1, 20), new THREE.MeshLambertMaterial({color: '#3a2a20'})); c.scene.add(hat);
    return (f, l, u) => { band.position.x = lerp(-90, -6, l / 22);
      const hu = Math.max(0, (l - 14) / 10); hat.position.set(-5.5 + 6 * hu, DECK_Y + 1.7 + 3 * hu, 0); hat.rotation.z = hu * 6;
      cam(c, [-38, WATER_Y + .7, 6], [0, WATER_Y + 7, 0], 44); void w; }; },
  19: c => { sky(c, 'afternoon'); water(c); shore(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    return (f, l, u) => { s.root.rotation.z = lerp(0, .52, smooth(u * 1.2));
      cam(c, [-95, 12, 0], [0, 15, 0], 40, 10 * s.root.rotation.z); }; },
  20: c => { sky(c, 'afternoon'); const s = ship(c, 'set'); openLids(s.v, 'all', .9);
    const gun = put(clone(c.L, 'cannon-24pdr'), [-2, GUNDECK_Y - WATER_Y, -3], Math.PI / 2); s.root.add(gun);
    const flood = new THREE.Mesh(new THREE.BoxGeometry(11, .1, 50), new THREE.MeshLambertMaterial({color: '#2f7fae', transparent: true, opacity: .85}));
    s.root.add(flood);
    return (f, l, u) => { s.root.rotation.z = .5; flood.position.set(-1, GUNDECK_Y - WATER_Y + lerp(0, .9, l / 40), 0); flood.scale.y = 1;
      gun.position.x = lerp(-2, -4.2, smooth(l / 14));
      const p = s.root.localToWorld(new THREE.Vector3(1.8, GUNDECK_Y - WATER_Y + 1.5, 8)), t = s.root.localToWorld(new THREE.Vector3(-2, GUNDECK_Y - WATER_Y + 1.2, -6));
      cam(c, [p.x + kick(l, .15), p.y, p.z], [t.x, t.y, t.z], 62, 28 + 3 * kick(l)); }; },
  21: c => { sky(c, 'afternoon', 700); water(c); shore(c); const s = ship(c, 'set');
    const boats = [0, 1].map(i => { const b = put(clone(c.L, 'rowboat'), [60 + i * 14, WATER_Y - .3, 30 - i * 20], -1.2); c.scene.add(b); return b; });
    return (f, l, u) => { s.root.rotation.z = lerp(.55, .95, u); s.root.position.y = WATER_Y - 46 * smooth(u * .9);
      boats.forEach((b, i) => { b.position.x = 60 + i * 14 - 22 * u; });
      cam(c, [-130, 95, 95], [0, 6, 0], 38); }; },
  22: c => { sky(c, 'afternoon'); water(c);
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
  27: c => { sky(c, 'afternoon'); water(c); const s = ship(c, 'set');
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
  32: c => { sky(c, 'morning61'); water(c); const s = ship(c, 'none');
    c.scene.add(put(clone(c.L, 'salvage-pontoon-crane'), [-14, WATER_Y - 2, 0]), put(clone(c.L, 'salvage-pontoon-crane'), [14, WATER_Y - 2, 0], Math.PI));
    return (f, l, u) => { s.root.position.y = WATER_Y - lerp(14, 5, smooth(u)); s.root.rotation.z = .05;
      glide(c, [[-58, WATER_Y + 3, -48], [0, WATER_Y + 6, 0]], [[-52, WATER_Y + 3.5, -42], [0, WATER_Y + 7, 0]], u, l, 40); }; },
  33: c => { museum(c); const s = ship(c, 'none'); s.root.position.y = WATER_Y + 1;
    VISITORS.concat(VISITORS).forEach((o, i) => { const k = front(o, 60 + i); put(k.mesh, [-14 - (i % 4) * 2.5, 0, 10 + i * 3]); c.scene.add(k.mesh); });
    return (f, l, u) => glide(c, [[-42, 3, 52], [0, 16, 0]], [[-42, 24, 52], [0, 18, 0]], u, 0, 42); },
  34: c => { sky(c, 'afternoon'); water(c); const s = ship(c, 'set'); openLids(s.v, 'lower', .9);
    return (f, l, u) => { s.root.rotation.z = lerp(.35, .5, u); cam(c, [-55, 10, -4], [0, 14, 0], 40, 6 + 2 * kick(l)); }; },
  35: c => { museum(c); const s = ship(c, 'none'); s.root.position.y = WATER_Y + 1;
    const crowd = Array.from({length: 10}, (_, i) => { const k = new Card(1.75, .35); c.scene.add(k.mesh); return k; });
    return (f, l, u) => { crowd.forEach((k, i) => { put(k.mesh, [-9 - (i % 3) * 1.6, 0, 60 - ((l * .12 + i * 3.1) % 30)]);
        k.draw(p => bodyFront(p, VISITORS[i % 4], {mode: 'stroll', phase: sec(l) * 1.8 + i * .3, expr: i % 3 ? 'grin' : 'neutral', seed: 70 + i})); });
      glide(c, [[-20, 2.2, 66], [0, 16, 33]], [[-15, 4, 56], [0, 19, 33]], u, l, 42); }; },
};

export const VasaAnimatic: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [lib, setLib] = useState<Lib | null>(null);
  const [handle] = useState(() => delayRender('glbs'));
  const st = useRef<{renderer?: THREE.WebGLRenderer; pic?: number; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; composer?: EffectComposer; upd?: Upd}>({});
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
      S.upd = B[shot.pic]({L: lib, scene, camera});
      const composer = new EffectComposer(S.renderer, {multisampling: 4});
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new InkPass(scene, camera));
      Object.assign(S, {pic: shot.pic, scene, camera, composer});
    }
    const local = frame - shot.a;
    S.upd!(frame, local, local / Math.max(1, shot.b - shot.a - 1));
    S.camera!.updateMatrixWorld();
    S.scene!.updateMatrixWorld(true);
    faceCards(S.scene!, S.camera!);
    S.composer!.render();
  }, [frame, width, height, lib]);

  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
