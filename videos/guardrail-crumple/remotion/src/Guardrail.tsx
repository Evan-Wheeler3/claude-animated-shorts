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
import {
  BEAT, FPS, RAIL_X, LANE_X, TOTAL, SHOTS, shotAt, sideCar, hookCar, oldEndCar, terminalCar, travel, TRAVEL_END,
  clamp01, smooth, lerp, mix3, kick, roadCenter, type CarState,
} from './story';

export const GUARDRAIL_FRAMES = TOTAL;
type Post = {ink: boolean; lens: boolean; bloom: boolean; grade: number};
const postOpts = (): Post => ({ink: true, lens: true, bloom: true, grade: .55, ...((getInputProps() as {post?: Partial<Post>}).post ?? {})});

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
  const sun = new THREE.DirectionalLight('#ffe3ae', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -11, right: 11, top: 11, bottom: -11, near: .5, far: 60});
  sun.shadow.normalBias = .02;
  sun.shadow.bias = -.0004;
  scene.add(new THREE.HemisphereLight('#dbe5ff', '#8d605d', 1.55), sun, sun.target, createCliffRoad());

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
  composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), grade));
  return {renderer, scene, sun, rail, strip, driver, seat, sparks, camera, composer, lens, sedan,
    dispose() { composer.dispose(); driver.dispose(); strip.dispose(); renderer.dispose(); }};
}

const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();

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

type Frame = {pos: number[]; look: number[]; fov: number; cInf: number; focus?: number[]; shake?: number};

