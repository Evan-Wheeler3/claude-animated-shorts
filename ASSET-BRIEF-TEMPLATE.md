# Asset brief template — Claude copies to videos/<story-id>/ASSET-BRIEF.md

Claude writes this at stage 2, with the script, after checking what we already have (earlier stories' `assets/`).
Codex builds **the whole physical world**: hero props and vehicles, set pieces, buildings and town kits, terrain
pieces (cliffs, rocks, docks), interiors and furniture. Claude fakes nothing with boxes that Codex could build.
Never characters, water or effects (those are Claude's).

Every rule below exists because a Vasa asset came back for it (`videos/vasa-warship/RETRO.md` #9).

## Story
- story-id / branch for Codex: `<story-id>` → `codex/<story-id>`
- Setting and period: <place, year, what it should feel like>
- Look: chunky stylised low-poly, clean readable silhouettes, simple flat or painted colours. Black ink is drawn
  on every edge, so avoid fine noisy detail. Our 2D characters are ~1.6-1.8 m tall (adults); size props to match.

## Assets
One block per asset. Size is width (X) × height (Y) × depth (Z) in metres, +Y up, −Z forward = the side that faces the camera most.

### `<asset-id>`
| Field | Value |
|---|---|
| Used in shots | <shot numbers> — closest framing: <insert / close-up / medium / background> |
| What it is | <one line, period-specific> |
| Must read as | <the silhouette or detail the viewer must recognise at phone size, e.g. "individual staves and 4 iron hoops"> |
| Avoid | <looks that would read wrong, e.g. "modern plastic barrel", "reads as a bucket"> |
| Size (m) | X × Y × Z, tolerance ±15 % |
| Pivot | `bottom-center` / `center` |
| Triangle budget | <e.g. 5,000 background / 15,000 hero insert> |
| Materials (named) | <e.g. `wood`, `iron`>: Claude recolours by name |
| Moving parts | <none, or the table below> |
| Part sizes | <sizes of parts a character stands next to, e.g. "gunports 0.9 × 0.9 m (a 1.75 m sailor is taller)"> |
| Tiling | <none / e.g. "tiles along X every 8.00 m exactly, continuous deck, no gaps"> |
| Search hints | <e.g. "Kenney pirate kit barrel, Quaternius medieval props"> |

### Moving parts (one row per group; goes into `assets.json` as `"parts"`, checked by `check-assets.mjs`)
| Node name pattern | Count | Hinge edge (`pivot`) | Rest pose | Opens by rotating | Notes |
|---|---|---|---|---|---|
| `^gunport_lid_port_(lower\|upper)_\d+$` | 30 | `top` | closed, flush (`max_rest_thickness` 0.5) | `+z` (`open: {axis: "z", sign: 1}`) = up and outward | port side |

```json
"parts": [{"pattern": "^gunport_lid_port_(lower|upper)_\\d+$", "count": 30, "pivot": "top", "max_rest_thickness": 0.5, "open": {"axis": "z", "sign": 1}}],
"tile": {"axis": "x", "length": 8}
```

## Common defects (all happened on Vasa; Codex checks for each before delivering)
- Moving parts resting open, or pivoting on the wrong edge (they swing down like shelves).
- Parts the wrong size for a person (2 m gunports on a 1.75 m sailor make a warship look small).
- Containers left open-topped (a crate without a lid reads as an empty frame).
- Tiling pieces that don't meet (a quay reads as floating slabs).
- Detail too fine for black ink outlines (busy geometry turns to scribble at phone size).

## Copy-paste prompt for Codex
Claude fills this into `videos/<story-id>/CODEX-PROMPT.md`. The owner pastes it into Codex.

```text
Deliver assets for <story-id>.
Read AGENTS.md and videos/<story-id>/ASSET-BRIEF.md (branch claude/<story-id> at <sha>, or main if merged).
Work on a new branch codex/<story-id> from main. Deliver exactly these assets: <id list>.
Source CC0 first (Kenney, Poly Haven, Quaternius, Poly Pizza CC0); CC-BY-4.0 only with a credit line; model only if nothing fits.
Each asset: one self-contained uncompressed GLB in videos/<story-id>/assets/, metres, +Y up, -Z forward, pivot,
size, triangle budget and material names exactly as the brief says. Write assets/assets.json.
Run: node tools/check-assets.mjs videos/<story-id>/assets/assets.json — fix files until every asset passes.
Then render previews: cd templates/holdup/remotion && npm ci && ASSETS_DIR=../../../videos/<story-id>/assets ./preview.sh /tmp/preview
Look at every preview against the brief and the Common defects list; fix and re-run until they all read right.
Commit and push. Reply in the AGENTS.md reply format (branch, SHA, checker output, preview notes per asset, MISSING). Do not build characters, water or effects. Do not touch files outside
videos/<story-id>/assets/. Do not merge.
```

## Acceptance (Claude fills in at stage 3)
| Asset | Checker | Rough still (our scene) | Verdict | Notes / fix requested |
|---|---|---|---|---|
| `<asset-id>` | PASS / FAIL | `out/<story-id>/assets/<id>_*.jpg` | ACCEPT / REJECT / FIXED-BY-CLAUDE | |
