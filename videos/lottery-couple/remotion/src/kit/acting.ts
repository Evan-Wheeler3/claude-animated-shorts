// Acting + effects helpers proven on safety-matches (2026-11-26). See ANIMATION-PLAYBOOK.md for when to use each.
// Copy kit/ into a new video's remotion/src/ as usual; these need kit/cards.ts and templates/bridge/{toon,ink}.ts.
import * as THREE from 'three';
import {NOINK} from '../../../../../templates/bridge/ink';
import type {Costume, Kit} from '../../../../../templates/bridge/toon';
import {Card} from './cards';

export type P = [number, number];
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
export const lerp2 = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

/** height to give a Card for a SEATED adult (mode 'sit'): the card auto-sizes the drawn figure to heightM, so a seated
 *  figure given the standing height comes out giant */
export const SIT_H = (standing: number) => standing * (1.2 + 1.1) / (1 + 1.1 + 1.4);

// ---------- card <-> world (design units are the 600 x 1000 card canvas; soles at y = 975) ----------
/** world position of a point drawn on a figure card (e.g. a hand, a flame) - for 3D things that leave the card */
export const onCard = (c: Card, x: number, y: number) => { c.mesh.updateMatrixWorld(true); return c.mesh.localToWorld(new THREE.Vector3(x / 600 - .5, .975 - y / 1000, 0)).toArray(); };
/** design units of a world point, for reaching a hand to a 3D prop (pot on a table, box on a bench). Draw the card once
 *  at setup first: its scale is only known after the first draw. Assumes the card faces the camera roughly head-on. */
export const toCard = (c: Card, wx: number, wy: number): P => [((wx - c.mesh.position.x) / c.mesh.scale.x + .5) * 600, (.975 - (wy - c.mesh.position.y) / c.mesh.scale.y) * 1000];

// ---------- arms (return these from bodyFront's armPose) ----------
/** a noodle arm: sagging quadratic curve S -> C -> H that wobbles like jelly (amp in design units, 0 = stiff) */
export const noodle = (S: P, C: P, H: P, amp: number, t: number): P[] => Array.from({length: 13}, (_, i) => {
  const s = i / 12, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
  const x = a * S[0] + b * C[0] + c * H[0], y = a * S[1] + b * C[1] + c * H[1], dx = H[0] - S[0], dy = H[1] - S[1], L = Math.hypot(dx, dy) || 1;
  const w = amp * Math.sin(Math.PI * s) * Math.sin(t * 9 - s * 5); return [x - dy / L * w, y + dx / L * w]; });
/** simple reaching arm: shoulder -> elbow pushed out to the side (+down) -> hand */
export const reach = (side: -1 | 1, S: P, H: P, u: number, out = 22, down = 10): P[] => [S, [S[0] + side * out * u, (S[1] + H[1]) / 2 + down * u], H];
/** where a hand should go to hold the face/jaw so it is VISIBLE: the head is drawn after the arms, so a hand inside the
 *  head outline disappears. Use the cheek edge. */
export const cheek = (side: -1 | 1, g: {u: number; tcx: number; chin: number}): P => [g.tcx + side * 57 * g.u, g.chin - 22 * g.u];

// ---------- 2D effects on the card ----------
/** sweat drops flicking off the head (head hook) */
export const sweat = (t: number, on: number): Costume['head'] => (k: Kit) => { if (on <= 0) return; const u = k.u;
  for (const [sx, ph] of [[-1, 0], [1, .45], [1, .8]] as const) { const q = (t * .9 + ph) % 1, x = 300 + sx * (k.Ha + 6 * u + 14 * u * q), y = k.hc - .2 * k.Hb + 30 * u * q * q;
    k.p.poly([[x, y - 9 * u], [x + 5 * u, y + 2 * u], [x, y + 7 * u], [x - 5 * u, y + 2 * u]], `rgba(140,200,255,${on * (1 - q)})`, 1.6 * u); } };
/** smell lines curling from a held thing (hand index) to the nose. Drawn in the HEAD hook so the head doesn't cover them. */
export const stinkLines = (t: number, hand = 1, col = '150,185,40'): Costume => ({head: k => { const [x, y] = k.hands[hand] ?? k.hands[0], u = k.u;
  for (let i = 0; i < 3; i++) { const q = (t * .6 + i / 3) % 1;
    const pts: P[] = Array.from({length: 9}, (_, j) => { const s2 = j / 8, e = s2 * (.75 + .25 * q);
      return [x + (300 + 18 * u - x) * e + 7 * u * Math.sin(s2 * 9 + t * 6 + i * 2), (y - 62 * u) + (k.hc + (6 + (i - 1) * 12) * u - (y - 62 * u)) * e + 6 * u * Math.cos(s2 * 7 + t * 4 + i)]; });
    k.p.stroke(pts, 4 * u, `rgba(${col},${.85 * Math.sin(Math.PI * q)})`); } }});

// ---------- 3D effects ----------
/** rising puffs from a point. size = puff radius (m); the drift scales with it, so keep size small in close-ups
 *  (<= .02 at 4x prop scale): big translucent spheres near the lens read as grey discs, not smoke. */
