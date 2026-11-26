// Fire and explosions from CC0 Kenney effect sprites (assets/library/fx, see its README), layered as camera-facing
// THREE.Sprites: many fireball shapes that swap, grow, drift outward, tint white -> orange -> soot and fade, handing over to
// rising black smoke; fire = tinted additive flame shapes flickering over a glow. Owner note 2026-11-26: drawn cartoon
// flames/explosions "look so stupid"; use these. All motion is a pure function of time (frames render independently).
import * as THREE from 'three';
import {NOINK} from '../../../../bridge/ink';

export type Fx = Record<string, THREE.Texture[]>;
const SETS: Record<string, number> = {explosion: 9, flash: 9, smoke: 9, puff: 9, flame: 2, fire: 2, spark: 4};
/** load every effect sprite; url(path) maps 'fx/explosion00.png' to a served URL (Remotion: staticFile) */
export const loadFx = async (url: (p: string) => string): Promise<Fx> => { const ld = new THREE.TextureLoader(), fx: Fx = {};
  await Promise.all(Object.entries(SETS).map(async ([k, n]) => { fx[k] = await Promise.all(Array.from({length: n}, (_, i) => ld.loadAsync(url(`fx/${k}${String(i).padStart(2, '0')}.png`))));
    fx[k].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; }); }));
  return fx; };

const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const sprite = (scene: THREE.Scene, tex: THREE.Texture, add = false) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false,
  blending: add ? THREE.AdditiveBlending : THREE.NormalBlending})); s.layers.set(NOINK); s.visible = false; scene.add(s); return s; };
const C = (h: string) => new THREE.Color(h);
const FIRE = [C('#ffffff'), C('#ffd27a'), C('#ff7a2a'), C('#7a2a14'), C('#2a2220')];
const tint = (m: THREE.SpriteMaterial, x: number) => { const i = Math.min(FIRE.length - 2, Math.floor(x * (FIRE.length - 1))), f = x * (FIRE.length - 1) - i; m.color.copy(FIRE[i]).lerp(FIRE[i + 1], f); };

