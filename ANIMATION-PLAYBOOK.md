# Animation playbook: what the safety-matches fixes taught us

Read this before animating any Hold Up short. It records what the owner rejected in the first cut of
`videos/safety-matches` (2026-11-26), why, and the fix that was approved, so the next video starts where that one ended.
Code for the reusable pieces is in `templates/holdup/remotion/src/kit/acting.ts`; full worked examples are the 16 shots in
`videos/safety-matches/remotion/src/Matches.tsx`.

## 1. The owner's standard (what "good" means)

The first cut was rejected for three reasons. Check every shot against all three before showing it.

1. **Characters must act.** A character standing still while the narration describes an action is a fail. Every
   character on screen does the verb of the line with their body: hands on the tool, body rocking or bobbing, a face
   that changes on the beat. "The factory workers" means visibly working, not three people standing there.
2. **Nothing clips.** No prop passes through another, and no hand ends somewhere it couldn't reach. Work positions out from
   real dimensions (section 4) instead of eyeballing them.
3. **Show the claim literally.** If the line says "neither half can catch fire on its own", show both halves being
   tried and failing. Symbolic stand-ins (a match waved near a stone, two props drifting apart) confused the owner.
   - Ask: could someone with the sound off say what this shot claims?
   - Use real technique (a hand drill, a match angled on the striker strip).
   - Show cause then effect on screen (drips fall *from* the flame, the cap flies *to* the strip).

Comic exaggeration is welcome *on top of* a literal action: the bottle crammed into the pocket with a huge bulge, noodle
arms, a TUNA label on the "sealed tin". Make it funny only once it's clear.

## 2. Workflow that avoids trial and error

- **Plan each shot as beats tied to words.** Write the comment first: "on *give* the arms flop; on *poison* fumes rise".
  - Time every beat with `T(line, wordIndex)`; never use frame numbers.
  - After a re-record, beats then follow the voice automatically. That is how the L08/L09 split needed only one line
    changed in the shot code.
  - Word indices are per line; check `voice/words.json`. After a line changes, any index past its new end breaks.
    Search the code for `T('Lnn'` and for `w('Lnn'` in `audio/music.py`.
- **Verify with a frame strip, not one still.** Use 5–8 frames across the shot, including each word-cue frame:
  `./stills.sh MatchesShort /tmp/s .4 <frames> && python3 ../../../tools/frame_strip.py /tmp/s`.
  Look at it as if you were the owner. Common surprises it catches:
  - something hidden by draw order (section 3)
  - something outside the portrait frame (section 5)
  - translucent smoke turning into grey discs (section 6)
  - a pose that reads as standing when it should be sitting
- **Scale 0.4 stills are enough** to judge staging. Render a ≤ 5 s proof only for motion questions; do full renders on the Mac.
- **Fix one shot, commit, move on.** One commit per fix made the 13-item list easy to review and revert.

## 3. Characters (`templates/bridge/toon.ts` `bodyFront`)

- **`armPose(side, shoulder, g)`** returns any arm polyline (shoulder first, hand last), per side, per frame. Use it for
  every working hand. It takes a 3-point curve or a longer polyline; `noodle()` and `reach()` in `kit/acting.ts` build them.
  The costume `hand` hook gets the real hand positions in `k.hands`, so props held in the hand line up.
- **`armFront: true`** draws posed arms in front of the torso. Use it whenever the hands work in front of the chest.
- **Draw order is the #1 cause of invisible things.**
  - Order: legs → arms (behind) → torso → costume `torso` hook → `hand` hook → front arms → head → `head` hook.
  - Anything that must show over the face (stink lines, X-ray, sweat) goes in the `head` hook.
  - Hands touching the face must sit on the cheek *edge* (`cheek()`), or the head covers them.
- **Dress outfits (`o.dress`, e.g. GIRL) skip the torso hook.** Body costume effects (X-ray ribs) won't show on them.
- **Sitting:** use `mode: 'sit'` and give the Card `SIT_H(height)`, otherwise the auto-sizer makes him giant.
  - Draw your own knees-up legs in the hand hook (the default seated legs are stubs).
  - Clear the grass: `meadow(c, 1.3)` adds a dirt patch, so the legs aren't hidden.
