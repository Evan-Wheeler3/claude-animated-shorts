#!/usr/bin/env node
// HOLD UP universal render tool (LOCAL-RENDERING.md). One entry point for every registered story (render.config.mjs):
//   npm run doctor  -- --story <id>                      preflight: tools, files, disk, browser, composition specs
//   npm run preview -- --story <id> [--res 540|720] [--frames a-b] [--shot key[,key]] [--stills] [--no-audio]
//   npm run render  -- --story <id> [--frames a-b] [--chunk 120] [--concurrency n] [--gl angle] [--hw] [--fresh] [--no-qa]
//   npm run qa      -- --story <id> [--file out/.../x.mp4]
//   npm run bench   -- --story <id> [--gls angle,swangle] [--conc 1,2,4] [--frames 30]
//   npm run audio   -- --story <id> [--rebuild]          re-encode (or rebuild with Python) the final mix
// Final renders are chunked: each chunk is verified and recorded in a manifest, so an interrupted render resumes
// where it stopped; the final MP4 only appears (atomically) once every chunk, the stitch and the audio mux succeed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync, spawn } from "node:child_process";
import { STORIES, DEFAULTS, getStory, loadTiming, getBundle, browserOpts, freeGB, fmt, outDir, UserError, fail, CACHE } from "./lib/project.mjs";
import { FFMPEG, run, probe, available, mediaSource } from "./lib/media.mjs";
import { analyze } from "./lib/qa.mjs";

// ---------------------------------------------------------------- args
const [cmd, ...rest] = process.argv.slice(2);
const A = {};
for (let i = 0; i < rest.length; i++) {
  const k = rest[i]; if (!k.startsWith("--")) continue;
  const key = k.slice(2), nxt = rest[i + 1];
  if (nxt === undefined || nxt.startsWith("--")) A[key] = true; else { A[key] = nxt; i++; }
}
const say = (...m) => console.log(...m);
const range = (s, total) => { if (!s) return [0, total - 1]; const m = /^(\d+)-(\d+)$/.exec(String(s)); if (!m) fail(`--frames must look like 0-120, got "${s}"`); const a = +m[1], b = Math.min(+m[2], total - 1); if (a > b) fail(`--frames ${s}: empty range`); return [a, b]; };

// ---------------------------------------------------------------- preflight
async function doctor(story, { quiet = false, needAudio = true, compose = true } = {}) {
  const res = [], ok = (c, n, m) => { res.push({ ok: c, n, m }); if (!quiet || !c) say(`${c ? "ok  " : "FAIL"} ${n}: ${m}`); return c; };
  const major = +process.versions.node.split(".")[0];
  ok(major >= 18, "node", `v${process.versions.node}${major >= 18 ? "" : " (need 18 or newer)"}`);
  let deps = true; try { await import("@remotion/renderer"); await import("@remotion/bundler"); } catch { deps = false; }
  ok(deps, "npm packages", deps ? "installed" : "missing: run `npm ci` in the repo folder");
  ok(available(), "ffmpeg/ffprobe", available() ? mediaSource : "not found (npm ci installs Remotion's copy)");
  ok(fs.existsSync(story.story), "story module", story.story);
  const aud = needAudio ? ok(fs.existsSync(story.audio), "final mix", fs.existsSync(story.audio) ? story.audio : `${story.audio} is missing: pull the latest commit, or run \`npm run audio -- --story ${story.id}\``) : true;
  const gb = freeGB(path.resolve("out")); ok(gb >= DEFAULTS.minFreeGB, "free disk", `${gb.toFixed(1)} GB (need >= ${DEFAULTS.minFreeGB} GB; a final render uses ~0.5-1 GB plus ~1 GB of caches)`);
  if (!res.every((r) => r.ok)) return { ok: false };
  const timing = await loadTiming(story);
  let compInfo = null;
  if (compose) {
    const b = browserOpts(A.gl);
    if (!b.browserExecutable) { const { ensureBrowser } = await import("@remotion/renderer"); await ensureBrowser(); }
    const { serveUrl } = await getBundle(quiet ? () => {} : say);
    const { selectComposition } = await import("@remotion/renderer");
    try { compInfo = await selectComposition({ serveUrl, id: story.composition, browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, inputProps: {} }); }
    catch (e) { ok(false, "composition", `"${story.composition}" not found in src/Root.tsx (${e.message.slice(0, 120)})`); return { ok: false }; }
    ok(compInfo.durationInFrames === timing.total, "frame count", `${compInfo.durationInFrames} frames in the composition, ${timing.total} in the story`);
    ok(compInfo.fps === DEFAULTS.fps, "fps", String(compInfo.fps));
    ok(compInfo.width === DEFAULTS.baseWidth && compInfo.height === DEFAULTS.baseHeight, "size", `${compInfo.width} x ${compInfo.height} (final x${DEFAULTS.final.scale.toFixed(3)} = ${Math.round(compInfo.width * DEFAULTS.final.scale)} x ${Math.round(compInfo.height * DEFAULTS.final.scale)})`);
    ok(true, "GL", `${b.gl} (${b.browserExecutable ? "browser " + b.browserExecutable : "Remotion's Chrome Headless Shell"})`);
  }
  if (aud && needAudio) {
    const p = probe(story.audio), dur = Number(p.format.duration), want = timing.total / timing.fps;
    ok(Math.abs(dur - want) <= 0.15, "mix length", `${dur.toFixed(3)} s vs picture ${want.toFixed(3)} s`);
  }
  return { ok: res.every((r) => r.ok), timing, compInfo };
}

