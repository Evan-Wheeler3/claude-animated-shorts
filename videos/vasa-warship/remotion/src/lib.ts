// Shared helpers: the Codex GLB library, Lambert conversion, toon character cards (bridge toon.ts) and small fx.
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {staticFile} from 'remotion';
import {NOINK} from '../../../../templates/bridge/ink';
import {Pen} from '../../../../templates/bridge/toon';

export const FILES = ['vasa', 'cannon-24pdr', 'rowboat', 'quay-segment', 'tre-kronor-castle', 'barrel', 'crate', 'rope-coil',
  'inquiry-table', 'inquiry-bench', 'salvage-pontoon-crane'] as const;
export type Id = typeof FILES[number];
export type Lib = Record<Id, THREE.Group>;

export const WATER_Y = 5.5;   // stylised waterline (Vasa keel at y = 0)
export const DECK_Y = 12.52;  // weather deck
export const GUNDECK_Y = 9.64;
export const SET_SAILS = ['sail_fore_course', 'sail_fore_topsail', 'sail_main_course', 'sail_main_topsail'];

export const toLambert = (root: THREE.Object3D) => root.traverse(o => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const conv = (x: THREE.Material) => {
    const s = x as THREE.MeshStandardMaterial;
    return new THREE.MeshLambertMaterial({color: s.color, map: s.map ?? null, side: s.side, name: s.name});
  };
  m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
  m.castShadow = m.receiveShadow = true;
});

export const loadLib = (): Promise<Lib> => {
  const loader = new GLTFLoader();
  return Promise.all(FILES.map(f => loader.loadAsync(staticFile(`${f}.glb`)).then(g => { toLambert(g.scene); return [f, g.scene] as const; })))
    .then(all => Object.fromEntries(all) as Lib);
};

export const clone = (L: Lib, id: Id) => L[id].clone(true);
export const put = <T extends THREE.Object3D>(o: T, p: number[], ry = 0): T => { o.position.set(p[0], p[1], p[2]); o.rotation.y = ry; return o; };

/** sails: 'set' shows the 4 set sails, 'furled' hides them, 'none' hides every sail (museum, salvage) */
export const rig = (ship: THREE.Object3D, mode: 'set' | 'furled' | 'none', setScaleY = 1) => ship.traverse(o => {
  if (!o.name.startsWith('sail_')) return;
  const isSet = SET_SAILS.includes(o.name);
  o.visible = mode === 'none' ? false : isSet ? mode === 'set' : true;
  if (isSet) o.scale.y = setScaleY;
});
export const openLids = (ship: THREE.Object3D, row: 'lower' | 'upper' | 'all', a: number) => ship.traverse(o => {
  const r = /^gunport_lid_(port|starboard)_(lower|upper)_\d+$/.exec(o.name);
  if (r && (row === 'all' || r[2] === row)) o.rotation.z = (r[1] === 'port' ? 1 : -1) * a;  // port +z / starboard -z swing the lid up and out (measured)
});

/** A canvas card on the NOINK layer. Characters use the 600 x 1000 toon design space (soles at y = 975). */
export class Card {
  mesh: THREE.Mesh;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  private sized = false;
  constructor(public heightM = 1.75, public res = .5, public dw = 600, public dh = 1000, public figure = true) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = dw * res; this.canvas.height = dh * res;
    this.g = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, figure ? .5 - (1 - 975 / 1000) : .5, 0);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map: this.tex, alphaTest: figure ? .5 : .02, transparent: !figure, depthWrite: figure, toneMapped: false, side: THREE.DoubleSide}));
    this.mesh.layers.set(NOINK);
    this.mesh.userData.card = true;
  }
  draw(fn: (p: Pen, g: CanvasRenderingContext2D) => void) {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.res, 0, 0, this.res, 0, 0);
    fn(new Pen(g), g);
    if (!this.sized) {
      this.sized = true;
      let h = this.heightM;
      if (this.figure) { // scale so the drawn figure (top of alpha to the soles) is heightM tall
        const d = g.getImageData(0, 0, this.canvas.width, this.canvas.height).data, W = this.canvas.width;
        let top = this.canvas.height;
        for (let y = 0; y < this.canvas.height && top === this.canvas.height; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) { top = y; break; }
        h = this.heightM * this.dh / (975 - top / this.res);
      }
      this.mesh.scale.set(h * this.dw / this.dh, h, 1);
    }
    this.tex.needsUpdate = true;
    return this;
  }
}

/** turn every card to face the camera around the world Y axis (cards stay upright even on a heeling ship) */
export const faceCards = (scene: THREE.Scene, camera: THREE.Camera) => {
  const wp = new THREE.Vector3(), pq = new THREE.Quaternion(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  scene.traverse(o => {
    if (!o.userData.card || o.userData.fixed) return;
    o.getWorldPosition(wp);
    const flip = o.userData.flip ? Math.PI : 0;
    q.setFromAxisAngle(up, Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z) + flip);
    o.parent!.getWorldQuaternion(pq);
    o.quaternion.copy(pq.invert().multiply(q));
  });
};

export const dot = (r: number, col = '#ffcf3a') => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({color: col, depthTest: false, toneMapped: false}));
  m.renderOrder = 999;
  m.layers.set(NOINK);
  return m;
};