- **Walking:** a front-view card walking sideways looks like it's gliding.
  - Walk it toward the camera, or diagonally: `mode: 'stroll'`, `lift: 48`, phase ≈ 1 cycle/s, about 1.2 m/s.
  - High `lift` reads as a march.
  - The side view (`bodySide`) has a planted-foot walk but no ref face and no costume hooks yet.
- **New expressions:** `exhausted` (droopy lids, panting), `strain` (gritted teeth), `proud` (smirk). Change the face on
  the beat: nervous → strain while cramming the bottle; strain → exhausted when the arms give out.
- **Card ↔ world:** `onCard(card, x, y)` gives the world position of something drawn on the card (a flame in a hand, for
  drips or a 3D toss). `toCard(card, wx, wy)` sends a hand to a 3D prop. Draw the card once at setup first, because its
  scale is only set after the first draw.
- Motion vocabulary that worked:
  - rub cycles: `sin(t·22)`, opposite per hand
  - hands sliding down then hopping back up: `(t·.55) % 1`
  - body rock: tilt ±3.5°, head counter-tilt
  - jelly settle: `exp(-k·t)·sin(ω·t)`
  - overshoot "pop": `1 + .35·exp(-6s)·cos(18s)`
  - cough jerks: tilt `.5 + .5·sin(t·14)`

## 4. Props and clipping

- **Close-ups use props at 4× real size.** Every gap, radius and offset must be multiplied by 4 too.
  - Compute positions from the geometry, e.g. match centre y = sheet thickness + gap/2, all × 4.
  - Clamp effects to the gap: the flame shows only once the head clears the paper edge.
- **Containers must be hollow** (`hollowCan()`): an open wall, a lighter inner wall so the depth reads, a bottom and a rim.
  - Lids are Groups with their origin on the hinge edge.
  - Anything inside stays within `r - wall`.
  - A closed cylinder with matches placed on it was rejected as "a random cylinder".
- **Give generic props an identity.** The sealed tin became a TUNA can (label, ribs, pull-tab). The box gets a red label
  and a dark striker strip. Cheap to do, and it's what the owner noticed.
- **Point at things with light, not labels:** an emissive pulse plus `pointRing()` on the cue word ("the head got…",
  "the strip on the box got…"). Captions already carry the words.
- **Wheels:** a wheel's axle runs along x: turn the tyre torus into the y-z plane (`rotation.y = π/2`), spokes rotated about x,
  and spin the wheel group about x (`rotation.x = dist / r`). Do NOT also give the group a z quarter-turn: that lays the wheel flat.
- **Moving vehicles near a character:** check lane offsets against half-widths (car ~.85 m, platform radius, card position) so
  a "near miss" stays inches away instead of passing through; two vehicles meeting head-on must stop before their models overlap.
- **Library pieces can render untextured** (downtown city blocks, the 4-way intersection): check a still before building a
  shot on them; a road (asphalt, kerbs, lane lines, zebras) and window-grid buildings in code are quick and look consistent.
- Library first (assets/library catalog). Build in code only what the library lacks: matches, boxes, cans, sandpaper,
  fireboards.

## 5. Portrait framing (1080 × 1920)

- At `fov 40` (vertical) the horizontal view is only about 24°, so the visible width ≈ 0.42 × camera distance. A side-by-side
  layout 0.4 m wide needs the camera about 1 m away.
- **Stage in depth or vertically, not sideways.** Pull the match out of the sandpaper *toward the camera*. Put the match in
  front of the box, not beside it. Walk the gent toward the lens.
- Check the first and last frames of every move: things entering or leaving frame was the second most common defect.
  Pull the camera back on the payoff (the campfire) so the result is in frame.
- Keep the action out of the caption band (lower ~25 %) where you can.

## 6. Effects

