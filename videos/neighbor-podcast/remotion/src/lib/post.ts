// Device-feed post pass. Every frame is rendered to a linear HDR target, then drawn through one full-screen shader
// that applies ACES filmic (exposure 1.25, as in Phil's approved proof), sRGB output and the per-shot device look:
//   clean   – plain film camera (narrator shots)
//   fisheye – doorbell camera: barrel distortion, soft corners, mild chroma fringe, cool wash
//   monitor – baby-monitor night feed: desaturated, cool, soft, scanlines, light grain
//   ir      – trail-cam infrared: monochrome, flash hot-spot, heavy grain, crushed edges
//   webcam  – small camera inside the safe: light barrel, warm-dark, grain
import * as THREE from "three";

export type FxMode = "clean" | "fisheye" | "monitor" | "ir" | "webcam";
const MODE: Record<FxMode, number> = { clean: 0, fisheye: 1, monitor: 2, ir: 3, webcam: 4 };

export type Fx = {
  mode: FxMode;
  /** 0..1 fade to black (multiplies output) */
  fade?: number;
  /** extra exposure multiplier */
  exposure?: number;
  /** monitor power-on flicker 0..1 (monitor mode) */
  flicker?: number;
};

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform int mode;
uniform float frame, aspect, fade, exposure, flicker;
uniform float seed;
uniform vec2 res;

float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c){
  const mat3 IN = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
  const mat3 OUT = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
  c *= 1.25 / 0.6; c = IN * c; c = RRTAndODTFit(c); c = OUT * c; return clamp(c, 0.0, 1.0);
}
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 tap(vec2 uv){ return texture2D(tSrc, uv).rgb; }

void main(){
  vec2 uv = vUv;
  vec3 c;
  float edge = 1.0;
  if (mode == 1 || mode == 4) {
    // barrel distortion about the centre; source was rendered with a wider FOV so corners stay filled
    float k = mode == 1 ? 0.30 : 0.14;
    vec2 p = uv * 2.0 - 1.0; p.x *= aspect;
    float r2 = dot(p, p);
    vec2 q = p / (1.0 + k * r2); q.x /= aspect;
    vec2 s = q * 0.5 + 0.5;
    float ca = mode == 1 ? 0.0025 * r2 : 0.0012 * r2;
    c = vec3(tap(s + vec2(ca, 0.0)).r, tap(s).g, tap(s - vec2(ca, 0.0)).b);
    edge = smoothstep(1.55, 0.55, length(p * vec2(1.0, 0.72)));
  } else {
    c = tap(uv);
    if (mode == 2) c = mix(c, (tap(uv + vec2(1.5/res.x, 0.0)) + tap(uv - vec2(1.5/res.x, 0.0))) * 0.5, 0.5);
  }
  c *= exposure;
  c = aces(c);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float g = h21(floor(uv * res) + vec2(frame * 37.0, frame * 11.0)) - 0.5;
  if (mode == 1) { // doorbell: cool, slightly lifted blacks, sharpened contrast
    c = mix(vec3(l), c, 0.82) * vec3(0.95, 1.0, 1.06);
    c = c * 0.92 + 0.035;
    c += g * 0.025;
    c *= mix(0.25, 1.0, edge);
  } else if (mode == 2) { // monitor night feed
    c = mix(vec3(l), c, 0.35) * vec3(0.86, 0.98, 1.08);
    c = pow(c, vec3(0.9)) * 1.05;
    c *= 0.93 + 0.07 * sin(uv.y * res.y * 1.6);
    c += g * 0.05;
    c *= 1.0 - 0.35 * length(uv - 0.5);
    c *= 1.0 - flicker * (0.5 + 0.5 * sin(frame * 3.1));
  } else if (mode == 3) { // infrared trail cam
    float y = smoothstep(0.02, 0.85, pow(l, 0.9)) * 1.1;
    y += g * 0.12;
    y *= 1.0 - 0.55 * pow(length((uv - vec2(0.5, 0.52)) * vec2(1.0, 0.8)), 1.6);
    c = vec3(y) * vec3(0.97, 1.0, 0.98);
  } else if (mode == 4) { // inside-the-safe webcam
    c = mix(vec3(l), c, 0.75);
    c += g * 0.05;
    c *= mix(0.35, 1.0, edge);
  }
  c = clamp(c, 0.0, 1.0) * (1.0 - fade);
  gl_FragColor = vec4(srgb(c), 1.0);
}`;

export class Post {
  rt: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  mat: THREE.ShaderMaterial;
  constructor(public w: number, public h: number) {
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        tSrc: { value: this.rt.texture },
        mode: { value: 0 },
        frame: { value: 0 },
        aspect: { value: w / h },
        res: { value: new THREE.Vector2(w, h) },
        fade: { value: 0 },
        exposure: { value: 1 },
        flicker: { value: 0 },
      },
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }
  setSize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.rt.setSize(w, h);
    this.mat.uniforms.aspect.value = w / h;
    (this.mat.uniforms.res.value as THREE.Vector2).set(w, h);
  }
  /** render scene through the device look into `target` (null = canvas) */
  render(r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, fx: Fx, frame: number, target: THREE.WebGLRenderTarget | null = null) {
    const prevTM = r.toneMapping;
    r.toneMapping = THREE.NoToneMapping; // linear into the HDR target; the shader tone-maps
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(scene, camera);
    const u = this.mat.uniforms;
    u.mode.value = MODE[fx.mode];
    u.frame.value = frame;
    u.fade.value = fx.fade ?? 0;
    u.exposure.value = fx.exposure ?? 1;
    u.flicker.value = fx.flicker ?? 0;
    r.setRenderTarget(target);
    r.render(this.scene, this.cam);
    r.setRenderTarget(null);
    r.toneMapping = prevTM;
  }
}
