// Timeline: every picture starts `lead` frames before its anchor word in the recorded narration (voice/words.json).
import anchors from './anchors.json';
import words from '../../voice/words.json';

export const FPS = 30;
type Word = {word: string; line: string; start: number; end: number};
const W = words as Word[];

export type Env = 'harbour' | 'room' | 'toy' | 'diagram' | 'museum' | 'salvage';
export type Shot = {pic: number; env: Env; a: number; b: number};

const wordAt = (line: string, i: number) => {
  const ws = W.filter(w => w.line === line);
  if (!ws[i]) throw new Error(`no word ${i} in ${line}`);
  return ws[i];
};
/** time (s) of word i of a script line */
export const tw = (line: string, i = 0) => wordAt(line, i).start;
/** frame of word i of a script line */
export const fw = (line: string, i = 0) => Math.round(tw(line, i) * FPS);

export const TOTAL = Math.ceil((W[W.length - 1].end + anchors.tail) * FPS);
export const SHOTS: Shot[] = anchors.pics.map((p, k) => ({
  pic: p.pic,
  env: p.env as Env,
  a: k === 0 ? 0 : Math.max(0, fw(p.line, p.w) - anchors.lead),
  b: 0,
}));
SHOTS.forEach((s, k) => { s.b = k + 1 < SHOTS.length ? SHOTS[k + 1].a : TOTAL; });

export const shotAt = (f: number) => SHOTS.find(s => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// easing
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** impact flip-shake: sign flips every frame, decays over 7 frames (SKILL.md) */
export const kick = (framesSince: number, amp = 1) => framesSince < 0 || framesSince > 7 ? 0 : amp * (framesSince % 2 ? -1 : 1) * (1 - framesSince / 8);
