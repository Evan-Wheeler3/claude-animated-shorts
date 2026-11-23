# Asset brief template — Claude copies to videos/<story-id>/ASSET-BRIEF.md

Claude writes this at stage 2, after checking what we already have (the bridge template's Kenney kit props,
earlier stories' `assets/`). List **only** what Codex must deliver: 3D props, vehicles, set pieces, environment
meshes. Never characters, water or effects (those are Claude's).

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
| Moving parts | <none / e.g. "lid as separate node named `lid`, pivot at hinge"> |
| Search hints | <e.g. "Kenney pirate kit barrel, Quaternius medieval props"> |

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
Commit and push. Reply with: branch, commit SHA, full checker output, one line per asset (source, licence,
changes), and anything MISSING. Do not build characters, water or effects. Do not touch files outside
videos/<story-id>/assets/. Do not merge.
```

## Acceptance (Claude fills in at stage 3)
| Asset | Checker | In-engine still | Verdict | Notes / fix requested |
|---|---|---|---|---|
| `<asset-id>` | PASS / FAIL | `out/<story-id>/assets/<id>_*.jpg` | ACCEPT / REJECT / FIXED-BY-CLAUDE | |
