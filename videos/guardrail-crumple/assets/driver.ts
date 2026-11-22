import * as THREE from 'three';
import {bodyFront, Pen, PARENT, type Expr, type Outfit} from '../../../templates/bridge/toon';
import {cardShade, CARD_K} from '../../../templates/bridge/cardshade';
import {NOINK} from '../../../templates/bridge/ink';

type Pose = 'steer' | 'brace' | 'peek';

const outfit: Outfit = {
  ...PARENT, jacket: '#498982', pants: '#444758', hair: '#594138', buttons: '#dfc5a0',
};

export function createDriver() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 1000;
  const context = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Use the lower portion of the shared standing-card canvas for the seated pose.
  texture.repeat.y = .58;
  const material = cardShade(new THREE.MeshLambertMaterial({
    map: texture, alphaTest: .46, side: THREE.DoubleSide,
  }));
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.66, .638), material);
  card.layers.set(NOINK);
  card.position.set(-.4, 1.16, .075);
  card.receiveShadow = true;
  card.onBeforeRender = renderer => {
    CARD_K.uPx.value = (renderer.getRenderTarget()?.height ?? renderer.domElement.height) / 1920;
  };

  const worldPosition = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const carRotation = new THREE.Quaternion();
  const worldFacing = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let pose: Pose = 'steer';
  let belt = false;
  let steering = -.32;
  let facing: -1 | 0 | 1 = 0;

  function redraw() {
    const expression: Record<Pose, Expr> = {steer: 'nervous', brace: 'pained', peek: 'pained'};
    context.clearRect(0, 0, canvas.width, canvas.height);
    bodyFront(new Pen(context), {...outfit, sash: belt ? '#e6bb70' : undefined}, {
      mode: 'sit',
      expr: expression[pose],
      blink: pose === 'brace',
      facing,
      look: facing * .65,
      headTilt: pose === 'peek' ? -5 : 0,
      tilt: pose === 'brace' ? facing * 8 : 0,
      steering,
      seed: 9,
    });
    texture.needsUpdate = true;
  }

  function setPose(nextPose: Pose, fastened = false, wheelAngle = -.32) {
    pose = nextPose;
    belt = fastened;
    steering = wheelAngle;
    redraw();
  }

  function faceCamera(camera: THREE.Camera) {
    card.getWorldPosition(worldPosition);
    camera.getWorldPosition(toCamera).sub(worldPosition);
    if (card.parent) card.parent.getWorldQuaternion(carRotation).invert();
    else carRotation.identity();
    toCamera.applyQuaternion(carRotation);
    card.quaternion.copy(worldFacing.setFromAxisAngle(up, Math.atan2(toCamera.x, toCamera.z)));
    const nextFacing = toCamera.x < -.6 ? 1 : toCamera.x > .6 ? -1 : 0;
    if (nextFacing !== facing) {
      facing = nextFacing;
      redraw();
    }
  }

  redraw();
  return {
    card, setPose, faceCamera,
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}
