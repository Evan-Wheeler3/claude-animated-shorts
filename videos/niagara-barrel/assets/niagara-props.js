// Original reusable procedural Three.js assets for Hold Up Niagara Barrel.
// Compatible with THREE r150+; no external assets. Units approximate meters.
// Use existing post-process ink and lighting for final look.
import * as THREE from 'three';

const mat=(color,roughness=0.88)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
const oak=mat('#a56a39'), oakDark=mat('#704321'), iron=mat('#353d42',0.6), water=mat('#3d91b2',0.42);
function mesh(g,m,p=[0,0,0],r=[0,0,0]) { const x=new THREE.Mesh(g,m);x.position.set(...p);x.rotation.set(...r);x.castShadow=true;x.receiveShadow=true;return x; }
function cyl(rt,rb,h,m,p,segments=24){return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m,p);}
export function createBarrel(){
  // Y vertical. Approx 0.9m tall, 0.68m max diameter.
  const g=new THREE.Group();g.name='Annie sealed oak barrel';
  const N=18,H=.92;
  // Individual tapered stave surfaces with narrow visible gaps.
  for(let i=0;i<N;i++){
    const a=i*2*Math.PI/N;
    const shape=new THREE.BufferGeometry();
    const verts=[],inds=[];
    for(let j=0;j<3;j++){
      const y=-H/2+j*H/2;
      const radius=j===1?.355:.315;
      for(const side of [-.47,.47]){
        const ang=a+side*(2*Math.PI/N);
        verts.push(Math.sin(ang)*radius,y,Math.cos(ang)*radius);
      }
    }
    inds.push(0,2,1,1,2,3,2,4,3,3,4,5);
    shape.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));shape.setIndex(inds);shape.computeVertexNormals();
    const stave=mesh(shape,i%3===0?oakDark:oak);stave.material.side=THREE.DoubleSide;g.add(stave);
  }
  for(const y of [-.33,-.20,.20,.33]){
    const radius=Math.abs(y)>.3?.328:.346;
    const hoop=mesh(new THREE.TorusGeometry(radius,.018,7,48),iron,[0,y,0],[Math.PI/2,0,0]);g.add(hoop);
  }
  for(const y of [-.455,.455]){
    g.add(cyl(.308,.308,.025,oakDark,[0,y,0]));
    g.add(mesh(new THREE.TorusGeometry(.307,.018,7,48),iron,[0,y,0],[Math.PI/2,0,0]));
  }
  g.userData={radius:.36,height:.95,axis:'Y',canRotateForWater:true};
  return g;
}
export function createRescueBoat(){
  const g=new THREE.Group();g.name='1901 rescue rowboat'; // bow points +Z
  const hull=mesh(new THREE.SphereGeometry(1,18,12),oakDark,[0,.20,0]);hull.scale.set(.68,.34,1.55);g.add(hull);
  const cavity=mesh(new THREE.SphereGeometry(1,18,12,0,Math.PI*2,0,Math.PI/2),oak,[0,.40,0]);cavity.scale.set(.56,.20,1.35);g.add(cavity);
  for(const z of [-.55,.45]){const seat=mesh(new THREE.BoxGeometry(1.05,.075,.27),oak,[0,.54,z]);g.add(seat);}
  for(const side of [-1,1]){const oar=mesh(new THREE.CylinderGeometry(.027,.027,2.0,8),oak,[side*.85,.62,.1],[0,0,side*.85]);g.add(oar);}
  return g;
}
export function createRockCluster(seed=1){
  const g=new THREE.Group();g.name='River rocks';let s=seed;
  const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
  const shades=['#777b76','#5b686b','#8d8b7d'];
  for(let i=0;i<9;i++){const r=.35+rnd()*.8;const rock=mesh(new THREE.IcosahedronGeometry(r,1),mat(shades[i%3]),[(rnd()-.5)*5,r*.34,(rnd()-.5)*3]);rock.scale.set(1.2,.52,1);rock.rotation.y=rnd()*6;g.add(rock);}
  return g;
}
export function createFallsScaffold(){
  // Static composition ONLY. Animator must add flowing water, foam, mist, current and sound.
  const g=new THREE.Group();g.name='Horseshoe Falls layout scaffold';
  const cliff=mat('#687b73'),edge=mat('#9ca89b');
  g.add(mesh(new THREE.BoxGeometry(28,9,3),cliff,[0,-4.5,1.5]));
  g.add(mesh(new THREE.BoxGeometry(28,.45,3.5),edge,[0,.02,1.4]));
  const river=mesh(new THREE.PlaneGeometry(28,45),water,[0,.27,-22],[ -Math.PI/2,0,0]);g.add(river);
  const plunge=mesh(new THREE.PlaneGeometry(28,9),water,[0,-4.4,3.1]);g.add(plunge);
  const pool=mesh(new THREE.PlaneGeometry(28,25),water,[0,-9,15],[-Math.PI/2,0,0]);g.add(pool);
  g.userData={lipZ:3.1,lipY:.25,dropY:-9,notes:'Placeholder blockout. Waterfall drop exaggerated by scene scale; animated water and mist mandatory.'};
  return g;
}
export function createCoinPurse(){
  const g=new THREE.Group();g.name='Empty coin purse';
  const leather=mat('#865038'),cord=mat('#d5b27d');
  const body=mesh(new THREE.SphereGeometry(.35,16,12),leather,[0,.31,0]);body.scale.set(1,.85,.55);g.add(body);
  const neck=cyl(.18,.22,.15,leather,[0,.60,0]);g.add(neck);
  g.add(mesh(new THREE.TorusGeometry(.19,.025,6,24),cord,[0,.64,0],[Math.PI/2,0,0]));
  return g;
}
export function createCoinStack(count=3){
  const g=new THREE.Group();g.name='Coins';const gold=new THREE.MeshStandardMaterial({color:'#e2b743',metalness:.35,roughness:.4});
  for(let i=0;i<count;i++){g.add(cyl(.13,.13,.022,gold,[0,.011+i*.024,0],24));}
  return g;
}
export function createCatStandIn(){
  // Replace with the existing toon character-card implementation if available.
  const g=new THREE.Group();g.name='Cat blocking reference';
  const fur=mat('#b98254'),dark=mat('#3c2e30');
  const body=mesh(new THREE.SphereGeometry(.2,12,10),fur,[0,.23,0]);body.scale.set(1.1,.9,1.5);g.add(body);
  const head=mesh(new THREE.SphereGeometry(.16,12,10),fur,[0,.39,.24]);g.add(head);
  for(const x of [-.095,.095]){const ear=mesh(new THREE.ConeGeometry(.075,.15,4),fur,[x,.56,.24],[0,Math.PI/4,0]);g.add(ear);}
  for(const x of [-.065,.065])g.add(mesh(new THREE.SphereGeometry(.018,8,6),dark,[x,.41,.38]));
  const tail=mesh(new THREE.TorusGeometry(.19,.028,6,16,Math.PI*1.15),fur,[0,.33,-.33],[0,Math.PI/2,0]);g.add(tail);
  return g;
}
