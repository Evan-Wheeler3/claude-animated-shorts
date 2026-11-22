# Narration

**Voice:** the owner's cloned voice, sped up 1.18× for energy (owner direction, 2026-11-22). It comes from Qwen3-TTS voice clone (`make_voice.py`), referenced from `ref_owner_voice.wav`, the first 4.95 s of the owner's cloned-voice Niagara narration (commit `d20aa8e`). Run it on the Mac with `bash ../run_mac.sh`.

> **Until that run, `voice.wav` and `words.json` are a TEMP timing stand-in.** They are a Kokoro `am_michael` read of the new script, used only to re-time and check the picture in the cloud. Don't publish them.

| File | What |
|---|---|
| `lines.txt` | The script (SCRIPT.md), one sentence per line, with `[pause s]` beats that are not sped up |
| `make_voice.py` | Qwen3-TTS clone → per-line takes in `takes/`. Each take is sped up 1.18× (ffmpeg `atempo`), trimmed and joined, giving `voice.wav` (48 kHz) and `voice_sents.json`. `--only 4 7` regenerates single lines. |
| `align.py` | faster-whisper `small.en` word times → `words_raw.json` |
| `fit_words.py` | Puts the script's exact words onto those times → `words.json`, which the picture and the mix are cut to |
| `tts.py` | The old Kokoro recipe, kept for the stand-in only |
