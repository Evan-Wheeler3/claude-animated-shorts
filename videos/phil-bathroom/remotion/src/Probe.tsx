// Dev-only: prints bounds / transforms of the Codex asset upgrade (console.warn so the stills script echoes it).
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { loadGLB } from "./lib/load";
export const Probe: React.FC = () => {
  const [h] = useState(() => delayRender("probe"));
  useEffect(() => {
    (async () => {
      const f = (v: THREE.Vector3) => v.toArray().map((x) => x.toFixed(3)).join(",");
      const box = (o: THREE.Object3D) => { const b = new THREE.Box3().setFromObject(o, true); return `[${f(b.min)}|${f(b.max)}]`; };
      for (const p of ["Rotisserie_Tray", "Newspaper_Folded", "Vault_Pole", "Metal_File", "Claw_Hammer", "Screwdriver", "Account_Statement", "Plywood_Board", "Car_Sedan"]) {
        const g = await loadGLB(staticFile(`props/${p}.glb`));
        g.scene.updateMatrixWorld(true);
        console.warn(p, box(g.scene));
      }
      const house = await loadGLB(staticFile("exterior/House_Exterior.glb"));
      house.scene.updateMatrixWorld(true);
      const out: string[] = [];
      house.scene.traverse((o) => { if (o.scale.x < 0.01 || !o.visible) out.push(`${o.name}(s${o.scale.x.toFixed(2)},v${o.visible})`); });
      console.warn("HIDDEN", out.join(" "));
      for (const n of ["House_Exterior", "Fortress_Dressing", "Steel_Door", "Front_Door_Hinge", "Deadbolt_Turnpiece", "Window_Sash", "Bar_2", "Garage_Panel_0", "Security_Sensor_Lens", "Guard_Booth", "Yard_Lamp"]) {
        const o = house.scene.getObjectByName(n)!;
        console.warn(n, "parent", o.parent?.name, "pos", f(o.position), "rot", f(new THREE.Vector3().setFromEuler(o.rotation)), "world", f(o.getWorldPosition(new THREE.Vector3())));
      }
      const hall = await loadGLB(staticFile("interior/Hallway.glb"));
      hall.scene.updateMatrixWorld(true);
      for (const n of ["Bath_Door_Hinge", "Steel_Front_Door_Interior", "Bolt"]) { const o = hall.scene.getObjectByName(n)!; console.warn("HALL", n, f(o.position), "world", f(o.getWorldPosition(new THREE.Vector3()))); }
      const pug = await loadGLB(staticFile("cast/Gregory_Pug_Rig.glb"));
      const mixer = new THREE.AnimationMixer(pug.scene);
      const root = pug.scene.getObjectByName("Pug_Root")!, jaw = pug.scene.getObjectByName("Pug_Jaw")!, tag = pug.scene.getObjectByName("Gregory_Tag")!;
      console.warn("PUG bounds", box(pug.scene), "tag parent", tag.parent?.name);
      for (const clip of pug.animations) console.warn("CLIP", clip.name, clip.duration.toFixed(2), clip.tracks.length, clip.tracks.slice(0, 6).map((t) => `${t.name}:${t.times.length}:${Array.from(t.values.slice(0, 3)).map((v) => v.toFixed(3)).join("/")}..${Array.from(t.values.slice(-3)).map((v) => v.toFixed(3)).join("/")}`).join(" "));
      const scoot = pug.animations.find((c) => c.name === "Scoot_Forward")!;
      const act = mixer.clipAction(scoot); act.play(); act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true;
      for (const t of [0, 0.25, 0.49]) { mixer.setTime(t); pug.scene.updateMatrixWorld(true); console.warn("SCOOT", t, f(root.position), f(root.getWorldPosition(new THREE.Vector3()))); }
      continueRender(h);
    })();
  }, [h]);
  return <AbsoluteFill style={{ background: "black" }} />;
};
