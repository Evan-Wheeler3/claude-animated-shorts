// "Could You Survive a Western Duel?": our original 46 s short (post chain unchanged from the bridge template) in the flat-characters-in-a-3D-toon-world style.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (look-match pass):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt, ODDS, oddsAt } from "./story";

export const DUEL_FRAMES = TOTAL;

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const shadowRes = () => (getInputProps() as { post?: { shadow?: number } }).post?.shadow ?? 4096;
const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(shadowRes()), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = f; // deterministic per frame
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** the odds counter: a wooden sign hanging from the top of the frame (the one on-screen text, by the user's choice) */
const INKC = "#241726";
const mixHex = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), c = (sh: number) => Math.round(((A >> sh) & 255) * (1 - t) + ((B >> sh) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};
const oddsColour = (v: number) => (v < 25 ? mixHex("#d63a2f", "#e8902a", v / 25) : v < 60 ? mixHex("#e8902a", "#e8c43a", (v - 25) / 35) : mixHex("#e8c43a", "#5fb24a", (v - 60) / 40));
const Counter: React.FC<{ f: number }> = ({ f }) => {
  const v = oddsAt(f);
  // a hit: the sign jolts when the odds drop, bounces when they climb
  let shake = 0, pop = 0;
  for (let i = 1; i < ODDS.length; i++) {
    const n = f - ODDS[i][0], drop = ODDS[i][1] < ODDS[i - 1][1];
    if (n >= 0 && n < 9) { if (drop) shake += 14 * (n % 2 ? -1 : 1) * (1 - n / 9); else pop += 0.08 * Math.sin((n / 9) * Math.PI); }
  }
  const last = ODDS[ODDS.length - 1][0], stop = f - (last + 62);
  if (stop >= 0 && stop < 10) pop += 0.07 * Math.sin((stop / 10) * Math.PI);
  const sway = 1.6 * Math.sin(f / 23);
  const plank = "repeating-linear-gradient(180deg, #a8743f 0px, #a8743f 52px, #8a5a30 52px, #8a5a30 56px), #a8743f";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "50%", top: 0, width: 600, height: 250, transform: `translateX(-50%) translateX(${shake}px) rotate(${sway}deg)`, transformOrigin: "50% 0%" }}>
        {[70, 530].map((x) => <div key={x} style={{ position: "absolute", left: x - 4, top: 0, width: 8, height: 58, background: "#6a4a2a", border: `3px solid ${INKC}`, borderTop: "none" }} />)}
        <div style={{ position: "absolute", left: 0, top: 54, width: 600, height: 186, background: plank, border: `7px solid ${INKC}`, borderRadius: 18, boxShadow: "0 10px 0 rgba(36,23,38,0.35)", transform: `scale(${1 + pop})` }}>
          {[[18, 16], [570, 16], [18, 156], [570, 156]].map(([x, y]) => <div key={`${x}${y}`} style={{ position: "absolute", left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: 6, background: "#3a302a" }} />)}
          <div style={{ position: "absolute", left: 0, right: 0, top: 10, textAlign: "center", fontFamily: "Georgia, 'DejaVu Serif', serif", fontWeight: 900, fontSize: 40, letterSpacing: 3, color: "#f7ead0", WebkitTextStroke: `2px ${INKC}`, paintOrder: "stroke fill" }}>ODDS OF SURVIVAL</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 50, textAlign: "center", fontFamily: "Georgia, 'DejaVu Serif', serif", fontWeight: 900, fontSize: 118, lineHeight: "122px", color: oddsColour(v), WebkitTextStroke: `9px ${INKC}`, paintOrder: "stroke fill" }}>{v}%</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DuelShort: React.FC = () => {
  const f = useCurrentFrame();
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      <Counter f={f} />
      <Audio src={staticFile("duel/mix.m4a")} />
    </AbsoluteFill>
  );
};
