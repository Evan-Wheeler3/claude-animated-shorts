# Hold Up — Absurd 3D Comedy

## Choose the style for each episode

| Episode style | When to use it | Direction |
|---|---|---|
| Classic Hold Up | A true event, historical recreation, or mechanism is the main attraction | [SKILL.md](SKILL.md) and [CAMERA-DIRECTION.md](CAMERA-DIRECTION.md) |
| Absurd 3D Comedy | A ridiculous situation, character decisions, and physical performance carry the short | This guide |

Choose during the pitch. To select this option, add `Episode style: Absurd 3D Comedy (see ABSURD-3D-COMEDY.md)` under **Visual & editorial direction** in the episode's `STORY.md`. Carry the selection into `SHOTLIST.md`, the Codex handoff, and the Claude prompt. Episodes without a selection use Classic Hold Up. The style choice is separate from script, asset, and production approvals.

## Write the comedy

- Open within the first one or two seconds on an everyday problem in an absurd situation. Give the lead one petty, understandable goal. In the Phil short, the homeowner wants his neighbor to stop using his toilet without flushing.
- Build the middle through decisions. Each attempted solution creates the next problem. Give each escalation a different kind of joke or a visibly larger consequence. Let a familiar object or system drive the action, and verify any factual or technical claim the narrator makes.
- Give the narrator two or three quick, oddly specific asides if they earn the laugh. The boarded-up house gets an offhand Detroit line. A rotisserie chicken buys a guard dog's loyalty, and suddenly the dog's name is Gregory. Deliver the aside dryly and keep the story moving.
- Keep one absurdly calm character amid the chaos. Give the other character a physical reaction that makes their frustration readable even with the sound off.
- Pay off the opening problem with an image that reinterprets the escalation. In Phil's ending, a peaceful bubble bath pan reveals Phil already seated on the toilet, reading the paper. An eye flick, a single sound cue, and a hard cut finish the joke.

## Direct the animation

Use original stylized characters, bold outlines, readable lighting, and clean compositions in 9:16. Early 3D machinima is a reference for comic timing and body movement. Simple low-poly characters, rigid posing, off-kilter strides, or an exaggerated joint rotation are available when they make a specific gag funnier.

- **Body acting.** Block a readable anticipation pose, a large action, clear contact or landing, and a recovery. Play with stiff torsos, frantic feet, loose limbs, and abrupt stops. Use a brief controlled ragdoll-like pose when the action earns it, then recover deliberately.
- **Facial acting.** Key eyes, brows, mouth, and head separately where the rig allows it. An eye flick, delayed blink, or frozen smile can carry a reaction. Frame the face large enough for the expression to read on a phone.
- **Motion and cuts.** During active passages, aim for a substantial change in body pose, screen position, framing, or revealed information roughly every one to two seconds. Make paths smooth and grounded. Give departures, impacts, and landings enough frames to read. Hold for deadpan timing when stillness is the gag.
- **Camera and sound.** Show the whole body for physical setups and landings, then cut in for the reaction. Use a smooth pan when the joke depends on a reveal just outside the frame. Leave room after the narration for the visual and its sound cue.

## Produce it in the current pipeline

Use the existing Three.js/Remotion pipeline and [production approvals](PRODUCTION-PIPELINE.md). Plan around the available character rigs first. For a shot that needs a volumetric character, test an original simple rig in the actual renderer. For a shot the toon rig can carry, use its available poses and angle changes to get the same performance. Any rig work should follow the [Codex workflow](CODEX-WORKFLOW.md).

In each comedy shot, specify the setup pose, main movement, physical contact, facial reaction, camera framing, and where the laugh needs a pause. Codex records tested rig controls and limits in the asset handoff. Claude uses those controls to block the action and produce a short in-engine motion proof through the usual review gate.

**First motion proof for Phil.** Show the pole vault in one readable shot. Keep the wall and landing visible. Phil sails over with loose limbs, lands awkwardly, straightens his shirt, and walks off without changing his expression. Watch it muted at phone size. The action, landing, and attitude should read immediately. Check for smooth arcs, stable feet at contact, readable silhouettes, and clean joints and outlines through the extreme poses.

## Copy into an episode brief

> Use Absurd 3D Comedy for this episode. Read ABSURD-3D-COMEDY.md. Prioritize deadpan asides, clear physical escalation, expressive faces, and large, smooth comic movements. Apply the current production workflow and episode approvals.
