import * as THREE from 'three';

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
