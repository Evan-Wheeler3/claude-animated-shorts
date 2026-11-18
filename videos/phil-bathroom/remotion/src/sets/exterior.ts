// S03-S14 staging on the built exterior. Two light states: DAY (S03-S11) and DUSK (S12-S14, warm practicals on a
// blue sky, matching the pole-vault concept). Every shot = camera keys + per-frame blocking of cast and props.
// Motion here is BLOCKING for the low-res animatic: readable poses and contacts on the right frames, not final animation.
import * as THREE from "three";
import { staticFile } from "remotion";
import { buildExterior, PORCH_Y, WALL_H } from "./exteriorBuild";
import { makeExtra, makeHomeowner, makePhil, B, type Rig } from "../lib/rig";
import { applyCam, lerp, ramp, type CamKey, type V3 } from "../lib/cam";
import { crouch, face, handsFront, kneeUp, legs, look, seated, stand, walk } from "../lib/poses";
import { label } from "../lib/tex";

export type ExteriorSet = { pose: (id: string, local: number, aspect: number) => { scene: THREE.Scene; camera: THREE.PerspectiveCamera } };

function skyTexture(key: string, top: string, mid: string, horizon: string, clouds: number) {
  return label(`sky-${key}`, 64, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top);
    gr.addColorStop(0.36, mid);
    gr.addColorStop(0.5, horizon);
    gr.addColorStop(1, horizon);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = `rgba(255,255,255,${clouds})`;
    for (let i = 0; i < 18; i++) g.fillRect(0, h * (0.18 + i * 0.016), w, 3 + (i % 4));
  });
}

