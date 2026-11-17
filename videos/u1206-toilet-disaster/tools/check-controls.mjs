import assert from 'node:assert/strict';
import {createCompartment} from '../assets/submarine.js';
import {createWaterSurface} from '../assets/water.js';
import {createLever,createRaft} from '../assets/support.js';
const room=createCompartment();for(let i=1;i<=4;i++){const wheel=room.getObjectByName(`valve-wheel-${i}`);assert.ok(wheel,`missing wheel ${i}`);assert.equal(wheel.userData.axis,'Z')}
assert.ok(room.getObjectByName('seat-hinge'));assert.ok(room.getObjectByName('hatch-hinge'));assert.equal(room.getObjectByName('hatch-hinge').userData.axis,'Y');assert.ok(room.getObjectByName('removable-back-wall'));assert.ok(room.getObjectByName('removable-side-wall'));assert.ok(room.getObjectByName('gauge-needle-pivot'));
assert.equal(createLever().name,'lever-pivot');assert.equal(createRaft().userData.pivot,'waterline centre');
const water=createWaterSurface({width:3,depth:3,segments:8});const arr=()=>Array.from(water.mesh.geometry.attributes.position.array);water.update(.2);const a=arr();water.update(.8);assert.notDeepEqual(arr(),a,'water should move');water.update(.2);assert.deepEqual(arr(),a,'water must be deterministic for out-of-order rendering');
console.log('PASS: independent named controls and deterministic water');
const {createCutawayFlow,createAnimatedBlast}=await import('../assets/proofs.js');
for(const create of [createCutawayFlow,createAnimatedBlast]){const item=create();item.update(1);const pose=()=>item.group.children.map(o=>[...o.position.toArray(),...o.scale.toArray(),o.visible]);const first=pose();item.update(1.5);assert.notDeepEqual(pose(),first,'effect changes with time');item.update(1);assert.deepEqual(pose(),first,'effect must be deterministic')}
console.log('PASS: cutaway flow and blast time controls');
const {valveGripPoint,setValveAngle}=await import('../assets/index.js');
const wheel=room.getObjectByName('valve-wheel-1');const p0=valveGripPoint(room,1,-1);setValveAngle(room,1,Math.PI/2);const p1=valveGripPoint(room,1,-1);assert.ok(p0.distanceTo(p1)>.2,'grip follows rotating rim');assert.ok(Math.abs(p1.distanceTo(wheel.getWorldPosition(p1.clone()))-Math.hypot(wheel.userData.rimRadius,.04))<1e-5,'grip remains on rim');assert.throws(()=>valveGripPoint(room,999));
console.log('PASS: world-space grip follows wheel pivot');
const {setHatchAngle}=await import('../assets/index.js');const hatch=room.getObjectByName('hatch-hinge');setHatchAngle(room,-Math.PI/2);assert.equal(hatch.rotation.y,-Math.PI/2);setHatchAngle(room,0);assert.equal(hatch.rotation.y,0);console.log('PASS: hatch hinge');
