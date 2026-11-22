import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, RenderPass} from 'postprocessing';
import {InkPass} from '../../../templates/bridge/ink';
import {createCar, createCliffRoad, createDischargedSteel, createGuardrail} from './models.mjs';
import {createImpactEffect} from './cards.mjs';
import {createDriver} from './driver';

export const FIRST_STILLS_COUNT = 7;

export function FirstStills() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  useLayoutEffect(() => {
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
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {left: -16, right: 16, top: 16, bottom: -16});
    sun.shadow.normalBias = .02;
    scene.add(new THREE.HemisphereLight('#dbe5ff', '#8d605d', 1.55), sun, createCliffRoad());

    const car = createCar();
    const driver = createDriver();
    const rail = createGuardrail({curved: true});
    const strip = createDischargedSteel();
    const impact = createImpactEffect();
    car.interior.add(driver.card);
    rail.head.add(strip.root);
    rail.root.position.x = 3.26;
    scene.add(car.root, rail.root, impact.root);

    const camera = new THREE.PerspectiveCamera(40, width / height, .04, 140);
    camera.layers.enable(3);
    const aim = (position: [number, number, number], target: [number, number, number]) => {
      camera.position.set(...position);
      camera.lookAt(...target);
    };

    switch (frame) {
      case 0:
        rail.root.visible = false;
        car.root.position.set(4.2, -.55, 9.4);
        car.root.rotation.set(.24, .72, -.2);
        aim([12, 8, .7], [3.2, -1.4, 9.6]);
        break;
      case 1:
        rail.setTerminal({modern: false});
        rail.oldEnd.visible = false;
        rail.setBeam({flex: .25, contact: 7.5});
        car.root.position.set(2.19, .01, 7.1);
        car.root.rotation.y = .06;
        impact.root.position.set(3.14, .5, 7.3);
        impact.setProgress(.32);
        aim([7.4, 3.4, 2.4], [2.7, .46, 7.6]);
        break;
      case 2:
        rail.setTerminal({modern: false});
        car.root.position.set(3.12, .01, -2.03);
        driver.setPose('brace', true);
        aim([.3, 2.3, 2.5], [3.22, .55, -.1]);
        break;
      case 3:
        rail.setTerminal({travel: 3.1, open: true});
        strip.setLength(3.1);
        car.root.position.set(3.12, .01, .92);
        driver.setPose('peek');
        aim([5.65, 2.05, 4.35], [3, .56, 3]);
        break;
      case 4:
        rail.root.visible = false;
        car.exterior.visible = false;
        car.root.position.set(3.12, .01, .92);
        driver.setPose('brace', true);
        aim([1.81, 1.63, 2.15], [2.72, 1.23, 1]);
        break;
      case 5:
        rail.root.visible = false;
        car.root.position.set(0, .01, 7);
        car.steering.rotation.z = -.32;
        aim([-1.15, 1.45, 11.1], [-.36, 1.13, 7.43]);
        break;
      default:
        rail.root.visible = false;
        car.root.position.set(0, .01, 7);
        car.steering.rotation.z = -.32;
        aim([-3.3, 1.39, 8.1], [-.42, 1.13, 7.15]);
    }

    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    driver.faceCamera(camera);
    const composer = new EffectComposer(renderer, {multisampling: 4});
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new InkPass(scene, camera));
    composer.render();
    return () => {
      composer.dispose();
      driver.dispose();
      sun.shadow.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    };
  }, [frame, width, height]);

  return <canvas ref={canvas} style={{width: '100%', height: '100%', display: 'block'}} />;
}
