// Episode cast built on the Rocketbox Bip01 rigs (MIT, see assets/cast/*LICENSE.md).
//   host      – Host_Blocking_Rig.glb (Phil likeness; the neighbor). Same green polo + shorts in every episode.
//   homeowner – Homeowner_Standing_Rig.glb (light-blue shirt, navy trousers).
//   guest     – Guard_A_Rig.glb restyled at runtime: older moustached neighbor in a burgundy shirt, khaki trousers,
//               brown belt/shoes and a brown tweed flat cap; security badge and patches hidden.
//   locksmith – Guard_B_Rig.glb restyled at runtime: charcoal work shirt with a pale name patch, dark work trousers,
//               teal cap; badge hidden. A key ring + tool pouch prop is attached in the safe set.
// Restyles only change material colours/visibility on this clone; the GLB files are untouched.
import * as THREE from "three";
import { staticFile } from "remotion";
import { Rig, makeRigFrom } from "./rig";
import { face, type Face } from "./poses";
import { hash } from "./kit";

export const makeHost = () => makeRigFrom(staticFile, "cast/Host_Blocking_Rig.glb", "Phil_Face");
export const makeOwner = () => makeRigFrom(staticFile, "cast/Homeowner_Standing_Rig.glb", "Homeowner_Face");

type Restyle = Record<string, { color?: [number, number, number]; hide?: boolean; rough?: number }>;

function restyle(r: Rig, map: Restyle) {
  r.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const next = mats.map((mat) => {
      const s = map[mat.name];
      if (!s) return mat;
      const c = (mat as THREE.MeshStandardMaterial).clone();
      if (s.color) c.color.setRGB(...s.color);
      if (s.hide) c.visible = false;
      if (s.rough !== undefined) c.roughness = s.rough;
      return c;
    });
    m.material = Array.isArray(m.material) ? next : next[0];
  });
  return r;
}

export async function makeGuest() {
  const r = await makeRigFrom(staticFile, "cast/Guard_A_Rig.glb", "Guard_A_Face");
  return restyle(r, {
    "Navy uniform cotton": { color: [0.2, 0.045, 0.05] },
    "Navy raised seams": { color: [0.14, 0.03, 0.035] },
    "Navy buttons": { color: [0.3, 0.26, 0.2] },
    "Black trouser twill": { color: [0.3, 0.24, 0.14] },
    "Black duty webbing": { color: [0.12, 0.06, 0.03] },
    "Black boot leather": { color: [0.13, 0.07, 0.04], rough: 0.7 },
    "Brushed buckle": { color: [0.45, 0.38, 0.22] },
    "Navy cap twill": { color: [0.22, 0.16, 0.1] },
    "Brass security badge": { hide: true },
    "Patch embroidery": { hide: true },
  });
}

export async function makeLocksmith() {
  const r = await makeRigFrom(staticFile, "cast/Guard_B_Rig.glb", "Guard_B_Face");
  return restyle(r, {
    "Navy uniform cotton": { color: [0.06, 0.065, 0.068] },
    "Navy raised seams": { color: [0.04, 0.045, 0.048] },
    "Navy buttons": { color: [0.08, 0.08, 0.08] },
    "Black trouser twill": { color: [0.05, 0.055, 0.07] },
    "Navy cap twill": { color: [0.02, 0.16, 0.16] },
    "Patch embroidery": { color: [0.75, 0.73, 0.66] },
    "Brass security badge": { hide: true },
  });
}

/** deterministic blink: 4-frame lid close every ~1.2-3 s, offset per character */
export function blinkAt(frame: number, seed: number) {
  let t = Math.floor(seed * 37) % 50;
  let i = 0;
  while (t <= frame) {
    if (frame - t < 4) return [0.5, 1, 1, 0.5][frame - t];
    t += 36 + Math.floor(hash(seed * 13 + i++) * 54);
  }
  return 0;
}

/** apply face + automatic blink; `jaw` comes from lip-sync */
export function faceAt(r: Rig, frame: number, seed: number, f: Face = {}) {
  face(r, { ...f, blink: Math.max(f.blink ?? 0, blinkAt(frame, seed)) });
}

/** host lip-sync: per-frame mouth-open values (0..1) generated from the host track (src/lipsync.json) */
export function jawFrom(env: number[] | undefined, frame: number) {
  if (!env) return 0;
  const v = env[frame] ?? 0;
  return Math.min(0.55, v * 0.6);
}
