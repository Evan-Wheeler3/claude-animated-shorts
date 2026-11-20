import {mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDir = path.resolve(process.argv[2] ?? path.join(root, "../previews"));
const browserExecutable = process.env.PODCAST_CHROME || undefined;
const chromiumOptions = {gl: process.env.PODCAST_GL || "swangle"};
const frames = [[45, "S01-doorbell"], [510, "S04-baby-stand"], [795, "S06-safe"], [1360, "S10-bear"]];
await mkdir(outputDir, {recursive: true});
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  publicDir: path.resolve(root, "../assets"),
});
const composition = await selectComposition({serveUrl, id: "PodcastStills", browserExecutable, chromiumOptions});
for (const [frame, name] of frames) {
  const output = path.join(outputDir, name + ".jpg");
  await renderStill({
    serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 90,
    scale: 0.5, browserExecutable, chromiumOptions, timeoutInMilliseconds: 120000,
  });
  console.log(output);
}
