// Hold Up world look (first built for Vasa): bridge-measured sky palette (templates/bridge/lights.ts LOOK), painted clouds, a stylised toon water
// shader (near/mid/far colour by view angle, crest streaks, troughs, glints, hull foam, fog to the horizon) and a
// colourful 1628 Stockholm shore (gabled houses with painted facades, rocky green cliffs, church spire, trees).
import * as THREE from 'three';
import {NOINK} from '../../../../bridge/ink';
import {LOOK} from '../../../../bridge/lights';
import {untone} from '../../../../bridge/shade';

export type Pal = 'day' | 'afternoon';
const SKY: Record<Pal, {c: string[]; e: number[]; fog: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number}> = {
  day: {...LOOK.day.sky, fog: '#b8d0ec', sun: '#fff0d8', sunI: 2.6, hemiSky: '#cfe0ff', hemiGround: '#7a6650', hemiI: 1.25},
  // 4-5 pm in August: still daylight, a touch warmer and lower than noon (not golden hour)
  afternoon: {c: ['#d9d3c4', '#b9cde6', '#7fa9e0', '#5a8fd8', '#3a74c8'], e: [0, 3, 9, 18, 40], fog: '#cfd3d6', sun: '#ffe2b8', sunI: 2.8, hemiSky: '#d6e2ff', hemiGround: '#7d6248', hemiI: 1.15},
};

export const skyDome = (scene: THREE.Scene, pal: Pal) => {
  const k = SKY[pal], u: Record<string, THREE.IUniform> = {e: {value: new THREE.Vector4(...k.e.slice(1).map(d => THREE.MathUtils.degToRad(d)))}};
  k.c.forEach((h, i) => { u['c' + i] = {value: untone(h)}; });
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
      void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
        vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
        c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), m);
  sky.renderOrder = -1; sky.frustumCulled = false; sky.layers.set(NOINK);
  scene.add(sky);
  scene.fog = new THREE.Fog(untone(k.fog).getHex(), 160, 900);
  const sun = new THREE.DirectionalLight(k.sun, k.sunI);
  sun.position.set(-50, 55, 70);                       // front-left key from the port-side camera
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -80, right: 80, top: 80, bottom: -80, far: 400});
  sun.shadow.normalBias = .03;
  scene.add(new THREE.HemisphereLight(k.hemiSky, k.hemiGround, k.hemiI), sun);
  clouds(scene, pal);
  return {sky, sun};
};

