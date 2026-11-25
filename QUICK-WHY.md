# Quick Why: the fast format (~30 s)

For simple "why is it like that" Shorts. Owner decision 2026-11-25: quicker videos, straight to the point.
Evidence it can work: our best upload is "Why are Barrels Shaped like that??" (13 s, the only one pushed past its seed
batch; `videos/LEARNING-LOG.md`).

## Script: ~80-90 words, 5 beats (voice B at ~2.9 words/s = ~30 s)
1. **Hook (0-3 s):** the object + the surprising fact, proven on frame 1.
2. **The obvious option (3-9 s):** the simpler/cheaper way anyone would try first.
3. **Why it fails (9-15 s):** shown as a quick visual demo, not explained.
4. **The fix (15-26 s):** the real design and how it solves the problem; the trade-off in one line.
5. **Payoff (26-30 s):** one punchline that loops to the hook.
Narration rules from `SHORTS-STORYTELLING.md` still apply (full sentences, no contractions, plain words).

## Production limits (what makes it quick)
- 6-10 shots, **one location** + close-ups; at most one character; the object is the star.
- **No Codex**: 1-3 props built in code from primitives (or reused from earlier stories' assets).
- Research: 2-3 solid sources for the one mechanism; drop any number that isn't sourced.
- Voice B + solo piano (`videos/<id>/voice/gen_voice_b.py`, `videos/<id>/audio/music.py`, copied from the last Quick Why).
- **Two owner gates:** (1) script heard aloud in voice B with piano, (2) the final. Claude reviews a contact sheet of
  every shot itself before the final; full render on the owner's Mac (`run_mac.sh`).
