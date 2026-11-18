// Install three@0.177.0, gltf-validator and playwright-core. Set HALLWAY_QA_DEPS
// to their install prefix if needed and CHROMIUM_PATH to use a system Chromium.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = dirname(fileURLToPath(import.meta.url));
const require = createRequire(process.env.HALLWAY_QA_DEPS
  ? resolve(process.env.HALLWAY_QA_DEPS, 'package.json') : import.meta.url);
const { validateBytes } = require('gltf-validator');
const { chromium } = require('playwright-core');
const three = resolve(dirname(require.resolve('three')), '..');
const hallway = await readFile(resolve(qa, '../interior/Hallway.glb'));
const bathroom = await readFile(resolve(qa, '../bathroom/assets/Bathroom_Set.glb'));
assert(hallway.length < 15_000_000);
const validation = await validateBytes(hallway, { uri: 'Hallway.glb' });
assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues));
const html = '<style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script>';
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/') res.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
    else if (path === '/Hallway.glb') res.end(hallway);
    else if (path === '/Bathroom_Set.glb') res.end(bathroom);
    else if (path.startsWith('/three/')) {
      const file = resolve(three, path.slice('/three/'.length));
      assert(file.startsWith(three + '/'));
      res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(await readFile(file));
    } else res.writeHead(404).end();
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:' + server.address().port);
  const checks = await page.evaluate(async () => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('/three/examples/jsm/loaders/GLTFLoader.js');
    const { Box3, Vector3 } = THREE;
    function check(condition, message) {
      if (!condition) throw new Error(message);
    }
    const near = (a, b) => Math.abs(a - b) < 1e-5;
    check(THREE.REVISION === '177', 'Expected three.js r177');
    const loader = new GLTFLoader();
    const [hall, bath] = await Promise.all([
      loader.loadAsync('/Hallway.glb'), loader.loadAsync('/Bathroom_Set.glb'),
    ]);
    const names = ['Bath_Door_Hinge', 'Bath_Door', 'Door_Knob', 'Ceiling_Dome',
      'Ceiling_Dome_Lens', 'Console_Table', 'Framed_Picture', 'Steel_Front_Door_Interior', 'Bolt'];
    const nodes = Object.fromEntries(names.map((name) => [name, hall.scene.getObjectByName(name)]));
    for (const name of names) check(nodes[name], 'Missing node ' + name);
    const { Bath_Door_Hinge: hinge, Bath_Door: door, Door_Knob: knob, Bolt: bolt,
      Steel_Front_Door_Interior: steelDoor, Ceiling_Dome: dome, Ceiling_Dome_Lens: lens } = nodes;
    check(!hinge.isMesh && door.parent === hinge && knob.parent === door, 'Bathroom door hierarchy');
    check(near(hinge.position.x, 0) && near(hinge.position.y, 0) && near(hinge.position.z, 3.17), 'Hinge pivot');
    check(bolt.parent === steelDoor && near(bolt.getWorldPosition(new Vector3()).y, 1.1), 'Bolt pivot');
    check(near(bolt.userData.travelZ, -0.12), 'Bolt travel metadata');
    const boltStart = bolt.getWorldPosition(new Vector3());
    bolt.position.z += bolt.userData.travelZ;
    const boltEnd = bolt.getWorldPosition(new Vector3());
    check(near(boltEnd.x, boltStart.x) && near(boltEnd.y, boltStart.y)
      && near(boltEnd.z - boltStart.z, -0.12), 'Bolt world travel');
    bolt.position.z -= bolt.userData.travelZ;
    check(lens.parent === dome && lens.material.emissive.getHex() !== 0, 'Emissive dome lens');
    hall.scene.traverse((node) => check(!node.isLight, 'Unexpected light in hallway asset'));
    const scene = new THREE.Scene();
    scene.add(bath.scene, hall.scene);
    scene.updateMatrixWorld(true);
    const bathFloor = new Box3().setFromObject(bath.scene.getObjectByName('Floor'));
    const bathCeiling = new Box3().setFromObject(bath.scene.getObjectByName('Ceiling'));
    const shell = (prefix) => hall.scene.children.filter((node) => node.name.startsWith(prefix))
      .map((node) => new Box3().setFromObject(node));
    const floorSeam = shell('Oak_Strip_Floor').find((bounds) => near(bounds.min.x, bathFloor.min.x));
    const ceilingSeam = shell('Bath_Ceiling_Seam')[0];
    const hallCeiling = shell('Hall_Ceiling')[0];
    check(near(floorSeam.min.z, bathFloor.max.z) && near(floorSeam.min.y, bathFloor.min.y)
      && near(floorSeam.max.x, bathFloor.max.x), 'Floor seam');
    check(near(ceilingSeam.min.z, bathCeiling.max.z) && near(ceilingSeam.max.z, hallCeiling.min.z)
      && near(ceilingSeam.min.y, bathCeiling.min.y), 'Ceiling seam');
    for (const name of ['Left_Wall', 'Right_Wall']) {
      const bathWall = new Box3().setFromObject(bath.scene.getObjectByName(name));
      check(shell('Doorway_Bath_Face').some((bounds) =>
        near(bounds.min.z, bathWall.max.z)
        && (near(bounds.min.x, bathWall.min.x) || near(bounds.max.x, bathWall.max.x))),
      'Doorway abutment to ' + name);
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1080, 1920);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xa9b5d2, 0x393121, 0.42));
    for (const [color, intensity, distance, position] of [
      [0xffc98a, 6, 9, [0.9, 2.35, 4.4]],
      [0xffc479, 1.75, 7, [-0.11, 1.74, -0.76]],
    ]) {
      const light = new THREE.PointLight(color, intensity, distance, 2);
      light.position.set(...position);
      scene.add(light);
    }
    const shots = {
      S01: { position: [0.42, 0.7, 6.05], target: [0.76, 1.1, 3.0], fov: 60,
        door: -105, subject: 'Toilet_' },
      S15: { position: [1.0, 1.58, 6.35], target: [2.85, 1.42, 4.75], fov: 42,
        door: 0, subject: 'Steel_Front_Door_Interior' },
    };
    window.renderHallway = (shot) => {
      const { position, target, fov, door, subject } = shots[shot];
      hinge.rotation.y = THREE.MathUtils.degToRad(door);
      const camera = new THREE.PerspectiveCamera(fov, 1080 / 1920, 0.025, 35);
      camera.position.set(...position);
      camera.lookAt(...target);
      renderer.render(scene, camera);
      const ray = new THREE.Raycaster();
      let visibleSamples = 0;
      for (let row = 0; row < 100; row++) {
        for (let column = 0; column < 100; column++) {
          ray.setFromCamera({ x: (column + 0.5) / 50 - 1, y: (row + 0.5) / 50 - 1 }, camera);
          const first = ray.intersectObjects([hall.scene, bath.scene], true)[0];
          if (first?.object.name.startsWith(subject)) visibleSamples++;
        }
      }
      check(visibleSamples > 0, subject + ' is occluded in ' + shot);
      return { position, target, fov, doorDegrees: door, subject, visibleSamples, samples: 10000 };
    };
    return { threeRevision: THREE.REVISION, nodes: names, noEmbeddedLights: true,
      abutment: { floorZ: bathFloor.max.z, ceilingZ: bathCeiling.max.z, doorwayZ: 3.05 },
      boltTravelZ: bolt.userData.travelZ };
  });
  const report = { file: 'interior/Hallway.glb', bytes: hallway.length, validator: validation,
    ...checks };
  if (!process.argv.includes('--validate-only')) {
    report.previews = {};
    for (const shot of ['S01', 'S15']) {
      const file = 'previews/Hallway_' + shot + '.png';
      report.previews[shot] = { file, width: 1080, height: 1920,
        ...await page.evaluate((id) => window.renderHallway(id), shot) };
      await page.screenshot({ path: resolve(qa, file) });
    }
    await writeFile(resolve(qa, 'QA_hallway.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log('Hallway validated with 0 glTF errors and three.js r' + checks.threeRevision);
} finally {
  await browser?.close();
  server.close();
}
