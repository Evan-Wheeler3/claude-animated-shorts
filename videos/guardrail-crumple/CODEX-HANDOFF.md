# Guardrail asset handoff

The story folder includes reusable Three.js meshes and controls for all ten planned shots. The review page stages the cliff hook, side hit, exposed end and extrusion cutaway.

Verified in Three.js 0.170: wheel-ground contact at the neutral car pivot, wheel and steering controls, road and cliff normals, old and modern terminal switching, local beam flex, terminal travel, intake advancement, strip activation and finite mesh coordinates.

The old and modern rails are comparative visual models for a dramatized scene. The cutaway is schematic. Validate the intended terminal reference before recording narration and use the production renderer to verify camera framing, character lighting and bumper contact.

See [asset manifest](ASSET-MANIFEST.md), [timed shots](SHOTLIST.md), and [Claude prompt](CLAUDE-PROMPT.md).

Visual review is pending. Headless Chromium failed to produce a screenshot in this workspace. The review HTML resolves Three.js from the sibling `animated-shorts-runtime` install. Serve `/workspace` as the web root and open `/claude-animated-shorts/videos/guardrail-crumple/assets/preview.html` on a machine with working WebGL.
