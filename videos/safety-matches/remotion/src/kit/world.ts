// Hold Up v2 look (owner-approved 2026-11-26, videos/look-test/previews/stills-v4-*): library assets + light rig + post.
//   - assets: assets/library (Quaternius + Poly Haven, catalog.json) placed with place(); public dir = assets/library
//   - light: painted sky WITHOUT the kit's own lights, HDRI ambient kept LOW (it fills shadows in), one warm low side
//     sun with soft shadows, a cool fill, a weak hemisphere. Interiors: dim the sun, a candle point light is the key.
//   - post: N8AO ambient occlusion -> lens blur -> bloom -> ACES filmic -> vignette. No ink pass on the world.
//   - cast: our 2D toon cards in the reference style (white faces, black stick limbs, bold lid/pupil/brow faces) with
//     fitted costumes from kit/costume.ts; see refStyle().
import * as THREE from 'three';
import {BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect} from 'postprocessing';
import {N8AOPostPass} from 'n8ao';
import {INK, type Outfit} from '../../../../../templates/bridge/toon';
import {LensBlur} from '../../../../../templates/bridge/lensblur';
import {skyDome} from './look';

/** reference-style character: plain white face, black stick limbs, bold deadpan face. Hats/wigs come from costume.ts. */
export const refStyle = (o: Outfit): Outfit => ({...o, skin: '#ffffff', limbs: INK, face: 'ref'});

export type Rig = {sun: THREE.DirectionalLight; fill: THREE.DirectionalLight; hemi: THREE.HemisphereLight; pmrem: THREE.PMREMGenerator};
/** approved outdoor/day light rig. env = an HDRI (RGBELoader) used only as low ambient + reflections */
export const lightRig = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, env: THREE.DataTexture, opts: {night?: boolean} = {}): Rig => {
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  env.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(env).texture;
  scene.environmentIntensity = opts.night ? .08 : .32;
  if (opts.night) scene.background = new THREE.Color('#141016'); else { skyDome(scene, 'day', false); scene.fog = new THREE.Fog('#b9d3e8', 40, 220); }
  const hemi = new THREE.HemisphereLight('#cfe0ff', '#6b5a40', opts.night ? .12 : .35);
  const sun = new THREE.DirectionalLight('#ffe7c4', opts.night ? .15 : 4.6); sun.position.set(-13, 8, 1.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, {left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60}); sun.shadow.camera.updateProjectionMatrix();
  const fill = new THREE.DirectionalLight('#9fb8ff', .35); fill.position.set(8, 6, 6);
  scene.add(hemi, sun, sun.target, fill);
  return {sun, fill, hemi, pmrem};
};
/** candle / lamp key light for interiors (pair with lightRig(..., {night: true})) */
export const candle = (scene: THREE.Scene, p: number[], intensity = 14) => {
  const l = new THREE.PointLight('#ffb866', intensity, 7, 1.6); l.position.set(p[0], p[1], p[2]); l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -.002; l.shadow.radius = 6; scene.add(l); return l;
};

/** approved post chain. Set lens.focus (m) and lens.cInf (px blur at infinity: CU 6-9, MS 4-6, wide 0) per frame. */
export const makePost = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, w: number, h: number) => {
  const composer = new EffectComposer(renderer, {frameBufferType: THREE.HalfFloatType});
  composer.addPass(new RenderPass(scene, camera));
  const ao = new N8AOPostPass(scene, camera, w, h); ao.configuration.aoRadius = 1.0; ao.configuration.distanceFalloff = .6; ao.configuration.intensity = 2.2; composer.addPass(ao);
  const lens = new LensBlur({maxCoC: 12, nearScale: 1.0});
  composer.addPass(new EffectPass(camera, lens.pre)); composer.addPass(new EffectPass(camera, lens.main));
  composer.addPass(new EffectPass(camera, new BloomEffect({intensity: .3, luminanceThreshold: .85, mipmapBlur: true}),
    new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC}), new VignetteEffect({darkness: .3, offset: .3})));
  return {composer, lens, ao};
};

/** cast + receive shadows on every mesh of a library model */
export const shadowAll = <T extends THREE.Object3D>(o: T) => { o.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
/** clone a library model and set it on the ground: bounding box bottom at y, centred on (x, z), rotated ry, scaled s */
export const place = (lib: Record<string, THREE.Object3D>, id: string, x: number, y: number, z: number, ry = 0, s = 1) => {
  const o = lib[id].clone(true); o.rotation.y = ry; o.scale.setScalar(s); o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o); o.position.set(x - (b.min.x + b.max.x) / 2, y - b.min.y, z - (b.min.z + b.max.z) / 2); return shadowAll(o);
};

const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
/** lush instanced grass (dark root -> sunlit tip) over a rectangle, skipping avoid(x, z) (paths, roads) */
export const grassField = (n: number, x0: number, x1: number, z0: number, z1: number, avoid: (x: number, z: number) => boolean = () => false) => {
  const geo = new THREE.PlaneGeometry(.035, .18, 1, 3); geo.translate(0, .09, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute, col: number[] = [];
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / .18; pos.setX(i, pos.getX(i) * (1 - y * .9)); pos.setZ(i, .03 * y * y);
    const cc = new THREE.Color('#1f5a16').lerp(new THREE.Color('#78c534'), y); col.push(cc.r, cc.g, cc.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .8}), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (let i = 0; k < n && i < n * 3; i++) { const x = x0 + (x1 - x0) * rnd(i, 1), z = z0 + (z1 - z0) * rnd(i, 2); if (avoid(x, z)) continue;
    e.set((rnd(i, 3) - .5) * .5, rnd(i, 4) * 6.28, (rnd(i, 5) - .5) * .5); q.setFromEuler(e); const sc = .6 + .6 * rnd(i, 6);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(sc, sc, sc)); mesh.setMatrixAt(k++, m); }
  mesh.count = k; mesh.receiveShadow = true; return mesh;
};

/** caption style (read-along, 1-3 words): Lilita One served from assets/library/fonts, white with a thick dark stroke */
export const CAPTION_FONT = 'LilitaOneLocal';
export const captionCss = (words: string) => ({fontFamily: CAPTION_FONT, fontSize: words.length > 10 ? 96 : 124, color: '#ffffff',
  WebkitTextStroke: '15px #111', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', textAlign: 'center' as const, maxWidth: '86%'});
export const loadCaptionFont = (url: string) => { if (typeof document === 'undefined' || document.getElementById('lilita')) return;
  const st = document.createElement('style'); st.id = 'lilita'; st.textContent = `@font-face{font-family:'${CAPTION_FONT}';src:url('${url}') format('woff2');}`; document.head.appendChild(st); };