export async function loadExterior(): Promise<ExteriorSet> {
  const scene = new THREE.Scene();
  const X = buildExterior(scene);

  // ---------- sky + fog ----------
  const skyDay = skyTexture("day", "#4f7fc4", "#86a9d8", "#c9d6e2", 0.05);
  const skyDusk = skyTexture("dusk", "#1a2660", "#2f4190", "#6470a8", 0.0);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyDay, side: THREE.BackSide, fog: false, toneMapped: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog(0xc9d6e2, 30, 170);

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0xc3d6f2, 0x6a5a3a, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffeccc, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();
  const yardLamp = new THREE.PointLight(0xffc479, 0, 16, 1.6);
  yardLamp.position.set(-8.2, WALL_H + 0.75, -12.25);
  yardLamp.castShadow = true;
  yardLamp.shadow.mapSize.set(1024, 1024);
  yardLamp.shadow.bias = -0.002;
  scene.add(yardLamp);
  const vaultFill = new THREE.PointLight(0xffb870, 0, 12, 1.4); // warm spill from the yard lamp onto Phil's front
  vaultFill.position.set(-6.6, 4.9, -13.6);
  scene.add(vaultFill);
  const porchL = new THREE.PointLight(0xffc98a, 0, 7, 2);
  porchL.position.set(X.doorX, PORCH_Y + 1.8, 0.9);
  porchL.castShadow = true;
  porchL.shadow.mapSize.set(1024, 1024);
  porchL.shadow.bias = -0.002;
  scene.add(porchL);
  const flood = new THREE.SpotLight(0xffe6b8, 0, 18, 0.7, 0.5, 1.4);
  flood.position.set(0.6, 2.7, 0.9);
  flood.target.position.set(-1.5, 0.6, 4);
  scene.add(flood, flood.target);
  const sensorGlow = new THREE.PointLight(0xff2020, 0, 1.2, 2);
  sensorGlow.position.set(X.doorX + 0.75, PORCH_Y + 2.05, 0.2);
  scene.add(sensorGlow);

  type Light = "day" | "dusk";
  function setLight(l: Light, focus: V3) {
    const f = new THREE.Vector3(...focus);
    sun.target.position.copy(f);
    const s = sun.shadow.camera as THREE.OrthographicCamera;
    s.left = s.bottom = -9;
    s.right = s.top = 9;
    s.near = 1;
    s.far = 80;
    s.updateProjectionMatrix();
    if (l === "day") {
      sky.material.map = skyDay;
      (scene.fog as THREE.Fog).color.set(0xc9d6e2);
      hemi.color.set(0xc3d6f2);
      hemi.groundColor.set(0x6a5a3a);
      hemi.intensity = 1.05;
      sun.color.set(0xffeccc);
      sun.intensity = 2.6;
      sun.position.copy(f).addScaledVector(SUN_DIR, 40);
      yardLamp.intensity = porchL.intensity = flood.intensity = vaultFill.intensity = 0;
      X.porchLamps.forEach((m) => ((m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3));
    } else {
      sky.material.map = skyDusk;
      (scene.fog as THREE.Fog).color.set(0x4c5a92);
      hemi.color.set(0x5b6fb8);
      hemi.groundColor.set(0x2a2418);
      hemi.intensity = 0.75;
      sun.color.set(0x8fa6e6); // moon/sky key from behind-left
      sun.intensity = 0.55;
      sun.position.copy(f).add(new THREE.Vector3(10, 22, 18));
      yardLamp.intensity = 38;
      vaultFill.intensity = 30;
      porchL.intensity = 9;
      flood.intensity = 60;
      X.porchLamps.forEach((m) => ((m.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.6));
    }
    sky.material.needsUpdate = true;
  }

  // ---------- cast ----------
  const [phil, home, g1, g2] = await Promise.all([
    makePhil(staticFile),
    makeHomeowner(staticFile),
    makeExtra(staticFile, "#28324a", true),
    makeExtra(staticFile, "#28324a", true),
  ]);
  const cast: Rig[] = [phil, home, g1, g2];
  cast.forEach((r) => scene.add(r.root));
  // guard caps (placeholder wardrobe so the two guards read as uniformed and apart from the homeowner)
  for (const g of [g1, g2]) {
    const cap = new THREE.Group();
    const capM = new THREE.MeshStandardMaterial({ color: 0x1c2233, roughness: 0.8 });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    crown.scale.set(1, 0.75, 1.1);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 18, 1, false, -Math.PI / 2, Math.PI), capM);
    brim.position.set(0, 0, 0.06);
    brim.scale.set(1, 1, 0.9);
    cap.add(crown, brim);
    g.bone(B.head).add(cap);
    cap.position.set(0.1, 0.0, 0);
    cap.rotation.set(0, Math.PI / 2, -Math.PI / 2);
    cap.userData.isCap = true;
  }

  const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.03, 400);
  const place = (r: Rig, p: V3, ryDeg: number) => {
    r.root.visible = true;
    r.root.position.set(...p);
    r.root.rotation.set(0, THREE.MathUtils.degToRad(ryDeg), 0);
    r.update();
  };
  const D2R = THREE.MathUtils.degToRad;

  /** place the pole so its tip sits on `tip` and it passes through `through` */
  function aimPole(tip: V3, through: V3, len = 5.4) {
    X.pole.visible = true;
    X.pole.position.set(...tip);
    const dir = new THREE.Vector3(...through).sub(new THREE.Vector3(...tip)).normalize();
    X.pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    X.pole.scale.set(1, len / 4.6, 1);
  }

  /** pug: position on the ground plane, yaw, sit 0..1, head yaw/pitch (deg), blink 0..1 */
  let tagOn = false; // GREGORY tag only reads once he has switched sides (S10)
  function pug(p: V3, ry: number, sit = 0, headYaw = 0, headPitch = 0, blink = 0) {
    X.pug.visible = true;
    X.tag.visible = tagOn;
    X.pug.position.set(...p);
    X.pug.rotation.set(0, D2R(ry), 0);
    // sit = rotate the body about the hind feet
    const piv = new THREE.Vector3(0, 0.03, -0.13);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.62 * sit);
    X.pugBody.quaternion.copy(q);
    X.pugBody.position.copy(piv).sub(piv.clone().applyQuaternion(q));
    X.legs[0].rotation.x = X.legs[1].rotation.x = 0.62 * sit; // front legs stay vertical
    X.legs[2].rotation.x = X.legs[3].rotation.x = -1.0 * sit; // hind legs fold forward under the rump
    X.head.rotation.set(D2R(headPitch + 30 * sit), D2R(headYaw), 0);
    X.lids.forEach((l) => {
      l.visible = blink > 0.05;
      l.scale.set(1, 0.02 + 0.98 * blink, 0.8);
    });
  }

  function hideAll() {
    cast.forEach((r) => {
      r.reset();
      r.root.visible = false;
    });
    for (const o of [X.pug, X.tray, X.pole, X.fileTool, X.hammer, X.screwdriver, X.statement, X.car, X.bars, X.boards, X.frontBoards, X.fortress, X.steelDoor]) o.visible = false;
    X.doorPivot.visible = true;
    X.sash.position.y = 0;
    X.turnpiece.rotation.z = 0;
    X.garagePanels.forEach((g, i) => {
      g.position.copy(X.garageRest[i].p);
      g.rotation.copy(X.garageRest[i].r);
      g.visible = true;
    });
    X.debris.forEach((d) => (d.visible = false));
    X.barMeshes.forEach((b) => (b.rotation.set(0, 0, 0), (b.position.y = X.SW.sill + X.SW.h / 2)));
    (X.sensor.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    sensorGlow.intensity = 0;
  }

  /** state of the house through the escalation, by shot index */
  function houseState(n: number) {
    X.bars.visible = n >= 5 && n < 6; // bars only in S05 (boarded over from S06)
    X.boards.visible = X.frontBoards.visible = n >= 6;
    X.fortress.visible = n >= 13;
    X.steelDoor.visible = n >= 14 || n === 13;
    X.doorPivot.visible = !X.steelDoor.visible;
  }

  const sideWinWorld = (dy: number, dz: number): V3 => [-5.02, dy, -3 + dz];

  // ---------- shots ----------
  const shots: Record<string, (f: number) => { light: Light; focus: V3; cam: CamKey[] }> = {
    S03: (f) => {
      // deadbolt: two screwdriver taps, match cut (f 20) to the homeowner's thumb rotating the bolt to the stop
      houseState(3);
      const tp = X.turnpiece.getWorldPosition(new THREE.Vector3());
      place(home, [X.doorX + 0.85, PORCH_Y, 0.45], 230);
      stand(home);
      if (f < 20) {
        X.screwdriver.visible = true;
        X.screwdriver.position.set(tp.x + 0.02, tp.y - 0.04, tp.z + 0.09 + 0.02 * Math.abs(Math.sin(f * 0.6)));
        X.screwdriver.rotation.set(-Math.PI / 2, 0, 0);
        home.ik(B.rUp, B.rFore, B.rHand, new THREE.Vector3(tp.x + 0.03, tp.y - 0.05, tp.z + 0.17), home.w([0.4, 0.9, -0.3]));
      } else {
        X.turnpiece.rotation.z = -Math.PI / 2 * ramp(f, 24, 34);
        home.ik(B.rUp, B.rFore, B.rHand, new THREE.Vector3(tp.x + 0.02, tp.y - 0.06, tp.z + 0.1), home.w([0.4, 0.9, -0.3]));
      }
      const c: V3 = [tp.x - 0.3, tp.y + 0.1, tp.z + 0.68];
      return { light: "day", focus: [X.doorX, 1, 0.5], cam: f < 20
        ? [{ f: 0, pos: c, look: [tp.x - 0.03, tp.y - 0.02, tp.z], fov: 32 }, { f: 19, pos: [c[0] - 0.02, c[1], c[2] - 0.06], look: [tp.x - 0.03, tp.y - 0.02, tp.z], fov: 32 }]
        : [{ f: 20, pos: [tp.x - 0.22, tp.y + 0.1, tp.z + 0.62], look: [tp.x, tp.y - 0.03, tp.z], fov: 30 }, { f: 44, pos: [tp.x - 0.2, tp.y + 0.09, tp.z + 0.55], look: [tp.x, tp.y - 0.03, tp.z], fov: 30 }] };
    },
    S04: (f) => {
      // Phil climbs through the side window: palms on the sill, one knee through
      houseState(4);
      X.sash.position.y = X.SW.h / 2 - 0.03;
      const k = ramp(f, 8, 40);
      place(phil, [-5.62 + 0.18 * k, 0.12 * k, -3.0], 90);
      const a = phil.ankle;
      legs(phil, [0, -0.08 * k, 0.05 * k], [a.out, a.y - 0.12 * k, a.z], [a.out, a.y - 0.12 * k, a.z - 0.15]);
      kneeUp(phil, "L", lerp(0.5, 1.02, k) - 0.12 * k, 0.32 + 0.12 * k);
      phil.turn(B.spine, [1, 0, 0], 25 * k);
      phil.reach("L", [0.24, X.SW.sill + 0.02 - 0.12 * k, 0.42], [0.6, 0.9, 0.1]);
      phil.reach("R", [0.24, X.SW.sill + 0.02 - 0.12 * k, 0.42], [0.6, 0.9, 0.1]);
      look(phil, 0, 8);
      face(phil, { eyesDown: 0.2 });
      return { light: "day", focus: [-5, 1, -3], cam: [
        { f: 0, pos: [-6.1, 1.45, -1.05], look: [-5.35, 1.2, -3.0], fov: 50 },
        { f: 64, pos: [-5.85, 1.45, -1.45], look: [-5.3, 1.2, -3.0], fov: 48 },
      ] };
    },
    S05: (f) => {
      // bars insert -> Phil filing (3/4 profile) -> loose bar tilts away
      houseState(5);
      if (f < 18) {
        X.bars.visible = true;
        X.bars.position.y = 0.06 * (1 - ramp(f, 0, 12));
        return { light: "day", focus: [-5, 1, -3], cam: [{ f: 0, pos: [-6.6, 1.55, -2.1], look: [-5.12, 1.45, -3.0], fov: 40 }, { f: 17, pos: [-6.5, 1.53, -2.2], look: [-5.12, 1.45, -3.0], fov: 39 }] };
      }
      X.bars.position.y = 0;
      place(phil, [-5.7, 0, -2.9], 95);
      stand(phil);
      const s = Math.sin(f * 0.9) * 0.05;
      X.fileTool.visible = f < 52;
      const ft = new THREE.Vector3(...sideWinWorld(1.12, 0.0 + s));
      X.fileTool.position.copy(ft).add(new THREE.Vector3(-0.15, 0, 0));
      X.fileTool.rotation.set(0, 0, 0.3);
      phil.ik(B.rUp, B.rFore, B.rHand, ft.clone().add(new THREE.Vector3(-0.17, -0.02, 0.1)), phil.w([0.6, 0.8, -0.4]));
      phil.ik(B.lUp, B.lFore, B.lHand, new THREE.Vector3(-5.18, 1.3, -3.25), phil.w([0.6, 0.8, -0.4]));
      look(phil, 8, 14);
      face(phil, { eyesDown: 0.45, browDown: 0.1 });
      const loose = X.barMeshes[2];
      if (f >= 52) {
        const t = ramp(f, 52, 62);
        loose.rotation.x = 0.5 * t - 0.08 * Math.sin((f - 62) * 0.5) * (f > 62 ? Math.exp(-(f - 62) * 0.2) : 0);
        loose.position.y = X.SW.sill + X.SW.h / 2 - 0.06 * t;
        return { light: "day", focus: [-5, 1, -3], cam: [{ f: 52, pos: [-6.25, 1.4, -2.2], look: [-5.15, 1.4, -3.0], fov: 36 }, { f: 69, pos: [-6.2, 1.38, -2.25], look: [-5.15, 1.4, -3.0], fov: 35 }] };
      }
      return { light: "day", focus: [-5, 1, -3], cam: [{ f: 18, pos: [-5.32, 1.62, -1.75], look: [-5.72, 1.5, -2.9], fov: 40 }, { f: 51, pos: [-5.36, 1.6, -1.9], look: [-5.72, 1.5, -2.9], fov: 38 }] };
    },
    S06: (f) => {
      // two plank impacts in the window angle, then wide drift back to the boarded "Detroit" facade; small proud nod
      houseState(6);
      if (f < 30) {
        X.boards.visible = true;
        X.boardMeshes.forEach((b, i) => (b.visible = i < (f < 14 ? 2 : 3)));
        X.hammer.visible = true;
        const hit = f % 14 < 4 ? 0 : Math.min(1, (f % 14) / 8);
        X.hammer.position.set(-5.32, 1.35 + 0.12 * hit, -2.75);
        X.hammer.rotation.set(0, 0, -0.9 - 0.8 * hit);
        return { light: "day", focus: [-5, 1, -3], cam: [{ f: 0, pos: [-7.6, 1.3, -1.3], look: [-5.2, 1.3, -2.95], fov: 42 }, { f: 29, pos: [-7.5, 1.3, -1.5], look: [-5.2, 1.3, -2.95], fov: 41 }] };
      }
      X.boardMeshes.forEach((b) => (b.visible = true));
      place(home, [-3.4, 0, 4.2], 200);
      stand(home);
      X.hammer.visible = true;
      home.update();
      const h = home.pos(B.rHand);
      X.hammer.position.copy(h).add(new THREE.Vector3(0, -0.1, 0));
      X.hammer.rotation.set(0, 0, 0.2);
      const nod = Math.sin(ramp(f, 80, 100) * Math.PI) * 9;
      look(home, 10, nod);
      face(home, { press: 0.5, browUp: 0.15 });
      return { light: "day", focus: [-1, 1, 0], cam: [
        { f: 30, pos: [-6.4, 1.55, 6.2], look: [-1.8, 1.4, -0.2], fov: 54 },
        { f: 122, pos: [-7.3, 1.75, 8.6], look: [-1.4, 1.45, 0.0], fov: 54 },
      ] };
    },
    S07: (f) => {
      // Phil at the wheel (tight) -> 3/4 exterior, car lurches through the garage door at f 50 -> push on homeowner
      houseState(6);
      X.car.visible = true;
      const IMPACT = 50;
      const noseZ = (z: number) => z - 2.33;
      const carZ = f < 30 ? 7.0 : f < IMPACT ? lerp(5.4, X.GD.z + 2.33, ramp(f, 30, IMPACT) ** 1.4) : lerp(X.GD.z + 2.33, X.GD.z + 0.9, ramp(f, IMPACT, IMPACT + 18));
      X.car.position.set(X.GD.x, 0, carZ);
      X.car.rotation.set(f >= IMPACT && f < IMPACT + 6 ? -0.025 : 0, 0, 0);
      // Phil seated, hands at 10 and 2
      X.car.updateMatrixWorld(true);
      const seat = new THREE.Vector3(-0.38, 0.05, 0.36).applyMatrix4(X.car.matrixWorld);
      place(phil, [seat.x, seat.y, seat.z], 180);
      seated(phil, 0.52, 0.48);
      const w = X.wheel.getWorldPosition(new THREE.Vector3());
      phil.ik(B.lUp, B.lFore, B.lHand, w.clone().add(new THREE.Vector3(0.15, 0.04, 0)), phil.w([0.5, 0.6, -0.3]));
      phil.ik(B.rUp, B.rFore, B.rHand, w.clone().add(new THREE.Vector3(-0.15, 0.04, 0)), phil.w([-0.5, 0.6, -0.3]));
      face(phil, {});
      // garage door: panels buckle inward and scatter after contact
      if (f >= IMPACT) {
        const t = ramp(f, IMPACT, IMPACT + 14);
        X.garagePanels.forEach((g, i) => {
          const r = X.garageRest[i];
          const lower = i < 2;
          // lower panels fold in under the bumper; upper panels kick up and tumble back over the hood
          g.position.set(r.p.x + (i - 1.5) * 0.3 * t, r.p.y + (lower ? -0.12 * t : 0.55 * Math.sin(t * Math.PI * 0.8)), r.p.z - (lower ? 1.5 : 0.9) * t);
          g.rotation.set((lower ? -1.25 : 1.1) * t, (i % 2 ? 0.3 : -0.25) * t, (i - 1.5) * 0.18 * t);
        });
        X.debris.forEach((d, i) => {
          const a = (i / X.debris.length) * Math.PI * 2;
          const tt = (f - IMPACT) / 30;
          d.visible = tt < 1.2;
          d.position.set(X.GD.x + Math.cos(a) * 1.4 * tt, Math.max(0.03, 1.0 + Math.sin(a) * 0.6 * tt + 2.5 * tt - 4.9 * tt * tt), X.GD.z + 0.3 + 0.6 * tt);
          d.rotation.set(tt * 6 + i, tt * 3, i);
        });
      }
      // homeowner frozen well to the side
      place(home, [0.05, 0, 3.6], 100);
      stand(home);
      const shock = ramp(f, IMPACT - 2, IMPACT + 8);
      home.reach("L", [0.2, 0.95 + 0.42 * shock, 0.22], [0.6, 1.0, -0.4]);
      home.reach("R", [0.2, 0.95 + 0.42 * shock, 0.22], [0.6, 1.0, -0.4]);
      home.turn(B.spine1, [1, 0, 0], -6 * shock);
      look(home, 6, -4);
      face(home, { browUp: shock, wide: shock, jaw: 0.55 * ramp(f, 92, 104) });
      void noseZ;
      if (f < 30)
        return { light: "day", focus: [X.GD.x, 1, 6], cam: [
          { f: 0, pos: [seat.x - 1.35, seat.y + 1.15, seat.z - 0.55], look: [seat.x, seat.y + 1.1, seat.z - 0.1], fov: 34 },
          { f: 29, pos: [seat.x - 1.25, seat.y + 1.15, seat.z - 0.5], look: [seat.x, seat.y + 1.1, seat.z - 0.1], fov: 33 },
        ] };
      if (f < 90)
        return { light: "day", focus: [2, 1, 2], cam: [
          { f: 30, pos: [-2.0, 2.2, 8.9], look: [1.9, 0.9, 1.8], fov: 46 },
          { f: 89, pos: [-1.8, 2.15, 8.5], look: [1.8, 0.9, 1.8], fov: 46 },
        ] };
      const hh = home.pos(B.head);
      return { light: "day", focus: [0, 1, 3], cam: [
        { f: 90, pos: [hh.x + 1.6, hh.y - 0.05, hh.z + 0.9], look: [hh.x, hh.y, hh.z], fov: 36 },
        { f: 119, pos: [hh.x + 0.95, hh.y - 0.04, hh.z + 0.5], look: [hh.x, hh.y, hh.z], fov: 34 },
      ] };
    },
    S08: (f) => {
      // serious low-angle presentation of Gregory -> slide out to reveal a tiny pug before a very big doorway
      houseState(7);
      const p: V3 = [X.doorX, PORCH_Y, 0.62];
      pug(p, 0, 0, 0, 0, f >= 40 && f < 44 ? 1 : 0);
      return { light: "day", focus: [X.doorX, 1, 1], cam: [
        { f: 0, pos: [X.doorX + 0.08, PORCH_Y + 0.1, 1.55], look: [X.doorX, PORCH_Y + 0.4, 0.62], fov: 30 },
        { f: 20, pos: [X.doorX + 0.08, PORCH_Y + 0.1, 1.5], look: [X.doorX, PORCH_Y + 0.4, 0.62], fov: 30 },
        { f: 52, pos: [X.doorX + 0.35, PORCH_Y + 0.22, 4.1], look: [X.doorX, 1.25, 0.2], fov: 52 },
        { f: 74, pos: [X.doorX + 0.38, PORCH_Y + 0.22, 4.25], look: [X.doorX, 1.25, 0.2], fov: 52 },
      ] };
    },
    S09: (f) => {
      // Phil crouches in and sets the rotisserie tray on the step; Gregory tracks the chicken
      houseState(8);
      const k = ramp(f, 0, 30);
      place(phil, [X.doorX + 0.45, 0, 2.35], 195);
      crouch(phil, 0.42 * k);
      const trayTarget = new THREE.Vector3(X.doorX + 0.25, PORCH_Y / 2 + 0.005, 1.86);
      const hold = new THREE.Vector3(X.doorX + 0.35, 1.0, 2.15).lerp(trayTarget, ramp(f, 10, 34));
      X.tray.visible = true;
      X.tray.position.copy(hold);
      X.tray.rotation.set(0, D2R(15), 0);
      phil.ik(B.lUp, B.lFore, B.lHand, hold.clone().add(new THREE.Vector3(0.16, 0.03, 0)), phil.w([0.5, 0.9, -0.3]));
      phil.ik(B.rUp, B.rFore, B.rHand, hold.clone().add(new THREE.Vector3(-0.16, 0.03, 0)), phil.w([-0.5, 0.9, -0.3]));
      look(phil, 0, 10);
      const track = ramp(f, 20, 40);
      pug([X.doorX - 0.05, PORCH_Y, 0.95], 0, 0, 25 * track, 22 * track);
      if (f < 36)
        return { light: "day", focus: [X.doorX, 0.5, 1.6], cam: [
          { f: 0, pos: [X.doorX - 1.3, 0.42, 3.5], look: [X.doorX + 0.2, 0.55, 1.8], fov: 44 },
          { f: 35, pos: [X.doorX - 1.25, 0.4, 3.35], look: [X.doorX + 0.2, 0.5, 1.8], fov: 43 },
        ] };
      return { light: "day", focus: [X.doorX, 0.5, 1.6], cam: [
        { f: 36, pos: [X.doorX - 0.75, 0.34, 2.35], look: [X.doorX, PORCH_Y + 0.3, 1.1], fov: 42 },
        { f: 65, pos: [X.doorX - 0.7, 0.33, 2.25], look: [X.doorX, PORCH_Y + 0.3, 1.1], fov: 41 },
      ] };
    },
    S10: (f) => {
      // Gregory abandons the door, scoots a body-length to Phil and sits; tag reads; one small chin scratch
      houseState(8);
      place(phil, [X.doorX + 0.6, 0, 2.15], -12);
      crouch(phil, 0.42);
      X.tray.visible = true;
      X.tray.position.set(X.doorX + 0.25, PORCH_Y / 2 + 0.005, 1.86);
      const m = ramp(f, 0, 16);
      const sit = ramp(f, 14, 24);
      const pp: V3 = [lerp(X.doorX - 0.05, X.doorX + 0.18, m), lerp(PORCH_Y, 0, ramp(f, 4, 12)), lerp(0.95, 2.4, m)];
      pug(pp, lerp(0, 10, m), sit, -6, -10);
      // chin scratch from f 30
      X.pug.updateMatrixWorld(true);
      const chin = new THREE.Vector3(0, 0.33, 0.24).applyMatrix4(X.pugBody.matrixWorld);
      const scratch = f >= 30 ? 0.012 * Math.sin((f - 30) * 1.3) : 0;
      if (f >= 26) phil.ik(B.rUp, B.rFore, B.rHand, chin.clone().add(new THREE.Vector3(0.05 + scratch, -0.03, 0.02)), phil.w(phil.mx("R", [0.7, 0.6, 0.1])));
      phil.ik(B.lUp, B.lFore, B.lHand, phil.w(phil.mx("L", [0.2, 0.55, 0.36])), phil.w(phil.mx("L", [0.6, 0.8, 0.2])));
      look(phil, 25, 10);
      face(phil, { eyesDown: 0.3, eyesR: 0.2 });
      return { light: "day", focus: [X.doorX, 0.5, 2], cam: [
        { f: 0, pos: [X.doorX + 0.1, 0.62, 4.6], look: [X.doorX + 0.45, 0.62, 2.2], fov: 42 },
        { f: 53, pos: [X.doorX + 0.18, 0.55, 4.25], look: [X.doorX + 0.42, 0.55, 2.2], fov: 40 },
      ] };
    },
    S11: (f) => {
      // near-ground yard angle: tilt from the homeowner's shoe at the wall base up to the top edge against the sky
      houseState(10);
      place(home, [-4.55, 0, -9.0], 150);
      stand(home);
      look(home, -15, -10 * ramp(f, 20, 50));
      face(home, { press: 0.5, browDown: 0.2 });
      return { light: "day", focus: [-5, 1.5, -10], cam: [
        { f: 0, pos: [-3.7, 0.18, -7.7], look: [-4.55, 0.1, -9.0], fov: 50 },
        { f: 30, pos: [-3.7, 0.2, -7.7], look: [-4.7, 1.6, -9.4], fov: 54 },
        { f: 62, pos: [-3.65, 0.22, -7.65], look: [-5.3, WALL_H + 0.6, -11.0], fov: 56 },
      ] };
    },
    S12: (f) => {
      // pole vault: approach + plant (0-30), rising silhouette / apex (30-55), landing inside (55-75), push on face
      houseState(10);
      const plant: V3 = [-3.05, 0, -12.55];
      const ryRun = -35, ryApex = -150;
      const t = ramp(f, 26, 66);
      const arc = Math.sin(t * Math.PI);
      const start: V3 = [0.2, 0, -16.2];
      const land: V3 = [-6.3, 0, -9.4];
      let root: V3;
      if (f < 26) {
        const k = f / 26;
        root = [lerp(start[0], plant[0] + 0.55, k), 0, lerp(start[2], plant[2] - 0.95, k)];
        place(phil, root, ryRun);
        walk(phil, (f / 13) % 1, 1.05, false);
        phil.turn(B.spine, [1, 0, 0], 10);
      } else {
        root = [lerp(plant[0] + 0.55, land[0], t), Math.max(0, arc * 3.9 - (t > 0.5 ? 0 : 0)), lerp(plant[2] - 0.95, land[2], t)];
        place(phil, root, lerp(ryRun, ryApex, ramp(t, 0.08, 0.45)));
        if (t < 0.92) {
          const a = phil.ankle;
          legs(phil, [0, -0.05, 0], [a.out, a.y + 0.05, a.z - 0.05], [a.out, a.y - 0.05, a.z + 0.05]);
          kneeUp(phil, "L", 1.0, 0.38);
        } else stand(phil);
      }
      // hands keyed to the pole through takeoff, released after clearance
      const holdHands = f >= 18 && t < 0.62;
      if (holdHands || f < 26) {
        phil.update();
        const grip = phil.w([0.02, 1.3, 0.24]);
        if (f < 26) aimPole([root[0] + 0.3, 0.55, root[2] + 2.4], [root[0] + 0.1, 1.15, root[2] + 0.1], 4.9); // carried, tip low and forward
        else aimPole(plant, [grip.x, grip.y, grip.z], grip.distanceTo(new THREE.Vector3(...plant)) + 0.75);
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(X.pole.quaternion);
        const base = X.pole.position.clone();
        const len = 4.6 * X.pole.scale.y;
        const gripAt = f < 26 ? 0.55 : (len - 0.75) / len;
        const hi = base.clone().addScaledVector(dir, len * (gripAt + 0.05)), lo = base.clone().addScaledVector(dir, len * (gripAt - 0.06));
        phil.ik(B.rUp, B.rFore, B.rHand, hi, phil.w([-0.6, 1.4, -0.4]));
        phil.ik(B.lUp, B.lFore, B.lHand, lo, phil.w([0.6, 1.0, -0.2]));
      } else {
        // pole released: it falls back outside the wall
        const fall = ramp(f, 46, 60);
        aimPole(plant, [plant[0] + 0.5, 4 * (1 - fall) + 0.1, plant[2] - 4 * fall], 5.4);
        stand(phil);
      }
      look(phil, 0, 4);
      face(phil, {});
      if (f < 70)
        return { light: "dusk", focus: [-4, 2, -11.5], cam: [
          { f: 0, pos: [-0.2, 1.6, -22.0], look: [-0.6, 1.5, -15.0], fov: 46 },
          { f: 30, pos: [-2.4, 2.3, -20.8], look: [-3.4, 2.9, -12.0], fov: 42 },
          { f: 50, pos: [-3.5, 2.4, -20.4], look: [-4.4, 3.25, -11.4], fov: 42 },
          { f: 69, pos: [-4.2, 2.4, -20.2], look: [-5.2, 2.9, -11.0], fov: 42 },
        ] };
      const hp = phil.pos(B.head);
      return { light: "dusk", focus: [-6, 1, -9.5], cam: [
        { f: 70, pos: [hp.x + 0.3, hp.y + 0.02, hp.z - 1.35], look: [hp.x, hp.y - 0.05, hp.z], fov: 38 },
        { f: 89, pos: [hp.x + 0.2, hp.y + 0.01, hp.z - 0.95], look: [hp.x, hp.y - 0.05, hp.z], fov: 36 },
      ] };
    },
    S13: (f) => {
      // life savings: account insert, then push along the house as the upgrades go up; end on the lit entrance
      houseState(13);
      if (f < 26) {
        X.statement.visible = true;
        X.statement.position.set(X.doorX, 1.2, 3.0);
        X.statement.rotation.set(-0.25, 0, 0.04);
        return { light: "dusk", focus: [X.doorX, 1, 2], cam: [{ f: 0, pos: [X.doorX + 0.04, 1.45, 3.75], look: [X.doorX, 1.18, 3.0], fov: 36 }, { f: 25, pos: [X.doorX + 0.03, 1.43, 3.65], look: [X.doorX, 1.18, 3.0], fov: 35 }] };
      }
      // upgrades "go up": floods/cameras/wire rise into place
      const up = ramp(f, 26, 70);
      X.fortress.position.y = -0.4 * (1 - up);
      return { light: "dusk", focus: [0, 1, 0], cam: [
        { f: 26, pos: [7.5, 1.6, 9.5], look: [2.0, 1.4, 0.0], fov: 52 },
        { f: 99, pos: [1.2, 1.4, 9.0], look: [X.doorX, 1.3, 0.0], fov: 46 },
      ] };
    },
    S14: (f) => {
      // three ~23-frame inserts: steel door seats / red sensor pips on / two bored guards settle into their post
      houseState(14);
      X.fortress.position.y = 0;
      if (f < 23) {
        const seat = 1 - ramp(f, 0, 9);
        X.steelDoor.position.z = 0.08 + 0.25 * seat;
        return { light: "dusk", focus: [X.doorX, 1, 1], cam: [{ f: 0, pos: [X.doorX + 1.3, 1.1, 2.3], look: [X.doorX, 1.2, 0.1], fov: 42 }, { f: 22, pos: [X.doorX + 1.25, 1.1, 2.2], look: [X.doorX, 1.2, 0.1], fov: 41 }] };
      }
      X.steelDoor.position.z = 0.08;
      const on = f >= 30 ? 1 : 0;
      (X.sensor.material as THREE.MeshStandardMaterial).emissiveIntensity = 4 * on;
      sensorGlow.intensity = 0.06 * on;
      if (f < 46) {
        const s = X.sensor.getWorldPosition(new THREE.Vector3());
        return { light: "dusk", focus: [X.doorX, 2, 0.5], cam: [{ f: 23, pos: [s.x - 0.12, s.y - 0.05, s.z + 0.42], look: [s.x, s.y, s.z], fov: 30 }, { f: 45, pos: [s.x - 0.1, s.y - 0.05, s.z + 0.36], look: [s.x, s.y, s.z], fov: 30 }] };
      }
      const settle = ramp(f, 48, 58);
      place(g1, [-3.42, 0, 1.95], 12);
      place(g2, [-2.8, 0, 2.0], -10);
      for (const g of [g1, g2]) {
        const a = g.ankle;
        legs(g, [0, -0.02 * settle, 0], [a.out + 0.06, a.y, a.z], [a.out + 0.06, a.y, a.z]);
        g.reach("L", [0.12, 0.98, 0.14], [0.5, 1.0, -0.3]);
        g.reach("R", [0.12, 0.98, 0.14], [0.5, 1.0, -0.3]);
        face(g, { blink: 0.35, press: 0.3 });
      }
      look(g1, 12, 0);
      look(g2, -10, 0);
      return { light: "dusk", focus: [-3.1, 1, 2.0], cam: [{ f: 46, pos: [-3.1, 1.62, 4.7], look: [-3.12, 1.5, 2.0], fov: 36 }, { f: 68, pos: [-3.1, 1.6, 4.45], look: [-3.12, 1.5, 2.0], fov: 35 }] };
    },
  };

  function pose(id: string, f: number, aspect: number) {
    hideAll();
    tagOn = id === "S10" && f >= 18;
    const s = (shots[id] ?? shots.S14)(f);
    setLight(s.light, s.focus);
    applyCam(camera, s.cam, f, aspect);
    // keep the sky centred on the camera so it never parallaxes
    sky.position.copy(camera.position);
    scene.updateMatrixWorld(true);
    return { scene, camera };
  }
  return { pose };
}
