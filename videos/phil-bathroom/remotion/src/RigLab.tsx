// Dev-only: lineup of Phil + provisional homeowner for rig/pose checks. Not part of the episode.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, staticFile, useVideoConfig } from "remotion";
import { makeHomeowner, makePhil, type Rig } from "./lib/rig";

export const RigLab: React.FC = () => {
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("riglab"));
  useEffect(() => {
    (async () => {
      const props = getInputProps() as { view?: string };
      const [phil, home] = await Promise.all([makePhil(staticFile), makeHomeowner(staticFile)]);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x3a3d44);
      scene.add(new THREE.HemisphereLight(0xdde4ff, 0x40362a, 1.2));
      const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
      sun.position.set(2, 4, 5);
      scene.add(sun);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x777066 }));
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);
      const place = (r: Rig, x: number) => { r.root.position.x = x; scene.add(r.root); r.reset(); r.armsDown(); };
      place(phil, -0.45);
      place(home, 0.45);
      const names: string[] = [];
      phil.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) names.push(o.name); });
      console.warn("PHIL meshes", names.join(","), "pelvis", phil.pos("Bip01_Pelvis").toArray().map((v) => v.toFixed(2)).join(","),
        "head", phil.pos("Bip01_Head").toArray().map((v) => v.toFixed(2)).join(","));
      const cam = new THREE.PerspectiveCamera(30, width / height, 0.05, 50);
      if (props.view === "face") { cam.position.set(0.45, 1.6, 1.1); cam.lookAt(0.45, 1.55, 0); }
      else { cam.position.set(0, 1.0, 5.2); cam.lookAt(0, 0.95, 0); }
      const r = new THREE.WebGLRenderer({ canvas: ref.current!, antialias: true, preserveDrawingBuffer: true });
      r.setSize(width, height, false);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.25;
      r.render(scene, cam);
      continueRender(h);
    })();
  }, [h, width, height]);
  return <AbsoluteFill><canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
