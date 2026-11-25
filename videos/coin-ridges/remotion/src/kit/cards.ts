// Hold Up kit: canvas character/fx cards (bridge toon.ts drawings) with contact shadows, Lambert conversion, splash and
// wind effects. Copied into each story's remotion/src/kit; story code imports from here.
import * as THREE from 'three';
import {NOINK} from '../../../../../templates/bridge/ink';
import {Pen, fxSplash} from '../../../../../templates/bridge/toon';

export const toLambert = (root: THREE.Object3D) => root.traverse(o => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const conv = (x: THREE.Material) => { const s = x as THREE.MeshStandardMaterial; return new THREE.MeshLambertMaterial({color: s.color, map: s.map ?? null, side: s.side, name: s.name}); };
  m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
  m.castShadow = m.receiveShadow = true;
});
export const put = <T extends THREE.Object3D>(o: T, p: number[], ry = 0): T => { o.position.set(p[0], p[1], p[2]); o.rotation.y = ry; return o; };

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
    this.mesh.userData.figure = figure;
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
  const cards: THREE.Object3D[] = [];
  scene.traverse(o => { if (o.userData.card && !o.userData.fixed) cards.push(o); });
  for (const o of cards) {
    if (o.userData.figure && o.visible) {           // soft contact shadow under the feet (bridge: tight blob ~.5)
      let sh = o.userData.shadow as THREE.Mesh | undefined;
      if (!sh) {
        sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); sh.rotation.x = -Math.PI / 2; sh.layers.set(NOINK); sh.renderOrder = 1;
        o.userData.shadow = sh; o.parent!.add(sh);
      }
      const w = (o as THREE.Mesh).scale.x;
      sh.position.set(o.position.x, o.position.y + .03, o.position.z); sh.scale.set(w * .75, w * .32, 1);
    }
    o.getWorldPosition(wp);
    const flip = o.userData.flip ? Math.PI : 0;
    q.setFromAxisAngle(up, Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z) + flip);
    o.parent!.getWorldQuaternion(pq);
    o.quaternion.copy(pq.invert().multiply(q));
  }
};
const SHADOW_GEO = new THREE.CircleGeometry(.5, 24);
const SHADOW_MAT = new THREE.MeshBasicMaterial({color: '#1a1030', transparent: true, opacity: .32, depthWrite: false, toneMapped: false});

export const dot = (r: number, col = '#ffcf3a') => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({color: col, depthTest: false, toneMapped: false}));
  m.renderOrder = 999;
  m.layers.set(NOINK);
  return m;
};

/** toon splash card (bridge fxSplash, 800 x 800 design canvas); call .at(t) with t in 0..1 */
export const splash = (parent: THREE.Object3D, pos: number[], size = 4) => {
  const c = new Card(size, .3, 800, 800, false);
  c.mesh.position.set(pos[0], pos[1], pos[2]); parent.add(c.mesh);
  return {c, at: (t: number) => { c.mesh.visible = t > 0 && t < 1; if (c.mesh.visible) c.draw(p => fxSplash(p, t)); }};
};
/** white wind streaks racing across the frame along +X */
export const windStreaks = (scene: THREE.Scene, waterY: number, n = 10) => Array.from({length: n}, (_, i) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(10 + (i % 3) * 5, .25), new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}));
  m.rotation.y = -Math.PI / 2; m.layers.set(NOINK); scene.add(m);
  return (t: number) => { const k = (t * 70 + i * 19) % 120; m.position.set(-26 + (i * 13 % 16), waterY + 1 + (i * 37 % 15), -60 + k); (m.material as THREE.MeshBasicMaterial).opacity = .8 * Math.sin(Math.PI * k / 120); };
});

