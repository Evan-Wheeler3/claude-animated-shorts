# Vasa Remotion project

Remotion 4.0.544 / three 0.169, same setup as the guardrail-crumple project: `remotion.config.ts` serves `../assets`
(the Codex GLBs) as the public dir, resolves three/postprocessing for `templates/bridge` from this folder, and uses the
preinstalled Chromium headless shell with software GL (`swangle`) in the cloud.

```bash
npm ci
./stills.sh VasaAssetCheck /tmp/check 0.5 0 1 2      # stage-3 asset stills (one frame per view, see src/AssetCheck.tsx)
```

## Final render (owner's Mac, GPU)
```bash
bash videos/vasa-warship/run_mac.sh            # 1440x2560 final + 720p copy -> videos/vasa-warship/previews/final/
bash videos/vasa-warship/run_mac.sh --proof    # quick 540x960 motion proof
```
Composition `VasaShort` (same as `VasaAnimatic`). Picture timing comes from `../voice/words.json` + `src/anchors.json`;
the committed mix `../audio/mix.m4a` (narration + music, -14 LUFS) is muxed on.
