// The Horseshoe Falls set, built once: upper rapids (a flow-aligned fan mesh converging on the curved lip), the
// falling curtain (ballistic sheet per lip angle, glassy green brink -> white streaks), the bowl's rock behind it,
// the plunge pool (boiling foam ring -> green lower river), layered dolomite/shale gorge walls with talus, banks,
// promenade, foam mounds, rapids crests, boulders and the mist column. All water is "painted": on-screen target
// colours (tone-map inverted) with real sun shadows, no PBR. Materials follow the world's two-tone look (shade.ts).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { R, PHI_M, POOL_Y, LAND_Y, CH_W, RIM_L, RIM_R, BANK_L, BANK_R, lip, outward, riverY, V3 } from "./story";
import { ctex, rng, rep, grassHD, stoneHD } from "../../pipeline/paint";
import { TAU, lerp, sstep, grid, orient, waterMat, initWaterTextures } from "../../pipeline/water";
export { WATER_DAY, WATER_GOLD, setWaterLook, WU } from "../../pipeline/water";
import { lam } from "../../pipeline/build";
import { NOINK } from "../../pipeline/ink";

// ---------------- rock textures ----------------
/** gorge wall: horizontal strata (dolomite cap, limestone, shale), vertical joints, talus at the foot. u = 30 m, v = 60 m */
const strataTex = () => ctex("nfStrata", 1024, 1024, (g, r) => {
  const bands: [number, string][] = [[0, "#c8c1b0"], [0.1, "#b9b2a1"], [0.19, "#a99f8f"], [0.26, "#c2b39c"], [0.35, "#a48f7c"], [0.46, "#b49c86"],
    [0.55, "#9b8574"], [0.66, "#ab9480"], [0.76, "#8f7f74"], [0.86, "#a39788"], [1, "#a39788"]];
  for (let i = 0; i < bands.length - 1; i++) { g.fillStyle = bands[i][1]; g.fillRect(0, bands[i][0] * 1024, 1024, (bands[i + 1][0] - bands[i][0]) * 1024 + 1); }
  for (let i = 1; i < bands.length - 1; i++) { // dark ledge under each band, light lip on top
    const y = bands[i][0] * 1024;
    g.fillStyle = "rgba(60,45,50,0.45)"; g.fillRect(0, y - 5, 1024, 6);
    g.fillStyle = "rgba(255,250,235,0.25)"; g.fillRect(0, y + 1, 1024, 3);
  }
  g.lineCap = "round";
  for (let k = 0; k < 110; k++) { // vertical joints within one band
    const x = r() * 1024, bi = Math.floor(r() * (bands.length - 2)), y0 = bands[bi][0] * 1024, y1 = bands[bi + 1][0] * 1024;
    g.strokeStyle = "rgba(55,40,45,0.55)"; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, y0 + 2); g.lineTo(x + (r() - 0.5) * 14, y1 - 4); g.stroke();
  }
  for (let k = 0; k < 900; k++) { // speckle
    g.fillStyle = r() < 0.5 ? "rgba(255,248,230,0.18)" : "rgba(50,40,45,0.16)";
    g.fillRect(r() * 1024, r() * 1024, 2 + r() * 6, 2 + r() * 4);
  }
  // wet dark streaks running down from seeps
  for (let k = 0; k < 18; k++) { const x = r() * 1024, y = r() * 600; const gr = g.createLinearGradient(0, y, 0, y + 400); gr.addColorStop(0, "rgba(40,40,60,0.3)"); gr.addColorStop(1, "rgba(40,40,60,0)"); g.fillStyle = gr; g.fillRect(x, y, 8 + r() * 14, 400); }
});
const talusTex = () => ctex("nfTalus", 512, 512, (g, r) => {
  g.fillStyle = "#9d9384"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 420; k++) {
    const x = r() * 512, y = r() * 512, rad = 6 + r() * 22, c = ["#b5ab9b", "#8c8274", "#a99f90", "#7d7468", "#c2b8a7"][Math.floor(r() * 5)];
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      g.fillStyle = c; g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.75, r() * 3, 0, TAU); g.fill();
      g.strokeStyle = "rgba(50,40,45,0.5)"; g.lineWidth = 2; g.stroke();
    }
  }
});
const pebbleTex = () => ctex("nfPebble", 512, 512, (g, r) => {
  g.fillStyle = "#b8ab97"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 1400; k++) {
    const x = r() * 512, y = r() * 512, rad = 2 + r() * 7, c = ["#cfc3ae", "#a69a87", "#bfb39e", "#948a7c", "#d9cfbd"][Math.floor(r() * 5)];
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.fillStyle = c; g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.7, r() * 3, 0, TAU); g.fill(); }
  }
});

