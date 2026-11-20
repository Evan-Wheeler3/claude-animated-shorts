// usage: node scripts/ep-stills.mjs <outDir> <frame[,frame...]|keys> [scale=0.5]
// Bundles once and renders real Remotion stills of NeighborPodcast (headless Chromium, WebGL via SwiftShader/ANGLE).
// PODCAST_GL (default swangle) and PODCAST_CHROME select the GL backend / browser binary.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const [outDir, frameArg = "keys", scale = "0.5"] = process.argv.slice(2);
if (!outDir) throw new Error("usage: node scripts/ep-stills.mjs <outDir> <frames|keys> [scale]");
fs.mkdirSync(outDir, { recursive: true });
const KEYS = { 45: "S01-doorbell", 340: "S02-bat-lens", 510: "S04-baby-stand", 700: "S05-safe-close", 795: "S06-safe", 1150: "S08-steps", 1300: "S09-bear-sit", 1360: "S10-bear", 1500: "S10-lean" };
const frames = frameArg === "keys" ? Object.keys(KEYS).map(Number) : frameArg.split(",").map(Number);
const HS = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.PODCAST_GL || "swangle" };
const browserExecutable = process.env.PODCAST_CHROME || (fs.existsSync(HS) ? HS : undefined);
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.resolve(root, "../assets") });
const inputProps = { audio: undefined };
const composition = await selectComposition({ serveUrl, id: "NeighborPodcast", inputProps, chromiumOptions, browserExecutable, timeoutInMilliseconds: 180000 });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 2000)); };
for (const f of frames) {
  const t0 = Date.now();
  const name = (KEYS[f] ? `${KEYS[f]}_` : "") + `f${String(f).padStart(4, "0")}`;
  const output = path.resolve(outDir, `${name}.jpg`);
  await renderStill({ composition, serveUrl, frame: f, output, imageFormat: "jpeg", jpegQuality: 88, inputProps, scale: Number(scale), chromiumOptions, browserExecutable, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, output, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
