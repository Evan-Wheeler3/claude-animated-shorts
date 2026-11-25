// black-tires (Quick Why): 10 shots, two sets (a country road and a rubber-mixing bench), every prop built in code.
// Picture only; run_mac.sh muxes audio/mix.m4a.  Shots start on their words: src/anchors.json + ../voice/words.json.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {GradeEffect, GRADES} from '../../../../templates/bridge/grade';
import {fxPuff} from '../../../../templates/bridge/toon';
import {Card, faceCards} from './kit/cards';
import {skyDome} from './kit/look';
import {FPS, SHOTS, TOTAL, kick, lerp, lerp3, shotAt, smooth, tw} from './story';

export const TIRE_FRAMES = TOTAL;
const WHITE = '#f1ead8', BLACK = '#2b2b30', CREAM = '#efe3c4';
const lam = (col: string) => new THREE.MeshLambertMaterial({color: col});
const T = (line: string, i = 0) => Math.round(tw(line, i) * FPS);

// ---------- props ----------
/** a tyre on its wheel, rolling about local Z (axle along Z), resting on y = 0. old = wooden spokes, else alloy rim */
const tire = (col: string, old: boolean) => {
  const R = .34, r = .095, W = .2;
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const mat = lam(col);
  const pts: THREE.Vector2[] = [];   // rounded-rect profile: x = radius, y = width
  for (let i = 0; i <= 32; i++) { const a = -Math.PI / 2 + 2 * Math.PI * i / 32; pts.push(new THREE.Vector2(R - r + r * Math.cos(a), W / 2 * Math.sin(a))); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mat); body.rotation.x = Math.PI / 2; body.castShadow = body.receiveShadow = true; spin.add(body);
  const tread: THREE.Mesh[] = [];
  for (let i = 0; i < 36; i++) { const a = 2 * Math.PI * i / 36; const b = new THREE.Mesh(new THREE.BoxGeometry(.016, .036, W * .72), mat);
    b.position.set((R + .002) * Math.cos(a), (R + .002) * Math.sin(a), 0); b.rotation.z = a; b.castShadow = true; spin.add(b); tread.push(b); }
  const hubR = R - 2 * r + .012;
  if (old) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(hubR, .02, 8, 48), lam('#7a4a2a')); spin.add(rim);
    for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(hubR * 2, .03, .03), lam('#8a5a32')); s.rotation.z = Math.PI * i / 10; spin.add(s); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .1, 20), lam('#3a2a20')); hub.rotation.x = Math.PI / 2; spin.add(hub);
  } else {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(hubR, hubR, W * .7, 40), lam('#c9ced6')); disc.rotation.x = Math.PI / 2; spin.add(disc);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(hubR * .9, .05, W * .74), lam('#9aa2ae')); s.position.set(Math.cos(i * 1.2566) * hubR * .45, Math.sin(i * 1.2566) * hubR * .45, 0); s.rotation.z = i * 1.2566; spin.add(s); }
  }
  spin.position.y = R + .011;
  return {g, spin, tread, mat, R: R + .011};
};
/** the cut face of a tyre: a ring, with a black wedge growing to `frac` of it (40 % carbon black) */
const sliceRing = (frac: number) => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.RingGeometry(.2, .34, 64), lam(CREAM)); g.add(base);
  const wedge = new THREE.Mesh(new THREE.RingGeometry(.2, .34, 64, 1, Math.PI / 2, -2 * Math.PI * Math.max(.001, frac)), lam(BLACK)); wedge.position.z = .002; g.add(wedge);
  return {g, set: (f: number) => { wedge.geometry.dispose(); wedge.geometry = new THREE.RingGeometry(.2, .34, 64, 1, Math.PI / 2, -2 * Math.PI * Math.max(.001, f)); }};
};
/** falling powder: n little spheres cycling from a spout down into the tub */
const powder = (col: string, n = 60) => {
  const g = new THREE.Group(); const m = lam(col);
  const ps = Array.from({length: n}, (_, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.008 + (i % 3) * .003, 8, 6), m); g.add(s); return s; });
  return {g, at: (t: number, on: number) => ps.forEach((s, i) => { const k = (t * .9 + i / n) % 1; s.visible = on > 0 && k < on;
    s.position.set(.03 * Math.sin(i * 2.3) * k, .55 - .5 * k * k, .03 * Math.cos(i * 1.7) * k); })};
};
const card = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, dw = 300, dh = 300) => { const c = new Card(h, 1, dw, dh, false); c.draw((_p, g) => draw(g)); c.mesh.scale.set(w, h, 1); return c; };
const heatArrow = (g: CanvasRenderingContext2D) => { g.strokeStyle = '#ff7a2a'; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(150, 280); g.bezierCurveTo(90, 210, 210, 150, 150, 70); g.stroke();
  g.fillStyle = '#ff7a2a'; g.beginPath(); g.moveTo(150, 20); g.lineTo(105, 90); g.lineTo(195, 90); g.closePath(); g.fill(); };

