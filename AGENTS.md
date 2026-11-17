# Codex repository instructions — Hold Up

This is an **agent entry point**. Read `PRODUCTION-PIPELINE.md` and `CODEX-WORKFLOW.md` before working on a story. Read `SKILL.md`, `PROMPTING.md`, `references/STYLE_BIBLE.md` and current `docs/learning/*` if present.

When the owner says **“Proceed with Codex next steps on <story-id>”**, find `videos/<story-id>/STORY.md` and follow the exact workflow. **Do not ask the owner to paste a story already in the repo.** Confirm its script/shot list and approved status. Never guess a story-id.

Keep the established 2D-character-in-3D-world style and Three.js/Remotion implementation. No incidental redesign, unrequested migration, replacing proven look code, or collateral edits to active Claude work.

For new models: plan → source/reference → model → actual in-engine stills → inspect → revise → quality approve → commit. Don't equate a rough mesh with an approved production asset. Record file format, pivot, units, scale, placement, materials, runtime integration and licensing. When necessary create repeatable automated geometry and visual QA.

Use separate `codex/<story-id>` branch, commit/push deliverables, prepare PR for review; owner decides merge. **Do not edit Claude's active branch or assume main includes its unmerged work.**

Outputs: actual committed assets + `ASSET-MANIFEST.md`, `CODEX-HANDOFF.md`, `CLAUDE-PROMPT.md`, rendered QA previews, exact branch/SHA and one copyable Claude continuation command. Flag missing assets or failed renders as blockers. Do not launch full video production without owner's approval.

If no code runtime/repo access is available, state precisely what couldn't be done; never pretend commits, renders or tests happened.
