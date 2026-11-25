// Hold Up post chain (bridge look): render -> ink -> lens blur (pre + main) -> NEUTRAL tone map + grade.
// Set lens.focus (m along the view axis) and lens.cInf (px blur at infinity, 1080 wide: CU 12-14, MS 10, wide 0) per frame.
import * as THREE from 'three';
import {EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {InkPass} from '../../../../bridge/ink';
import {LensBlur} from '../../../../bridge/lensblur';
import {GradeEffect, GRADES} from '../../../../bridge/grade';

export const makeComposer = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, grade = .85) => {
  const composer = new EffectComposer(renderer, {multisampling: 4, frameBufferType: THREE.HalfFloatType});
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new InkPass(scene, camera, {distFar: 120}));
  const lens = new LensBlur({maxCoC: 24, nearScale: 1.2});
  composer.addPass(new EffectPass(camera, lens.pre));
  composer.addPass(new EffectPass(camera, lens.main));
  composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), new GradeEffect(GRADES.day, grade)));
  return {composer, lens};
};
/** default blur by subject distance (bridge dofAt) */
export const dofFor = (d: number) => (d < 4 ? 13 : d < 12 ? 10 : d < 30 ? 6 : 0);
