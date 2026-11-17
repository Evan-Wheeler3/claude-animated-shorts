// Gate-1 preview stills of the real Niagara scene (Remotion + three.js), adapted from templates/scripts/bridge-stills.mjs
// for a Linux / headless container (Playwright's Chromium, SwiftShader GL).
// usage: node scripts/niagara-stills.mjs <outDir> [shotKey,shotKey|all] [scale] [frameOverride]
//   writes <outDir>/<shotKey>.jpg for each shot (A_hook, B_annie, ...) at its SHOTS[].still frame
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || path.resolve(".remotion-tmp");
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [outDir = "out/niagara-barrel/previews", which = "all", scale = "1", frameOverride] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const SHOTS = [["A_hook", 40], ["B_annie", 200], ["C_barrel", 330], ["D_cat", 500], ["E_plunge", 720], ["F_rescue", 940], ["G_purse", 1150]];
const want = which === "all" ? SHOTS : SHOTS.filter(([k]) => which.split(",").some((w) => k.startsWith(w)));
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundled", ((Date.now() - t0) / 1000).toFixed(1) + "s");
const composition = await selectComposition({ serveUrl, id: "NiagaraShort", browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 400)); };
for (const [key, still] of want) {
  const t1 = Date.now(), frame = frameOverride ? Number(frameOverride) : still;
  const output = path.join(outDir, `${process.env.TAG ?? ""}${key}.jpg`);
  await renderStill({ composition, serveUrl, frame, output, imageFormat: "jpeg", jpegQuality: 92, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000, onBrowserLog,
    inputProps: { ...(Number(scale) < 1 ? { post: { dpr: Number(scale) } } : {}), ...(process.env.CAM ? { cam: JSON.parse(process.env.CAM) } : {}) } });
  console.log("still", key, frame, ((Date.now() - t1) / 1000).toFixed(1) + "s", "->", output);
}
