// "U-1206 — The Toilet That Doomed a Submarine". Same post chain as Niagara/bridge: InkPass -> lens blur pre + main ->
// bloom -> NEUTRAL tone map -> grade, MSAA 4. GATE 1: no audio yet (Gate 3 adds public/u1206-toilet-disaster/mix.m4a).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../../pipeline/ink";
import { LensBlur } from "../../pipeline/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../../pipeline/grade";
import { TOTAL, layersAt, dofAt } from "./story";

export const U1206_FRAMES = TOTAL;
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, { distNear: 1.5, distFar: 120, fadeNear: 300, fadeFar: 900 }),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(id, f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, "day");
  return (<><primitive object={world.root} dispose={null} />
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} /><primitive object={fx.lens.pre} dispose={null} /><primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} /><primitive object={fx.tone} dispose={null} /><primitive object={fx.grade} dispose={null} />
    </EffectComposer></>);
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.15, far: 1500 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const U1206Short: React.FC = () => {
  const f = useCurrentFrame();
  return (<AbsoluteFill style={{ background: "#1b5f80" }}>{layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
    {/* narration (videos/u1206-toilet-disaster/voice/voice.wav, copied to public/); no sound design or music yet */}
    <Audio src={staticFile("u1206-toilet-disaster/voice.wav")} />
  </AbsoluteFill>);
};