const cloudTex = (seed: number, lit: string, mid: string, shade: string) => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const puffs = Array.from({length: 9}, (_, i) => ({x: 90 + i * 40 + rnd() * 30, y: 150 - Math.sin(i / 8 * Math.PI) * 60 - rnd() * 20, r: 38 + rnd() * 40}));
  for (const [col, dy, k] of [[shade, 14, 1], [mid, 5, .92], [lit, -6, .8]] as const) {
    g.fillStyle = col;
    for (const p of puffs) { g.beginPath(); g.arc(p.x, p.y + dy, p.r * k, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = shade; g.fillRect(70, 170, 380, 22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const clouds = (scene: THREE.Scene, pal: Pal) => {
  const cl = pal === 'day' ? LOOK.day.cloud : {lit: '#fff6ea', mid: '#e9e3e6', shade: '#c9c8dd'};
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + .3, d = 1500 + (i % 3) * 300;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({map: cloudTex(i * 977 + 13, cl.lit, cl.mid, cl.shade), fog: false, depthWrite: false, transparent: true, toneMapped: false}));
    m.position.set(Math.cos(a) * d, 180 + (i * 53 % 5) * 45, Math.sin(a) * d);
    m.scale.set(520 + (i % 4) * 140, 260 + (i % 4) * 70, 1);
    m.layers.set(NOINK); m.renderOrder = -1;
    scene.add(m);
  }
};

// ---------------- water ----------------
export type Water = {mesh: THREE.Mesh; set: (t: number, ship?: {x: number; z: number; on: number}) => void};
export const toonWater = (pal: Pal, waterY: number): Water => {
  const k = SKY[pal];
  const col = (h: string) => ({value: untone(h)});
  const m = new THREE.ShaderMaterial({
    uniforms: {
      nearC: col('#1a7c9e'), midC: col('#165f92'), farC: col(pal === 'day' ? '#2b5c92' : '#3a6596'), crestC: col('#8fd6e2'), troughC: col('#0c3d66'),
      glintC: col('#ffffff'), foamC: col('#eef8ff'), fogC: col(k.fog), time: {value: 0},
      shipP: {value: new THREE.Vector2(0, 0)}, shipR: {value: new THREE.Vector2(8.5, 37)}, shipOn: {value: 0}, fogNear: {value: 160}, fogFar: {value: 900},
    },
    vertexShader: 'varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vWP;
      uniform vec3 nearC, midC, farC, crestC, troughC, glintC, foamC, fogC; uniform float time, shipOn, fogNear, fogFar; uniform vec2 shipP, shipR;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec3 V = vWP - cameraPosition; float d = length(V);
        float dep = asin(clamp(-V.y / d, 0.0, 1.0)); float wf = 1.0 - smoothstep(0.0, 0.42, dep);
        vec3 c = mix(mix(nearC, midC, smoothstep(0.0, 0.55, wf)), farC, smoothstep(0.55, 1.0, wf));
        vec2 p = vWP.xz * vec2(0.045, 0.11) + vec2(0.03 * time, 0.01 * time);
        float q = 0.62 * n(p * 2.0) + 0.38 * n(p * 5.3 + 3.7);
        float fade = 1.0 - smoothstep(40.0, 520.0, d);
        float crest = smoothstep(0.60, 0.66, q) * (1.0 - smoothstep(0.70, 0.78, q));
        float trough = 1.0 - smoothstep(0.22, 0.36, q);
        c = mix(c, troughC, 0.45 * trough * fade);
        c = mix(c, crestC, 0.7 * crest * fade);
        float gl = smoothstep(0.92, 0.95, n(vWP.xz * 0.35 + vec2(time * 0.35, -time * 0.2))) * (0.25 + 0.75 * wf);
        c = mix(c, glintC, 0.55 * gl * fade);
        vec2 s = (vWP.xz - shipP) / shipR; float e = length(s);
        float ring = (1.0 - smoothstep(1.0, 1.18 + 0.12 * n(vWP.xz * 1.6 + time), e)) * smoothstep(0.86, 1.0, e);
        c = mix(c, foamC, 0.9 * ring * shipOn);
        c = mix(c, fogC, smoothstep(fogNear, fogFar, d));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = waterY;
  return {mesh, set: (t, ship) => { m.uniforms.time.value = t; if (ship) { m.uniforms.shipP.value.set(ship.x, ship.z); m.uniforms.shipOn.value = ship.on; } }};
};

// ---------------- 1628 Stockholm shore ----------------
const FACADES = ['#e7d3a8', '#d99a55', '#c2633f', '#efe4c8', '#b5513a', '#e2b86a', '#d6c09a'];
const facadeTex = (base: string, seed: number) => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 112, 128, 16);                         // plinth
  const cols = 2 + (seed % 2), rows = 3;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = 14 + k * (100 / cols), y = 14 + r * 32;
    g.fillStyle = '#f6f1e4'; g.fillRect(x - 3, y - 3, 22, 26);                          // trim
    g.fillStyle = r === 2 && k === 0 ? '#5a3424' : '#2f3a4f'; g.fillRect(x, y, 16, 20);  // window / door
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const house = (w: number, h: number, d: number, seed: number) => {
  const g = new THREE.Group();
  const wall = new THREE.MeshLambertMaterial({map: facadeTex(FACADES[seed % FACADES.length], seed)});
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); body.position.y = h / 2;
  const roofH = w * .55;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - .4, 0); shape.lineTo(0, roofH); shape.lineTo(w / 2 + .4, 0); shape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {depth: d + .8, bevelEnabled: false}), new THREE.MeshLambertMaterial({color: ['#9a3b2a', '#7a3324', '#5a4a48'][seed % 3]}));
  roof.position.set(0, h, -d / 2 - .4);
  g.add(body, roof);
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
};
const rock = (r: number, seed: number) => {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const k = 1 + .18 * Math.sin(i * 12.9898 + seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .75, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color: ['#8d8072', '#7a6f66', '#a08f7a'][seed % 3], flatShading: true}));
  m.castShadow = m.receiveShadow = true; return m;
};
const tree = (s: number) => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 * s, 0), new THREE.MeshLambertMaterial({color: '#4e8a3a', flatShading: true})); top.position.y = 4 * s;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.35 * s, .45 * s, 3 * s, 6), new THREE.MeshLambertMaterial({color: '#5a3b2a'})); trunk.position.y = 1.5 * s;
  g.add(top, trunk); g.traverse(o => { (o as THREE.Mesh).castShadow = true; }); return g;
};
/** a strip of shore along Z at x = x0; the land lies on `side` of it (+1: land toward +X, harbour toward -X) */
export const shoreline = (scene: THREE.Scene, waterY: number, x0: number, side: 1 | -1, z0: number, z1: number, seed = 1, cliff = false) => {
  const WATER_Y = waterY;
  const grp = new THREE.Group();
  const land = new THREE.Mesh(new THREE.BoxGeometry(200, 6, z1 - z0 + 60), new THREE.MeshLambertMaterial({color: cliff ? '#6f8f4a' : '#8a9a5a'}));
  land.position.set(x0 + side * 100, WATER_Y - 1.5, (z0 + z1) / 2); land.receiveShadow = true; grp.add(land);
  const edge = x0;
  let k = seed;
  for (let z = z0; z < z1; z += 7 + (k % 3) * 2) {
    k = (k * 7 + 3) % 97;
    const r = rock(3.5 + (k % 4), k); r.position.set(edge + side * (1 + (k % 3)), WATER_Y - .5, z); grp.add(r);
    if (cliff) {
      const big = rock(10 + (k % 5) * 2, k + 1); big.position.set(edge + side * (12 + (k % 6)), WATER_Y + 6 + (k % 4) * 3, z); grp.add(big);
      if (k % 2) { const t = tree(1 + (k % 3) * .2); t.position.set(edge + side * (18 + (k % 5)), WATER_Y + 14 + (k % 4) * 2, z + 2); grp.add(t); }
    } else {
      const h = house(8 + (k % 3), 8 + (k % 4) * 1.6, 9, k);
      h.position.set(edge + side * (9 + (k % 2) * 3), WATER_Y + 1.5, z); h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; grp.add(h);
      if (k % 5 === 0) { const t = tree(1.1); t.position.set(edge + side * (22 + (k % 3) * 2), WATER_Y + 1.5, z + 3); grp.add(t); }
    }
  }
  if (!cliff) { // church tower with a green copper spire
    const tw = new THREE.Mesh(new THREE.BoxGeometry(7, 26, 7), new THREE.MeshLambertMaterial({color: '#e2cfa6'})); tw.position.set(edge + side * 28, WATER_Y + 14.5, (z0 + z1) / 2 + 20);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(4.6, 16, 8), new THREE.MeshLambertMaterial({color: '#4f9a82', flatShading: true})); sp.position.set(tw.position.x, WATER_Y + 35.5, tw.position.z);
    [tw, sp].forEach(m => { m.castShadow = true; grp.add(m); });
  }
  scene.add(grp);
  return grp;
};
