// Reusable schematic flow elements. Positions are illustrative, not a historical diagram.
import * as T from 'three';
const blue=new T.MeshStandardMaterial({name:'water',color:'#52c6dc',roughness:.45});
const pale=new T.MeshStandardMaterial({name:'foam',color:'#e8fbf6',roughness:.8});
const metal=new T.MeshStandardMaterial({name:'iron',color:'#536a68',roughness:.8});
const make=(g,m,p)=>{const o=new T.Mesh(g,m);p.add(o);return o};
/** Separate droplets are posed from an absolute time; cutaway water path travels from deck to battery. */
export function createCutawayFlow(){const group=new T.Group();group.name='cutaway-flow';
 const points=[new T.Vector3(.7,1.6,1.4),new T.Vector3(.7,1.04,1.4),new T.Vector3(.7,.8,1.4),new T.Vector3(.7,.45,1.4)];
 const curve=new T.CatmullRomCurve3(points),tube=make(new T.TubeGeometry(curve,20,.045,8,false),metal,group);tube.name='drain-path';
 const drops=[];for(let i=0;i<5;i++){const d=make(new T.SphereGeometry(.075,12,8),blue,group);d.name='flow-drop';d.scale.set(.7,1.2,.7);drops.push(d)}
 const ripple=make(new T.TorusGeometry(.23,.02,8,32),pale,group);ripple.rotation.x=Math.PI/2;ripple.position.set(.7,.89,1.4);
 function update(t){drops.forEach((d,i)=>{const u=((t*.34+i/5)%1+1)%1;d.position.copy(curve.getPoint(u));d.visible=u>.04&&u<.98});ripple.scale.setScalar(.7+.3*(.5+.5*Math.sin(t*3)))}
 update(0);group.userData={units:'m',pivot:'section origin',note:'schematic path'};return {group,update};}
/** Adjustable blast with a white inner stream and independent moving droplets. */
export function createAnimatedBlast(){const group=new T.Group();group.name='blast';
 const curve=new T.CatmullRomCurve3([new T.Vector3(.35,.84,-.6),new T.Vector3(.25,1.16,-.3),new T.Vector3(-.1,1.0,.06),new T.Vector3(-.4,.26,.35)]);
 const stream=make(new T.TubeGeometry(curve,40,.085,10,false),blue,group);stream.name='blast-stream';
 const core=make(new T.TubeGeometry(curve,40,.04,8,false),pale,group);core.position.z=.012;
 const drops=[];for(let i=0;i<12;i++){const d=make(new T.SphereGeometry(.045+(i%3)*.015,10,8),i%3?pale:blue,group);d.scale.set(.7,1.3,.7);drops.push(d)}
 function update(t){const active=T.MathUtils.smoothstep(t,.2,.7);stream.scale.setScalar(Math.max(.001,active));core.scale.copy(stream.scale);drops.forEach((d,i)=>{const u=((t*.58+i/12)%1+1)%1;d.position.copy(curve.getPoint(u));d.position.x+=Math.sin(i*4+t*4)*.075*u;d.position.z+=Math.cos(i*3+t*3)*.06*u;d.visible=active>.3});group.visible=active>.01}
 update(1);return {group,update};}
