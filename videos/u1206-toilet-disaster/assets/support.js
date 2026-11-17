// Original stylised support assets, Y up, metres. All are independent Three.js groups.
import * as T from 'three';
const mat=(name,color)=>Object.assign(new T.MeshStandardMaterial({color,roughness:.8}),{name});
const M={wall:mat('iron','#779089'),edge:mat('iron','#344b4c'),floor:mat('iron','#617972'),cream:mat('enamel','#e5dabc'),brass:mat('gold','#c29755'),red:mat('paint','#b64b39'),black:mat('dark','#28393c'),water:mat('water','#4bb3c0'),fish:mat('paint','#e8a04f')};
function mesh(g,m,p,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o}
function box(p,m,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z)}
function cyl(p,m,x,y,z,r,h,axis='y'){const o=mesh(new T.CylinderGeometry(r,r,h,20),m,p,x,y,z);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o}
function pipe(p,m,pts,r=.04){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),48,r,8,false),m,p)}
function wheel(p,x,y,z,r=.2){const g=new T.Group();g.name='handwheel';g.position.set(x,y,z);p.add(g);mesh(new T.TorusGeometry(r,.022,8,24),M.red,g);for(let a=0;a<4;a++){const s=box(g,M.red,0,0,0,r*1.8,.024,.025);s.rotation.z=a*Math.PI/4}cyl(g,M.brass,0,0,.035,.05,.08,'z');return g}
function dial(p,x,y,z,r=.14){cyl(p,M.edge,x,y,z,r+.035,.07,'z');cyl(p,M.cream,x,y,z+.045,r,.025,'z');const n=box(p,M.black,x,y+.035,z+.063,.012,r*.9,.01);n.rotation.z=-.65;for(let a=0;a<7;a++){let t=box(p,M.black,x+Math.cos(a*Math.PI/6)*r*.72,y+Math.sin(a*Math.PI/6)*r*.72,z+.064,.025,.012,.01);t.rotation.z=a*Math.PI/6}}
function room(w=3.6,d=2.8){const g=new T.Group();const f=box(g,M.floor,0,-.06,0,w,.12,d);f.name='floor';for(let x=-w/2+.1;x<w/2;x+=.28)box(g,M.edge,x,.005,0,.018,.012,d-.1);const b=new T.Group();b.name='removable-back-wall';g.add(b);box(b,M.wall,0,1.4,-d/2,w,2.8,.12);for(let x=-w/2+.1;x<w/2;x+=.7)box(b,M.edge,x,1.4,-d/2+.09,.045,2.7,.05);const side=new T.Group();side.name='removable-side-wall';g.add(side);box(side,M.wall,-w/2,1.4,0,.1,2.8,d);for(let z=-d/2+.2;z<d/2;z+=.65)box(side,M.edge,-w/2+.07,1.4,z,.04,2.7,.05);return {g,b,side}}
export function createControlRoom(){const {g,b}=room();g.name='control-room';
 box(b,M.edge,.55,.65,-1.05,1.75,1.15,.55);box(b,M.wall,.55,1.25,-1.04,1.65,.15,.6);
 for(let i=0;i<5;i++)dial(b,-.12+i*.33,1.48,-1.31,.115);
 for(let i=0;i<4;i++)wheel(b,-.05+i*.4,.89,-.74,.12);
 cyl(g,M.edge,-.7,1.35,-.5,.16,2.7);cyl(g,M.brass,-.7,1.75,-.5,.21,.22);wheel(g,-.7,1.5,-.25,.23);
 for(let i=0;i<3;i++){pipe(b,M.brass,[[1.5,.3+i*.22,-1.28],[1.5,1.8+i*.15,-1.28],[1.1,2+i*.15,-1.28]],.025)}
 dial(b,-1.1,1.9,-1.31,.23);wheel(b,-1.1,1.2,-1.23,.25);
 g.userData={units:'m',pivot:'floor centre',sets:['removable-back-wall','removable-side-wall']};return g}
export function createBatteryRoom(){const {g,b}=room();g.name='battery-room';
 for(let x of [-1.1,-.4,.3,1])for(let z of [-.75,0,.75]){const battery=box(g,M.black,x,.42,z,.58,.78,.58);battery.name='battery-cell';box(g,M.edge,x,.83,z,.61,.08,.61);for(let dx of [-.14,.14])cyl(g,M.brass,x+dx,.9,z,.045,.08)}
 pipe(b,M.red,[[-1.4,2.15,-1.28],[0,2.15,-1.28],[1.4,2.15,-1.28]],.045);dial(b,.7,1.7,-1.31,.18);
 g.userData={units:'m',pivot:'floor centre',effectAnchor:[0,1,0]};return g}
