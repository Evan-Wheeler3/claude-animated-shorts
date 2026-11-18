import * as THREE from "three";
import { bodyFront, INK, Pen, type Expr, type Outfit } from "../../../templates/bridge/toon";
import { cardShade } from "../../../templates/bridge/cardshade";
import { NOINK } from "../../../templates/bridge/ink";

type Role = "miner" | "brannan" | "red-cap" | "wide-hat" | "blue-cap";
type HandShape = "grip" | "pinch" | "open" | "index";
type HandSide = "left" | "right";
type Pose = { expression?: Expr; facing?: -1 | 0 | 1; crouch?: boolean; look?: number; blink?: boolean; headTilt?: number };
const outfits: Record<Role, Outfit> = {
  miner: { jacket: "#ba7444", pants: "#65626a", boots: "#5c4035", skin: "#efb98e", hair: "#553d33", hat: "hair", head: 11 },
  brannan: { jacket: "#283f4a", pants: "#45454e", boots: "#292432", skin: "#ffdbb3", moustache: "#48352f",
    hat: "hair", hair: "#524237", build: "stout", buttons: "#c4a16e", head: 21 },
  "red-cap": { jacket: "#ad6656", pants: "#65544d", boots: "#49362d", skin: "#ce9168",
    hat: "cap", cap: "#985041", moustache: "#4d372e", head: 32 },
  "wide-hat": { jacket: "#787448", pants: "#604f47", boots: "#503a30", skin: "#dc9c74",
    hat: "hair", hair: "#4c3a34", build: "stout", head: 42 },
  "blue-cap": { jacket: "#587881", pants: "#625e6b", boots: "#503832", skin: "#9f6c53",
    hat: "cap", cap: "#597784", head: 53 },
};
const isHero = (role: Role) => role === "miner" || role === "brannan";
const SCALE = .00225;
const SOLE = 979;

function canvasCard(width: number, height: number, metersWidth: number, metersHeight: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: .36, side: THREE.DoubleSide });
  cardShade(material);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(metersWidth, metersHeight), material);
  mesh.layers.set(NOINK);
  mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: .36, side: THREE.DoubleSide,
  });
  return { mesh, texture, ctx, pen: new Pen(ctx) };
}

function brim(p: Pen, crown: number, wide: boolean) {
  const y = crown + 56;
  const w = wide ? 153 : 133;
  p.poly([[300-w,y-9],[186,y+7],[235,y+12],[344,y+5],[404,y+13],[300+w,y-8],
    [398,y-19],[341,y-24],[231,y-24],[201,y-17]], "#855937", 11);
  p.poly([[211,y-17],[227,y-74],[252,y-82],[286,y-74],[330,y-85],[373,y-70],[391,y-19],[355,y-10],[257,y-9]],
    "#b28752", 10);
  p.band([[221,y-27],[268,y-19],[347,y-20],[382,y-28]], "#65453c", 12, 3);
  p.stroke([[239,y-57],[256,y-66],[288,y-60]], 5, "#d9ac72");
}

