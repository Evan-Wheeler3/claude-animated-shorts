// Stage-3 asset acceptance: rough stills of every Codex GLB in our look (bridge ink pass, Lambert shading, day light),
// next to a 1.75 m toon sailor for scale and at the closest framing SHOTLIST.md uses. One frame = one view (see VIEWS).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {EffectComposer, RenderPass} from 'postprocessing';
import {InkPass, NOINK} from '../../../../templates/bridge/ink';
import {Pen, bodyFront, soldier, type Outfit} from '../../../../templates/bridge/toon';

const FILES = ['vasa', 'cannon-24pdr', 'rowboat', 'quay-segment', 'tre-kronor-castle', 'barrel', 'crate', 'rope-coil',
  'inquiry-table', 'inquiry-bench', 'salvage-pontoon-crane'] as const;
type Id = typeof FILES[number];
type Lib = Record<Id, THREE.Group>;

export const WATER_Y = 5.5;          // stylised waterline for the keel-at-0 Vasa
export const DECK_Y = 12.52;         // weather deck (raycast)

// 1628 sailors: no uniform: linen shirt, woollen doublet, knee-breeches (research/vasa)
const SAILOR: Outfit = {jacket: '#7a5a3a', pants: '#4a4f5a', boots: '#3a2a20', hat: 'hair', hair: '#5a3b2a', belt: null, rifle: false};
const sailor = (seed: number, look = 0): THREE.Mesh => {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 1000;
  const g = c.getContext('2d')!;
  bodyFront(new Pen(g), {...soldier(seed % 3), ...SAILOR, jacket: ['#7a5a3a', '#8a3b2e', '#4d5e3a'][seed % 3]}, {mode: 'stand', expr: 'neutral', seed, look});
  // measure the drawn figure so the card is exactly 1.75 m tall
  const d = g.getImageData(0, 0, 600, 1000).data;
  let top = 1000;
  for (let y = 0; y < 1000 && top === 1000; y++) for (let x = 0; x < 600; x++) if (d[(y * 600 + x) * 4 + 3] > 128) { top = y; break; }
  const h = 1.75 * 1000 / (975 - top);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * .6, h), new THREE.MeshBasicMaterial({map: tex, alphaTest: .5, transparent: false, toneMapped: false}));
  m.geometry.translate(0, h / 2 - h * .025, 0);    // soles (y = 975 of 1000) on the ground
  m.layers.set(NOINK);
  return m;
};

const toLambert = (root: THREE.Object3D) => root.traverse(o => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const conv = (x: THREE.Material) => {
    const s = x as THREE.MeshStandardMaterial;
    const l = new THREE.MeshLambertMaterial({color: s.color, map: s.map ?? null, side: s.side, name: s.name});
    return l;
  };
  m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
  m.castShadow = m.receiveShadow = true;
});

const openLids = (ship: THREE.Object3D, row: 'lower' | 'upper' | 'all', a: number) => ship.traverse(o => {
  const r = /^gunport_lid_(port|starboard)_(lower|upper)_\d+$/.exec(o.name);
  if (r && (row === 'all' || r[2] === row)) o.rotation.z = (r[1] === 'port' ? 1 : -1) * a;  // port +z / starboard -z swing the lid up and out (measured)
});

type View = {name: string; build: (L: Lib, s: THREE.Scene) => void; cam: [number[], number[], number?]; water?: boolean};
const put = (o: THREE.Object3D, p: number[], ry = 0) => { o.position.set(p[0], p[1], p[2]); o.rotation.y = ry; return o; };
const clone = (L: Lib, id: Id) => L[id].clone(true);

