// Painted water for every set (moved out of the Niagara falls build so other shorts and the QA lab reuse it):
// grid/orient mesh helpers, the painted flow / curtain / foam data textures and one Lambert-based material with four
// looks (0 river with flow uv, 1 falling sheet, 2 pool/lake in world xz, 3 solid foam). Colours are on-screen targets
// (tone-map inverted, shade.ts untone) lit only by sun visibility (+ a facing term for sheets and foam).
import * as THREE from "three";
import { ctex } from "./paint";
import { LFB, untone } from "./shade";
export type V3 = [number, number, number];

export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** indexed grid: fn(i, j) -> position + uv; smooth normals; flip reverses the winding */
export const grid = (nu: number, nv: number, fn: (i: number, j: number) => { p: V3; uv: [number, number] }, flip = false) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], W = nu + 1;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const o = fn(i, j); pos.push(...o.p); uv.push(...o.uv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** flip the winding if the mean normal disagrees with `want` (world direction) */
export const orient = (g: THREE.BufferGeometry, want: THREE.Vector3) => {
  const n = g.attributes.normal; let s = 0;
  for (let i = 0; i < n.count; i += 7) s += n.getX(i) * want.x + n.getY(i) * want.y + n.getZ(i) * want.z;
  if (s < 0) {
    const ix = g.index!.array as Uint32Array | Uint16Array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.index!.needsUpdate = true; g.computeVertexNormals();
  }
  return g;
};

// ---------------- painted water textures (R = foam / crest, G = dark trough, B = glint) ----------------
const flowTex = () => ctex("nfFlow", 1024, 1024, (g, r) => {
  g.fillStyle = "#000000"; g.fillRect(0, 0, 1024, 1024);
  g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const stroke = (col: string, n: number, w0: number, w1: number, l0: number, l1: number, curl: number) => {
    for (let k = 0; k < n; k++) {
      const x = r() * 1024, y = r() * 1024, len = l0 + r() * (l1 - l0), w = w0 + r() * (w1 - w0), c = (r() - 0.5) * curl;
      for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath();
        g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + c, y + oy + len / 2, x + ox + c * 0.3, y + oy + len); g.stroke();
      }
    }
  };
  stroke("rgba(0,150,0,1)", 110, 8, 18, 40, 120, 30);  // troughs
  stroke("rgba(170,0,0,1)", 120, 2.5, 6, 25, 80, 20);  // short streaks
  stroke("rgba(0,0,255,1)", 40, 2, 4, 10, 30, 6);      // glints
  // standing waves: crescent crests ACROSS the flow (rapids read as rows of breaking waves, not light streaks)
  for (let k = 0; k < 170; k++) {
    const x = r() * 1024, y = r() * 1024, w = 24 + r() * 80, bow = 2 + r() * 6, lw = 2.5 + r() * 4.5;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      g.strokeStyle = `rgba(${Math.round(170 + r() * 85)},0,0,1)`; g.lineWidth = lw; g.beginPath();
      g.moveTo(x + ox - w / 2, y + oy + bow); g.quadraticCurveTo(x + ox, y + oy - bow, x + ox + w / 2, y + oy + bow); g.stroke();
      g.fillStyle = "rgba(90,0,0,1)"; g.beginPath(); g.ellipse(x + ox, y + oy + bow * 0.9, w * 0.38, bow * 0.9, 0, 0, Math.PI); g.fill();
    }
  }
});
const curtainTex = () => ctex("nfCurtain", 512, 1024, (g, r) => {
  g.fillStyle = "#000000"; g.fillRect(0, 0, 512, 1024);
  g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let k = 0; k < 170; k++) {
    const x = r() * 512, y = r() * 1024, len = 120 + r() * 600, w = 3 + r() * 12, foam = r() < 0.62;
    for (const ox of [-512, 0, 512]) for (const oy of [-1024, 0, 1024]) {
      g.strokeStyle = foam ? `rgba(${Math.round(150 + r() * 105)},0,0,1)` : "rgba(0,170,0,1)"; g.lineWidth = w;
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + (r() - 0.5) * 10, y + oy + len); g.stroke();
    }
  }
});
const foamTex = () => ctex("nfFoam", 1024, 1024, (g, r) => {
  g.fillStyle = "#000000"; g.fillRect(0, 0, 1024, 1024);
  g.globalCompositeOperation = "lighter";
  for (let k = 0; k < 340; k++) {
    const x = r() * 1024, y = r() * 1024, rx = 8 + r() * 36, ry = rx * (0.4 + r() * 0.5), dark = r() < 0.3;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      g.fillStyle = dark ? "rgba(0,120,0,1)" : `rgba(${Math.round(120 + r() * 135)},0,0,1)`;
      g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, r() * 3, 0, TAU); g.fill();
    }
  }
  for (let k = 0; k < 60; k++) { const x = r() * 1024, y = r() * 1024; g.fillStyle = "rgba(0,0,255,1)"; g.beginPath(); g.arc(x, y, 2 + r() * 3, 0, TAU); g.fill(); }
});
export const dataTex = (t: THREE.Texture) => { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; };

