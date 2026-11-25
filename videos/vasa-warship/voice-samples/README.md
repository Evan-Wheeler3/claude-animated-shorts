# Narrator samples (owner picks one)

Same six script lines (L01, L05-L08, L14) in each voice, paced to ~3.55 words/s with 0.12 s between lines
(reference: 3.5-4.1 words/s, almost no pauses). Generated in the cloud session with **Kokoro-82M v1.0** (ONNX build,
`onnx-community/Kokoro-82M-v1.0-ONNX`, Apache-2.0 licence, so commercial/YouTube use is allowed) via `kokoro-onnx`.
Each sample was transcribed back with faster-whisper `small.en`; all six read the script correctly (the recogniser
heard "Though" for "So" in sample 3 only).

| # | File | Voice | Accent | Kokoro's published grade ([VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)) | Speed setting |
|---|---|---|---|---|---|
| 1 | `1-am_michael.mp3` | am_michael | US male | C+ (target quality B) | 1.24 |
| 2 | `2-am_fenrir.mp3` | am_fenrir | US male | C+ (B) | 1.11 |
| 3 | `3-am_puck.mp3` | am_puck | US male | C+ (B) | 1.05 |
| 4 | `4-bm_george.mp3` | bm_george | UK male | C (B) | 1.27 |
| 5 | `5-bm_fable.mp3` | bm_fable | UK male | C (B) | 1.26 |
| 6 | `6-af_heart.mp3` | af_heart | US female | A (Kokoro's best-graded voice) | 1.10 |

Shortlisted from 13 generated voices by Kokoro's published grades: the six other male voices are graded D or lower.
The reference channel uses one male narrator; the female voice is included because it is the best-graded voice.
