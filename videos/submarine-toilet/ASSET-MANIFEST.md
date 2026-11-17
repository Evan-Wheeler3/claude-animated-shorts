# Asset manifest — work in progress, not approved

**Owner direction (2026-11-17):** historical fidelity of the assets is not required. Treat the hull, plumbing, and section as stylized interpretations. The remaining blockers concern visual quality, animation affordances and QA; unverified geometry is not a blocker. Any factual claims in a future script still require review.

All assets are original procedural Three.js code in `assets/submarine.js`, under the repository license. Units are metres, Y up. These are **not production quality** and are not historically verified. Materials are named standard materials; the review renderer applies the original procedural metal finish in `materials.ts` and the shared wood treatment. Preliminary attachment geometry was not used.

| ID | Function / path | Scale and pivot | Review still | Status / limitations |
|---|---|---|---|---|
| exterior | `createSubmarine()` in `assets/submarine.js` | ~66 m, origin keel midships, bow +Z | `previews/exterior.jpg` | blocked: overly simple silhouette, tower, deck and stern; propeller axes and fin shapes need reference-based correction, no section view |
| toilet | `createToilet()` same file | floor origin at bowl centre; nominal 0.6 m tall | `previews/toilet.jpg` | blocked: speculative plumbing, bare pipe ends, no verified flow path, no detailed seat/valve controls |
| compartment | `createCompartment()` same file | 3.2 × 2.7 m floor, origin floor centre; named removable walls | `previews/cutaway.jpg`, `previews/staging.jpg` | blocked: room mockup, not a submarine section; dark and sparse, no practical hatch opening, interaction or water effects |

Valve wheels and propellers are named groups but animation pivots and connections have not been validated. The floor is named for grounding; the `waterAnchor` is a location only, not an effect. Asset bounds, normals, hidden faces, collisions, surfaces, textures, and per-part pivots require dedicated QA. The staging card uses the existing soldier as a scale proxy, not a period-correct design. The stills are real Remotion / Three.js renders with `SkyRig`, `toonify`, ink, lens, bloom and grade; they demonstrate loadability, not quality approval.

## References and uncertainty

The visual models are stylized, as the owner permits. References below provide context only; the plumbing and mechanism are not evidence for a factual account. The cause and sequence remain unverified for any future script.

## Reference and iteration update

- [Type VIIC manual, U-boat Archive](https://uboatarchive.net/Manual/Manual.htm), sections II and XI: describes circular pressure hull, separate outer casing, deck and compressed-air-operated W.C. pumps. It does not establish the exact layout on U-1206.
- [U-1206 boat record, uboat.net](https://uboat.net/boats/u1206.htm) identifies it as Type VIIC and gives an account of high-pressure toilet-related flooding. [National Underwater and Marine Agency](https://numa.net/2025/01/u-1206-flush-ends-wartime-gamble/) provides another account; details require independent checking before script approval.
- [Sanitary piping discussion, U-Historia](https://u-historia.com/uhistoria/tecnico/visitaguiada/tubsani/tubsani.htm) offers a different sequence of events. No single version or modeled pipe layout has been established as fact. Links are research references only; no images or source geometry were imported.

`createSection()` now offers a schematic section, with illustrative battery cells below an accessible compartment; it is not a verified longitudinal U-1206 cutaway. `src/videos/submarine-toilet/materials.ts` applies an original deterministic painted-metal texture in the preview renderer, and the wooden deck uses the shared toon material treatment. The unconverted asset uses named standard materials; use `finish()` to apply the same finish. The updated exterior has schematic saddle tanks, deck, vents and wintergarten. All assets remain **blocked**: the exterior is still too small in frame and too schematic, the ringed section is sparse and visually confusing, the interior remains dark, and the toilet arrangement and operating sequence are unverified.

`node scripts/audit-submarine.mjs` checks finite position/normal attributes and bounding boxes only: exterior 8,664, toilet 5,232, compartment 12,800, section 16,796 triangles. It does not establish normals orientation, closed surfaces, contact, collisions, valid pivots, or visual quality.

## Latest preview pass

The exterior camera is rolled and closer, interior lighting is brighter, the front section ring was removed, and the room has a hidden `water-surface` mesh. These are review improvements, not production approval. A generic soldier remains a scale proxy. Updated stills were rendered through the real pipeline and visually inspected. The room remains sparse and the exterior lacks a convincing hull silhouette and fittings; toilet interaction, flowing water, and articulated controls remain untested.
