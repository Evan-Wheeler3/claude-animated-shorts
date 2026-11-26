// Minimal shadow test: same post chain as Stills. frame 0 = full chain, 1 = no AO, 2 = plain renderer.render (no composer)
import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {N8AOPostPass} from 'n8ao';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {continueRender, delayRender, staticFile} from 'remotion';
import {skyDome} from './kit/look';
export const ShadowTest: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null); const frame = useCurrentFrame(); const {width, height} = useVideoConfig();
  const [env, setEnv] = React.useState<THREE.DataTexture | null>(null); const [h] = React.useState(() => delayRender('hdr'));
  useLayoutEffect(() => { new RGBELoader().loadAsync(staticFile('meadow_2.hdr')).then(e => { setEnv(e); continueRender(h); }); }, [h]);
  useLayoutEffect(() => {
    if (!env) return;
    const r = new THREE.WebGLRenderer({canvas: canvas.current!, preserveDrawingBuffer: true}); r.setSize(width, height, false); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = new THREE.Scene(); s.background = new THREE.Color('#88aacc'); const cam = new THREE.PerspectiveCamera(42, width / height, .05, 100); cam.position.set(0, 3, 7); cam.lookAt(0, 0.5, 0);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({color: '#dddddd'})); pl.rotation.x = -Math.PI / 2; pl.receiveShadow = true; s.add(pl);
    const bx = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: '#ff3333'})); bx.position.y = .5; bx.castShadow = true; s.add(bx);
    s.add(new THREE.HemisphereLight('#ffffff', '#444444', .5));
    // frame 0: + sky dome (no lights), frame 1: + PMREM env, frame 2: + fog
    skyDome(s, 'day', false);
    if (frame >= 1) { env.mapping = THREE.EquirectangularReflectionMapping; s.environment = new THREE.PMREMGenerator(r).fromEquirectangular(env).texture; }
    if (frame >= 2) s.fog = new THREE.Fog('#b9d3e8', 40, 220);
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(-4, 8, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); s.add(sun);
    
    const c = new EffectComposer(r, {frameBufferType: THREE.HalfFloatType}); c.addPass(new RenderPass(s, cam));
    c.addPass(new N8AOPostPass(s, cam, width, height));
    c.addPass(new EffectPass(cam, new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC}))); c.render();
    return () => { c.dispose(); r.dispose(); };
  }, [frame, width, height, env]);
  return <canvas ref={canvas} style={{width: '100%', height: '100%'}} />;
};
