// Dev-only: prints bounds of named nodes in the supplied GLBs (console.warn so the stills script echoes it).
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { loadGLB } from "./lib/load";
export const Probe: React.FC = () => {
  const [h] = useState(() => delayRender("probe"));
  useEffect(() => {
    (async () => {
      const f = (v: THREE.Vector3) => v.toArray().map((x) => x.toFixed(2)).join(",");
      for (const file of ["Bathroom_Set", "Bathroom_Cast", "Bathroom_Reveal"]) {
        const g = await loadGLB(staticFile(`bathroom/assets/${file}.glb`));
        g.scene.updateMatrixWorld(true);
        const out: string[] = [];
        g.scene.children.forEach((c) => {
          if (/^Foam_|Curtain_Hook|Phil_Shorts|Phil_Crew/.test(c.name)) return;
          const b = new THREE.Box3().setFromObject(c);
          out.push(`${c.name}[${f(b.min)} | ${f(b.max)}]`);
        });
        console.warn(file, out.join(" ; "));
        if (file === "Bathroom_Reveal") g.cameras.forEach((c) => console.warn("cam", c.name, f(c.getWorldPosition(new THREE.Vector3())), (c as THREE.PerspectiveCamera).fov));
        if (file === "Bathroom_Cast") { const n = g.scene.getObjectByName("Newspaper_Page_L") as THREE.Mesh; console.warn("paper mat", (n.material as THREE.MeshStandardMaterial).name, JSON.stringify((n.geometry as THREE.BufferGeometry).boundingBox)); }
      }
      continueRender(h);
    })();
  }, [h]);
  return <AbsoluteFill style={{ background: "black" }} />;
};
