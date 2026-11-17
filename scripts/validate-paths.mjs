// Offline motion QA for a short's timeline (no browser): bundles the story module with the local esbuild, then scans
// every frame of every shot for camera problems that a few stills never show (VISUAL-QA.md "Movement continuity"):
//   - position jumps inside a shot (> MAX_STEP m in one frame, cuts excluded: keys marked cut)
//   - look-direction snaps (> MAX_TURN deg in one frame) and roll beyond 8 deg
//   - FOV jumps, NaN values
// usage: node scripts/validate-paths.mjs [src/videos/niagara/story.ts]   (exit 1 when anything fails)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const entry = process.argv[2] || "src/videos/niagara/story.ts";
const out = path.resolve(".remotion-tmp/validate-story.mjs");
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync("node_modules/.bin/esbuild", [entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${out}`, "--log-level=error"]);
const S = await import(out + "?" + Date.now());
const MAX_STEP = 0.6, MAX_TURN = 4, MAX_ROLL = (8 * Math.PI) / 180;
let bad = 0;
const dir = (c) => { const d = c.look.map((v, i) => v - c.pos[i]), n = Math.hypot(...d); return d.map((v) => v / n); };
for (const s of S.SHOTS) {
  let prev = null, worst = { step: 0, turn: 0, f: 0 };
  for (let f = s.a; f < s.b; f++) {
    const c = S.camAt(s.id, f);
    if (![...c.pos, ...c.look, c.fov, c.roll].every(Number.isFinite)) { console.log(`FAIL ${s.key} f${f}: NaN camera`); bad++; break; }
    if (Math.abs(c.roll) > MAX_ROLL) { console.log(`FAIL ${s.key} f${f}: roll ${(c.roll * 180 / Math.PI).toFixed(1)} deg`); bad++; }
    if (prev) {
      const step = Math.hypot(...c.pos.map((v, i) => v - prev.pos[i])), a = dir(c), b = dir(prev);
      const turn = (Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 180) / Math.PI;
      if (step > worst.step) worst = { ...worst, step, f }; if (turn > worst.turn) worst = { ...worst, turn, f };
      if (Math.abs(c.fov - prev.fov) > 3) { console.log(`FAIL ${s.key} f${f}: fov jump ${prev.fov.toFixed(1)} -> ${c.fov.toFixed(1)}`); bad++; }
    }
    prev = c;
  }
  const ok = worst.step <= MAX_STEP && worst.turn <= MAX_TURN; if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${s.key.padEnd(10)} frames ${s.a}-${s.b - 1}  max step ${worst.step.toFixed(3)} m/f  max turn ${worst.turn.toFixed(2)} deg/f`);
}
console.log(bad ? `${bad} problem(s)` : "camera paths pass");
process.exit(bad ? 1 : 0);
