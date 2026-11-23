# Vasa Remotion project

Remotion 4.0.544 / three 0.169, same setup as the guardrail-crumple project: `remotion.config.ts` serves `../assets`
(the Codex GLBs) as the public dir, resolves three/postprocessing for `templates/bridge` from this folder, and uses the
preinstalled Chromium headless shell with software GL (`swangle`) in the cloud.

```bash
npm ci
./stills.sh VasaAssetCheck /tmp/check 0.5 0 1 2      # stage-3 asset stills (one frame per view, see src/AssetCheck.tsx)
```
