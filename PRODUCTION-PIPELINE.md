# Hold Up — Production pipeline (source of truth)

This file wins when another doc disagrees. `SKILL.md` stays the authority on *how* to render the look
(code, look values, gotchas). This file decides *who* does what, *in what order*, and *what must be approved*.
Lessons behind every rule here: `videos/vasa-warship/RETRO.md`.

## Roles
| Who | Owns | Never does |
|---|---|---|
| **Owner** | Ideas, every approval gate, merges, publishing, final say on claims and hooks | — |
| **Claude** | Planning, research, script, voice, shot list, asset brief + Codex prompts, asset acceptance, look, characters, water/effects, camera, animation, editing, music, QA | Approve its own work on the owner's behalf |
| **Codex** (optional since 2026-11-26) | Only bespoke models the library can't supply (search `assets/library/catalog.json` first); every 3D prop, set piece and background kit in its asset brief, as GLBs that pass `tools/check-assets.mjs` **and** its own `tools/asset-preview` stills | Characters, water/effects, scene code, edits outside `videos/<story-id>/assets/` |

Codex starts the moment the script is approved and works **in parallel** with Claude's voice, look and blocking
work. The more of the world Codex builds (props, ships, buildings, terrain pieces, interiors), the less Claude has
to fake with boxes.

## Rendering rules
- **Cloud (no GPU):** stills and short proofs (≤5 s) only. A still takes seconds; a full low-res render takes ~45 min.
- **Full renders** (animatic proof and final) run on the owner's Mac: `bash videos/<story-id>/run_mac.sh [--proof]`.
  If the owner asks for a cloud render, run it in the background with progress logging on.
- Never render while assets or narration are still changing.

## Stages and gates
Four owner **GATES**. Each is a stop: nothing after it starts until the owner says so in their own words.

### 0. Preflight (Claude, before any work)
- The environment can fetch a source page (e.g. the museum or Wikipedia). If not, ask for network access first.
- The story's Remotion project is copied from `templates/holdup/` (look kit, cards, effects, music, voice tools).

### 1. Plan + research (Claude + owner)
Pitch, then sourced research. Propose the **boldest hook that can be defended**. Flag any risky claim once, plainly;
the owner decides. Owner decisions on unverified claims are recorded in the fact table as `UNVERIFIED: owner decision`.

### 2. Script, heard aloud → **GATE A: script approved**
Claude writes and commits to `videos/<story-id>/`:
- `STORY.md` (sourced fact table), `SCRIPT.md`, `voice/SCRIPT-emphasis.md` (same lines, `*stressed*` words)
- narration in the chosen voice + a first music bed: `voice/voice-and-music-preview.mp3`
  (`tools/voice/gen_voice.py`, `align.py`, `emph_gain.py`, `declick.py` (voice B: silences the TTS "ts" burst at each take start), `check_lines.py` must pass, `templates/holdup/music.py`)
- `SHOTLIST.md`: every line attached to its pictures, ~2 per sentence
- `ASSET-BRIEF.md` + `CODEX-PROMPT.md` (moving parts, sizes, rest poses: see the template)

The owner approves by **listening**, not just reading. Narration rules: `SHORTS-STORYTELLING.md`.
Right after approval: merge the package to `main`, then the owner sends `CODEX-PROMPT.md`.

### 3. Look stills → **GATE B: look approved** (Codex works in parallel)
Claude builds the world with the look kit and renders **six key stills in the final look** (hook frame, hero wide,
character medium, interior/secondary set, the big effect beat, payoff). Codex assets still in flight may appear as
labelled stand-ins. Before building any camera, run `templates/holdup/probe-ship.mjs` (or equivalent) on hero
models: deck heights, mast positions, hull width, part positions. The owner approves colour, water, backgrounds,
characters and mood here, from stills.

### 4. Assets (Codex → Claude): no owner gate
1. Codex delivers on `codex/<story-id>`: GLBs, `assets.json`, checker PASS, `asset-preview` stills it has looked at,
   and the reply template in `AGENTS.md` (branch, SHA, checker output, per-asset notes).
2. Claude merges, re-runs the checker, renders each asset in the scene, and accepts or sends back specific notes.

### 5. Animatic → **GATE C: pacing approved**
Block every shot at final timing in the approved look (word anchors in `remotion/src/anchors.json`). Before the owner
sees anything, Claude:
- renders **one still per shot** as a contact sheet and reviews every frame (blocked subjects, off-frame characters,
  effects under water, empty frames);
- runs `python3 tools/check-pacing.py voice/words.json shots.json --voice voice/voice.wav`.
The owner watches the proof (`run_mac.sh --proof` on the Mac).

### 6. Final → **GATE D: final approved**
Character acting, effects polish, music + mix, `run_mac.sh` final render on the Mac, `short_qa.py`.
Never upload anywhere without the owner's explicit go-ahead.

### 7. Retrospective (Claude)
`videos/<story-id>/RETRO.md`. Every lesson becomes a rule, template field or check in this repo, not just prose.

## Pacing (defaults, not quotas)
Numbers from `references/reports/editing.md`:
- **Runtime 45-60 s.** A soft target: the story decides. Never pad, never cut a beat the story needs, never squeeze clarity.
- Voice starts within 0.2 s and runs at 3.5-4.0 words/s. No pause over ~0.45 s unless it's a planned beat. The video ends on the last word.
- A new picture every ~1.5-2.5 s: every sentence gets one, most get two.
- No single picture held over ~4.5 s unless it's a continuous reveal or a named comic/suspense hold.
- Every visual payoff lands 0-3 frames before its word.

## Settled rules
- **Length:** 45-60 s (the reference channel runs 55-78 s, median 60.5 s; see `research/vasa/`). ~165-220 words.
- **Holds:** the camera never fully freezes for 4+ frames; a hold is a slow creeping push. Freeze frames only as named comic beats.
- **Look v2 (owner-approved 2026-11-26):** `templates/holdup/remotion/src/kit/world.ts` + `costume.ts`. World built from
  `assets/library` (Quaternius + Poly Haven, search `catalog.json`; new packs via `assets/PACKS.md` -> `assets/inbox`),
  approved light rig (low side sun, low HDRI ambient), AO + bloom + ACES, no ink on the world. Reference: `videos/look-test/previews/stills-v4-*`.
- **Characters** are our 2D toon cards (`toon.ts`) in the reference style: `refStyle()` = plain white faces, black stick
  limbs, bold deadpan faces; hats, wigs and clothes from `costume.ts` (fitted to the body). No character cast shadows.
- **Read-along captions ON** (owner 2026-11-25/26): 1-3 words of the current line, Lilita One, white with a dark stroke, SMALL (74 px of 1920) at 22 % above the bottom so they never hide the action; the word being spoken turns yellow (`captionCss`, `captionWord`, `captionActive`, `CAPTION_BOTTOM`). Groups never cross a line so planned pauses stay clean.
- English, one steady narrator: **voice B** (Qwen3-TTS clone of the Phil narrator), solo piano bed ~20 LU under the voice, -14 LUFS.

## Branches
- Claude: one story branch. Codex: `codex/<story-id>`, touching only `videos/<story-id>/assets/`.
- The story package is on `main` before Codex starts. Every handoff names a branch and a commit SHA.
- The owner merges to main.

## Honesty rules (all agents)
- Never say a render, test or commit happened unless it did. Show the file or the output.
- "Checker passes" means mechanics are OK, not that the asset looks good.
- If blocked, say exactly what is missing and stop.
