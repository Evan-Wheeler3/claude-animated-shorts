// Original deterministic, reusable animated water geometry. Y up; dimensions and wave amplitude in metres.
import * as THREE from 'three';
/** Returns {mesh, update}. `time` is absolute seconds; no frame-to-frame state is required. */
export function createWaterSurface({width=100,depth=100,segments=64,level=0,amplitude=.14,period=7,color='#287f9d',opacity=1}={}) {
 const geometry=new THREE.PlaneGeometry(width,depth,segments,segments).rotateX(-Math.PI/2);
 const position=geometry.getAttribute('position');const original=new Float32Array(position.array);const colors=new Float32Array(position.count*3);
 const c1=new THREE.Color(color),c2=c1.clone().lerp(new THREE.Color('#a6e6df'),.38);
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const material=new THREE.MeshLambertMaterial({vertexColors:true,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity>=1});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='water-surface';mesh.position.y=level;mesh.receiveShadow=true;
 function update(time){for(let i=0;i<position.count;i++){const x=original[i*3],z=original[i*3+2];const phase=x/period*6.283+time*1.25;const phase2=z/period*4.7-time*.9;const w=Math.sin(phase)+.45*Math.sin(phase2+x/period*1.7);position.setY(i,amplitude*w);const c=c1.clone().lerp(c2,THREE.MathUtils.clamp(.32+.24*w,0,1));colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b}position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere()}
 update(0);mesh.userData={units:'m',level,controls:'update(timeSeconds) evaluates waves deterministically'};return {mesh,update};
}
