// Look check for the toon sedan: the same cliff road, sun and ink pass as the approved Codex first stills.
// 0 three-quarter front, 1 windshield approach, 2 driver-side window, 3 rail-side low, 4 orange cabin car (reference).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, RenderPass} from 'postprocessing';
import {InkPass} from '../../../../templates/bridge/ink';
import {createCar, createCliffRoad, createGuardrail} from '../../assets/models.mjs';
import {createDriver} from '../../assets/driver';
import {loadSedan, type Sedan} from '../../assets/sedan';

export const CAR_LOOK_FRAMES = 5;

export const CarLook: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const [sedan, setSedan] = useState<Sedan | null>(null);
  const [handle] = useState(() => delayRender('sedan'));
  useLayoutEffect(() => {
    loadSedan(staticFile('car-sedan/Car_Sedan.glb')).then(s => { setSedan(s); continueRender(handle); });
  }, [handle]);

  useLayoutEffect(() => {
    if (!sedan) return;
    const renderer = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: false, preserveDrawingBuffer: true});
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#a6cce1');
    scene.fog = new THREE.Fog('#a6cce1', 26, 75);
    const sun = new THREE.DirectionalLight('#ffe3ae', 2.2);
    sun.position.set(8, 15, -7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12});
    sun.shadow.normalBias = .02;
    scene.add(new THREE.HemisphereLight('#dbe5ff', '#8d605d', 1.55), sun, createCliffRoad());

    const driver = createDriver();
    let car: THREE.Object3D;
    if (frame === 4) {
      const c = createCar();
      c.interior.add(driver.card);
      car = c.root;
    } else {
      car = sedan.root;
      const k = sedan.cushion;
      const c = k.getCenter(new THREE.Vector3());
      driver.card.scale.setScalar(1.12);
      driver.card.position.set(c.x, k.max.y + .33, c.z + .18);
      sedan.interior.add(driver.card);
      sedan.steering.rotation.set(0, 0, 0);
    }
    car.position.set(0, .01, 7);
    scene.add(car);
    if (frame === 3) {
      const rail = createGuardrail({curved: true});
      rail.setTerminal({modern: false});
      rail.oldEnd.visible = false;
      rail.root.position.x = 3.26;
      scene.add(rail.root);
      car.position.set(2.0, .01, 7.1);
      car.rotation.y = .06;
    }
    const camera = new THREE.PerspectiveCamera(40, width / height, .04, 140);
    camera.layers.enable(3);
    const aim = (p: number[], t: number[]) => { camera.position.set(p[0], p[1], p[2]); camera.lookAt(t[0], t[1], t[2]); };
    // the sedan's driver sits at +X (left-hand drive): driver-side views come from +X
    if (frame === 0) aim([5.6, 3.0, 13.2], [0, .7, 7]);
    if (frame === 1) aim([1.0, 1.5, 12.4], [.35, 1.05, 7.2]);
    if (frame === 2) aim([3.6, 1.45, 7.6], [.3, 1.05, 6.95]);
    if (frame === 3) aim([7.4, 3.4, 2.4], [2.7, .46, 7.6]);
    if (frame === 4) aim([-3.3, 1.39, 8.1], [-.42, 1.13, 7.15]);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    driver.faceCamera(camera);
    const composer = new EffectComposer(renderer, {multisampling: 4});
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new InkPass(scene, camera));
    composer.render();
    return () => {
      scene.remove(car);
      if (driver.card.parent) driver.card.parent.remove(driver.card);
      composer.dispose();
      driver.dispose();
      renderer.dispose();
    };
  }, [frame, width, height, sedan]);

  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
};
