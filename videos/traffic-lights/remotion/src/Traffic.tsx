// Why traffic lights are red, yellow and green (script v3, owner-approved 2026-11-26). 14 shots on the voice-B narration,
// look v2 kit, read-along captions. Built by ANIMATION-PLAYBOOK.md: every shot acts its line, nothing clips, beats on words.
// Picture only; run_mac.sh muxes audio/mix.m4a.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import type {EffectComposer} from 'postprocessing';
import {NOINK} from '../../../../templates/bridge/ink';
import {bodyFront, fxBurst, INK, shade, type Costume, type Kit, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import type {LensBlur} from '../../../../templates/bridge/lensblur';
import {Card, faceCards} from './kit/cards';
import {dress} from './kit/costume';
import {CAPTION_BOTTOM, captionActive, captionCss, captionWord, lightRig, loadCaptionFont, makePost, place, refStyle} from './kit/world';
import {flame, onCard, reach, SIT_H, smoke, toCard, type P} from './kit/acting';
import {FPS, SHOTS, TOTAL, kick, lerp, lerp3, shotAt, smooth} from './story';
const SHOT_A = (pic: number) => SHOTS.find(s => s.pic === pic)!.a;
import {tw} from './story';
import words from '../../voice/words.json';

export const TRAFFIC_FRAMES = TOTAL;
loadCaptionFont(staticFile('fonts/LilitaOne.woff2'));
type Word = {word: string; line: string; start: number; end: number};
const W = words as Word[];
/** frame of word i of a line (beats are always tied to words, never to frame numbers) */
const T = (line: string, i = 0) => Math.round(tw(line, i) * FPS);

const IDS = ['medieval-village-megakit/floor-unevenbrick', 'medieval-village-megakit/wall-unevenbrick-straight', 'medieval-village-megakit/wall-plaster-window-wide-round',
  'medieval-village-megakit/wall-plaster-straight', 'fantasy-props-megakit/barrel', 'fantasy-props-megakit/crate-wooden'];
type Lib = Record<string, THREE.Group>;

// ---------- cast ----------
const OFFICER = refStyle({jacket: '#1f2a4a', pants: '#1a1f30', boots: '#111111', hat: 'hair', hair: '#3a2a1a', buttons: '#d9dde0'});
type P2 = [number, number];
const rotAt = (pts: P2[], a: number, cx: number, cy: number): P2[] => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const ell = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, n = 40): P2[] =>
  Array.from({length: n + 1}, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });
/** Victorian police (custodian) helmet: tall dome, rim, silver star badge. tilt (rad) knocks it crooked. */
const drawHelmet = (p: Pen, cx: number, base: number, Ha: number, u: number, light: number, thick: number, ow: number, tilt = 0) => {
  const col = '#1b2238', h = 1.25 * Ha, w = .92 * Ha;
  const dome: P2[] = [...ell(cx, base, w, h, 180, 360), [cx + w, base + 4 * u], [cx - w, base + 4 * u]];
  const rim: P2[] = [...ell(cx, base + 3 * u, w * 1.16, 9 * u, 0, 360)];
  const R = (q: P2[]) => rotAt(q, tilt, cx, base);
  p.shadedFill(R(rim), shade(col, .9), shade(col, .55), light, w, .4); p.inkRing(R(rim), ow * .8, thick);
  p.shadedFill(R(dome), col, shade(col, .55), light, w, .4); p.inkRing(R(dome), ow * .85, thick);
  const knob = R(ell(cx, base - h - 3 * u, 7 * u, 6 * u)); p.poly(knob, '#c9ccd2', 1.6 * u);
  const [bx, by] = R([[cx, base - .45 * h]])[0];
  const star: P2[] = Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 6 : 13) * u; return [bx + r * Math.cos(a), by + r * Math.sin(a)]; });
  p.poly(star, '#d9dde0', 1.4 * u);
  p.arc(cx - .3 * w, base - .6 * h, .4 * w, .35 * h, 200, 255, 2.2 * u, 'rgba(255,255,255,.45)');
};
const helmet = (tilt = 0, on = true): Costume => ({head: k => { if (on) drawHelmet(k.p, 300, k.crown + .5 * k.Hb, k.Ha, k.u, k.light, k.thick, k.ow, tilt); }});
/** soot after the blast: grey smudges on the face, frazzled hair spikes, smoke curls off the head */
const soot = (t: number, on: number): Costume => ({head: k => { if (on <= 0) return; const u = k.u;
  for (const [dx, dy, rx, ry] of [[-.35, .1, .3, .2], [.3, .25, .28, .18], [0, .5, .22, .14], [-.1, -.2, .2, .12], [.42, -.1, .16, .12]] as const)
    k.p.poly(ell(300 + dx * k.Ha, k.hc + dy * k.Hb, rx * k.Ha, ry * k.Hb), `rgba(40,36,34,${.55 * on})`, 0);
  for (let i = 0; i < 2; i++) { const q = (t * .7 + i * .5) % 1, x = 300 + (i ? 30 : -25) * u;
    k.p.stroke(Array.from({length: 7}, (_, j) => [x + 6 * u * Math.sin(j * 1.3 + t * 5 + i), k.crown - 10 * u - (j * 9 + q * 40) * u] as P2), 3.2 * u, `rgba(90,90,90,${.7 * on * (1 - q)})`); } }});