function pose(w: World, t: number): Frame {
  const {rail, sedan, driver, strip, sparks} = w;
  const shot = shotAt(t);
  const g = {front: sedan.front, halfWidth: sedan.halfWidth};
  // defaults
  rail.root.visible = true;
  rail.beam.visible = true;
  rail.setTerminal({modern: false});
  rail.oldEnd.scale.set(1, 1, 1);
  rail.head.scale.set(1, 1, 1);
  knockPosts(rail.posts, 0, false);
  strip.setTravel(0);
  for (const s of sparks) s.setProgress(0);
  driver.card.position.copy(w.seat);
  driver.card.rotation.set(0, 0, 0);
  let carS: CarState = {x: 0, y: 0, z: -60, yaw: 0, pitch: 0, roll: 0, dist: 0, steer: 0, wheel: 0, visible: false};
  let fr: Frame = {pos: [0, 5, 0], look: [0, 0, 10], fov: 40, cInf: 0};
  const sparkAt = (i: number, p: number[], prog: number) => { sparks[i].root.position.set(p[0], p[1], p[2]); sparks[i].setProgress(prog); };

  switch (shot.id) {
    case 1: { // hook: the skid off the cliff, no rail yet
      rail.root.visible = false;
      const s = hookCar(t, g);
      carS = s;
      placeCar(w, s);
      driver.setPose('steer', false, s.wheel);
      const u = t / shot.b;
      const fall = smooth((t - BEAT.edge) / .8);
      const lk = [lerp(s.x, 3.4, .45), Math.max(s.y * .7, -2.6) - .1, s.z + 1.2];
      fr = {pos: mix3([11.6, 6.9, -1.6], [12.2, 7.4, 1.2], smooth(u)), look: lk, fov: 42, cInf: 0};
      fr.look[1] -= .3 * fall;
      break;
    }
    case 2: { // the city builds the rail: posts pop far-to-near, then the beam sweeps in, then the end
      popPosts(rail.posts, t, BEAT.posts, .06);
      const u = smooth((t - BEAT.beam) / .55);
      rail.setBeam({start: lerp(27.9, 0, u)});
      rail.beam.visible = u > 0;
      const e = clamp01((t - BEAT.beam - .5) / .2);
      rail.oldEnd.visible = e > 0;
      rail.oldEnd.scale.setScalar(Math.max(.001, e));
      const v = (t - shot.a) / (shot.b - shot.a);
      fr = {pos: mix3([12.2, 7.4, .4], [11.6, 7.0, 1.0], v), look: mix3([3.6, -1.6, 9.2], [3.4, -1.4, 9.2], v), fov: 42, cInf: 0};
      break;
    }
    case 3: case 4: { // the glancing hit, then the slow-motion flex replay
      const tc = BEAT.sideHit;
      const tau = shot.id === 3 ? t : tc + .2 + .33 * (t - BEAT.bend);
      const s = sideCar(tau, tc, g, true);
      carS = s;
      placeCar(w, s);
      rail.setBeam({flex: s.flex, contact: s.contact});
      const d = tau - tc;
      const cp = [RAIL_X + roadCenter(s.contact) - .1, .7, s.contact];
      if (d > 0 && d < .7) sparkAt(0, cp, d / .7);
      driver.setPose(d > 0 && d < 1.2 ? 'brace' : 'steer', false, s.wheel);
      if (shot.id === 3 && t < 7.15) {
        // driver-side window, tracking: the camera rides beside the car on the drop side
        const u = (t - shot.a) / (7.15 - shot.a);
        fr = {pos: carPt(w, [lerp(3.3, 3.0, u), 1.42, lerp(.9, .5, u)]), look: carPt(w, [.25, 1.12, -.05]), fov: 38, cInf: 10, focus: carPt(w, [.35, 1.15, .1])};
      } else if (shot.id === 3) {
        const u = smooth((t - 7.15) / (shot.b - 7.15));
        const follow = [s.x + .4, .5, s.z + 1.2];
        fr = {pos: mix3([7.3, 3.5, 1.6], [7.4, 3.6, 8.6], u), look: mix3([2.9, .5, 5.8], follow, smooth((t - 7.3) / 1.2)), fov: 40, cInf: 0, shake: kick(t, tc, .012)};
      } else {
        const z0 = s.contact;
        const rx = RAIL_X + roadCenter(z0);
        const u = (t - shot.a) / (shot.b - shot.a);
        fr = {pos: [rx + .95, 1.55, z0 + lerp(4.3, 3.9, u)], look: [rx - .35, .55, z0 - .4], fov: 38, cInf: 10, focus: [rx, .68, z0], shake: kick(tau, tc, .008)};
      }
      break;
    }
    case 5: case 6: { // the old blunt end spears the car; then inside the cabin on the impact
      const tt = shot.id === 5 ? t : t - (shot.a + .26) + BEAT.spear;
      const s = oldEndCar(tt, sedan.front);
      carS = s;
      for (const c of rail.posts.children) if ((c.userData.base ?? c.position).z < 2) c.visible = false; // the first post would sit inside the car
      const d = tt - BEAT.spear;
      if (d > 0 && d < .6) sparkAt(0, [RAIL_X, .66, -.1], d / .6);
      const jolt = d < 0 ? 0 : Math.sin(Math.PI * clamp01(d / .32)) * Math.exp(-Math.max(0, d - .16) * 3);
      driver.card.position.z += .14 * jolt;
      driver.card.position.y -= .03 * jolt;
      driver.setPose(d < 0 ? 'steer' : 'brace', shot.id === 6, d < 0 ? .18 * Math.sin(tt * 4) : -.1);
      placeCar(w, s);
      if (shot.id === 5 && t < 15.45) {
        const u = (t - shot.a) / (15.45 - shot.a);
        fr = {pos: carPt(w, [lerp(.0, .1, u), 1.45, sedan.front + lerp(3.6, 3.1, u)]), look: carPt(w, [.3, 1.08, .1]), fov: 34, cInf: 10, focus: carPt(w, [.35, 1.15, .1])};
      } else if (shot.id === 5) {
        const u = (t - 15.45) / (shot.b - 15.45);
        fr = {pos: [lerp(3.05, 3.0, u), 1.02, lerp(5.0, 4.6, u)], look: [2.95, .6, -3.0], fov: 36, cInf: 8, focus: [RAIL_X, .68, -.1], shake: kick(t, BEAT.spear, .02)};
      } else {
        const u = (t - shot.a) / (shot.b - shot.a);
        fr = {pos: carPt(w, [-.42, 1.24, lerp(-1.05, -.95, u)]), look: carPt(w, [.38, .78, .4]), fov: 56, cInf: 12, focus: carPt(w, [.35, 1.1, .1]), shake: kick(tt, BEAT.spear, .015)};
      }
      break;
    }
    case 7: { // the new rail end: swap in the impact head, push in to its broad face
      const sw = clamp01((t - BEAT.swap) / .2);
      const pop = clamp01((t - BEAT.swap - .12) / .35);
      rail.setTerminal({modern: pop > 0, travel: 0});
      rail.oldEnd.visible = sw < 1;
      rail.oldEnd.scale.setScalar(Math.max(.001, 1 - sw));
      const k = pop <= 0 ? .001 : pop >= 1 ? 1 : 1 + 2.70158 * (pop - 1) ** 3 + 1.70158 * (pop - 1) ** 2;
      rail.head.scale.setScalar(Math.max(.001, k));
      const u = smooth((t - shot.a) / (shot.b - shot.a - .1));
      fr = {pos: mix3([3.0, 1.02, 4.6], [2.15, .85, -1.95], u), look: mix3([2.95, .6, -3.0], [RAIL_X, .63, .1], u), fov: 40, cInf: lerp(6, 11, u), focus: [RAIL_X, .64, -.2]};
      // the old car is gone; the camera now faces up the rail toward its end from the approach side
      break;
    }
    case 8: case 9: case 10: {
      const T = travel(t);
      rail.setTerminal({modern: true, travel: T, open: shot.id === 9});
      // cutaway: drop the upper guide plate so the throat (where the beam is squeezed flat) shows
      const cut = rail.head.children.find(c => c instanceof THREE.Group && c.children.length === 4);
      if (cut) cut.children[3].visible = shot.id !== 9;
      knockPosts(rail.posts, T, true);
      strip.setTravel(T);
      const s = terminalCar(t, sedan.front);
      carS = s;
      const hx = RAIL_X + roadCenter(T);
      const d = t - BEAT.hit;
      if (d > 0 && d < .55) sparkAt(0, [hx - .1, .62, T - .25], d / .55);
      if (shot.id === 10 && t > 36.55) {
        driver.setPose(t < BEAT.peek ? 'brace' : 'peek', true, -.05);
      } else driver.setPose(d < 0 ? 'steer' : 'brace', d > 0, -.05);
      placeCar(w, s);
      if (shot.id === 8) {
        const u = (t - shot.a) / (shot.b - shot.a);
        const hz = Math.max(T, 0);
        const camZ = lerp(-.4, 2.6, smooth(u)) - .3;
        fr = {pos: [RAIL_X + roadCenter(Math.max(0, camZ)) + 4.6, 1.5, camZ - .4], look: [hx - .4, .5, lerp(-.2, hz, .85) + .3], fov: 38, cInf: 5, focus: [hx, .62, hz], shake: kick(t, BEAT.hit, .018)};
      } else if (shot.id === 9) {
        const u = smooth((t - shot.a) / (shot.b - shot.a));
        fr = {pos: [hx + lerp(1.45, 1.25, u), lerp(2.3, 2.1, u), T + lerp(2.0, 1.75, u)], look: [hx + .12, .5, T + .05], fov: 40, cInf: 8, focus: [hx + .2, .6, T + .2]};
      } else if (t <= 36.55) {
        const u = smooth((t - shot.a) / (36.55 - shot.a));
        const hz = Math.max(T, 0);
        fr = {pos: mix3([hx + 1.25, 2.1, hz + 1.75], [RAIL_X + 7.5, 5.2, TRAVEL_END + 5.5], u), look: mix3([hx + .12, .5, hz + .05], [RAIL_X - .4, .1, TRAVEL_END - 1.6], u), fov: 40, cInf: lerp(9, 0, u)};
      } else {
        const u = (t - 36.55) / (shot.b - 36.55);
        fr = {pos: carPt(w, [lerp(.2, .24, u), 1.62, sedan.front + lerp(1.15, .95, u)]), look: carPt(w, [.33, 1.22, .05]), fov: 30, cInf: 12, focus: carPt(w, [.35, 1.18, .1])};
      }
      break;
    }
  }
  if (shot.id === 2 || shot.id === 7) placeCar(w, carS);
  return fr;
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
