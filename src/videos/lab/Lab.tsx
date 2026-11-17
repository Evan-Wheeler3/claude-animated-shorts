// "CharacterLab": the standard character / grounding QA composition (docs/learning/VISUAL-QA.md). Same post chain as
// the shorts (ink -> lens -> bloom -> neutral tone map -> grade). Render stills with scripts/lab-stills.mjs.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../../pipeline/ink";
import { LensBlur } from "../../pipeline/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../../pipeline/grade";
import { LabWorld, LAB_FRAMES } from "./labWorld";

export { LAB_FRAMES };
const fwd = new THREE.Vector3();
const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new LabWorld(), []);
  const fx = useMemo(() => {
    const bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
    const mip = bloom.mipmapBlurPass, setSize = mip.setSize.bind(mip);
    mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
    return { ink: new InkPass(scene, camera as THREE.PerspectiveCamera), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom,
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) };
  }, [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const r = world.update(f, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, r.focus.clone().sub(cam.position).dot(fwd)); fx.lens.cInf = r.cInf;
  gradeFor(fx.grade, "day");
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};
const dpr = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
export const CharacterLab: React.FC = () => (
  <AbsoluteFill style={{ background: "#cfe3f2" }}>
    <ThreeCanvas width={1080} height={1920} {...(dpr() ? { dpr: dpr() } : {})} shadows gl={{ antialias: false, stencil: false, toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.15, far: 1500 }}>
      <Inner />
    </ThreeCanvas>
  </AbsoluteFill>
);
