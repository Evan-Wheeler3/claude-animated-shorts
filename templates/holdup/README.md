# Hold Up starter kit

Everything the Vasa short had to invent, ready for the next story (lessons: `videos/vasa-warship/RETRO.md`).

| Path | What it is | Who uses it |
|---|---|---|
| `remotion/` | Remotion 4.0.544 / three 0.169 project that renders in the cloud (software GL) and on the Mac (GPU). Public dir = `ASSETS_DIR` | Claude (copy per story), Codex (asset preview) |
| `remotion/src/kit/look.ts` | Sky dome (bridge palettes), painted clouds, stylised toon water (crests, glints, hull foam, fog), shoreline with painted houses, cliffs, trees, church | Claude |
| `remotion/src/kit/cards.ts` | Toon character/fx cards with contact shadows, camera-facing; splash and wind-streak effects; Lambert conversion | Claude |
| `remotion/src/kit/post.ts` | Ink → lens blur → tone map + grade chain; `dofFor()` | Claude |
| `remotion/src/AssetPreview.tsx` + `preview.sh` | 3 views per asset (three-quarter with a 1.75 m sailor, side, moving parts opened) + contact sheet | **Codex before delivering**, Claude at acceptance |
| `probe-model.mjs` | Measures a hero model: walkable decks, masts/posts, half-width along the length, named parts | Claude before placing any camera or character |
| `music_example.py` | Original subtle score + ducking + -14 LUFS limiter (Vasa), to re-section per story | Claude |
| `run_mac.sh` | Final / proof render on the owner's Mac + mux + QA | Owner |

## Start a new story
```bash
cp -r templates/holdup/remotion videos/<story-id>/remotion
cp templates/holdup/run_mac.sh videos/<story-id>/run_mac.sh                # set COMP
mkdir -p videos/<story-id>/audio && cp templates/holdup/music_example.py videos/<story-id>/audio/music.py
cd videos/<story-id>/remotion && npm ci
```
In the copy, kit imports change from `../../../bridge/...` to `../../../../templates/bridge/...` (one level deeper),
and `remotion.config.ts` serves `../assets` by default. Add the story composition to `src/Root.tsx`; time shots with
word anchors (`videos/vasa-warship/remotion/src/anchors.json` + `story.ts` show the pattern).

## Asset preview (Codex runs this)
```bash
cd templates/holdup/remotion && npm ci
ASSETS_DIR=../../../videos/<story-id>/assets ./preview.sh /tmp/preview 0.4
```
Look at every view: scale against the sailor, closed/complete objects, parts opening the right way, no gaps.
