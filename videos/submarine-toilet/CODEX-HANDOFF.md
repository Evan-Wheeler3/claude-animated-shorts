# Codex handoff — blocked work in progress

Base: owner approved `93f2dbeeb2d74d85a0994e68519837bf945bad19` from Claude's Niagara branch. Work is isolated on `codex/submarine-toilet`; no changes to Claude's branch or Niagara files. Resolve the exact work commit with `git rev-parse HEAD` after checkout; a commit cannot contain its own SHA. Do not merge without owner approval.

Implemented: preliminary procedural exterior, toilet and removable-wall compartment; separate QA-only Remotion composition at `src/videos/submarine-toilet/` and `scripts/submarine-stills.mjs`. Four actual in-engine stills under `previews/`. No story animation, script, or shot list. See manifest for status and gaps.

Validation on 2026-11-17: `npx tsc --noEmit` passed. `node scripts/submarine-stills.mjs` rendered all four JPEGs with system Chromium and software GL after sandbox blocked Chromium's crashpad; the successful run required elevated execution. Visually inspected at 540 × 960: objects load and scale card is grounded, but model quality, historical fidelity, detailed mechanism, textures, practical cutaway, lighting, composition and QA fail the requested standard. The preview character is an anachronistic scale proxy. Exterior framing is very small; room shadows are dark. These previews are diagnostic, not a request to approve assets. No geometry audit or motion/contact test has passed.

Network reference request to uboat.net returned HTTP 403. Obtain accessible sources, research proportions and mechanism, rebuild models as needed, provide materials/textures, section view and working character interaction, then run geometric audits and render/inspect hero, detail, section and staging stills from multiple angles. Compare against Niagara renders and obtain owner approval. Draft script and missing SCRIPT.md / SHOTLIST.md are separate blockers to production. Do not start animation. No claim is made that this branch is available to Claude until it is pushed or checked out explicitly.

## Subsequent iteration

Accessible references were found and recorded in the manifest. An original generated metal finish, simplified deck and casing detail, and an illustrative section have been added; all four stills were rerendered and inspected with the same command. `npx tsc --noEmit` and `node scripts/audit-submarine.mjs` passed; the latter checks only finite attributes and bounds, not complete geometry quality. The new section's foreground rings obscure the set, and neither its staging nor the exterior meets the requested quality bar. The toilet remains speculative. These are still work-in-progress; do not commence Claude animation from this package. Once production assets and verified approved story/shot list exist, use CLAUDE-PROMPT.md and the staged preview/approval gates there.

## Owner direction, latest

The owner explicitly waived historical accuracy for the visual assets. Do not block art work on verifying the exact historical hull or plumbing. Maintain a clear distinction between stylized visual mechanism and factual claims in a future script. The owner has not approved the final assets, script, or shot list. Latest stills have brighter interior lighting, a larger exterior, and an unobstructed schematic section; they remain insufficiently detailed for production. `water-surface` is a hidden static mesh, not a finished effect.

## Expanded set and effects review

The owner requested the supporting ocean, water, fish and interiors. Added `assets/support.js`, `src/videos/submarine-toilet/cast.ts` and the corresponding preview scenes. See manifest for exact functions, previews and limitations. Actual Remotion stills: exterior, toilet, section, character staging, ocean, underwater, control room, flood and battery room. `npx tsc --noEmit` and finite/bounds audit passed. Visual inspection found flat ocean, schematic interiors and an opaque slab of flood water; no animation, sinking proof, collision or hand-contact checks were performed. Gas, functioning opening hatch/corridor and polished transitions are absent. Continue asset work before handing off animation. The script and shot list remain missing/unapproved. Owner's historical-accuracy waiver remains in force for visuals.

## Crew cap adjustment

The owner found the cap bills confusing. The captain and crew now use the opt-in `subcap` watch cap in `src/pipeline/toon.ts`: a folded band with no projecting bill. Only the new preset is selected by the story outfits. Regenerated `staging.jpg`, `control-room.jpg` and `flood.jpg` through Remotion. `npx tsc --noEmit` passed; the existing `hats_a` and `hats_b` lab stills rendered pixel-identically to `out/lab/compare/after_hats_a.jpg` and `after_hats_b.jpg`. This does not constitute full pose/motion QA or owner approval of the other assets.
