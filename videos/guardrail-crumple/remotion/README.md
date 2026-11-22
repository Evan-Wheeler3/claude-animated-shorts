# Guardrail Remotion project

A self-contained Remotion 4.0.544 / three 0.169 project for this story. `remotion.config.ts` serves `../assets` as the public directory. It resolves `three` and `postprocessing` for `templates/bridge` from this folder's `node_modules`, and it uses the preinstalled Chromium headless shell with software GL (`swangle`).

```bash
npm ci
./stills.sh /tmp/st 0.5 0 230 500 880 1150                     # review stills at 540x960
npx remotion bundle src/index.ts --out-dir /tmp/bundle
npx remotion render /tmp/bundle GuardrailShort out.mp4 --width=1440 --height=2560 \
  --concurrency=4 --timeout=300000 --codec=h264 --crf=16 --muted  # final picture, ~7 s/frame on 4 CPUs
ffmpeg -i out.mp4 -i ../audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k final.mp4
```

Use `--width/--height` rather than `--scale 1.3333`. The scale gives a fractional 2559.99 px height, and the stitcher refuses it. The renderer draws at `devicePixelRatio`, so `--scale 0.5` proofs are rendered at 540x960, not downscaled.

- `src/story.ts` holds the shot table, word-timed beats and every motion curve (side hit, hook, old-end spear, the terminal's travel profile).
- `src/Guardrail.tsx` holds the world, the per-shot staging and cameras, and the post chain: ink, lens blur, bloom, NEUTRAL tone map, then the grade at 0.55.
- `src/extrusion.ts` holds the extruded ribbon (W-beam → throat → flat strip → coil, length = head travel), the post knock-down and the post pop-up.
- `scripts/timing.mts` exports the picture timing for `../audio/make.py`.
- `CarLook.tsx` is the sedan look check.
