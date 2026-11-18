// Run with Node.js and three@0.177.0, gltf-validator and puppeteer-core installed.
// Set CHROMIUM to the executable path if Chromium is installed elsewhere.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const validator = require('gltf-validator');
const puppeteer = require('puppeteer-core');
const threeRoot = resolve(dirname(require.resolve('three')), '..');
const qa = dirname(fileURLToPath(import.meta.url));
const asset = join(qa, '../cast/Homeowner_Standing_Rig.glb');
const files = {
  '/owner.glb': asset,
  '/phil.glb': join(qa, '../bathroom/assets/Phil_Standing_Rig.glb'),
};
const bytes = await readFile(asset);
assert(bytes.length < 12_000_000);
const gltf = await validator.validateBytes(bytes);
assert.equal(gltf.issues.numErrors, 0, JSON.stringify(gltf.issues.messages));
const warnings = gltf.issues.messages.filter(({ severity }) => severity === 1);
assert(warnings.every(({ code }) => code === 'NODE_SKINNED_MESH_NON_ROOT'), JSON.stringify(warnings));

async function checkAndRender() {
  const T = await import('three');
  const { GLTFLoader } = await import('/three/examples/jsm/loaders/GLTFLoader.js');
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (a, b, message) => check(JSON.stringify(a) === JSON.stringify(b), message);
  check(T.REVISION === '177', 'Three.js revision must be 177');
  const loader = new GLTFLoader();
  const [owner, phil] = await Promise.all(['/owner.glb', '/phil.glb'].map(path => loader.loadAsync(path)));
  const face = owner.scene.getObjectByName('Homeowner_Face');
  const philFace = phil.scene.getObjectByName('Phil_Face');
  const wardrobe = owner.scene.getObjectByName('Homeowner_Wardrobe');
  const parts = [];
  wardrobe.traverse(mesh => { if (mesh.isMesh) parts.push(mesh); });
  check(face.isSkinnedMesh && parts.length && parts.every(mesh => mesh.isSkinnedMesh), 'Skinned face and wardrobe required');
  const bones = face.skeleton.bones;
  const reference = philFace.skeleton.bones;
  check(bones.length === 80, 'Expected 80 joints');
  equal(bones.map(b => b.name), reference.map(b => b.name), 'Sanitized joint names or order differ');
  equal(bones.map(b => bones.indexOf(b.parent)), reference.map(b => reference.indexOf(b.parent)), 'Joint hierarchy differs');
  equal(bones.map(b => b.quaternion.toArray()), reference.map(b => b.quaternion.toArray()), 'Rest orientations differ');
  const morphs = Object.keys(face.morphTargetDictionary);
  check(morphs.length === 23, 'Expected 23 face morphs');
  equal(morphs, Object.keys(philFace.morphTargetDictionary), 'Morph names or order differ');
  check(owner.animations.length === 0, 'Unexpected animation clips');

  function positions(mesh) {
    return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) =>
      mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  owner.scene.updateMatrixWorld(true);
  const rest = [face, ...parts].map(positions);
  const box = new T.Box3().setFromPoints(rest.flat());
  const height = box.max.y - box.min.y;
  const footY = [-1, 1].map(side => Math.min(...rest.flat().filter(p => p.x * side > .04).map(p => p.y)));
  check(height >= 1.78 && height <= 1.82, 'Height outside range');
  check(footY.every(y => Math.abs(y) < .001), 'Both soles must sit on Y=0');
  const textures = new Set();
  for (const mesh of [face, ...parts]) {
    for (const value of Object.values(mesh.material)) if (value?.isTexture) textures.add(value);
  }
  check(textures.size > 0 && [...textures].every(t => Math.max(t.image.width, t.image.height) <= 1024), 'Missing or oversized textures');

  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1080, 1920);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = T.SRGBColorSpace;
  document.body.style.margin = '0';
  document.body.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color('#535d6b');
  scene.add(new T.HemisphereLight('#e0ecff', '#615545', 2.1));
  const key = new T.DirectionalLight('#ffdfbd', 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const ground = new T.Mesh(new T.PlaneGeometry(20, 20), new T.MeshStandardMaterial({ color: '#424c58', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.002;
  scene.add(ground, owner.scene);

  const camera = new T.PerspectiveCamera(33, 1080 / 1920, .02, 40);
  function capture(position, target) {
    camera.position.set(...position);
    camera.lookAt(...target);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png').split(',')[1];
  }
  const previews = {
    Homeowner_Front: capture([0, .96, 4.6], [0, .92, 0]),
    Homeowner_Side: capture([3.8, .96, 0], [0, .92, 0]),
  };

  function orientWorld(bone, delta) {
    const world = bone.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
    const parent = bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
    bone.quaternion.copy(parent.multiply(world));
    bone.updateWorldMatrix(false, true);
  }

  function pose(model, mesh) {
    model.updateMatrixWorld(true);
    const joint = name => {
      const bone = mesh.skeleton.bones.find(b => b.name.replaceAll('_', '') === name);
      check(bone, 'Missing joint ' + name);
      return bone;
    };
    const point = bone => bone.getWorldPosition(new T.Vector3());
    function aim(bone, child, target) {
      const current = point(child).sub(point(bone)).normalize();
      orientWorld(bone, new T.Quaternion().setFromUnitVectors(current, target.normalize()));
    }
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const arm = joint('Bip01' + side + 'UpperArm');
      const elbow = joint('Bip01' + side + 'Forearm');
      const wrist = joint('Bip01' + side + 'Hand');
      const down = new T.Vector3(-sign * .075, -1, .025).normalize();
      aim(arm, elbow, down);
      const bent = new T.Vector3(0, .025, 1).addScaledVector(down, -down.dot(new T.Vector3(0, .025, 1)));
      aim(elbow, wrist, side === 'L' ? bent : down.clone());
      const angle = point(elbow).sub(point(arm)).angleTo(point(wrist).sub(point(elbow)));
      check(Math.abs(angle - (side === 'L' ? Math.PI / 2 : 0)) < 1e-5, 'Incorrect elbow angle');
    }
    orientWorld(joint('Bip01Head'), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 6));
    for (const [prefix, value] of [['AK_03_BrowInnerUp', 1], ['AK_21_', .8], ['AK_22_', .8]]) {
      const name = Object.keys(mesh.morphTargetDictionary).find(n => n.startsWith(prefix));
      check(name && (value === 1 || name.includes('EyeWide')), 'Missing surprised morph ' + prefix);
      mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] = value;
    }
  }
  pose(owner.scene, face);
  pose(phil.scene, philFace);

  // Check deformation on indexed surfaces and check coincident seam vertices.
  // Very short edges are excluded from strain ratios because rounding dominates them.
  const zones = {
    shoulders: p => p.y > 1.28 && p.y < 1.51 && Math.abs(p.x) > .145 && Math.abs(p.x) < .34,
    elbow: p => p.y > 1.05 && p.y < 1.31 && Math.abs(p.x) > .34 && Math.abs(p.x) < .53,
    neckAndCollar: p => p.y > 1.46 && p.y < 1.56 && Math.abs(p.x) < .10,
  };
  const strain = Object.fromEntries(Object.keys(zones).map(name => [
    name, { edges: 0, maxGrowthMeters: 0, maxRatio: 0, seamPairs: 0, maxSeamGapMeters: 0 },
  ]));
  const seamVertices = new Map();
  for (const [i, mesh] of [face, ...parts].entries()) {
    const posed = positions(mesh);
    const index = mesh.geometry.index;
    for (const [vertex, position] of rest[i].entries()) {
      const key = position.toArray().map(value => Math.round(value * 100_000)).join(',');
      const previous = seamVertices.get(key);
      if (!previous) {
        seamVertices.set(key, posed[vertex]);
        continue;
      }
      for (const [name, includes] of Object.entries(zones)) {
        if (!includes(position)) continue;
        const stat = strain[name];
        stat.seamPairs++;
        stat.maxSeamGapMeters = Math.max(stat.maxSeamGapMeters, previous.distanceTo(posed[vertex]));
      }
    }
    check(posed.every(p => p.toArray().every(Number.isFinite)), 'Nonfinite deformed vertex');
    for (let j = 0; j < index.count; j += 3) {
      const triangle = [0, 1, 2].map(offset => index.getX(j + offset));
      for (let edge = 0; edge < 3; edge++) {
        const [a, b] = [triangle[edge], triangle[(edge + 1) % 3]];
        const length = rest[i][a].distanceTo(rest[i][b]);
        const deformed = posed[a].distanceTo(posed[b]);
        for (const [name, includes] of Object.entries(zones)) {
          if (!includes(rest[i][a]) || !includes(rest[i][b]) || length < .002) continue;
          const stat = strain[name];
          stat.edges++;
          stat.maxGrowthMeters = Math.max(stat.maxGrowthMeters, deformed - length);
          stat.maxRatio = Math.max(stat.maxRatio, deformed / length);
        }
      }
    }
  }
  for (const [name, stat] of Object.entries(strain)) {
    check(stat.edges > 0 && stat.maxGrowthMeters < .025 && stat.maxRatio < 4,
      'Excess deformation at ' + name + ' ' + JSON.stringify(stat));
    check(stat.seamPairs > 0 && stat.maxSeamGapMeters < .004,
      'Surface seam opened at ' + name + ' ' + JSON.stringify(stat));
  }

  previews.Homeowner_FaceCU = capture([.18, 1.58, 1.03], [0, 1.57, .025]);
  scene.add(phil.scene);
  owner.scene.position.x = -.37;
  phil.scene.position.x = .37;
  previews.Homeowner_vs_Phil = capture([0, .97, 3.9], [0, .91, 0]);
  renderer.dispose();
  return { previews, threeRevision: T.REVISION, bones: bones.map(b => b.name), morphs, heightMeters: height, footY, strain };
}

