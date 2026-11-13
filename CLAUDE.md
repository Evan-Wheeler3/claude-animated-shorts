# Working notes for Claude

This repo is a Claude skill (`SKILL.md`, `templates/`, `references/`) for making ~70 s vertical cartoon shorts with
three.js inside Remotion, plus a render project (`project/`) holding the shorts made with it.

## Where things are
- `project/src/videos/whale/` — "A Whale of a Deal" (exploding whale, Oregon 1970). Composition `WhaleShort`.
- `project/src/videos/emu/` — "The Great Emu War" (Western Australia 1932). Composition `EmuShort`.
- `project/src/videos/duel/` — "Could You Survive a Western Duel?" (second person, odds counter overlay in `Duel.tsx`,
  values in `story.ts` `ODDS`). Composition `DuelShort`. ~46 s.
- `project/src/videos/bridge/` — the skill's template short, unmodified. It needs Kenney GLB props that are not in the repo.
- `project/shorts/<name>/` — per short: `SCRIPT.md` (facts + sources + script), `voice/` (Kokoro TTS + Whisper word
  timings), `audio/make.py` (synthesized SFX + score + mix).
- `project/public/<name>/mix.m4a` — the soundtrack the composition plays.
- `project/README.md` — render and rebuild commands.

## How a short is put together (per `src/videos/<name>/`)
- `story.ts` — shots (frame ranges), beats, terrain `gy(x, z)`, camera framings `F`, `CAMS`, kicks, depth of field.
  Every frame number comes from the narration word timings in `shorts/<name>/voice/whisper_raw.json` (seconds x 30).
- `cast.ts` — who stands where per shot (`stage()`), expressions, effect cards.
- `world.ts` — the 3D set and per-frame props.
- `toon.ts` — the 2D character drawer (shared; hats, props and splatter were added for these shorts).
- `fxw.ts` / `fxe.ts` / `fxd.ts` — effect drawings and painted textures for the whale / emu / duel shorts.
- `ink.ts`, `lensblur.ts`, `grade.ts`, `shade.ts`, `cardshade.ts`, `lights.ts`, `paint.ts`, `build.ts` — the template's
  look pipeline, reused as is.

## Working agreement with the user
- Claude writes and animates. All video rendering, rough or final, is run by the user on their own computer
  (`npm run render:whale:1080`, `npm run render:emu:1080`, `npm run render:duel:1080` in `project/`). The cloud container has no GPU: a still
  takes ~35 s there and a full video would take about a day.
- Checking single stills is fine: `node scripts/stills.mjs <Comp> out/<name>/x_ <frames> 0.5`, then
  `python scripts/sheet.py sheet.jpg <files>` to view several at once.
- Vertical frames are narrow: at 6 m the frame is only about 2.5 m wide. Keep groups within about 1 m spacing and
  check that every prop near a lens is recognisable or out of frame.
- Characters are camera-facing cards with no back view, so stage shots with the lens in front of faces.
- Development branch: `claude/sleepy-brown-kbctlr`. `main` does not contain `project/`.

## State (2026-11-13)
- Whale and emu shorts are rendered by the user (whale judged best so far). The duel short is built, stills checked,
  not yet rendered. The user prefers shorter shorts (~45-55 s).
- Both earlier shorts render with sound. Stills of every shot were checked; motion and audio have not been
  reviewed by anyone yet. The user is watching the first renders and will send notes.
- Known weak spots: emu target-range shot (gun mostly below frame), whale top-down replay (busy), TTS voice may sound
  flat (`am_michael` at speed 1.32), no look-match scoring rounds against `references/` have been run.
- A wording change means regenerating the voice, re-reading word timings and updating frame numbers in `story.ts`
  and `audio/make.py`.
