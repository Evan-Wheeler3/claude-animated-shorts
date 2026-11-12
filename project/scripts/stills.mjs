// usage: node scripts/stills.mjs <compId> <outPrefix> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [id, prefix, frames, scale = "0.5"] = process.argv.slice(2);
const PW = "/opt/pw-browsers/chromium"; // cloud containers: bundled Chromium, software GL. Elsewhere Remotion fetches its own browser and uses the GPU.
const browserExecutable = process.env.CHROME || (fs.existsSync(PW) ? PW : undefined);
const chromiumOptions = { gl: process.env.GL || (fs.existsSync(PW) ? "swangle" : "angle") };
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const t = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.tsx"), publicDir: path.resolve("public") });
console.log("bundle", ((Date.now() - t) / 1000).toFixed(1) + "s");
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 400)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog, inputProps });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