// ---------------------------------------------------------------- shared render plumbing
async function prepare(story, inputProps, scale) {
  const b = browserOpts(A.gl);
  const { serveUrl, hash } = await getBundle(say);
  const R = await import("@remotion/renderer");
  const composition = await R.selectComposition({ serveUrl, id: story.composition, browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, inputProps });
  const browser = await R.openBrowser("chrome", { browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, forceDeviceScaleFactor: scale });
  return { R, serveUrl, hash, composition, browser, b };
}
const defaultConcurrency = () => Math.max(1, Math.min(os.platform() === "darwin" ? 4 : 3, Math.floor(os.cpus().length / 2)));
const progressLine = (label, done, total, t0) => { const el = (Date.now() - t0) / 1000, rate = done / Math.max(el, 1e-3), eta = (total - done) / Math.max(rate, 1e-6);
  process.stdout.write(`\r${label} ${done}/${total} frames  ${(100 * done / total).toFixed(0)}%  ${rate.toFixed(2)} fps  elapsed ${fmt(el)}  ETA ${fmt(eta)}   `); };

// ---------------------------------------------------------------- preview
async function preview(story) {
  const pre = await doctor(story, { quiet: true, needAudio: !A["no-audio"], compose: false });
  if (!pre.ok) fail("preflight failed (see above)");
  const { timing } = pre, res = String(A.res ?? 540), scale = DEFAULTS.preview[res]; if (!scale) fail(`--res must be 540 or 720`);
  const inputProps = scale < 1 ? { post: { dpr: scale } } : {};
  const { R, serveUrl, composition, browser, b } = await prepare(story, inputProps, scale);
  const dir = outDir(story.id, "preview"), conc = Number(A.concurrency ?? defaultConcurrency());
  try {
    if (A.stills) {
      const keys = A.shot ? String(A.shot).split(",") : timing.shots.map((s) => s.key);
      for (const k of keys) {
        const s = timing.shots.find((x) => x.key === k); if (!s) fail(`unknown shot "${k}". Shots: ${timing.shots.map((x) => x.key).join(", ")}`);
        const out = path.join(dir, `still_${s.key}_f${s.still}.jpg`), t0 = Date.now();
        await R.renderStill({ composition, serveUrl, frame: s.still, output: out, imageFormat: "jpeg", jpegQuality: 90, scale, puppeteerInstance: browser, browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, inputProps, timeoutInMilliseconds: 600000 });
        say(`still ${s.key} f${s.still} ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${path.relative(".", out)}`);
      }
      return;
    }
    let [a, z] = range(A.frames, timing.total);
    if (A.shot) { const s = timing.shots.find((x) => x.key === A.shot); if (!s) fail(`unknown shot "${A.shot}". Shots: ${timing.shots.map((x) => x.key).join(", ")}`); [a, z] = [s.a, s.b - 1]; }
    const name = A.shot ? `shot_${A.shot}` : A.frames ? `frames_${a}-${z}` : "full";
    const out = path.join(dir, `${story.id}_${res}p_${name}.mp4`), t0 = Date.now();
    say(`preview ${res}p frames ${a}-${z} (${z - a + 1}), concurrency ${conc}, GL ${b.gl}${A["no-audio"] ? ", muted" : ", with audio"}`);
    await R.renderMedia({ composition, serveUrl, codec: "h264", crf: 23, outputLocation: out, frameRange: [a, z], scale, inputProps, concurrency: conc, puppeteerInstance: browser,
      browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, muted: !!A["no-audio"], timeoutInMilliseconds: 900000,
      onProgress: ({ renderedFrames }) => progressLine("preview", renderedFrames, z - a + 1, t0) });
    fs.writeFileSync(out + ".json", JSON.stringify({ story: story.id, frames: z - a + 1, from: a, fps: timing.fps, width: Math.round(DEFAULTS.baseWidth * scale), height: Math.round(DEFAULTS.baseHeight * scale), preview: true }, null, 1));
    say(`\npreview done in ${fmt((Date.now() - t0) / 1000)} -> ${path.relative(".", out)}`);
    if (A.qa) await qa(story, out);
  } finally { await browser.close({ silent: true }).catch(() => {}); }
}

