# Hold Up — Prompting Contract

Read this file when planning a new Hold Up short. Also read SKILL.md and references/STYLE_BIBLE.md. These guides are **additive**: they do not replace existing rendering, style, audio, QA or asset instructions.

Before scripting, ask only for essential missing information. Otherwise proceed with a concise creative proposal.

## When the user asks for a script or shot list
Deliver:
1. Working title and target runtime
2. Verified fact sheet / sources for factual stories (flag uncertainty)
3. Complete narrator-only script
4. Shot-by-shot timeline, with each narration line attached to its visual
5. For every shot: action, shot size, camera start→end, focus, transition, SFX, and the reason for the camera choice
6. Reusable assets needed vs new assets needed
7. A short continuity and quality checklist

Prefer a strong visual hook, precise cause-and-effect, motivated camera changes and a payoff. Use CAMERA-DIRECTION.md and SHORTS-STORYTELLING.md. Don't add captions unless the user requests them: SKILL.md currently says no captions.

## Production ownership
- **ChatGPT:** ideation, fact-checking, scripts, shot direction, asset briefs and performance analysis.
- **Codex:** build/source reusable environments, props, characters, rigs, lighting and compatible assets when requested.
- **Claude:** use the supplied assets and approved shot plan to handle narration, animation, keyframes, cameras, editing and final rendering.

This division is a preferred workflow, not a reason to replace the existing pipeline.

## Asset handoff
For every new asset, document its path, file format, coordinate system, units/scale, origin/pivot, materials, outline compatibility, rig/animation controls if applicable, license/source, and a preview. Test loading in the actual renderer before handing it to Claude. Prefer existing assets; don't rebuild working assets. If the runtime uses Three.js/Remotion, ensure assets are compatible rather than assuming Blender scene files can be loaded directly.

## Working rules
- Preserve existing SKILL.md and working code unless explicitly authorized to change them.
- Do not add new frameworks or automation layers without a concrete need.
- Keep scripts and shot plans in copyable, production-ready form.
- Use the existing approved narrator voice and voiceover workflow.
- Prioritize quality and clarity over arbitrary camera movement.
- Review at mobile size and verify every factual claim before publishing.
- For future scripts, fetch the latest repo guidance rather than assuming an old copy is current.
