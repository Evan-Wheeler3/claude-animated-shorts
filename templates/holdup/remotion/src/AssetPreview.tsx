// Generic asset preview (Codex self-check + Claude acceptance): every asset in the public dir's assets.json, in the
// Hold Up look (ink, grade, day light), next to a 1.75 m toon sailor for scale. Three views per asset (frame = 3*i+v):
//   v0 three-quarter with the sailor, v1 side elevation from -X, v2 moving parts opened (open.sign) close-up, or a
//   high three-quarter view when the asset has no parts.
// Run: ASSETS_DIR=../../../videos/<story-id>/assets ./preview.sh <outdir>
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {NOINK} from '../../../bridge/ink';
import {bodyFront} from '../../../bridge/toon';
import {Card, faceCards, toLambert} from './kit/cards';
import {makeComposer} from './kit/post';

type Part = {pattern: string; open?: {axis: 'x' | 'y' | 'z'; sign?: number}};
type Entry = {id: string; file: string; parts?: Part[]};
type Loaded = {e: Entry; root: THREE.Group; box: THREE.Box3};
export const PREVIEW_MAX = 3 * 40;   // up to 40 assets

export const AssetPreview: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [lib, setLib] = useState<Loaded[] | null>(null);
  const [handle] = useState(() => delayRender('assets'));
  useLayoutEffect(() => {
    fetch(staticFile('assets.json')).then(r => r.json()).then(async (m: {assets: Entry[]}) => {
      const loader = new GLTFLoader();
      const all = await Promise.all(m.assets.map(e => loader.loadAsync(staticFile(e.file)).then(g => {
        toLambert(g.scene); g.scene.updateMatrixWorld(true);
        return {e, root: g.scene, box: new THREE.Box3().setFromObject(g.scene)};
      })));
      setLib(all); continueRender(handle);
    }).catch(err => { console.error(err); continueRender(handle); });
  }, [handle]);

  useLayoutEffect(() => {
    if (!lib) return;
    const a = lib[Math.floor(frame / 3)], view = frame % 3;
    const renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9fc3ea');
    if (!a) { renderer.render(scene, new THREE.PerspectiveCamera()); return () => renderer.dispose(); }
    const sun = new THREE.DirectionalLight('#fff0d8', 2.6); sun.position.set(-40, 60, 35); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const size = a.box.getSize(new THREE.Vector3()), c = a.box.getCenter(new THREE.Vector3()), R = Math.max(size.x, size.y, size.z);
    Object.assign(sun.shadow.camera, {left: -R, right: R, top: R, bottom: -R, far: 4 * R + 100});
    scene.add(new THREE.HemisphereLight('#d6e4ff', '#7a6650', 1.3), sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40 * R + 200, 40 * R + 200), new THREE.MeshLambertMaterial({color: '#b9a98c'}));
    ground.rotation.x = -Math.PI / 2; ground.position.y = a.box.min.y - .001; ground.receiveShadow = true;
    const root = a.root.clone(true);
    scene.add(ground, root);
    // the scale reference: a 1.75 m sailor beside the asset (front-left)
    const s = new Card(1.75, .5).draw(p => bodyFront(p, {jacket: '#8a3b2e', pants: '#4a4f5a', boots: '#3a2a20', hat: 'hair', hair: '#5a3b2a'}, {mode: 'stand', expr: 'neutral', seed: 3}));
    s.mesh.position.set(a.box.min.x - .7, a.box.min.y, c.z + Math.min(1.5, size.z * .3));
    scene.add(s.mesh);
    const cam = new THREE.PerspectiveCamera(40, width / height, .03, 40 * R + 500);
    cam.layers.enable(NOINK);
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * width / height);
    const fit = (r: number) => r / Math.sin(hfov / 2) * 1.05;
    const r0 = Math.max(size.length() / 2, 1.2);
    let target = c.clone(), dir = new THREE.Vector3(-1, .45, -1).normalize(), dist = fit(r0);
    if (view === 1) { dir = new THREE.Vector3(-1, .08, 0).normalize(); dist = fit(Math.max(size.z, size.y) / 2 + .8); }
    if (view === 2) {
      const opened: THREE.Object3D[] = [];
      for (const p of a.e.parts ?? []) {
        const re = new RegExp(p.pattern);
        root.traverse((o: THREE.Object3D) => { if (re.test(o.name) && p.open) { const ax = p.open.axis; (o.rotation as unknown as Record<string, number>)[ax] += (p.open.sign ?? 1) * 1.1; opened.push(o); } });
      }
      root.updateMatrixWorld(true);
      if (opened.length) {
        const pb = new THREE.Box3().setFromObject(opened[Math.floor(opened.length / 2)]);
        target = pb.getCenter(new THREE.Vector3());
        const out = new THREE.Vector3(target.x - c.x, 0, target.z - c.z).normalize();
        dir = out.lengthSq() ? out.add(new THREE.Vector3(0, .25, -.35)).normalize() : new THREE.Vector3(-1, .3, -.6).normalize();
        dist = fit(Math.max(pb.getSize(new THREE.Vector3()).length() * 4, 4));   // shows the part and its neighbours
      } else { dir = new THREE.Vector3(-.8, 1.1, -.9).normalize(); }
    }
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld(); scene.updateMatrixWorld(true);
    faceCards(scene, cam);
    const {composer, lens} = makeComposer(renderer, scene, cam);
    lens.cInf = 0;
    composer.render();
    return () => { composer.dispose(); renderer.dispose(); };
  }, [frame, width, height, lib]);

  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
