# Claude handoff — Why Guardrails Crumple

Read [the story](STORY.md), [the narration](SCRIPT.md), and [the timed shot list](SHOTLIST.md). Use [Niagara Falls](../niagara-barrel/CLAUDE-PROMPT.md) as the production reference and follow the [repo rendering guide](../../SKILL.md) and [style bible](../../references/STYLE_BIBLE.md).

Keep the driver a fully drawn 2D toon character at the detail level of Annie in Niagara. Preserve the swept hair, shaped face, collared teal jacket and distinct steering, bracing and peek expressions. Show his face and upper body through the windshield or driver-side window while the car is moving. Use the two driving views in the first-stills sheet as framing references. Build the cliff, road, car, and guardrails in 3D with dark toon outlines and shaded surfaces. Reuse the same car and bend across the three setups. Match the replay angles so the viewer can immediately spot what changed. Use the existing Three.js/Remotion pipeline and narrator.

## Animation and rigging

Keep the car, driver, beam, posts, and sliding head independently animatable. Give the beam a local bend for the side hit. For the final impact, drive the sliding head, the visible length of unflattened beam, and the growth of the outgoing strip from the same travel control. Keep the bumper in contact with the head as it moves. In the cutaway, show the wavy beam entering the head and the flattened strip curling out sideways in one continuous shot.

Align the old-cap impact to “sudden stop,” then cut inside for the driver reaction. Time the edit to the recorded voice. Prioritize a readable mechanism and room for the narration over hitting the 49-second estimate exactly.

Load the source assets and controls listed in the [asset manifest](ASSET-MANIFEST.md). See the [asset handoff](CODEX-HANDOFF.md) for validation status. Review the first stills linked from the asset handoff. After visual approval, use the timed shot list to stage motion proofs for the glancing hit and the sliding head. Resolve the legacy-end depiction noted in the story before recording.
