// ffmpeg / ffprobe for the render system: the copies Remotion ships with its compositor (no Homebrew needed),
// falling back to ffmpeg on PATH. They are a slim build (no ebur128/blackdetect), so QA measures in JS (qa.mjs).
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = path.resolve("node_modules/@remotion");
const comp = fs.existsSync(root) ? fs.readdirSync(root).find((d) => d.startsWith("compositor-") && fs.existsSync(path.join(root, d, "ffmpeg"))) : null;
const dir = comp ? path.join(root, comp) : null;
const env = dir ? { ...process.env, LD_LIBRARY_PATH: dir, DYLD_LIBRARY_PATH: dir } : process.env;
export const FFMPEG = dir ? path.join(dir, "ffmpeg") : "ffmpeg";
export const FFPROBE = dir ? path.join(dir, "ffprobe") : "ffprobe";
export const mediaSource = dir ? `bundled (${comp})` : "system PATH";

/** run to completion; returns { code, stdout (Buffer), stderr (string) } */
export const run = (bin, args, opts = {}) => {
  const r = spawnSync(bin, args, { env, maxBuffer: 1 << 30, ...opts });
  return { code: r.status ?? (r.error ? -1 : 0), stdout: r.stdout ?? Buffer.alloc(0), stderr: (r.stderr ?? "").toString(), error: r.error };
};
/** stream stdout in chunks (large decodes) */
export const stream = (bin, args, onData) => new Promise((resolve, reject) => {
  const p = spawn(bin, args, { env }); let err = "";
  p.stdout.on("data", onData); p.stderr.on("data", (d) => { err += d; });
  p.on("error", reject); p.on("close", (code) => (code === 0 ? resolve(err) : reject(new Error(`${path.basename(bin)} exited ${code}: ${err.slice(-600)}`))));
});
export const probe = (file) => {
  const r = run(FFPROBE, ["-v", "error", "-count_packets", "-show_entries", "stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_packets,sample_rate,channels,duration:format=duration,size", "-of", "json", file]);
  if (r.code !== 0) throw new Error(`ffprobe could not read ${file}: ${r.stderr.trim().slice(0, 300)}`);
  return JSON.parse(r.stdout.toString());
};
export const available = () => run(FFMPEG, ["-version"]).code === 0 && run(FFPROBE, ["-version"]).code === 0;
