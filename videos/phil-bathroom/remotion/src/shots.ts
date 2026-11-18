// Phil Won't Stop Using Your Bathroom: 16-shot cut, 44.7 s at 30 fps (1341 frames).
// Frame ranges are zero-based, end-exclusive, copied from videos/phil-bathroom/SHOTLIST.md.
// They are EDIT TARGETS until the owner-voice narration is aligned (words.json): then refit `from`/`to` per shot,
// moving S16 as one block so its local cue spacing (REVEAL_CUES) never changes.

export const FPS = 30;
export const TOTAL = 1341;

export type SetId = "bathroom" | "exterior" | "reveal";

export type Shot = {
  id: string;
  from: number;
  to: number;
  set: SetId;
  line: string; // narrator anchor
  /** frame (relative to `from`) used for the Gate 1 key still, if this shot has one */
  keyStill?: number;
  keyLabel?: string;
};

export const SHOTS: Shot[] = [
  { id: "S01", from: 0, to: 108, set: "bathroom", line: "Your neighbor Phil keeps breaking into your house to use your bathroom.", keyStill: 40, keyLabel: "hook" },
  { id: "S02", from: 108, to: 174, set: "bathroom", line: "And worst of all, he never flushes." },
  { id: "S03", from: 174, to: 219, set: "exterior", line: "So you install a deadbolt." },
  { id: "S04", from: 219, to: 284, set: "exterior", line: "But Phil just climbs through the window." },
  { id: "S05", from: 284, to: 354, set: "exterior", line: "You install metal bars. Phil files through them." },
  { id: "S06", from: 354, to: 477, set: "exterior", line: "So you board up every window. But now your house looks like it's from Detroit." },
  { id: "S07", from: 477, to: 597, set: "exterior", line: "And Phil drives straight through your garage. This madness needs to stop!", keyStill: 58, keyLabel: "garage" },
  { id: "S08", from: 597, to: 672, set: "exterior", line: "So you buy a highly trained guard dog.", keyStill: 60, keyLabel: "gregory" },
  { id: "S09", from: 672, to: 738, set: "exterior", line: "But Phil brings him a rotisserie chicken." },
  { id: "S10", from: 738, to: 792, set: "exterior", line: "The dog's name is now Gregory.", keyStill: 44, keyLabel: "gregory-tag" },
  { id: "S11", from: 792, to: 855, set: "exterior", line: "You build a twelve-foot concrete wall." },
  { id: "S12", from: 855, to: 945, set: "exterior", line: "But Phil did pole vault in high school.", keyStill: 45, keyLabel: "vault-apex" },
  { id: "S13", from: 945, to: 1045, set: "exterior", line: "So you spend your entire life savings turning your house into a maximum-security fortress." },
  { id: "S14", from: 1045, to: 1114, set: "exterior", line: "Steel doors. Laser sensors. Armed guards." },
  { id: "S15", from: 1114, to: 1190, set: "bathroom", line: "There's absolutely no way Phil's getting in now." },
  { id: "S16", from: 1190, to: 1341, set: "reveal", line: "Time to relax.", keyStill: 138, keyLabel: "payoff" },
];

/** S16 local cue frames (zero-based, relative to S16 start). Never retime these independently. */
export const REVEAL_CUES = {
  bathOnlyEnd: 37,
  panStart: 38,
  panEnd: 107,
  sideEye: [107, 119] as const,
  blink: [126, 131] as const,
  fart: 138,
  blackFrom: 146, // last five frames (146-150) are a black edit
};

export const shotAt = (frame: number): { shot: Shot; local: number } => {
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.to) ?? SHOTS[SHOTS.length - 1];
  return { shot, local: frame - shot.from };
};

/** Absolute frames of the Gate 1 key stills. */
export const KEY_STILLS = SHOTS.filter((s) => s.keyStill !== undefined).map((s) => ({
  id: s.id,
  label: s.keyLabel!,
  frame: s.from + s.keyStill!,
}));

// sanity: contiguous cover of 0..TOTAL
SHOTS.forEach((s, i) => {
  if (i > 0 && SHOTS[i - 1].to !== s.from) throw new Error(`gap before ${s.id}`);
});
if (SHOTS[SHOTS.length - 1].to !== TOTAL) throw new Error("timeline does not end at TOTAL");