const frazzle = (on: number): Costume => ({behindHead: k => { if (on <= 0) return; const u = k.u;
  for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + .84 * i / 8), r0 = 1.0, r1 = 1.28 + .08 * (i % 2);
    k.p.stroke([[300 + r0 * k.Ha * Math.cos(a), k.hc + r0 * k.Hb * Math.sin(a)], [300 + r1 * k.Ha * Math.cos(a), k.hc + r1 * k.Hb * Math.sin(a)]], 5 * u, '#3a2a1a'); } }});
const actor = (h = 1.75) => { const k = new Card(h, .8); return {k, draw: (o: Outfit, opts: Parameters<typeof bodyFront>[2]) => k.draw((p: Pen) => bodyFront(p, o, {mode: 'stand', ...opts}))}; };

// ---------- props built in code ----------
const std = (c: string, rough = .7, metal = 0) => new THREE.MeshStandardMaterial({color: c, roughness: rough, metalness: metal});
const shadows = <O extends THREE.Object3D>(o: O) => { o.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return o; };
/** J. P. Knight's 1868 signal: cast-iron pole, two semaphore arms (horizontal = stop), a gas lantern with red and green glass
 *  on top, a gas pipe up the pole and a hand lever at the base. Origin at the pole's foot. */
const gasSignal = () => {
  const g = new THREE.Group(), iron = std('#2c3a33', .5, .4), brass = std('#b8913f', .35, .7);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), std('#6b6560', .9)); plinth.position.y = .25;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 4.0, 16), iron); pole.position.y = 2.4;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 3.7, 8), brass); pipe.position.set(.1, 2.35, .02);
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(.14, .1, .14, 16), iron); capital.position.y = 3.62;
  g.add(plinth, pole, pipe, capital);
  const arm = (side: number) => { const piv = new THREE.Group(); piv.position.set(side * .08, 3.45, .06);
    const a = new THREE.Mesh(new THREE.BoxGeometry(.95, .13, .03), std('#c0352f', .6)); a.position.x = side * .5;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.1, .135, .032), std('#f2efe6', .6)); stripe.position.x = side * .78;
    piv.add(a, stripe); g.add(piv); return piv; };
  const armL = arm(-1), armR = arm(1);
  const lamp = new THREE.Group(); lamp.position.y = 3.9; g.add(lamp);
  const box = new THREE.Mesh(new THREE.BoxGeometry(.34, .4, .34), iron);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.28, .2, 4), iron); roof.position.y = .3; roof.rotation.y = Math.PI / 4;
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .14, 8), iron); chimney.position.y = .45;
  const lens = (col: string, x: number) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.1, 24), new THREE.MeshStandardMaterial({color: col, emissive: col, emissiveIntensity: 0, roughness: .2}));
    m.position.set(x, 0, .172); lamp.add(m); return m.material as THREE.MeshStandardMaterial; };
  lamp.add(box, roof, chimney); const red = lens('#ff3a2a', -.075), green = lens('#3aff6a', .075);
  const lever = new THREE.Group(); lever.position.set(.1, .9, .12); const h = new THREE.Mesh(new THREE.BoxGeometry(.04, .45, .04), brass); h.position.y = .2;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), std('#1a1a1a', .5)); knob.position.y = .43; lever.add(h, knob); g.add(lever);
  shadows(g);
  return {g, armL, armR, lamp, red, green, lever, setArms: (stop: number) => { armL.rotation.z = .7 * (1 - stop); armR.rotation.z = -.7 * (1 - stop); }};   // stop = level, go = both dropped 40 deg
};
/** pieces of a burst lantern: tumbling chunks with gravity, resting where they land */
const debris = (scene: THREE.Scene, n = 12) => Array.from({length: n}, (_, i) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(.06 + .04 * (i % 3), .05, .03 + .03 * (i % 2)), i % 4 === 0 ? std('#ff5a3a', .3) : i % 4 === 1 ? std('#4aff7a', .3) : std('#2c3a33', .5, .4));
  m.castShadow = true; m.visible = false; scene.add(m);
  const v = [Math.sin(i * 2.4) * 2.2, 2.5 + 2 * Math.abs(Math.cos(i * 1.7)), .8 + 1.4 * Math.abs(Math.sin(i * 3.1))];
  return (p: number[], e: number) => { m.visible = e >= 0; if (e < 0) return; const y = p[1] + v[1] * e - 4.9 * e * e, land = y <= .03;
    const te = land ? (v[1] + Math.sqrt(v[1] * v[1] + 2 * 9.8 * (p[1] - .03))) / 9.8 : e;
    m.position.set(p[0] + v[0] * te, land ? .03 : y, p[2] + v[2] * te); m.rotation.set(te * 9 + i, te * 7, te * 5); };
});

