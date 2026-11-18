// Automated QA of a rendered short (VISUAL-QA.md "Render quality"). Decodes with the bundled ffmpeg and measures in JS:
// specs vs expectations, decode integrity, black / white / frozen frames, unplanned visual pops (cuts at shot starts
// are allowed), audio presence, A/V length match, voice onset, loudness (BS.1770), true peak, long silences.
// Writes report.md + report.json + contact_sheet.png. It cannot judge anatomy, clipping or storytelling: a person
// still watches the video (the report says so).
import fs from "node:fs";
import path from "node:path";
import { FFMPEG, run, stream, probe } from "./media.mjs";
import { measure } from "./loudness.mjs";
import { encodePNG } from "./png.mjs";

const W = 180, H = 320;
export const analyze = async (file, exp, outDir, log = console.log) => {
  const R = [], add = (level, name, msg) => { R.push({ level, name, msg }); log(`${level.padEnd(4)} ${name}: ${msg}`); };
  if (!fs.existsSync(file)) { add("FAIL", "file", `${file} does not exist`); return finish(R, outDir, null); }
  let pr; try { pr = probe(file); } catch (e) { add("FAIL", "container", e.message); return finish(R, outDir, null); }
  const v = pr.streams.find((s) => s.codec_type === "video"), a = pr.streams.find((s) => s.codec_type === "audio");
  if (!v) { add("FAIL", "video stream", "missing"); return finish(R, outDir, null); }
  const [fn, fd] = v.r_frame_rate.split("/").map(Number), fps = fn / (fd || 1), frames = Number(v.nb_read_packets), dur = Number(pr.format.duration);
  add(v.codec_name === "h264" ? "PASS" : "FAIL", "codec", `${v.codec_name}${a ? ` + ${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : ""}`);
  add(v.width === exp.width && v.height === exp.height ? "PASS" : "FAIL", "resolution", `${v.width} x ${v.height} (expected ${exp.width} x ${exp.height})`);
  add(Math.abs(fps - exp.fps) < 0.01 ? "PASS" : "FAIL", "fps", `${fps.toFixed(3)} (expected ${exp.fps})`);
  add(frames === exp.frames ? "PASS" : "FAIL", "frame count", `${frames} (expected ${exp.frames}; ${(exp.frames / exp.fps).toFixed(3)} s)`);
  // ---- picture: one decode at 180 x 320 ----
  const fsz = W * H * 3, stats = [], keep = new Map(), want = new Set(exp.sheet ?? []);
  let buf = Buffer.alloc(0), prev = null, idx = 0;
  const err = await stream(FFMPEG, ["-v", "error", "-i", file, "-vf", `scale=${W}:${H}:flags=area`, "-f", "image2pipe", "-c:v", "rawvideo", "-pix_fmt", "rgb24", "-"], (d) => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= fsz) {
      const fr = buf.subarray(0, fsz); let lum = 0, diff = 0;
      for (let i = 0; i < fsz; i += 3) lum += 0.2126 * fr[i] + 0.7152 * fr[i + 1] + 0.0722 * fr[i + 2];
      if (prev) for (let i = 0; i < fsz; i += 3) diff += Math.abs(fr[i] - prev[i]) + Math.abs(fr[i + 1] - prev[i + 1]) + Math.abs(fr[i + 2] - prev[i + 2]);
      stats.push({ lum: lum / (W * H) / 255, diff: prev ? diff / fsz : null });
      if (want.has(idx)) keep.set(idx, Buffer.from(fr));
      prev = Buffer.from(fr); buf = buf.subarray(fsz); idx++;
    }
  }).catch((e) => { add("FAIL", "decode", e.message); return ""; });
  add(err.trim() ? "FAIL" : "PASS", "decode integrity", err.trim() ? err.trim().split("\n").slice(0, 3).join(" | ") : `all ${idx} frames decode cleanly`);
  const cuts = new Set((exp.shots ?? []).map((s) => s.a));
  const black = stats.flatMap((s, i) => (s.lum < 0.04 ? [i] : [])), white = stats.flatMap((s, i) => (s.lum > 0.95 ? [i] : []));
  add(black.length ? "FAIL" : "PASS", "black frames", black.length ? `${black.length}: ${black.slice(0, 12).join(", ")}` : "none");
  add(white.length ? "WARN" : "PASS", "white frames", white.length ? `${white.length}: ${white.slice(0, 12).join(", ")} (fine only if a planned flash)` : "none");
  const frozen = []; let start = null;
  for (let i = 1; i <= stats.length; i++) { const still = i < stats.length && stats[i].diff < 0.3; if (still && start === null) start = i - 1; if (!still && start !== null) { if (i - start >= 12) frozen.push(`${start}-${i - 1}`); start = null; } }
  add(frozen.length ? "WARN" : "PASS", "frozen spans (>= 12 identical frames)", frozen.length ? frozen.join(", ") : "none");
  const d = stats.map((s) => s.diff ?? 0), pops = [];
  for (let i = 1; i < d.length; i++) { const win = d.slice(Math.max(1, i - 8), i + 9).filter((_, k) => k !== Math.min(8, i - 1)).sort((x, y) => x - y), med = win[Math.floor(win.length / 2)] ?? 0;
    if (d[i] > 3 * med + 4 && !cuts.has(i)) pops.push(`${i} (${d[i].toFixed(1)} vs ~${med.toFixed(1)})`); }
  add(pops.length ? "WARN" : "PASS", "unplanned visual jumps", pops.length ? `${pops.length}: ${pops.slice(0, 10).join(", ")} (check: impact shakes and splashes are intended)` : "none outside shot cuts");
  // ---- sound ----
  let audio = null;
  if (!a) add(exp.audio ? "FAIL" : "WARN", "audio", "no audio stream");
  else {
    const wav = run(FFMPEG, ["-v", "error", "-i", file, "-map", "0:a:0", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", "-f", "wav", "-"]).stdout;
    const dataAt = wav.indexOf("data") + 8, pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + dataAt, wav.byteOffset + wav.length - ((wav.length - dataAt) % 4)));
    const n = pcm.length / 2, L = new Float64Array(n), Rr = new Float64Array(n);
    for (let i = 0; i < n; i++) { L[i] = pcm[2 * i] / 32768; Rr[i] = pcm[2 * i + 1] / 32768; }
    const ad = n / 48000, m = measure([L, Rr]);
    add(Math.abs(ad - frames / fps) <= 0.1 ? "PASS" : "FAIL", "A/V length", `audio ${ad.toFixed(3)} s vs video ${(frames / fps).toFixed(3)} s`);
    const blk = 2400, lvl = []; for (let s = 0; s + blk <= n; s += blk) { let e = 0; for (let i = s; i < s + blk; i++) e += L[i] * L[i] + Rr[i] * Rr[i]; lvl.push(10 * Math.log10(e / (2 * blk) + 1e-12)); }
    const onset = lvl.findIndex((x) => x > -40) * 0.05;
    add(onset >= 0 && onset <= (exp.maxOnset ?? 0.3) ? "PASS" : "WARN", "sound starts", onset < 0 ? "never (silent?)" : `${onset.toFixed(2)} s after frame 0`);
    const gaps = []; let g0 = null; lvl.forEach((x, i) => { if (x < -45 && g0 === null) g0 = i; if ((x >= -45 || i === lvl.length - 1) && g0 !== null) { if ((i - g0) * 0.05 >= 1.2) gaps.push(`${(g0 * 0.05).toFixed(1)}-${(i * 0.05).toFixed(1)} s`); g0 = null; } });
    add(gaps.length ? "WARN" : "PASS", "silences >= 1.2 s", gaps.length ? gaps.join(", ") : "none");
    const tl = exp.lufs ?? -15;
    add(Math.abs(m.integrated - tl) <= 1.5 ? "PASS" : "WARN", "loudness", `${m.integrated.toFixed(1)} LUFS integrated (house target ${tl}), momentary max ${m.momentaryMax.toFixed(1)} LUFS`);
    add(m.truePeakDb <= -0.9 ? "PASS" : m.truePeakDb <= 0 ? "WARN" : "FAIL", "true peak", `${m.truePeakDb.toFixed(1)} dBTP (limit -1.0)`);
    audio = { seconds: ad, ...m, onset };
  }
  // ---- contact sheet: the requested frames (shot midpoints), 4 per row ----
  let sheet = null;
  if (keep.size) {
    const ids = [...keep.keys()].sort((x, y) => x - y), cols = 4, rows = Math.ceil(ids.length / cols), gap = 6, SW = cols * (W + gap) + gap, SH = rows * (H + gap) + gap;
    const img = Buffer.alloc(SW * SH * 3, 24);
    ids.forEach((id, k) => { const ox = gap + (k % cols) * (W + gap), oy = gap + Math.floor(k / cols) * (H + gap), fr = keep.get(id);
      for (let y = 0; y < H; y++) fr.copy(img, ((oy + y) * SW + ox) * 3, y * W * 3, (y + 1) * W * 3); });
    sheet = path.join(outDir, "contact_sheet.png"); fs.writeFileSync(sheet, encodePNG(SW, SH, img));
    fs.writeFileSync(path.join(outDir, "contact_sheet_frames.txt"), ids.map((id, k) => `${k + 1}. frame ${id}${exp.sheetLabels?.[k] ? `  ${exp.sheetLabels[k]}` : ""}`).join("\n") + "\n");
  }
  return finish(R, outDir, { file, frames, fps, width: v.width, height: v.height, seconds: dur, audio, sheet, perFrame: stats.map((s) => [+s.lum.toFixed(4), s.diff === null ? null : +s.diff.toFixed(2)]) });
};

const finish = (R, outDir, data) => {
  const worst = R.some((r) => r.level === "FAIL") ? "FAIL" : R.some((r) => r.level === "WARN") ? "WARN" : "PASS";
  const md = [`# QA report: ${worst}`, "", data ? `File: \`${path.relative(process.cwd(), data.file)}\`  ${data.width} x ${data.height}, ${data.frames} frames, ${data.seconds?.toFixed(3)} s` : "", "",
    "| result | check | detail |", "|---|---|---|", ...R.map((r) => `| ${r.level} | ${r.name} | ${r.msg.replace(/\|/g, "/")} |`), "",
    data?.sheet ? "Contact sheet: `contact_sheet.png` (frames listed in `contact_sheet_frames.txt`)." : "",
    "", "**Automated QA does not judge character anatomy, clipping, grounding, timing of jokes or storytelling.**",
    "Watch the whole video at phone size before approving (docs/learning/VISUAL-QA.md)."].join("\n");
  fs.writeFileSync(path.join(outDir, "report.md"), md + "\n");
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ result: worst, checks: R, ...(data ?? {}) }));
  return { result: worst, checks: R };
};