const page = '<script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script>';
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(page);
    } else if (files[url.pathname]) {
      res.writeHead(200, { 'Content-Type': 'model/gltf-binary' }).end(await readFile(files[url.pathname]));
    } else if (/^\/three\/(build|examples\/jsm)\/[\w./-]+\.js$/.test(url.pathname)) {
      const source = await readFile(join(threeRoot, url.pathname.slice(7)));
      res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(source);
    } else {
      res.writeHead(404).end();
    }
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM ?? '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const tab = await browser.newPage();
  await tab.goto('http://127.0.0.1:' + server.address().port);
  const { previews, ...report } = await tab.evaluate(checkAndRender);
  const previewDir = join(qa, 'previews');
  await mkdir(previewDir, { recursive: true });
  for (const [name, png] of Object.entries(previews)) {
    await writeFile(join(previewDir, name + '.png'), Buffer.from(png, 'base64'));
  }
  await writeFile(join(qa, 'QA_homeowner.json'), JSON.stringify({
    ...report,
    bytes: bytes.length,
    previewDimensions: [1080, 1920],
    previews: Object.keys(previews).map(name => 'previews/' + name + '.png'),
    validator: { version: gltf.validatorVersion, errors: gltf.issues.numErrors, warnings },
    tools: { blender: '4.3.2', node: process.version, chromium: await browser.version() },
  }, null, 2) + '\n');
  console.log('Homeowner rig validated. Four previews rendered.');
} finally {
  await browser?.close();
  server.close();
}