/** a chunky low-poly horse in code (no CC0 horse in the library). Faces +z. trot(phase 0..1, speed 0..1), rear(0..1) */
const horse = (col = '#7a4a2a') => {
  const g = new THREE.Group(), coat = std(col, .8), dark = std('#2a1a12', .8), body = new THREE.Group(); g.add(body);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.55, .62, 1.45), coat); torso.position.y = 1.28;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(.3, .75, .34), coat); neck.position.set(0, 1.72, .72); neck.rotation.x = .55;
  const head = new THREE.Mesh(new THREE.BoxGeometry(.26, .28, .6), coat); head.position.set(0, 2.02, 1.05); head.rotation.x = .35;
  const mane = new THREE.Mesh(new THREE.BoxGeometry(.08, .7, .2), dark); mane.position.set(0, 1.82, .56); mane.rotation.x = .55;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.1, .6, .12), dark); tail.position.set(0, 1.12, -.8); tail.rotation.x = -.35;
  body.add(torso, neck, head, mane, tail);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.05, .14, 4), coat); ear.position.set(s * .08, 2.24, .9); body.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), std('#111', .3)); eye.position.set(s * .135, 2.08, 1.12); body.add(eye); }
  const legs = [[-.18, .55], [.18, .55], [-.18, -.55], [.18, -.55]].map(([x, z], i) => { const piv = new THREE.Group(); piv.position.set(x, 1.05, z);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.13, 1.0, .14), coat); leg.position.y = -.5; const hoof = new THREE.Mesh(new THREE.BoxGeometry(.15, .1, .17), dark); hoof.position.y = -.98;
    piv.add(leg, hoof); body.add(piv); return {piv, ph: i === 0 || i === 3 ? 0 : .5}; });
  shadows(g);
  return {g, pose: (phase: number, speed: number, rear = 0) => { legs.forEach(L => { L.piv.rotation.x = .5 * speed * Math.sin(2 * Math.PI * (phase + L.ph)); });
    body.position.y = .04 * speed * Math.abs(Math.sin(2 * Math.PI * phase)) + .25 * rear; body.rotation.x = -.55 * rear;
    if (rear > 0) { legs[0].piv.rotation.x = -1.1 * rear; legs[1].piv.rotation.x = -1.3 * rear; } }};
};
/** a carriage built in code, facing +z, front edge at z = 0: body, bench, spoked wheels (roll(dist) turns them), shafts */
const carriage = (body = '#6b3a24') => { const g = new THREE.Group(), wood = std(body, .7), dark = std('#2a1a12', .7), wheels: THREE.Group[] = [];
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, .55, 2.1), wood); box.position.set(0, 1.0, -1.35);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.3, .08, 2.15), std('#c9a24a', .4, .6)); trim.position.set(0, 1.3, -1.35);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, .12, .45), dark); bench.position.set(0, 1.45, -.55);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, .4, .08), dark); back.position.set(0, 1.62, -.78);
  g.add(box, trim, bench, back);
  for (const [z, r] of [[-.75, .42], [-2.0, .52]] as const) for (const x of [-.7, .7]) { const w = new THREE.Group(); w.position.set(x, r, z); w.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .04, 6, 24), dark); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.03, r * 2, .03), std('#b8913f', .5)); sp.rotation.x = i * Math.PI / 6; w.add(sp); }
    g.add(w); wheels.push(w); }
  for (const x of [-.45, .45]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 2.0), dark); sh.position.set(x, 1.05, .7); g.add(sh); }
  shadows(g);
  return {g, roll: (dist: number) => wheels.forEach((w, i) => { w.rotation.x = dist / (i < 2 ? .42 : .52); })};
};
/** horse + carriage + a seated driver card. Origin at the horse's chest, everything faces +z. */
const team = (L: Lib, col: string, body = '#6b3a24', coat = '#5a3a6a') => { void L; const g = new THREE.Group(), h = horse(col), cr = carriage(body);
  cr.g.position.z = -.75; g.add(h.g, cr.g);
  const d = actor(SIT_H(1.7)); d.k.mesh.position.set(0, 1.45, -1.3); g.add(d.k.mesh);
  const outfit = refStyle({jacket: coat, pants: '#2b2b33', boots: '#1d1a1a', hat: 'tophat'});
  return {g, h, roll: cr.roll, driver: (expr: string, t: number, shock = 0) => d.draw(outfit, {mode: 'sit', seed: 50 + col.length, expr: expr as never,
    armFront: true, armPose: (side, S, gg) => shock > 0 ? [S, [S[0] + side * 30 * gg.u, S[1] - .2 * gg.HH], [S[0] + side * 46 * gg.u, S[1] - .6 * gg.HH]] as P[]
      : [S, [S[0] + side * 20 * gg.u, S[1] + .35 * gg.HH], [300 + side * 14 * gg.u, gg.chin + .75 * gg.HH + 3 * gg.u * Math.sin(t * 9)]] as P[]})};
};
/** the lantern blast: fireball sphere, comic burst rays, flame, flash light, tumbling debris, dark smoke. at(pos, e = seconds since boom) */
const blast = (scene: THREE.Scene) => {
  const fire = flame(scene, 1.6, 0), puff = smoke(scene, 12, '#3e3a38', .16), bits = debris(scene);
  const flash = new THREE.PointLight('#ffd08a', 0, 14, 1.5); scene.add(flash);
  const burst = new Card(3.2, .6, 500, 500, false); burst.mesh.userData.figure = false; scene.add(burst.mesh);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({color: '#ffb347', transparent: true, toneMapped: false, depthWrite: false}));
  ball.layers.set(NOINK); scene.add(ball);
  return (P: number[], e: number, t: number) => { const on = e >= 0;
    fire.at([P[0], P[1] - .5, P[2] + .3], t, on ? (e < .12 ? 1.7 : Math.max(0, 1.4 - 2.2 * (e - .12))) : 0);
    flash.position.set(P[0], P[1], P[2] + 1); flash.intensity = on ? 80 * Math.exp(-e * 9) : 0;
    bits.forEach(fn => fn(P, on ? e : -1)); puff.forEach(fn => fn(t, [P[0], P[1] - .2, P[2] + .2], on ? Math.max(0, 1 - e * .5) : 0));
    burst.mesh.visible = on && e < .3; if (burst.mesh.visible) { burst.mesh.position.set(P[0], P[1] - 1.6, P[2] + .5); burst.draw(p => fxBurst(p, e / .3, '#fff3b0', 12, 40, 200)); }
    ball.visible = on && e < .35; if (ball.visible) { ball.position.set(P[0], P[1], P[2] + .2); ball.scale.setScalar(.2 + 2.2 * smooth(e / .35)); (ball.material as THREE.MeshBasicMaterial).opacity = .9 * (1 - e / .35); } };
};
/** bandaged head + stars circling it (head hook) */
const hurt = (t: number, on: number): Costume => ({head: k => { if (on <= 0) return; const u = k.u;
  k.p.band([[300 - 1.02 * k.Ha, k.hc - .35 * k.Hb], [300 + 1.02 * k.Ha, k.hc - .5 * k.Hb]], '#f4f1ea', 16 * u, 1.8 * u);
  k.p.band([[300 + .55 * k.Ha, k.hc - .62 * k.Hb], [300 + .85 * k.Ha, k.hc - .2 * k.Hb]], '#f4f1ea', 10 * u, 1.6 * u);
  for (let i = 0; i < 4; i++) { const a = t * 4 + i * Math.PI / 2, x = 300 + 1.1 * k.Ha * Math.cos(a), y = k.crown - 14 * u + 14 * u * Math.sin(a);
    const st: P2[] = Array.from({length: 10}, (_, j) => { const b = -Math.PI / 2 + j * Math.PI / 5, r = (j % 2 ? 5 : 12) * u; return [x + r * Math.cos(b), y + r * Math.sin(b)]; });
    k.p.poly(st, '#ffe14a', 1.8 * u); } }});

