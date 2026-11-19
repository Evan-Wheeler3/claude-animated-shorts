// Install three@0.177.0, gltf-validator and puppeteer-core in a Node module
// directory. GREGORY_NODE_MODULES can point to that directory for this script.
// Use --render to regenerate the four previews. Chromium and ffmpeg are required.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createReadStream, existsSync} from 'node:fs'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const directory = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const from = (name) => require.resolve(process.env.GREGORY_NODE_MODULES
  ? join(process.env.GREGORY_NODE_MODULES, name) : name)
const validator = require(from('gltf-validator'))
const {launch} = require(from('puppeteer-core'))
const threeRoot = resolve(from('three'), '../..')
const pug = resolve(directory, '../cast/Gregory_Pug_Rig.glb')
const phil = resolve(directory, '../bathroom/assets/Phil_Standing_Rig.glb')
const renderPreviews = process.argv.includes('--render')
const previews = join(directory, 'previews')
const contents = await readFile(pug)
assert.ok(contents.length < 10_000_000, 'GLB must be under 10 MB')
const validation = await validator.validateBytes(new Uint8Array(contents), {uri: 'Gregory_Pug_Rig.glb'})
assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues.messages, null, 2))

function browserMain() {
  return `
  import * as T from 'three'
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
  const check = (condition, description) => {
    if (!condition) throw new Error(description)
  }
  const loader = new GLTFLoader()
  const {scene: dog, animations, parser} = await loader.loadAsync('/gregory.glb')
  check(T.REVISION === '177', 'Expected three.js r177')
  const get = (name) => {
    const node = dog.getObjectByName(name)
    check(node, 'Missing node ' + name)
    return node
  }
  const bones = ['Root','Spine0','Spine1','Neck','Head','Jaw','Tail0','Tail1','Ear_L','Ear_R']
  for (const place of ['Front','Hind']) {
    for (const side of ['L','R']) {
      for (let i = 0; i < 3; i++) bones.push(place + 'Leg_' + side + i)
    }
  }
  const boneNames = bones.map(name => 'Pug_' + name)
  for (const name of boneNames) check(get(name).isBone, name + ' must be a bone')
  const body = get('Gregory_Body')
  const coat = body.children.find(mesh => mesh.material.name === 'Short fawn coat and charcoal mask')
  check(coat?.isSkinnedMesh, 'Gregory_Body coat must be skinned')
  const morphs = ['Blink','Sniff','EyesLeft','EyesRight']
  for (const name of morphs) check(name in coat.morphTargetDictionary, 'Missing morph ' + name)
  const collar = get('Pug_Collar')
  check(collar.isSkinnedMesh, 'Pug_Collar must be a separate skinned mesh')
  const neckIndex = collar.skeleton.bones.indexOf(get('Pug_Neck'))
  const collarJoints = collar.geometry.getAttribute('skinIndex')
  const collarWeights = collar.geometry.getAttribute('skinWeight')
  for (let i = 0; i < collarJoints.count; i++) {
    check(collarJoints.getX(i) === neckIndex && collarWeights.getX(i) === 1, 'Collar must follow the neck')
  }
  const tag = get('Gregory_Tag')
  check(tag.parent === get('Pug_Neck'), 'Gregory_Tag must be independently hideable under Pug_Neck')
  const clips = {Idle_Alert: 60, Sniff: 30, Scoot_Forward: 15, Sit: 12, Blink: 4}
  for (const [name, frames] of Object.entries(clips)) {
    const clip = animations.find(clip => clip.name === name)
    check(clip && Math.abs(clip.duration - frames / 30) < 1e-6, 'Missing clip or wrong duration ' + name)
    for (const track of clip.tracks) {
      for (const time of track.times) check(Math.abs(time * 30 - Math.round(time * 30)) < 1e-5, 'Off-frame key ' + name)
    }
  }
  const mixer = new T.AnimationMixer(dog)
  const actions = Object.fromEntries(animations.map(clip => {
    const action = mixer.clipAction(clip).setLoop(T.LoopOnce, 1)
    action.clampWhenFinished = true
    return [clip.name, action]
  }))
  const root = get('Pug_Root')
  function pose(name, time = 0, scootOffset = 0) {
    mixer.stopAllAction()
    if (name) {
      actions[name].reset().play()
      mixer.setTime(time)
    }
    if (scootOffset) dog.position.z = scootOffset
    else dog.position.z = 0
    dog.updateMatrixWorld(true)
  }
  const contacts = parser.json.meshes.find(mesh => mesh.name === 'Gregory_Body').extras.pawContactVertices
  check(contacts.length === 4, 'Expected four paws')
  function contactHeights() {
    const vertex = new T.Vector3()
    return Object.fromEntries(contacts.map(({name, vertices}) => {
      check(vertices.length > 0, 'Missing contact vertices ' + name)
      const height = Math.min(...vertices.map(index => {
        coat.getVertexPosition(index, vertex)
        return coat.localToWorld(vertex).y
      }))
      check(Math.abs(height) < .0001, name + ' is off the floor at ' + height)
      return [name, Number(height.toFixed(6))]
    }))
  }
  pose()
  const rest = contactHeights()
  check(root.position.length() < 1e-7, 'Pug_Root must be at floor origin')
  pose('Sit', 12 / 30)
  const sit = contactHeights()
  pose('Scoot_Forward', 15 / 30)
  check(Math.abs(root.position.z - .45) < 1e-6, 'Scoot must travel +0.45 m in Z')
  const travel = Number(root.position.z.toFixed(6))
  const feet = contacts.map(({name}) => get(name))
  pose()
  const restFootY = feet.map(foot => foot.getWorldPosition(new T.Vector3()).y)
  let maxStanceSlide = 0
  let stanceSamples = 0
  let previous
  for (let frame = 0; frame <= 15; frame++) {
    pose('Scoot_Forward', frame / 30)
    const current = feet.map(foot => foot.getWorldPosition(new T.Vector3()))
    if (previous) current.forEach((foot, index) => {
      const last = previous[index]
      if (Math.abs(foot.y - restFootY[index]) < 1e-6 && Math.abs(last.y - restFootY[index]) < 1e-6) {
        maxStanceSlide = Math.max(maxStanceSlide, Math.hypot(foot.x - last.x, foot.z - last.z))
        stanceSamples++
      }
    })
    previous = current
  }
  check(stanceSamples >= 16 && maxStanceSlide < 1e-6, 'Scoot stance: ' + stanceSamples + ' pairs, max slide ' + maxStanceSlide)
  const report = {
    three: T.REVISION, bones: boneNames, morphs, clipFramesAt30Fps: clips,
    nodes: [body.name, collar.name, tag.name], floorHeightsMeters: {rest, sit},
    scootTravelMeters: travel, stanceSamples, maxStanceSlideMeters: Number(maxStanceSlide.toFixed(8))
  }

  dog.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = false
    }
  })
  const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true})
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  const scene = new T.Scene()
  scene.background = new T.Color('#465450')
  scene.fog = new T.FogExp2('#465450', .15)
  scene.add(dog)
  const floor = new T.Mesh(new T.PlaneGeometry(100, 100), new T.MeshStandardMaterial({
    color: '#57615a', roughness: .89
  }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  scene.add(new T.HemisphereLight('#e2eeff', '#766352', 1.8))
  const key = new T.DirectionalLight('#ffdab5', 2.7)
  key.position.set(-1.7, 2.4, 2.1)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.normalBias = .002
  Object.assign(key.shadow.camera, {left: -1.65, right: 1.65, top: 1.65, bottom: -1.65, far: 8})
  scene.add(key)
  const rim = new T.DirectionalLight('#e0ebff', 1.3)
  rim.position.set(.8, .9, -.6)
  scene.add(rim)
  document.body.style.margin = 0
  document.body.append(renderer.domElement)
  const camera = new T.PerspectiveCamera(32, 9 / 16, .025, 70)
  let phil
  async function getPhil() {
    if (!phil) {
      phil = (await loader.loadAsync('/phil.glb')).scene
      phil.traverse(object => {
        if (object.isMesh) {
          object.castShadow = true
          object.frustumCulled = false
        }
      })
      phil.position.set(-.28, 0, -.07)
      scene.add(phil)
    }
    return phil
  }
  window.gregory = {
    report,
    async render(kind, frame) {
      const motion = kind === 'motion'
      const width = motion ? 360 : 1080
      renderer.setSize(width, motion ? 640 : 1920)
      if (phil) phil.visible = false
      switch (kind) {
        case 'threeQuarter':
          pose('Idle_Alert', .38)
          camera.fov = 33
          camera.position.set(.57, .38, .78)
          camera.lookAt(0, .205, .025)
          break
        case 'sitTag': {
          pose('Sit', 12 / 30)
          camera.fov = 33
          const focus = new T.Vector3(0, .30, .023)
          camera.position.copy(focus).add(new T.Vector3(.12, .015, .79).normalize().multiplyScalar(.8))
          camera.lookAt(0, .211, .035)
          break
        }
        case 'scale': {
          pose()
          const actor = await getPhil()
          actor.visible = true
          dog.position.x = .31
          const bounds = new T.Box3().setFromObject(actor, true)
          const height = bounds.max.y - bounds.min.y
          check(height > 1.3 && height < 2.2, 'Phil must be at adult scale')
          camera.fov = 36
          camera.position.set(.42, 1.04, height * 1.82)
          camera.lookAt(-.025, height * .51, 0)
          break
        }
        case 'motion': {
          const t = frame / 30
          dog.position.x = 0
          if (t < .40) pose('Idle_Alert', t)
          else if (t < .90) pose('Scoot_Forward', t - .40)
          else if (t < 1.30) pose('Sit', t - .90, .45)
          else {
            pose('Sit', .40, .45)
            const blinkTime = t - 1.80
            if (blinkTime >= 0 && blinkTime <= animations.find(clip => clip.name === 'Blink').duration) {
              actions.Blink.reset().play()
              mixer.update(blinkTime)
              dog.updateMatrixWorld(true)
            }
          }
          const follow = .33 * T.MathUtils.smoothstep(t, .4, 1.1)
          camera.fov = 36
          camera.position.set(.72 - .23 * follow / .33, .36, .89 + follow)
          camera.lookAt(0, .20, .04 + follow)
          break
        }
      }
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
  }
  `
}

