// usage: node scripts/fit-timing.mjs  -> writes src/timing.json from ../narration/words.json + ../narration/script.txt
// Cuts land LEAD frames before the first word of each shot's line; S16 keeps its supplied 151-frame length and starts
// S16_LEAD frames before "Time to relax". Shot-internal choreography (designed on SHOTLIST.md frames) is remapped
// proportionally from the design range to the fitted range; S16 is frame-exact.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const nar = path.resolve(here, "../../narration");
const FPS = 30, LEAD = 3;
// S16 (owner note 2026-11-19): opens on a tight close-up of the homeowner 12 frames before the sigh, holds the supplied
// clips at frame 0 for S16_PRE frames (sigh + relieved "Time to relax"), then runs the supplied 151 frames untouched.
const S16_LEAD = 12, S16_PRE = 74, S16_LEN = S16_PRE + 151;
// id, design range (SHOTLIST.md), first script line, Gate 1 key still (design-local frame) + label
const DESIGN = [
  ["S01", 0, 108, 0, 40, "hook"], ["S02", 108, 174, 1], ["S03", 174, 219, 2], ["S04", 219, 284, 3], ["S05", 284, 354, 4],
  ["S06", 354, 477, 5], ["S07", 477, 597, 6, 58, "garage"], ["S08", 597, 672, 8, 60, "gregory"], ["S09", 672, 738, 9],
  ["S10", 738, 792, 10, 44, "gregory-tag"], ["S11", 792, 855, 11], ["S12", 855, 945, 12, 45, "vault-apex"],
  ["S13", 945, 1045, 13], ["S14", 1045, 1114, 14], ["S15", 1114, 1190, 15], ["S16", 1190, 1341, 16, 138, "payoff"],
];
const norm = (s) => s.toLowerCase().replace(/’/g, "'").match(/[a-z0-9']+/g) ?? [];
const words = JSON.parse(fs.readFileSync(path.join(nar, "words.json"), "utf8"));
const lines = fs.readFileSync(path.join(nar, "script.txt"), "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
// greedy alignment: script tokens in order; words.json may contain extra non-script tokens (the "Ahhh" sigh)
const wnorm = words.map((w) => norm(w.word).join(""));
const lineStart = [], lineFirstIdx = [];
let i = 0, missing = 0;
for (const l of lines) {
  norm(l).forEach((tok, k) => {
    let j = i;
    while (j < words.length && !(wnorm[j] === tok || (/^\d+$/.test(wnorm[j]) && /^[a-z]+$/.test(tok)))) j++;
    if (j === words.length) { missing++; return; }
    if (k === 0) { lineStart.push(words[j].start); lineFirstIdx.push(j); }
    i = j + 1;
  });
}
if (lineStart.length !== lines.length || missing > 2) throw new Error(`alignment failed: ${lineStart.length}/${lines.length} lines, ${missing} tokens missing`);
// S16 opens on whatever the narrator does right after the S15 line (the sigh), not on "Time"
const s16Cue = words[lineFirstIdx[15] + norm(lines[15]).length].start;
const starts = DESIGN.map(([id, , , line], k) =>
  k === 0 ? 0 : id === "S16" ? Math.round(s16Cue * FPS) - S16_LEAD : Math.round(lineStart[line] * FPS) - LEAD);
const total = starts[starts.length - 1] + S16_LEN;
const shots = DESIGN.map(([id, dFrom, dTo, line, key, label], k) => {
  const from = starts[k], to = k < DESIGN.length - 1 ? starts[k + 1] : total;
  const r = { id, from, to, designFrom: dFrom, designTo: dTo, line };
  if (key !== undefined) Object.assign(r, { keyStill: key, keyLabel: label, keyFrame: id === "S16" ? from + S16_PRE + key : from + Math.round((key * (to - from)) / (dTo - dFrom)) });
  return r;
});
fs.writeFileSync(path.resolve(here, "../src/timing.json"), JSON.stringify({ fps: FPS, total, voiceOffsetFrames: 0, s16Pre: S16_PRE, shots }, null, 1) + "\n");
console.log(`total ${total} frames (${(total / FPS).toFixed(2)} s)`);
for (const s of shots) console.log(s.id, s.from, s.to, `${s.to - s.from}f (design ${s.designTo - s.designFrom}f)`, s.keyFrame !== undefined ? `key ${s.keyLabel}@${s.keyFrame}` : "");
