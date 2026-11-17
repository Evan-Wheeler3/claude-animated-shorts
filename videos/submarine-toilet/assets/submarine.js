// Original stylised U-boat and compartment geometry. Y up; metres; bow +Z.
import * as T from 'three';
const mat=(name,color)=>Object.assign(new T.MeshStandardMaterial({color,roughness:.8}),{name});
const M={wood:mat('oakDark','#695c4b'), hull:mat('iron','#56696b'), lower:mat('iron','#343f43'), deck:mat('iron','#777a70'), edge:mat('iron','#323e40'), brass:mat('gold','#bb8749'), ivory:mat('enamel','#dfdac5'), red:mat('paint','#9e4035'), dark:mat('dark','#293536'), floor:mat('iron','#586965')};
function mesh(g,m,parent,x=0,y=0,z=0){const a=new T.Mesh(g,m);a.position.set(x,y,z);parent.add(a);return a}
function box(p,m,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z)}
function cylinder(p,m,x,y,z,r,h,axis='y'){let a=mesh(new T.CylinderGeometry(r,r,h,20),m,p,x,y,z);if(axis==='z')a.rotation.x=Math.PI/2;if(axis==='x')a.rotation.z=Math.PI/2;return a}
function pipe(p,m,points,r=.045){const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)),false,'centripetal');return mesh(new T.TubeGeometry(curve,48,r,8,false),m,p)}
function wheel(p,x,y,z,r=.22){let g=new T.Group();g.position.set(x,y,z);p.add(g);let rim=mesh(new T.TorusGeometry(r,.024,8,24),M.red,g);for(let i=0;i<4;i++){let s=box(g,M.red,0,0,0,r*1.8,.025,.035);s.rotation.z=i*Math.PI/4}cylinder(g,M.brass,0,0,.03,.055,.09,'z');g.name='valve-wheel';return g}
function bolts(p,z,y,span,n){for(let i=0;i<n;i++)cylinder(p,M.brass,-span/2+i*span/(n-1),y,z,.018,.025,'z')}
export function createToilet(){const g=new T.Group();g.name='pressure-toilet';
 // Hollow bowl made as a lathed cross-section; the inner surface remains visible.
 const profile=[[.16,0],[.26,.05],[.29,.35],[.38,.43],[.4,.49],[.34,.51],[.30,.45],[.22,.28],[.13,.24],[.07,.26]].map(([x,y])=>new T.Vector2(x,y));
 mesh(new T.LatheGeometry(profile,48),M.ivory,g,0,.08,0);let seat=mesh(new T.TorusGeometry(.32,.045,12,40),M.dark,g,0,.59,0);seat.rotation.x=Math.PI/2;seat.scale.set(1,1.16,1);
 cylinder(g,M.edge,0,.035,0,.28,.07);pipe(g,M.edge,[[0,.28,-.18],[0,.22,-.42],[.35,.22,-.53],[.45,.22,-.7]],.09);
 pipe(g,M.brass,[[.29,.44,-.25],[.51,.47,-.43],[.51,1.05,-.57],[.65,1.1,-.72]],.045);wheel(g,.51,.9,-.39,.16);
 pipe(g,M.edge,[[-.3,.2,-.28],[-.53,.25,-.52],[-.53,1.42,-.65],[-.35,1.55,-.7]],.055);wheel(g,-.53,1.16,-.52,.18);
 g.userData={units:'m',pivot:'floor at bowl centre',anchors:{outlet:[.45,.22,-.7],water:[0,.32,0]}};return g}
export function createCompartment(){let g=new T.Group();g.name='compartment';
 let floor=box(g,M.floor,0,-.06,0,3.2,.12,2.7);floor.name='floor';
 for(let x=-1.5;x<1.6;x+=.25)box(g,M.edge,x,.005,0,.018,.012,2.65);
 let back=new T.Group();back.name='removable-back-wall';g.add(back);box(back,M.hull,0,1.35,-1.3,3.2,2.7,.12);
 for(let x of [-1.48,-.75,0,.75,1.48])box(back,M.edge,x,1.35,-1.22,.055,2.6,.06);
 for(let y of [.22,2.42]){box(back,M.deck,0,y,-1.21,3.1,.075,.06);bolts(back,-1.16,y,2.9,16)}
 let side=new T.Group();side.name='removable-side-wall';g.add(side);box(side,M.hull,-1.56,1.35,0,.1,2.7,2.7);
 for(let z of [-1.15,-.4,.4,1.15])box(side,M.edge,-1.49,1.35,z,.05,2.6,.06);
 let hatch=new T.Group();hatch.name='hatch';back.add(hatch);cylinder(hatch,M.edge,-.85,1.35,-1.18,.56,.12,'z');cylinder(hatch,M.deck,-.85,1.35,-1.09,.47,.08,'z');wheel(hatch,-.85,1.35,-1.02,.22);
 let toilet=createToilet();toilet.position.set(.35,0,-.55);g.add(toilet);
 for(let i=0;i<3;i++){let y=1.35+i*.29;pipe(back,M.brass,[[.7,y,-1.18],[1.0,y,-1.14],[1.28,y,-1.14]],.025);wheel(back,1.05,y,-1.02,.08)}
 cylinder(back,M.edge,.1,2.05,-1.14,.2,.08,'z');cylinder(back,M.ivory,.1,2.05,-1.08,.16,.03,'z');let needle=box(back,M.red,.1,2.08,-1.05,.015,.12,.02);needle.rotation.z=-.7;
 g.userData={units:'m',pivot:'floor centre',waterAnchor:[0,.08,0]};return g}
