# Vasa: retrospective (2026-11-23)

Every avoidable iteration, its root cause, and the repo change that prevents it next time.

| # | What had to be redone | Root cause | Fix now in the repo |
|---|---|---|---|
| 1 | Research ran twice; first pass read only search snippets | Environment network blocked every source site; nobody checked before launching research | Allowlist now has the source hosts. Pipeline stage 0: check a source fetch works before research |
| 2 | Length target changed 30-45 → 45-60 s mid-project | Target set before the reference channel was measured | Target is 45-60 s, measured (`research/vasa/`) |
| 3 | Script rewritten twice after approval | Draft used clipped fragments ("Four sails up. A light breeze."), contractions and jargon ("gunports"); owner only heard it after the animatic | Narration rules in `SHORTS-STORYTELLING.md`; the script gate now includes a **read-aloud** in the chosen voice, with music, before approval |
| 4 | Hook changed by owner ("Sweden's largest warship") | Owner prefers bold hooks; I offered hedged ones | Pipeline: propose the boldest hook that is defensible, flag risk once, owner decides, record owner decisions as `UNVERIFIED: owner decision` |
| 5 | Voice re-recorded 6 times | TTS mispronunciations (So→But, gust→ghost, opened→open, tip→teep) found one by one; emphasis requested late | `tools/voice/check_lines.py` checks every line with medium.en automatically; emphasis marks (`*word*`) are written with the script from the start |
| 6 | Animatic looked "boring, not colourful, water and background dumb" | Look was never developed before blocking: flat Lambert water, box houses, no grade, no DOF | New **look stills gate** before the animatic; reusable look kit `templates/holdup/` (sky, toon water, shore, grade + lens blur, contact shadows, splashes, wind) |
| 7 | 10+ camera fixes (masts blocking, sailors off frame or outside the hull, splashes under water, overhead billboards) | Cameras placed by guess, without ship measurements; I reviewed only some shots | `templates/holdup/probe-ship.mjs` measures decks, masts, hull width, ports first; Claude renders **all** shots as a contact sheet and reviews it before showing the owner |
| 8 | 45-minute cloud renders, two restarted | Full renders in the cloud (no GPU); progress logging off; assets changed mid-render | Rule: in the cloud only stills and ≤5 s proofs; full renders on the owner's Mac (`run_mac.sh`); never render while assets are in flight |
| 9 | 3 of 11 Codex assets sent back | Brief didn't specify rest pose, hinge edge + rotation sign, part size vs a person, seamless tiling, closed objects. Codex could not see its own assets in our look | Brief template now has a **moving parts** table and the common-defects list; `check-assets.mjs` checks part counts, pivot edges and rest-pose flushness; Codex renders `tools/asset-preview` stills of its own assets before delivering |
| 10 | Codex reply lacked branch/SHA; prompt pointed at the wrong branch | Package not on `main` when Codex started; no fixed reply format | Package is merged to `main` before the Codex prompt is sent; `AGENTS.md` has a required reply template |
| 11 | I misread the lid rotation sign and briefly "fixed" a correct asset | Measured a bow lid against the amidships hull width | Asset preview renders the open pose; sign conventions are in the brief and checked |
| 12 | Music requested late | Not in the plan | Music bed is part of the script gate read-aloud (`templates/holdup/music.py`) |
| 13 | Pause metric flagged false dead air | Whisper word gaps overstate silence | `check-pacing.py --voice` measures real silence from the audio |

## What worked
- Word-timed shot anchors (`anchors.json`): rewording re-timed 35 shots in seconds.
- Codex on GLBs + mechanical checker: 8/11 accepted first time, round 2 fixed the rest.
- Stills instead of renders for review: each look iteration took ~2 minutes.