// ---------------------------------------------------------------- final render (chunked, resumable)
async function render(story) {
  const pre = await doctor(story, { quiet: false });
  if (!pre.ok) fail("preflight failed: nothing was rendered (fix the FAIL lines above and run again)");
  const { timing } = pre, F = DEFAULTS.final, [a, z] = range(A.frames, timing.total), n = z - a + 1, sample = !!A.frames;
  const chunk = Number(A.chunk ?? F.chunkFrames), conc = Number(A.concurrency ?? defaultConcurrency()), hw = !!A.hw, crf = Number(A.crf ?? F.crf);
  const W = Math.round(DEFAULTS.baseWidth * F.scale), H = Math.round(DEFAULTS.baseHeight * F.scale);
  const name = sample ? `${story.id}_${W}x${H}_sample_${a}-${z}` : `${story.id}_${W}x${H}`;
  const work = outDir(story.id, "render", name), final = path.join(outDir(story.id), `${name}.mp4`);
  const { R, serveUrl, hash, composition, browser, b } = await prepare(story, {}, F.scale);
  const key = crypto.createHash("sha256").update(JSON.stringify({ hash, a, z, chunk, crf, hw, gl: b.gl, scale: F.scale, preset: F.x264Preset })).digest("hex").slice(0, 16);
  const mf = path.join(work, "manifest.json");
  let man = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : null;
  if (man && (man.key !== key || A.fresh)) { say(A.fresh ? "--fresh: discarding previous chunks" : "sources or settings changed since the last attempt: starting this render fresh"); for (const f of fs.readdirSync(work)) fs.rmSync(path.join(work, f), { force: true }); man = null; }
  if (!man) { man = { key, story: story.id, frames: [a, z], chunks: [] }; for (let s = a; s <= z; s += chunk) man.chunks.push({ from: s, to: Math.min(z, s + chunk - 1), file: `chunk_${String(man.chunks.length).padStart(3, "0")}.mp4`, done: false }); }
  const save = () => fs.writeFileSync(mf, JSON.stringify(man, null, 1));
  // a chunk counts as done only if its file has exactly its frames (protects against killed or truncated chunks)
  for (const c of man.chunks) if (c.done) { try { c.done = Number(probe(path.join(work, c.file)).streams[0].nb_read_packets) === c.to - c.from + 1; } catch { c.done = false; } }
  save();
  const todo = man.chunks.filter((c) => !c.done), doneFrames = man.chunks.filter((c) => c.done).reduce((s, c) => s + c.to - c.from + 1, 0);
  say(`render ${W} x ${H} @ ${timing.fps} fps, frames ${a}-${z} (${n}), ${man.chunks.length} chunks of <= ${chunk}, ${todo.length} to do${doneFrames ? ` (resuming: ${doneFrames} frames already done)` : ""}`);
  say(`settings: GL ${b.gl}, concurrency ${conc}, ${hw ? "hardware H.264 (if available)" : `x264 crf ${crf} preset ${F.x264Preset}`}, work dir ${path.relative(".", work)}`);
  const { cancel, cancelSignal } = R.makeCancelSignal(); let stopped = false;
  process.on("SIGINT", () => { if (stopped) process.exit(130); stopped = true; say("\nstopping after cleanup... (finished chunks are kept; run the same command again to resume)"); cancel(); });
  const t0 = Date.now(); let base = doneFrames;
  try {
    for (const c of todo) {
      const part = path.join(work, c.file.replace(".mp4", ".part.mp4")), cn = c.to - c.from + 1;
      for (let attempt = 0; ; attempt++) {
        try {
          await R.renderMedia({ composition, serveUrl, codec: "h264", outputLocation: part, frameRange: [c.from, c.to], scale: F.scale, inputProps: {}, concurrency: conc, puppeteerInstance: browser,
            browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, muted: true, cancelSignal, timeoutInMilliseconds: 900000, overwrite: true,
            ...(hw ? { hardwareAcceleration: "if-possible", videoBitrate: "24M" } : { crf, x264Preset: F.x264Preset }),
            onProgress: ({ renderedFrames }) => progressLine(`chunk ${man.chunks.indexOf(c) + 1}/${man.chunks.length}`, base - doneFrames + renderedFrames, n - doneFrames, t0) });
          const got = Number(probe(part).streams[0].nb_read_packets);
          if (got !== cn) throw new Error(`chunk has ${got} frames, expected ${cn}`);
          fs.renameSync(part, path.join(work, c.file)); c.done = true; save(); base += cn; break;
        } catch (e) {
          fs.rmSync(part, { force: true });
          if (stopped) throw new UserError("render stopped by you: finished chunks are kept; run the same command to resume");
          if (attempt >= F.retries) throw new UserError(`chunk ${c.from}-${c.to} failed ${attempt + 1} times: ${e.message.split("\n")[0]}\nRun the same command again to retry from this chunk (finished chunks are kept).`);
          say(`\nchunk ${c.from}-${c.to} failed (${e.message.split("\n")[0]}); retrying (${attempt + 1}/${F.retries})`);
        }
      }
    }
  } finally { await browser.close({ silent: true }).catch(() => {}); }
  say(`\nall ${man.chunks.length} chunks rendered in ${fmt((Date.now() - t0) / 1000)}; stitching + muxing audio`);
  // stitch (stream copy, no re-encode) + the final mix, into a .partial file that is only renamed once verified
  const list = path.join(work, "concat.txt"); fs.writeFileSync(list, man.chunks.map((c) => `file '${c.file}'`).join("\n") + "\n");
  const partial = final.replace(/\.mp4$/, ".partial.mp4"), secs = n / timing.fps;
  const mux = run(FFMPEG, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-ss", (a / timing.fps).toFixed(4), "-t", secs.toFixed(4), "-i", story.audio,
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "copy", "-t", secs.toFixed(4), "-movflags", "+faststart", "-f", "mp4", partial]);
  if (mux.code !== 0) { fs.rmSync(partial, { force: true }); fail(`stitch/mux failed: ${mux.stderr.slice(0, 400)}`); }
  const got = probe(partial), vf = Number(got.streams.find((s) => s.codec_type === "video").nb_read_packets);
  if (vf !== n || !got.streams.some((s) => s.codec_type === "audio")) { fs.rmSync(partial, { force: true }); fail(`stitched file has ${vf} frames (expected ${n}) or no audio: final file NOT written`); }
  fs.renameSync(partial, final);
  fs.writeFileSync(final + ".json", JSON.stringify({ story: story.id, frames: n, from: a, fps: timing.fps, width: W, height: H, sample, key, rendered: new Date().toISOString(), gl: b.gl, concurrency: conc, hw }, null, 1));
  say(`final: ${path.relative(".", final)} (${(fs.statSync(final).size / 1e6).toFixed(1)} MB)`);
  if (!A["keep-chunks"] && !sample) fs.rmSync(work, { recursive: true, force: true });
  if (!A["no-qa"]) await qa(story, final);
}

