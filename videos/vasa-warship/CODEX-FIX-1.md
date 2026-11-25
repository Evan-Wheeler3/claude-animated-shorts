# Codex follow-up 1 — vasa-warship (from Claude's in-engine check)

Stills: `videos/vasa-warship/previews/asset-check/` on branch `claude/nice-hamilton-t80o5e` (or main once merged).

```text
Fix three assets for vasa-warship on your branch codex/vasa-warship. Read AGENTS.md and the "Acceptance (round 1)"
table in videos/vasa-warship/ASSET-BRIEF.md on branch claude/nice-hamilton-t80o5e (stills in videos/vasa-warship/previews/asset-check/). Change only these files and assets.json:
1. vasa.glb — gunport lids: (a) rest pose CLOSED flush with the hull (they currently rest ~20° open); (b) move every
   gunport_lid_* node's origin onto its TOP hinge line so rotation.z swings the lid up and outward (port +z, starboard -z);
   it currently pivots on the bottom edge; (c) make the ports about 0.9 x 0.9 m with lids to match (they are ~2 m tall now,
   taller than a 1.75 m sailor). Keep both rows, 15 per row per side, names unchanged, and everything else as is.
2. quay-segment.glb — one continuous planked deck covering the full 8 x 4 m top so segments tile seamlessly along X
   (it currently reads as separate slabs with gaps); posts with stone shoes underneath; bollard on the water edge; deck top at y = 2.5.
3. crate.glb — closed crate with a planked lid.
Run node tools/check-assets.mjs videos/vasa-warship/assets/assets.json until all PASS. Commit, push, and reply with the
branch, commit SHA, checker output, and one line per changed asset. Do not merge.
```