// ---------- sets ----------
type Ctx = {scene: THREE.Scene; camera: THREE.PerspectiveCamera; look: number[]; dof: number};
const cam = (c: Ctx, p: number[], t: number[], fov = 40, roll = 0) => { c.look = t; c.camera.fov = fov; c.camera.updateProjectionMatrix();
  c.camera.position.set(p[0], p[1], p[2]); c.camera.lookAt(t[0], t[1], t[2]); if (roll) c.camera.rotateZ(roll * Math.PI / 180); };
const glide = (c: Ctx, A: number[][], B: number[][], u: number, fov = 40, roll = 0) => cam(c, lerp3(A[0], B[0], smooth(u)), lerp3(A[1], B[1], smooth(u)), fov, roll);
const road = (c: Ctx) => { skyDome(c.scene, 'day');
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lam('#7f9a5a')); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; c.scene.add(grass);
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(400, 3.2), lam('#b59a74')); rd.rotation.x = -Math.PI / 2; rd.position.y = .005; rd.receiveShadow = true; c.scene.add(rd);
  for (let i = 0; i < 14; i++) { const t = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, 2, 8), lam('#5a3b2a')); tr.position.y = 1;
    const cr = new THREE.Mesh(new THREE.SphereGeometry(1.1 + (i % 3) * .3, 14, 10), lam(['#5d7a3a', '#6b8a40', '#4f6e34'][i % 3])); cr.position.y = 2.6;
    [tr, cr].forEach(m => { m.castShadow = true; t.add(m); }); t.position.set(-30 + i * 4.6, 0, -6 - (i % 3) * 3); c.scene.add(t); }
  c.scene.add(new THREE.HemisphereLight('#cfe0ff', '#7a6650', 1.3));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.8); sun.position.set(-6, 10, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -8, right: 8, top: 8, bottom: -8}); c.scene.add(sun); };
const lab = (c: Ctx) => { c.scene.background = new THREE.Color('#e9dcc2');
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), lam('#d9c9a8')); wall.position.set(0, 2, -1.2); wall.receiveShadow = true; c.scene.add(wall);
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, .08, 1), lam('#8a5a32')); benchTop.position.set(0, .86, -.5); benchTop.receiveShadow = benchTop.castShadow = true; c.scene.add(benchTop);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), lam('#7a5a3a')); floor.rotation.x = -Math.PI / 2; c.scene.add(floor);
  c.scene.add(new THREE.HemisphereLight('#ffffff', '#b8a080', 1.3));
  const key = new THREE.DirectionalLight('#fff1d6', 2.4); key.position.set(-2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); c.scene.add(key);
  return .9; };
/** mixing tub on the bench with a rubber "dough" whose colour can change */
const tub = (c: Ctx, top: number) => {
  const pts = [new THREE.Vector2(.0, 0), new THREE.Vector2(.22, 0), new THREE.Vector2(.26, .2), new THREE.Vector2(.25, .21), new THREE.Vector2(.21, .015), new THREE.Vector2(0, .015)];
  const t = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), lam('#8a96a8')); t.position.set(0, top, -.4); t.castShadow = true; c.scene.add(t);
  const dough = new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lam(CREAM)); dough.scale.set(1, .45, 1); dough.position.set(0, top + .06, -.4); c.scene.add(dough);
  return dough; };