// ---------------------------------------------------------------- QA
async function qa(story, file) {
  const timing = await loadTiming(story);
  file = file ?? A.file ?? path.join("out", story.id, `${story.id}_${Math.round(DEFAULTS.baseWidth * DEFAULTS.final.scale)}x${Math.round(DEFAULTS.baseHeight * DEFAULTS.final.scale)}.mp4`);
  const side = fs.existsSync(file + ".json") ? JSON.parse(fs.readFileSync(file + ".json", "utf8")) : null;
  const from = side?.from ?? 0, frames = side?.frames ?? timing.total;
  let width = side?.width ?? Math.round(DEFAULTS.baseWidth * DEFAULTS.final.scale), height = side?.height ?? Math.round(DEFAULTS.baseHeight * DEFAULTS.final.scale);
  if (!side && A.expect === "any" && fs.existsSync(file)) { const v = probe(file).streams.find((s) => s.codec_type === "video"); width = v.width; height = v.height; }
  const shots = timing.shots.map((s) => ({ key: s.key, a: s.a - from, b: s.b - from })).filter((s) => s.b > 0 && s.a < frames);
  const sheet = shots.map((s) => Math.max(0, Math.min(frames - 1, Math.round((Math.max(s.a, 0) + Math.min(s.b, frames)) / 2))));
  const dir = outDir(story.id, "qa", path.basename(file, ".mp4"));
  say(`QA ${file} -> ${path.relative(".", dir)}`);
  const r = await analyze(file, { width, height, fps: timing.fps, frames, shots, audio: true, sheet, sheetLabels: shots.map((s) => s.key), lufs: -15 }, dir);
  say(`QA result: ${r.result}  (report: ${path.relative(".", path.join(dir, "report.md"))})`);
  if (r.result === "FAIL") process.exitCode = 1;
}

