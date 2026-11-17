# Hold Up shorts: how to work in this repo

Read before any production work. Details live in the linked files; do not duplicate them here.

## Before starting a new Hold Up video
1. Read `docs/learning/PRODUCTION-LESSONS.md` (reusable lessons) and the latest `videos/*/PRODUCTION-RETROSPECTIVE.md`.
2. Review `docs/learning/CHARACTER-ANATOMY.md` (character construction rules) and `PHYSICS-AND-COLLISIONS.md`.
3. Reuse `src/pipeline/` (toon, cast, ground, sky, water, actors, ink/lens/grade) and validated assets; copy a video
   folder's structure (`src/videos/niagara/`: story.ts, world.ts, crew.ts, <Name>.tsx) for the new short.
4. Review known limitations (retrospectives section 9, PHYSICS-AND-COLLISIONS "Known limitations").
5. Build the set with approved conventions: register ground surfaces, rest props, give characters x/z only, attach hands
   with `toCard`/`ringGrips`, primaries get `glow`.
6. Run checks: `node scripts/audit-props.mjs`, `npx tsc --noEmit`, `node scripts/validate-paths.mjs src/videos/<name>/story.ts`,
   QA stills with `PROPS='{"qa":true}'`, and the CharacterLab (`node scripts/lab-stills.mjs out/lab/x all 0.5`) after any
   change to `src/pipeline/toon.ts`.
7. Render representative stills (`scripts/niagara-stills.mjs` pattern) and inspect them yourself (VISUAL-QA.md).
8. Get the user's visual approval. Do not animate before it.
9. Test critical motion sequences as low-res MP4 proofs; inspect them.
10. Animate and render the full short (SKILL.md pipeline, 1440 x 2560 final).
11. Final QA (VISUAL-QA.md, `scripts/short_qa.py`).
12. Write `videos/<name>/PRODUCTION-RETROSPECTIVE.md` from `docs/learning/VIDEO-RETROSPECTIVE-TEMPLATE.md`; promote
    reusable lessons into `docs/learning/` (no duplicates; link instead).

## Rules
- Preserve the approved look (SKILL.md "Final look values"); fix systems, not single shots.
- Never claim a visual fix without a rendered before/after you have looked at.
- Do not edit `src/pipeline/legacy/` (frozen references for before/after renders) or `templates/` (bridge reference).
- Rendering here is headless software GL: use 0.5 scale for iteration, full scale for deliverables.
