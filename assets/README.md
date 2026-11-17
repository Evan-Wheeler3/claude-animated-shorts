# Hold Up shared asset library

**Rule: search this library -> reuse or adapt -> create new only when nothing fits.** Every asset is listed in
`ASSET-CATALOG.md` with its path, scale, pivot, status and preview. Claude and Codex consult the catalog before
building anything; when you add or promote an asset, add its catalog row and an in-engine preview in `previews/`.

| Folder | What lives there |
|---|---|
| `props/` | `holdup-props.js`: procedural Three.js props (named materials, metres, Y up, origin at the base centre) |
| `characters/` | catalog of the 2D card cast (code in `src/pipeline/toon.ts`): builds, outfits, hats, poses, expressions |
| `environments/` | reusable set pieces and test stages (code in `src/pipeline/` and `src/videos/lab/`) |
| `materials/` | painted-texture and shading recipes (code in `src/pipeline/paint.ts`, `props3d.ts`, `water.ts`, `lights.ts`) |
| `effects/` | 2D effect cards and mist/spray (code in `src/pipeline/effects.ts`, `toon.ts` fx*) |
| `previews/` | in-engine renders used by the catalog (real pipeline renders, never concept art) |

Code assets stay where the runtime imports them (`src/pipeline/`); the folders here hold the catalog entries and notes
so nothing is duplicated. Story-specific assets stay in `videos/<story-id>/assets/` (e.g. the Niagara falls blockout).
Checks: `node scripts/audit-props.mjs` (geometry), the CharacterLab (`node scripts/lab-stills.mjs ... catalog_props`).
