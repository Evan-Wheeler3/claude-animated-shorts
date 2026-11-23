# Hold Up — Production pipeline (source of truth)

This file wins when another doc disagrees. `SKILL.md` stays the authority on *how* to render the look
(code, look values, gotchas). This file decides *who* does what, *in what order*, and *what must be approved*.

## Roles
| Who | Owns | Never does |
|---|---|---|
| **Owner** | Ideas, every approval gate, merges, publishing | — |
| **Claude** | Planning with the owner, facts, script, shot list, asset brief, the Codex prompt, asset acceptance, characters, water/effects, layout, camera, voice, animation, editing, sound, render, QA | Approve its own work on the owner's behalf |
| **Codex** | Sourcing or modelling the 3D props and set pieces in the asset brief, as GLB files that pass `tools/check-assets.mjs` | Characters, water/effects, scene code, judging its own visual quality, editing outside `videos/<story-id>/assets/` |

Codex cannot render our scene, so it doesn't sign off on looks. Claude accepts assets from quick rough stills in our scene.

**Renders:** everything before the end is a rough: low-res, quick, taken from our actual scene. Full-quality rendering
happens once, at stage 5. The owner sees roughs only in the animatic.

## Stages and gates
Three owner **GATES**: script, animatic, final. Each is a stop. Nothing after it starts until the owner says so in their own words.

### 1. Plan (Claude + owner)
Talk through the idea. Claude checks the facts and proposes a hook, angle and payoff.

### 2. Script package (Claude) → **GATE A: script approved**
Claude writes and commits to `videos/<story-id>/` on `claude/<story-id>`:
- `STORY.md` from `STORY-TEMPLATE.md`, with the sourced fact table
- `SCRIPT.md`: narrator-only lines
- `SHOTLIST.md`: every line attached to its visuals, ~2 pictures per sentence (see Pacing below)
- `ASSET-BRIEF.md` from `ASSET-BRIEF-TEMPLATE.md`: only the props/sets Codex must deliver, after checking what already exists
- `CODEX-PROMPT.md`: one copy-paste block for Codex

The owner approves the script and shot list. Small wording changes later are fine; new beats mean re-approval.

### 3. Assets (Codex → Claude): no owner gate
1. The owner pastes `CODEX-PROMPT.md` into Codex. Codex works on `codex/<story-id>`, delivers GLBs plus
   `assets.json`, runs `node tools/check-assets.mjs videos/<story-id>/assets/assets.json` until it passes,
   commits and pushes, and reports the branch and SHA.
2. Claude merges that branch into its own story branch, re-runs the checker, then drops every asset into our scene
   for a quick rough still: next to a character for scale, and at the closest framing the shot list uses, with our
   ink and lights. Each asset gets **ACCEPT** or **REJECT** with specific reasons (what reads wrong at phone size,
   and the fix). Rejections go back to Codex as a short follow-up prompt. Claude may fix small things itself
   (recolour, pivot, scale). This is Claude's own check; the owner sees the assets in the animatic.

### 4. Animatic (Claude) → **GATE B: animatic approved**
Record the voice and hand-fix `words.json`. Block every shot at final timing: real cameras, layout and the accepted
assets, simple poses, no polish. Render a rough low-res animatic with the voice. Run
`python3 tools/check-pacing.py <words.json> <shots.json>` and fix its flags or justify them in `SHOTLIST.md`.
The owner watches the animatic and approves the edit rhythm, framing and assets. **Pacing is fixed here, where it is cheap.**

### 5. Production (Claude) → **GATE C: final approved**
Animation, effects, character performance, sound, the 1440x2560 render, `short_qa.py`, the verifier pass from `SKILL.md`.
Timing stays as approved at Gate B. If a timing change is needed, say so and show it.
Deliver the MP4. Never upload anywhere without the owner's explicit go-ahead.

### 6. Retrospective (Claude)
`videos/<story-id>/RETRO.md`: what went wrong, what fixed it. Reusable lessons go into this file, `SKILL.md`
or the tools as rules or checks, not just narrative.

## Pacing (defaults, not quotas)
Numbers from `references/reports/editing.md`:
- **Runtime 45-60 s.** A soft target: the story decides. Never pad, never cut a beat the story needs, never squeeze clarity.
- Voice starts within 0.2 s and runs at 3.5-4.0 words/s. No pause over ~0.45 s unless it's a planned beat. The video ends on the last word.
- A new picture every ~1.5-2.5 s: every sentence gets one, most get two.
- No single picture held over ~4.5 s unless it's a continuous reveal or a named comic/suspense hold.
- Every visual payoff lands 0-3 frames before its word.

## Settled rules (where older docs disagreed)
- **Length:** 45-60 s target (the reference channel runs 55-78 s, median 60.5 s; see `research/vasa/`). Script at ~3.7 words/s → ~165-220 words.
- **Holds:** the camera never fully freezes for 4+ frames. A "static hold" means a slow creeping push (0.15-0.35 %/f).
  A dead-still freeze frame only as a named comic beat in the shot list.
- **Characters** are always our 2D toon cards (`toon.ts` / `cast.ts`). Codex never builds characters.
- **No captions or labels,** English, one steady narrator, mix and export as in `SKILL.md`.

## Branches
- Claude: `claude/<story-id>`. Codex: `codex/<story-id>`, touching only `videos/<story-id>/assets/`.
- A handoff always names a branch and a commit SHA. Never assume another branch's work is on main.
- The owner merges to main.

## Honesty rules (all agents)
- Never say a render, test or commit happened unless it did. Show the file or the output.
- "Checker passes" means mechanics are OK, not that the asset looks good.
- If blocked, say exactly what is missing and stop.
