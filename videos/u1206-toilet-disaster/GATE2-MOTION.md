# U-1206 — Gate 2 motion proof (Claude, awaiting owner review)

Gate 1 stills were approved by the owner on 2026-11-17. The narration (`SCRIPT.md`) and shot list are unchanged.
Sound, music, mix and the final render are Gate 3 and have **not** been started.

## Voice and timing
- `voice/voice.wav` uses the house narrator from `CLAUDE.md`: Kokoro `am_michael`, speed 1.32, generated with
  `scripts/voice/tts.py`. Pronunciation fixes added: "U-1206" is read "U twelve-oh-six", "1945" is read
  "nineteen forty-five".
  **Note:** `STORY.md` mentions an "owner voice / Qwen3-TTS workflow", but no such workflow exists in the repository.
  If you supply that recording, only the word table `W` in `story.ts` needs updating; every shot follows it.
- Beat pauses are added in `voice/lines.txt` only (the script text is unchanged): 0.35 s after the hook, 0.55 s after
  "went wrong", 0.45 s after "scuttled", 0.6 s before the last line.
- **Runtime: 32.0 s.** The narration is 30.4 s, followed by a 1.6 s dry hold on the end frame. `STORY.md` targeted
  38–43 s, but the approved ~86-word script reads in about 30 s at the house speed. Options: keep it as is (recommended
  for a Short), slow the narrator, or lengthen the pauses.
- `voice/words.json` holds word times from faster-whisper, hand-checked. They live in the `W` table of
  `src/videos/u1206/story.ts`. Every shot starts 2 frames before its word, and all motion runs on the shot's own
  clock (frames since the shot started). A new shot, `s10a_control`, is the shot list's 10 control-panel half.

## Animated
- **01:** the sailor grips the left valve, which jerks a half-turn; the bowl erupts at 0.33 s with spray at the rim; he
  lets go and lunges back; the camera snap-pushes in and kicks.
- **02/03:** the boat travels, the propellers turn, the camera tilts up toward the surface light.
- **04:** the captain eyes the pipes and leans toward the bowl on "complicated".
- **05:** the specialist's hand threads in to the valve rim; focus racks from his face to the wheel; the turn begins.
- **06:** locked frame. The valve catches on "went" and lurches; the gauge needle jumps on "wrong" (it is out of
  frame here, and shows pinned in 07/13).
- **07:** the floor stays dry until the bowl erupts on "seawater". The water rises to boot depth and the stream lands
  at his boots; he braces with a jolt on "blasting".
- **08:** water drips through the deck drain onto the battery, with a vertical follow.
- **09:** the gas thickens and rises from the cell vents; the crew recoil on "chlorine"; the red lamp flickers.
- **10a/10:** the surfacing lever is thrown; the boat climbs steeply.
- **11:** the aircraft cross; the camera tilts up on "aircraft".
- **12:** the boat settles stern-first; the rafts bob; bubbles rise.
- **13:** a single drip lands in the bowl on "break"; the seat wobbles.
- **14:** one bubble leaves the toilet on "history"; the boat sinks into the blue.

## Proof render
`previews/gate2/u1206_motion_preview_540p.mp4`: 540 × 960, 960 frames, 32.0 s, with the narration. It was rendered in
range chunks with `scripts/render-range.mjs` and concatenated; every chunk was inspected as a frame strip.
Fixed during the proof: water was visible on the floor before the eruption; a gas billow passed through the camera
in 09; the sailor's card clipped the hatch wheel in 07.

## Known limitations
- The water stream is still a smooth solid tube; I have not yet softened it.
- 07: the bracing hand reaches the hatch ring but is partly hidden behind the stream.
- 10a: the control room is dark under the alarm light; the lever throw is quick (5 frames).
- 01: the sailor's lunge takes him half out of frame.
- Hand contact holds through the motion only at the poses checked in the frame strips. There is no automated
  hand-contact test.
