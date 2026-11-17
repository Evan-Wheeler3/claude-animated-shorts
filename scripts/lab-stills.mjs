// Render the CharacterLab QA composition: stills (local frame 40) or motion tests (MP4 of local frames 0..89).
// usage: node scripts/lab-stills.mjs <outDir> <scenarioKey,...|all> [scale] [--motion]
//   env PROPS='{"toon":"v1","snap":false,"glow":"strong","qa":true}' ; TAG=prefix_
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve(".remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderStill, renderMedia, selectComposition } = await import("@remotion/renderer");
const args = process.argv.slice(2), motion = args.includes("--motion"), [outDir, which = "all", scale = "0.5"] = args.filter((a) => a !== "--motion");
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const src = fs.readFileSync("src/videos/lab/labWorld.ts", "utf8");
// scenario keys in order, read from the source so this script never drifts from the lab
const keys = [...src.matchAll(/\{ key: "([a-z_]+)", label/g)].map((m) => m[1]);
const poses = [...src.matchAll(/\["([a-z]+)", "[a-z +]+"\]/g)].map((m) => "pose_" + m[1]);
const order = [keys[0], ...poses, ...keys.slice(1)];
const want = which === "all" ? order : which.split(",");
const inputProps = { ...(Number(scale) < 1 ? { post: { dpr: Number(scale) } } : {}), ...(process.env.PROPS ? JSON.parse(process.env.PROPS) : {}) };
const composition = await selectComposition({ serveUrl, id: "CharacterLab", browserExecutable, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (l.text.startsWith("[QA]")) console.log(l.text); else if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); };
for (const k of want) {
  const i = order.indexOf(k); if (i < 0) { console.log("unknown scenario", k); continue; }
  const t0 = Date.now(), tag = process.env.TAG ?? "";
  if (motion) {
    const output = path.join(outDir, `${tag}${k}.mp4`);
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 20, outputLocation: output, frameRange: [i * 100, i * 100 + 89], scale: Number(scale),
      browserExecutable, chromiumOptions, inputProps, onBrowserLog, concurrency: 2, timeoutInMilliseconds: 600000 });
    console.log("motion", k, ((Date.now() - t0) / 1000).toFixed(0) + "s ->", output);
  } else {
    const output = path.join(outDir, `${tag}${k}.jpg`);
    await renderStill({ composition, serveUrl, frame: i * 100 + 40, output, imageFormat: "jpeg", jpegQuality: 90, scale: Number(scale), browserExecutable, chromiumOptions, inputProps, onBrowserLog, timeoutInMilliseconds: 600000 });
    console.log("still", k, ((Date.now() - t0) / 1000).toFixed(1) + "s ->", output);
  }
}
