// Install three@0.177.0, gltf-validator and puppeteer-core before running.
// Run with --asset NAME for an individual asset check, or --render for the full QA.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import validator from 'gltf-validator';
import puppeteer from 'puppeteer-core';

const qa = dirname(fileURLToPath(import.meta.url));
const props = resolve(qa, '../props');
const threeBuild = dirname(fileURLToPath(import.meta.resolve('three')));
const assetNodes = {
  Car_Sedan: [
    'Driver_Body', 'Passenger_Body', 'Floorpan', 'Carpet', 'Mirror_Housing',
    'Hood', 'Trunk_Lid', 'Front_Bumper', 'Rear_Bumper', 'Lower_Intake',
    'Grille_Surround', 'Rear_License_Plate', 'Headlight_L', 'Headlight_R',
    'Taillight_L', 'Taillight_R', 'Roof', 'Headliner', 'Window_FL', 'Window_FR',
    'Window_RL', 'Window_RR', 'Windshield', 'Rear_Glass', 'Front_Door_Trim',
    'Rear_Door_Trim', 'Dashboard', 'Instrument_Binnacle', 'Center_Stack',
    'Center_Console', 'Gear_Lever', 'Driver_Seat', 'Passenger_Seat',
    'Seat_Cushion', 'Seat_Back', 'Headrest', 'Rear_Seat_Cushion', 'Rear_Seat_Back',
    'Driver_Seat_Anchor', 'Steering_Wheel', 'Steering_Rim', 'Wheel_FL', 'Wheel_FR',
    'Wheel_RL', 'Wheel_RR',
  ],
  Rotisserie_Tray: ['Tray_Base', 'Tray_Lid', 'Roast_Chicken'],
  Newspaper_Folded: ['Newsprint', 'Center_Fold'],
  Vault_Pole: ['Fiberglass_Shaft', 'Tip_Cap', 'Tape_Grip_1', 'Tape_Grip_2', 'Upper_Plug'],
  Metal_File: ['Grip', 'Ferrule', 'File_Blade'],
  Claw_Hammer: ['Handle', 'Grip', 'Hammer_Head', 'Strike_Face'],
  Screwdriver: ['Red_Grip', 'Collar', 'Shaft', 'Blade_Tip'],
  Account_Statement: ['Statement_Card', 'Statement_Print'],
  Plywood_Board: ['Plywood', 'Nail_Head_1', 'Nail_Head_2'],
};
const individual = process.argv.indexOf('--asset');
const names = individual < 0 ? Object.keys(assetNodes) : [process.argv[individual + 1]];
for (const name of names) assert.ok(Object.hasOwn(assetNodes, name), 'Unknown asset: ' + name);

