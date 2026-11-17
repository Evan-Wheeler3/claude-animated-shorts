# HOLD UP — NIAGARA BARREL: TWO-GATE PRODUCTION DIRECTIVE

You are the director, cinematographer, scene builder, animator, editor and QA owner for this video. Follow this directive in order. **STOP after Gate 1 still previews and ask for approval. DO NOT animate or render the full short until the user explicitly approves the look.** Do not interpret “get started” as approval to bypass the gate.

## 0. Read / preserve existing project
Read root SKILL.md, references/STYLE_BIBLE.md, CAMERA-DIRECTION.md, SHORTS-STORYTELLING.md, PROMPTING.md (if present), and videos/niagara-barrel/{SCRIPT.md,SHOTLIST.md,assets/README.md,assets/ANNIE-DESIGN.md}. Check the existing Remotion project, working template and assets before writing code. Follow root skill's user preferences: no captions or labels, English, one steady narrator, established mix, 1440×2560 final. Use original story/characters and existing Three.js + Remotion architecture; copy/adapt the bridge template, DO NOT rewrite shared pipeline or break existing compositions. Make a new Niagara composition.

The approved script is in SCRIPT.md; preserve its hook, facts and ironic ending. Fact-check before production, including the cat test, exact height and Annie's age. If a claim is disputed, soften it without interrupting the video. Aim 35–45 seconds, voice starts immediately; natural, energetic pacing without long pauses. No title card, intro, logo, outro, or CTA.

## 1. Gate 1 — scene development and still renders ONLY
Before animating the short:
1. Audit the procedural assets in videos/niagara-barrel/assets/niagara-props.js. They are rough **mesh scaffolds**, not finished polished assets. Check that each function imports and renders, fix invalid geometry, normals, shading, orientations, clipping and scale. Build or refine the oak barrel (individual staves, hoop thickness, lids), rescue boat, cat and supporting props. Reuse existing character/prop library when available. Do not silently omit props.
2. Build Annie as an original 2D cartoon character with the established bean-head / black-plum outline / lit billboard system, using ANNIE-DESIGN.md. Show full-body, face close-up, and barrel context. Keep a consistent design across shots.
3. Build an attractive **recognizable Niagara Horseshoe Falls** environment, not a rectangular wall of blue water. Use a broad curved lip, rocky gorge, turbulent upstream river, plunging sheets, spray, foam and depth layers. The scaffold is only a starting point. For stills, represent water motion with convincing frozen flow, layered sheets, foam and mist; actual animation comes after approval. Maintain 3D toon geometry, hand-painted materials, near-black outlines, blue/purple shadows, daylight/golden lighting as motivated.
4. Stage actual camera compositions for the narrative. Avoid tiny unreadable characters, obstructed faces, overly dark frames, empty backgrounds, and uniform camera angles. Keep 9:16 safe framing and compelling depth, with distinct establishing, medium, close-up and dramatic low/high shots.
5. **Render at least SIX actual images from the real Three.js/Remotion scene**, not AI concept images or mockups:
   - A. Hook: wide dramatic falls with barrel near brink, sense of scale.
   - B. Annie: close-up of final character with readable expression.
   - C. Barrel: close-up with wood/iron material detail and correct size.
   - D. Cat test: readable cat/barrel setup and comic composition.
   - E. Plunge: barrel at waterfall lip or falling against powerful water/mist.
   - F. Rescue/payoff: Annie emerging from barrel OR deadpan empty coin purse.
   Prefer 1080×1920 stills; also assemble a labeled 2×3 contact sheet for convenient review (labels outside the image frames only). Save under out/niagara-barrel/previews/ with predictable filenames.
6. Inspect the actual output images yourself. Correct broken imports, render errors, missing assets, poor framing, flat lighting, strange water, clipping, line artifacts, inconsistent character, and poor mobile readability. If possible, render a second improved set after internal QA.
7. Send the user the six stills/contact sheet, briefly note any known limitations, and ask **“Approve this visual direction, or what should I change?”** Then STOP. Do not proceed to narration timing, full shot animation, audio mix, full render, or final export without explicit user approval. Do not claim success if previews were not actually rendered. If preview rendering is impossible, report the blocker and stop rather than substituting generated images.

## 2. Gate 2 — only AFTER user explicitly approves stills
1. Record/generate narration using the existing approved voice/TTS workflow and align each word (words.json or existing equivalent). Lock voice timing and shot frames before sound design.
2. Animate full 35–45 s narrative according to SHOTLIST.md, adapting beats to voice timing. Dynamic **motivated** camera work: tracking barrel along current, aerial dive, fast inserts, deliberate push-ins, controlled whip pans, low angles, impact shakes, strong reaction close-ups; no purposeless or incessant camera drifting. Each sentence must have a clear readable visual; punchlines land on corresponding spoken words.
3. Animate physically readable river current, rolling barrel, spray/foam, waterfall plunge, rescue, cat reactions, Annie poses/blinks, straps/lid, coins/purse. Don't show Annie outside the barrel during the fall. Preserve scene continuity and character scale. Use sound to support impact without overpowering voice.
4. Render short low-resolution **motion proof(s)** of risky sequences (barrel over lip and plunge; rescue reveal) and inspect them for camera jitter, clipping, water seams, pop frames and timing. Fix before full render.
5. Build original soundscape/music in established pipeline, ducking under voice. Keep no captions or labels.
6. Render final composition 1440×2560 30fps H.264 MP4 with final mixed audio. Use existing validated render commands and project paths; don't invent paths or scripts if absent.
7. QA: inspect representative frames across all beats, review motion, audio sync, loudness, missing props, black/white/frozen/pop frames, continuity, no unintended captions, no abrupt cutoffs. Run existing scripts/short_qa.py if available. Fix issues and re-render as needed.
8. Deliver final MP4 and concise report (duration, resolution, QA, changes from approved stills). Do not publish/upload to YouTube without authorization.

## Boundaries
- Do not replace established project code wholesale or change other videos.
- Do not use unlicensed third-party images or assets.
- No placeholder geometry in approved final scenes.
- If there is a real limitation, explain it instead of falsely claiming a render was successful.
- **Current authorization is Gate 1 only. Stop after still previews.**
