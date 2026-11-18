# Narration — BLOCKED on the owner's enrolled voice

The narrator take must come from the owner's enrolled Qwen3-TTS voice. That voice reference, the TTS setup and the owner's machine were **not available** to the cloud session that built Gate 1: the repo has no voice sample or TTS workflow files, and no computer was attached. **No narration has been generated.** No substitute voice was used.

## Input (ready)

- `script.txt` holds the narrator text, copied verbatim from `../SCRIPT.md`: 132 words, one line per beat.
- Delivery follows `../DIRECTION.md` → *Voice and audio*:
  - Brisk and natural throughout.
  - The first line sounds like an annoyed friend confessing something.
  - "Detroit" and "The dog's name is now Gregory" stay dry.
  - "This madness needs to stop!" is the only spike.
  - The fortress list is three short, confident hits.
  - "Time to relax" is quiet, with real relief.

## Expected outputs (place here)

| File | Contents |
| --- | --- |
| `voice.wav` | 48 kHz mono, owner voice, one take |
| `words.json` | Word timings, `[{ "word": "...", "start": s, "end": s }, ...]`, from any word-level aligner |

## After the take exists

1. Hand-check `words.json`.
2. Refit `from`/`to` per shot in `../remotion/src/shots.ts` to the narrator anchors in `../SHOTLIST.md`.
3. Move S16 as one block. Never change `REVEAL_CUES`: the fart stays at S16 local 138, and black runs from local 146.
4. "Time to relax" must finish inside S16 local 0–37 (the bath-only hold).
5. If the line runs long, shift the S16 start earlier rather than stretching the pan.
6. Re-render the key stills, then the low-res animatic. Sound design comes after picture timing is locked.
