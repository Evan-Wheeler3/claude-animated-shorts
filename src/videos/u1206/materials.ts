// Story-specific painted-metal treatment. Textures are original, generated deterministically at runtime.
import * as THREE from 'three';
import {toonify} from '../../pipeline/props3d';

function paintedMetal(): THREE.CanvasTexture {
  const c=document.createElement('canvas'); c.width=512;c.height=512;
  const ctx=c.getContext('2d')!;ctx.fillStyle='#e2e3dc';ctx.fillRect(0,0,512,512);
  // Soft tonal variation and fine, sparse scratches rather than photographic dirt.
  let seed=1206;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<460;i++) {const x=rand()*512,y=rand()*512,w=4+rand()*50;
    ctx.strokeStyle=i%3===0?'rgba(255,255,255,0.12)':'rgba(45,63,57,0.07)';ctx.lineWidth=.5+rand()*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+rand()*3-1.5);ctx.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;
}
/** Convert to the shared two-tone shader, preserving an original procedural finish. */
export function finish<T extends THREE.Object3D>(root:T):T {
  toonify(root); const texture=paintedMetal(), cache=new Map<THREE.Material,THREE.Material>();
  root.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
    const apply=(base:THREE.Material)=>{if(base.name!=='iron')return base;let m=cache.get(base);if(!m){
      const original=base as THREE.MeshPhongMaterial;const copy=original.clone();copy.onBeforeCompile=original.onBeforeCompile;copy.customProgramCacheKey=original.customProgramCacheKey;copy.map=texture;copy.needsUpdate=true;m=copy;cache.set(base,m)}return m};
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(apply):apply(mesh.material);
  });return root;
}
