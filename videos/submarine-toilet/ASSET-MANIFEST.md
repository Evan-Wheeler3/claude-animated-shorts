# Asset manifest — work in progress, not approved

All assets are original procedural Three.js code in `assets/submarine.js`, under the repository license. Units are metres, Y up. These are **not production quality** and are not historically verified. Materials are named flat standard materials, converted with the existing `toonify`; bespoke painted textures have not been created. Preliminary attachment geometry was not used.

| ID | Function / path | Scale and pivot | Review still | Status / limitations |
|---|---|---|---|---|
| exterior | `createSubmarine()` in `assets/submarine.js` | ~66 m, origin keel midships, bow +Z | `previews/exterior.jpg` | blocked: overly simple silhouette, tower, deck and stern; propeller axes and fin shapes need reference-based correction, no section view |
| toilet | `createToilet()` same file | floor origin at bowl centre; nominal 0.6 m tall | `previews/toilet.jpg` | blocked: speculative plumbing, bare pipe ends, no verified flow path, no detailed seat/valve controls |
| compartment | `createCompartment()` same file | 3.2 × 2.7 m floor, origin floor centre; named removable walls | `previews/cutaway.jpg`, `previews/staging.jpg` | blocked: room mockup, not a submarine section; dark and sparse, no practical hatch opening, interaction or water effects |

Valve wheels and propellers are named groups but animation pivots and connections have not been validated. The floor is named for grounding; the `waterAnchor` is a location only, not an effect. Asset bounds, normals, hidden faces, collisions, surfaces, textures, and per-part pivots require dedicated QA. The staging card uses the existing soldier as a scale proxy, not a period-correct design. The stills are real Remotion / Three.js renders with `SkyRig`, `toonify`, ink, lens, bloom and grade; they demonstrate loadability, not quality approval.

## References and uncertainty

The proposed source https://uboat.net/types/viic.htm could not be retrieved (network proxy returned HTTP 403). No historical dimensions, hull features, or toilet configuration have been verified for this model. Research primary or reputable museum/technical references for the Type VIIC/41 U-1206 exterior and the specific high-pressure system before building a factual visual. Confirm licensing and cite consulted material, not merely suggested URLs. The cause and sequence remain unverified. Do not promote the geometry or script to approved on this evidence.
