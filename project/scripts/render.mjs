// usage: node scripts/render.mjs <compId> <out.mp4> <from> <to> [scale] [concurrency]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [id, out, a, b, scale = "1", conc = "2"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.tsx"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps });
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: Number(process.env.CRF || 16), outputLocation: out, frameRange: [Number(a), Number(b)], scale: Number(scale),
  concurrency: Number(conc), browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 600000, imageFormat: "jpeg", jpegQuality: 95,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 1) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
