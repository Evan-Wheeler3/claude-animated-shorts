# Story template — copy to videos/<story-id>/STORY.md

The story's input contract. Keep statuses current; write `unknown` rather than guessing a fact.
Stages and gates: `PRODUCTION-PIPELINE.md`.

```yaml
story_id: <lower-kebab-case-id>
working_title: <short title>
target_duration_seconds: 30-45   # soft target; clarity and quality come first
format: 9:16
script_status: draft             # draft | approved            (GATE A)
assets_status: not_started       # not_started | briefed | delivered | accepted   (GATE B)
animatic_status: not_started     # not_started | review | approved               (GATE C)
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

## Checklist before GATE A
- [ ] Hook visible in the first 1-3 s
- [ ] ~110-165 words (about 30-45 s at 3.7 words/s); longer only if the story needs it
- [ ] Every sentence has its visuals in `SHOTLIST.md` (~2 pictures per sentence)
- [ ] Every claim sourced or flagged
- [ ] Asset brief lists only what we don't already have
