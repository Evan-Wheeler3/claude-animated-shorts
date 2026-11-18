import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const cache = new Map<string, Promise<GLTF>>();

/** Loads a GLB once per page; callers that need an independent copy use `cloneRig`. */
export const loadGLB = (url: string): Promise<GLTF> => {
  if (!cache.has(url)) cache.set(url, new GLTFLoader().loadAsync(url));
  return cache.get(url)!;
};

/** Independent copy of a skinned asset (own skeleton, shared geometry/textures). */
export const cloneRig = (o: THREE.Object3D) => skeletonClone(o) as THREE.Object3D;