const html = `<!doctype html><meta charset="utf-8"><script type="importmap">
{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}
</script><script type="module" src="/main.js"></script>`
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname
  if (path === '/' || path === '/main.js') {
    const isPage = path === '/'
    response.setHeader('Content-Type', isPage ? 'text/html' : 'text/javascript')
    response.end(isPage ? html : browserMain())
    return
  }
  const file = path === '/gregory.glb' ? pug : path === '/phil.glb' ? phil
    : path.startsWith('/three/') ? join(threeRoot, path.slice(7)) : null
  if (!file || !existsSync(file)) {
    response.writeHead(404).end()
    return
  }
  response.setHeader('Content-Type', path.endsWith('.glb') ? 'model/gltf-binary' : 'text/javascript')
  createReadStream(file).pipe(response)
})
await new Promise((done, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', done)
})
let browser
let scratch
try {
  browser = await launch({
    executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  })
  const page = await browser.newPage()
  let failPage
  const failed = new Promise((_, reject) => { failPage = reject })
  page.on('pageerror', failPage)
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await Promise.race([failed, page.waitForFunction(() => Boolean(window.gregory))])
  const report = await page.evaluate(() => window.gregory.report)
  const rendered = {}
  if (renderPreviews) {
    await mkdir(previews, {recursive: true})
    await page.setViewport({width: 1080, height: 1920})
    for (const [kind, name] of Object.entries({
      threeQuarter: 'Gregory_34.png', sitTag: 'Gregory_Sit_Tag.png', scale: 'Gregory_Scale.png'
    })) {
      await page.evaluate(kind => window.gregory.render(kind), kind)
      await page.screenshot({path: join(previews, name)})
      rendered[name] = {width: 1080, height: 1920}
    }
    scratch = await mkdtemp(join(tmpdir(), 'gregory-motion-'))
    await page.setViewport({width: 360, height: 640})
    for (let frame = 0; frame < 90; frame++) {
      await page.evaluate(frame => window.gregory.render('motion', frame), frame)
      await page.screenshot({path: join(scratch, `frame-${String(frame).padStart(3, '0')}.png`)})
    }
    const motion = 'Gregory_Motion.mp4'
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-framerate', '30', '-i', join(scratch, 'frame-%03d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(previews, motion)
    ])
    rendered[motion] = {width: 360, height: 640, fps: 30, seconds: 3}
  }
  const output = {
    asset: 'Gregory_Pug_Rig.glb', bytes: contents.length, validator: validation.issues,
    ...report, ...(renderPreviews && {
      rendering: {toneMapping: 'ACES Filmic', exposure: 1.25, outputColorSpace: 'sRGB', previews: rendered}
    })
  }
  if (renderPreviews || !existsSync(join(directory, 'QA_gregory.json'))) {
    await writeFile(join(directory, 'QA_gregory.json'), JSON.stringify(output, null, 2) + '\n')
  }
  console.log(`Gregory validated with glTF Validator and three.js r${report.three} (${contents.length} bytes)`)
} finally {
  if (scratch) await rm(scratch, {recursive: true, force: true})
  await browser?.close()
  server.close()
}
