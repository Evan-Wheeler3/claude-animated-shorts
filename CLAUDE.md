# Hold Up shorts: Claude entry point

Concise index; the linked files are authoritative. Do not copy them here.

## Read first (in this order)
1. `PRODUCTION-PIPELINE.md`: the ChatGPT (story) -> Codex (assets) -> Claude (animation, audio, render) contract,
   the story-folder layout and the owner's approval gates. `AGENTS.md` / `CODEX-WORKFLOW.md` are Codex's side.
2. `SKILL.md`: rendering standards, look values and the **mandatory production requirements** section.
3. `PROMPTING.md`, `CAMERA-DIRECTION.md`, `SHORTS-STORYTELLING.md`, `references/STYLE_BIBLE.md`.
4. `docs/learning/` (`README.md` is the index): lessons, character anatomy, physics/collisions, camera, visual QA.
5. `assets/ASSET-CATALOG.md`: reuse before building. Shared runtime: `src/pipeline/`; QA stage: `src/videos/lab/`.
6. For the story: `videos/<story-id>/` (STORY.md, SCRIPT.md, SHOTLIST.md, ASSET-MANIFEST.md, CODEX-HANDOFF.md,
   CLAUDE-PROMPT.md, PRODUCTION-RETROSPECTIVE.md) and the previous videos' retrospectives.

## Precedence when instructions disagree
- Owner's explicit message > the story's `CLAUDE-PROMPT.md` / `STORY.md` > `PRODUCTION-PIPELINE.md` (process, gates,
  branches) > `SKILL.md` (technical look) > other guides.
- Runtime: the story's target (STORY.md / SHORTS-STORYTELLING.md, usually 30-45 s) overrides SKILL.md's 55-70 s
  bridge-era default. Captions stay off unless the owner asks.
- Voice: the established narrator is Kokoro ONNX `am_michael` at speed 1.32 with faster-whisper word timings
  (`scripts/voice/`); models download to `models/` (git-ignored).

## Workflow for every video (Claude's part of Phase C)
1. Read the files above; confirm script approval and which branch/SHA holds the story's assets.
2. Reuse `src/pipeline/` and catalogued assets; build only what is missing, and catalogue reusable additions.
3. Build the set with the conventions: registered ground, rested props, x/z-only cards, attachment for contacts,
   primaries `glow: "subtle"`.
4. Run checks: `node scripts/audit-props.mjs`, `npx tsc --noEmit`, `node scripts/validate-paths.mjs <story.ts>`,
   QA stills (`PROPS='{"qa":true}'`), CharacterLab (`node scripts/lab-stills.mjs out/lab/x all 0.5`) after toon changes.
5. Gate 1: real in-engine stills -> inspect -> owner approval. Stop.
6. Gate 2: voice + word timings, animation, low-res motion proofs of risky sequences -> inspect -> fix.
7. Gate 3: sound, final 1440 x 2560 render, `scripts/short_qa.py`, visual QA. No publishing without authorization.
8. Retrospective from `docs/learning/VIDEO-RETROSPECTIVE-TEMPLATE.md`; promote reusable lessons/code/assets.

## Rules
- Preserve the approved look; fix systems, not single shots. Never claim a fix without an inspected render.
- Work on a `claude/...` branch; never write into a Codex branch; open a PR, the owner merges.
- Do not edit `src/pipeline/legacy/` (frozen before/after references) or `templates/` (bridge reference).
- Rendering here is headless software GL: 0.5 scale for iteration, full scale for deliverables.