export const VIEWS: View[] = [
  {name: 'vasa-portbow-34', water: true, build: (L, s) => { s.add(clone(L, 'vasa')); }, cam: [[-58, 16, -62], [0, 17, 0], 40]},
  {name: 'vasa-port-side-ws', water: true, build: (L, s) => { s.add(clone(L, 'vasa')); }, cam: [[-195, 20, 0], [0, 22, 0], 40]},
  {name: 'vasa-heel-25-port', water: true, build: (L, s) => { const v = clone(L, 'vasa'); v.rotation.z = .44; openLids(v, 'lower', 1.2); s.add(v); }, cam: [[-80, 12, -10], [0, 16, 0], 40]},
  {name: 'vasa-gunports-open-ecu', water: true, build: (L, s) => { const v = clone(L, 'vasa'); openLids(v, 'lower', 1.2); s.add(v); s.add(put(sailor(1), [-7.2, WATER_Y, 2])); }, cam: [[-17, 10.5, -6], [-5.6, 10.4, 2], 40]},
  {name: 'vasa-gunports-rest-ecu', water: true, build: (L, s) => { s.add(clone(L, 'vasa')); s.add(put(sailor(1), [-7.6, WATER_Y, 2])); }, cam: [[-17, 10.5, -6], [-5.6, 10.4, 2], 40]},
  {name: 'vasa-stern-34-high', water: true, build: (L, s) => { s.add(clone(L, 'vasa')); }, cam: [[-70, 40, 95], [0, 18, 10], 40]},
  {name: 'vasa-stern-ecu', water: true, build: (L, s) => { s.add(clone(L, 'vasa')); }, cam: [[-14, 22, 52], [0, 20, 33], 40]},
  {name: 'vasa-deck-ms-sailors', build: (L, s) => { s.add(clone(L, 'vasa')); [-2, 0, 2].forEach((x, i) => s.add(put(sailor(i), [x, DECK_Y, -2 + i]))); }, cam: [[-1, DECK_Y + 1.6, -14], [0, DECK_Y + 2.5, 4], 50]},
  {name: 'vasa-deck-overhead', build: (L, s) => { s.add(clone(L, 'vasa')); for (let i = 0; i < 12; i++) s.add(put(sailor(i), [-4 + (i % 4) * 2.6, DECK_Y, -6 + Math.floor(i / 4) * 2.2])); }, cam: [[-6, 46, 6], [0, DECK_Y, 0], 40]},
  {name: 'vasa-gundeck-interior-6.6', build: (L, s) => { const v = clone(L, 'vasa'); openLids(v, 'all', 1.2); s.add(v); s.add(put(sailor(2), [0, 6.64, -4])); s.add(put(clone(L, 'cannon-24pdr'), [-4, 6.64, -2], Math.PI / 2)); }, cam: [[1.5, 8.2, 8], [-1, 8, -6], 60]},
  {name: 'vasa-gundeck-interior-9.6', build: (L, s) => { const v = clone(L, 'vasa'); openLids(v, 'all', 1.2); s.add(v); s.add(put(sailor(2), [0, 9.64, -4])); s.add(put(clone(L, 'cannon-24pdr'), [-4, 9.64, -2], Math.PI / 2)); }, cam: [[1.5, 11.2, 8], [-1, 11, -6], 60]},
  {name: 'cannon-scale', build: (L, s) => { s.add(clone(L, 'cannon-24pdr')); s.add(put(sailor(0), [1.4, 0, .3])); }, cam: [[3.5, 1.6, 5.5], [.4, .8, 0], 40]},
  {name: 'rowboat-scale', water: true, build: (L, s) => { s.add(put(clone(L, 'rowboat'), [0, WATER_Y - .3, 0])); s.add(put(sailor(1), [0, WATER_Y - .05, 0])); }, cam: [[6, WATER_Y + 2.5, 6], [0, WATER_Y, 0], 40]},
  {name: 'quay-tiled-vasa', water: true, build: (L, s) => { for (let i = -2; i <= 2; i++) s.add(put(clone(L, 'quay-segment'), [i * 8, WATER_Y - 2.5 + 1.2, 0])); s.add(put(clone(L, 'vasa'), [0, 0, -14], Math.PI / 2)); [-3, 0, 3].forEach((x, i) => s.add(put(sailor(i + 3), [x, WATER_Y + 1.2, 1]))); }, cam: [[7, WATER_Y + 4, 14], [0, WATER_Y + 3, -2], 50]},
  {name: 'castle-background', water: true, build: (L, s) => { s.add(put(clone(L, 'tre-kronor-castle'), [0, WATER_Y, -160])); s.add(put(clone(L, 'vasa'), [40, 0, -60], Math.PI / 2)); }, cam: [[0, WATER_Y + 6, 60], [10, WATER_Y + 30, -120], 40]},
  {name: 'deck-props-scale', build: (L, s) => { s.add(put(clone(L, 'barrel'), [-1, 0, 0])); s.add(put(clone(L, 'crate'), [0, 0, -.4])); s.add(put(clone(L, 'rope-coil'), [1, 0, .2])); s.add(put(sailor(4), [2, 0, -.3])); }, cam: [[.5, 1.7, 8.5], [.5, .7, 0], 40]},
  {name: 'inquiry-room', build: (L, s) => { s.add(clone(L, 'inquiry-table')); s.add(put(clone(L, 'inquiry-bench'), [0, 0, 1.4])); [-1.2, 1.2].forEach((x, i) => s.add(put(sailor(i + 6), [x, 0, -1.2]))); }, cam: [[0, 2.2, 7], [0, .9, 0], 40]},
  {name: 'salvage-crane-vasa', water: true, build: (L, s) => { s.add(put(clone(L, 'salvage-pontoon-crane'), [-14, WATER_Y - 2, 0])); s.add(put(clone(L, 'salvage-pontoon-crane'), [14, WATER_Y - 2, 0], Math.PI)); s.add(put(clone(L, 'vasa'), [0, -3, 0])); }, cam: [[-60, WATER_Y + 12, -55], [0, WATER_Y + 6, 0], 40]},
];
export const ASSET_CHECK_FRAMES = VIEWS.length;

