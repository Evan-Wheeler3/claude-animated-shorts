// "Hold Up: Why Guardrails Crumple" — the full short. One persistent three.js renderer; every frame poses the
// world from story.ts (pure functions of video time) and renders it through the Hold Up post chain:
// RenderPass -> InkPass (templates/bridge/ink) -> lens blur pre + main -> bloom -> NEUTRAL tone map -> grade.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {BloomEffect, BlendFunction, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {GradeEffect, GRADES} from '../../../../templates/bridge/grade';
import {createCliffRoad, createGuardrail} from '../../assets/models.mjs';
import {createImpactEffect} from '../../assets/cards.mjs';
import {createDriver} from '../../assets/driver';
import {loadSedan, type Sedan} from '../../assets/sedan';
import {createExtrusion, knockPosts, popPosts} from './extrusion';
import {FocusEffect} from './focus';
import {
  BEAT, CUT, FPS, RAIL_X, TOTAL, SHOTS, shotAt, sideCar, hookCar, oldEndCar, terminalCar, travel, TRAVEL_END,
  clamp01, smooth, lerp, mix3, kick, roadCenter, ramp, type CarState,
} from './story';

export const GUARDRAIL_FRAMES = TOTAL;
type Post = {ink: boolean; lens: boolean; bloom: boolean; grade: number};
const postOpts = (): Post => ({ink: true, lens: true, bloom: true, grade: .85, ...((getInputProps() as {post?: Partial<Post>}).post ?? {})});

type World = ReturnType<typeof buildWorld>;
function buildWorld(sedan: Sedan, width: number, height: number, canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, stencil: false, powerPreference: 'high-performance'});
  // draw at the output resolution: Remotion's --scale sets the page's devicePixelRatio (0.5 proofs, 1.333 final)
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a6cce1');
  scene.fog = new THREE.Fog('#a6cce1', 30, 90);
  const sun = new THREE.DirectionalLight('#ffe3ae', 2.75); // v3: harder key, less fill = more contrast
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -11, right: 11, top: 11, bottom: -11, near: .5, far: 60});
  sun.shadow.normalBias = .02;
  sun.shadow.bias = -.0004;
  scene.add(new THREE.HemisphereLight('#dbe5ff', '#7d5550', 1.2), sun, sun.target, createCliffRoad());

  const rail = createGuardrail({curved: true});
  rail.root.position.x = RAIL_X;
  scene.add(rail.root);
  const strip = createExtrusion();
  rail.head.add(strip.mesh);

  scene.add(sedan.root);
  const driver = createDriver();
  const k = sedan.cushion, c = k.getCenter(new THREE.Vector3());
  const seat = new THREE.Vector3(c.x, k.max.y + .33, c.z + .18);
  driver.card.scale.setScalar(1.12);
  driver.card.position.copy(seat);
  sedan.interior.add(driver.card);
  const sparks = [createImpactEffect(), createImpactEffect()];
  for (const s of sparks) scene.add(s.root);

  const camera = new THREE.PerspectiveCamera(40, width / height, .05, 400);
  camera.layers.enable(NOINK);
  const opts = postOpts();
  const composer = new EffectComposer(renderer, {multisampling: 4, frameBufferType: THREE.HalfFloatType});
  composer.addPass(new RenderPass(scene, camera));
  if (opts.ink) composer.addPass(new InkPass(scene, camera, {distFar: 90}));
  const lens = new LensBlur({maxCoC: 24, nearScale: 1.2});
  if (opts.lens) { composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main)); }
  const bloom = new BloomEffect({blendFunction: BlendFunction.ADD, intensity: .5, luminanceThreshold: 1, luminanceSmoothing: .2, mipmapBlur: true, levels: 6, radius: .6});
  if (opts.bloom) composer.addPass(new EffectPass(camera, bloom));
  const grade = new GradeEffect(GRADES.day, opts.grade);
  const focus = new FocusEffect();
  composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), focus, grade));
  return {renderer, scene, sun, rail, strip, driver, seat, sparks, camera, composer, lens, sedan, focus,
    dispose() { composer.dispose(); driver.dispose(); strip.dispose(); renderer.dispose(); }};
}

const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);

