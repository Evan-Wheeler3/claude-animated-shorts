// Use this same setup in the renderer's Three.js scene when reviewing the bathroom shot.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadBathroomReveal(scene, assetUrl) {
  const { scene: asset, animations, cameras } = await new GLTFLoader().loadAsync(assetUrl);
  scene.add(asset);

  // Blender's doorway and window area lights become this pair of portable Three.js lights.
  scene.add(new THREE.HemisphereLight(0xa9b5d2, 0x393121, 0.42));
  const doorway = new THREE.PointLight(0xffd8a2, 4.0, 9, 2);
  doorway.position.set(-0.54, 1.63, 1.29);
  scene.add(doorway);
  const windowFill = new THREE.PointLight(0x7398ef, 0.40, 5, 2);
  windowFill.position.set(0.89, 1.94, -0.74);
  scene.add(windowFill);
  const lamp = asset.getObjectByName('Lamp_Amber');
  if (!lamp?.isPointLight) throw new Error('Bathroom GLB lamp is missing');
  lamp.color.set(0xffc479);
  lamp.intensity = 1.75;
  lamp.distance = 7;
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.radius = 3;
  lamp.shadow.bias = -0.0009;
  lamp.shadow.normalBias = 0.014;
  asset.traverse(object => {
    if (object.isMesh) {
      object.castShadow = !/Curtain|Sconce|Foam/.test(object.name);
      object.receiveShadow = true;
    }
  });

  const camera = cameras[0];
  if (!camera || animations.length < 3) throw new Error('Bathroom GLB camera or scene animation is missing');
  const mixer = new THREE.AnimationMixer(asset);
  const actions = animations.map(clip => {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    return action.play();
  });

  function setFrame(frame, width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (const action of actions) {
      action.paused = false;
      action.enabled = true;
    }
    mixer.setTime(Math.min(5.032, Math.max(1 / 30, (frame + 1) / 30)));
    scene.updateMatrixWorld(true);
  }
  return { asset, camera, setFrame, clips: animations };
}
