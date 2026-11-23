# Vasa — story brief

```yaml
story_id: vasa-warship
title: The Warship That Sailed for Twenty Minutes   # chosen from research rule 10
target_duration_seconds: 45-60   # draft runs ≈ 55 s
format: 9:16
script_status: approved          # GATE A 2026-11-23; wording revised and re-approved by owner 2026-11-23 (SCRIPT.md)
assets_status: accepted          # all 11 accepted after round 2 (codex 7dfabc9)
animatic_status: review          # GATE B — previews/animatic/vasa-animatic.mp4
final_status: not_started        # GATE C
voice: am_puck (Kokoro-82M) with emphasis, voice/voice.wav 57.7 s, 3.68 words/s, words.json aligned  # owner picked sample 3; confirmed over the owner's cloned voice (2026-11-23)
claude_branch: claude/nice-hamilton-t80o5e
codex_branch: codex/vasa-warship
research: research/vasa/REPORT.md (+ notes/)
```

## Premise / hook
Sweden spent years building a huge, lavish warship; it sailed about twenty minutes. Frame 1 already shows it
listing, so the first picture proves the premise.

## Stakes and arc
Setup (grand ship, the King approved the design) → warning (the heeling test frightens everyone) → warning ignored
(they stop the test and sail anyway) → reversal (light breeze, one gust, open gunports) → mechanism ("You see," the
punching-bag toy) → mystery (who was to blame?) → twist (officially nobody; blame landed on a dead man) → ironic
payoff (twenty minutes as a warship, over thirty years as a museum).

## Payoff
Final line: "As a warship, it lasted about twenty minutes. As a museum, it's been packed for over thirty years."
Final image: the raised Vasa in the museum, low angle, rhyming with the opening frame (optional loop, rule 9).

## Facts used in the narration
Source tags come from `research/vasa/REPORT.md`. **All museum facts are "CONFIRMED-by-excerpt": the full museum
pages were not read** (verification pass blocked; owner chose to proceed). Before locking the script, read the
museum's "The Disaster" and "The Inquest" pages in full and tick the last column.