/** a fireball explosion of size k (k = 1: ~3 m across). at(P, e) with e = seconds since the blast (< 0 hides it). */
export const explosion = (scene: THREE.Scene, fx: Fx, k = 1) => {
  const balls = Array.from({length: 16}, (_, i) => ({s: sprite(scene, fx.explosion[i % 9]), d: new THREE.Vector3(rnd(i, 1) - .5, rnd(i, 2) * .9 - .2, rnd(i, 3) - .5).normalize(),
    r: .3 + .7 * rnd(i, 4), rot: rnd(i, 5) * 6.28, delay: .015 * (i % 6)}));
  const smoke = Array.from({length: 14}, (_, i) => ({s: sprite(scene, fx.smoke[i % 9]), d: new THREE.Vector3(rnd(i, 6) - .5, 0, rnd(i, 7) - .5), r: rnd(i, 8), rot: rnd(i, 9) * 6.28}));
  const flash = sprite(scene, fx.flash[0], true), sparks = Array.from({length: 10}, (_, i) => ({s: sprite(scene, fx.spark[i % 4], true),
    d: new THREE.Vector3(rnd(i, 10) - .5, rnd(i, 11) * .8, rnd(i, 12) - .5).normalize()}));
  const light = new THREE.PointLight('#ffb060', 0, 16 * k, 1.5); scene.add(light);
  return (P: number[], e: number) => {
    light.position.set(P[0], P[1], P[2] + .5 * k); light.intensity = e >= 0 ? 90 * k * k * Math.exp(-e * 6 / Math.sqrt(k)) : 0;
    flash.visible = e >= 0 && e < .16; if (flash.visible) { flash.material.map = fx.flash[Math.min(8, Math.floor(e / .16 * 9))]; flash.position.set(P[0], P[1], P[2] + .2);
      flash.scale.setScalar(4.5 * k * (.6 + e / .16)); flash.material.opacity = 1 - e / .16; }
    balls.forEach((b, i) => { const age = e - b.delay, life = .8 + .3 * b.r; b.s.visible = age >= 0 && age < life; if (!b.s.visible) return;
      const g = 1 - Math.exp(-age * 5), x = age / life;
      b.s.position.set(P[0] + b.d.x * k * (.2 + 1.5 * b.r) * g, P[1] + b.d.y * k * (.2 + 1.2 * b.r) * g + .6 * k * x * x, P[2] + b.d.z * k * (.2 + 1.2 * b.r) * g + .3 * k);
      b.s.scale.setScalar(k * (.9 + 1.7 * g) * (.75 + .5 * b.r)); b.s.material.rotation = b.rot + age * 1.2;
      b.s.position.y = Math.max(b.s.position.y, .42 * b.s.scale.x);   // keep the sprite out of the ground (it would be cut by a hard edge)
      b.s.material.map = fx.explosion[(i + Math.floor(age * 14)) % 9]; tint(b.s.material, Math.min(1, x * 1.3)); b.s.material.opacity = x < .4 ? 1 : Math.max(0, 1 - (x - .4) / .45); });
    smoke.forEach((m, i) => { const age = e - .3 - .04 * i; m.s.visible = age >= 0 && age < 3; if (!m.s.visible) return; const g = 1 - Math.exp(-age * 1.4);
      const sk = Math.sqrt(k); m.s.position.set(P[0] + m.d.x * sk * 2.0 * g, P[1] + sk * (.5 + 3.6 * g * (.6 + .4 * m.r)) + .6 * age, P[2] + m.d.z * sk * 1.2 * g);
      m.s.scale.setScalar(sk * (.9 + 1.6 * g)); m.s.material.rotation = m.rot + age * .4; m.s.material.color.set('#3a3230');
      m.s.material.opacity = .7 * Math.min(1, age * 4) * Math.max(0, 1 - age / 2.4); });
    sparks.forEach((sp, i) => { sp.s.visible = e >= 0 && e < .7; if (!sp.s.visible) return; const v = 7 * k * (.6 + .4 * rnd(i, 13));
      sp.s.position.set(P[0] + sp.d.x * v * e, P[1] + sp.d.y * v * e - 4.9 * e * e, P[2] + sp.d.z * v * e); sp.s.scale.setScalar(.35 * k * (1 - e / .7)); sp.s.material.color.set('#ffd080'); });
  };
};

/** a living fire / flame of height `size` (m), base at the point given to at(p, t, on); on 0..1 grows it, > 1 flares it. */
export const fire = (scene: THREE.Scene, fx: Fx, size: number, light = 3) => {
  const glow = sprite(scene, fx.fire[0], true), layers = [['#ff5a14', 1.0, .95], ['#ffa83a', .72, .85], ['#fff0b0', .42, .9]].map(([c, s, o], i) => ({s: sprite(scene, fx.flame[i % 2], true), c: c as string, k: s as number, o: o as number}));
  layers.forEach(L => L.s.center.set(.5, .08)); glow.center.set(.5, .35);
  const pl = new THREE.PointLight('#ff9a3a', 0, size * 12, 1.8); scene.add(pl);
  return {at: (p: number[], t: number, on: number) => { const vis = on > .02; pl.intensity = vis ? light * on * (.85 + .15 * Math.sin(t * 23)) : 0; glow.visible = vis;
    layers.forEach((L, i) => { L.s.visible = vis; if (!vis) return; const fl = Math.floor(t * 10 + i * 3), j = 1 + .08 * Math.sin(t * 19 + i * 2) + .05 * Math.sin(t * 31 + i);
      L.s.material.map = fx.flame[fl % 2]; L.s.material.color.set(L.c); L.s.material.opacity = L.o;
      L.s.position.set(p[0] + .03 * size * Math.sin(t * 7 + i), p[1], p[2] + .01 * i); L.s.scale.set(size * L.k * .62 * (fl % 4 < 2 ? 1 : -1) * j, size * L.k * on * j, 1); });
    pl.position.set(p[0], p[1] + size * .5, p[2]);
    if (vis) { glow.position.set(p[0], p[1], p[2] - .01); glow.scale.setScalar(size * .9 * Math.min(1.3, on)); glow.material.color.set('#ff8a30'); glow.material.opacity = .55; } }};
};
