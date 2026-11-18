// usage: node scripts/stills.mjs <outDir> <frame[,frame...]|keys> [scale=0.5]
// Bundles once and renders real Remotion stills of PhilShort (headless Chromium, WebGL via SwiftShader/ANGLE).
// On the owner's Mac, set PHIL_GL=angle (GPU) and PHIL_CHROME to a Chrome binary if desired.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const [outDir, frameArg = "keys", scale = "0.5"] = process.argv.slice(2);
if (!outDir) throw new Error("usage: node scripts/stills.mjs <outDir> <frames|keys> [scale]");
fs.mkdirSync(outDir, { recursive: true });
const KEYS = { 40: "S01_hook", 535: "S07_garage", 657: "S08_gregory", 782: "S10_gregory-tag", 900: "S12_vault-apex", 1328: "S16_payoff" };
const frames = process.env.COMP && process.env.COMP !== "PhilShort" ? [0] : frameArg === "keys" ? Object.keys(KEYS).map(Number) : frameArg.split(",").map(Number);
const HS = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const inputProps = JSON.parse(process.env.PROPS || "{}");
const chromiumOptions = { gl: process.env.PHIL_GL || "swangle" };
const browserExecutable = process.env.PHIL_CHROME || (fs.existsSync(HS) ? HS : undefined);
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.resolve(root, "../assets") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "PhilShort", inputProps, chromiumOptions, browserExecutable, timeoutInMilliseconds: 180000 });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 4000)); };
for (const f of frames) {
  const t0 = Date.now();
  const name = process.env.NAME ? process.env.NAME : KEYS[f] ? `${KEYS[f]}_f${String(f).padStart(4, "0")}` : `f${String(f).padStart(4, "0")}`;
  const output = path.resolve(outDir, `${name}.png`);
  await renderStill({ composition, serveUrl, frame: f, output, imageFormat: "png", inputProps, scale: Number(scale), chromiumOptions, browserExecutable, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, output, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