export const AssetCheck: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [lib, setLib] = useState<Lib | null>(null);
  const [handle] = useState(() => delayRender('glbs'));
  useLayoutEffect(() => {
    const loader = new GLTFLoader();
    Promise.all(FILES.map(f => loader.loadAsync(staticFile(`${f}.glb`)).then(g => { toLambert(g.scene); return [f, g.scene] as const; })))
      .then(all => { setLib(Object.fromEntries(all) as Lib); continueRender(handle); })
      .catch(e => { console.error(e); continueRender(handle); });
  }, [handle]);

  useLayoutEffect(() => {
    if (!lib) return;
    const v = VIEWS[frame];
    const renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#8fb6e4');
    scene.fog = new THREE.Fog('#b8d0ec', 120, 420);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
    sun.position.set(-40, 60, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {left: -60, right: 60, top: 60, bottom: -60, far: 300});
    sun.shadow.normalBias = .03;
    scene.add(new THREE.HemisphereLight('#dbe5ff', '#6d5a4d', 1.4), sun);
    if (v.water) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({color: '#2f7fae'}));
      w.rotation.x = -Math.PI / 2; w.position.y = WATER_Y; w.receiveShadow = true;
      scene.add(w);
    } else {
      const gnd = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({color: '#9a8a70'}));
      gnd.rotation.x = -Math.PI / 2; gnd.position.y = -.001; gnd.receiveShadow = true;
      scene.add(gnd);
    }
    v.build(lib, scene);
    const [p, t, fov] = v.cam;
    const camera = new THREE.PerspectiveCamera(fov ?? 40, width / height, .05, 1500);
    camera.layers.enable(NOINK);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(t[0], t[1], t[2]);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    // sailor cards turn to face the camera around Y only (stay upright)
    scene.traverse(o => { if ((o as THREE.Mesh).isMesh && o.layers.mask === 1 << NOINK) o.rotation.y = Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z); });
    const composer = new EffectComposer(renderer, {multisampling: 4});
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new InkPass(scene, camera));
    composer.render();
    return () => { composer.dispose(); renderer.dispose(); };
  }, [frame, width, height, lib]);

  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