function placeCar(w: World, s: CarState) {
  const r = w.sedan.root;
  r.visible = s.visible;
  r.position.set(s.x, s.y, s.z);
  r.rotation.set(s.pitch, s.yaw, s.roll, 'YXZ');
  w.sedan.setWheels(s.dist, s.steer);
  w.sedan.setSteer(s.wheel);
  r.updateMatrixWorld(true);
}
/** a point given in the car's frame, in world space */
function carPt(w: World, p: number[]) { return V(p).applyMatrix4(w.sedan.root.matrixWorld).toArray(); }

/** a camera setup: where it is, what it looks at, which point the viewer's eye is led to, and how hard */
type Frame = {
  pos: number[]; look: number[]; fov: number; cInf: number; focus?: number[]; shake?: number;
  eye: number[]; spot?: {r?: number; dark?: number; desat?: number}; flash?: number;
};
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;      // camera bursts: fast start, soft landing
const flashAt = (t: number, t0: number) => { const f = Math.round((t - t0) * FPS); return f >= 0 && f < 3 ? [1, .55, .2][f] : 0; };

function pose(w: World, t: number): Frame {
  const {rail, sedan, driver, strip, sparks} = w;
  const shot = shotAt(t);
  const u = clamp01((t - shot.a) / (shot.b - shot.a));
  const g = {front: sedan.front, halfWidth: sedan.halfWidth};
  rail.root.visible = true;
  rail.beam.visible = true;
  rail.setTerminal({modern: false});
  rail.oldEnd.scale.set(1, 1, 1);
  rail.head.scale.set(1, 1, 1);
  knockPosts(rail.posts, 0, false);
  strip.setTravel(0);
  for (const s of sparks) s.setProgress(0);
  driver.card.position.copy(w.seat);
  const hide: CarState = {x: 0, y: 0, z: -60, yaw: 0, pitch: 0, roll: 0, dist: 0, steer: 0, wheel: 0, visible: false};
  const sparkAt = (i: number, p: number[], prog: number) => { sparks[i].root.position.set(p[0], p[1], p[2]); sparks[i].setProgress(prog); };
  const face = () => carPt(w, [w.seat.x, w.seat.y + .2, w.seat.z]);

  // ---- the extruding terminal (aftermath shots reuse its end state) ----
  const terminal = (tt: number, open = false) => {
    const T = travel(tt);
    rail.setTerminal({modern: true, travel: T, open});
    knockPosts(rail.posts, T, true);
    strip.setTravel(T);
    const cut = rail.head.children.find(c => c instanceof THREE.Group && c.children.length === 4);
    if (cut) cut.children[3].visible = !open;
    const s = terminalCar(tt, sedan.front);
    placeCar(w, s);
    return {T, hx: RAIL_X + roadCenter(Math.max(T, 0)), hz: Math.max(T, 0), s};
  };
  const coil = (hx: number, hz: number) => [hx + .85, .3, hz + .6];
  // the opening / closing frame of the loop: high, three-quarter, the stopped car with the ribbon beside it
  const C0 = (hx: number, hz: number) => ({pos: [hx + 3.6, 2.7, hz + 3.3], look: [hx - .35, .45, hz - .9]});

  switch (shot.key) {
    case 'open': case 'ribbon': case 'eye': case 'loop': {
      const {hx, hz} = terminal(BEAT.stop + 6);
      const c0 = C0(hx, hz), k = coil(hx, hz);
      const peek = shot.key === 'eye' ? t >= BEAT.life - .05 : shot.key !== 'open';
      driver.setPose(peek ? 'peek' : 'brace', true, -.05);
      if (shot.key === 'open') {          // frame 0 = the loop frame, then a hard push onto the ribbon
        const e = easeOut((t - .25) / (shot.b - .25));
        return {pos: mix3(c0.pos, [hx + 3.0, 1.9, hz + 2.9], e), look: mix3(c0.look, k, e), fov: 40, cInf: lerp(0, 9, e), eye: k,
          spot: {r: lerp(.32, .16, e), dark: lerp(.15, .4, e), desat: .35}, focus: k};
      }
      if (shot.key === 'ribbon') {        // the coil, close: creep in
        return {pos: mix3([hx + 2.9, 1.7, hz + 2.7], [hx + 2.55, 1.5, hz + 2.35], u), look: [k[0] - .2, k[1] + .05, k[2] - .25], fov: 38, cInf: 12, eye: k,
          spot: {r: .14, dark: .45, desat: .45}, focus: k};
      }
      if (shot.key === 'eye') {           // the driver, alive: one eye opens on "life"
        return {pos: carPt(w, [.22, 1.62, sedan.front + lerp(1.1, .9, u)]), look: carPt(w, [.33, 1.22, .05]), fov: 30, cInf: 12,
          eye: face(), spot: {r: .13, dark: .35, desat: .3}, focus: face()};
      }
      // loop: from the windshield back out to the opening frame (last frame == frame 0)
      const e = smooth(u);
      const start = {pos: carPt(w, [.22, 1.75, sedan.front + 1.6]), look: carPt(w, [.3, 1.1, 0])};
      return {pos: mix3(start.pos, c0.pos, e), look: mix3(start.look, c0.look, e), fov: 40, cInf: lerp(8, 0, e), eye: mix3(face(), k, e),
        spot: {r: lerp(.16, .32, e), dark: lerp(.35, .15, e), desat: .35}};
    }
    case 'skid': case 'fall': {           // flashback: off the cliff
      rail.root.visible = false;
      const s = hookCar(t, g);
      placeCar(w, s);
      const panic = t > BEAT.edge - 1.2;
      driver.setPose('steer', false, s.wheel, panic ? 'shock' : 'nervous');
      if (shot.key === 'skid') {
        return {pos: carPt(w, [lerp(3.2, 2.7, u), 1.45, lerp(1.0, .5, u)]), look: carPt(w, [.25, 1.1, -.05]), fov: 40, cInf: 10,
          eye: face(), spot: {r: .15, dark: .3, desat: .3}, focus: face(), shake: .004 * Math.sin(t * 47)};
      }
      const fall = smooth((t - BEAT.edge) / .7);
      const lk = [lerp(s.x, 3.4, .45), Math.max(s.y * .7, -2.6) - .1 - .3 * fall, s.z + 1.2];
      return {pos: mix3([11.0, 6.4, 0.2], [12.2, 7.6, 1.6], easeOut(u)), look: lk, fov: 42, cInf: 0, eye: [s.x, s.y + .6, s.z],
        spot: {r: .18, dark: .3, desat: .25}};
    }
    case 'glanceWin': case 'glanceHit': case 'flex': case 'back': {
      const tc = BEAT.sideHit;
      const tau = shot.key === 'glanceHit' ? ramp(t, tc, tc, .35, .25)
        : shot.key === 'flex' ? tc + .2 + .45 * (t - BEAT.bend)
        : shot.key === 'back' ? tc + .6 + (t - BEAT.pushes) : t;
      const s = sideCar(tau, tc, g, true);
      placeCar(w, s);
      rail.setBeam({flex: s.flex, contact: s.contact});
      const d = tau - tc;
      const cp = [RAIL_X + roadCenter(s.contact) - .1, .7, s.contact];
      if (d > 0 && d < .7) sparkAt(0, cp, d / .7);
      driver.setPose(d > 0 && d < 1.2 ? 'brace' : 'steer', false, s.wheel, d > -.4 && d < 0 ? 'shock' : undefined);
      if (shot.key === 'glanceWin') {
        return {pos: carPt(w, [lerp(3.3, 2.9, u), 1.42, lerp(.9, .5, u)]), look: carPt(w, [.25, 1.12, -.05]), fov: 38, cInf: 10,
          eye: face(), spot: {r: .15, dark: .3, desat: .3}, focus: face()};
      }
      if (shot.key === 'glanceHit') {
        const follow = [s.x + .4, .5, s.z + 1.2];
        return {pos: mix3([7.0, 3.3, 2.4], [7.2, 3.4, 5.2], easeOut(u)), look: mix3([2.9, .5, 6.0], follow, smooth(u)), fov: 40, cInf: 0,
          eye: cp, spot: {r: .17, dark: .32, desat: .3}, shake: kick(tau, tc, .02), flash: .5 * flashAt(t, tc)};
      }
      if (shot.key === 'flex') {
        const z0 = s.contact, rx = RAIL_X + roadCenter(z0);
        return {pos: [rx + .95, 1.5, z0 + lerp(4.0, 3.5, easeOut(u))], look: [rx - .35, .55, z0 - .4], fov: 38, cInf: 10, focus: [rx, .68, z0],
          eye: [rx + .1, .68, z0], spot: {r: .14, dark: .4, desat: .4}};
      }
      // back onto the road: chase from behind and above
      return {pos: carPt(w, [-1.6, 2.6, -6.0 + 1.2 * u]), look: carPt(w, [0, .7, 3.5]), fov: 44, cInf: 4, eye: carPt(w, [0, .8, 0]),
        spot: {r: .2, dark: .25, desat: .25}, focus: carPt(w, [0, .8, 0])};
    }
    case 'flaw': {                         // the old blunt end, alone: an ominous push
      placeCar(w, hide);
      const e = easeOut(u * 1.15);
      const end = [RAIL_X, .68, 0];
      return {pos: mix3([1.5, 1.15, -3.4], [2.75, .78, -.8], e), look: mix3([2.9, .6, 1.0], [RAIL_X, .68, .1], e), fov: 38, cInf: lerp(4, 12, e),
        eye: end, spot: {r: lerp(.2, .12, e), dark: .5, desat: .55}, focus: end};
    }
    case 'approach': case 'spear': case 'cabin': {
      const tt = shot.key === 'spear' ? ramp(t, BEAT.spear, BEAT.spear, .3, .22)
        : shot.key === 'cabin' ? BEAT.spear - .12 + (t - shot.a) : t;
      const s = oldEndCar(tt, sedan.front);
      for (const c of rail.posts.children) if ((c.userData.base ?? c.position).z < 2) c.visible = false;
      const d = tt - BEAT.spear;
      if (d > 0 && d < .6) sparkAt(0, [RAIL_X, .66, -.1], d / .6);
      const jolt = d < 0 ? 0 : Math.sin(Math.PI * clamp01(d / .3)) * Math.exp(-Math.max(0, d - .15) * 3);
      driver.card.position.z += .16 * jolt;
      driver.card.position.y -= .03 * jolt;
      driver.setPose(d < 0 ? 'steer' : 'brace', shot.key === 'cabin', d < 0 ? .18 * Math.sin(tt * 4) : -.1, d < 0 ? 'shock' : 'pained');
      placeCar(w, s);
      if (shot.key === 'approach') {
        return {pos: carPt(w, [lerp(.0, .1, u), 1.5, sedan.front + lerp(3.2, 2.4, easeOut(u))]), look: carPt(w, [.3, 1.1, .1]), fov: 34, cInf: 11,
          eye: face(), spot: {r: .13, dark: .35, desat: .3}, focus: face(), shake: .003 * Math.sin(t * 53)};
      }
      if (shot.key === 'spear') {
        return {pos: [lerp(3.05, 3.0, u), 1.02, lerp(4.8, 4.3, easeOut(u))], look: [2.95, .6, -3.0], fov: 36, cInf: 8, focus: [RAIL_X, .68, -.1],
          eye: [RAIL_X - .1, .75, -.2], spot: {r: .16, dark: .35, desat: .35}, shake: kick(t, BEAT.spear, .035), flash: flashAt(t, BEAT.spear)};
      }
      return {pos: carPt(w, [-.42, 1.24, lerp(-1.05, -.95, u)]), look: carPt(w, [.38, .78, .4]), fov: 56, cInf: 12, focus: face(),
        eye: face(), spot: {r: .15, dark: .35, desat: .3}, shake: kick(tt, BEAT.spear, .02)};
    }
    case 'head': {                         // the new end pops on: hard push to its broad face
      placeCar(w, hide);
      const pop = clamp01((t - BEAT.swap) / .3);
      const sw = clamp01((t - BEAT.swap + .12) / .15);
      rail.setTerminal({modern: pop > 0, travel: 0});
      rail.oldEnd.visible = sw < 1;
      rail.oldEnd.scale.setScalar(Math.max(.001, 1 - sw));
      const k = pop <= 0 ? .001 : 1 + 2.70158 * (pop - 1) ** 3 + 1.70158 * (pop - 1) ** 2;
      rail.head.scale.setScalar(Math.max(.001, k));
      const e = easeOut((t - BEAT.swap) / .9);
      const faceP = [RAIL_X, .64, -.2];
      return {pos: mix3([1.9, 1.0, -3.6], [2.35, .82, -1.7], e), look: mix3([3.0, .62, .4], [RAIL_X, .63, .05], e), fov: 40, cInf: lerp(5, 11, e),
        eye: faceP, spot: {r: .15, dark: .35, desat: .35}, focus: faceP, flash: .35 * flashAt(t, BEAT.swap + .1)};
    }
    case 'slide': {
      const {T, hx, hz, s} = terminal(ramp(t, BEAT.hit, BEAT.hit, .45, .15));
      const d = t - BEAT.hit;
      if (d > 0 && d < .55) sparkAt(0, [hx - .1, .62, T - .25], d / .55);
      driver.setPose(d < 0 ? 'steer' : 'brace', d > 0, -.05, d < 0 ? 'shock' : undefined);
      const camZ = lerp(-.7, 2.4, easeOut(u)) - .3;
      return {pos: [RAIL_X + roadCenter(Math.max(0, camZ)) + 4.2, 1.4, camZ - .4], look: [hx - .4, .5, lerp(-.2, hz, .85) + .3], fov: 38, cInf: 5,
        eye: [hx - .05, .6, hz - .1], spot: {r: .17, dark: .3, desat: .3}, focus: [hx, .62, hz],
        shake: kick(t, BEAT.hit, .025), flash: .6 * flashAt(t, BEAT.hit)};
    }
    case 'cutaway': {
      const {T, hx} = terminal(t, true);
      driver.setPose('brace', true, -.05);
      const e = smooth(u);
      const throat = [hx + .18, .6, T + .18];
      return {pos: [hx + lerp(1.45, 1.2, e), lerp(2.3, 2.05, e), T + lerp(2.0, 1.7, e)], look: [hx + .12, .5, T + .05], fov: 40, cInf: 9,
        eye: throat, spot: {r: .2, dark: .42, desat: .45}, focus: throat};
    }
    case 'stop': {
      const {hx, hz, s} = terminal(t);
      driver.setPose('brace', true, -.05);
      const e = smooth(u);
      const carC = [s.x, .8, s.z];
      return {pos: mix3([hx + 1.2, 2.05, hz + 1.7], [hx + 4.6, 3.3, hz + 4.2], e), look: mix3([hx + .12, .5, hz + .05], [hx - .4, .5, hz - 1.2], e),
        fov: 40, cInf: lerp(9, 2, e), eye: mix3([hx + .3, .5, hz + .3], carC, e), spot: {r: lerp(.18, .28, e), dark: .3, desat: .3}};
    }
  }
  return {pos: [0, 5, 0], look: [0, 0, 10], fov: 40, cInf: 0, eye: [0, 0, 10]};
}