// ---------------------------------------------------------------- benchmark
async function bench(story) {
  const pre = await doctor(story, { quiet: true, needAudio: false, compose: false }); if (!pre.ok) fail("preflight failed");
  const timing = pre.timing, plat = `${os.platform()}-${os.arch()}`, host = `${plat} ${os.cpus()[0]?.model ?? ""} x${os.cpus().length}, ${(os.totalmem() / 1e9).toFixed(0)} GB`;
  const gls = String(A.gls ?? (os.platform() === "darwin" ? "angle,swangle" : "swangle,angle")).split(","), concs = String(A.conc ?? "1,2,4").split(",").map(Number);
  const nFrames = Number(A.frames ?? 24), stillShots = timing.shots.filter((_, i) => i % Math.max(1, Math.floor(timing.shots.length / 3)) === 0).slice(0, 3);
  const dir = outDir("bench", `${plat}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}`), rows = [], R = await import("@remotion/renderer");
  const { serveUrl } = await getBundle(say);
  const sampleMem = () => { const ps = spawnSync("ps", ["-A", "-o", "pid=,ppid=,rss="]).stdout.toString().trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number));
    const kids = new Map(); for (const [p, pp] of ps) { if (!kids.has(pp)) kids.set(pp, []); kids.get(pp).push(p); }
    const rss = new Map(ps.map(([p, , r]) => [p, r])); let sum = 0; const st = [process.pid]; while (st.length) { const p = st.pop(); sum += rss.get(p) ?? 0; for (const k of kids.get(p) ?? []) st.push(k); } return sum / 1e6; };
  const watch = () => { let peak = 0; const iv = setInterval(() => { peak = Math.max(peak, sampleMem()); }, 500); return () => { clearInterval(iv); return peak; }; };
  let ref = null;
  for (const gl of gls) {
    const b = browserOpts(gl);
    let comp, browser;
    try { comp = await R.selectComposition({ serveUrl, id: story.composition, browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, inputProps: {} });
      browser = await R.openBrowser("chrome", { browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, forceDeviceScaleFactor: DEFAULTS.final.scale }); }
    catch (e) { rows.push({ test: `GL ${gl}`, result: `unsupported here: ${e.message.split("\n")[0].slice(0, 100)}` }); say(`GL ${gl}: unsupported (${e.message.split("\n")[0].slice(0, 100)})`); continue; }
    try {
      // 1) stills at the final size: per-frame cost + correctness against the first GL's images
      let glOk = true;
      for (const s of stillShots) {
        const out = path.join(dir, `${gl}_${s.key}.jpg`), stop = watch(), t0 = Date.now();
        try { await R.renderStill({ composition: comp, serveUrl, frame: s.still, output: out, imageFormat: "jpeg", jpegQuality: 92, scale: DEFAULTS.final.scale, puppeteerInstance: browser, browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, timeoutInMilliseconds: 600000 }); }
        catch (e) { stop(); glOk = false; const m = e.message.split("\n")[0].slice(0, 100); rows.push({ test: `GL ${gl}`, gl, result: `cannot render here: ${m}` }); say(`GL ${gl}: cannot render here (${m})`); break; }
        const sec = (Date.now() - t0) / 1000, mem = stop();
        const px = run(FFMPEG, ["-v", "error", "-i", out, "-vf", "scale=90:160", "-f", "image2pipe", "-c:v", "rawvideo", "-pix_fmt", "rgb24", "-"]).stdout;
        let diff = null; if (ref?.[s.key]) { let d = 0; for (let i = 0; i < px.length; i++) d += Math.abs(px[i] - ref[s.key][i]); diff = d / px.length; } else (ref ??= {})[s.key] = px;
        rows.push({ test: `still 1440x2560 ${s.key}`, gl, seconds: +sec.toFixed(2), peakGB: +mem.toFixed(2), diffVsFirstGL: diff === null ? "reference" : +diff.toFixed(2) });
        say(`GL ${gl} still ${s.key}: ${sec.toFixed(1)} s, peak ${mem.toFixed(1)} GB${diff === null ? "" : `, mean |diff| vs ${gls[0]} ${diff.toFixed(2)}/255`}`);
      }
      // 2) a short real render per concurrency (and hardware encoding where offered)
      if (glOk) for (const conc of concs) for (const hw of os.platform() === "darwin" ? [false, true] : [false]) {
        const out = path.join(dir, `${gl}_c${conc}${hw ? "_hw" : ""}.mp4`), stop = watch(), t0 = Date.now();
        try {
          await R.renderMedia({ composition: comp, serveUrl, codec: "h264", outputLocation: out, frameRange: [timing.shots[1].a, timing.shots[1].a + nFrames - 1], scale: DEFAULTS.final.scale, concurrency: conc, puppeteerInstance: browser,
            browserExecutable: b.browserExecutable, chromiumOptions: b.chromiumOptions, muted: true, timeoutInMilliseconds: 900000, ...(hw ? { hardwareAcceleration: "required", videoBitrate: "24M" } : { crf: DEFAULTS.final.crf }) });
          const sec = (Date.now() - t0) / 1000, mem = stop(), fps = nFrames / sec;
          rows.push({ test: `render ${nFrames} f 1440x2560`, gl, concurrency: conc, hwEncode: hw, seconds: +sec.toFixed(1), fps: +fps.toFixed(3), fullVideoEstimate: fmt(timing.total / fps), peakGB: +mem.toFixed(2) });
          say(`GL ${gl} concurrency ${conc}${hw ? " + hw encode" : ""}: ${fps.toFixed(2)} fps -> full video ~${fmt(timing.total / fps)}, peak ${mem.toFixed(1)} GB`);
        } catch (e) { stop(); rows.push({ test: `render c${conc}${hw ? " hw" : ""}`, gl, result: `failed: ${e.message.split("\n")[0].slice(0, 120)}` }); say(`GL ${gl} c${conc}${hw ? " hw" : ""}: failed (${e.message.split("\n")[0].slice(0, 120)})`); }
      }
    } finally { await browser.close({ silent: true }).catch(() => {}); }
  }
  const best = rows.filter((r) => r.fps).sort((x, y) => y.fps - x.fps)[0];
  const md = [`# Render benchmark: ${host}`, "", `story ${story.id}, ${new Date().toISOString()}`, "", "| test | GL | conc | hw enc | seconds | fps | full video | peak GB | diff vs first GL | note |", "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.test} | ${r.gl ?? ""} | ${r.concurrency ?? ""} | ${r.hwEncode ?? ""} | ${r.seconds ?? ""} | ${r.fps ?? ""} | ${r.fullVideoEstimate ?? ""} | ${r.peakGB ?? ""} | ${r.diffVsFirstGL ?? ""} | ${r.result ?? ""} |`), "",
    best ? `**Fastest measured:** GL ${best.gl}, concurrency ${best.concurrency}${best.hwEncode ? ", hardware encode" : ""}: ${best.fps} fps (full video ~${best.fullVideoEstimate}).` : "No render configuration succeeded.",
    (best ? `Use it with: \`npm run render -- --story ${story.id} --gl ${best.gl} --concurrency ${best.concurrency}${best.hwEncode ? " --hw" : ""}\`. ` : "") + "A diff vs the first GL above ~2/255 means the GL renders differently: look at the jpgs before using it."].join("\n");
  fs.writeFileSync(path.join(dir, "results.md"), md + "\n"); fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify({ host, rows }, null, 1));
  say(`\n${md}\n\nsaved: ${path.relative(".", dir)}`);
}

