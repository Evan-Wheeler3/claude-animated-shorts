// coin-ridges animatic (GATE C): every picture of SHOTLIST.md blocked at final timing to the recorded narration
// (src/anchors.json + ../voice/words.json), in the approved GATE B look. Picture only; run_mac.sh muxes audio/mix.m4a.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {GradeEffect, GRADES} from '../../../../templates/bridge/grade';
import {bodyFront, INK, type Expr, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import {Card, faceCards, put} from './kit/cards';
import {skyDome} from './kit/look';
import {
  CLIPPER, CLIPPER_NOW, NEWTON, WITNESS, WORKER, HX, SILVER, backRoom, bench, cam, candleLight, clone, coinFace, foamDots, goldTooth,
  lam, loadLib, paint, paint2, plane, razorInHand, stubble, wigBack, wigTop, type Ctx, type Extra, type Id, type Lib,
} from './Looks';
import {FPS, SHOTS, TOTAL, kick, lerp, lerp3, shotAt, smooth, tw} from './story';

export const COIN_FRAMES = TOTAL;
const HY = 309;
const CHALONER: Outfit = {jacket: '#5b2a6e', pants: '#3a2a40', boots: '#1d1a1a', hat: 'tophat', buttons: '#e8c45a', moustache: '#2f2418', skin: '#ffe2c2'};
const JUDGE: Outfit = {jacket: '#7a1f24', pants: '#2b2b33', boots: '#1d1a1a', hat: 'hair', hair: '#ece7dc', buttons: '#e8c45a', build: 'stout'};
const SHOPPERS: Outfit[] = [
  {jacket: '#3f6fb5', pants: '#3b3f52', boots: '#4a3426', hat: 'tophat'}, {jacket: '#8c3b4a', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', dress: '#d9a441'},
  {jacket: '#5d7a3a', pants: '#3b3f52', boots: '#4a3426', hat: 'cap', cap: '#7a3b2e'}, {jacket: '#b5653f', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', dress: '#5a8fc2'},
];

type Upd = (f: number, l: number, u: number) => void;
type Build = (c: Ctx) => Upd;
const T = (line: string, i = 0) => Math.round(tw(line, i) * FPS);
const glide = (c: Ctx, A: number[][], B: number[][], u: number, fov = 40, roll = 0) => cam(c, lerp3(A[0], B[0], smooth(u)), lerp3(A[1], B[1], smooth(u)), fov, roll);

// ---------- dynamic character card (redrawn every frame) ----------
const actor = (h: number, res = .6) => { const k = new Card(h, res); return {k, draw: (o: Outfit, opts: Parameters<typeof bodyFront>[2], ex: Extra = {}) =>
  k.draw((p: Pen, g) => { ex.back?.(g); bodyFront(p, o, {mode: 'stand', ...opts}); ex.over?.(g); })}; };
/** flat 2D card (not a figure): size in metres, drawn in a dw x dh canvas */
const flat = (wM: number, hM: number, dw: number, dh: number, fn: (g: CanvasRenderingContext2D) => void) => {
  const k = new Card(hM, 1, dw, dh, false); k.draw((_p, g) => fn(g)); k.mesh.scale.set(wM, hM, 1); return k; };
/** cartoon hand: palm + 4 fingers + thumb, fingers pointing left. glove or skin. */
const handArt = (col: string) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 10; g.lineJoin = 'round'; g.lineCap = 'round';
  [[60, 0], [40, 38], [44, 76], [70, 112]].forEach(([x, y], i) => { g.beginPath(); g.roundRect(x - (i === 0 ? 10 : 0), 50 + y * .9, 150, 34, 17); g.fill(); g.stroke(); });
  g.beginPath(); g.roundRect(170, 40, 190, 150, 40); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(150, 6, 120, 38, 19); g.fill(); g.stroke();
};

/** one fingertip pointing down (nail toward camera), for coin ECUs */
const fingerArt = (col: string) => (g: CanvasRenderingContext2D) => {
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 9; g.lineJoin = 'round';
  g.beginPath(); g.roundRect(10, 10, 100, 400, 50); g.fill(); g.stroke();
  g.fillStyle = '#f7e0d0'; g.beginPath(); g.roundRect(30, 30, 60, 70, 28); g.fill(); g.lineWidth = 6; g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(30, 200); g.quadraticCurveTo(60, 212, 90, 200); g.stroke();
};
const handDown = (col: string) => (g: CanvasRenderingContext2D) => { g.save(); g.translate(200, 0); g.rotate(Math.PI / 2); handArt(col)(g); g.restore(); };
// ---------- sets ----------
const kitchen = (c: Ctx) => { c.grade = 'day'; c.scene.background = new THREE.Color('#cfe3f2');
  c.scene.add(put(clone(c.L, 'modern-table'), [0, 0, 0]));
  const back = plane(8, 3, '#f2dcb8'); back.position.set(0, 1.5, -1.6); c.scene.add(back);
  const fl = plane(8, 8, '#c8a27a'); fl.rotation.x = -Math.PI / 2; c.scene.add(fl);
  c.scene.add(new THREE.HemisphereLight('#ffffff', '#c8a87a', 1.25));
  const rim = new THREE.DirectionalLight('#ffffff', 2.0); rim.position.set(1.2, .8, -1); c.scene.add(rim);
  const sun = new THREE.DirectionalLight('#fff1d6', 3.6); sun.position.set(-1.5, 1.6, .6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -.6, right: .6, top: .6, bottom: -.6}); sun.target.position.set(0, .75, 0); c.scene.add(sun, sun.target);
  return .75; };
const quarter = (c: Ctx) => coinFace(paint2(clone(c.L, 'coin-modern-quarter'), SILVER), .0098, false);
const hammered = (c: Ctx) => coinFace(paint2(clone(c.L, 'coin-hammered'), SILVER), .0128, true);
const milled = (c: Ctx) => coinFace(paint2(clone(c.L, 'coin-milled'), SILVER), .0165, true);
const flatOn = (k: THREE.Object3D, p: number[]) => { k.rotation.x = -Math.PI / 2; k.position.set(p[0], p[1], p[2]); return k; };
const room = (c: Ctx) => { backRoom(c); const top = bench(c); c.scene.add(put(clone(c.L, 'candle'), [.45, top, -.75])); candleLight(c, [.45, top + .24, -.75], 3, 5); return top; };
const mint = (c: Ctx) => { c.grade = 'day'; c.scene.background = new THREE.Color('#2a2630');
  c.scene.add(clone(c.L, 'mint-interior'));
  c.scene.add(new THREE.HemisphereLight('#d8dcf0', '#5a4636', 1.1));
  const sh = new THREE.SpotLight('#fff0d0', 120, 20, .45, .6, 1.4); sh.position.set(-2.5, 4.2, -2); sh.target.position.set(0, 1, .6); sh.castShadow = true; sh.shadow.mapSize.set(2048, 2048); c.scene.add(sh, sh.target); };
const outdoor = (c: Ctx) => { c.grade = 'day'; skyDome(c.scene, 'day');
  c.scene.add(new THREE.HemisphereLight('#cfe0ff', '#7a6650', 1.3));
  const sun = new THREE.DirectionalLight('#ffd9a8', 3.0); sun.position.set(-90, 45, 70); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -60, right: 60, top: 60, bottom: -60, far: 300}); c.scene.add(sun); };
