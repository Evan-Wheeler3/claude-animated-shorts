# Codex handoff — first-stills gate

`codex/u1206-toilet-disaster` derives from the approved story branch at `fefff8123fcc84d6adea73d6f0787c51856f3490`. The owner confirmed the narration and shot list are approved. `STORY.md` metadata agrees; its body and the `SHOTLIST.md` heading still say draft. Preserve their text; do not rewrite approved narration or direction without asking.

## What is available

See `ASSET-MANIFEST.md` for the full shot inventory, paths and limitations. `assets/index.js` exposes the stylized exterior, toilet, removable-wall compartment, real hinged hatch, section, other rooms, controls, water and illustrative effects. Valve pivots, `valveGripPoint()` and `setValveAngle()` provide camera-stage anchors; `setHatchAngle()` opens the hatch. `tools/cast.ts` supplies existing-style crew outfits. Previews include `hatch-open.jpg`, `grip-start-grip-proof.jpg`, `grip-end-grip-proof.jpg`, and scene stills. Owner accepted the earlier exploratory look and character headwear; the latest hatch and grip images have not been separately approved. User assigns animation and timing to Claude.

## Integration and validation

The story branch has no renderer. Tests used an isolated detached worktree of our prior Codex commit `a090f70227f92483ff856856000d6ceda6828e80`, based on Niagara `93f2dbeeb2d74d85a0994e68519837bf945bad19`. No work was merged into or changed on Claude's active branch. In that isolated runtime, the story-scoped installer was exercised, TypeScript passed, and `installed-hatch-open.jpg` rendered. Story `tools/check-controls.mjs` passed named controls, world-space rim movement, hatch hinge and deterministic water/effect tests; `tools/audit-submarine.mjs` passed finite position/normal and bounds checks. Those tests do not establish manifold topology, normal orientation, or collision safety. The two valve stills are sampled positions, not complete motion QA.

The adapter and its dependencies are documented in `tools/README.md`. It installs only story-specific paths and refuses overwrites; it requires an existing compatible renderer and opt-in cap patch. Claude's later runtime may differ. Coordinate integration in an isolated branch/worktree; do not apply patches or overwrite files on the active Niagara branch. The exact commit for this handoff must be read from `git rev-parse HEAD` or the PR head after checkout.

## First Claude gate and limitations

Claude may use the approved script and shot list to integrate these assets and prepare actual in-engine first stills, then stop for owner review. Claude handles animation, action timing and any motion proofs after the applicable owner gate. No final animation or video has been created here. The rough gas, flow, illustrative cutaway, exterior detail, water interaction and scene lighting need in-context visual review; the static hand samples do not prove contact through an entire animation. `sink-motion.mp4` was a low-resolution technical test and failed visual acceptance due to its early disappearance and lack of wake; it is not an approved shot. Do not claim the package meets Niagara quality until owner reviews the scene stills. No merge or publishing without owner approval.
