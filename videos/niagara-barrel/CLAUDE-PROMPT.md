# Production instruction — Hold Up: Niagara Barrel

Read repository SKILL.md, references/STYLE_BIBLE.md, CAMERA-DIRECTION.md, SHORTS-STORYTELLING.md, PROMPTING.md (where present), then this folder's SCRIPT.md, SHOTLIST.md and assets/README.md.

Produce a polished original vertical animated Short based on Annie Edson Taylor's 1901 Niagara Falls barrel descent. Do not ask for another creative brief. Treat the script as the approved draft, make only minor factual/pacing edits if essential, and preserve the ironic ending.

**Important:** The files in assets/ are production-ready **procedural Three.js mesh builders**, not GLBs. Import functions from assets/niagara-props.js; use the existing 2D cartoon character card pipeline for Annie (reference assets/ANNIE-DESIGN.md) rather than trying to make Annie a generic 3D person. The waterfall environment builder is a stylized scene scaffold: add animated water shader/mesh, mist, splash sprites, river current and moving texture to achieve cinematic quality. Don't pretend static meshes are a finished waterfall. If the standalone GLB is available locally, it is optional; the procedural barrel is the guaranteed repo asset.

Follow existing Remotion/Three.js pipeline. Copy templates/bridge/ to a new composition rather than rewriting working infrastructure. Match existing ink, lighting, grade, sound, and character shading. Adapt to 35–45 seconds based on the narration take; no captions, labels, intro, outro, or CTA. Narrator begins immediately. One steady voice, fast but clear.

Produce and review 9:16 stills from hook, barrel, cat, falls, rescue, and ending before final render. Run the repo's visual and audio QA. Export final 1440×2560 MP4. Place output in the normal out/ directory and include a short delivery summary with final duration and QA results.

Do not invent visual proof for disputed facts. Do not depict a violent cat injury or Annie floating outside her barrel.
