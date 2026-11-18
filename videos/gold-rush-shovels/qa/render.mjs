import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const names = ["opening-slap", "pan-close-up", "nugget-in-gravel", "counter-trade",
  "shovel-before", "shovel-broken", "drawer-release", "drawer-landed", "creek-cast", "shop-overview"];
const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(process.argv[2] ?? path.join(here, "../previews"));
const selected = process.argv.slice(3);
for (const name of selected) if (!names.includes(name)) throw new Error(`Unknown proof: ${name}`);
await mkdir(output, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(here, "index.tsx"), publicDir: path.join(here, "no-public"), enableCaching: false });
const browserExecutable = process.env.GOLD_RUSH_CHROMIUM;
const chromiumOptions = { gl: "swangle" };
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions });
try {
  const composition = await selectComposition({
    serveUrl, id: "GoldRushAssetProofs", puppeteerInstance: browser, timeoutInMilliseconds: 120000,
  });
  for (const [frame, name] of names.entries()) {
    if (selected.length && !selected.includes(name)) continue;
    await renderStill({
      serveUrl, composition, puppeteerInstance: browser, frame, scale: .5, imageFormat: "jpeg",
      jpegQuality: 89, output: path.join(output, `${name}.jpg`), timeoutInMilliseconds: 120000,
    });
    console.log(`Rendered ${name}`);
  }
} finally {
  await browser.close({ silent: true });
}
