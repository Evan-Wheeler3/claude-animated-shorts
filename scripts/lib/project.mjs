// Project plumbing for scripts/holdup.mjs: the story registry, the story's timing (bundled with the local esbuild),
// a content-hashed Remotion bundle cache (one bundle per code/asset state, reused by every command), the browser and
// GL choice per platform, disk checks. Everything resolves relative to the repo root.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { STORIES, DEFAULTS } from "../../render.config.mjs";

export { STORIES, DEFAULTS };
export const ROOT = path.resolve(".");
export const CACHE = path.join(ROOT, ".cache");
// keep Remotion / Chromium temp files inside the repo (predictable, easy to clean): never the system temp
const TMP = path.join(CACHE, "tmp"); fs.mkdirSync(TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;

export class UserError extends Error {}
export const fail = (msg) => { throw new UserError(msg); };

export const getStory = (id) => {
  if (!id) fail(`--story is required. Registered stories: ${Object.keys(STORIES).join(", ")}`);
  const s = STORIES[id];
  if (!s) fail(`Unknown story "${id}". Registered in render.config.mjs: ${Object.keys(STORIES).join(", ")}`);
  return { id, ...s };
};

/** the story module's SHOTS / TOTAL / FPS, compiled with the local esbuild (no browser needed) */
export const loadTiming = async (story) => {
  const out = path.join(CACHE, "story", `${story.id}.mjs`); fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(path.join(ROOT, "node_modules/.bin/esbuild"), [story.story, "--bundle", "--format=esm", "--platform=node", `--outfile=${out}`, "--log-level=error"]);
  const S = await import(out + "?" + Date.now());
  return { total: S.TOTAL, fps: S.FPS ?? DEFAULTS.fps, shots: S.SHOTS.map((s) => ({ key: s.key, a: s.a, b: s.b, still: s.still })) };
};

const walk = (dir, out = []) => { if (!fs.existsSync(dir)) return out; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; };
/** hash of everything the bundle depends on: code by content, public/ assets by size + mtime */
export const sourceHash = () => {
  const h = crypto.createHash("sha256");
  for (const f of [...walk("src"), ...walk("assets/props"), "package-lock.json", "render.config.mjs"].sort()) if (fs.existsSync(f)) h.update(f).update(fs.readFileSync(f));
  for (const f of walk("public").sort()) { const st = fs.statSync(f); h.update(f + st.size + st.mtimeMs); }
  return h.digest("hex").slice(0, 16);
};
/** a Remotion bundle for the current sources; cached in .cache/bundles/<hash>, older bundles pruned (keeps 2) */
export const getBundle = async (log = console.log) => {
  const hash = sourceHash(), dir = path.join(CACHE, "bundles", hash);
  if (fs.existsSync(path.join(dir, "index.html"))) { log(`bundle: reusing .cache/bundles/${hash}`); return { serveUrl: dir, hash }; }
  const { bundle } = await import("@remotion/bundler");
  const t0 = Date.now(); log("bundle: building (once per code change)...");
  await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public"), outDir: dir });
  log(`bundle: done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const all = fs.readdirSync(path.join(CACHE, "bundles")).map((d) => ({ d, t: fs.statSync(path.join(CACHE, "bundles", d)).mtimeMs })).sort((a, b) => b.t - a.t);
  for (const { d } of all.slice(2)) fs.rmSync(path.join(CACHE, "bundles", d), { recursive: true, force: true });
  return { serveUrl: dir, hash };
};

/** Chromium + GL. macOS: Remotion's own Chrome Headless Shell, GL "angle" (ANGLE on Metal = the GPU). Linux without a
 *  GPU (Claude's container): software "swangle". Overridable with --gl and env CHROME. */
export const browserOpts = (gl) => {
  const plat = os.platform();
  const g = gl ?? process.env.HOLDUP_GL ?? (plat === "darwin" ? "angle" : plat === "linux" && !fs.existsSync("/dev/dri") ? "swangle" : "angle");
  const exe = process.env.CHROME ?? (plat === "linux" && fs.existsSync("/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell")
    ? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell" : null);
  return { chromiumOptions: { gl: g === "default" ? null : g }, browserExecutable: exe, gl: g };
};
export const freeGB = (dir) => { try { const s = fs.statfsSync(dir); return (s.bavail * s.bsize) / 1e9; } catch { return Infinity; } };
export const fmt = (s) => (s < 90 ? `${s.toFixed(0)} s` : s < 5400 ? `${(s / 60).toFixed(1)} min` : `${(s / 3600).toFixed(1)} h`);
export const outDir = (id, ...p) => { const d = path.join(ROOT, "out", id, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