// ---------------- painted water material ----------------
/** kind 0 = upper river, 1 = curtain, 2 = plunge pool / lower river. uv: river (across m, upstream m); curtain
 *  (along lip m, fallen m); pool: world xz. Colours are on-screen targets (untone), lit only by sun visibility and a
 *  soft facing term (curtain). */
export type WaterLook = { deep: string; mid: string; far: string; green: string; greenLight: string; crest: string; trough: string; foam: string; foamShade: string; glint: string; mist: string; shade: [number, number, number] };
export const WATER_DAY: WaterLook = {
  deep: "#1f7f95", mid: "#2b97a6", far: "#4f88b5", green: "#1e8a72", greenLight: "#5fc2a4", crest: "#f1fbff", trough: "#145f78",
  foam: "#f4f9fb", foamShade: "#b3c6de", glint: "#ffffff", mist: "#e6eef6", shade: [0.62, 0.68, 0.84],
};
export const WATER_GOLD: WaterLook = {
  deep: "#24607e", mid: "#2f7d92", far: "#b79a9a", green: "#2a7a63", greenLight: "#8cc59a", crest: "#fff1df", trough: "#173f5e",
  foam: "#fff3e4", foamShade: "#a8a6c8", glint: "#fff0c8", mist: "#f7e3d3", shade: [0.55, 0.56, 0.8],
};
export const WU = {
  wDeep: { value: new THREE.Color() }, wMid: { value: new THREE.Color() }, wFar: { value: new THREE.Color() }, wGreen: { value: new THREE.Color() },
  wGreenL: { value: new THREE.Color() }, wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wFoam: { value: new THREE.Color() },
  wFoamS: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() }, wMist: { value: new THREE.Color() }, wShade: { value: new THREE.Vector3(0.6, 0.66, 0.82) },
  wTime: { value: 0 }, tFlow: { value: null as THREE.Texture | null }, tCurtain: { value: null as THREE.Texture | null }, tFoam: { value: null as THREE.Texture | null },
};
export const setWaterLook = (L: WaterLook, t: number) => {
  untone(L.deep, WU.wDeep.value); untone(L.mid, WU.wMid.value); untone(L.far, WU.wFar.value); untone(L.green, WU.wGreen.value);
  untone(L.greenLight, WU.wGreenL.value); untone(L.crest, WU.wCrest.value); untone(L.trough, WU.wTrough.value); untone(L.foam, WU.wFoam.value);
  untone(L.foamShade, WU.wFoamS.value); untone(L.glint, WU.wGlint.value); untone(L.mist, WU.wMist.value); WU.wShade.value.set(...L.shade); WU.wTime.value = t;
};
const W_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wDeep, wMid, wFar, wGreen, wGreenL, wCrest, wTrough, wFoam, wFoamS, wGlint, wMist, wShade;
uniform sampler2D tFlow, tCurtain, tFoam;
uniform float wTime;`;
const W_COL: Record<number, string> = {
  // upper river: depression-angle gradient, flow-aligned streaks (u across, v upstream), rapids band, glassy green brink
  0: `
  vec3 wV = vWP - cameraPosition; float wd = length(wV);
  float dep = asin(clamp(-wV.y / wd, 0.0, 1.0)), wf = 1.0 - smoothstep(0.0, 0.5, dep);
  vec3 wc = mix(mix(wDeep, wMid, smoothstep(0.0, 0.5, wf)), wFar, smoothstep(0.6, 1.0, wf) * smoothstep(60.0, 260.0, wd));
  float d = vWUv.y, s = vWUv.x;
  float rap = smoothstep(8.0, 30.0, d) * (1.0 - smoothstep(240.0, 420.0, d));
  vec4 a = texture2D(tFlow, vec2(s / 9.0, d / 26.0 + 0.55 * wTime));
  vec4 b = texture2D(tFlow, vec2(s / 31.0 + 0.37, d / 75.0 + 0.2 * wTime));
  vec4 mk = mix(a, b, smoothstep(30.0, 140.0, wd));
  wc = mix(wc, wTrough, mk.g * (0.35 + 0.35 * rap));
  float foam = clamp(mk.r * (0.3 + 0.8 * rap), 0.0, 1.0);
  wc = mix(wc, mix(wCrest, wMid, 0.25), smoothstep(0.2, 0.5, foam) * 0.55);
  wc = mix(wc, wCrest, smoothstep(0.5, 0.85, foam));
  float brink = 1.0 - smoothstep(1.5, 16.0, d);
  vec3 g = mix(wGreen, wGreenL, smoothstep(0.3, 0.8, a.r) * 0.7);
  wc = mix(wc, g, brink * 0.85);
  wc = mix(wc, wGlint, mk.b * 0.6 * wf);
  diffuseColor.rgb = wc;`,
  // curtain: emerald glass at the brink with white streaks, white by ~25 m down, melting into mist near the pool
  1: `
  float k = vWUv.y, s = vWUv.x;
  vec4 c = texture2D(tCurtain, vec2(s / 11.0, k / 34.0 - 1.4 * wTime));
  vec4 c2 = texture2D(tCurtain, vec2(s / 4.0 + 0.31, k / 12.0 - 1.4 * wTime));
  float toWhite = smoothstep(1.0, 20.0, k);
  vec3 top = mix(wGreen, wGreenL, c2.g * 0.6);
  top = mix(top, wCrest, smoothstep(0.35, 0.8, c.r) * 0.85);
  vec3 low = mix(wFoam, wFoamS, smoothstep(0.2, 0.7, c.g) * 0.75 + 0.15 * c2.g);
  vec3 wc = mix(top, low, toWhite);
  wc = mix(wc, wMist, smoothstep(28.0, 50.0, k) * 0.75);
  diffuseColor.rgb = wc;`,
  // pool: a boiling foam field inside the horseshoe, foam rafts and streaks drifting down the green lower river
  2: `
  vec2 p = vWP.xz; float r = length(p);
  vec3 wV = vWP - cameraPosition; float wd = length(wV);
  float dep = asin(clamp(-wV.y / wd, 0.0, 1.0)), wf = 1.0 - smoothstep(0.0, 0.5, dep);
  vec3 wc = mix(mix(wDeep, wMid, smoothstep(0.0, 0.5, wf)), wFar, smoothstep(0.6, 1.0, wf) * smoothstep(80.0, 300.0, wd));
  wc = mix(wc, wGreen, 0.35);
  vec4 f1 = texture2D(tFoam, p / 34.0 + vec2(0.0, -0.08 * wTime));
  vec4 f2 = texture2D(tFoam, vec2(p.x / 18.0, p.y / 70.0 - 0.15 * wTime) + 0.41);
  float boil = 1.0 - smoothstep(50.0, 95.0, r + 18.0 * max(p.y, 0.0) / 120.0);
  float raft = smoothstep(0.75, 0.95, f2.r) * (1.0 - smoothstep(100.0, 320.0, p.y)) * 0.7;
  float foam = clamp(boil * smoothstep(0.15, 0.65, f1.r + 0.35 * boil) + raft, 0.0, 1.0);
  vec3 fc = mix(wFoam, wFoamS, smoothstep(0.1, 0.8, f1.g) * 0.8);
  wc = mix(wc, wTrough, f2.g * 0.25 * (1.0 - foam));
  wc = mix(wc, fc, smoothstep(0.15, 0.6, foam));
  wc = mix(wc, wGlint, f2.b * 0.4 * wf * (1.0 - foam));
  diffuseColor.rgb = wc;`,
  // solid foam mounds / crests: painted white with cool lavender shading toward the shadow side
  3: `
  diffuseColor.rgb = wFoam;`,
};
export const waterMat = (kind: number) => {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, side: kind === 1 ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WU);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    // the water uses its uv in the colour code even without a map
    sh.vertexShader = sh.vertexShader.replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nvarying vec2 vWUv;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvWUv = uv;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", W_DECL + "\nvarying vec2 vWUv;")
      .replace("#include <map_fragment>", W_COL[kind])
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
  #if NUM_DIR_LIGHTS > 0
  float face = ${kind === 1 ? "smoothstep(-0.35, 0.6, dot(geometryNormal, directionalLights[0].direction))" : kind === 3 ? "smoothstep(-0.1, 0.55, dot(geometryNormal, directionalLights[0].direction))" : "1.0"};
  #else
  float face = 1.0;
  #endif
  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis * mix(${kind === 3 ? "0.0" : "0.55"}, 1.0, face));
  reflectedLight.indirectDiffuse = vec3(0.0);`);
  };
  m.customProgramCacheKey = () => "nfWater" + kind;
  return m;
};

/** bind the painted data textures once (idempotent) */
export const initWaterTextures = () => {
  if (WU.tFlow.value) return;
  WU.tFlow.value = dataTex(flowTex()); WU.tCurtain.value = dataTex(curtainTex()); WU.tFoam.value = dataTex(foamTex());
};
