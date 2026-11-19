# Narration — LOCKED (owner-approved fallback voice B)

**Revision 2026-11-19 (owner note):** the last line now opens with a pause and a sigh. The original take is cut after "…getting in now." and followed by 0.55 s of silence, then a voice-B clone (Qwen3-TTS 1.7B Base, cloned from the first 8 s of the take) of "Ahhh… Time to relax.", placed 3 dB under the narration. The new line is low and slow (about 78 Hz, against about 200 Hz for the old, irritated reading). Total length is 49.6 s. In `words.json`, the sigh is at 45.66 s and "Time to relax" runs 47.28–48.68 s.

**Status:** `voice.wav` is the owner-approved narrator take: Qwen3-TTS 1.7B VoiceDesign "voice B" (a low, lightly gravelly, sardonic late-30s storyteller), reading the approved `SCRIPT.md`. Post-processing:
- every silence over 0.3 s shrunk to 0.22 s (0.6 s kept before "Time to relax")
- 1.18× pitch-preserving tempo
- loudness normalized to −16 LUFS

The format is 48 kHz mono, 46.97 s. This is the fallback the owner approved in place of the enrolled cloned voice.

`words.json` holds word timings from faster-whisper `small.en`. It matches the script at 99.3% (the only diff is "twelve" transcribed as "12"). "Time to relax" starts at 45.52 s, and the take ends at 46.36 s.

**Timing impact:** the take is longer than the original 44.7 s target. With S16 kept intact and starting on "Time to relax", the short runs about 50.5 s. Refitting S01–S15 to these word times is the next step (see below).

---
_Original brief (kept for reference):_

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
