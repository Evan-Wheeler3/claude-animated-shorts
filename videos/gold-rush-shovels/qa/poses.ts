import * as THREE from "three";
import { rng } from "../../../templates/bridge/paint";
import { NOINK } from "../../../templates/bridge/ink";
import { makeCharacter } from "../assets/cast";
import { COUNTER_TOP, makeCreek, makePebble, makeShop } from "../assets/sets";
import { DRAWER_TRAVEL, makeNugget, makePan, makeShovel, matte, NUGGET_HEIGHT, PAN_FLOOR, SHOVEL_BREAK, SHOVEL_REST } from "../assets/props";

export const proofs = ["opening-slap", "pan-close-up", "nugget-in-gravel", "counter-trade",
  "shovel-before", "shovel-broken", "drawer-release", "drawer-landed", "creek-cast", "shop-overview"] as const;

const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function gravelInPan(pan: ReturnType<typeof makePan>) {
  const random = rng(606);
  const gravel = ["#74675c", "#9c8a74", "#566064", "#786f62", "#bbc0b0"].map(color =>
    new THREE.MeshPhongMaterial({ color, shininess: 55, specular: "#676c65" }));
  for (let i = 0; i < 34; i++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * .118;
    const x = Math.cos(angle) * distance, z = Math.sin(angle) * distance;
    if (Math.hypot(x - .035, z - .046) < .041) continue;
    const pebble = makePebble(.008 + random() * .015, gravel[i % gravel.length], 1.15);
    pebble.rotation.y = random() * 6;
    pebble.position.set(x, PAN_FLOOR + .002, z);
    pan.root.add(pebble);
  }
  const pool = new THREE.Shape();
  pool.moveTo(-.132, .025);
  pool.bezierCurveTo(-.147, -.07, -.055, -.129, .024, -.127);
  pool.bezierCurveTo(.119, -.129, .123, -.091, .125, -.027);
  pool.bezierCurveTo(.117, .024, .075, .021, .064, .055);
  pool.bezierCurveTo(.018, .139, -.112, .109, -.132, .025);
  const film = new THREE.Mesh(new THREE.ShapeGeometry(pool), new THREE.MeshPhongMaterial({
    color: "#75b6bd", transparent: true, opacity: .23, side: THREE.DoubleSide,
    depthWrite: false, shininess: 90, specular: "#c9f2ed",
  }));
  film.rotation.x = -Math.PI / 2;
  film.position.y = PAN_FLOOR + .005;
  film.layers.set(NOINK);
  pan.root.add(film);
  for (const [x,z,scale] of [[-.08,.09,.038], [-.09,.05,.024], [.077,-.045,.031]]) {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(scale, .0009, 5, 20, 1.75),
      new THREE.MeshBasicMaterial({ color: "#b5cecb", transparent: true, opacity: .60 }));
    ripple.rotation.x = -Math.PI / 2;
    ripple.rotation.z = z * 8;
    ripple.position.set(x, PAN_FLOOR + .006, z);
    ripple.layers.set(NOINK);
    pan.root.add(ripple);
  }
}

