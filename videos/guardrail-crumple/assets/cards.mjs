import * as THREE from 'three';

const poses = ['steer', 'brace', 'peek'];

export function createDriver() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: .35, side: THREE.DoubleSide,
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.57, .63), material);
  card.layers.set(3);
  card.position.set(-.4, 1.15, .075);
  context.scale(2, 2);
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

  function shape(path, fill, stroke = '#37253c', width = 5) {
    context.beginPath();
    path(context);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = width;
      context.stroke();
    }
  }

  function setPose(pose, belt = false) {
    if (!poses.includes(pose)) throw new Error('Unknown driver pose: ' + pose);
    const ink = '#37253c';
    const skin = '#f1c094';
    const shadow = '#ce855f';
    const jacket = '#318983';
    const bracing = pose === 'brace';
    context.clearRect(0, 0, 256, 256);

    // Seated silhouette. The trousers and lower jacket disappear behind the door on wides.
    shape(c => {
      c.moveTo(88, 176); c.quadraticCurveTo(107, 173, 141, 177);
      c.lineTo(174, 194); c.quadraticCurveTo(185, 200, 184, 215);
      c.lineTo(177, 244); c.lineTo(153, 244); c.lineTo(148, 215);
      c.lineTo(96, 223); c.quadraticCurveTo(76, 217, 88, 176);
    }, '#4c4c69');
    shape(c => {
      c.moveTo(104, 124); c.quadraticCurveTo(85, 130, 79, 158);
      c.lineTo(75, 187); c.quadraticCurveTo(91, 203, 134, 195);
      c.lineTo(150, 167); c.quadraticCurveTo(152, 139, 133, 126);
    }, jacket);
    shape(c => {
      c.moveTo(90, 140); c.quadraticCurveTo(85, 169, 91, 190);
      c.quadraticCurveTo(115, 197, 134, 189); c.lineTo(131, 197);
      c.quadraticCurveTo(91, 204, 76, 187);
    }, '#226761', null);
    shape(c => {
      c.moveTo(109, 119); c.lineTo(135, 116); c.lineTo(135, 138);
      c.quadraticCurveTo(126, 148, 113, 138);
    }, shadow);
    shape(c => {
      c.moveTo(103, 127); c.lineTo(116, 140); c.lineTo(102, 151);
      c.lineTo(94, 136);
    }, '#a8cfb8', ink, 3);
    shape(c => {
      c.moveTo(134, 129); c.lineTo(125, 142); c.lineTo(138, 151);
      c.lineTo(145, 139);
    }, '#a8cfb8', ink, 3);
    line([[119, 151], [116, 186]], '#244f59', 3);
    line([[95, 157], [106, 158], [104, 168], [96, 167]], '#244f59', 3);

    // Separate sleeve and hand shapes carry the steering pose in silhouette.
    const reach = bracing ? 9 : 0;
    const farArm = [[141, 149], [164, 162], [188 + reach, 150]];
    const nearArm = [[94, 149], [106, 173], [164 + reach, 175]];
    for (const arm of [farArm, nearArm]) {
      line(arm, ink, 24);
      line(arm, arm === farArm ? '#286c69' : jacket, 16);
      const [x, y] = arm[2];
      context.strokeStyle = ink;
      context.lineWidth = 4;
      ellipse(x + 7, y - 1, 11, 9, skin);
      line([[x + 8, y - 4], [x + 13, y - 4]], shadow, 2);
    }
    if (belt) {
      line([[93, 132], [143, 190]], ink, 13);
      line([[93, 132], [143, 190]], '#e6bb70', 8);
      line([[137, 185], [145, 191]], '#f2dcab', 6);
    }

    context.save();
    context.translate(bracing ? 9 : 0, bracing ? 5 : 0);
    shape(c => {
      c.moveTo(81, 67); c.bezierCurveTo(78, 30, 110, 12, 143, 21);
      c.bezierCurveTo(170, 28, 178, 49, 176, 70);
      c.lineTo(175, 85); c.quadraticCurveTo(191, 94, 175, 100);
      c.quadraticCurveTo(172, 130, 143, 137);
      c.quadraticCurveTo(109, 144, 93, 119);
      c.quadraticCurveTo(79, 102, 81, 67);
    }, skin, ink, 6);
    shape(c => {
      c.moveTo(90, 86); c.quadraticCurveTo(105, 119, 137, 128);
      c.quadraticCurveTo(158, 132, 174, 108);
      c.quadraticCurveTo(165, 137, 141, 137);
      c.quadraticCurveTo(106, 138, 94, 115);
    }, '#dea078', null);
    context.strokeStyle = ink;
    context.lineWidth = 4;
    ellipse(89, 94, 12, 14, skin);
    line([[85, 90], [92, 90], [94, 96]], shadow, 3);
    shape(c => {
      c.moveTo(83, 90); c.quadraticCurveTo(67, 60, 83, 39);
      c.quadraticCurveTo(87, 27, 99, 23);
      c.lineTo(91, 17); c.quadraticCurveTo(111, 13, 128, 20);
      c.quadraticCurveTo(146, 11, 159, 23);
      c.quadraticCurveTo(179, 32, 178, 54);
      c.quadraticCurveTo(164, 49, 155, 36);
      c.quadraticCurveTo(142, 56, 107, 52);
      c.quadraticCurveTo(108, 70, 93, 75); c.lineTo(92, 88);
    }, '#684335', ink, 6);
    line([[95, 41], [110, 31], [131, 31], [145, 26]], '#a36b50', 5);
    line([[83, 61], [91, 50], [102, 45]], '#a36b50', 3);

    line([[113, bracing ? 75 : 70], [124, 68], [134, 72]], ink, 5);
    line([[149, 69], [158, bracing ? 68 : 65], [166, 71]], ink, 5);
    for (const [index, x] of [126, 158].entries()) {
      if (bracing || (pose === 'peek' && index === 0)) {
        line([[x - 8, 86], [x, 90], [x + 8, 85]], ink, 4);
      } else {
        context.strokeStyle = ink;
        context.lineWidth = 3;
        ellipse(x, 86, 9, 11, '#fff0d7');
        context.strokeStyle = ink;
        context.lineWidth = 1;
        ellipse(x + 3, 87, 3.6, 6.4, ink);
      }
    }
    line([[147, 89], [143, 101], [151, 102]], '#985b58', 3);
    if (pose === 'steer') {
      context.strokeStyle = ink;
      context.lineWidth = 4;
      ellipse(143, 116, 9, 8, '#81474f');
      line([[139, 113], [147, 113]], '#fff0d7', 3);
    } else {
      line([[131, 117], [139, 114], [151, 116]], ink, 4);
    }
    context.restore();
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
