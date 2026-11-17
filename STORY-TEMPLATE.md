# Story template — copy to videos/<story-id>/STORY.md

This file is the durable **input contract**. Keep statuses current and use exact repository paths; use `unknown` rather than making facts up.

```yaml
story_id: <lower-kebab-case-id>
working_title: <short title>
script_status: draft # draft | approved
codex_status: blocked # blocked | ready | in_progress | assets_review | approved
claude_status: not_started # not_started | stills_review | animation_review | final_review | complete
target_duration_seconds: 30-45
format: 9:16
owner_approved_script_at: null
```

## Premise / hook
One specific shocking or absurd event, visualized in the first 1–3 seconds.

## Stakes and emotional arc
Who wants what; why it matters; escalation, surprise, mechanism, ironic ending.

## Narrator text
Put **only** spoken dialogue in the sibling `SCRIPT.md`. This section can summarize the story in one line, but do not maintain a second competing script.

## Payoff
State the final visual and final sentence intention.

## Confirmed facts (especially historical nonfiction)
| Claim | Evidence/source URL | Confidence | Exact wording constraint |
|---|---|---|---|
| ... | ... | confirmed / disputed / unverified | ... |

No invented quotes, people, outcomes or false certainty. A fact without a source is `unverified`. Do not present dramatization as documentary fact.

## Characters, locations, period
- Lead:
- Supporting:
- Date/setting:
- Important scale/wardrobe/props:
- Historically sensitive design details:

## Visual & editorial direction
Read `SKILL.md`, `references/STYLE_BIBLE.md`, `CAMERA-DIRECTION.md`, `SHORTS-STORYTELLING.md`. Keep approved Hold Up toon look; original characters; mobile-readable composition. Specify deviations here. No captions or title card unless owner overrides.

## Constraints
- Preferred voice/narrator:
- Avoided imagery:
- Runtime/complexity:
- Special physics/collision:
- Sound:
- Technical constraints:

## Approval and open questions
- Owner approval notes:
- Remaining factual questions:
- Remaining creative questions:
- Explicit go/no-go for Codex:

## Deliverables
- `SCRIPT.md`: narrator-only, final lines in order
- `SHOTLIST.md`: each shot numbered, narration anchor, time estimate, subject/action, framing, motivated camera, transitions, SFX, asset IDs, continuity and physical contact
- `ASSET-MANIFEST.md`: created by Codex with exact filenames and proof renders
- `CODEX-HANDOFF.md`: created by Codex with commit reference, QA and blockers
- `CLAUDE-PROMPT.md`: created by Codex; Claude-ready *only when documented assets exist*

## Pre-Codex checklist
- [ ] Unique story-id/folder
- [ ] Script reviewed and explicitly approved by owner
- [ ] Narration feasible in target duration
- [ ] Shotlist covers all spoken beats
- [ ] Fact sheet flags unresolved claims
- [ ] Asset needs/reuse opportunities listed
- [ ] Current story package committed/pushed to a known branch