export function createSubmarine(){let g=new T.Group();g.name='type-viic-inspired-exterior';
 // Long turned pressure hull, fine ends and raised free-flooding upper casing.
 const pts=[[-33,0],[-32,.55],[-29,1.45],[-24,2.3],[-17,2.9],[-7,3.15],[9,3.15],[20,2.8],[28,1.9],[32,.75],[33,0]].map(([z,r])=>new T.Vector2(r,z));
 let hull=mesh(new T.LatheGeometry(pts,64),M.hull,g,0,3.2,0);hull.rotation.x=Math.PI/2;
 // Raised casing and wooden deck over the pressure hull. Dark marks are graphic flood-port cues.
 box(g,M.deck,0,5.6,0,3.8,.22,42);box(g,M.wood,0,5.73,0,3.35,.055,40);
 for(let x=-1.5;x<=1.5;x+=.3)box(g,M.edge,x,5.765,0,.018,.012,39.8);
 for(let side of [-1,1]) { let tank=mesh(new T.SphereGeometry(1,24,12),M.lower,g,side*2.12,3.2,-1); tank.scale.set(.85,1.18,20); for(let z=-17;z<=18;z+=1.4) box(g,M.edge,side*2.39,4.96,z,.045,.13,.7); }
 for(let z=-18;z<19;z+=3.5){cylinder(g,M.edge,0,5.8,z,.19,.07);cylinder(g,M.deck,0,5.85,z,.13,.05)}
 let tower=new T.Group();tower.name='conning-tower';g.add(tower);box(tower,M.hull,0,6.45,-1,2.5,1.65,6.8);cylinder(tower,M.hull,0,6.45,2.4,1.25,1.65);box(tower,M.edge,0,7.34,-.4,2.7,.12,6.2);
 // Simplified late-war bridge and raised aft wintergarten, separate rail/weapon detailing remains schematic.
 box(tower,M.hull,0,6.25,-5,2.35,.65,2.6);box(tower,M.deck,0,6.63,-5,2.5,.12,2.6);
 for(let x of [-1.16,1.16]) {for(let z=-6;z<=-4;z+=.5)cylinder(tower,M.edge,x,6.98,z,.025,.65);box(tower,M.edge,x,7.31,-5,.04,.04,2.3)}
 for(let side of [-1,1])for(let z=-2.8;z<2;z+=.55)box(tower,M.edge,side*1.26,6.55,z,.025,.2,.24);
 for(let x of [-1.15,1.15]){for(let z=-3.8;z<2.8;z+=1.05)cylinder(tower,M.edge,x,7.65,z,.035,.65);box(tower,M.edge,x,7.96,-.5,.045,.045,6.8)}
 cylinder(tower,M.edge,-.35,8.25,-.6,.07,1.6);cylinder(tower,M.edge,.3,8.1,-1.4,.045,1.4);
 // twin stern shafts, propellers and separate steering surfaces
 for(let x of [-1.15,1.15]){cylinder(g,M.edge,x,2.65,-28,.10,5,'z');let prop=new T.Group();prop.name='propeller';prop.position.set(x,2.65,-30.5);g.add(prop);cylinder(prop,M.brass,0,0,0,.2,.5,'z');for(let i=0;i<3;i++){let blade=mesh(new T.SphereGeometry(.55,12,8),M.brass,prop,Math.cos(i*2*Math.PI/3)*.48,Math.sin(i*2*Math.PI/3)*.48,0);blade.scale.set(.42,1,.1);blade.rotation.z=i*2*Math.PI/3-1.1}}
 box(g,M.edge,0,2.6,-30,.18,3.0,2.4);box(g,M.edge,0,3.0,-30,4.4,.16,2.1);
 g.userData={units:'m',pivot:'keel midships',bow:'+Z',length:66, historicalNote:'stylised type VIIC; configuration not verified for U-1206'};return g}
/** Educational section: illustrative spatial layers, not a verified arrangement of U-1206. */
export function createSection(){
 const section=new T.Group();section.name='illustrative-section';
 const room=createCompartment();room.position.y=1;section.add(room);
 // A ring at each end makes the pressure-hull cross section legible with the near wall removed.
 for(const z of [-1.42,1.42]){const rib=mesh(new T.TorusGeometry(2.05,.08,10,48),M.edge,section,0,2.05,z);rib.name='pressure-hull-rib'}
 box(section,M.lower,0,.07,0,3.3,.14,2.8);
 for(let x of [-1.05,-.35,.35,1.05]) for(let z of [-.75,0,.75]){
  const cell=box(section,M.dark,x,.48,z,.56,.74,.6);cell.name='illustrative-battery';
  cylinder(section,M.brass,x-.13,.88,z,.045,.08);cylinder(section,M.brass,x+.13,.88,z,.045,.08);
 }
 section.userData={units:'m',pivot:'bottom centre',historicalNote:'schematic; battery location and pipe routing unverified'};return section;
}
