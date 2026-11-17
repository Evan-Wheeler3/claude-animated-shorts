# Hold Up — End-to-end production pipeline (source of truth)

**Purpose:** One story folder is the handoff contract between ChatGPT (story/directing), Codex (assets/technical verification), and Claude Code (animation/audio/render). GitHub is the source of truth; chat messages are just commands to read it.

**Existing SKILL.md and the proven Three.js/Remotion look remain authoritative on technical rendering and style.** Also read PROMPTING.md, CAMERA-DIRECTION.md, SHORTS-STORYTELLING.md, references/STYLE_BIBLE.md. Learning/QA files written by production agents should be consulted where they exist; don't assume an optional file exists.

## Directory contract (one folder per story)

```text
videos/<story-id>/
  STORY.md                 # author-owned brief + factual claims + approval (copy STORY-TEMPLATE.md)
  SCRIPT.md                # narrator-only final script; no embedded direction
  SHOTLIST.md              # numbered shots linked to script beats
  ASSET-MANIFEST.md        # exact asset requirements, paths, format, origin, scale, provenance, status
  CODEX-HANDOFF.md         # Codex's next steps, evidence, blockers, Claude ready-state
  CLAUDE-PROMPT.md         # copy/paste Claude continuation prompt
  PRODUCTION-RETROSPECTIVE.md  # lessons after production
  assets/                  # committed source/models/materials; include preview paths/README
  previews/                # selected small review images if appropriate
```

Not every file exists at story inception. **Never falsely claim missing assets or previews are ready**. Large renders and transient caches belong under `out/<story-id>/` and are not automatically committed. Use `videos/niagara-barrel/` as an example of a historical handoff, not as a mandatory template for new stories.

