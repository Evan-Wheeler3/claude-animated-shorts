import * as THREE from 'three';

const poses = ['steer', 'brace', 'peek'];

export function createDriver() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: .35, side: THREE.DoubleSide,
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.57, .63), material);
  card.layers.set(3);
  card.position.set(-.4, 1.25, -.11);
  context.lineCap = context.lineJoin = 'round';

  function ellipse(x, y, rx, ry, color) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.stroke();
  }

  function line(points, color, width) {
    context.beginPath();
    context.moveTo(...points[0]);
    for (const point of points.slice(1)) context.lineTo(...point);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  }

  function setPose(pose, belt = false) {
    if (!poses.includes(pose)) throw new Error('Unknown driver pose: ' + pose);
    const ink = '#292034';
    context.clearRect(0, 0, 256, 256);
    const offset = pose === 'brace' ? 15 : 0;
    line([[120, 130], [125 + offset, 201], [101, 235]], ink, 16);
    line([[123, 193], [165, 214], [192, 235]], ink, 13);
    line([[121, 145], [95, 176], [156 + offset, 171]], ink, 11);
    line([[126, 144], [153, 159], [184 + offset, 153]], ink, 11);
    if (belt) line([[88, 144], [160, 204]], '#e2bd75', 10);
    context.strokeStyle = ink;
    context.lineWidth = 8;
    ellipse(121 + offset, 86, 53, 58, '#ffe0ac');
    ellipse(108 + offset, 38, 32, 12, '#744b48');
    for (const x of [111, 146]) {
      if (pose === 'brace' || (pose === 'peek' && x === 111)) {
        line([[x - 7 + offset, 85], [x + 6 + offset, 88]], ink, 5);
      } else {
        line([[x + offset, 84], [x + offset, 90]], ink, 7);
      }
    }
    if (pose === 'steer') ellipse(130, 113, 9, 12, '#744b48');
    else line([[124 + offset, 111], [143 + offset, 109]], ink, 5);
    texture.needsUpdate = true;
  }

  function faceCamera(camera) {
    const rotation = camera.getWorldQuaternion(new THREE.Quaternion());
    if (card.parent) rotation.premultiply(card.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    card.quaternion.copy(rotation);
  }

  setPose('steer');
  return {card, setPose, faceCamera};
}

export function createImpactEffect() {
  const root = new THREE.Group();
  const particles = [];
  const geometry = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 12; i++) {
    const spark = i < 8;
    const material = new THREE.MeshBasicMaterial({
      color: spark ? '#ffcd5d' : '#cfb497', transparent: true, depthWrite: false,
      side: THREE.DoubleSide,
    });
    const particle = new THREE.Mesh(geometry, material);
    root.add(particle);
    particle.layers.set(3);
    particles.push({particle, spark, angle: i * 2.39996});
  }
  function setProgress(progress) {
    root.visible = progress > 0 && progress < 1;
    for (const {particle, spark, angle} of particles) {
      const distance = progress * (spark ? 1.2 : .58);
      particle.position.set(Math.cos(angle) * distance, .11 + Math.abs(Math.sin(angle)) * distance, 0);
      particle.rotation.z = angle;
      const size = spark ? .15 * (1 - progress) : .13 + progress * .3;
      particle.scale.set(size, spark ? size * .2 : size * .6, 1);
      particle.material.opacity = (1 - progress) * (spark ? 1 : .6);
    }
  }
  setProgress(0);
  return {root, setProgress};
}
