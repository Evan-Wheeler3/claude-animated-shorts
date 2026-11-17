// Public asset entry points. All units are metres; Three.js 0.169 and Y-up.
import * as THREE from 'three';
export {createToilet,createCompartment,createSubmarine,createSection} from './submarine.js';
export {createControlRoom,createBatteryRoom,createFish,createBubbles,createOceanCrests,createAircraft,createRaft,createGasCue,createLever,createWarningLamp} from './support.js';
export {createWaterSurface} from './water.js';
export {createAnimatedBlast,createCutawayFlow} from './proofs.js';
/** World-space point at a wheel's left/right rim after parent transformations and rotation. */
export function valveGripPoint(room,number,side=1){
 const wheel=room.getObjectByName(`valve-wheel-${number}`);
 if(!wheel)throw new Error(`Unknown valve-wheel-${number}`);
 room.updateWorldMatrix(true,true);const r=wheel.userData.rimRadius;
 if(!(r>0))throw new Error('Valve wheel is missing rim radius');
 return wheel.localToWorld(new THREE.Vector3(Math.sign(side||1)*r,0,.04));
}
/** Rotate only the named valve about its authored shaft; radians. */
export function setValveAngle(room,number,radians){const wheel=room.getObjectByName(`valve-wheel-${number}`);if(!wheel)throw new Error(`Unknown valve-wheel-${number}`);wheel.rotation.z=radians;}
/** Open or close the compartment door about its Y-axis hinge; radians. */
export function setHatchAngle(room,radians){const hinge=room.getObjectByName('hatch-hinge');if(!hinge)throw new Error('Missing hatch-hinge');hinge.rotation.y=radians;}
