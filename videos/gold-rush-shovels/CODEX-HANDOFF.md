# Codex handoff

Branch `codex/gold-rush-shovels` uses the verified `main` base `ea1ffa12e9edb797b9584cb4e85bb382eaf9a4f3`. Use the asset commit containing this file, as reported with the handoff. Owner script approval is recorded in STORY. Asset approval is pending.

## Reproduce the in-engine review

Use a Node project with Remotion 4.0.544, Three.js 0.170.0, React 18, React Three Fiber 8.18, postprocessing 6.36 and React Three Postprocessing 2.19 available in the checkout's module resolution. The cloud checkout reused the installed `/workspace/animated-shorts-runtime/node_modules`.

```sh
node_modules/.bin/tsc --noEmit --skipLibCheck --esModuleInterop --moduleResolution node --target es2022 --module esnext --jsx react-jsx videos/gold-rush-shovels/qa/index.tsx
GOLD_RUSH_CHROMIUM=/usr/bin/chromium node videos/gold-rush-shovels/qa/render.mjs /tmp/gold-rush-review
```

Proofs were rendered on 2026-11-18 in Chromium with SwiftANGLE, using the 1080 × 1920 Remotion composition at half scale. Rendering also checks the counter-rest anchor, planted shovel edge, upper split pivot, clamped drawer travel and nugget floor/wall clearances. The drawer release and landing are discrete poses. Check continuous approach and closure in Claude's motion gate.

## Review notes

- The opening establishes the clean blade and muddy miner. The rerender uses a higher lens so the blade reads against the timber.
- The pan rerender reduced specular glare and replaced the circular film with an irregular pool. The macro makes the nugget distinguishable from pebbles. The outer forearm shows through near the pan rim in the grip still. Adjust the reach arc and review that contact again before approving the pose.
- Both shovel states share a planted blade. The upper shaft is released at the pre-scored 0.43 m joint and retains both grip targets.
- The drawer check confirms the same nugget geometry lands on the tray floor within all four walls. The release still shows the nugget. Brannan’s closing arm obscures the landing from the proof lens. Hold the closing hand outside the silhouette until after the clink in the next stills pass.
- For final animation use a gold insert or tight trade framing, maintain the nugget's actual scale, and review hand overlap as props move. The animation pass owns any water slosh, recoil, loose gravel and audio.

The wider trade still communicates the exchange through the hands and shovel. The gold is too small at phone size, the opening clips the miner’s hat edge, and the shot 04 price overlay still needs scene assembly. A third render pass did not start due to a local Chromium sandbox error, so this commit packages the tested second pass.

See [asset manifest](ASSET-MANIFEST.md) for exact paths, dimensions, controls and image links. See [Claude continuation](CLAUDE-PROMPT.md) for the next review gate.
