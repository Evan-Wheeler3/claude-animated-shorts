# phil-bathroom Remotion project

This is a self-contained Remotion 4 + Three.js project for the episode. Run it from this folder. `--public-dir=../assets` serves the supplied GLBs.

- `src/shots.ts` holds the 16-shot timeline (SHOTLIST.md frame targets) and the locked S16 cue constants.
- `src/PhilShort.tsx` uses one WebGLRenderer, renders each frame imperatively and applies ACES at exposure 1.25.
- `src/sets/reveal.ts` is the unchanged `SCENE_INIT.mjs` port for S16.
- `src/sets/bathroom.ts` is the bathroom set plus hallway for S01, S02 and S15.
- `src/sets/exteriorBuild.ts` builds the exterior, and `src/sets/exterior.ts` stages S03–S14.
- `src/lib/rig.ts` and `src/lib/poses.ts` handle Rocketbox rig posing (world-space IK) and the provisional homeowner.
- `scripts/stills.mjs` renders real stills: `node scripts/stills.mjs <outDir> keys|<frames> [scale]`. The env vars `PHIL_GL` (default `swangle`), `PHIL_CHROME`, and `COMP`/`PROPS` select the dev compositions `RigLab` and `Probe`.
- `scripts/inspect-glb.mjs` dumps GLB nodes, bones and morphs without a browser.