// ---------- sets ----------
type Ctx = {L: Lib; scene: THREE.Scene; camera: THREE.PerspectiveCamera; env: THREE.DataTexture; renderer: THREE.WebGLRenderer; look: number[]; dof: number; near?: number};
const cam = (c: Ctx, p: number[], t: number[], fov = 40) => { c.look = t; c.camera.fov = fov; c.camera.near = c.near ?? .05; c.camera.updateProjectionMatrix(); c.camera.position.set(p[0], p[1], p[2]); c.camera.lookAt(t[0], t[1], t[2]); };
/** 1868 London crossing at dusk: brick road, terrace walls behind, warm low sun */
const london = (c: Ctx, back = -3.2) => { const rig = lightRig(c.renderer, c.scene, c.env); rig.sun.intensity = 3.2; rig.sun.color.set('#ffcf9a'); const s = c.scene;
  for (let x = -10; x <= 10; x += 2) for (let z = Math.floor(back) - 1; z <= 8; z += 2) s.add(place(c.L, 'medieval-village-megakit/floor-unevenbrick', x, 0, z));
  for (let i = 0; i < 9; i++) { const x = -8 + i * 2; s.add(place(c.L, i % 3 === 1 ? 'medieval-village-megakit/wall-plaster-window-wide-round' : 'medieval-village-megakit/wall-unevenbrick-straight', x, 0, back));
    s.add(place(c.L, 'medieval-village-megakit/wall-plaster-straight', x, 3.12, back)); }
  const inside = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 3), new THREE.MeshStandardMaterial({color: '#2a2020', side: THREE.BackSide})); inside.position.set(0, 3.5, back - 1.6); s.add(inside);
  s.add(place(c.L, 'fantasy-props-megakit/barrel', -2.6, 0, back + .9)); s.add(place(c.L, 'fantasy-props-megakit/crate-wooden', 2.9, 0, back + .8, .3));
  s.fog = new THREE.Fog('#c9b49a', 12, 40); };

