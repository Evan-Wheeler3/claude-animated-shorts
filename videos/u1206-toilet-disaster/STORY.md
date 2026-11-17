# U-1206 — The Toilet That Doomed a Submarine

```yaml
story_id: u1206-toilet-disaster
working_title: The Toilet That Doomed a Submarine
script_status: approved
codex_status: ready
claude_status: not_started
target_duration_seconds: 38-43
format: 9:16
owner_approved_script_at: 2026-11-17
```

## Premise / hook
A World War II German submarine loses its patrol after a toilet-system mishap. Open on seawater erupting in a cramped compartment; hard match-cut to a submerged U-boat. The hook is *not* a claim that a toilet itself directly sank the boat: it was ultimately scuttled after an emergency.

## Stakes and emotional arc
Ordinary need → absurdly complex pressure plumbing → sudden seawater intrusion → battery reaction and toxic gas → emergency surface under enemy threat → damage, abandonment, scuttling → deadpan bathroom punchline. Keep it brisk, slightly dark but not making light of deaths.

## Narrator text
The sole canonical spoken narration is in `SCRIPT.md` (draft; not approved). Approx. 97 words; actual delivery/timing must be tested using the existing narration engine.

## Payoff
A small toilet/valve in the foreground; the entire submarine descends in the background. Last line: "Worst flush in naval history." Comedic metaphor, not a literal historical quotation or a verified superlative.

## Confirmed facts / evidentiary limits

| Claim | Evidence/source URL | Confidence | Exact wording constraint |
| --- | --- | --- | --- |
| U-1206 was a German Type VIIC boat lost off Peterhead, Scotland on 14 April 1945 | https://uboat.net/boats/u1206.htm ; https://her.aberdeenshire.gov.uk/Monument/MAB1331/ | confirmed | Can say U-1206 and off Scotland in 1945 |
| Boat was around 200 feet below surface during toilet incident | https://uboat.net/boats/patrols/u1206/1945-04-14.html | well-reported | "two hundred feet underwater" approximate |
| New high-pressure toilet could require trained help, and a valve mistake reportedly led to ingress | https://uboat.net/boats/u1206.htm ; https://www.wired.com/2011/04/0414toilet-malfunction-sinks-u-boat/ | reported/disputed details | Do NOT assert the captain personally operated the valve, a named technician caused it, or an exact valve layout as certain. Mechanism visuals are schematic |
| Salt water reached batteries and caused chlorine gas | https://her.aberdeenshire.gov.uk/Monument/MAB1331/ ; https://uboat.net/boats/u1206.htm | well-reported | Chemical process should be shown clearly; no invented dialogue |
| Forced surface exposed boat to Allied attack, followed by damage, abandonment and scuttling | https://her.aberdeenshire.gov.uk/Monument/MAB1331/ ; https://uboat.net/boats/u1206.htm | well-reported | Do not show enemy aircraft definitely causing every item of damage |
| Details of toilet story have been questioned, including whether deliberate scuttling was disguised | https://numa.net/2025/01/u-1206-flush-ends-wartime-gamble/ ; https://www.scotsman.com/news/transport/divers-aim-to-solve-the-mystery-of-u-boat-scuttled-after-toilet-trouble-off-aberdeen-coast-1628377 | disputed | Treat conventional account as *reported*, never claim all actions conclusively established |
| Crew losses | https://uboat.net/boats/u1206.htm | reported | Four deaths and 46 survivors in cited record; avoid gratuitous casualties in narration or comic staging; verify if adding number |
| "Worst flush in naval history" | none | rhetorical joke | Clearly comedic, not a factual ranking |

## Characters, locations, period
- Lead: original stylized German U-boat captain, fictionalized facial features; no invented quotes
- Supporting: toilet-system specialist and two sailors as stylized composite crew members
- Date/setting: North Sea off Peterhead, Scotland, April 1945; Type VIIC U-boat
- Key props: high-pressure marine toilet, multi-stage valve/pipe cluster, watertight door, gauges, battery cell cutaway, warning light, mast/periscope, aircraft silhouettes, lifeboat/rafts if appropriate
- Historical design caution: credible era/silhouette, no gratuitous Nazi symbols or military glorification; no assertion a hypothetical cutaway is historically exact

## Visual & editorial direction
Use established Hold Up original toon pipeline and approved Niagara 2D-character/3D-world art direction. Read `SKILL.md`, `references/STYLE_BIBLE.md`, `CAMERA-DIRECTION.md`, and `SHORTS-STORYTELLING.md`. No logo/title card. Hook must be obvious before narration explains it. High-contrast mobile-readable close-ups; restrained motivated camera, no random orbit. No subtitles/captions unless owner approves.

## Constraints
- Voice: existing owner voice/Qwen3-TTS workflow; don't silently change
- Runtime: nominal 38–43s, tighten after TTS read
- Violence: implied wartime aircraft attack, avoid graphic injury/death
- Audio: pressure hiss, metal clunk, rush of water, alarm, muffled engine, surfacing splash, restrained dry punchline
- Physical interaction: feet and hands grounded, grips contact handles, water obeys compartment boundaries, no clipping, visible cause-effect
- Special: toilet mechanism should be animatable but may be simplified for clarity; do not pretend invented valve geometry is documentary exactness

## Asset needs / reuse plan
- Existing general assets: reuse approved shared rigs, eye/brow expressions, industrial props, water shader, splash SFX, camera system wherever compatible; inspect repository first
- New: Type VIIC-style exterior with plausible conning tower, hatches and deck; breakaway hull/cutaway for flooding; toilet and separate animatable valve handles; toilet compartment with removable walls; battery cutaway and chlorine color cue; submarine control room (small section); abstract distant aircraft; crew wardrobe variations
- Local *unapproved* blockouts were developed outside the repo: `u1206_submarine_exterior.glb`, `u1206_pressure_toilet.glb`, `u1206_toilet_compartment.glb`. These have NOT been pushed by this story commit. Codex must inspect them if user supplies, rebuild freely, and validate actual in-engine renders before marking ready.
- Do not merge or edit active Claude Niagara branch.

## Approval and open questions
- Owner approval notes: user requested creation and push of story package; owner explicitly approved narration and shotlist on 2026-11-17
- Remaining factual question: particular operator/sequence of wrong valves is disputed; keep unnamed
- Remaining creative questions: precise target duration, how much wartime threat to show, degree of toilet humor
- Explicit go/no-go for Codex: **GO for Codex asset creation**; visual asset approval is still required before Claude animation. Asset *exploration* already exists separately, but not a production-ready handoff.

## Deliverables
- `STORY.md`: this brief, fact sheet and approval state
- `SCRIPT.md`: narrator-only draft
- `SHOTLIST.md`: director-level shots and staging; no fabricated quotes
- `ASSET-MANIFEST.md`: Codex to create after actual modeled/validated assets
- `CODEX-HANDOFF.md`: Codex to create
- `CLAUDE-PROMPT.md`: Codex to create only when assets actually exist and are approved

## Pre-Codex checklist
- [x] Unique story-id/folder
- [x] Script reviewed and explicitly approved by owner
- [ ] Narration recorded/timed to target
- [x] Shotlist covers narrator beats
- [x] Fact sheet identifies source support and uncertainty
- [x] Asset needs/reuse documented
- [x] Story package pushed on isolated branch
