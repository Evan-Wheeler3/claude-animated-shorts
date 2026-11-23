# Codex prompt — vasa-warship

**Not to be sent yet.** Paste only after the owner approves the script (GATE A) and `STORY.md` says
`script_status: approved`. Codex is told to stop otherwise.

```text
Deliver assets for vasa-warship.
Read AGENTS.md and videos/vasa-warship/ASSET-BRIEF.md on main (after the Vasa package is merged).
Work on a new branch codex/vasa-warship from main. Deliver exactly these assets: vasa, cannon-24pdr, rowboat,
quay-segment, tre-kronor-castle, barrel, crate, rope-coil, inquiry-table, inquiry-bench, salvage-pontoon-crane.
Source CC0 first (Kenney, Poly Haven, Quaternius, Poly Pizza CC0); CC-BY-4.0 only with a credit line; model only if nothing fits.
Each asset: one self-contained uncompressed GLB in videos/vasa-warship/assets/, metres, +Y up, -Z forward (ship bows
point to -Z), pivot, size, triangle budget, material names and separate moving-part nodes exactly as the brief says.
The vasa hero must have two full rows of gunports per side with separate hinged lids, separate sails, and an
enterable lower gun deck interior. Write videos/vasa-warship/assets/assets.json.
Run: node tools/check-assets.mjs videos/vasa-warship/assets/assets.json and fix the files until every asset passes.
Commit and push. Reply with: branch, commit SHA, full checker output, one line per asset (source, licence,
changes), and anything MISSING. Do not build characters, water or effects. Do not touch files outside
videos/vasa-warship/assets/. Do not merge.
```
