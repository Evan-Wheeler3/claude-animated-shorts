// My Neighbor Has a Podcast — full ten-shot composition.
// One WebGLRenderer; each set is its own THREE.Scene, loaded on first use and posed per absolute frame. Every frame
// renders into a linear HDR target and is drawn through the device-look pass (lib/post.ts: ACES 1.25 + sRGB).
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Html5Audio, continueRender, delayRender, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { shotAt, type SetId } from "./shots";
import { Post } from "./lib/post";
import { loadPorch, type SetOut } from "./sets/porch";
import { loadNight } from "./sets/night";
import { loadSafe } from "./sets/safe";
import { loadWoods } from "./sets/woods";

type Poser = { pose: (f: number, aspect: number, ctx: Ctx) => SetOut };
export type Ctx = { renderer: THREE.WebGLRenderer; post: Post; frame: number };

const loaders: Record<SetId, () => Promise<Poser>> = {
  porch: loadPorch as () => Promise<Poser>,
  night: loadNight,
  safe: loadSafe,
  woods: loadWoods,
};
const cache = new Map<SetId, Promise<Poser>>();
const getSet = (id: SetId) => {
  if (!cache.has(id)) cache.set(id, loaders[id]());
  return cache.get(id)!;
};

let renderer: THREE.WebGLRenderer | null = null;
let post: Post | null = null;

export const Episode: React.FC<{ audio?: string }> = ({ audio }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender(`episode frame ${frame}`, { timeoutInMilliseconds: 170000 }));
  const shot = shotAt(frame);

  useEffect(() => {
    let alive = true;
    const h = delayRender(`frame ${frame}`, { timeoutInMilliseconds: 170000 });
    getSet(shot.set).then((set) => {
      if (!alive || !canvas.current) return;
      if (!renderer || renderer.domElement !== canvas.current) {
        renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        post = new Post(width, height);
      }
      renderer.setSize(width, height, false);
      post!.setSize(width, height);
      const out = set.pose(frame, width / height, { renderer, post: post!, frame });
      if (out.black) {
        renderer.setRenderTarget(null);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
      } else {
        out.scene.updateMatrixWorld(true);
        post!.render(renderer, out.scene, out.camera, out.fx, frame);
      }
      continueRender(h);
      continueRender(handle);
    });
    return () => {
      alive = false;
      continueRender(h);
    };
  }, [frame, width, height, shot.set, handle]);

  const env = getRemotionEnvironment();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {audio && !env.isStudio ? <Html5Audio src={staticFile(audio)} /> : null}
      {audio && env.isStudio ? <Html5Audio src={staticFile(audio)} /> : null}
      <canvas ref={canvas} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