const fly = (o: THREE.Object3D) => { o.traverse(x => { (x as THREE.Mesh).castShadow = true; }); return o; };

// ---------- the 31 pictures ----------
const B: Record<number, Build> = {
  // 1 Frame 1: the quarter on its edge, ridges ticking past
  1: c => { c.near = .002; const top = kitchen(c); const q = quarter(c); q.position.set(0, top + .01215, 0); c.scene.add(q);
    return (f, l, u) => { q.rotation.y = 1.15 - .5 * u; c.dof = 10; cam(c, [.06, top + .018, .055], [0, top + .012, 0], 30 * (1 - .0012 * l), -4); }; },
  // 2 "thieves": a shifty gloved hand creeps in
  2: c => { c.near = .002; const top = kitchen(c); const q = quarter(c); q.position.set(0, top + .01215, 0); q.rotation.y = .7; c.scene.add(q);
    const h = flat(.07, .039, 360, 200, handArt('#2f3a2a')); h.mesh.userData.fixed = true; c.scene.add(h.mesh);
    return (f, l, u) => { h.mesh.position.set(lerp(.06, .03, smooth(u * 1.3)), top + .006, 0); h.mesh.userData.lookCam = 0;
      c.dof = 10; cam(c, [.06, top + .018, .055], [.006, top + .012, 0], 28, -4); }; },
  // 3 1690s: a gleaming hammered silver coin on the back-room bench, crane down
  3: c => { c.near = .005; const top = room(c); const k = flatOn(hammered(c), [.05, top + .001, -.35]); c.scene.add(k);
    const key = new THREE.DirectionalLight('#ffe2b0', 1.4); key.position.set(-.5, 1.2, .5); key.target.position.set(.05, top, -.35); c.scene.add(key, key.target);
    return (f, l, u) => { c.dof = 9; glide(c, [[.05, top + .2, -.18], [.05, top, -.35]], [[.05, top + .1, -.26], [.05, top, -.35]], u, 36); }; },
  // 4 "shave": the Clipper lathers the coin, foam piling up, razor strokes
  4: c => { const top = room(c); const coin = flatOn(hammered(c), [.05, top + .001, -.35]); c.scene.add(coin);
    const foam = new THREE.Group(); [[0, 0, 0, .03], [.03, .01, .01, .022], [-.028, .008, -.01, .024], [.01, .03, 0, .02], [-.01, .02, .02, .018]].forEach(([x, y, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshToonMaterial({color: '#ffffff', emissive: '#9a9a9a'})); s.position.set(x, y, z); foam.add(s); });
    foam.position.set(.05, top + .015, -.35); c.scene.add(foam);
    const brush = clone(c.L, 'shaving-brush'); c.scene.add(brush); c.scene.add(put(clone(c.L, 'shaving-mug'), [-.32, top, -.62]));
    const a = actor(1.72); put(a.k.mesh, [.05, 0, -1.05]); c.scene.add(a.k.mesh);
    return (f, l, u) => { foam.scale.setScalar(.2 + .8 * smooth(u * 1.5));
      brush.position.set(.05 + .04 * Math.sin(l * .9), top + .05 + .01 * Math.cos(l * .9), -.33); brush.rotation.z = .4 + .2 * Math.sin(l * .9);
      a.draw(CLIPPER, {expr: 'grin', seed: 7, look: -.6, wave: .6 + .4 * Math.sin(l * .5)}, {over: g => { stubble(g); goldTooth(g); foamDots(g, HX + 50, HY + 10, 16); razorInHand(g); }});
      c.dof = 9; glide(c, [[.35, 1.3, 1.55], [.02, 1.05, -.6]], [[.3, 1.25, 1.35], [.02, 1.05, -.6]], u, 44); }; },
  // 5 "Well…": freeze, foam on his nose, looks at camera (music stops)
  5: c => { room(c); const a = actor(1.72); put(a.k.mesh, [.05, 0, -1.05]); c.scene.add(a.k.mesh);
    a.draw(CLIPPER, {expr: 'neutral', seed: 7, look: 0, wave: 1}, {over: g => { stubble(g); foamDots(g, HX + 50, HY + 10, 16); razorInHand(g); }});
    return (f, l, u) => { c.dof = 12; cam(c, [.1, 1.5, .25], [.05, 1.5, -1.05], 40 * (1 - .003 * l)); }; },
  // 6 "not with shaving cream": razor lowers, he wipes the foam off
  6: c => { room(c); const a = actor(1.72); put(a.k.mesh, [.05, 0, -1.05]); c.scene.add(a.k.mesh);
    return (f, l, u) => { const w = lerp(1, -.4, smooth(u * 1.4));
      a.draw(CLIPPER, {expr: u > .6 ? 'nervous' : 'neutral', seed: 7, look: 0, wave: w > 0 ? w : undefined}, {over: g => { stubble(g); if (u < .6) foamDots(g, HX + 50, HY + 10, 16 * (1 - u)); if (w > .3) razorInHand(g); }});
      c.dof = 12; cam(c, [.1, 1.5, .3], [.05, 1.48, -1.05], 38); }; },
  // 7 shears snip a sliver off the edge (kick on the snip)
  7: c => { c.near = .005; const top = room(c);
    const k = hammered(c); k.rotation.y = .4; k.position.set(0, top + .016, -.35); c.scene.add(k);
    const sh = clone(c.L, 'clipping-shears'); sh.position.set(-.115, top + .03, -.35); sh.rotation.set(0, 0, -.12); c.scene.add(sh);
    const blade = sh.getObjectByName('blade_upper'); const sl = k.getObjectByName('sliver');
    const snip = T('L04', 1);
    return (f, l, u) => { if (blade) blade.rotation.y = f < snip - 6 ? .4 : f < snip ? .4 * (snip - f) / 6 : 0;
      if (sl) { const s = Math.max(0, (f - snip) / FPS); sl.position.y = -.5 * 9.8 * s * s * .02; sl.rotation.z = s * 4; }
      c.dof = 7; cam(c, [.05 + .003 * kick(f - snip), top + .05, -.13], [-.03, top + .018, -.35], 34); }; },
  // 8 snip snip snip: slivers rain into a pile (overhead, quick)
  8: c => { c.near = .005; const top = room(c);
    const coins = Array.from({length: 6}, (_, i) => { const k = flatOn(hammered(c), [-.07 + (i % 3) * .07, top + .001, -.42 + Math.floor(i / 3) * .07]); c.scene.add(k); return k; });
    const pile = Array.from({length: 40}, (_, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(.009, .0018, 6, 12, Math.PI * .7), lam('#e8edf4')); m.rotation.x = -Math.PI / 2; m.rotation.z = i * 2.3;
      m.position.set(.13 + .012 * Math.sin(i * 1.7), top + .002 + .0016 * Math.floor(i / 6), -.38 + .012 * Math.cos(i * 2.1)); c.scene.add(m); return m; });
    const sh = clone(c.L, 'clipping-shears'); sh.rotation.x = -Math.PI / 2; c.scene.add(sh);
    return (f, l, u) => { const n = Math.floor(l / 6); pile.forEach((m, i) => { m.visible = i < n * 4; });
      const k = coins[n % 6]; sh.position.set(k.position.x + .02, top + .02, k.position.z); coins.forEach((x, i) => { const sl = x.getObjectByName('sliver'); if (sl) sl.visible = i >= n; });
      c.dof = 6; cam(c, [.03, top + .36, -.36 + .0005], [.03, top, -.37], 40, 2 * kick(l % 6)); }; },
  // 9 the pile pours into the crucible and glows
  9: c => { const top = room(c); const cru = clone(c.L, 'crucible'); cru.position.set(-1.1, 0, .1); c.scene.add(cru);
    const glow = new THREE.PointLight('#ff7a2a', 0, 3.5, 1.6); glow.position.set(-1.1, .55, .1); c.scene.add(glow);
    const molten = new THREE.Mesh(new THREE.CircleGeometry(.1, 24), new THREE.MeshBasicMaterial({color: '#ffd27a', toneMapped: false})); molten.rotation.x = -Math.PI / 2; molten.position.set(-1.1, .52, .1); molten.layers.set(NOINK); c.scene.add(molten);
    void top;
    return (f, l, u) => { glow.intensity = 8 * smooth(u * 1.5); (molten.material as THREE.MeshBasicMaterial).color.set(u > .3 ? '#ffd27a' : '#c9ced6');
      c.dof = 8; glide(c, [[-.6, 1.0, .9], [-1.1, .5, .1]], [[-.75, .85, .7], [-1.1, .5, .1]], u, 40); }; },
  // 10 "free silver": the bar slides out; the Clipper grins, gold tooth
  10: c => { const top = room(c); const bar = paint2(clone(c.L, 'silver-ingot'), SILVER); c.scene.add(bar);
    const a = actor(1.72); put(a.k.mesh, [.1, 0, -1.0]); c.scene.add(a.k.mesh);
    a.draw(CLIPPER, {expr: 'laugh', seed: 7, look: -.3}, {over: g => { stubble(g); goldTooth(g); }});
    return (f, l, u) => { bar.position.set(lerp(-.3, .05, smooth(u * 2)), top, -.3); bar.rotation.y = .3;
      c.dof = 9; glide(c, [[.2, 1.25, 1.2], [.05, 1.05, -.5]], [[.15, 1.3, .8], [.08, 1.2, -.7]], u, 42); }; },
  // 11 "clipping… death": the grin drops as the judge's gavel slams in the foreground
  11: c => { backRoom(c); c.scene.add(put(clone(c.L, 'courtroom-bench'), [0, 0, 0]));
    const gav = c.scene.getObjectByName('gavel');
    const j = actor(1.8); put(j.k.mesh, [0, .5, -.7]); c.scene.add(j.k.mesh); j.draw(JUDGE, {expr: 'stern', seed: 41}, {back: wigBack, over: wigTop});
    const a = actor(1.72); put(a.k.mesh, [-.7, 0, 1.4]); c.scene.add(a.k.mesh);
    const hit = T('L05', 3);
    return (f, l, u) => { if (gav) gav.rotation.z = f < hit - 6 ? -.9 : f < hit ? -.9 * (hit - f) / 6 : 0;
      a.draw(CLIPPER, {expr: f < hit ? 'grin' : 'shock', seed: 7, look: .6}, {over: g => { stubble(g); }});
      c.dof = 4; cam(c, [.5 + .01 * kick(f - hit), 1.55, 3.8], [-.35, 1.35, .2], 46); }; },
  // 12 "put to death": gallows silhouette on a grey hill; the Clipper gulps (nothing graphic)
  12: c => { c.grade = 'day'; c.scene.background = new THREE.Color('#9aa3b0');
    const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), lam('#5d6a58')); hill.position.set(0, -27, -40); c.scene.add(hill);
    const gal = clone(c.L, 'gallows'); paint(gal, {wood: '#2a2430'}); gal.position.set(2, 2.6, -36); c.scene.add(gal);
    c.scene.add(new THREE.HemisphereLight('#c8d0dc', '#4a5048', 1.3));
    const g = plane(80, 80, '#6b7a62'); g.rotation.x = -Math.PI / 2; c.scene.add(g);
    const a = actor(1.72); put(a.k.mesh, [-.15, 0, 1.6]); c.scene.add(a.k.mesh);
    return (f, l, u) => { a.draw(CLIPPER, {expr: l > 18 ? 'nervous' : 'shock', seed: 7, look: .8}, {over: g2 => { stubble(g2); }});
      c.dof = 0; cam(c, [.2, 1.5, 4.4], [-.2, 1.9, -36], 40 * (1 - .002 * l)); }; },
  // 13 1662: two workers haul the press bar; the screw spins down
  13: c => { mint(c); const pr = clone(c.L, 'screw-press'); pr.position.set(0, 0, .6); pr.rotation.y = Math.PI; c.scene.add(pr);
    const bar = pr.getObjectByName('screw_bar');
    const w = WORKER.map((o, i) => { const k = actor(1.72); put(k.k.mesh, [i ? 1.15 : -1.15, 0, -.35]); c.scene.add(k.k.mesh); return {k, o}; });
    return (f, l, u) => { if (bar) bar.rotation.y = 2.4 * smooth(u);
      w.forEach(({k, o}, i) => k.draw(o, {expr: 'stern', seed: 30 + i, tilt: (i ? 8 : -8) * Math.sin(u * 6), wave: 1}));
      c.dof = 4; cam(c, [.3, 1.35, -5.6 + .8 * u], [0, 1.25, .4], 48, kick(l - 40) * 1.5); }; },
  // 14 a perfectly round new coin pops out; roll onto its edge: the pattern
  14: c => { c.near = .003; mint(c); const k = milled(c); c.scene.add(k);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .02, 32), lam('#6b6f78')); plate.position.set(0, 1, 0); c.scene.add(plate);
    return (f, l, u) => { const up = smooth(u * 3); k.position.set(0, 1.01 + .02 + .03 * up, 0); k.rotation.set(-Math.PI / 2 * (1 - smooth(u * 1.6 - .4)), .5 * u, 0);
      c.dof = 8; cam(c, [.07, 1.06, .08], [0, 1.045, 0], 34); }; },
  // 15 side by side: lumpy hammered coin vs crisp machine coin
  15: c => { c.near = .003; const top = room(c);
    const a = hammered(c), b2 = milled(c); [a, b2].forEach((k, i) => { const r = new THREE.Box3().setFromObject(k).getSize(new THREE.Vector3()).y / 2; k.position.set(i ? .025 : -.025, top + r, -.35); k.rotation.y = .3; c.scene.add(k); });
    return (f, l, u) => { c.dof = 5; glide(c, [[-.02, top + .035, -.17], [0, top + .018, -.35]], [[.02, top + .035, -.17], [0, top + .018, -.35]], u, 32); }; },
  // 16 the Clipper snips the new coin: the edge pattern shows the bite
  16: c => { c.near = .005; const top = room(c);
    const k = milled(c); k.rotation.y = .4; k.position.set(0, top + .0195, -.35); c.scene.add(k);
    const sh = clone(c.L, 'clipping-shears'); sh.position.set(-.12, top + .036, -.35); sh.rotation.set(0, 0, -.12); c.scene.add(sh);
    const blade = sh.getObjectByName('blade_upper'), bite = k.getObjectByName('bite'); const snip = T('L07', 2);
    const eye = actor(1.75); put(eye.k.mesh, [.35, top - 1.2, -1.2]); c.scene.add(eye.k.mesh);
    return (f, l, u) => { if (blade) blade.rotation.y = f < snip - 6 ? .4 : f < snip ? .4 * (snip - f) / 6 : 0;
      if (bite) { const s = Math.max(0, (f - snip) / FPS); bite.position.y = -.1 * s * s; }
      eye.draw(WITNESS, {expr: f > snip + 12 ? 'stern' : 'neutral', seed: 51, look: -1});
      c.dof = 7; cam(c, [.05, top + .055, -.13], [-.03, top + .02, -.35], 34); }; },
  // 17 "old coins were everywhere": a busy market stall
  17: c => { outdoor(c); const g = plane(200, 200, '#9a8a6a'); g.rotation.x = -Math.PI / 2; c.scene.add(g);
    [[-3, 0], [0, -1], [3.2, 0]].forEach(([x, z], i) => c.scene.add(fly(put(clone(c.L, 'market-stall'), [x, 0, z], i * .2 - .2))));
    for (let i = 0; i < 12; i++) { const k = flatOn(hammered(c), [-.25 + (i % 6) * .1, 1.02, .55 + Math.floor(i / 6) * .1]); k.scale.setScalar(3); c.scene.add(k); }
    const ppl = SHOPPERS.map((o, i) => { const k = actor(1.7, .45); put(k.k.mesh, [-3.5 + i * 2.2, 0, 2 + (i % 2) * .6]); c.scene.add(k.k.mesh); return {k, o}; });
    return (f, l, u) => { ppl.forEach(({k, o}, i) => k.draw(o, {mode: 'stroll', phase: l / 30 * 1.6 + i * .3, expr: i % 2 ? 'grin' : 'neutral', seed: 60 + i}));
      ppl.forEach(({k}, i) => { k.k.mesh.position.x = -3.5 + i * 2.2 + (i % 2 ? -1 : 1) * .02 * l; });
      c.dof = 0; glide(c, [[0, 2.2, 8], [0, 1.2, 0]], [[1, 2.0, 7], [0, 1.2, 0]], u, 46); }; },
  // 18 1696: a river of old coins into the furnace, new coins out of the chute
  18: c => { mint(c); const fu = clone(c.L, 'mint-furnace'); fu.position.set(0, 0, .8); fu.rotation.y = Math.PI; c.scene.add(fu);
    const glow = new THREE.PointLight('#ff8a3a', 10, 6, 1.6); glow.position.set(0, 1.2, -.3); c.scene.add(glow);
    const inC = Array.from({length: 24}, () => { const k = hammered(c); k.scale.setScalar(6); c.scene.add(k); return k; });
    const outC = Array.from({length: 16}, () => { const k = milled(c); k.scale.setScalar(6); c.scene.add(k); return k; });
    return (f, l, u) => { inC.forEach((k, i) => { const t = ((l / 30) * .5 + i / 24) % 1; k.position.set(lerp(-2.6, -.3, t), 1.8 - 1.2 * t * t + .4, -.2 - .1 * Math.sin(i)); k.rotation.set(t * 9 + i, i, 0); });
      outC.forEach((k, i) => { const t = ((l / 30) * .5 + i / 16) % 1; k.position.set(lerp(.5, 2.4, t), .9 - .7 * t, -.4); k.rotation.set(t * 7, i, 0); });
      c.dof = 3; glide(c, [[0, 1.6, -5.2], [0, 1.2, .5]], [[.6, 1.5, -4.6], [0, 1.2, .5]], u, 50); }; },
  // 19 the Tower of London, home of the Mint: crane up
  19: c => { outdoor(c); c.scene.fog = new THREE.Fog('#b8d0ec', 200, 900);
    c.scene.add(put(clone(c.L, 'tower-mint-exterior'), [0, 0, 0]));
    const g = plane(800, 400, '#7f9a5a'); g.rotation.x = -Math.PI / 2; g.position.z = -175; c.scene.add(g);
    const river = plane(800, 120, '#4f86b8'); river.rotation.x = -Math.PI / 2; river.position.set(0, -1.6, 100); c.scene.add(river);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(800, 3, 4), lam('#a89a86')); quay.position.set(0, -.6, 40); c.scene.add(quay);
    const bank = plane(800, 14, '#9a8a6a'); bank.rotation.x = -Math.PI / 2; bank.position.set(0, .03, 32); c.scene.add(bank);
    return (f, l, u) => { c.dof = 0; glide(c, [[-62, 6, 176], [0, 10, 0]], [[-62, 22, 176], [0, 14, 0]], u, 40); }; },
  // 20 Isaac Newton steps into frame: low angle push (mint interior)
  20: c => { mint(c); const pr = clone(c.L, 'screw-press'); pr.position.set(1.8, 0, 1.4); pr.rotation.y = Math.PI; c.scene.add(pr);
    const n = actor(1.74); c.scene.add(n.k.mesh); n.draw(NEWTON, {expr: 'stern', seed: 12}, {back: wigBack, over: wigTop});
    const reveal = T('L09', 7);
    return (f, l, u) => { n.k.mesh.position.set(lerp(-1.6, 0, smooth((f - reveal + 18) / 16)), 0, -.5);
      c.dof = 6; cam(c, [0, .9, -3.6 + .5 * u], [0, 1.45, -.5], 42); }; },
  // 21 "the gravity guy": an apple bonks his head; deadpan
  21: c => { mint(c); const n = actor(1.74); put(n.k.mesh, [0, 0, -.5]); c.scene.add(n.k.mesh);
    const ap = clone(c.L, 'apple'); c.scene.add(ap); const hit = T('L10', 2);
    return (f, l, u) => { const s = (f - hit) / FPS; const y = s < 0 ? 1.82 + 4.9 * s * s : 1.82 + 1.2 * s - 4.9 * s * s;
      ap.position.set(s < 0 ? 0 : .6 * s, Math.max(.05, y), -.45); ap.rotation.z = Math.max(0, s) * 5;
      n.draw(NEWTON, {expr: f > hit && f < hit + 5 ? 'dazed' : 'stern', seed: 12}, {back: wigBack, over: wigTop});
      c.dof = 9; cam(c, [0, 1.6, -2.1], [0, 1.55, -.5], 40 * (1 - .001 * l), kick(f - hit) * 2); }; },
  // 22 William Chaloner: fancy coat, fake smile, flipping a coin
  22: c => { const top = room(c); void top; const ch = actor(1.76); put(ch.k.mesh, [0, 0, -.9]); c.scene.add(ch.k.mesh);
    const k = milled(c); c.scene.add(k);
    return (f, l, u) => { const t = (l % 24) / 24; k.position.set(.42, 1.1 + .5 * 4 * t * (1 - t), -.75); k.rotation.x = t * Math.PI * 4;
      ch.draw(CHALONER, {expr: 'grin', seed: 61, look: .4, wave: .2}, {});
      c.dof = 9; glide(c, [[.2, 1.4, 1.6], [.1, 1.3, -.9]], [[.15, 1.45, 1.2], [.1, 1.35, -.9]], u, 42); }; },
  // 23 ECU: Chaloner's file carving a fake edge pattern onto a blank
  23: c => { c.near = .005; const top = room(c); const k = milled(c); k.rotation.y = .4; k.position.set(0, top + .0195, -.35); c.scene.add(k);
    const file = new THREE.Mesh(new THREE.BoxGeometry(.12, .006, .012), lam('#6b6f78')); c.scene.add(file);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .06, 12), lam('#7a4a2a')); handle.rotation.z = Math.PI / 2; c.scene.add(handle);
    return (f, l, u) => { const x = .03 * Math.sin(l * .5); file.position.set(x, top + .04, -.35); file.rotation.z = .2; handle.position.set(x + .085, top + .052, -.35);
      c.dof = 8; cam(c, [.06, top + .04, -.26], [0, top + .025, -.35], 32, kick(l % 8) * .5); }; },
  // 24 Newton and Chaloner on either side of a table: eyes narrow
  24: c => { backRoom(c); c.scene.add(clone(c.L, 'interrogation-table')); c.scene.add(put(clone(c.L, 'candle'), [.1, .75, 0])); candleLight(c, [.1, .99, 0], 7, 6);
    const n = actor(1.74), ch = actor(1.76); put(n.k.mesh, [-.6, 0, -1.0]); put(ch.k.mesh, [-.6, 0, 1.0]); c.scene.add(n.k.mesh, ch.k.mesh);
    n.draw(NEWTON, {expr: 'stern', seed: 12, look: 1}, {back: wigBack, over: wigTop}); ch.draw(CHALONER, {expr: 'grin', seed: 61, look: -1});
    return (f, l, u) => { c.dof = 8; glide(c, [[4.6, 1.5, .05], [0, 1.25, 0]], [[4.2, 1.5, .05], [0, 1.3, 0]], u, 44); }; },
  // 25 Newton questions a nervous witness by candlelight (approved look still 6)
  25: c => { backRoom(c); c.scene.background = new THREE.Color('#141016'); c.scene.add(clone(c.L, 'interrogation-table'));
    c.scene.add(put(clone(c.L, 'candle'), [.1, .75, 0])); candleLight(c, [.1, .99, 0], 7, 6);
    const n = actor(1.74), w = actor(1.7); put(n.k.mesh, [-.6, 0, -1.0]); put(w.k.mesh, [-.6, 0, 1.0]); c.scene.add(n.k.mesh, w.k.mesh);
    return (f, l, u) => { n.draw(NEWTON, {expr: 'stern', seed: 12, look: .8, headTilt: 4 * Math.sin(l * .2)}, {back: wigBack, over: wigTop});
      w.draw(WITNESS, {expr: l % 40 < 20 ? 'nervous' : 'shock', seed: 23, look: -.8});
      c.dof = 9; glide(c, [[4.4, 1.55, .05], [0, 1.2, 0]], [[3.8, 1.5, .05], [0, 1.25, 0]], u, 44); }; },
  // 26 "hanged": Chaloner's shadow on the wall, a noose shadow slides in, cut away (nothing graphic)
  26: c => { backRoom(c); c.scene.add(put(clone(c.L, 'candle'), [0, .9, 1.2])); candleLight(c, [0, 1.14, 1.2], 5, 6);
    const sil = new Card(1.76, .5); sil.draw((p, g) => { bodyFront(p, CHALONER, {mode: 'stand', expr: 'shock', seed: 61}); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#141016'; g.fillRect(0, 0, 600, 1000); g.globalCompositeOperation = 'source-over'; });
    sil.mesh.userData.fixed = true; (sil.mesh.material as THREE.MeshBasicMaterial).transparent = true; (sil.mesh.material as THREE.MeshBasicMaterial).opacity = .75;
    put(sil.mesh, [0, .3, -1.5]); c.scene.add(sil.mesh);
    const noose = flat(.5, .9, 200, 360, g => { g.strokeStyle = '#141016'; g.lineWidth = 16; g.beginPath(); g.moveTo(100, 0); g.lineTo(100, 220); g.stroke(); g.beginPath(); g.ellipse(100, 280, 46, 64, 0, 0, 7); g.stroke(); });
    noose.mesh.userData.fixed = true; c.scene.add(noose.mesh);
    return (f, l, u) => { noose.mesh.position.set(.05, lerp(3.4, 2.3, smooth(u * 1.6)), -1.49);
      c.dof = 6; cam(c, [0, 1.6, 1.6], [0, 1.6, -1.5], 44 * (1 - .002 * l)); }; },
  // 27 today: a modern coin drops onto the kitchen table, rings, settles
  27: c => { c.near = .003; const top = kitchen(c); const q = quarter(c); c.scene.add(q);
    return (f, l, u) => { const s = l / FPS, drop = .25; const t1 = Math.sqrt(2 * drop / 9.8);
      if (s < t1) { q.position.set(0, top + .01215 + drop - 4.9 * s * s, 0); q.rotation.set(.2, s * 6, 0); }
      else { const w = s - t1, a = Math.PI / 2 * (1 - Math.exp(-2.5 * w)); q.position.set(0, top + .00088 + .0114 * Math.cos(a), 0); q.rotation.set(a + .15 * Math.exp(-3 * w) * Math.sin(w * 30), .6, 0); }
      c.dof = 8; cam(c, [.06, top + .035, .075], [0, top + .006, 0], 32); }; },
  // 28 a blind reader's fingertip finds a coin by its ridges, smiles
  28: c => { c.near = .002; const top = kitchen(c); const q = quarter(c); q.position.set(0, top + .01215, 0); q.rotation.y = .7; c.scene.add(q);
    const h = flat(.017, .052, 120, 360, fingerArt('#f5c9a0')); h.mesh.userData.fixed = true; c.scene.add(h.mesh);
    return (f, l, u) => { const a = -.5 + .5 * Math.sin(l * .2); h.mesh.position.set(.0125 * Math.sin(a), top + .0085 + .0125 * Math.cos(a), .002); h.mesh.userData.lookCam = -a;
      c.dof = 10; cam(c, [.05, top + .03, .08], [.004, top + .016, 0], 34); }; },
  // 29 a modern hand thumbs the ridges (callback to frame 1)
  29: c => { c.near = .002; const top = kitchen(c); const q = quarter(c); q.position.set(0, top + .01215, 0); c.scene.add(q);
    const h = flat(.017, .052, 120, 360, fingerArt('#ecd0b6')); h.mesh.userData.fixed = true; c.scene.add(h.mesh);
    return (f, l, u) => { q.rotation.y = .9 + .4 * u; const a = lerp(-.6, .5, u); h.mesh.position.set(.0125 * Math.sin(a), top + .0085 + .0125 * Math.cos(a), .002); h.mesh.userData.lookCam = -a;
      c.dof = 10; cam(c, [.06, top + .028, .07], [.002, top + .015, 0], 34, -4); }; },
  // 30 callback gag: the Clipper today, in a hoodie, lathers a modern coin, shrugs, wipes the foam
  30: c => { const top = kitchen(c); const q = quarter(c); flatOn(q, [.05, top + .001, .1]); c.scene.add(q);
    c.scene.add(put(clone(c.L, 'shaving-mug'), [-.3, top, -.1]));
    const a = actor(1.72); put(a.k.mesh, [0, 0, -.6]); c.scene.add(a.k.mesh);
    return (f, l, u) => { a.draw(CLIPPER_NOW, {expr: u < .5 ? 'grin' : 'dazed', seed: 7, look: .2, tilt: u < .5 ? 0 : -6, wave: u < .5 ? 1 : undefined},
        {over: g => { stubble(g); foamDots(g, HX - 40, HY + 40, 18 * (u < .7 ? 1 : 1 - (u - .7) * 3)); if (u < .5) razorInHand(g); }});
      c.dof = 10; glide(c, [[.2, 1.3, 2.2], [0, 1.05, -.2]], [[.15, 1.32, 1.9], [0, 1.1, -.3]], u, 40); }; },
  // 31 final: the quarter spins and lands ridge-up, facing the lens; ends on the last word
  31: c => { c.near = .002; const top = kitchen(c); const q = quarter(c); q.position.set(0, top + .01215, 0); c.scene.add(q);
    return (f, l, u) => { const spin = 14 * (1 - smooth(u * 1.25)); q.rotation.y = .9 + spin;
      c.dof = 10; cam(c, [.05, top + .016, .06], [0, top + .012, 0], 30 * (1 - .15 * smooth(u)), -4 * (1 - u)); }; },
};

export const CoinAnimatic: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [lib, setLib] = useState<Lib | null>(null);
  const [handle] = useState(() => delayRender('glbs'));
  const st = useRef<{renderer?: THREE.WebGLRenderer; pic?: number; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; composer?: EffectComposer; upd?: Upd; ctx?: Ctx; lens?: LensBlur; grade?: GradeEffect}>({});
  useLayoutEffect(() => { loadLib().then(l => { setLib(l); continueRender(handle); }).catch(e => { console.error(e); continueRender(handle); }); }, [handle]);
  useLayoutEffect(() => () => { st.current.composer?.dispose(); st.current.renderer?.dispose(); }, []);
  useLayoutEffect(() => {
    if (!lib) return;
    const S = st.current;
    if (!S.renderer) {
      S.renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
      S.renderer.setSize(width, height, false); S.renderer.shadowMap.enabled = true; S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    const shot = shotAt(frame);
    if (S.pic !== shot.pic) {
      S.composer?.dispose(); S.lens?.dispose();
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, width / height, .05, 3000);
      camera.layers.enable(NOINK);
      const ctx: Ctx = {L: lib, scene, camera, look: [0, 0, 0], grade: 'day'};
      S.upd = B[shot.pic](ctx);
      const composer = new EffectComposer(S.renderer, {multisampling: 4, frameBufferType: THREE.HalfFloatType});
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new InkPass(scene, camera, {distFar: 120}));
      const lens = new LensBlur({maxCoC: 24, nearScale: 1.2});
      composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main));
      composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), new GradeEffect(GRADES[ctx.grade], .85)));
      Object.assign(S, {pic: shot.pic, scene, camera, composer, ctx, lens});
    }
    const local = frame - shot.a;
    S.upd!(frame, local, local / Math.max(1, shot.b - shot.a - 1));
    const C = S.ctx!;
    S.lens!.focus = S.camera!.position.distanceTo(new THREE.Vector3(...C.look));
    S.lens!.cInf = C.dof ?? 0;
    S.camera!.updateMatrixWorld(); S.scene!.updateMatrixWorld(true);
    faceCards(S.scene!, S.camera!);
    S.scene!.traverse(o => { if (o.userData.lookCam !== undefined) { o.lookAt(S.camera!.position); o.rotateZ(o.userData.lookCam); } });   // flat hands face the lens after the camera moved
    S.composer!.render();
  }, [frame, width, height, lib]);
  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
export {SHOTS};
