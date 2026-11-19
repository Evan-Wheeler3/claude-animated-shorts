// S16 bathroom reveal. Port of videos/phil-bathroom/assets/bathroom/SCENE_INIT.mjs (the owner-approved setup):
// same lights, same lamp settings, same shadow flags, one mixer for all five clips. The camera follows S16_CAM
// (owner-requested close-up -> slow zoom out, below) instead of the supplied camera clip.
// Do not retune these values: they are what matches ThreeJS_Bathroom_Reveal.png / ThreeJS_Motion_Proof.mp4.
import * as THREE from "three";
import { loadGLB } from "../lib/load";
import type { CamKey } from "../lib/cam";

export type RevealSet = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  setFrame: (localFrame: number, width: number, height: number) => void;
};

export async function loadReveal(url: string): Promise<RevealSet> {
  const scene = new THREE.Scene();
  const { scene: asset, animations, cameras } = await loadGLB(url);
  scene.add(asset);

  scene.add(new THREE.HemisphereLight(0xa9b5d2, 0x393121, 0.42));
  const doorway = new THREE.PointLight(0xffd8a2, 4.0, 9, 2);
  doorway.position.set(-0.54, 1.63, 1.29);
  scene.add(doorway);
  const windowFill = new THREE.PointLight(0x7398ef, 0.4, 5, 2);
  windowFill.position.set(0.89, 1.94, -0.74);
  scene.add(windowFill);
  const lamp = asset.getObjectByName("Lamp_Amber") as THREE.PointLight | undefined;
  if (!lamp?.isPointLight) throw new Error("Bathroom GLB lamp is missing");
  lamp.color.set(0xffc479);
  lamp.intensity = 1.75;
  lamp.distance = 7;
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.radius = 3;
  lamp.shadow.bias = -0.0009;
  lamp.shadow.normalBias = 0.014;
  asset.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = !/Curtain|Sconce|Foam/.test(m.name);
      m.receiveShadow = true;
    }
  });

  const camera = cameras[0] as THREE.PerspectiveCamera;
  if (!camera || animations.length < 3) throw new Error("Bathroom GLB camera or scene animation is missing");
  const mixer = new THREE.AnimationMixer(asset);
  const actions = animations.map((clip) => {
    const a = mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    return a.play();
  });

  // Local frame 0 = S16 start. Same mapping as SCENE_INIT (Blender frames are one-based: local f -> Blender f+1).
  const setFrame = (frame: number, width: number, height: number) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (const a of actions) {
      a.paused = false;
      a.enabled = true;
    }
    mixer.setTime(Math.min(5.032, Math.max(1 / 30, (frame + 1) / 30)));
    scene.updateMatrixWorld(true);
  };
  return { scene, camera, setFrame };
}

/**
 * S16 camera (owner note 2026-11-19), keyed on the FITTED frame of S16 (0 = cut in):
 * tight close-up on the homeowner's face and shoulders through the sigh and "Time to relax", then a slow zoom out
 * (dolly back + widen) that only just reveals Phil on the toilet at the right edge, then a creeping hold for the
 * side-eye, blink and the cue. Replaces the supplied camera clip; the rig and face clips run unchanged.
 * Heads (scene coords): homeowner (-0.67, 0.85, -0.06), Phil (0.42, 1.22, -0.46).
 */
export const S16_CAM: CamKey[] = [
  { f: 0, pos: [-0.3, 0.99, 0.74], look: [-0.68, 0.81, -0.06], fov: 40 },
  { f: 78, pos: [-0.305, 0.985, 0.7], look: [-0.68, 0.81, -0.06], fov: 39.5 },
  { f: 178, pos: [-0.47, 1.22, 2.2], look: [-0.27, 1.0, -0.2], fov: 53 },
  { f: 224, pos: [-0.467, 1.217, 2.16], look: [-0.27, 1.0, -0.2], fov: 53 },
];
