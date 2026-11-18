// Ground contact for every set (PHYSICS-AND-COLLISIONS.md). Surfaces that characters and props may stand on are
// registered once; heightAt() ray-casts straight down onto them, so feet, contact shadows and props follow the real
// mesh (slopes, ripples, docks, decks) instead of a hand-typed height constant.
import * as THREE from "three";

export type Hit = { y: number; normal: THREE.Vector3 };
export class Ground {
  private surfaces: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private down = new THREE.Vector3(0, -1, 0);
  private o = new THREE.Vector3();
  private cache = new Map<string, Hit | null>();
  /** register a walkable surface (mesh or group); call root.updateMatrixWorld before the first query */
  add(...o: THREE.Object3D[]) { this.surfaces.push(...o); this.cache.clear(); return this; }
  /** highest registered surface under (x, z) below `top` (null if none) */
  hit(x: number, z: number, top = 400): Hit | null {
    const k = `${x.toFixed(3)},${z.toFixed(3)},${top.toFixed(2)}`;
    if (this.cache.has(k)) return this.cache.get(k)!;
    this.ray.set(this.o.set(x, top, z), this.down); this.ray.far = 2000;
    const h = this.ray.intersectObjects(this.surfaces, true).find((i) => i.object.visible !== false);
    let r: Hit | null = null;
    if (h) {
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      if (n.y < 0) n.negate();
      r = { y: h.point.y, normal: n };
    }
    this.cache.set(k, r);
    return r;
  }
  heightAt(x: number, z: number, fallback: number, top = 400) { return this.hit(x, z, top)?.y ?? fallback; }
  /** support height under a round footprint of radius r: the HIGHEST of 9 samples, so a rigid prop never sinks into a
   *  bump (it may rest a few cm proud on the low side, reported by the QA pass) */
  supportAt(x: number, z: number, r: number, fallback: number, top = 400) {
    let y = -Infinity;
    for (let k = 0; k < 9; k++) {
      const a = (k / 8) * Math.PI * 2, rr = k === 8 ? 0 : r;
      y = Math.max(y, this.heightAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr, -Infinity, top));
    }
    return Number.isFinite(y) ? y : fallback;
  }
  /** tilt an object's up axis to the surface normal under it (keeping its yaw), then rest it: a barrel on a slope
   *  stands square on the slope instead of touching it with one edge */
  restAligned(obj: THREE.Object3D, footprint = 0.3, top = 200) {
    const h = this.hit(obj.position.x, obj.position.z, top);
    if (h) { const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), obj.rotation.y); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), h.normal).multiply(yaw); }
    return this.rest(obj, footprint * 0.4, 0, top);
  }
  /** put an object's lowest point on the support under its footprint (keeps its x, z and rotation) */
  rest(obj: THREE.Object3D, footprint = 0.3, sink = 0, top = 200) {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const y = this.supportAt(obj.position.x, obj.position.z, footprint, box.min.y, top);
    obj.position.y += y - box.min.y - sink;
    obj.updateMatrixWorld(true);
    return y;
  }
}
