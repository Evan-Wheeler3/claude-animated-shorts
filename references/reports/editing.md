# Editing rhythm: measured targets

How often the picture changes, and how the voice is paced, in the 20 reference shorts. This fills the gap
next to `motion.md`, which measures *how* the camera moves but not *how often* the viewer gets a new picture.
`tools/check-pacing.py` enforces these numbers at the animatic stage.

## Sources
- **Voice and cuts:** `STYLE_BIBLE.md` (measured from the full videos and transcripts during the look study).
- **Picture changes:** `references/sheets/*.jpg`. Each sheet holds 60 frames spread evenly over one short,
  so one tile is ~1 s at the 60 s median length. Measured with `templates/scripts/sheet_beats.py` (colour-histogram
  change between neighbouring tiles, caption band masked) and checked by eye on short01 and short17.

## Numbers
| Measure | Reference | Note |
|---|---|---|
| Voice start | frame 1-4 | no intro, logo or title |
| Speaking rate | 3.5-4.1 words/s, median 3.7 | steady, one narrator |
| Pauses | < 1 s of gaps > 0.25 s per video | dead air is the main pacing killer |
| Sentence length | ~13.5 words median (~3.6 s spoken) | |
| New picture | median ~33 per 60 samples → **one every ~1.8 s** (by eye 27-40; automatic count 13-42, low on one-palette shorts) | |
| Pictures per sentence | **~2** | every sentence is illustrated literally |
| Longest single picture | usually 3-5 samples (~3-5 s); outliers to ~8 s are always a *continuous move that reveals new content* (scrolling a list, following an object) | |
| Hard cuts | 0-1 per video in 12/20 | new pictures mostly arrive through camera moves, whip pans, follow-throughs, 6-8 f dissolves |
| Camera moves | 6.0 per 10 s (2.9-8) | from `motion.md` |
| Ending | the video ends on the last word | no outro |

## What "a new picture" means
Any of these counts, and the reference mixes them:
- a cut, whip pan or dissolve to a new subject
- a camera move that ends on a different framing (wide → close-up, pan to the next subject)
- an insert or detail shot (the bowl, the coin purse, the list of reel stops)
- a big visual event inside the frame (a reveal, an impact, a character entering, a lighting change for a new beat)

A changed facial expression alone is **not** a new picture. It keeps a hold alive, but it doesn't reset the clock.

## Targets for Hold Up (45-60 s)
- About **20-35 new pictures** in 45-60 s, one every ~1.5-2.5 s.
- Every sentence gets at least one new picture; most get two.
- No single picture longer than ~4.5 s unless it is a continuous move revealing new content, or a deliberate
  comic/suspense hold that the shot list names and justifies.
- 3.5-4.0 words/s, no pause over ~0.45 s except a planned beat (e.g. before a punchline), named in the shot list.
- End within ~0.5 s of the last word.

These are defaults, not quotas. Clarity wins: a shot that needs 3 s to read on a phone gets 3 s. Do not add cuts
just to hit the number. If a sequence is slow, the fix is usually a better visual idea, not a faster edit.
