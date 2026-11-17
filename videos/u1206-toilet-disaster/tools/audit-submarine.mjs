import * as THREE from 'three';
import {createSubmarine,createToilet,createCompartment,createSection} from '../assets/submarine.js';
import {createControlRoom,createBatteryRoom,createFloodEffects,createFish,createBubbles,createAircraft,createRaft,createGasCue,createLever,createWarningLamp} from '../assets/support.js';
let errors=0;
for(const [name,make] of Object.entries({exterior:createSubmarine,toilet:createToilet,compartment:createCompartment,section:createSection,control:createControlRoom,battery:createBatteryRoom,flood:createFloodEffects,fish:createFish,bubbles:createBubbles,aircraft:createAircraft,raft:createRaft,gas:createGasCue,lever:createLever,warning:createWarningLamp})) {
 const root=make();root.updateMatrixWorld(true);let meshes=0,triangles=0;
 root.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal');
  if(!p||!n){console.error(name,'missing position or normal');errors++;return}
  for(const a of [p,n])for(let i=0;i<a.array.length;i++)if(!Number.isFinite(a.array[i])){console.error(name,'non-finite attribute');errors++;break}
  triangles+=(g.index?g.index.count:p.count)/3;
 });
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
 if(bounds.isEmpty()||![size.x,size.y,size.z].every(Number.isFinite)){console.error(name,'invalid bounds');errors++}
 console.log(`${name}: ${meshes} meshes, ${triangles} triangles, bounds ${size.toArray().map(x=>x.toFixed(2)).join(' x ')} m`);
}
if(errors)process.exit(1);