export function makeCharacter(role: Role) {
  const outfit = outfits[role];
  const root = new THREE.Group();
  root.name = role;
  const body = canvasCard(600, 1000, 600 * SCALE, 1000 * SCALE);
  body.mesh.position.y = (SOLE - 500) * SCALE;
  root.add(body.mesh);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.24, 30), new THREE.MeshBasicMaterial({
    color: "#49372e", transparent: true, opacity: .23, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = .52;
  shadow.position.y = .005;
  shadow.layers.set(NOINK);
  root.add(shadow);

  const limbs = Object.fromEntries((["left", "right"] as const).map(side => {
    const arm = canvasCard(300, 90, .78, .234);
    const hand = canvasCard(100, 100, .123, .123);
    root.add(arm.mesh, hand.mesh);
    arm.mesh.visible = hand.mesh.visible = false;
    return [side, { arm, hand }];
  })) as Record<HandSide, { arm: ReturnType<typeof canvasCard>; hand: ReturnType<typeof canvasCard> }>;
  let shoulderY = 1.2;

  function setPose(pose: Pose = {}) {
    body.ctx.clearRect(0, 0, 600, 1000);
    bodyFront(body.pen, outfit, {
      mode: pose.crouch ? "crouch" : "stand", expr: pose.expression,
      facing: pose.facing, seed: outfit.head, look: pose.look, blink: pose.blink, headTilt: pose.headTilt,
      externalArms: isHero(role),
      headwear: role === "miner" || role === "wide-hat" ? (p, crown) => brim(p, crown, role === "wide-hat") : undefined,
      costume: (p, { chin, torsoBottom, sole }) => {
        shoulderY = (SOLE - chin - 25) * SCALE;
        if (role === "brannan") {
          p.poly([[257,chin-7],[300,chin+65],[345,chin-7],[330,chin-30],[270,chin-30]], "#f7e9cb", 6);
          p.poly([[278,chin+17],[301,chin+26],[320,chin+15],[320,chin+40],[301,chin+32],[280,chin+43]], "#813e36", 4);
          p.stroke([[323,torsoBottom-55],[349,torsoBottom-61]], 5, "#bfa165");
        }
        if (role === "miner") {
          p.poly([[240,chin+21],[310,chin+25],[364,chin+12],[346,chin+53],[270,chin+55]], "#825347", 6);
          p.poly([[290,chin+43],[312,chin+45],[292,chin+87],[271,chin+64]], "#9b5b4e", 5);
          p.poly([[237,torsoBottom-55],[248,torsoBottom-65],[256,torsoBottom-42],[275,torsoBottom-30],[255,torsoBottom-17],[233,torsoBottom-35]], "#745345", 2);
          p.poly([[342,torsoBottom-127],[353,torsoBottom-121],[358,torsoBottom-109],[345,torsoBottom-102],[333,torsoBottom-112]],
            "#885d49", 0);
          for (const [x, dy, r] of [[252,25,5],[276,46,4],[343,60,4],[359,26,5],[341,29,6]]) {
            p.dot(x, sole - dy, r, "#906743");
          }
        }
      },
    });
    body.texture.needsUpdate = true;
    if (isHero(role)) {
      for (const side of ["left", "right"] as const) {
        const x = side === "left" ? -.22 : .22;
        aimHand(side, root.localToWorld(new THREE.Vector3(x * 1.35, shoulderY - .43, .015)), "open");
      }
    }
  }

  function aimHand(side: HandSide, target: THREE.Vector3 | THREE.Object3D, shape: HandShape, angle = 0) {
    const { arm, hand } = limbs[side];
    const world = target instanceof THREE.Object3D ? target.getWorldPosition(new THREE.Vector3()) : target.clone();
    const local = root.worldToLocal(world);
    const shoulder = new THREE.Vector3(side === "left" ? -.15 : .15, shoulderY, .006);
    const vector = local.clone().sub(shoulder);
    const length = Math.max(vector.length(), .06);
    const section = new THREE.Vector3(1, 0, 0);
    // The wrist meets the grip in world space. The plane twists toward the character's forward axis.
    const axisX = vector.clone().normalize();
    if (axisX.lengthSq() < .001) axisX.copy(section);
    const forward = new THREE.Vector3(0, 0, 1);
    const axisY = forward.clone().cross(axisX);
    if (axisY.lengthSq() < .001) axisY.set(0, 1, 0);
    axisY.normalize();
    const axisZ = axisX.clone().cross(axisY);
    const reverse = local.x < shoulder.x;
    arm.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axisX, axisY, axisZ));
    arm.mesh.position.copy(shoulder).lerp(local, .5);
    arm.mesh.scale.x = length / (.78 * 276 / 300);
    arm.ctx.clearRect(0, 0, 300, 90);
    const bow = reverse ? 67 : 23;
    arm.pen.ol = 2;
    arm.pen.line([[12,45],[113,bow],[195,(bow+45)/2],[288,45]], outfit.skin!, 13);
    const shirt = role === "brannan" ? "#f1dfc2" : outfit.jacket;
    arm.pen.line([[12,45],[113,bow],[174,bow+(45-bow)*.7]], shirt, 21);
    arm.pen.stroke([[173,bow+(45-bow)*.7-8],[178,bow+(45-bow)*.7+8]], 4, INK);
    arm.texture.needsUpdate = true;
    hand.mesh.position.copy(local);
    if (shape === "pinch") {
      hand.mesh.position.x -= Math.cos(angle) * .024;
      hand.mesh.position.y -= Math.sin(angle) * .024;
    }
    if (shape === "index") {
      hand.mesh.position.x -= Math.sin(angle) * .025;
      hand.mesh.position.y += Math.cos(angle) * .025;
    }
    hand.mesh.position.z += .009;
    hand.mesh.rotation.z = angle;
    hand.ctx.clearRect(0, 0, 100, 100);
    const p = hand.pen;
    const skin = outfit.skin!;
    p.ol = 5;
    if (shape === "pinch") {
      p.poly([[20,37],[36,28],[58,30],[65,39],[55,46],[43,45],[41,52],[55,56],[60,64],[53,71],[38,64],[24,63],[17,51]], skin, 6);
    } else if (shape === "index") {
      p.poly([[22,39],[32,29],[54,31],[61,38],[67,55],[62,72],[54,72],[50,56],[36,57],[23,53]], skin, 6);
    } else {
      p.ell(50, 50, shape === "grip" ? 26 : 29, 20, skin, 6, 0, 360, -.2);
      p.stroke([[43,44],[52,49],[64,47]], 5);
    }
    hand.texture.needsUpdate = true;
    arm.mesh.visible = hand.mesh.visible = true;
  }

  function faceCamera(camera: THREE.Camera) {
    const origin = root.getWorldPosition(new THREE.Vector3());
    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    root.rotation.y = Math.atan2(cameraPosition.x - origin.x, cameraPosition.z - origin.z);
    root.updateMatrixWorld(true);
  }

  setPose();
  return { root, setPose, faceCamera, aimHand };
}
