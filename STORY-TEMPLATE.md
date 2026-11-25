# Story template — copy to videos/<story-id>/STORY.md

The story's input contract. Keep statuses current; write `unknown` rather than guessing a fact.
Stages and gates: `PRODUCTION-PIPELINE.md`.

```yaml
story_id: <lower-kebab-case-id>
working_title: <short title>
target_duration_seconds: 45-60   # soft target; the story decides, never pad
format: 9:16
script_status: draft             # draft | heard | approved      (GATE A: owner approves the recorded narration + music)
look_status: not_started         # not_started | stills | approved  (GATE B: six key stills in the final look)
assets_status: not_started       # not_started | briefed | delivered | accepted   (Claude's check, no gate)
animatic_status: not_started     # not_started | review | approved  (GATE C: pacing, run_mac.sh --proof)
final_status: not_started        # not_started | review | approved | published   (GATE D)
claude_branch: claude/<story-id>
codex_branch: codex/<story-id>
```

## Premise / hook
One specific surprising event, shown in the first 1-3 seconds.

## Stakes and arc
Who wants what; why it matters; escalation, mechanism, ironic payoff.

## Payoff
The final image and the final line.

## Facts
| Claim | Source URL | Confidence | Wording constraint |
|---|---|---|---|
| ... | ... | confirmed / disputed / unverified | ... |

No invented quotes, people or outcomes. A fact without a source is `unverified`. Dramatisation is never presented as documentary fact.

## Characters, places, period
- Lead:
- Supporting:
- Date / setting:
- Scale, wardrobe, key props:

## Constraints and open questions
- Avoid:
- Special physics / contact:
- Open factual questions:
- Open creative questions:

## Files in this folder
| File | By | Stage |
|---|---|---|
| `STORY.md`, `SCRIPT.md`, `SHOTLIST.md` | Claude | 2 |
| `ASSET-BRIEF.md`, `CODEX-PROMPT.md` | Claude | 2 |
| `assets/*.glb`, `assets/assets.json` | Codex | 3 |
| acceptance table in `ASSET-BRIEF.md` | Claude | 3 |
| `RETRO.md` | Claude | 6 |

## Checklist before GATE A (see SHORTS-STORYTELLING.md, Narration)
- [ ] Full sentences only, no contractions, plain words for jargon, cause before effect
- [ ] Hook: one bold concrete claim with a number; risky claims flagged once, owner decides
- [ ] `voice/SCRIPT-emphasis.md` marks 1-3 stressed words on punch lines
- [ ] Narration recorded, `tools/voice/check_lines.py` 0 FAIL, music bed mixed: `voice/voice-and-music-preview.mp3`
- [ ] Asset brief: moving parts table, part sizes vs a 1.75 m person, tiling, common defects
- [ ] Hook visible in the first 1-3 s
- [ ] ~165-220 words (about 45-60 s at 3.7 words/s); shorter or longer only if the story needs it
- [ ] Every sentence has its visuals in `SHOTLIST.md` (~2 pictures per sentence)
- [ ] Every claim sourced or flagged
- [ ] Asset brief lists only what we don't already have