| Line | Claim as narrated | Tag / use | Source | Page read in full |
|---|---|---|---|---|
| L01 | built over years (contract 1625 → sailed 1628) | CONFIRMED-by-excerpt, Safe | [Timeline](https://www.vasamuseet.se/en/explore/vasa-history/timeline) | ☐ |
| L01 | "Sweden's **largest** warship" | **UNVERIFIED: owner decision (2026-11-23)**, kept for engagement. No source found calling Vasa Sweden's largest warship | none | n/a |
| L01, L21 | sailed (about) twenty minutes; L01 drops "about" | DISPUTED (museum ~20; others 25); L21 keeps "about" | [The Disaster](https://www.vasamuseet.se/en/explore/vasa-history/disaster) | ☐ |
| L02 | 64 guns; two gun decks | CONFIRMED-by-excerpt, Safe | [Machine of war](https://www.vasamuseet.se/en/explore/vasa-history/machine-of-war) | ☐ |
| L02 | "hundreds" of painted sculptures (not "700") | CONFIRMED-by-excerpt, Safe as "hundreds" | [Vasa model](https://vasamuseet.se/en/exhibitions/vasa-model), [Audioguide 7](https://www.vasamuseet.se/besok/audioguide/audioguide-english/textversion/7.-vasa-shows-its-colours) | ☐ |
| L03 | the King had approved the design (builders' testimony at the inquiry) | CONFIRMED-by-excerpt, Safe | [The Inquest](https://www.vasamuseet.se/en/explore/vasa-history/inquest) | ☐ |
| L05-L07 | about 30 men ran across the deck at the quay; heeling caused fear it would capsize; test stopped | CONFIRMED-by-excerpt (stop via secondary sources), Safe | [The Disaster](https://www.vasamuseet.se/en/explore/vasa-history/disaster) | ☐ |
| L08 | "the king sent it out anyway" | **UNVERIFIED: owner decision (2026-11-23)**. Sources say the King approved the design (L03), not that he ordered it to sail | none | n/a |
| L09-L10 | 10 Aug 1628; set sail; gunports open for the salute | CONFIRMED-by-excerpt, Safe | [The Disaster](https://www.vasamuseet.se/en/explore/vasa-history/disaster) | ☐ |
| L11-L12 | a strong gust heeled it; water poured in through open lower gunports ("cannon hatches") | CONFIRMED-by-excerpt, Safe (never "storm") | same | ☐ |
| L13 | "sank in the harbor within minutes" | consistent with ~20 min total sailing and the gust-then-flooding account | [The Disaster](https://www.vasamuseet.se/en/explore/vasa-history/disaster) | ☐ |
| L13 | at least 30 died | CONFIRMED-by-excerpt as "at least 30"; exact toll DISPUTED | [FAQ: deaths](https://faq.vasamuseet.se/category/45/article/1282?lang=en) | ☐ |
| L14-L16 | cause: upper works too heavy/tall for the hull, high centre of gravity | CONFIRMED-by-excerpt, Safe | [The Disaster](https://www.vasamuseet.se/en/explore/vasa-history/disaster) | ☐ |
| L17-L18 | inquiry held; officially nobody punished | CONFIRMED-by-excerpt, Safe | [The Inquest](https://www.vasamuseet.se/en/explore/vasa-history/inquest) | ☐ |
| L19 | blame effectively fell on the shipbuilder (Hybertsson), who died in 1627 | CONFIRMED-by-excerpt, Safe | [The Inquest](https://www.vasamuseet.se/en/explore/vasa-history/inquest), [Forum](https://forum.vasamuseet.se/org/vasamuseet/d/vem-byggde-skeppet-vasa/) | ☐ |
| L20 | raised in 1961; 98 % original | CONFIRMED-by-excerpt, Safe | [Audioguide 10](https://www.vasamuseet.se/besok/audioguide/audioguide-english/textversion/10.-the-successfull-salvage), [Forum](https://forum.vasamuseet.se/org/vasamuseet-en/d/how-original-is-the-vasa/) | ☐ |
| L21 | "as a museum, packed for over **sixty** years" | **UNVERIFIED: owner decision (2026-11-23)**. Raised 1961 (confirmed); the current Vasa Museum opened 1990 (Wikidata). Public display since the early 1960s is not in our sourced notes | [Wikidata](https://www.wikidata.org/wiki/Q901371), [Museum notice](https://www.vasamuseet.se/en/about-the-vasa-museum/news/information-about-the-vasa-museums-financial-situation) | ☐ |

**Deliberately left out** (report says Avoid): the King forcing a second gun deck mid-build; any storm; the admiral's
"if only His Majesty were at home" quote; naming who ordered the test; foreign diplomats or crowds as a claim;
exact death tolls; "700 sculptures"; "most powerful warship" or any other superlative; the King's deadline.

## Characters (Claude's 2D toon cards; original designs)
- **The King**: generic stylised 17th-century king (crown, lace collar, moustache). No likeness claim; appears only at L03 (not at the departure, which he did not attend per unverified reports, so we simply don't show him there).
- **The officer**: runs the heeling test, unnamed (who ordered it is disputed). Better coat, hat with plume.
- **The shipbuilder**: shown only as a portrait at the inquiry (L19). Unnamed in narration.
- **Sailors**: no uniforms: linen shirts, woollen doublets, knee-breeches, broad hats or conical caps.
- **Inquiry officials**, **1961 salvage workers**, **modern museum visitors**, generic **onlookers** on the shore (not claimed as a crowd of diplomats).
- Deaths are stated plainly and shown only as floating hats on still water. No bodies, no panic close-ups.

## Look and light
- Ship colours: upper works **red**; sculptures **gilded and painted red, blue and green** (not gold-on-blue).
- 1628 Stockholm: stylised waterfront, Tre Kronor castle with a tall tower (appearance unverified: stylise, claim nothing), flags generic.
- Light: test = day; departure 4-5 pm = warm afternoon day (not golden); sinking = same; inquiry = interior window light; 1961 raising = cool morning; museum = dark hall with warm spots on the ship.

## Constraints
- No captions or labels (owner rule). English, one steady narrator.
- Never call the gust a storm. Never say "most powerful".
- Over 60 s is allowed, but our own synthesized music only (a claimed Short over 60 s is blocked worldwide).

## Open questions for the owner
- Museum pages "The Disaster" and "The Inquest" still to be read in full (fact table, last column).