export function createFloodEffects(){const g=new T.Group();g.name='flood-effects';
 const water=box(g,M.water,0,.08,0,3,.12,2.5);water.name='water-level';
 for(let i=0;i<5;i++){let ripple=mesh(new T.TorusGeometry(.17+i*.055,.018,8,36),M.cream,g,.25,.42,-.55);ripple.position.y=.15;ripple.rotation.x=Math.PI/2;ripple.scale.y=.7}
 const jet=new T.Group();jet.name='water-jet';g.add(jet);pipe(jet,M.water,[[.35,.85,-.6],[.2,1.2,-.35],[-.1,1.0,0],[-.35,.46,.35]],.085);
 for(let i=0;i<13;i++){let p=mesh(new T.SphereGeometry(.055+(i%3)*.012,10,8),i%3?M.water:M.cream,jet,-.4+(i%4)*.23,.55+(i%5)*.15,-.2+(i%3)*.18);p.scale.set(.7,1.4,.7)}
 g.userData={units:'m',pivot:'floor centre',controls:'water-level.position.y changes level; water-jet is independently hideable'};return g}
export function createFish(){const g=new T.Group();g.name='fish';let body=mesh(new T.SphereGeometry(.35,20,12),M.fish,g);body.scale.set(1.5,.75,.35);const tail=mesh(new T.ConeGeometry(.28,.42,3),M.fish,g,-.58,0,0);tail.rotation.z=-Math.PI/2;const eye=mesh(new T.SphereGeometry(.045,10,8),M.black,g,.24,.1,.13);g.userData={units:'m',forward:'+X'};return g}
export function createBubbles(){const g=new T.Group();g.name='bubbles';for(let i=0;i<18;i++){const x=Math.sin(i*2.2)*.65,y=i*.22,z=Math.cos(i*1.6)*.4;const b=mesh(new T.TorusGeometry(.07+(i%4)*.022,.012,6,20),M.cream,g,x,y,z);b.name='bubble'}return g}

export function createOceanCrests(){const g=new T.Group();g.name='ocean-crests';for(let i=0;i<55;i++){const x=Math.sin(i*31.7)*48,z=Math.cos(i*17.1)*48;const a=mesh(new T.TorusGeometry(1.1+(i%4)*.3,.055,6,24,Math.PI*.7),M.cream,g,x,3.36,z);a.rotation.x=-Math.PI/2;a.rotation.z=i*.7;a.scale.y=.35}return g}
/** Distant aircraft silhouette. Stylized and intentionally unmarked. Axis +Z; centre pivot. */
export function createAircraft(){const g=new T.Group();g.name='aircraft';const body=mesh(new T.SphereGeometry(1,24,12),M.edge,g);body.scale.set(.55,.45,3.4);box(g,M.edge,0,0,0,7.8,.16,1.1);box(g,M.edge,0,.15,-2.6,2.8,.12,.6);const fin=box(g,M.edge,0,.58,-2.55,.12,1.2,.75);fin.name='tail-fin';g.userData={units:'m',pivot:'centre',forward:'+Z'};return g}
/** Schematic raft. Origin is at waterline, so it can float without hand-placed offsets. */
export function createRaft(){const g=new T.Group();g.name='raft';const rim=mesh(new T.TorusGeometry(1,.15,12,40),M.brass,g,0,.16,0);rim.rotation.x=Math.PI/2;rim.scale.set(1.3,1,1);const floor=mesh(new T.CylinderGeometry(.87,.87,.08,32),M.floor,g,0,.12,0);floor.scale.set(1.3,1,1);g.userData={units:'m',pivot:'waterline centre',crewAnchor:[0,.2,0]};return g}
/** Gas cue is a mobile graphic effect, not a claim about the appearance of chlorine. */
export function createGasCue(){
 const g=new T.Group();g.name='gas-cue';const n=128,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(x-n/2)/(n/2),dy=(y-n/2)/(n/2),d=Math.hypot(dx,dy),i=(y*n+x)*4;data[i]=190;data[i+1]=216;data[i+2]=120;data[i+3]=Math.round(95*Math.max(0,1-d)**2)}
 const tex=new T.DataTexture(data,n,n,T.RGBAFormat);tex.needsUpdate=true;
 const mat=new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.7});
 for(let i=0;i<9;i++){const puff=new T.Sprite(mat);puff.position.set(Math.sin(i*2.3)*.35,.25+i*.14,Math.cos(i*2.1)*.2);puff.scale.setScalar(.6+(i%3)*.15);puff.name='gas-puff';g.add(puff)}
 g.userData={units:'m',pivot:'emission point',note:'schematic cue; animate opacity and position'};return g}
/** Pivoted control lever for the surfacing control station. */
export function createLever(){const g=new T.Group();g.name='lever-pivot';cyl(g,M.edge,0,0,0,.14,.1,'z');box(g,M.edge,0,.3,.04,.07,.6,.08);mesh(new T.SphereGeometry(.1,12,8),M.red,g,0,.6,.04);g.userData={units:'m',pivot:'shaft centre',axis:'Z'};return g}
/** Stylized warning lamp. Toggle the `lamp-glow` mesh for a frame-driven flash. */
export function createWarningLamp(){const g=new T.Group();g.name='warning-lamp';box(g,M.edge,0,0,0,.2,.2,.1);const lens=mesh(new T.SphereGeometry(.11,16,10),M.red,g,0,0,.08);lens.scale.set(1,1,.45);const glow=mesh(new T.SphereGeometry(.14,16,10),new T.MeshBasicMaterial({color:'#ff4c29',transparent:true,opacity:.35,depthWrite:false}),g,0,0,.11);glow.scale.set(1,1,.3);glow.name='lamp-glow';g.userData={units:'m',pivot:'wall attachment'};return g}
