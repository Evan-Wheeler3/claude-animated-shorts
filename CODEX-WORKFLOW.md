# Codex workflow — asset production / QA / Claude handoff

Invoke with: **Proceed with Codex next steps on <story-id>.**

## Intake
1. Read `AGENTS.md`, `PRODUCTION-PIPELINE.md`, `STORY-TEMPLATE.md`, root `SKILL.md` and current learning docs (if any).
2. Open `videos/<story-id>/STORY.md`, `SCRIPT.md`, `SHOTLIST.md`. Missing files or `script_status != approved` → stop, list exact blockers, request owner approval. Do not fabricate.
3. Examine current branch and latest main; determine whether Claude's changes are on another branch. If story depends on Claude's unmerged engine code, explicitly choose an integration base with the owner and document it. Never silently overwrite/mix work.
4. Make asset inventory: reused asset IDs, new required IDs, special rig/material/physics needs. Plan test renders.

## Modeling quality contract
- Prefer existing 2D toon-card rig for characters, 3D models for props/sets, unless story-specific reasons justify exceptions.
- Research proportion/period/shape using legal references; avoid unlicensed reference imports or copying protected media.
- Build robust watertight/appropriate geometry, normals, clean UV/materials, distinct readable silhouette, purposeful detail at phone size, believable weathering where appropriate.
- Define world coordinate system, meters/unit, orientation and forward axis, bounds, contact surfaces, pivot/animation anchors, color/materials, ink compatibility, dependencies and runtime paths.
- Reuse code/materials without breaking existing scenes. Check performance and geometry costs.

## QA / iteration gate
- Actually import/load asset in target Three.js/Remotion environment.
- Render front/three-quarter/side/detail plus in-scene scale shot; lighting consistent with approved Hold Up look. A standalone Matplotlib preview **is not equivalent to an in-engine production preview**.
- Review at phone size: silhouettes, hands and props contact, sleeves/hat/waist fit, clipping, outline continuity, contact shadows, no floating, no backwards faces, scene scale, lighting, file availability.
- Fix defects and re-render. Mark status `ready`, `review-needed`, or `blocked` truthfully. For hero assets, obtain owner approval rather than just code-validation.
- Build reusable QA scripts/tests when practical and preserve meaningful lessons.

## Required handoff outputs
1. `videos/<story-id>/ASSET-MANIFEST.md`: table ID / role / exact path / format / reuse or new / scale-pivot / preview path / status / source-license / notes.
2. `videos/<story-id>/CODEX-HANDOFF.md`: current branch, commit SHA, exact implemented changes, commands run and outcomes, in-engine renders checked, unresolved issues, owner decisions required, Claude's starting branch/SHA.
3. `videos/<story-id>/CLAUDE-PROMPT.md`: self-contained continuation instructions that reference script, shots, manifest, existing skill/style and **explicit approval gates**. Identify assets that exist and ones not yet created; specify what Claude must finish and what not to redesign.
4. Commit tests/previews/docs/assets appropriate to repository size; place bulky render outputs in `out/` (not commit by default).

## Git / delivery
- Commit on own branch; push; open PR to proposed integration base. Do not merge automatically.
- Cross-check actual GitHub file paths/commit SHA on remote. If not synced, handoff is BLOCKED.
- Output one literal copy/paste command:
  ```text
  On branch <branch> at commit <sha> (or after PR #<n> is merged), read AGENTS.md, PRODUCTION-PIPELINE.md, SKILL.md and videos/<story-id>/CLAUDE-PROMPT.md. Verify SCRIPT.md, SHOTLIST.md, ASSET-MANIFEST.md and CODEX-HANDOFF.md exist. Execute only the next owner-authorized gate; render real in-engine stills and stop for owner review. Do not redesign approved assets or start full animation without approval.
  ```
- Never write that Claude can proceed if files are available only on a branch Claude has not checked out. The user controls stage gates and merges.
