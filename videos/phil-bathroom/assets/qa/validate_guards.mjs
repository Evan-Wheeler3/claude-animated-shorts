import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = dirname(fileURLToPath(import.meta.url));
const assets = resolve(qa, '..');
const require = createRequire(process.env.GUARDS_QA_NODE_ROOT
  ? join(resolve(process.env.GUARDS_QA_NODE_ROOT), 'package.json')
  : import.meta.url);
const validator = require('gltf-validator');
const puppeteer = require('puppeteer-core');
const threeRoot = resolve(dirname(require.resolve('three')), '..');
const files = {
  Phil: join(assets, 'bathroom/assets/Phil_Standing_Rig.glb'),
  Homeowner: join(assets, 'cast/Homeowner_Standing_Rig.glb'),
  Guard_A: join(assets, 'cast/Guard_A_Rig.glb'),
  Guard_B: join(assets, 'cast/Guard_B_Rig.glb'),
};
const guards = process.argv.slice(2);
const selected = guards.length ? guards : ['Guard_A', 'Guard_B'];
assert(selected.every(name => name === 'Guard_A' || name === 'Guard_B'));
const previewNames = ['Guards_Front.png', 'Guards_FaceCU.png', 'Guards_Lineup.png'];
const render = !guards.length;
const previewDir = join(qa, 'previews');
if (render) await mkdir(previewDir, { recursive: true });

const validation = {};
for (const name of selected) {
  const bytes = await readFile(files[name]);
  assert(bytes.length < 12_000_000, `${name} exceeds 12 MB`);
  const result = await validator.validateBytes(new Uint8Array(bytes), { uri: name + '_Rig.glb' });
  const { numErrors, numWarnings, messages } = result.issues;
  assert.equal(numErrors, 0, JSON.stringify(messages.filter(issue => issue.severity === 0)));
  validation[name] = {
    bytes: bytes.length,
    validatorVersion: result.validatorVersion,
    errors: numErrors,
    warnings: numWarnings,
    warningCodes: messages.filter(issue => issue.severity === 1).map(issue => issue.code),
  };
}

function poseAndMeasure(T, owner, phil, face, parts) {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const bones = face.skeleton.bones;
  const philFace = phil.scene.getObjectByName('Phil_Face');
  function positions(mesh) {
    return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) =>
      mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  owner.scene.updateMatrixWorld(true);
  const rest = [face, ...parts].map(positions);
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
  return strain;
}