## Phase A — ChatGPT / story author
1. Choose unique lower-kebab-case `story-id` (never reuse another story's folder). Author `STORY.md` using `STORY-TEMPLATE.md`. Put the working title, angle, hook, payoff, planned length, primary characters/setting, factual assertions and source URLs, sources needing verification, production constraints, and explicit approval state.
2. Write `SCRIPT.md` (narrator-only) and `SHOTLIST.md` (one numbered beat per visual, narration anchor, action, camera movement, geography/continuity, sound cue, required assets).
3. When author approves, set `STORY.md` to `script_status: approved` and `codex_status: ready`. **Do not silently auto-approve** a draft.
4. Commit/push these story documents (prefer a story branch/PR, then merge when approved). Provide folder path and story-id. Commit success must be checked, never assumed.

## Phase B — Codex / art + asset production
Trigger: **“Proceed with Codex next steps on <story-id>.”** Read `AGENTS.md` and `CODEX-WORKFLOW.md`. Locate `videos/<story-id>/STORY.md` and `SCRIPT.md`; if not found or ambiguous, stop with exact missing path. Do not ask for a pasted script that is already committed.
1. Inspect story approvals, repo renderer, asset library, prior lessons, and source provenance. Reject unverified claims as settled fact; mark questions for owner/Claude instead of making them up.
2. Build on a fresh `codex/<story-id>` branch based on up-to-date main (unless a specified branch is the agreed integration base). **Never write into another agent's active branch.** Keep changes scoped to story folder + proven reusable modules needed. Coordinate integration if Claude has unmerged changes.
3. List/reuse approved existing assets before modeling. Build only necessary new props/environment assets and character references/rigs compatible with the actual runtime (Three.js/Remotion). Avoid creating a generic 3D model when the renderer expects 2D character cards.
4. For each asset: verify geometry and units, scale, origin/pivot, orientation, materials/ink, usage rights, animation affordances, render loadability. Render actual in-engine previews, not unrelated concept art, from multiple angles; compare with approved in-engine reference stills. Improve until quality meets benchmark, or explicitly mark as BLOCKED. **No “production-ready” based on successful export alone.**
5. Produce `ASSET-MANIFEST.md`, `CODEX-HANDOFF.md`, and a story-specific `CLAUDE-PROMPT.md` referencing paths, limitations, validation results, and owner review gate. Ensure all linked files exist in the committed branch.
6. Run available type/import/smoke checks and rendering/visual QA. Report command, result, date/environment and any limitations. Record reusable lessons and the exact tested commit SHA.
7. Commit/push to Codex branch, create PR for owner review; **do not merge into main without approval** unless owner explicitly asks. Tell owner how to merge or provide specific merged SHA if approved. Output exact Claude copy/paste command and branch/commit to checkout. Do not imply Claude can see unmerged Codex files while checked out on main.

## Phase C — Claude / animation + delivery
Trigger when Codex handoff is committed and the owner approves its visuals. Claude reads `CLAUDE-PROMPT.md`, `STORY.md`, `SCRIPT.md`, `SHOTLIST.md`, `ASSET-MANIFEST.md`, `CODEX-HANDOFF.md`, and existing SKILL.md. **Use the exact branch/SHA holding the assets**; coordinate branches when Codex assets and Claude scene work are not integrated.
1. **Gate 1: preview.** Actual 9:16 stills from the real Remotion/Three.js scene, including hook, main character, hero props, action risk, and ending. Visual inspect anatomy, layering, object grounding, lights and framing. **Stop for owner's approval.**
2. **Gate 2: motion proofs.** After approval, time narration to words, animate critical transitions, check collisions, clipping, camera jitter, foot contacts, water or physics motion as applicable; show short motion proof and correct defects before long final render if risk is material.
3. **Gate 3: final.** Only after applicable approvals, complete narration, mixing, music/SFX and technical/visual QA under SKILL.md. Claude makes the project render-ready (story registered in `render.config.mjs`, mix committed at `public/<story-id>/mix.m4a`, `npm run doctor` READY, 540p previews) and commits it; **the owner renders the final locally** with `npm run render -- --story <story-id>` and QA runs automatically (`LOCAL-RENDERING.md`). A full-length final render in Claude's cloud environment requires the owner's explicit authorization. No YouTube upload without explicit authorization.
4. Write `PRODUCTION-RETROSPECTIVE.md` with verified issues, iterations, fixes, tests, benchmarks and reusable lessons. Update shared lessons/skills only when genuinely reusable. Commit changes on a Claude branch/PR without overwriting concurrent work.

## Quality gates and authority
- **Human owner controls:** story/script approval, art direction, first-stills approval, glow strength, technical/motion acceptance, final video/publishing. An assistant never treats its own enthusiasm as owner approval.
- **Lock approved look:** don't redesign working characters, materials, camera language or environments to fix clipping/physics unless justified and owner approves.
- **Proof over claims:** inspect actual renderer output, distinguish scaffolds from validated final assets; report missing QA honestly.
- **No collision shortcuts:** feet on terrain, correct clothing/hat attachment, characters contacting props, solid objects not intersecting, camera near-plane sanity, believable trajectories.
- **No assumptions about sync:** changes pushed to branch A are not magically present in branch B. Handoff must specify branch and commit SHA.
- **No unwanted repo edits:** only approved story-specific changes; communicate merge/conflict plans first.
- **Postmortem every video:** preserve learnings as code, tests, reusable assets and instructions, not just narrative docs.

## Minimal user commands
**Start here:** “Write and commit a Hold Up package for <story-id> following STORY-TEMPLATE.md and PRODUCTION-PIPELINE.md.” (If using this chat, explicitly authorize repo changes.)

**Codex:** “Proceed with Codex next steps on <story-id>. Follow AGENTS.md / CODEX-WORKFLOW.md. Commit the asset package on your branch, render asset QA, and output the precise Claude handoff and branch/SHA. Do not merge without my approval.”

**Claude:** Paste the verified continuation command printed by Codex after the package is available to Claude. Work only through the approval gate that command authorizes.