const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
const load = async name => (await loader.loadAsync('/props/' + name + '.glb')).scene;
window.check = async (name, expected, exportedNames) => {
  const scene = await load(name);
  const root = scene.getObjectByName(name);
  const names = [];
  const textures = new Set();
  let lights = 0, cameras = 0;
  scene.traverse(node => {
    names.push(node.name);
    lights += Number(!!node.isLight);
    cameras += Number(!!node.isCamera);
    for(const material of [node.material].flat()) {
      if (material?.map) textures.add(material.map);
    }
  });
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).toArray();
  const nodes = Object.fromEntries(expected.map(key => {
    const node = root?.getObjectByName(key);
    return [key, node ? node.getWorldPosition(new THREE.Vector3()).toArray() : null];
  }));
  const metrics = {};
  if (name === 'Car_Sedan') {
    const crown = new THREE.Vector3(-.38, .556 + .75, .36);
    const ray = new THREE.Raycaster(crown, new THREE.Vector3(0,1,0));
    metrics.seatedHeadroomMeters = ray.intersectObject(root.getObjectByName('Headliner'))[0]?.distance;
    metrics.hipToCrownMeters = .75;
    const shoulder = new THREE.Vector3(-.56, 1.09, .31);
    metrics.shoulderToNearRimMeters = shoulder.distanceTo(new THREE.Vector3(-.54, 1.02, -.30));
    metrics.emptySeatAnchor = root.getObjectByName('Driver_Seat_Anchor')?.children.length === 0 &&
      !root.getObjectByName('Driver_Seat_Anchor')?.isMesh;
    metrics.emissiveLamps = ['Headlight_L','Headlight_R','Taillight_L','Taillight_R'].every(
      key => root.getObjectByName(key)?.material?.emissive?.getHex() > 0);
  }
  return {revision: THREE.REVISION, missing: expected.filter(key => !root?.getObjectByName(key)),
    missingExported: exportedNames.filter(key => !names.includes(key)),
    root: root?.position.toArray(), lights, cameras, size, nodes, metrics,
    textures: [...textures].map(t => [t.image.width, t.image.height])};
};
window.renderPreview = async (name, width, height) => {
  const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setSize(width,height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x33353a);
  scene.add(new THREE.HemisphereLight(0xe8eef9, 0x756559, 1.75));
  const key = new THREE.DirectionalLight(0xffdbad, 2.65);
  key.position.set(-4,6,-4); scene.add(key);
  let camera = new THREE.PerspectiveCamera(38,width/height,.015,100);
  const aim = (position,target) => {camera.position.set(...position); camera.lookAt(...target);};
  const stage = (x,y,z) => {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x,z),new THREE.MeshStandardMaterial({color:0x494746,roughness:.92}));
    floor.rotation.x = -Math.PI/2; floor.position.y=y; scene.add(floor);
  };
  if (name === 'Car_34' || name === 'Car_Driver') {
    const car = await load('Car_Sedan'); scene.add(car);
    stage(100,-.013,100);
    const shadow = document.createElement('canvas');shadow.width=shadow.height=256;
    const ctx=shadow.getContext('2d');const gradient=ctx.createRadialGradient(128,128,13,128,128,120);
    gradient.addColorStop(0,'#111216de');gradient.addColorStop(.55,'#111216aa');gradient.addColorStop(1,'#11121600');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.2,6.4),new THREE.MeshBasicMaterial({
      map:new THREE.CanvasTexture(shadow),transparent:true,depthWrite:false}));
    contact.rotation.x=-Math.PI/2;contact.position.y=-.009;scene.add(contact);
    if(name === 'Car_34') {
      camera.fov = 48; camera.updateProjectionMatrix();
      aim([-7.5,3.9,-8.6],[0,.69,0]);
    }
    else {
      for(const key of ['Window_FL','Window_RL'])car.getObjectByName(key).visible=false;
      camera.fov = 52; camera.updateProjectionMatrix();
      aim([-1.46,1.22,.16],[-.16,.82,.03]);
      key.position.set(-4,5,4);
    }
  } else if (name === 'Statement_Close') {
    scene.background = new THREE.Color(0x383c3f);
    scene.add(await load('Account_Statement'));
    key.position.set(-1,2,4); key.intensity = 1.7;
    camera.fov = 39; camera.updateProjectionMatrix();
    aim([0,0,.6],[0,0,0]);
  } else {
    camera = new THREE.OrthographicCamera(-1.76,1.76,2.75,-2.75,.01,50);
    aim([0,2.62,9],[0,2.62,0]);
    scene.background = new THREE.Color(0x292e33);
    key.position.set(-2,4,6);
    const items = [
      ['Vault_Pole',-1.36,0,0,0],
      ['Plywood_Board',.13,4.28,0,0],
      ['Newspaper_Folded',-.70,3.25,0,0],
      ['Account_Statement',.40,3.22,0,0],
      ['Rotisserie_Tray',.93,3.15,.12,.53],
      ['Metal_File',-.65,2.21,0,0],
      ['Claw_Hammer',-.09,2.21,0,0],
      ['Screwdriver',.55,2.21,0,0],
    ];
    for (const [asset,x,y,z,rx] of items) {
      const model=await load(asset);model.position.set(x,y,z);model.rotation.x=rx;scene.add(model);
    }
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(.055,1.8,.04),new THREE.MeshStandardMaterial({color:0xbdb3a0}));
    ruler.position.set(.96,.9,0);scene.add(ruler);
    const mark = new THREE.MeshBasicMaterial({color:0x333334});
    for(let i=1;i<18;i++){
      const tick = new THREE.Mesh(new THREE.BoxGeometry(i%5===0?.047:.026,.006,.002),mark);
      tick.position.set(.96,i/10,.021);scene.add(tick);
    }
    const label = (text,x,y,w) => {
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=130;
      const ctx=canvas.getContext('2d');ctx.font='bold 61px Arial';ctx.fillStyle='#e6ded2';ctx.textAlign='center';
      ctx.fillText(text,384,83);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,toneMapped:false}));
      sprite.scale.set(w,w*130/768,1);sprite.position.set(x,y,.5);scene.add(sprite);
    };
    label('1.8 m',1.26,1.8,.64);
    label('Plywood',.13,4.02,.85);label('Newspaper',-.56,2.94,.89);
    label('Statement',.38,2.94,.82);label('Tray',.97,2.94,.60);
    label('File',-.65,1.99,.60);label('Hammer',-.09,1.99,.67);label('Screwdriver',.57,1.99,.85);
    label('Vault pole',-.98,.14,.78);
  }
  renderer.render(scene,camera);
};
</script>`;

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    } else if (/^\/props\/\w+\.glb$/.test(req.url)) {
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.end(await readFile(join(props, req.url.slice(7))));
    } else if (req.url.startsWith('/three/')) {
      const path = resolve(threeBuild, '..', req.url.slice(7));
      assert.ok(path.startsWith(resolve(threeBuild, '..') + '/'));
      res.setHeader('Content-Type', 'text/javascript');
      res.end(await readFile(path));
    } else {
      res.writeHead(404).end();
    }
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const report = { threeRevision: 177, assets: {}, previews: [] };
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.waitForFunction(() => typeof window.check === 'function');
  for (const name of names) {
    const bytes = await readFile(join(props, name + '.glb'));
    assert.equal(bytes.toString('ascii',0,4), 'glTF');
    assert.ok(bytes.length < (name === 'Car_Sedan' ? 12 : 3) * 1_000_000);
    const jsonEnd = 20 + bytes.readUInt32LE(12);
    const json = JSON.parse(bytes.toString('utf8',20,jsonEnd));
    assert.ok(json.images?.every(image => image.bufferView !== undefined && !image.uri));
    assert.ok(json.buffers?.every(buffer => !buffer.uri));
    const validatorResult = await validator.validateBytes(new Uint8Array(bytes), { uri: name + '.glb' });
    assert.equal(validatorResult.issues.numErrors, 0, JSON.stringify(validatorResult.issues.messages.slice(0,3)));
    const exported = json.nodes.map(node => node.name).filter(Boolean);
    const loaded = await page.evaluate((name, expected, exported) => window.check(name, expected, exported),
      name, assetNodes[name], exported);
    assert.equal(loaded.revision, '177');
    assert.deepEqual(loaded.missing, []);
    assert.deepEqual(loaded.missingExported, []);
    assert.deepEqual(loaded.root, [0,0,0]);
    assert.equal(loaded.lights + loaded.cameras, 0);
    assert.ok(loaded.textures.length > 0);
    assert.ok(loaded.textures.every(size => size.every(px => px >= 512 && px <= 1024)));
    if (name === 'Car_Sedan') {
      assert.ok(loaded.metrics.seatedHeadroomMeters >= .08, JSON.stringify(loaded.metrics));
      assert.ok(loaded.metrics.shoulderToNearRimMeters < .7);
      assert.ok(loaded.metrics.emptySeatAnchor && loaded.metrics.emissiveLamps);
      assert.ok(loaded.nodes.Steering_Wheel.every((value, i) => Math.abs(value - [-.38,.98,-.30][i]) < .001));
      assert.ok(loaded.nodes.Driver_Seat_Anchor.every((value, i) => Math.abs(value - [-.38,.57,.36][i]) < .02));
    }
    report.assets[name + '.glb'] = {
      bytes: bytes.length, validatorErrors: 0, validatorWarnings: validatorResult.issues.numWarnings,
      sizeMeters: loaded.size, textureSizes: loaded.textures, namedNodes: exported, metrics: loaded.metrics,
    };
    console.log(name + ' passed');
  }
  if (process.argv.includes('--render')) {
    await mkdir(join(qa,'previews'), {recursive:true});
    for (const [name,width,height] of [
      ['Car_34',1080,1920], ['Car_Driver',1080,1080], ['Props_Sheet',1280,2000], ['Statement_Close',1080,1920],
    ].filter(([preview]) => individual < 0 ||
      (names[0] === 'Car_Sedan' && preview.startsWith('Car_')))) {
      await page.setViewport({width,height});
      await page.evaluate((...args) => window.renderPreview(...args), name,width,height);
      await page.screenshot({path: join(qa,'previews',name + '.png')});
      report.previews.push({file: name + '.png', width, height});
      console.log(name + ' rendered');
    }
  }
  if (individual < 0 && process.argv.includes('--render')) await writeFile(join(qa,'QA_props.json'), JSON.stringify(report,null,2) + '\n');
} finally {
  await browser?.close();
  server.close();
}
