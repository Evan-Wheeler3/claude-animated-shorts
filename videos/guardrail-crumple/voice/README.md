# Narration

**Voice:** the owner's cloned voice, sped up 1.18× for energy (owner direction, 2026-11-22). It comes from Qwen3-TTS voice clone (`make_voice.py`), referenced from `ref_owner_voice.wav`, the first 4.95 s of the owner's cloned-voice Niagara narration (commit `d20aa8e`). The voice, timings and mix are committed, so the Mac only renders: `bash videos/guardrail-crumple/run_mac.sh --render-only`.

**Current take (v3, 2026-11-23):** the v3 script, 11 lines, 28.5 s, 129 words, all heard by the aligner. Same voice and method as the v2 take: generated in the cloud with `make_voice.py` (Qwen3-TTS 0.6B Base on CPU, about 3 min), cloned from the owner's Niagara narration, 1.18×, 35.2 s. All 153 script words were heard by the aligner. Earlier history: the Niagara cloned voice was produced on the owner's Mac (commit `d20aa8e`, same per-line format as `tts.py`); the generating tool isn't in the repo.

| File | What |
|---|---|
| `lines.txt` | The script (SCRIPT.md), one sentence per line, with `[pause s]` beats that are not sped up |
| `make_voice.py` | Qwen3-TTS clone → per-line takes in `takes/`. Each take is sped up 1.18× (ffmpeg `atempo`), trimmed and joined, giving `voice.wav` (48 kHz) and `voice_sents.json`. `--only 4 7` regenerates single lines. |
| `align.py` | faster-whisper `small.en` word times → `words_raw.json` |
| `fit_words.py` | Puts the script's exact words onto those times → `words.json`, which the picture and the mix are cut to |
| `tts.py` | The old Kokoro recipe, kept for the stand-in only |