async function checkAndRender(T, GLTFLoader, poseAndMeasure, selected, render) {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  check(T.REVISION === '177', 'Three.js r177 is required');
  const loader = new GLTFLoader();
  const load = name => loader.loadAsync('/asset/' + name);
  const phil = await load('Phil');
  const philFace = phil.scene.getObjectByName('Phil_Face');
  const reference = philFace.skeleton.bones;
  const names = Object.keys(philFace.morphTargetDictionary);
  check(reference.length === 80 && names.length === 23, 'Phil reference contract changed');
  const models = {};
  const report = {};
  for (const name of selected) {
    const model = await load(name);
    const face = model.scene.getObjectByName(name + '_Face');
    const wardrobe = model.scene.getObjectByName(name + '_Wardrobe');
    const parts = [];
    wardrobe.traverse(mesh => { if (mesh.isSkinnedMesh) parts.push(mesh); });
    check(face?.isSkinnedMesh && parts.length > 0, name + ' is missing rigged geometry');
    for (const mesh of [face, ...parts]) {
      const bones = mesh.skeleton.bones;
      check(bones.length === 80, name + ' bone count');
      check(bones.every((bone, i) => bone.name === reference[i].name &&
        bone.quaternion.equals(reference[i].quaternion)), name + ' bone order or rest orientation');
    }
    const morphs = Object.keys(face.morphTargetDictionary);
    check(JSON.stringify(morphs) === JSON.stringify(names), name + ' morph names or order');
    check(model.animations.length === 0, name + ' contains clips');
    const textures = new Set();
    let footY = Infinity;
    const point = new T.Vector3();
    model.scene.updateMatrixWorld(true);
    for (const mesh of [face, ...parts]) {
      for (const value of Object.values(mesh.material)) if (value?.isTexture) textures.add(value);
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        footY = Math.min(footY, point.y);
      }
    }
    const textureSizes = [...textures].map(t => [t.image.width, t.image.height]);
    check(Math.abs(footY) < 0.00001, name + ' feet are off the floor: ' + footY);
    check(textureSizes.every(d => Math.max(...d) <= 1024), name + ' oversized texture');
    // Load a fresh reference so the homeowner pose test can also pose Phil.
    const restOrientations = face.skeleton.bones.map(bone => bone.quaternion.clone());
    const seam = poseAndMeasure(T, model, await load('Phil'), face, parts);
    face.skeleton.bones.forEach((bone, i) => bone.quaternion.copy(restOrientations[i]));
    model.scene.updateMatrixWorld(true);
    models[name] = model;
    report[name] = { boneCount: 80, morphCount: 23, footY, textureSizes, clips: 0, seam };
  }
  if (!render) return report;

  const homeowner = await load('Homeowner');
  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1080, 1920);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color(0x82919e);
  scene.add(new T.HemisphereLight(0xe2ebfa, 0x63544c, 2.1));
  const key = new T.DirectionalLight(0xffdfc3, 2.55);
  key.position.set(-3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
  key.shadow.bias = -0.0003;
  scene.add(key);
  const ground = new T.Mesh(new T.PlaneGeometry(50, 50),
    new T.MeshStandardMaterial({ color: 0x6b7985, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.003;
  ground.receiveShadow = true;
  scene.add(ground);
  const camera = new T.PerspectiveCamera(28, 1080 / 1920, 0.01, 100);
  const actors = new T.Group();
  scene.add(actors);
  function place(model, x, angle) {
    model.scene.position.set(x, 0, 0);
    model.scene.rotation.y = angle;
    model.scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.frustumCulled = false;
      }
    });
    actors.add(model.scene);
  }
  function lowerArms(model, faceName) {
    const face = model.scene.getObjectByName(faceName);
    const skeleton = face.skeleton;
    for (const side of ['L', 'R']) {
      const find = name => skeleton.bones.find(b => b.name.replace(/[^a-z0-9]/gi, '') === name);
      const arm = find('Bip01' + side + 'UpperArm');
      const elbow = find('Bip01' + side + 'Forearm');
      check(arm && elbow, 'Arm pose bones missing');
      const delta = elbow.getWorldPosition(new T.Vector3()).sub(arm.getWorldPosition(new T.Vector3())).normalize();
      const desired = new T.Vector3(Math.sign(delta.x) * 0.19, -1, 0.025).normalize();
      const rotation = new T.Quaternion().setFromUnitVectors(delta, desired);
      const parent = arm.parent.getWorldQuaternion(new T.Quaternion());
      arm.quaternion.premultiply(parent.clone().invert().multiply(rotation).multiply(parent));
      arm.updateWorldMatrix(false, true);
    }
  }
  lowerArms(phil, 'Phil_Face');
  lowerArms(homeowner, 'Homeowner_Face');
  async function save(name, y, z, fov) {
    camera.position.set(0, y, z);
    camera.lookAt(0, y, 0);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const blob = await new Promise(resolve => renderer.domElement.toBlob(resolve, 'image/png'));
    const response = await fetch('/preview/' + name, { method: 'POST', body: blob });
    check(response.ok, 'Could not save ' + name);
  }
  const a = models.Guard_A;
  const b = models.Guard_B;
  lowerArms(a, 'Guard_A_Face');
  lowerArms(b, 'Guard_B_Face');
  place(a, -0.36, 0.045);
  place(b, 0.36, -0.045);
  await save('Guards_Front.png', 0.92, 5.26, 28);

  place(a, -0.145, 0.10);
  place(b, 0.145, -0.09);
  for (const [name, model] of Object.entries(models)) {
    const face = model.scene.getObjectByName(name + '_Face');
    for (const [morph, weight] of [['AU_45_Blink', 0.35],
      ['AK_36_MouthPressLeft', 0.3], ['AK_37_MouthPressRight', 0.3]]) {
      face.morphTargetInfluences[face.morphTargetDictionary[morph]] = weight;
    }
  }
  await save('Guards_FaceCU.png', 1.67, 1.40, 39);
  for (const [name, model] of Object.entries(models)) {
    model.scene.getObjectByName(name + '_Face').morphTargetInfluences.fill(0);
  }
  place(phil, -0.99, 0.04);
  place(homeowner, -0.33, 0.02);
  place(a, 0.33, -0.02);
  place(b, 0.99, -0.04);
  await save('Guards_Lineup.png', 0.93, 10.5, 28);
  renderer.dispose();
  return report;
}

const html = `<!doctype html><meta charset="UTF-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script>
<script type="module">
import * as T from 'three';
import { GLTFLoader } from '/three/examples/jsm/loaders/GLTFLoader.js';
window.guardsQA = () => (${checkAndRender.toString()})(T, GLTFLoader,
  ${poseAndMeasure.toString()}, ${JSON.stringify(selected)}, ${render});
</script>`;
const server = createServer(async (request, response) => {
  try {
    const url = request.url;
    if (url === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
      return;
    }
    if (url.startsWith('/preview/') && request.method === 'POST') {
      const name = url.slice('/preview/'.length);
      assert(previewNames.includes(name));
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      await writeFile(join(previewDir, name), Buffer.concat(chunks));
      response.writeHead(204).end();
      return;
    }
    if (url.startsWith('/asset/')) {
      response.writeHead(200, { 'Content-Type': 'model/gltf-binary' })
        .end(await readFile(files[url.slice('/asset/'.length)]));
      return;
    }
    if (url.startsWith('/three/')) {
      const path = resolve(threeRoot, url.slice('/three/'.length));
      assert(path.startsWith(threeRoot + '/'));
      response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(await readFile(path));
      return;
    }
    response.writeHead(404).end();
  } catch (error) {
    if (!response.headersSent) response.writeHead(500);
    response.end(String(error));
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
      '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const tab = await browser.newPage();
  tab.on('pageerror', error => console.error(error.message));
  await tab.goto('http://127.0.0.1:' + server.address().port);
  await tab.waitForFunction(() => typeof window.guardsQA === 'function');
  const details = await tab.evaluate(() => window.guardsQA());
  const summary = Object.fromEntries(selected.map(name =>
    [name, { ...validation[name], ...details[name] }]));
  if (render) {
    const report = { threeRevision: '177', width: 1080, height: 1920, previews: previewNames, guards: summary };
    await writeFile(join(qa, 'QA_guards.json'), JSON.stringify(report, null, 2) + '\n');
  }
  for (const [name, stats] of Object.entries(summary)) {
    console.log(`${name}: ${stats.errors} glTF errors, ${stats.boneCount} bones, ${stats.morphCount} morphs, pose seam passed`);
  }
} finally {
  await browser?.close();
  server.close();
}
