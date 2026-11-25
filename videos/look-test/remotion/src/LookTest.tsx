// LOOK TEST for the upgraded renderer (owner reference: a lush stylised-3D field with 2D characters + read-along captions).
// What changed vs the Hold Up kit: real CC0 library assets (Poly Haven, fetched by tools/assets/polyhaven.py), PBR
// materials kept as authored, HDRI sky lighting (image-based light) + sun shadows, ambient occlusion (N8AO), soft
// bloom, AgX tone mapping, instanced grass blades, NO ink outlines on the world (characters keep their drawn outline),
// and burned-in word-by-word captions driven by voice/words.json.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect} from 'postprocessing';
import {N8AOPostPass} from 'n8ao';
import {NOINK} from '../../../../templates/bridge/ink';
import {LensBlur} from '../../../../templates/bridge/lensblur';
import {bodyFront, type Outfit, type Pen} from '../../../../templates/bridge/toon';
import {Card, faceCards} from './kit/cards';
import {skyDome} from './kit/look';

// Lilita One (SIL Open Font License), served locally from assets/library/fonts (the headless render browser has no internet)
const fontFamily = 'LilitaOneLocal';
if (typeof document !== 'undefined' && !document.getElementById('lilita')) { const st = document.createElement('style'); st.id = 'lilita';
  st.textContent = `@font-face{font-family:'${fontFamily}';src:url('${staticFile('fonts/LilitaOne.woff2')}') format('woff2');}`; document.head.appendChild(st); }
export const LOOK_TEST_FRAMES = 3;
const IDS = ['island-tree-02', 'tree-small-02', 'shrub-03', 'shrub-04', 'dandelion-01', 'flower-gazania', 'tree-stump-01', 'boulder-01'] as const;
type Lib = Record<typeof IDS[number], THREE.Group>;

// our own cast (not copied from the reference channel)
const FARMER: Outfit = {jacket: '#e0a23a', pants: '#4a3a2a', boots: '#3a2a20', hat: 'cap', cap: '#2f6b3a', buttons: '#f4f1ea', skin: '#ffe2c2'};
const BARON: Outfit = {jacket: '#3b5b9a', pants: '#2b2b33', boots: '#1d1a1a', hat: 'tophat', buttons: '#e8c45a', moustache: '#4a3020', build: 'stout'};

const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** instanced grass: tapered, bent blades with a dark-root to sunlit-tip gradient, scattered on a rect avoiding the path */
const grass = (n: number, x0: number, x1: number, z0: number, z1: number, avoid: (x: number, z: number) => boolean) => {
  const geo = new THREE.PlaneGeometry(.035, .16, 1, 3); geo.translate(0, .08, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute, col: number[] = [];
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / .16; pos.setX(i, pos.getX(i) * (1 - y * .9)); pos.setZ(i, .03 * y * y);
    const c = new THREE.Color('#1a5a14').lerp(new THREE.Color('#6cbf2e'), y); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .75}), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (let i = 0; k < n && i < n * 3; i++) { const x = x0 + (x1 - x0) * rnd(i, 1), z = z0 + (z1 - z0) * rnd(i, 2); if (avoid(x, z)) continue;
    e.set((rnd(i, 3) - .5) * .5, rnd(i, 4) * 6.28, (rnd(i, 5) - .5) * .5); q.setFromEuler(e);
    const s = .6 + .5 * rnd(i, 6); m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (.6 + .5 * rnd(i, 7)), s)); mesh.setMatrixAt(k++, m); }
  mesh.count = k; mesh.receiveShadow = true; return mesh;
};
/** small cartoon flowers (red / yellow / white) as instanced discs on stems */
const flowers = (n: number, x0: number, x1: number, z0: number, z1: number) => {
  const g = new THREE.Group();
  [['#e2332a', .045], ['#f2c23a', .035], ['#f4f1ea', .03]].forEach(([c, r], j) => {
    const head = new THREE.InstancedMesh(new THREE.CircleGeometry(r as number, 10), new THREE.MeshStandardMaterial({color: c as string, side: THREE.DoubleSide, roughness: .6}), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { let x = x0 + (x1 - x0) * rnd(i + j * 999, 8); const z = z0 + (z1 - z0) * rnd(i + j * 999, 9); if (Math.abs(x - (-.6 + .9 * Math.sin(z * .18))) < .6) x += 1.4 * Math.sign(x - (-.6 + .9 * Math.sin(z * .18)) || 1);
      q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (rnd(i, 10) - .5), rnd(i, 11) * 6, 0)); m.compose(new THREE.Vector3(x, .2 + .15 * rnd(i, 12), z), q, new THREE.Vector3(1, 1, 1)); head.setMatrixAt(i, m); }
    g.add(head); });
  return g;
};

