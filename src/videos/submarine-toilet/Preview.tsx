import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Composition, getInputProps, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {InkPass, noInkFallback, NOINK} from '../../pipeline/ink';
import {LensBlur} from '../../pipeline/lensblur';
import {GradeEffect, GRADES, GRADE_STRENGTH} from '../../pipeline/grade';
import {SkyRig} from '../../pipeline/sky';
import {finish} from './materials';
import {Ground} from '../../pipeline/ground';
import {CardStage, person, blob, Stage, CamInfo} from '../../pipeline/cast';
import {soldier} from '../../pipeline/toon';
import {createCompartment,createSubmarine,createToilet,createSection} from '../../../videos/submarine-toilet/assets/submarine.js';
const shots=[{pos:[48,36,66],look:[0,3,0],fov:48},{pos:[2.1,2.0,4.4],look:[0,.8,-.2],fov:48},{pos:[6.5,5.0,10.0],look:[0,2,-.2],fov:48},{pos:[3.2,2.6,7.0],look:[0,1,-.4],fov:48}] as const;
function Inner(){const f=useCurrentFrame();const {camera,scene}=useThree();const cam=camera as THREE.PerspectiveCamera;
 const world=useMemo(()=>{const root=new THREE.Group(),sky=new SkyRig(root,{clouds:0});const ship=finish(createSubmarine()),room=finish(createCompartment()),toilet=finish(createToilet()),section=finish(createSection());root.add(ship,room,toilet,section);const ground=new Ground();const floor=room.getObjectByName('floor');if(floor)ground.add(floor);const cards=new CardStage(root,ground);return {root,sky,ship,room,toilet,section,cards}},[]);
 const fx=useMemo(()=>({ink:new InkPass(scene,cam),lens:new LensBlur({maxCoC:24,nearScale:1.2}),bloom:new BloomEffect({blendFunction:BlendFunction.ADD,intensity:.5,luminanceThreshold:1,luminanceSmoothing:.2,mipmapBlur:true,levels:6,radius:.6}),tone:new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),grade:new GradeEffect(GRADES.day,GRADE_STRENGTH.day)}),[scene,cam]);
 const i=Math.min(3,Math.floor(f/100)),s=shots[i];cam.position.set(s.pos[0],s.pos[1],s.pos[2]);cam.lookAt(s.look[0],s.look[1],s.look[2]);if(i===0) cam.rotateZ(-0.85);cam.fov=s.fov;cam.updateProjectionMatrix();cam.updateMatrixWorld();cam.layers.enable(NOINK);
 const focus=new THREE.Vector3(...s.look),sun=i===0?SkyRig.sunFrom(focus.x-cam.position.x,focus.z-cam.position.z,62,44):new THREE.Vector3(1,2,3).normalize();world.sky.update(cam,scene,'day',sun,focus,{fogNear:200,fogFar:1000,shadowR:i===0?60:8});
 world.ship.visible=i===0;world.room.visible=i===3;world.section.visible=i===2;world.toilet.visible=i===1;world.root.updateMatrixWorld(true);
 const right=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),ci:CamInfo={pos:cam.position,right,sun,light:'day'},st:Stage={places:[],fx:[]};
 if(i===3){st.places.push(person(ci,1,soldier(0),'crew',-.55,0,.3,{mode:'stand',expr:'worried'},1,{name:'crew',glow:'subtle'}));blob(ci,st,-.55,.3)}
 world.cards.render(st,cam,right,'day',false);noInkFallback(world.root);fx.lens.focus=cam.position.distanceTo(focus);fx.lens.cInf=0;
 return <><primitive object={world.root} dispose={null}/><EffectComposer multisampling={4}><primitive object={fx.ink} dispose={null}/><primitive object={fx.lens.pre} dispose={null}/><primitive object={fx.lens.main} dispose={null}/><primitive object={fx.bloom} dispose={null}/><primitive object={fx.tone} dispose={null}/><primitive object={fx.grade} dispose={null}/></EffectComposer></>}
const Preview=()=> <AbsoluteFill><ThreeCanvas width={1080} height={1920} dpr={(getInputProps() as {dpr?:number}).dpr??.5} shadows gl={{antialias:false,stencil:false,toneMappingExposure:1}} camera={{fov:40,near:.15,far:1500}}><Inner/></ThreeCanvas></AbsoluteFill>;
export const Root=()=> <Composition id="SubmarineAssetReview" component={Preview} durationInFrames={400} fps={30} width={1080} height={1920}/>;
