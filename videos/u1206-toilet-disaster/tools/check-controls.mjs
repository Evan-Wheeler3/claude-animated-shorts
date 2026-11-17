import assert from 'node:assert/strict';
import {createCompartment} from '../assets/submarine.js';
import {createWaterSurface} from '../assets/water.js';
import {createLever,createRaft} from '../assets/support.js';
const room=createCompartment();for(let i=1;i<=4;i++){const wheel=room.getObjectByName(`valve-wheel-${i}`);assert.ok(wheel,`missing wheel ${i}`);assert.equal(wheel.userData.axis,'Z')}
assert.ok(room.getObjectByName('seat-hinge'));assert.ok(room.getObjectByName('removable-back-wall'));assert.ok(room.getObjectByName('removable-side-wall'));assert.ok(room.getObjectByName('gauge-needle-pivot'));
assert.equal(createLever().name,'lever-pivot');assert.equal(createRaft().userData.pivot,'waterline centre');
const water=createWaterSurface({width:3,depth:3,segments:8});const arr=()=>Array.from(water.mesh.geometry.attributes.position.array);water.update(.2);const a=arr();water.update(.8);assert.notDeepEqual(arr(),a,'water should move');water.update(.2);assert.deepEqual(arr(),a,'water must be deterministic for out-of-order rendering');
console.log('PASS: independent named controls and deterministic water');
const {createCutawayFlow,createAnimatedBlast}=await import('../assets/proofs.js');
for(const create of [createCutawayFlow,createAnimatedBlast]){const item=create();item.update(1);const pose=()=>item.group.children.map(o=>[...o.position.toArray(),...o.scale.toArray(),o.visible]);const first=pose();item.update(1.5);assert.notDeepEqual(pose(),first,'effect changes with time');item.update(1);assert.deepEqual(pose(),first,'effect must be deterministic')}
console.log('PASS: cutaway flow and blast time controls');