// ---------- the 14 pictures ----------
type Upd = (f: number, l: number, u: number) => void;
const B: Record<number, (c: Ctx) => Upd> = {
  // 1 HOOK. "The first traffic light blew up in a police officer's face": frame 1 the gas lantern already sputters over a
  //   nervous officer at the lever; BOOM on "blew" (fireball, flash, debris, smoke, shake, his helmet rockets up); push in
  //   to his sooty, frazzled face; the helmet drops back onto his head, crooked, on "face".
  1: c => { london(c); const sig = gasSignal(); sig.g.position.set(-.1, 0, 0); c.scene.add(sig.g);
    const a = actor(1.75); a.k.mesh.position.set(.5, 0, .35); c.scene.add(a.k.mesh); a.draw(OFFICER, {seed: 31});
    const sputter = flame(c.scene, .14, 1.5), hiss = smoke(c.scene, 5, '#cfe3c0', .015), boomFx = blast(c.scene);
    const hc = new Card(.42, .8, 300, 300, false); hc.mesh.userData.figure = false; c.scene.add(hc.mesh);   // the flying helmet
    hc.draw(p => drawHelmet(p, 150, 230, 95, .95, -.6, 0, 4.75));
    const boom = T('L01', 4) - 2, land = T('L01', 10), lampW = [-.1, 3.9, .1];
    let head: P = [300, 300], uu = 1; const spy: Costume = {head: k => { head = [300, k.crown + .5 * k.Hb]; uu = k.u; }};
    a.draw(OFFICER, {seed: 31, costume: spy}); const launch = new THREE.Vector3(...onCard(a.k, head[0], head[1] - 40 * uu));
    return (f, l) => { const t = l / FPS, e = (f - boom) / FPS, after = f >= boom;
      // before: the lantern sputters (red glass flickering, a hiss of gas), the officer eyes it nervously, hand on the lever
      sig.red.emissiveIntensity = after ? 0 : 1.2 + .8 * Math.sin(t * 31) * Math.sin(t * 7);
      sig.setArms(1);
      sputter.at([lampW[0] - .07, lampW[1] - .1, lampW[2] + .2], t, after ? 0 : .7 + .3 * Math.sin(t * 40));
      hiss.forEach(fn => fn(t * 1.5, [lampW[0] + .12, lampW[1] + .25, lampW[2]], after ? 0 : .7));
      sig.lamp.visible = !after; if (after) { const d = smooth(e * 5); sig.armL.rotation.z = 1.25 * d; sig.armR.rotation.z = -1.4 * d + .1 * Math.sin(e * 20) * Math.exp(-e * 4); }
      boomFx(lampW, after ? e : -1, t);
      // the officer: lever hand, recoil, soot; helmet in the air between boom and "face"
      const leverHand = toCard(a.k, -.1 + .1, .9 + .4), flying = after && f < land, k2 = smooth((f - boom) / 6);
      const armPose = (side: -1 | 1, S: P, g: {u: number; HH: number; chin: number; tcx: number}) => side < 0 && !after ? reach(-1, S, leverHand, g.u, 30, 8)
        : after && f < land + 10 ? [S, [S[0] + side * 30 * g.u, S[1] - .2 * g.HH], [S[0] + side * 48 * g.u, S[1] - .55 * g.HH]] as P[] : null;   // arms fly up
      a.draw(OFFICER, {seed: 31, look: after ? 0 : -.6, armPose, armFront: false, expr: !after ? 'nervous' : f < boom + 24 ? 'shock' : 'dazed',
        tilt: after ? -9 * k2 * Math.exp(-(f - boom) / 30) : 0, blink: f > land + 8 ? (l % 40 < 3 ? 1 : false) : false,
        costume: dress(frazzle(k2), helmet(after ? (f >= land ? -.5 + .12 * Math.exp(-(f - land) / 4) * Math.cos((f - land) * 1.2) : 0) : 0, !flying), soot(t, k2), spy)});
      const air = (land - boom) / FPS, vy = 9.8 * air / 2; hc.mesh.visible = flying;
      if (flying) hc.mesh.position.set(launch.x + .35 * Math.sin(Math.PI * e / air), launch.y - .2 + vy * e - 4.9 * e * e, launch.z + .05);
      hc.mesh.rotation.z = flying ? e * 9 : 0;
      // camera: wide on the lantern and officer, kick on the blast, push into his face by "face"
      const push = smooth((f - boom - 6) / (land - boom)), sh = kick(f - boom, .12);
      c.dof = after ? 4 : 2; cam(c, [lerp(1.4, .62, push) + sh, lerp(2.4, 1.66, push) + sh * .6, lerp(7.2, 2.35, push)], [lerp(.1, .5, push), lerp(2.55, 1.62, push), lerp(0, .35, push)], 40); }; },
  // 2 "See, the city needed to stop drivers from crashing at busy intersections": two horse wagons trot head-on into each
  //   other at the crossing on "crashing": both horses rear, a crate flies off, they recoil.
  2: c => { london(c, -16); const A = team(c.L, '#7a4a2a'), Bt = team(c.L, '#d8d0c4'); A.g.rotation.y = Math.PI / 2; c.scene.add(A.g, Bt.g);   // T-bone at the crossing
    const crate = place(c.L, 'fantasy-props-megakit/crate-wooden', 0, 0, 0, 0, .55); c.scene.add(crate); const dust = smoke(c.scene, 8, '#c8b89a', .12);
    const crash = T('L02', 8) - 2;
    return (f, l, u) => { const t = l / FPS, e = (f - crash) / FPS, before = f < crash, back = before ? 0 : .3 * smooth(e * 4);
      A.g.position.set(before ? -1.15 - 1.6 * (crash - f) / FPS : -1.15 - back, 0, 0);            // from the left, across the frame
      Bt.g.position.set(0, 0, before ? -1.15 - 2.6 * (crash - f) / FPS : -1.15 - back);           // down the street toward us
      const rear = before ? 0 : Math.sin(Math.min(1, e / .8) * Math.PI) * .9;
      A.h.pose(t * 2.2, before ? 1 : 0, rear); Bt.h.pose(t * 2.4 + .3, before ? 1 : 0, rear * .8);
      A.roll(A.g.position.x); Bt.roll(Bt.g.position.z);
      A.driver(before ? 'neutral' : 'shock', t, before ? 0 : 1); Bt.driver(before ? 'smile_closed' : 'shock', t, before ? 0 : 1);
      const ce = Math.max(0, e), cy = .85 + 4.5 * ce - 4.9 * ce * ce;                                  // a crate bounces off the brown wagon
      crate.position.set(A.g.position.x - 2.1 + .9 * ce, cy > 0 ? cy : 0, .9 * ce); crate.rotation.set(ce * 6, ce * 4, 0);
      dust.forEach(fn => fn(t, [0, .3, 0], before ? 0 : Math.max(0, 1 - e)));
      c.dof = 0; cam(c, [2.4 - .4 * u + kick(f - crash, .15), 7.2 - .5 * u, 9.6 - .8 * u], [-1.5, .4, -2.0], 40); }; },
  // 3 "So they put up a signal with lights, to tell people when to stop and when to go": the signal springs up on "put up";
  //   on "stop" the officer pulls the lever, arms go level, red glows and the wagon halts; on "go" arms drop, green, it trots on.
  3: c => { london(c); const sig = gasSignal(); sig.g.position.set(-.3, 0, -1.2); c.scene.add(sig.g); const A = team(c.L, '#7a4a2a'); A.g.rotation.y = Math.PI / 2; c.scene.add(A.g);
    const a = actor(1.75); a.k.mesh.position.set(.25, 0, -.9); c.scene.add(a.k.mesh); a.draw(OFFICER, {seed: 31});
    const up = T('L03', 2), stop = T('L03', 13) - 2, go = T('L03', 17) - 2;
    const v0 = 3, f1 = stop - 20, dec = 26, acc = 15, x0 = -3.0 - v0 * dec / 2 / FPS - v0 * (f1 - SHOT_A(3)) / FPS;   // halts at x = -3 (before the signal)
    return (f, l, u) => { const t = l / FPS, pop = f < up ? 0 : 1 + .25 * Math.exp(-(f - up) / 5) * Math.sin((f - up) * .9) - Math.exp(-(f - up) / 3) * 0;
      sig.g.scale.set(1, Math.max(.001, Math.min(1.3, pop * smooth((f - up) / 6))), 1);
      const isStop = f >= stop && f < go, isGo = f >= go; sig.setArms(isStop ? smooth((f - stop) / 4) : isGo ? 1 - smooth((f - go) / 4) : 0);
      sig.red.emissiveIntensity = isStop ? 2.2 : 0; sig.green.emissiveIntensity = isGo ? 2.2 : 0;
      sig.lever.rotation.z = isStop ? -.6 : isGo ? .6 : 0;
      // the wagon: trots in, slows to a halt before the signal on red, sets off on green
      const fl = f - SHOT_A(3), a1 = f1 - SHOT_A(3); let x: number, spd: number;                                    // position from time (frames render independently)
      if (fl < a1) { x = x0 + v0 * fl / FPS; spd = v0; }
      else if (f < f1 + dec) { const q = f - f1; x = x0 + v0 * a1 / FPS + (v0 * q - v0 * q * q / (2 * dec)) / FPS; spd = v0 * (1 - q / dec); }
      else if (f < go) { x = -3.0; spd = 0; }
      else { const q = f - go, qa = Math.min(q, acc); x = -3.0 + (v0 * qa * qa / (2 * acc) + v0 * Math.max(0, q - acc)) / FPS; spd = v0 * qa / acc; }
      A.g.position.set(x, 0, .3); A.h.pose(t * 2.2, spd / 3); A.roll(x); A.driver(isStop ? 'nervous' : 'neutral', t);
      const lever = toCard(a.k, -.2, 1.3);
      a.draw(OFFICER, {seed: 31, look: -.5, expr: isStop ? 'stern' : isGo ? 'smile' : 'neutral', armFront: false,
        armPose: (side, S, g) => side < 0 ? reach(-1, S, lever, g.u, 28, 8) : isStop ? [S, [S[0] + 30 * g.u, S[1] - .1 * g.HH], [S[0] + 52 * g.u, S[1] - .45 * g.HH]] as P[] : null,
        costume: helmet()});
      c.dof = 2; cam(c, [1.6, 3.3, 10.2 - .6 * u], [-1.2, 1.9, -.4], 40); }; },
  // 4 "The problem? The lights ran on gas, and a police officer had to work them by hand": close on the lantern (a real
  //   flame behind the coloured glass); on "gas" glowing gas pulses climb the pipe and the camera follows them down to
  //   the officer heaving the lever back and forth on "by hand".
  4: c => { london(c); const sig = gasSignal(); sig.g.position.set(-.1, 0, 0); c.scene.add(sig.g); sig.setArms(1);
    const a = actor(1.75); a.k.mesh.position.set(.5, 0, .35); c.scene.add(a.k.mesh); a.draw(OFFICER, {seed: 31});
    const fl = flame(c.scene, .16, 2), gas = T('L04', 6) - 4, off = T('L04', 9), hand = T('L04', 13);
    const pulses = Array.from({length: 7}, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({color: '#ffe680', toneMapped: false})); m.layers.set(NOINK); c.scene.add(m); return m; });
    return (f, l, u) => { const t = l / FPS; sig.red.emissiveIntensity = 1.6 + .4 * Math.sin(t * 13);
      fl.at([-.1 - .075, 3.98, .32], t, .8 + .1 * Math.sin(t * 20));
      pulses.forEach((m, i) => { const q = ((t - (gas - SHOT_A(4)) / FPS) * .7 + i / 7) % 1; m.visible = f > gas; m.position.set(0, .6 + 3.2 * q, .02); m.scale.setScalar(1 + .4 * Math.sin(t * 9 + i)); });
      const work = f > hand ? Math.sin((f - hand) * .35) : 0; sig.lever.rotation.z = .7 * work;
      const lever = toCard(a.k, 0 + .25 * Math.sin(.7 * work) * 0 + .02, 1.3 + .1 * work);
      a.draw(OFFICER, {seed: 31, look: -.6, expr: f > hand ? 'strain' : 'neutral', armFront: false, tilt: f > hand ? -4 * work : 0,
        armPose: (side, S, g) => side < 0 ? reach(-1, S, lever, g.u, 26, 4) : f > hand ? reach(-1, [S[0], S[1]], [lever[0] + 20 * g.u, lever[1] + 18 * g.u], g.u, -10, 8) : null,
        costume: dress(helmet(), {head: k => { if (f > hand) { const u2 = k.u; for (const [sx, ph] of [[-1, 0], [1, .5]] as const) { const q = (t * 1.1 + ph) % 1;
          k.p.poly([[300 + sx * (k.Ha + 8 * u2), k.hc - .3 * k.Hb + 26 * u2 * q - 8 * u2], [300 + sx * (k.Ha + 12 * u2), k.hc - .3 * k.Hb + 26 * u2 * q + 2 * u2], [300 + sx * (k.Ha + 8 * u2), k.hc - .3 * k.Hb + 26 * u2 * q + 7 * u2], [300 + sx * (k.Ha + 4 * u2), k.hc - .3 * k.Hb + 26 * u2 * q + 2 * u2]], `rgba(140,200,255,${1 - q})`, 1.4 * u2); } } }})});
      const down = smooth((f - gas) / (off - gas + 10));
      c.dof = 4; cam(c, [lerp(.7, 1.0, down), lerp(3.9, 1.55, down), lerp(1.9, 3.0, down)], [lerp(-.15, .2, down), lerp(3.85, 1.3, down), lerp(0, .2, down)], 40); }; },
  // 5 "One day the gas leaked, and it exploded, badly hurting the officer running it": a greenish leak hisses out of the pipe
  //   joint and swells round the lantern (he sniffs, worried); BOOM on "exploded"; he is thrown back and lands flat,
  //   bandaged, stars circling, on "badly hurting".
  5: c => { london(c); const sig = gasSignal(); sig.g.position.set(-.1, 0, 0); c.scene.add(sig.g); sig.setArms(1);
    const a = actor(1.75); a.k.mesh.position.set(.5, 0, .35); c.scene.add(a.k.mesh); a.draw(OFFICER, {seed: 31});
    const lay = actor(1.75); lay.k.mesh.userData.fixed = true; c.scene.add(lay.k.mesh); lay.draw(OFFICER, {seed: 31, mode: 'fall'});
    const leak = smoke(c.scene, 12, '#b9d98a', .035), boomFx = blast(c.scene), leaked = T('L04', 21) - 4, boom = T('L04', 24) - 2, badly = T('L04', 25), lampW = [-.1, 3.9, .1];
    return (f, l, u) => { const t = l / FPS, e = (f - boom) / FPS, after = f >= boom;
      sig.red.emissiveIntensity = after ? 0 : 1.6; sig.lamp.visible = !after;
      if (after) { const d = smooth(e * 5); sig.armL.rotation.z = 1.25 * d; sig.armR.rotation.z = -1.4 * d; }
      leak.forEach(fn => fn(t * .8, [.05, 3.55, .1], after ? 0 : smooth((f - leaked) / 20)));
      boomFx(lampW, after ? e : -1, t);
      // thrown back: a ballistic arc away from the pole, then lying flat (a fixed card turned on its side)
      const fly = Math.min(1, Math.max(0, e / .5)), lying = e >= .5;
      a.k.mesh.visible = !lying; a.k.mesh.position.set(.5 + 1.4 * fly, Math.max(0, 1.6 * fly * (1 - fly) * 2), .35 + .4 * fly);
      a.draw(OFFICER, {seed: 31, look: after ? 0 : -.7, expr: after ? 'shock' : f > leaked + 10 ? 'nervous' : 'neutral', tilt: after ? -40 * fly : 0,
        costume: dress(helmet(0, !after), soot(t, after ? 1 : 0), frazzle(after ? 1 : 0), {head: k => { if (!after && f > leaked + 10) { const u2 = k.u;     // sniffing lines at the nose
          for (let i = 0; i < 3; i++) k.p.stroke([[300 + (20 + 8 * i) * u2, k.hc + 4 * u2 - 6 * i * u2], [300 + (32 + 8 * i) * u2, k.hc - 2 * u2 - 6 * i * u2]], 2.4 * u2, '#6a8a3a'); } }})});
      lay.k.mesh.visible = lying; if (lying) { lay.draw(OFFICER, {seed: 31, mode: 'fall', expr: 'dazed', costume: dress(soot(t, 1), hurt(t, smooth((f - badly) / 6)))});
        lay.k.mesh.position.set(-.05, .5, .45); lay.k.mesh.rotation.set(0, 0, -Math.PI / 2); }   // fixed card rolled onto its side (y keeps it above the cobbles; no yaw: the camera is in front)   // fixed card on its side (y keeps it above the cobbles)
      const push = smooth((f - boom - 12) / 30);
      c.dof = 3; cam(c, [lerp(1.4, 1.0, push) + kick(f - boom, .12), lerp(2.6, 2.1, push), lerp(7.4, 5.9, push)], [lerp(.1, .85, push), lerp(2.6, .7, push), lerp(0, .45, push)], 40); }; },
  // 6 "So the city took the lights down": the scorched pole is chained up and topples over with a thud and dust on "down"
  6: c => { london(c); const sig = gasSignal(); sig.g.position.set(-.1, 0, 0); c.scene.add(sig.g); sig.lamp.visible = false; sig.armL.rotation.z = 1.25; sig.armR.rotation.z = -1.4;
    const a = actor(1.75); a.k.mesh.position.set(1.4, 0, .9); c.scene.add(a.k.mesh); const dust = smoke(c.scene, 10, '#c8b89a', .14), down = T('L05', 6) - 2;
    return (f, l, u) => { const t = l / FPS, k = smooth((f - (down - 16)) / 16), hit = f >= down;
      sig.g.rotation.z = hit ? -Math.PI / 2 + .06 * Math.exp(-(f - down) / 3) * Math.abs(Math.sin((f - down) * 1.3)) : -Math.PI / 2 * k * k;
      dust.forEach(fn => fn(t, [-2.2, .1, .2], hit ? Math.max(0, 1 - (f - down) / 30) : 0));
      a.draw(OFFICER, {seed: 31, look: -.8, expr: hit ? 'smile_closed' : 'neutral', costume: dress(helmet(-.5), soot(t, .7), hurt(t, 1))});
      c.dof = 2; cam(c, [.6 + kick(f - down, .1), 2.2, 7.6 - .5 * u], [-.8, 1.4, 0], 40); }; },
};
// shots not built yet: the 1868 crossing, wide
const placeholder = (c: Ctx): Upd => { london(c); const sig = gasSignal(); sig.g.position.set(-.1, 0, 0); c.scene.add(sig.g);
  return (f, l, u) => { cam(c, [1.4 + .3 * u, 2.3, 6.6], [.1, 2.0, 0], 40); }; };

const captionAt = (t: number) => { // groups of <= 3 words within a line, shown while spoken; active = the word being said
  const idx = W.findIndex(w => t >= w.start - .05 && t < w.end + .25); if (idx < 0) return {words: [] as string[], active: -1};
  const first = W.findIndex(w => w.line === W[idx].line), g = first + Math.floor((idx - first) / 3) * 3;   // groups never cross a line
  const grp = W.slice(g, g + 3).filter(w => w.line === W[idx].line);
  const active = grp.findIndex(w => t >= w.start - .03 && t < w.end + .08);
  return {words: grp.map(w => w.word.replace(/[.,!?]/g, '')), active};
};

export const TrafficShort: React.FC = () => {
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
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: CAPTION_BOTTOM}}><div style={captionCss(capText)}>
      {cap.words.map((w, i) => <span key={i} style={i === cap.active ? {...captionWord, ...captionActive} : captionWord}>{w}</span>)}</div></AbsoluteFill>
  </AbsoluteFill>;
};
export {lerp3, INK};