// ---------------- mist ----------------
/** soft painted mist billow (lit cream top, cool lavender belly), 512 x 512, alpha edges */
export const mistTex = (seed: number, gold = false) => ctex(`nfMist${seed}${gold ? "g" : ""}`, 512, 512, (g, r) => {
  const lit = gold ? "255,240,222" : "250,252,255", mid = gold ? "236,214,214" : "228,236,246", sh = gold ? "190,180,214" : "188,202,228";
  const blobs: [number, number, number][] = [];
  for (let k = 0; k < 9; k++) blobs.push([130 + r() * 250, 170 + r() * 200, 70 + r() * 75]);
  blobs.push([256, 300, 150]);
  for (const [x, y, rad] of blobs) {
    const gr = g.createRadialGradient(x - rad * 0.25, y - rad * 0.35, rad * 0.1, x, y, rad);
    gr.addColorStop(0, `rgba(${lit},0.95)`); gr.addColorStop(0.55, `rgba(${mid},0.9)`); gr.addColorStop(0.85, `rgba(${sh},0.6)`); gr.addColorStop(1, `rgba(${sh},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
});
const rainbowTex = () => ctex("nfRainbow", 1024, 512, (g) => {
  const cols = ["255,70,70", "255,160,60", "255,235,90", "90,210,110", "80,150,255", "150,100,230"];
  cols.forEach((c, i) => {
    const r0 = 440 - i * 16;
    g.strokeStyle = `rgba(${c},0.85)`; g.lineWidth = 17; g.beginPath(); g.arc(512, 500, r0, Math.PI, TAU); g.stroke();
  });
  // fade the feet into the mist
  g.globalCompositeOperation = "destination-out";
  const gr = g.createLinearGradient(0, 260, 0, 512); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = gr; g.fillRect(0, 260, 1024, 252);
});

export type FallsSet = {
  mist: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; base: V3; size: number; k: number; op: number }[];
  rainbow: THREE.Mesh; mistMaps: Record<"day" | "golden", THREE.Texture[]>;
  /** walkable surfaces (land, paving, beach), water surfaces (upper river, pool) and the falling sheet */
  ground: THREE.Object3D[]; water: THREE.Object3D[]; sheet: THREE.Mesh;
};

// ---------------- the falling sheet (shared with world.ts: props ride ON this surface) ----------------
const g0 = 9.8, DROP_EXTRA = -POOL_Y + 1.5;
/** point on the curtain at lip parameter s (-1..1) and fall parameter k (0 brink .. 1 pool) */
export const curtainAt = (s: number, k: number): { p: V3; fallen: number } => {
  const phi = s * PHI_M, l = lip(phi), o = outward(phi), v0 = 4.6 - 1.4 * Math.abs(s) ** 1.5;
  const H = DROP_EXTRA + riverY(0), tEnd = (-3.6 + Math.sqrt(3.6 * 3.6 + 2 * g0 * H)) / g0, t = tEnd * k ** 1.35;
  const y0 = riverY(0), y = y0 - 3.6 * t - 0.5 * g0 * t * t; // leaves the lip already ~38 deg down: a crisp brink crease for the ink
  const h = v0 * t + 0.4 * (1 - Math.exp(-t * 6));
  // frozen columns: the sheet ripples into rounded vertical ribs that grow as it falls
  const rib = 0.9 * sstep(0.5, 6, -y) * (Math.sin(phi * 47 + 0.7) * 0.6 + Math.sin(phi * 113 + 2.1) * 0.4);
  return { p: [l[0] - o[0] * (h + rib), y, l[2] - o[1] * (h + rib)], fallen: y0 - y };
};

// ---------------- the build ----------------
export function buildFalls(root: THREE.Object3D): FallsSet {
  initWaterTextures();
  const rnd = rng(1901);

  // ---- upper river: fan of flow lines converging on the lip ----
  const NS = 150, ND = 110, dOf = (j: number) => 720 * (j / ND) ** 2.1;
  const across = (s: number, w: number) => s * lerp(R * PHI_M, CH_W + 6, w);
  const wave = (s: number, d: number) => {
    const rap = sstep(8, 30, d) * (1 - sstep(240, 420, d));
    return rap * (0.16 * Math.sin(s * 61 + d * 0.37) * Math.sin(d * 0.21 + s * 13) + 0.1 * Math.sin(d * 0.9 + s * 140));
  };
  const riverPos = (s: number, d: number): V3 => {
    const phi = s * PHI_M, l = lip(phi), o = outward(phi), w = sstep(25, 230, d);
    const px = l[0] + o[0] * d, pz = l[2] + o[1] * d, sx = s * (CH_W + 6), sz = -R - d + 20 * (1 - w);
    return [lerp(px, sx, w), riverY(d) + wave(s, d), lerp(pz, sz, w)];
  };
  const river = grid(NS, ND, (i, j) => { const s = (i / NS) * 2 - 1, d = dOf(j); return { p: riverPos(s, d), uv: [across(s, sstep(25, 230, d)), d] }; });
  orient(river, new THREE.Vector3(0, 1, 0));
  const riverM = new THREE.Mesh(river, waterMat(0)); riverM.receiveShadow = true; root.add(riverM);

  // ---- curtain: ballistic sheet from every lip point ----
  const NK = 70;
  const curtain = grid(NS * 2, NK, (i, j) => { const s = (i / (NS * 2)) * 2 - 1, c = curtainAt(s, j / NK); return { p: c.p, uv: [s * R * PHI_M, c.fallen] }; });
  orient(curtain, new THREE.Vector3(0, 0, 1));
  const curtainM = new THREE.Mesh(curtain, waterMat(1)); curtainM.receiveShadow = true; curtainM.castShadow = false; root.add(curtainM);
  // the bowl's rock face just behind the sheet (only seen at the edges and through gaps)
  const rockM = lam("nfStrata", () => ({ map: rep(strataTex(), 1, 1) }));
  const bowl = grid(120, 20, (i, j) => {
    const phi = ((i / 120) * 2 - 1) * PHI_M * 1.04, l = lip(phi), o = outward(phi), y = lerp(-0.9, POOL_Y - 3, j / 20), back = 1.2 + 2.5 * (j / 20);
    return { p: [l[0] + o[0] * back, y, l[2] + o[1] * back], uv: [(phi * R) / 30, (-y + LAND_Y) / 60] };
  });
  orient(bowl, new THREE.Vector3(0, 0, 1));
  const bowlM = new THREE.Mesh(bowl, rockM); bowlM.receiveShadow = true; root.add(bowlM);

  // ---- plunge pool + lower river ----
  const pool = new THREE.PlaneGeometry(320, 1100, 1, 1); pool.rotateX(-Math.PI / 2); pool.translate(0, POOL_Y, 440);
  const poolM = new THREE.Mesh(pool, waterMat(2)); poolM.receiveShadow = true; root.add(poolM);

  // ---- banks + gorge walls along polylines (rim -> river), strata steps, talus at the foot ----
  const resample = (pts: [number, number][], step: number) => {
    const out: { x: number; z: number; nx: number; nz: number; l: number }[] = [];
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / step));
      for (let k = 0; k < n + (i === pts.length - 2 ? 1 : 0); k++) out.push({ x: lerp(x0, x1, k / n), z: lerp(z0, z1, k / n), nx: (z1 - z0) / L, nz: -(x1 - x0) / L, l: acc + (L * k) / n });
      acc += L;
    }
    // smooth the normals at corners
    for (let i = 1; i < out.length - 1; i++) { const a = out[i - 1], b = out[i + 1], nx = (a.nx + b.nx) / 2, nz = (a.nz + b.nz) / 2, n = Math.hypot(nx, nz) || 1; out[i].nx = nx / n; out[i].nz = nz / n; }
    return out;
  };
  const wall = (pts: [number, number][], side: number, bottom: number, talus: number, key: string) => {
    const S = resample(pts, 2.5), NV = Math.round((LAND_Y - bottom) / 1.6);
    const layer = (k: number, l: number) => { const r2 = rng(k * 97 + Math.floor(l / 9) * 13 + (side > 0 ? 7 : 0)); return (r2() - 0.5) * 1.6; };
    const geo = grid(S.length - 1, NV, (i, j) => {
      const q = S[i], y = lerp(LAND_Y, bottom, j / NV), depth = LAND_Y - y;
      const k = Math.floor(depth / 4.6), f = (depth / 4.6) % 1;
      // ledges: each stratum leans out a little at its top, then steps back under the ledge
      let off = lerp(layer(k, q.l), layer(k, q.l + 9), (q.l % 9) / 9) * (k === 0 ? 0.3 : 1) + 0.5 * (1 - sstep(0.0, 0.25, f)) * (k > 0 ? 1 : 0);
      off += 0.35 * Math.sin(q.l * 0.31 + k) + 0.25 * Math.sin(q.l * 1.13 + y * 0.4);
      if (talus > 0) off += talus * Math.max(0, (y - (bottom + 16)) / -16) ** 1.7; // rubble slope into the river
      const sx = side * q.nx, sz = side * q.nz; // normal pointing at the river
      return { p: [q.x + sx * off, y, q.z + sz * off], uv: [q.l / 30, (LAND_Y - y) / 60] };
    });
    // normal must face the river: test against the polyline normal
    const mid = S[Math.floor(S.length / 2)];
    orient(geo, new THREE.Vector3(side * mid.nx, 0, side * mid.nz));
    const m = new THREE.Mesh(geo, key === "talus" ? lam("nfTalus", () => ({ map: rep(talusTex(), 1, 1) })) : rockM);
    m.receiveShadow = true; m.castShadow = true; root.add(m);
    return S;
  };
  // which side the river is on: left rim (x < 0) -> river toward +x
  const sideOf = (pts: [number, number][], toward: [number, number]) => {
    const [x0, z0] = pts[0], [x1, z1] = pts[1], nx = (z1 - z0), nz = -(x1 - x0);
    return Math.sign(nx * (toward[0] - x0) + nz * (toward[1] - z0)) || 1;
  };
  wall(RIM_L, sideOf(RIM_L, [0, 60]), POOL_Y - 2.5, 14, "rock");
  wall(RIM_R, sideOf(RIM_R, [0, 60]), POOL_Y - 2.5, 14, "rock");
  wall(BANK_L, sideOf(BANK_L, [0, -300]), -1.6, 0, "rock");
  wall(BANK_R, sideOf(BANK_R, [0, -300]), -1.6, 0, "rock");

  // ---- land: Canadian side (-x) and Goat Island / American side (+x) ----
  const landShape = (sx: number) => {
    const ring: [number, number][] = [[sx * 900, -900], ...BANK_L.map(([x, z]) => [sx * -x * -1, z] as [number, number]).map(([x, z]) => [x, z] as [number, number])];
    // BANK_L is the -x side; mirror for +x
    const bank = (sx < 0 ? BANK_L : BANK_R).map(([x, z]) => [x, z] as [number, number]);
    const rim = (sx < 0 ? RIM_L : RIM_R).slice(1);
    const pts: [number, number][] = [[sx * 900, -900], [bank[0][0], -900], ...bank.slice(1), ...rim, [rim[rim.length - 1][0], 1000], [sx * 900, 1000]];
    void ring;
    const sh = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
    const g = new THREE.ShapeGeometry(sh, 4); g.rotateX(-Math.PI / 2); g.translate(0, LAND_Y, 0);
    const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 5, p.getZ(i) / 5);
    return g;
  };
  const grassM = lam("nfGrass", () => ({ map: grassHD() }));
  const ground: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(landShape(sx), grassM); m.receiveShadow = true; root.add(m); ground.push(m); }
  // promenade: a paved strip along the Canadian rim and the channel bank near the brink
  const paveM = lam("nfPave", () => ({ map: rep(stoneHD("nfPaveHD", ["#d8cdb9", "#cec2ad", "#e0d6c3", "#c7bba6"], "#a99c88"), 1, 1) }));
  const edgeL: [number, number][] = [...BANK_L.slice(1), ...RIM_L.slice(1, 6)];
  const ES = resample(edgeL, 2);
  const pave = grid(ES.length - 1, 1, (i, j) => {
    const q = ES[i], s = sideOf(edgeL, [0, 60]), off = -(0.3 + 7 * j);
    return { p: [q.x + s * q.nx * off, LAND_Y + 0.03, q.z + s * q.nz * off], uv: [q.l / 4, j * 7 / 4] };
  });
  orient(pave, new THREE.Vector3(0, 1, 0));
  const paveMesh = new THREE.Mesh(pave, paveM); paveMesh.receiveShadow = true; root.add(paveMesh); ground.push(paveMesh);

  // ---- shore of the lower river (cat test + rescue): pebble beach on the talus, left side ----
  const pebM = lam("nfPebble", () => ({ map: rep(pebbleTex(), 1, 1) }));
  const beach = grid(20, 8, (i, j) => {
    const z = lerp(92, 180, i / 20), x0 = -63 + (z - 92) * (2.4 / 88), x = lerp(x0 - 2, x0 + 10.5 + 0.6 * Math.sin(z * 0.2), j / 8);
    const y = POOL_Y + 0.45 - 0.9 * sstep(0.7, 1, j / 8) + 0.06 * Math.sin(z * 1.7 + j);
    return { p: [x, y, z], uv: [x / 3, z / 3] };
  });
  orient(beach, new THREE.Vector3(0, 1, 0));
  const beachM = new THREE.Mesh(beach, pebM); beachM.receiveShadow = true; root.add(beachM); ground.push(beachM);

  // ---- foam mounds at the foot of the curtain + rapids crests + river boulders (toon geometry, inked) ----
  const foamMat = waterMat(3), crestMat = foamMat;
  const rockMats = [lam("nfRockA", () => ({ color: "#8f897b" })), lam("nfRockB", () => ({ color: "#7a766d" })), lam("nfRockC", () => ({ color: "#a39e8f" }))];
  const lump = (r0: number, seed: number, flat: number) => {
    const rr = rng(seed), geo = new THREE.IcosahedronGeometry(1, 2), p = geo.attributes.position, v = new THREE.Vector3();
    const ph = [rr() * 6, rr() * 6, rr() * 6];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const n = 1 + 0.18 * Math.sin(3.1 * v.x + ph[0]) * Math.cos(2.7 * v.z + ph[1]) + 0.1 * Math.sin(5.3 * v.y + ph[2]);
      p.setXYZ(i, v.x * r0 * n, Math.max(-0.2, v.y) * r0 * n * flat, v.z * r0 * n);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const foamG: THREE.BufferGeometry[] = [], crestG: THREE.BufferGeometry[] = [], rockG: THREE.BufferGeometry[][] = [[], [], []];
  // foam ring where the sheet lands
  for (let k = 0; k < 230; k++) {
    const s = rnd() * 2 - 1, c = curtainAt(s, 1).p, phi = s * PHI_M, o = outward(phi), back = -2 - rnd() * 22, r0 = 2.5 + rnd() * 5.5;
    const gg = lump(r0, 400 + k, 0.45 + rnd() * 0.3);
    gg.translate(c[0] + o[0] * back + (rnd() - 0.5) * 4, POOL_Y + 0.2, c[2] + o[1] * back);
    foamG.push(gg);
  }
  // foam rafts drifting downstream
  for (let k = 0; k < 40; k++) {
    const z = 40 + rnd() ** 1.5 * 260, x = (rnd() - 0.5) * 2 * (60 - z * 0.02), r0 = 1.2 + rnd() * 3;
    const gg = lump(r0, 900 + k, 0.25); gg.scale(1, 1, 1.8); gg.translate(x, POOL_Y + 0.05, z); foamG.push(gg);
  }
  // standing waves + white crests in the rapids (across the flow), boulders breaking the surface
  for (let k = 0; k < 300; k++) {
    const s = rnd() * 1.9 - 0.95, d = 14 + rnd() ** 1.3 * 300, p = riverPos(s, d), phi = s * PHI_M, w = sstep(25, 230, d);
    const yaw = lerp(-phi, 0, w);
    const len = 1.0 + rnd() * 2.6, gg = lump(1, 2000 + k, 0.32 + rnd() * 0.2);
    gg.scale(len, 0.25 + rnd() * 0.2, 0.45 + rnd() * 0.35); gg.rotateY(yaw); gg.translate(p[0], p[1] + 0.02, p[2]);
    crestG.push(gg);
  }
  for (let k = 0; k < 60; k++) {
    const s = rnd() * 1.8 - 0.9, d = 18 + rnd() * 260, p = riverPos(s, d), r0 = 0.7 + rnd() * 1.8;
    const gg = lump(r0, 3000 + k, 0.55); gg.translate(p[0], p[1] - 0.15, p[2]); rockG[k % 3].push(gg);
    const f = lump(r0 * 1.5, 3100 + k, 0.22); f.scale(1, 1, 1.4); f.translate(p[0], p[1] + 0.02, p[2] - r0 * 0.6); crestG.push(f);
  }
  // boulders along the lower shore and the talus foot
  for (let k = 0; k < 90; k++) {
    const left = k % 3 !== 0, z = 30 + rnd() * 300, rim = left ? RIM_L : RIM_R;
    let xr = rim[0][0];
    for (let i = 0; i < rim.length - 1; i++) if (z >= rim[i][1] && z <= rim[i + 1][1]) xr = lerp(rim[i][0], rim[i + 1][0], (z - rim[i][1]) / (rim[i + 1][1] - rim[i][1]));
    const x = xr + (left ? 1 : -1) * (9 + rnd() * 6), r0 = 0.8 + rnd() * 2.4;
    if (left && z > 88 && z < 185 && x > -64) continue; // keep the shore set clear
    const gg = lump(r0, 4000 + k, 0.6); gg.translate(x, POOL_Y + r0 * 0.15, z); rockG[k % 3].push(gg);
  }
  const addMerged = (list: THREE.BufferGeometry[], m: THREE.Material, cast = true) => {
    if (!list.length) return;
    const mm = new THREE.Mesh(mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false), m); mm.castShadow = cast; mm.receiveShadow = true; root.add(mm);
  };
  addMerged(foamG, foamMat, false); addMerged(crestG, crestMat, false);
  rockG.forEach((l, i) => addMerged(l, rockMats[i]));

  // ---- mist: billows hugging the foot of the curtain, a column rising out of the horseshoe ----
  const mistMaps = { day: [0, 1, 2, 3].map((k) => mistTex(k)), golden: [0, 1, 2, 3].map((k) => mistTex(k, true)) };
  const mist: FallsSet["mist"] = [];
  const addMist = (base: V3, size: number, op: number) => {
    const mat = new THREE.MeshBasicMaterial({ map: mistMaps.day[mist.length % 4], transparent: true, depthWrite: false, opacity: op, fog: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK); m.renderOrder = 2;
    mist.push({ m, mat, base, size, k: rnd(), op }); root.add(m);
  };
  for (let k = 0; k < 34; k++) { // low billows where the sheet lands
    const s = rnd() * 2 - 1, c = curtainAt(s, 1).p, o = outward(s * PHI_M), back = -4 - rnd() * 14;
    addMist([c[0] + o[0] * back, POOL_Y + 2 + rnd() * 7, c[2] + o[1] * back], 14 + rnd() * 12, 0.62);
  }
  for (let k = 0; k < 16; k++) { // the plume: rises out of the middle of the horseshoe well above the brink, drifting downstream
    const h = k / 15, a = rnd() * TAU, rr = 4 + rnd() * 12;
    addMist([Math.cos(a) * rr + 6, POOL_Y + 16 + h * 95, 8 + Math.sin(a) * rr * 0.6 + h * 34], 30 + h * 36, 0.42 - 0.24 * h);
  }
  const rainbow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rainbowTex(), transparent: true, depthWrite: false, opacity: 0.16, fog: false }));
  rainbow.layers.set(NOINK); rainbow.renderOrder = 3; rainbow.visible = false; root.add(rainbow);
  return { mist, rainbow, mistMaps, ground, water: [riverM, poolM], sheet: curtainM };
}
