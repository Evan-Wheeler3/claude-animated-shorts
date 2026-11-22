// The extruding terminal's moving parts, in the impact head's local frame (x = field side, z = down the rail).
// One ribbon follows a fixed path: the corrugated beam enters the head's downstream face (z = .35), is squeezed
// flat through a 90 degree throat, leaves the field side and coils into a loose helix that hangs over the edge,
// clear of the posts (x <= .23) and of the car (behind the head, z < -.2). Its visible length = head travel, so the
// beam that disappears into the head is exactly the steel that comes out the side.
import * as THREE from 'three';

const PROFILE = [[0, -.16], [-.04, -.13], [-.075, -.083], [-.025, -.026], [-.025, .026], [-.075, .083], [-.04, .13], [0, .16]];
const R1 = .2, XS = .85, R = .42, PITCH = .27, MAX = 12, N = 700;
const L1 = Math.PI / 2 * R1, L2 = XS - R1;

/** point, tangent, y and flatten factor at arc length s along the path */
function path(s: number) {
  if (s < L1) {
    const p = s / R1;
    return {x: R1 - R1 * Math.cos(p), z: .35 - R1 * Math.sin(p), tx: Math.sin(p), tz: -Math.cos(p), y: .68 - .06 * (s / L1), flat: s / L1};
  }
  if (s < L1 + L2) return {x: R1 + (s - L1), z: .15, tx: 1, tz: 0, y: .62, flat: 1};
  const q = (s - L1 - L2) / R;
  return {x: XS + R * Math.sin(q), z: .15 + R - R * Math.cos(q), tx: Math.cos(q), tz: Math.sin(q), y: .62 - PITCH * q / (2 * Math.PI), flat: 1};
}

export function createExtrusion() {
  const geo = new THREE.BufferGeometry();
  const P = PROFILE.length;
  const pos = new THREE.BufferAttribute(new Float32Array(N * P * 3), 3);
  geo.setAttribute('position', pos);
  const idx: number[] = [];
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < P - 1; k++) {
    const a = i * P + k, b = a + 1, c = a + P, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({color: '#a6b8c6', roughness: .8, side: THREE.DoubleSide});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;

  function setTravel(T: number) {
    const L = Math.min(MAX, T);
    mesh.visible = L > .01;
    for (let i = 0; i < N; i++) {
      const s = L * i / (N - 1);
      const p = path(s);
      const nx = -p.tz, nz = p.tx; // horizontal normal of the ribbon
      const h = THREE.MathUtils.lerp(1, .82, p.flat);
      for (let k = 0; k < P; k++) {
        const [ox, oy] = PROFILE[k];
        const depth = ox * (1 - p.flat) + .0;
        pos.setXYZ(i * P + k, p.x + nx * depth, p.y + oy * h, p.z + nz * depth);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  setTravel(0);
  return {mesh, setTravel, dispose: () => { geo.dispose(); mat.dispose(); }};
}

/** Knock the posts the head has passed flat (they snap at the ground and fold down the rail) instead of hiding them. */
export function knockPosts(posts: THREE.Group, T: number, active: boolean) {
  for (const c of posts.children) {
    const base = (c.userData.base ??= c.position.clone()) as THREE.Vector3;
    c.visible = true;
    c.scale.set(1, 1, 1);
    const a = active ? 1.38 * smoothstep(T - (base.z - .32), 0, .3) : 0;
    c.rotation.x = a;
    c.position.set(base.x, base.y * Math.cos(a) + .02 * Math.sin(a), base.z + base.y * Math.sin(a));
  }
}
const smoothstep = (x: number, a: number, b: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/** Pop the posts (and spacers) up one by one, far end first; u per post from 0 (hidden) to 1 (in place). */
export function popPosts(posts: THREE.Group, t: number, t0: number, gap: number) {
  const zs = [...new Set(posts.children.map(c => ((c.userData.base ??= c.position.clone()) as THREE.Vector3).z))].sort((a, b) => b - a);
  for (const c of posts.children) {
    const base = c.userData.base as THREE.Vector3;
    const i = zs.indexOf(base.z);
    const u = (t - t0 - i * gap) / .22;
    const k = u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2; // ease-out-back pop
    c.visible = k > .01;
    c.rotation.x = 0;
    c.scale.set(1, Math.max(.001, k), 1);
    c.position.set(base.x, base.y * k, base.z);
  }
}