// ---------- shots ----------
type Upd = (f: number, l: number, u: number) => void;
const B: Record<number, (c: Ctx) => Upd> = {
  // 1 frame 1: a white tyre on a wooden-spoked wheel rolls down a country road toward us
  1: c => { road(c); const w = tire(WHITE, true); c.scene.add(w.g);
    return (f, l, u) => { const x = lerp(-4, -.3, u); w.g.position.set(x, 0, 0); w.spin.rotation.z = -x / w.R;
      c.dof = 6; cam(c, [1.4, .55, 1.6], [x * .5, .35, 0], 40); }; },
  // 2 "They were white!": the bright white tread up close, push in
  2: c => { road(c); const w = tire(WHITE, true); c.scene.add(w.g);
    return (f, l, u) => { w.spin.rotation.z = -.05 * l; c.dof = 10; glide(c, [[.9, .5, .9], [0, .34, 0]], [[.6, .45, .6], [0, .34, 0]], u, 38); }; },
  // 3 rubber is naturally creamy white: a lump of raw rubber in the mixing tub
  3: c => { const top = lab(c); tub(c, top);
    return (f, l, u) => { c.dof = 8; glide(c, [[0, top + .55, .7], [0, top + .05, -.4]], [[0, top + .45, .5], [0, top + .05, -.4]], u, 38); }; },
  // 4 "a white powder for grip": white powder pours in
  4: c => { const top = lab(c); tub(c, top); const p = powder('#ffffff'); p.g.position.set(0, top + .06, -.4); c.scene.add(p.g);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(.16, .22, .1), lam('#f4f1ea')); bag.position.set(0, top + .7, -.4); bag.rotation.z = 2.2; c.scene.add(bag);
    return (f, l, u) => { p.at(l / FPS, 1); c.dof = 8; cam(c, [0, top + .5, .6], [0, top + .25, -.4], 40); }; },
  // 5 "white tires wore out fast": time-lapse: the tread wears to bald, then the tyre sags flat with a puff
  5: c => { road(c); const w = tire(WHITE, true); c.scene.add(w.g);
    const puff = card(.8, .8, () => undefined); puff.mesh.position.set(0, .05, .1); c.scene.add(puff.mesh);
    const pop = T('L03', 5);
    return (f, l, u) => { w.spin.rotation.z = -.35 * l; const wear = smooth((f - (pop - 30)) / 26);
      w.tread.forEach((b, i) => { b.scale.set(1, Math.max(.05, 1 - wear * (1.1 - .2 * (i % 3))), 1); });
      const flat = smooth((f - pop) / 5); w.g.scale.set(1, 1 - .12 * flat, 1);
      const pt = (f - pop) / 14; puff.mesh.visible = pt > 0 && pt < 1; if (puff.mesh.visible) puff.draw(p => fxPuff(p, pt));
      c.dof = 8; cam(c, [.75 + .02 * kick(f - pop), .4, .9], [0, .3, 0], 40); }; },
  // 6 carbon black (basically soot) pours in; the creamy rubber turns black
  6: c => { const top = lab(c); const dough = tub(c, top); const p = powder('#1a1a1e', 90); p.g.position.set(0, top + .06, -.4); c.scene.add(p.g);
    const soot = Array.from({length: 12}, (_, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.018 + .008 * (i % 3), 10, 8), new THREE.MeshLambertMaterial({color: '#222226', transparent: true, opacity: .45})); s.layers.set(NOINK); c.scene.add(s); return s; });
    const col = new THREE.Color(CREAM), blk = new THREE.Color(BLACK);
    return (f, l, u) => { p.at(l / FPS, 1); (dough.material as THREE.MeshLambertMaterial).color.copy(col).lerp(blk, smooth(u * 2.2));
      soot.forEach((s, i) => { const k = ((l / FPS) * .6 + i / 12) % 1; s.position.set(.18 * Math.sin(i * 2.1) * k, top + .16 + .2 * k, -.4 + .15 * Math.cos(i * 1.3) * k); s.scale.setScalar(.6 + k); });
      c.dof = 8; cam(c, [0, top + .5, .6], [0, top + .2, -.4], 40); }; },
  // 7 tougher, cooler: a black tyre spins hard; red heat glow on the tread drains away as heat arrows rise off it
  7: c => { road(c); const w = tire(BLACK, false); c.scene.add(w.g);
    const glow = w.tread.map(b => { const m = new THREE.Mesh(new THREE.BoxGeometry(.017, .037, .146), new THREE.MeshBasicMaterial({color: '#ff5a2a', transparent: true, opacity: .8, toneMapped: false})); m.layers.set(NOINK); b.add(m); return m; });
    const arrows = [0, 1, 2].map(i => { const a = card(.18, .18, heatArrow); c.scene.add(a.mesh); return a; });
    return (f, l, u) => { w.spin.rotation.z = -.5 * l; const cool = smooth(u * 1.4);
      glow.forEach(m => { (m.material as THREE.MeshBasicMaterial).opacity = .8 * (1 - cool); });
      arrows.forEach((a, i) => { const k = ((l / FPS) * .8 + i / 3) % 1; a.mesh.position.set(-.25 + i * .25, .7 + .5 * k, .1); a.mesh.visible = cool > .05 && cool < .98; });
      c.dof = 8; cam(c, [.9, .55, 1.1], [0, .38, 0], 40); }; },
  // 8 "up to forty percent carbon black": the cut face of a tyre fills black to 40 %
  8: c => { const top = lab(c); const s = sliceRing(0); s.g.position.set(0, top + .45, -.6); c.scene.add(s.g);
    return (f, l, u) => { s.set(.4 * smooth((f - T('L06', 7) + 4) / 18)); c.dof = 4; cam(c, [0, top + .45, 1.0], [0, top + .45, -.6], 40); }; },
  // 9 "So tires are not black for style": a row of modern black tyres rolls past
  9: c => { road(c); const ws = [0, 1, 2, 3, 4].map(() => { const w = tire(BLACK, false); c.scene.add(w.g); return w; });
    return (f, l, u) => { ws.forEach((w, i) => { const x = -5 + i * 1.2 + 3 * u; w.g.position.set(x, 0, -.2 + (i % 2) * .5); w.spin.rotation.z = -x / w.R; });
      c.dof = 0; glide(c, [[1.2, .9, 6.5], [-1.5, .4, 0]], [[1.0, .9, 6.0], [-.3, .4, 0]], u, 40); }; },
  // 10 payoff: the bald white tyre wobbles and topples beside the black one, which rolls on
  10: c => { road(c); const old = tire(WHITE, true); old.tread.forEach(b => b.scale.y = .05); old.g.position.set(-.5, 0, 0); c.scene.add(old.g);
    const neu = tire(BLACK, false); c.scene.add(neu.g); const tip = T('L07', 14);
    return (f, l, u) => { neu.g.position.set(.5 + .8 * u, 0, 0); neu.spin.rotation.z = -(.5 + .8 * u) / neu.R;
      const k = smooth((f - tip + 8) / 14); old.g.rotation.x = -1.45 * k * k; old.g.rotation.z = .05 * Math.sin(l * .6) * (1 - k);
      c.dof = 4; cam(c, [.4, .7, 3.6], [.2, .35, 0], 40); }; },
};

