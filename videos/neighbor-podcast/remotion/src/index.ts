import React, {useEffect, useRef, useState} from "react";
import * as THREE from "three";
import {AbsoluteFill, cancelRender, Composition, continueRender, delayRender, registerRoot, useCurrentFrame, useVideoConfig} from "remotion";
import {buildSet, type KeyFrame} from "./sets";
import {Episode} from "./Episode";
import {FPS, TOTAL} from "./shots";

type Preview = Awaited<ReturnType<(typeof buildSet)[KeyFrame]>>;
const pending = new Map<KeyFrame, Promise<Preview>>();

const ReviewFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const key: KeyFrame = frame < 366 ? 45 : frame < 585 ? 510 : frame < 900 ? 795 : 1360;
  const {width, height} = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [initialHandle] = useState(() => delayRender("Initial Podcast WebGL frame"));
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer>();
  useEffect(() => {
    const gl = new THREE.WebGLRenderer({canvas: canvas.current!, antialias: true, preserveDrawingBuffer: true});
    gl.setSize(width, height, false);
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.25;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    setRenderer(gl);
    return () => gl.dispose();
  }, [width, height]);

  useEffect(() => {
    if (!renderer) return;
    let active = true;
    const handle = delayRender(`Podcast WebGL frame ${frame}`);
    let request = pending.get(key);
    if (!request) {
      request = buildSet[key]();
      pending.set(key, request);
    }
    request.then(({scene, camera}) => {
      if (!active) return;
      renderer.render(scene, camera);
      continueRender(initialHandle);
      continueRender(handle);
    }).catch((error: unknown) => {
      if (active) cancelRender(error instanceof Error ? error : String(error));
    });
    return () => {
      active = false;
      continueRender(handle);
    };
  }, [frame, initialHandle, key, renderer]);

  return React.createElement(AbsoluteFill, {style: {background: "black"}},
    React.createElement("canvas", {
      ref: canvas,
      style: {width: "100%", height: "100%", filter: key === 1360 ? "grayscale(1)" : undefined},
    }));
};

const Root = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, {
    id: "NeighborPodcast", component: Episode, width: 1080, height: 1920, fps: FPS, durationInFrames: TOTAL,
    defaultProps: {audio: "audio/motion_review_mix.wav"},
  }),
  React.createElement(Composition, {
    id: "PodcastStills", component: ReviewFrame, width: 1080, height: 1920, fps: 30, durationInFrames: 1530,
  }));

registerRoot(Root);
