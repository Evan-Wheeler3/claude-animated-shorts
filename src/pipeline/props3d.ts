// Bridge between the renderer-agnostic prop library (videos/niagara-barrel/assets/niagara-props.js) and this world:
// every named MeshStandardMaterial becomes the world's two-tone toon Lambert (shade.ts), wood gets painted grain,
// iron a soft painted-metal highlight. Cached per material name + colour.
import * as THREE from "three";
import { twoTone } from "./shade";
import { ctex } from "./paint";

/** painted oak grain: long wavy darker lines and a few knots; u across the stave, v along it (v = metres) */
const grain = (base: string) => ctex("nGrain" + base, 256, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 1024);
  const c = new THREE.Color(base), dk = "#" + c.clone().multiplyScalar(0.72).getHexString(), lt = "#" + c.clone().lerp(new THREE.Color("#fff3dc"), 0.22).getHexString();
  g.lineCap = "round";
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, w = 1.5 + r() * 3.5, amp = 3 + r() * 8, ph = r() * 6;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = k % 3 ? dk : lt; g.globalAlpha = 0.35 + r() * 0.3; g.lineWidth = w; g.beginPath();
      for (let y = 0; y <= 1024; y += 16) { const xx = x + ox + amp * Math.sin(y / 90 + ph); if (y) g.lineTo(xx, y); else g.moveTo(xx, y); }
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  for (let k = 0; k < 4; k++) { const x = r() * 256, y = r() * 1024; g.fillStyle = dk; g.beginPath(); g.ellipse(x, y, 6, 14, 0, 0, Math.PI * 2); g.fill(); }
});
const cache = new Map<string, THREE.Material>();
const WOOD = new Set(["oak", "oakLight", "oakDark", "endGrain", "boatRed"]);
export const toonMat = (m: THREE.MeshStandardMaterial) => {
  const key = m.name + "|" + m.color.getHexString() + "|" + m.side;
  let t = cache.get(key);
  if (!t) {
    if (m.name === "iron" || m.name === "ironLight" || m.name === "gold") {
      t = twoTone(new THREE.MeshPhongMaterial({ color: m.color.clone(), specular: m.name === "gold" ? "#fff2b0" : "#8a8a8a", shininess: 60 }), 0.15);
    } else if (WOOD.has(m.name)) {
      const tex = grain("#" + m.color.getHexString()); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const map = tex.clone(); map.repeat.set(1 / 0.16, 1 / 1.4); map.needsUpdate = true;
      t = twoTone(new THREE.MeshLambertMaterial({ map, side: m.side }));
    } else t = twoTone(new THREE.MeshLambertMaterial({ color: m.color.clone(), side: m.side }));
    t.name = m.name;
    cache.set(key, t);
  }
  return t;
};
/** convert a prop group in place; returns it */
export const toonify = <T extends THREE.Object3D>(o: T, cast = true): T => {
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((x) => toonMat(x as THREE.MeshStandardMaterial)) : toonMat(mesh.material as THREE.MeshStandardMaterial);
    mesh.castShadow = cast; mesh.receiveShadow = true;
  });
  return o;
};