export const TiresShort: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const st = useRef<{renderer?: THREE.WebGLRenderer; pic?: number; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; composer?: EffectComposer; upd?: Upd; ctx?: Ctx; lens?: LensBlur}>({});
  const [, force] = useState(0);
  useLayoutEffect(() => () => { st.current.composer?.dispose(); st.current.renderer?.dispose(); }, []);
  useLayoutEffect(() => {
    const S = st.current;
    if (!S.renderer) { S.renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
      S.renderer.setSize(width, height, false); S.renderer.shadowMap.enabled = true; S.renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    const shot = shotAt(frame);
    if (S.pic !== shot.pic) {
      S.composer?.dispose(); S.lens?.dispose();
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, width / height, .02, 3000); camera.layers.enable(NOINK);
      const ctx: Ctx = {scene, camera, look: [0, 0, 0], dof: 0};
      S.upd = B[shot.pic](ctx);
      const composer = new EffectComposer(S.renderer, {multisampling: 4, frameBufferType: THREE.HalfFloatType});
      composer.addPass(new RenderPass(scene, camera)); composer.addPass(new InkPass(scene, camera, {distFar: 120}));
      const lens = new LensBlur({maxCoC: 24, nearScale: 1.2});
      composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main));
      composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), new GradeEffect(GRADES.day, .85)));
      Object.assign(S, {pic: shot.pic, scene, camera, composer, ctx, lens});
    }
    const local = frame - shot.a;
    S.upd!(frame, local, local / Math.max(1, shot.b - shot.a - 1));
    S.lens!.focus = S.camera!.position.distanceTo(new THREE.Vector3(...S.ctx!.look)); S.lens!.cInf = S.ctx!.dof;
    S.camera!.updateMatrixWorld(); S.scene!.updateMatrixWorld(true); faceCards(S.scene!, S.camera!);
    S.composer!.render();
    void force;
  }, [frame, width, height]);
  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
export {SHOTS};
