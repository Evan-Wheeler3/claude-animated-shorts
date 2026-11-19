// Hold Up | Phil Won't Stop Using Your Bathroom (Absurd 3D Comedy).
// One WebGLRenderer; each set is its own THREE.Scene, posed per frame from the shot table (shots.ts) and rendered
// imperatively inside a delayRender/continueRender pair so every Remotion frame is a finished WebGL frame.
// Renderer settings follow the approved bathroom proof: ACES filmic, exposure 1.25, sRGB out, soft shadows.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Html5Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { shotAt, REVEAL_CUES } from "./shots";
import { loadReveal, type RevealSet } from "./sets/reveal";
import { loadBathroom, type BathroomSet } from "./sets/bathroom";
import { loadExterior, type ExteriorSet } from "./sets/exterior";

type Sets = { reveal: RevealSet; bathroom: BathroomSet; exterior: ExteriorSet };

let setsPromise: Promise<Sets> | null = null;
const loadSets = () =>
  (setsPromise ??= (async () => {
    const [reveal, bathroom, exterior] = await Promise.all([
      loadReveal(staticFile("bathroom/assets/Bathroom_Reveal.glb")),
      loadBathroom(),
      loadExterior(),
    ]);
    return { reveal, bathroom, exterior };
  })());

export const PhilShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const [sets, setSets] = useState<Sets | null>(null);
  const [loadHandle] = useState(() => delayRender("load phil sets", { timeoutInMilliseconds: 170000 }));

  useEffect(() => {
    loadSets().then((s) => {
      setSets(s);
      continueRender(loadHandle);
    });
  }, [loadHandle]);

  const { shot, local } = shotAt(frame);
  const black = shot.id === "S16" && local >= REVEAL_CUES.blackFrom;

  useEffect(() => {
    if (!sets || !canvas.current || black) return;
    const handle = delayRender(`frame ${frame}`);
    if (!renderer.current) {
      const r = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.25;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.current = r;
    }
    const r = renderer.current;
    r.setSize(width, height, false);
    let scene: THREE.Scene, camera: THREE.Camera;
    if (shot.set === "reveal") {
      sets.reveal.setFrame(local, width, height);
      ({ scene, camera } = sets.reveal);
    } else if (shot.set === "bathroom") {
      ({ scene, camera } = sets.bathroom.pose(shot.id, local, width / height));
    } else {
      ({ scene, camera } = sets.exterior.pose(shot.id, local, width / height));
    }
    r.render(scene, camera);
    continueRender(handle);
  }, [sets, frame, width, height, shot, local, black]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* temp animatic mix: locked narration + Codex temp SFX on the fitted cut (scripts/mix_animatic.py) */}
      <Html5Audio src={staticFile("audio/mix_animatic.wav")} />
      {black ? null : <canvas ref={canvas} width={width} height={height} style={{ width: "100%", height: "100%" }} />}
    </AbsoluteFill>
  );
};