function renderAt(w: World, f: number) {
  const t = f / FPS;
  const fr = pose(w, t);
  const cam = w.camera;
  cam.fov = fr.fov;
  cam.position.copy(V(fr.pos));
  cam.lookAt(V(fr.look));
  if (fr.shake) { cam.rotateZ(fr.shake * 2); cam.position.y += fr.shake; }
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  // sun: same direction every shot, shadow box centred on what the camera looks at
  const target = V(fr.focus ?? fr.look);
  w.sun.target.position.copy(target);
  w.sun.position.copy(target).add(new THREE.Vector3(8, 15, -7));
  w.sun.target.updateMatrixWorld();
  w.scene.updateMatrixWorld(true);
  w.driver.faceCamera(cam);
  const fwd = cam.getWorldDirection(new THREE.Vector3());
  w.lens.focus = Math.max(.3, V(fr.focus ?? fr.look).sub(cam.position).dot(fwd));
  w.lens.cInf = fr.cInf;
  // lead the eye: spotlight centred on the beat's subject as it projects on screen
  const p = V(fr.eye).project(cam);
  const sp = fr.spot ?? {};
  w.focus.set({x: clamp01(p.x * .5 + .5), y: clamp01(p.y * .5 + .5), r: sp.r ?? .2, feather: .42, dark: sp.dark ?? .25,
    desat: sp.desat ?? .25, flash: fr.flash ?? 0, aspect: cam.aspect});
  w.composer.render();
}

export const GuardrailShort: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const world = useRef<World | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('guardrail world'));
  useLayoutEffect(() => {
    let live = true;
    loadSedan(staticFile('car-sedan/Car_Sedan.glb')).then(sedan => {
      if (!live) return;
      world.current = buildWorld(sedan, width, height, canvas.current!);
      setReady(true);
      continueRender(handle);
    });
    return () => { live = false; world.current?.dispose(); world.current = null; };
  }, [handle, width, height]);
  useLayoutEffect(() => {
    if (ready && world.current) renderAt(world.current, frame);
  }, [frame, ready]);
  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
export {SHOTS};