- **Fire and explosions use the CC0 Kenney effect sprites** (`assets/library/fx`, `kit/fx.ts`: `loadFx`, `explosion`, `fire`),
  not drawn cartoon shapes (owner, 2026-11-26: the drawn flames and burst rays "look so stupid"). An explosion is ~16 fireball
  sprites that swap shapes, grow, drift out and tint white -> orange -> soot, then hand over to rising black smoke; fire is three
  tinted additive flame layers flickering over a glow. Keep sprites above the ground (a sprite dipping into geometry gets a hard
  straight edge) and size big blasts with the frame in mind (k 1.7 already fills a wide shot).

- **Translucent spheres are only smoke when small.** Near the lens, or blurred by depth of field, they become big grey or
  green discs that cover faces. Use `smoke(..., size ≤ .02)` in close-ups (the drift scales with size), and few, faint puffs.
  For smells, use 2D `stinkLines()` instead of 3D fumes.
- **Flame:** `flame()` has an ignition flash (`on < .6`) and flares above 1.
  - Strike pattern: 1.5 for ~0.1 s, then settle to about 1 with a small decaying wobble.
  - Keep the flame upright whatever the match angle.
  - Sparks: 8–10 tiny unlit spheres on ballistic arcs for about 0.45 s.
- **Cause and effect:** drips swell under the source for about 0.25 s, then fall with real gravity (`y0 − 4.9·t²`). They
  spawn a small flame plus a scorch disc where they land.
- **X-ray:** reveal with a scan line clipped down the head. Dark flesh, light bone, then one part glowing (canvas
  `shadowBlur`) plus a coloured point light. See `xray()` in Matches.tsx.

## 7. Voice, pauses and audio

- **Voice B (Qwen3-TTS clone) starts every take with about 100 ms of bright "ts" noise.** In the assembled narration it
  lands right after the previous sentence, so it sounds like a "t" at the end of every sentence. Always run
  `tools/voice/declick.py videos/<id>` after `emph_gain.py` and before `music.py`. It zeroes the noise without moving
  any timing.
- **Re-record only what changed:** `LINES=L08,L09 python gen_voice_b.py takes <ref> <takes_dir> 3`, then `pick` on the
  same takes folder. Unchanged lines re-pick the same takes, so their timing is identical (verify against the old lines.json).
- **A planned pause** = split the line (L08 / L09) and add a `BEAT` entry in `gen_voice_b.py` (0.45 s worked). In the music,
  stop the figure and hold one soft chord through the pause, then land the final chord on the punch word.
- **Python environment:** the TTS, whisper and scipy steps need the venv that has `qwen_tts`, `faster_whisper` and `scipy`.
  System python lacks scipy, so `music.py` fails there. Use `HF_HUB_OFFLINE=1` and `QWEN_DIR=<local snapshot>` to avoid
  stalls. The venv lives in the session scratchpad and does not survive a new container: reinstall from PyPI.
- `check_lines.py` flags spelling-only differences (matchmakers / match makers, phosphorous, jaw bones). Those are fine;
  only a real wrong word needs a re-take.
- Final order: takes → pick → `align.py` → `emph_gain.py` → `declick.py` → `check_lines.py` → `music.py` → ffmpeg m4a.

## 8. Captions

- **Small:** 74 px of 1920, 22 % above the bottom (`captionCss`, `CAPTION_BOTTOM`). 124 px hid the animation.
- **Read-along:** each word is a `<span>` (`captionWord`, spacing by margin, not spaces). The word being spoken gets
  `captionActive` (yellow, ×1.12). Between words nothing is highlighted.
- **Groups of up to 3 words never cross a line,** so a planned pause shows no caption and doesn't spoil the punchline.

## 9. Pre-show checklist (per shot)

- [ ] The character does the line's verb with their body; their face changes on the beat
- [ ] Beats are timed with `T(line, i)` on the right words
- [ ] Frame strip: nothing clips, nothing hidden by draw order, nothing leaves the portrait frame unintentionally
- [ ] No big translucent blobs over faces or the subject
- [ ] With the sound off, the shot still shows the claim
- [ ] Captions small and not covering the action
