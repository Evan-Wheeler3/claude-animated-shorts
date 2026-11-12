// Final render of a short, with its soundtrack, on a machine with a GPU.
// usage: node scripts/render-final.mjs [compId=WhaleShort] [out=out/whale/whale_2k.mp4] [scale=1.3333]
// 1080x1920 x 1.3333 = 1440x2560 (2K vertical), h264 crf 16, AAC audio from public/<short>/mix.m4a.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [id = "WhaleShort", out = "out/whale/whale_2k.mp4", scale = "1.3333"] = process.argv.slice(2);
const PW = "/opt/pw-browsers/chromium";
const browserExecutable = process.env.CHROME || (fs.existsSync(PW) ? PW : undefined);
const chromiumOptions = { gl: process.env.GL || (fs.existsSync(PW) ? "swangle" : "angle") };
if (!browserExecutable) await ensureBrowser();
fs.mkdirSync(path.dirname(out), { recursive: true });
console.log("bundling ...");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.tsx"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), browserExecutable, chromiumOptions,
  concurrency: process.env.CONCURRENCY ? Number(process.env.CONCURRENCY) : null, timeoutInMilliseconds: 600000, imageFormat: "jpeg", jpegQuality: 95,
  onProgress: ({ renderedFrames, encodedFrames }) => { if (renderedFrames - last >= 60) { last = renderedFrames; console.log(`rendered ${renderedFrames}/${composition.durationInFrames}  encoded ${encodedFrames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`); } } });
console.log("done:", out, ((Date.now() - t0) / 60000).toFixed(1) + " min");
