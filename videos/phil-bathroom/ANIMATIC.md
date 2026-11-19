# Phil Won't Stop Using Your Bathroom | Low-res animatic

**Status:** this is the first editorial pass, on the owner-approved visuals (Gate 1b) and narration (voice B). Runtime is **50.43 s (1513 frames at 30 fps)**; the owner approved going past the original 44.7 s. It is a blocking animatic, not final animation.

**Render:** `out/phil-bathroom/animatic.mp4` (360×640 H.264 with the temp mix; not committed, since `out/` is ignored).

## How the cut was fitted

- `remotion/scripts/fit-timing.mjs` reads `narration/words.json` and `narration/script.txt` and writes `remotion/src/timing.json`.
  - Each cut lands 3 frames before the first word of its line. S07 carries two lines: the garage line and "This madness needs to stop!".
  - S16 starts 4 frames before "Time to relax" and keeps its supplied 151 frames, so every reveal cue keeps its local frame:
    - pan: 38–107
    - side-eye: 107–119
    - blink: 126–131
    - fart: 138 (episode frame 1500)
    - black: 146–150 (episode frames 1508–1512)
- Shot choreography is authored on the SHOTLIST.md frame ranges and remapped proportionally into each fitted shot (`shotAt` in `remotion/src/shots.ts`).

| Shot | Frames | Time | Fitted length | Design length |
| --- | --- | --- | ---: | ---: |
| S01 | 0–124 | 0.00–4.13 s | 124 | 108 |
| S02 | 124–205 | 4.13–6.83 s | 81 | 66 |
| S03 | 205–257 | 6.83–8.57 s | 52 | 45 |
| S04 | 257–329 | 8.57–10.97 s | 72 | 65 |
| S05 | 329–416 | 10.97–13.87 s | 87 | 70 |
| S06 | 416–550 | 13.87–18.33 s | 134 | 123 |
| S07 | 550–673 | 18.33–22.43 s | 123 | 120 |
| S08 | 673–746 | 22.43–24.87 s | 73 | 75 |
| S09 | 746–810 | 24.87–27.00 s | 64 | 66 |
| S10 | 810–854 | 27.00–28.47 s | 44 | 54 |
| S11 | 854–930 | 28.47–31.00 s | 76 | 63 |
| S12 | 930–990 | 31.00–33.00 s | 60 | 90 |
| S13 | 990–1163 | 33.00–38.77 s | 173 | 100 |
| S14 | 1163–1265 | 38.77–42.17 s | 102 | 69 |
| S15 | 1265–1362 | 42.17–45.40 s | 97 | 76 |
| S16 | 1362–1513 | 45.40–50.43 s | 151 | 151 |

## Temp mix

`remotion/scripts/mix_animatic.py` builds `assets/audio/mix_animatic.wav`:
- the locked `narration/voice.wav`
- all 42 Codex temp SFX, re-placed onto the fitted cut (placements listed in `assets/audio/mix_animatic_cues.md`)

Levels follow SKILL.md: SFX at −6 dB, voice unchanged. The S16 fart sits at −3 dB and lands on episode frame 1500. There is no music yet. The composition plays the mix with `Html5Audio`.

## Watch for in review (motion-proof gate)

- **S12, the vault:** compressed from 90 to 60 frames to sit on its short line, so it plays fast. It can borrow time from S13 if needed.
- **S13 and S14:** stretched from 100 to 173 and 69 to 102 frames. The three S14 inserts are now about 34 frames each, and their beats are spaced proportionally, not per word.
- **Interpolation:** shot motion is keyed blocking with smootherstep interpolation; there is no secondary motion yet.
- **Sound placement:** SFX positions are proportional estimates; tighten them to contacts after picture lock.

## Regenerate

```bash
cd videos/phil-bathroom/remotion
node scripts/fit-timing.mjs              # after any narration change
python scripts/mix_animatic.py           # numpy + soundfile
npx remotion render src/index.ts PhilShort ../../../out/phil-bathroom/animatic.mp4 --public-dir=../assets --width=360 --height=640 --codec=h264 --crf=26
# On this Linux container, add: --gl=swangle --browser-executable=<chrome-headless-shell> --concurrency=3
```
