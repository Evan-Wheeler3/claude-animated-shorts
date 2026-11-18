import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Composition, registerRoot, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass } from "../../../templates/bridge/ink";
import { LensBlur } from "../../../templates/bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../../../templates/bridge/grade";
import { makeProof, proofs } from "./poses";

const Proof = () => {
  const frame = useCurrentFrame();
  const { scene, camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const proof = useMemo(() => makeProof(frame, cam), [frame, cam]);
  const post = useMemo(() => ({
    ink: new InkPass(scene, cam),
    blur: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [cam, scene]);
  useEffect(() => () => post.ink.dispose(), [post]);
  post.blur.cInf = proof.cInf;
  post.blur.focus = cam.position.distanceTo(proof.focus);
  return <>
    <color attach="background" args={[proof.shopShot ? "#b7a18c" : "#a8cbe2"]} />
    <fog attach="fog" args={["#b8d0ec", 12, 42]} />
    <hemisphereLight args={["#f3f1f8", "#a78d99", 1.23]} />
    <directionalLight position={[-3,6,4]} color="#ffe9d0" intensity={1.64} castShadow
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-normalBias={.006}
      shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
    <primitive object={proof.root} />
    <EffectComposer multisampling={4}>
      <primitive object={post.ink} dispose={null} />
      <primitive object={post.blur.pre} dispose={null} />
      <primitive object={post.blur.main} dispose={null} />
      <primitive object={post.tone} />
      <primitive object={post.grade} />
    </EffectComposer>
  </>;
};

const AssetProofs = () => (
  <ThreeCanvas width={1080} height={1920} dpr={.5} shadows gl={{ antialias: false, stencil: false }}
    camera={{ near: .025, far: 75 }}>
    <Proof />
  </ThreeCanvas>
);
registerRoot(() => (
  <Composition id="GoldRushAssetProofs" component={AssetProofs} durationInFrames={proofs.length}
    fps={30} width={1080} height={1920} />
));