export const LookTest: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [ready, setReady] = useState<{lib: Lib; env: THREE.DataTexture} | null>(null);
  const [handle] = useState(() => delayRender('assets'));
  const [fh] = useState(() => delayRender('font'));
  useLayoutEffect(() => { document.fonts.load(`120px ${fontFamily}`).then(() => continueRender(fh)).catch(() => continueRender(fh)); }, [fh]);
  useLayoutEffect(() => {
    const L = new GLTFLoader();
    Promise.all([Promise.all(IDS.map(id => L.loadAsync(staticFile(`${id}.glb`)).then(g => [id, g.scene] as const))), new RGBELoader().loadAsync(staticFile('meadow_2.hdr'))])
      .then(([a, env]) => { setReady({lib: Object.fromEntries(a) as Lib, env}); continueRender(handle); })
      .catch(e => { console.error(e); continueRender(handle); });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready) return;
    const {lib, env} = ready;
    const renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
    renderer.setSize(width, height, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, width / height, .05, 3000); camera.layers.enable(NOINK);
    // sky + image-based light from the HDRI
    env.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(env).texture; scene.environmentIntensity = .9;
    skyDome(scene, 'day'); scene.fog = new THREE.Fog('#b9d3e8', 60, 260);
    const sun = new THREE.DirectionalLight('#fff1d8', 3.2); sun.position.set(-12, 18, 10); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, {left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    scene.add(sun);
    const all = (o: THREE.Object3D) => { o.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
    // ground: meadow + a worn dirt path curving from the camera into the field
    const pathX = (z: number) => -.6 + .9 * Math.sin(z * .18);
    const onPath = (x: number, z: number) => Math.abs(x - pathX(z)) < .45;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: '#3f8a22', roughness: .95})); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const pts = Array.from({length: 30}, (_, i) => { const z = 6 - i * .9; return new THREE.Vector3(pathX(z), .01, z); });
    const path = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .5, 8), new THREE.MeshStandardMaterial({color: '#9a7a52', roughness: 1}));
    path.scale.y = .02; path.receiveShadow = true; scene.add(path);
    scene.add(grass(220000, -6, 6, -9, 6, onPath));
    scene.add(flowers(260, -5, 5, -6, 5.5));
    // crop rows rising up a gentle slope behind the fence (shrubs as potato plants)
    const hill = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.MeshStandardMaterial({color: '#3f7f20', roughness: 1})); hill.position.set(6, -38.2, -18); hill.receiveShadow = true; scene.add(hill);
    for (let r = 0; r < 9; r++) for (let i = 0; i < 16; i++) { const s = lib[i % 2 ? 'shrub-03' : 'shrub-04'].clone(true); const x = 1 + i * .75 + .2 * rnd(r * 31 + i, 1), z = -6 - r * 1.1;
      const y = Math.max(0, 1.8 - Math.hypot(x - 6, z + 18) * 0) * 0 + (r * .22); s.position.set(x, y, z); s.rotation.y = rnd(r * 31 + i, 2) * 6; s.scale.setScalar(.9 + .3 * rnd(r, i)); scene.add(all(s)); }
    // rope fence along the field edge
    for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 1, 8), new THREE.MeshStandardMaterial({color: '#7a5a3a', roughness: .9})); p.position.set(.3 + i * 1.6, .5, -4.6 + i * .05); all(p); scene.add(p); }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length: 9}, (_, i) => new THREE.Vector3(.3 + i * 1.6, .82, -4.6 + i * .05))), 80, .02, 6), new THREE.MeshStandardMaterial({color: '#c9a66b', roughness: .9}));
    scene.add(all(rope));
    // hero tree, stump, rock, wildflowers
    const tree = lib['tree-small-02'].clone(true); tree.position.set(-1.4, 0, -5.5); tree.scale.setScalar(1.3); scene.add(all(tree));
    const t2 = lib['island-tree-02'].clone(true); t2.position.set(-9, 0, -16); t2.rotation.y = 2; scene.add(all(t2));
    const stump = lib['tree-stump-01'].clone(true); stump.position.set(-2.6, 0, 1.2); scene.add(all(stump));
    const rock = lib['boulder-01'].clone(true); rock.position.set(2.2, 0, 2.6); rock.scale.setScalar(.35); scene.add(all(rock));
    for (let i = 0; i < 24; i++) { const f = lib[i % 2 ? 'dandelion-01' : 'flower-gazania'].clone(true); const fz = -2 + 6 * rnd(i, 22); f.position.set(pathX(fz) + (i % 2 ? 1 : -1) * (.8 + 2.5 * rnd(i, 21)), 0, fz); f.scale.setScalar(1.4); f.rotation.y = rnd(i, 23) * 6; scene.add(all(f)); }
    // two of OUR characters (2D cards), standing on the path
    const card = (o: Outfit, seed: number, opts: Parameters<typeof bodyFront>[2]) => new Card(o.build === 'stout' ? 1.8 : 1.72, .7).draw((p: Pen) => bodyFront(p, o, {mode: 'stand', seed, ...opts}));
    const a = card(FARMER, 5, {expr: 'stern', look: .5}); a.mesh.position.set(pathX(3.3) - .55, 0, 3.3); scene.add(a.mesh);
    const b = card(BARON, 9, {expr: 'grin', look: -.4}); b.mesh.position.set(pathX(1.2) + .3, 0, 1.2); scene.add(b.mesh);
    // camera: eye level, slightly low, like the reference
    camera.position.set(.2, 1.35, 7.4); camera.lookAt(-.4, 1.3, 0); camera.updateMatrixWorld(); scene.updateMatrixWorld(true); faceCards(scene, camera);
    // post: AO -> bloom -> AgX tone map -> vignette -> lens blur (shallow, focus on the front character)
    const composer = new EffectComposer(renderer, {frameBufferType: THREE.HalfFloatType});
    composer.addPass(new RenderPass(scene, camera));
    const ao = new N8AOPostPass(scene, camera, width, height); ao.configuration.aoRadius = 1.2; ao.configuration.distanceFalloff = .6; ao.configuration.intensity = 2.5; composer.addPass(ao);
    const lens = new LensBlur({maxCoC: 14, nearScale: 1.0}); lens.focus = camera.position.distanceTo(a.mesh.position); lens.cInf = 5;
    composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main));
    composer.addPass(new EffectPass(camera, new BloomEffect({intensity: .35, luminanceThreshold: .85, mipmapBlur: true}), new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC}), new VignetteEffect({darkness: .35, offset: .3})));
    composer.render();
    return () => { composer.dispose(); renderer.dispose(); pm.dispose(); };
  }, [frame, width, height, ready]);
  const word = ['first', 'stares.', 'white!'][frame % 3];
  return <AbsoluteFill>
    <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '30%'}}>
      <div style={{fontFamily, fontSize: 120, color: '#ffffff', WebkitTextStroke: '14px #111', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', letterSpacing: 1}}>{word}</div>
    </AbsoluteFill>
  </AbsoluteFill>;
};
