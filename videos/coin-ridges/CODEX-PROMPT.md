# Codex prompt: coin-ridges

**Do not send yet.** Paste this into Codex only after GATE A is approved and this package is merged to `main`
(Codex refuses until `script_status` in `STORY.md` is `approved`).

```text
Deliver assets for coin-ridges.
Read AGENTS.md and videos/coin-ridges/ASSET-BRIEF.md on main.
Work on a new branch codex/coin-ridges from main. Deliver exactly these assets: coin-modern-quarter, coin-hammered,
coin-milled, straight-razor, shaving-brush, shaving-mug, clipping-shears, crucible, silver-ingot, workbench, candle,
screw-press, mint-interior, mint-furnace, tower-mint-exterior, market-stall, interrogation-table, courtroom-bench,
gallows, apple, modern-table.
Source CC0 first (Kenney, Poly Haven, Quaternius, Poly Pizza CC0); CC-BY-4.0 only with a credit line; model only if nothing fits.
Each asset: one self-contained uncompressed GLB in videos/coin-ridges/assets/, metres, +Y up, -Z forward, pivot,
size, triangle budget, material names and separate moving-part nodes exactly as the brief says.
Coins are filmed in extreme close-up: real size, but chunky countable detail (about 60 big reeds on the quarter,
a chunky edge pattern on coin-milled), and no real-world coin artwork or text. coin-hammered needs a separate flush
"sliver" node and coin-milled a separate flush "bite" node. clipping-shears and screw-press have moving parts.
Write videos/coin-ridges/assets/assets.json.
Run: node tools/check-assets.mjs videos/coin-ridges/assets/assets.json and fix the files until every asset passes.
Then render previews: cd templates/holdup/remotion && npm ci && ASSETS_DIR=../../../videos/coin-ridges/assets ./preview.sh /tmp/preview
Look at every preview against the brief and its Common defects list; fix and re-run until they all read right.
Commit and push. Reply in the AGENTS.md reply format (branch, SHA, checker output, preview notes per asset,
MISSING). Do not build characters, water or effects. Do not touch files outside videos/coin-ridges/assets/.
Do not merge.
```
