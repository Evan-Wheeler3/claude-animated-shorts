// Dump a story module's timing (shots, word table, named frames) to JSON for the audio build, so sound cues and
// picture share ONE clock. usage: node scripts/story-json.mjs src/videos/<name>/story.ts out.json
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [entry, out] = process.argv.slice(2);
const tmp = path.resolve(".remotion-tmp/story-json.mjs"); fs.mkdirSync(path.dirname(tmp), { recursive: true });
execFileSync("node_modules/.bin/esbuild", [entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${tmp}`, "--log-level=error"]);
const S = await import(tmp + "?" + Date.now());
const data = { FPS: S.FPS, TOTAL: S.TOTAL, shots: S.SHOTS.map((s) => ({ key: s.key, a: s.a, b: s.b })), words: Object.fromEntries(Object.entries(S.W ?? {}).map(([k, v]) => [k, Math.round(v * S.FPS)])) };
for (const [k, v] of Object.entries(S)) if (typeof v === "number" && /^[A-Z_]+$/.test(k)) data[k] = v; else if (Array.isArray(v) && v.every((x) => typeof x === "number") && /^[A-Z_]+$/.test(k)) data[k] = v;
fs.writeFileSync(out, JSON.stringify(data, null, 1)); console.log("wrote", out);
