// HOLD UP render registry: one entry per story. `npm run preview|render|qa|bench|doctor|audio -- --story <id>`
// (scripts/holdup.mjs) reads ONLY this file to find a video, so registering a new short = adding one entry here and
// its <Composition> in src/Root.tsx. See LOCAL-RENDERING.md.
export const STORIES = {
  "niagara-barrel": {
    title: "Hold Up: Niagara Barrel",
    composition: "NiagaraShort",                    // id registered in src/Root.tsx
    story: "src/videos/niagara/story.ts",           // exports SHOTS (key, a, b, still) and TOTAL
    audio: "public/niagara-barrel/mix.m4a",         // final mix, committed (AAC); the composition plays it via staticFile()
    audioBuild: {                                   // only to REBUILD the mix (needs Python + numpy/scipy); not needed to render
      wav: "videos/niagara-barrel/audio/mix.wav",
      make: "videos/niagara-barrel/audio/make.py",
      timing: "videos/niagara-barrel/audio/timing.json",
    },
  },
};

export const DEFAULTS = {
  baseWidth: 1080, baseHeight: 1920, fps: 30,       // composition size; final = 1440 x 2560 via scale 4/3
  final: { scale: 4 / 3, crf: 16, x264Preset: "medium", chunkFrames: 120, retries: 2 },
  preview: { 540: 0.5, 720: 2 / 3 },                // preview heights -> scale (and WebGL buffer size via post.dpr)
  minFreeGB: 3,                                     // refuse to start below this much free disk
};