export const smoke = (scene: THREE.Scene, n = 8, col = '#d8d4cc', size = .018) => Array.from({length: n}, (_, i) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(size * (1 + .4 * (i % 3)), 12, 8), new THREE.MeshBasicMaterial({color: col, transparent: true, opacity: 0, depthWrite: false}));
  m.layers.set(NOINK); scene.add(m);
  return (t: number, p: number[], amount: number) => { const k = (t * .45 + i / n) % 1, sc = size / .018; m.scale.setScalar(.5 + 2.2 * k);
    m.position.set(p[0] + ((.08 + .25 * k) * Math.sin(i * 2.3) * k + .06 * k) * sc, p[1] + .3 * k * sc, p[2] + .04 * sc);
    (m.material as THREE.MeshBasicMaterial).opacity = .5 * amount * Math.sin(Math.PI * k); }; });
/** camera-facing flame card + orange point light. at(pos, seconds, on): on 0..1 grows it (with an ignition flash under .6),
 *  values > 1 flare it (use 1.5 for the first frames of a strike, then settle to ~.9-1). Always upright, whatever the match angle. */
export const flame = (scene: THREE.Scene, size: number, light = 3) => {
  const c = new Card(size, 1, 200, 300, false); c.mesh.userData.figure = false; scene.add(c.mesh);
  const pl = new THREE.PointLight('#ff9a3a', light, size * 12, 1.8); scene.add(pl);
  return {c, pl, at: (p: number[], t: number, on: number) => {
    c.mesh.visible = on > .02; pl.intensity = light * on * (.85 + .15 * Math.sin(t * 23)); if (!c.mesh.visible) return;
    c.mesh.position.set(p[0], p[1], p[2]); pl.position.set(p[0], p[1] + size * .5, p[2]);
    c.draw((_p, g) => { const s = on, wob = 10 * Math.sin(t * 17);
      const grd = g.createRadialGradient(100, 220, 10, 100, 190, 120); grd.addColorStop(0, '#fff6c0'); grd.addColorStop(.35, '#ffcf4a'); grd.addColorStop(.75, '#ff7a1a'); grd.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(100, 300); const w = .4 + .6 * s;
      g.bezierCurveTo(100 - 90 * w, 300 - 30 * s, 100 - 60 * w + wob, 300 - 180 * s, 100 + wob * .6, 300 - 290 * s); g.bezierCurveTo(100 + 60 * w + wob, 300 - 180 * s, 100 + 90 * w, 300 - 30 * s, 100, 300); g.fill();
      if (s < .6) { const a = 1 - s / .6, r = 90 * (1 - .5 * s), fg = g.createRadialGradient(100, 230, 0, 100, 230, r);
        fg.addColorStop(0, `rgba(255,255,235,${a})`); fg.addColorStop(.4, `rgba(255,220,120,${.8 * a})`); fg.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = fg; g.fillRect(0, 100, 200, 200); } }); }};
};
/** a camera-facing ring that pulses around something to point at it (instead of a text label). Call each frame. */
export const pointRing = (scene: THREE.Scene, r = .04, col = '#fff6c0') => { const ring = new THREE.Mesh(new THREE.RingGeometry(r * .8, r, 40), new THREE.MeshBasicMaterial({color: col, transparent: true, toneMapped: false}));
  ring.layers.set(NOINK); scene.add(ring);
  return (at: THREE.Vector3, camera: THREE.Camera, k: number) => { ring.visible = k > .01; ring.position.copy(at); ring.quaternion.copy(camera.quaternion); ring.scale.setScalar(1 + .3 * k); (ring.material as THREE.MeshBasicMaterial).opacity = k; }; };
/** pulse 0..1 between frames t0 and t1 (soft in/out), for emissive highlights and pointRing */
export const pulse = (f: number, t0: number, t1: number) => f < t0 || f > t1 ? 0 : (.5 + .5 * Math.sin((f - t0) * .35)) * smooth((f - t0) / 4) * smooth((t1 - f) / 6);

// ---------- hollow containers ----------
/** an open-topped hollow can/pot: outer wall (DoubleSide), inner wall (BackSide, lighter so the depth reads), bottom, rim.
 *  Add a lid as a Group whose origin is on the hinge edge (rotation.x < 0 opens it). Things inside must stay within r - wall. */
export const hollowCan = (r: number, h: number, outer: THREE.Material, inner: THREE.Material) => { const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), outer); wall.position.y = h / 2;
  const wallIn = new THREE.Mesh(new THREE.CylinderGeometry(r - .003, r - .003, h, 64, 1, true), inner); wallIn.position.y = h / 2;
  const bot = new THREE.Mesh(new THREE.CircleGeometry(r - .002, 64), inner); bot.rotation.x = -Math.PI / 2; bot.position.y = .004;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 8, 64), outer); rim.rotation.x = Math.PI / 2; rim.position.y = h;
  g.add(wall, wallIn, bot, rim); g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return g; };
