// Gate-1 preview stills of the U-1206 scene (copy of niagara-stills.mjs) (Remotion + three.js), adapted from templates/scripts/bridge-stills.mjs
// for a Linux / headless container (Playwright's Chromium, SwiftShader GL).
// usage: node scripts/niagara-stills.mjs <outDir> [shotKey,shotKey|all] [scale] [frameOverride]
//   env PROPS='{"qa":true,"glow":"strong"}' adds inputProps; TAG=prefix_ names the files; CAM='{pos,look,fov}' overrides the camera
//   writes <outDir>/<shotKey>.jpg for each shot (A_hook, B_annie, ...) at its SHOTS[].still frame
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve(".remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [outDir = "out/u1206-toilet-disaster/stills", which = "all", scale = "1", frameOverride] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
// shots and their still frames come from the story module itself (bundled with the local esbuild), never a copy
const { execFileSync } = await import("node:child_process");
const storyOut = path.join(tmp, "stills-story.mjs");
execFileSync("node_modules/.bin/esbuild", ["src/videos/u1206/story.ts", "--bundle", "--format=esm", "--platform=node", `--outfile=${storyOut}`, "--log-level=error"]);
const story = await import(storyOut + "?" + Date.now());
const SHOTS = story.SHOTS.map((s) => [s.key, s.still]);
const want = which === "all" ? SHOTS : SHOTS.filter(([k]) => which.split(",").some((w) => k.startsWith(w)));
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundled", ((Date.now() - t0) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id: "U1206Short", browserExecutable, chromiumOptions });
const onBrowserLog = (l) => {
  if (l.text.startsWith("[QA]")) { console.log(l.text); return; }
  if ((l.type === "error" || l.type === "warning") && !/swiftshader|toNonIndexed|GPU stall/i.test(l.text)) console.log(`[${l.type}]`, l.text.slice(0, 400));
};
for (const [key, still] of want) {
  const t1 = Date.now(), frame = frameOverride ? Number(frameOverride) : still;
  const output = path.join(outDir, `${process.env.TAG ?? ""}${key}.jpg`);
  await renderStill({ composition, serveUrl, frame, output, imageFormat: "jpeg", jpegQuality: 92, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000, onBrowserLog,
    inputProps: { ...(Number(scale) < 1 ? { post: { dpr: Number(scale) } } : {}), ...(process.env.CAM ? { cam: JSON.parse(process.env.CAM) } : {}), ...(process.env.PROPS ? JSON.parse(process.env.PROPS) : {}) } });
  console.log("still", key, frame, ((Date.now() - t1) / 1000).toFixed(1) + "s", "->", output);
}
