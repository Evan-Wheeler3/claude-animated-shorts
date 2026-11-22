# Guardrail asset handoff

Use the [Remotion first stills](previews/remotion-first-stills.png) for visual review. The five views cover the cliff hook, side hit, old rail end, extrusion cutaway and 2D driver. The earlier [asset contact sheet](previews/asset-contact-sheet.png) shows the initial model pass with simplified lighting.

The first-stills composition is `GuardrailFirstStills`. With the existing Remotion runtime dependencies available to the entry point, register [review-entry.tsx](assets/review-entry.tsx) or import [FirstStills](assets/FirstStills.tsx) into the runtime. Render frames 0–4 at 405×720. The reviewed frames rendered in Remotion 4.0.544 with Three.js 0.170, software WebGL and the shared bridge ink pass.

Geometry validation covered the neutral wheel-ground contact, steering controls, road and cliff normals, terminal switching, local beam flex, terminal travel, intake advancement, strip activation and finite mesh coordinates. Visual review of the first render showed the strip overlapping the bumper. The revised strip exits on the field side, and the revised cutaway was rendered and inspected.

The cutaway illustrates the FHWA-described extrusion sequence. The old-end crash behavior still needs a specific reference before recording. The first stills are staged poses. Once the owner approves them, Claude can proof the side hit and extrusion in motion, then align the edit to narration.

See the [asset manifest](ASSET-MANIFEST.md), [timed shots](SHOTLIST.md), and [Claude prompt](CLAUDE-PROMPT.md).
