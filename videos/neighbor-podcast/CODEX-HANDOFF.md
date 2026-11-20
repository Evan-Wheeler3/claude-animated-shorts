# Neighbor Podcast | Codex handoff

Start on `codex/neighbor-podcast` at the commit containing this handoff. The owner waived Codex rendering. Claude can start the production build from this revision.

## Available

- Approved 51-second script, host dialogue cues, and ten timed shots. Speech windows are disjoint. The bat impact is at frame 345 and the baby stand and cheer at frame 510.
- A Remotion and Three.js project under `remotion/`. `PodcastStills` is a blocking composition with four static setups, not an animatic.
- Two local standing GLBs, a Rocketbox notice, reusable Phil IK and pose code, and procedural blocking geometry for the four setups. See [ASSET-MANIFEST.md](ASSET-MANIFEST.md).
- TypeScript checked against the local runtime (Remotion 4.0.544, Three.js 0.170.0). The lockfile pins Phil's Remotion 4.0.545 and Three.js 0.177.0. Check with the locked dependencies before production. Browser launch failed in the Codex sandbox, so visual output is unverified.

## Build from here

1. In `remotion/`, run `npm ci` and `npm run typecheck`. Open `npm run studio` and inspect frames 45, 510, 795 and 1360 of `PodcastStills`.
2. Implement the full ten-shot composition from [SHOTLIST.md](SHOTLIST.md). Add the bat swing and blackout, monitor insert, safe close/open, and moving-day and cabin beats. Turn the static baby and bear poses into articulated motion. Check the crib rail, folding chairs, hands and mic against the delivery cameras.
3. Record the separate narrator and host takes. Align actual word timings, keeping the 0:17 cheer clear of speech. Audition the linked SFX and lock the cut before final mixing.
4. Review the motion and audio under the owner’s approval gates before final export. Keep the existing Phil style and 1440 × 2560 final target.

See [CLAUDE-PROMPT.md](CLAUDE-PROMPT.md) for the continuation brief.