export function makeProof(frame: number, camera: THREE.PerspectiveCamera) {
  const key = proofs[frame];
  const shopShot = ["opening-slap", "counter-trade", "drawer-release", "drawer-landed", "shop-overview"].includes(key);
  const root = new THREE.Group();
  const focus = new THREE.Vector3();
  const cameraAt = (position: number[], look: number[], fov: number) => {
    camera.position.set(position[0], position[1], position[2]);
    focus.set(look[0], look[1], look[2]);
    camera.fov = fov;
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };
  const miner = makeCharacter("miner");
  const nugget = makeNugget();
  root.add(miner.root);
  let cInf = 8;

  if (shopShot) {
    const shop = makeShop();
    const brannan = makeCharacter("brannan");
    const fresh = makeShovel();
    const worn = makeShovel(true);
    root.add(shop.root, brannan.root, fresh.root);
    miner.root.position.set(-.49, 0, -.34);
    brannan.root.position.set(.56, 0, -.34);
    const slap = key === "opening-slap";
    fresh.root.position.set(slap ? -.64 : -.56, COUNTER_TOP + SHOVEL_REST, .199);
    fresh.root.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    fresh.root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(point(0,1,0), -Math.PI / 2));
    check(Math.abs(fresh.rest.getWorldPosition(point(0,0,0)).y - COUNTER_TOP) < .00001, "Counter rest socket");
    if (slap || key === "counter-trade") {
      if (slap) cameraAt([-.60,1.79,2.20],[-.26,1.44,.02], 49);
      else cameraAt([.055,1.99,2.57],[.005,1.42,-.07], 52);
      cInf = 6;
      if (!slap) {
        root.add(worn.root, nugget.root);
        worn.setBroken(true);
        worn.lower.visible = false;
        worn.root.position.set(-.79, 1.18, -.04);
        worn.root.rotation.z = .44;
        worn.upper.position.y = 0;
        nugget.root.position.set(-.14, COUNTER_TOP, .065);
        nugget.root.rotation.y = -.42;
      }
    } else if (key === "shop-overview") {
      cameraAt([1.1,2.22,4.35],[-.20,1.28,-.69], 58);
      for (const [index, role] of (["red-cap", "blue-cap", "wide-hat"] as const).entries()) {
        const extra = makeCharacter(role);
        root.add(extra.root);
        extra.root.position.set(-1.37 - index * .23, 0, -1.34 - index * .67);
        extra.root.scale.setScalar(.86 + index * .035);
        extra.faceCamera(camera);
        extra.setPose({ facing: 1, expression: index === 0 ? "nervous" : "neutral" });
      }
    } else {
      miner.root.visible = fresh.root.visible = false;
      shop.drawer.setOpen(2);
      check(Math.abs(shop.drawer.tray.position.z - DRAWER_TRAVEL) < .00001, "Drawer travel clamps");
      const landed = key === "drawer-landed";
      const landing = shop.drawer.landing.getWorldPosition(point(0,0,0));
      shop.drawer.tray.add(nugget.root);
      nugget.root.position.copy(shop.drawer.landing.position);
      nugget.root.position.y += landed ? 0 : .16;
      nugget.root.rotation.y = -.42;
      const inside = new THREE.Box3().setFromObject(nugget.root);
      check(inside.min.x > landing.x - .22 && inside.max.x < landing.x + .14 &&
        inside.min.z > landing.z - .27 && inside.max.z < landing.z + .06, "Nugget clears drawer walls");
      if (landed) check(Math.abs(inside.min.y - landing.y) < .00001, "Nugget rests on drawer floor");
      brannan.root.position.set(1.20, 0, .45);
      cameraAt([1.10,1.48,1.56],[.75,.92,.48], 41);
      cInf = 5;
    }
    miner.faceCamera(camera);
    brannan.faceCamera(camera);
    miner.setPose({ facing: 1, expression: slap ? "shock" : "nervous", look: 1, headTilt: slap ? -7 : 4 });
    brannan.setPose({ facing: -1, expression: "stern", look: -1 });
    if (slap) {
      brannan.aimHand("left", fresh.lowerGrip, "grip", -.32);
      miner.aimHand("left", point(-.74, 1.20, -.12), "open", .3);
    } else if (key === "counter-trade") {
      miner.aimHand("left", worn.upperGrip, "grip", -.30);
      miner.aimHand("right", nugget.pinch, "pinch", .06);
      brannan.aimHand("right", fresh.upperGrip, "grip", -.15);
      brannan.aimHand("left", point(-.275, COUNTER_TOP + .053, .19), "index", -.60);
    } else if (key === "drawer-release" || key === "drawer-landed") {
      if (key === "drawer-release") brannan.aimHand("left", nugget.pinch, "pinch", -.73);
      else brannan.aimHand("left", shop.drawer.grip, "grip");
    }
  } else {
    const creek = makeCreek();
    root.add(creek.root);
    miner.root.position.set(-.16, 0, .40);
    if (key === "pan-close-up" || key === "nugget-in-gravel") {
      const macro = key === "nugget-in-gravel";
      const pan = makePan();
      pan.root.position.set(.01, .68, .63);
      pan.root.rotation.x = macro ? .45 : .72;
      root.add(pan.root);
      gravelInPan(pan);
      pan.root.add(nugget.root);
      nugget.root.position.set(.035, PAN_FLOOR, .046);
      nugget.root.rotation.y = -.42;
      check(nugget.root.position.length() < .14 && NUGGET_HEIGHT < .077, "Nugget fits pan");
      if (macro) {
        cameraAt([.11,1.05,.983],[.02,.721,.66], 58);
        cInf = 7;
      } else {
        cameraAt([.18,1.14,1.71],[.005,.96,.62], 53);
        cInf = 7;
      }
      miner.faceCamera(camera);
      miner.setPose({ crouch: true, facing: 1, expression: "grin", look: 1 });
      miner.aimHand("left", pan.left, "grip", .55);
      miner.aimHand("right", pan.right, "grip", -.55);
    } else if (key === "creek-cast") {
      cameraAt([.35,1.4,4.6],[-.09,1,-.49], 51);
      const crowd = [
        ["wide-hat", -1.46, .12], ["blue-cap", .95, -.21], ["red-cap", -2.0, -.29],
      ] as const;
      for (const [index, [role, x, z]] of crowd.entries()) {
        const extra = makeCharacter(role);
        extra.root.position.set(x, 0, z);
        extra.root.scale.setScalar([.98, .91, .99][index]);
        root.add(extra.root);
        extra.faceCamera(camera);
        extra.setPose({ facing: x < 0 ? 1 : -1, expression: index === 1 ? "grin" : "stern" });
      }
      miner.faceCamera(camera);
      miner.setPose({ expression: "shock", facing: -1 });
      const worn = makeShovel(true);
      root.add(worn.root);
      worn.root.position.set(.31, 0, .50);
      worn.root.rotation.z = .15;
      miner.aimHand("right", worn.lowerGrip, "grip");
    } else {
      cameraAt([.24,1.03,2.76],[-.02,.83,.34], 51);
      const worn = makeShovel(true);
      const broken = key === "shovel-broken";
      root.add(worn.root);
      worn.root.position.set(.24, 0, .61);
      worn.setBroken(broken);
      if (broken) {
        worn.upper.position.set(-.10, SHOVEL_BREAK + .27, .009);
        worn.upper.rotation.z = .93;
      }
      check(worn.edge.getWorldPosition(point(0,0,0)).y === 0, "Blade stays planted");
      check(Math.abs(worn.upper.position.y - SHOVEL_BREAK - (broken ? .27 : 0)) < .00001, "Split at defined shaft pivot");
      miner.faceCamera(camera);
      miner.setPose({ facing: 1, expression: broken ? "shock" : "stern", look: 1, headTilt: broken ? -7 : 10 });
      miner.aimHand("right", worn.lowerGrip, "grip", worn.upper.rotation.z);
    }
  }
  return { root, focus, cInf, shopShot };
}