// ---------------------------------------------------------------- audio
async function audio(story) {
  const ab = story.audioBuild ?? fail(`${story.id} has no audioBuild entry in render.config.mjs`);
  if (A.rebuild) {
    const py = spawnSync("node", ["scripts/story-json.mjs", story.story, ab.timing], { stdio: "inherit" }); if (py.status) fail("story-json failed");
    const m = spawnSync("python3", [ab.make], { stdio: "inherit" }); if (m.status) fail("make.py failed (needs Python 3 with numpy + scipy)");
  }
  if (!fs.existsSync(ab.wav)) fail(`${ab.wav} not found: run with --rebuild (needs Python 3 + numpy + scipy)`);
  fs.mkdirSync(path.dirname(story.audio), { recursive: true });
  const r = run(FFMPEG, ["-v", "error", "-y", "-i", ab.wav, "-c:a", "aac", "-b:a", "256k", "-f", "mp4", story.audio]);
  if (r.code) fail(`encode failed: ${r.stderr.slice(0, 300)}`);
  say(`wrote ${story.audio} (${(fs.statSync(story.audio).size / 1e6).toFixed(2)} MB, ${Number(probe(story.audio).format.duration).toFixed(3)} s). Commit it so the render machine has it.`);
}

// ---------------------------------------------------------------- main
const HELP = `Hold Up render tool. Stories: ${Object.keys(STORIES).join(", ")}
  npm run doctor  -- --story <id>
  npm run preview -- --story <id> [--res 540|720] [--frames a-b] [--shot key] [--stills [--shot k1,k2]] [--no-audio] [--concurrency n] [--gl angle|swangle]
  npm run render  -- --story <id> [--frames a-b] [--chunk 120] [--concurrency n] [--gl angle|swangle] [--hw] [--crf 16] [--fresh] [--keep-chunks] [--no-qa]
  npm run qa      -- --story <id> [--file path.mp4] [--expect any]
  npm run bench   -- --story <id> [--gls angle,swangle] [--conc 1,2,4] [--frames 24]
  npm run audio   -- --story <id> [--rebuild]
See LOCAL-RENDERING.md.`;
try {
  if (!cmd || cmd === "help" || A.help) { say(HELP); process.exit(0); }
  const story = getStory(A.story);
  if (cmd === "doctor") { const r = await doctor(story); say(r.ok ? "\nREADY: everything needed to render is present." : "\nNOT READY: fix the FAIL lines above."); process.exitCode = r.ok ? 0 : 1; }
  else if (cmd === "preview") await preview(story);
  else if (cmd === "render") await render(story);
  else if (cmd === "qa") await qa(story);
  else if (cmd === "bench") await bench(story);
  else if (cmd === "audio") await audio(story);
  else fail(`unknown command "${cmd}"\n${HELP}`);
  process.exit(process.exitCode ?? 0);   // leftover browser/compositor handles must not keep the process alive
} catch (e) {
  if (e instanceof UserError) { console.error(`\nERROR: ${e.message}`); process.exit(2); }
  console.error(`\nUNEXPECTED ERROR: ${e.stack ?? e}`); process.exit(3);
}
