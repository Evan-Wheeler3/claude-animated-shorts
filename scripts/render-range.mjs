// Render a frame range of any composition to MP4 (motion proofs, chunks of a final render).
// usage: node scripts/render-range.mjs <CompositionId> <from> <to> <out.mp4> [scale=0.5] [concurrency=2]
//   env PROPS='{...}' adds inputProps. Audio: none (mux the final mix separately).
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve(".remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const [id, from, to, out, scale = "0.5", conc = "2"] = process.argv.slice(2);
fs.mkdirSync(path.dirname(out), { recursive: true });
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const inputProps = { ...(Number(scale) < 1 ? { post: { dpr: Number(scale) } } : {}), ...(process.env.PROPS ? JSON.parse(process.env.PROPS) : {}) };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps });
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: Number(process.env.CRF ?? 18), outputLocation: out, frameRange: [Number(from), Number(to)], scale: Number(scale),
  browserExecutable, chromiumOptions, inputProps, concurrency: Number(conc), timeoutInMilliseconds: 900000, muted: process.env.MUTED === "1", // compositions with an <Audio> track render with sound; MUTED=1 for silent chunks
  onBrowserLog: (l) => { if (l.text.startsWith("[QA]") && !l.text.endsWith("clean")) console.log(l.text); },
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 25) { last = renderedFrames; console.log(`frames ${renderedFrames} ${((Date.now() - t0) / 1000).toFixed(0)}s`); } } });
console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");
