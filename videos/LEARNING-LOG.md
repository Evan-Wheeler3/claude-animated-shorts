# Hold Up — learning log

One row per upload. Add a row after every release and re-pull at 48 h and 7 d. Rules for reading it:
`SHORTS-STORYTELLING.md` → "Learning from uploads" (observations ≠ hypotheses; change 1-2 variables at a time).

**Source:** YouTube Analytics via the Windsor.ai connector, pulled 2026-11-25 (last 30 days; Analytics data ends
2026-11-22 Pacific, so anything published after that is still blank).

## How each column is measured
| Column | Meaning | Caveat |
|---|---|---|
| 48 h / 7 d | Views on the publish day + next day / first 7 days, by Analytics calendar day (Pacific) | Calendar-day buckets, so "48 h" is 24-48 h depending on publish time |
| Stayed (Studio) | YouTube Studio "Stayed to watch" (viewed vs swiped) | **Not in the API or Windsor.** Copy it from Studio → Analytics → the Short → "Viewed vs swiped away" |
| Engaged ÷ views | `engaged_views / views`: share of plays that got past the first seconds | Closest proxy for Stayed. Views include replays, so this reads lower than Stayed |
| Avg % viewed | YouTube `average_view_percentage` | Counted over viewers who stayed; replays can push it past 100% |
| RRP min | Lowest "relative retention performance" on the curve and where it happens. 0 = worst vs. YouTube videos of similar length, 1 = best | Only pulled for 7 Shorts so far |
| End kept | `audience_watch_ratio` at the last 1%: plays still watching at the end ÷ views | |
| Captions | CC track per the API (none on any upload). Burned-in captions: none on Niagara and Vasa (repo); **owner to confirm** for the rest | |
| Voice / hook | From the repo where the story lives there; `?` = owner to fill | |

## Uploads
| Published (UTC) | Short (title as uploaded) | Hook line | Len | Captions | Voice | 48 h | 7 d | Stayed (Studio) | Engaged ÷ views | Avg % viewed | RRP min | End kept | Likes / com / shares / subs | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 11 Nov | How to Escape from Alcatraz! | ? | 125 s | no CC | ? | 1,173 | 1,177 | | 55% | 60% | | | 26 / 1 / 0 / 4 | Longest upload |
| 12 Nov | "November 11, 2026" (topic ?) | ? | 104 s | no CC | ? | 1,192 | 1,202 | | **68%** (best) | 56% | | | 25 / 0 / 0 / 1 | Date as title, yet best engaged ratio |
| 12 Nov | How Much $ Will GTA VI Make??? | ? | 90 s | no CC | ? | 1,212 | 1,217 | | 58% | 55% | | | 33 / 0 / 1 / 0 | |
| 13 Nov | Beach Whale + Dynamite = ??? | ? | 71 s | no CC | ? | 1,258 | 1,288 | | 46% | 70% | | | 56 / 0 / 0 / 0 | Most likes |
| 13 Nov | The Great Emu War! | ? | 70 s | no CC | ? | 1,114 | 1,116 | | 59% | 50% | | | 22 / 0 / 0 / 3 | |
| 14 Nov | The Eiffel Tower has been scheduled for demolition for almost 100 years! | ? | 60 s | no CC | ? | 1,044 | 1,248 | | 50% | 44% | 0.26 @ 9 s | 20% | 32 / 0 / 0 / 2 | Worst relative dip |
| 14 Nov | Would you Survive a Western Standoff? | ? | 46 s | no CC | ? | 1,283 | 1,302 | | 46% | 60% | | | 23 / 1 / 0 / 1 | |
| 14 Nov | Why Airplane Windows are Round | ? | 67 s | no CC | ? | 1,238 | 1,429 | | 58% | 54% | 0.35 @ 9 s | 21% | 27 / 0 / 0 / 2 | **Same topic as the Step 2 candidate** |
| 15 Nov | Why are Barrels Shaped like that?? | ? | 13 s | no CC | ? | 2,432 | **2,868** | | 49% | 95% | 0.67 @ 6 s | 68% | 27 / 0 / 0 / 1 | Only upload pushed past its seed (days 2-4) |
| 16 Nov | That annoying seatbelt lock is the same thing that saves you in a crash. | ? | 32 s | no CC | ? | 1,417 | 1,467 | | 53% | 67% | | | 25 / 0 / 0 / 1 | |
| 16 Nov | "November 16, 2026" (topic ?) | ? | 31 s | no CC | ? | 806 | 808 | | **27%** (worst) | 105% | 0.50 @ 9 s | 27% | 9 / 0 / 0 / 0 | Date title; most swiped |
| 16 Nov | Why are School Buses Yellow?? | ? | 47 s | no CC | ? | 1,358 | 1,438 | | 57% | **100%** | 0.61 @ 7 s | 34% | 44 / 0 / 0 / 1 | Best hold for its length |
| 17 Nov | The line to buy GTA VI is 3,000 miles long! | ? | 41 s | no CC | ? | 408 | 946 | | 57% | 62% | | | 15 / 1 / 0 / 0 | Seed arrived on day 2 |
| 18 Nov | The 63yo Woman who survived Niagara Falls in a Barrel! | "In 1901, a 63-year-old woman decided to go over Niagara Falls." | 36 s | none | ? | 1,271 | 1,293 | | 49% | 69% | 0.34 @ 9 s | 46% | 28 / 2 / 0 / 2 | Repo: `videos/niagara-barrel` |
| 18 Nov | This Toilet Sunk a Submarine! | ? | 41 s | no CC | ? | 1,190 | 1,230 | | 53% | 52% | | | 21 / 0 / 0 / 4 | |
| 19 Nov | Stupid Phil Won't Leave! | ? | 53 s | no CC | voice B (Qwen3 clone) | 1,786 | 1,795 | | 46% | 71% | 0.49 @ 10 s | 52% | 37 / 3 / **2** / 3 | 2nd most views; most comments and shares; best ending (RRP 0.95) |
| 23 Nov | How a Guardrail Saves Lives! | ? | 42 s | no CC | ? | 1,103 | (pending) | | 47% | 70% | | | 33 / 1 / 0 / 1 | |
| 24 Nov | "November 23, 2026" = **Vasa** | "Sweden's largest warship only sailed for twenty minutes!" | 58 s | none | am_puck (Kokoro) | (pending) | (pending) | | (pending) | (pending) | (pending) | (pending) | — | Public counter 193 views at about 1.5 days. Analytics has no data yet. Re-pull 27 Nov |
| 26 Nov | How Matches Were Invented! (safety-matches) | "The oldest way to make fire is to rub two sticks together." | 57 s | **read-along (yellow active word)** | voice B (Qwen3 clone) | 1.2K at 8 h (flat after ~4 h) | (pending) | **60.5%** | (pending) | **~139%** (AVD 1:19 on 57 s; Studio: "0:41 more than usual") | (pending) | (pending) | (pending) | First Short in look v2 + Fix-Fail Chain + captions. Best hold by far (loops/rewatches); views still one test batch. 98.3% Shorts feed. Retention curve pending (2 days) |

Engaged ÷ views across the 17 Shorts with data: median **53%**, range 27-68%. Views: median **1,248**. Totals:
3 shares and 26 subscribers gained on about 23k views.

## What the data shows (observations)
1. **Every Short gets one test batch and stops.** About 1,000-1,300 Shorts-feed views arrive within roughly 24 h, then
   near zero. 84-100% of 7-day views come in the first 48 h. 94-97% of views come from the Shorts feed (`SHORTS`
   traffic source), with search at 1-4% and subscribers at almost nothing. Only *Barrels* got a second push (2,868 views).
   This is the "seed audience" stage YouTube describes (`research/vasa/REPORT.md`, official line): no upload has passed it.
2. **About half of each test batch swipes in the opening seconds.** Engaged ÷ views has a median of 53%.
3. **The worst stretch is seconds ~6-10, on every curve.** All 7 retention curves reach their lowest relative
   performance at 6-10 s (0.26-0.67), i.e. worse than similar-length YouTube videos at exactly that point. After that,
   relative performance climbs every time and ends at 0.68-0.95: viewers who get past ~10 s watch better than average.
   The middles and endings are not the problem.
4. **Long uploads bleed through the middle.** *Eiffel* (60 s) and *Airplane windows* (67 s) lose half their viewers by
   the 25% mark and keep 20-21% at the end. The 13-47 s Shorts keep 27-68% at the end.
5. **Almost nobody shares.** 3 shares in total, 2 of them on *Phil*. Likes are 2-10% of engaged views.
6. **Length alone doesn't sort the results.** The 13 s *Barrels* got the most views. The 47 s *School buses* held 100%
   viewed and still got only a seed batch.
7. **Captions are untested.** No upload has a CC track, and the repo's rule is "no captions or labels". There is no
   captions comparison in this data.
8. **Vasa is the first Short whose test batch itself is small:** 193 public views at about 1.5 days, against
   1,100+ in the first day for every other Short. Analytics hasn't caught up, so the data can't say why yet.

9. **safety-matches (8 h):** the new format holds viewers far better than anything before (AVD 1:19 on a 57 s Short,
   ~139%, so many watch it more than once; previous best Avg % viewed was 105%). But the test batch was the usual size
   (~1.2K, flat after ~4 h), and 39.5% still swiped away at the start. So the body works; the **opening** is what
   limits distribution. Its first line is a calm statement ("The oldest way to make fire is...") over a caveman
   sitting down, with no question or surprise in the first 2 s.

10. **Reference study (2026-11-28), outside channels in our format:** *Random numbers* (9.7M views, 47 s) and
    *Pudding money glitch* (3.4M, 59 s). Both: one subject per shot, a new picture every 2–2.5 s, plain bright sets,
    big expressive faces, one small white caption word, and a "person beats a system" story with a huge number as the
    payoff. Details and rules: `ANIMATION-PLAYBOOK.md` section 1b; frames and transcripts in `refs/`.

## Hypotheses (not shown by the data)
- **Our shots are too busy, not too many.** The references change the picture *more* often than we do, but each shot
  has one subject on a plain background. Test: the next video built to playbook 1b, same voice and length band.
- **Story type matters.** Both references are about one person and a clever stunt; traffic-lights is the history of
  an object. Compare its retention with safety-matches (people with a problem) when the numbers are in.
- The 6-10 s dip is the "orient" stretch after the hook (dates, names, setup), e.g. Niagara line 2-3 and Vasa L02-L04
  (guns, sculptures, "The King had approved the design himself."). It matches the "long dates/names before viewers
  know why they matter" warning in `SHORTS-STORYTELLING.md`. **Test:** a second hook or reveal by ~6 s.
- The low share count suggests the Shorts inform but don't give a "you have to see this" payoff. *Phil*, a comedy
  story, got 2 of the 3 shares.
- Vasa's small test batch: possibly an opening that reads poorly at phone size, or simple counter lag. The date title
  probably isn't the cause: the 12 Nov date-titled Short did fine. Check Studio's "Viewed vs swiped" for Vasa first.
- Titles probably matter little in the feed (search brings 1-4% of views), but a date title wastes the search and
  browse traffic there is.

## Experiments
| Next upload | Variable changed | Held constant | Success looks like |
|---|---|---|---|
| next after safety-matches | **Opening only:** first 1.5 s = a surprising claim or question shown on screen (e.g. "Matches used to explode in your pocket"), with motion on frame 1; body format unchanged (Fix-Fail Chain, look v2, read-along captions, voice B) | everything after ~3 s | Stayed to watch > 70%; views keep rising after hour 4 |
| next after traffic-lights | **Visual simplicity (playbook 1b):** one subject per shot, plain bright sets, picture change every 2–2.5 s, person-beats-a-system story | voice B, piano, read-along captions (1–3 words), hook on frame 1, ~45–60 s | Stayed to watch > 70%; Avg % viewed ≥ safety-matches |
| after that | **Captions only:** one small white word, no highlight | everything else | Stayed to watch and AVD not lower |
| (Step 2) | Hook extended: claim proven on frame 1 **and** a second reveal by ~6 s | voice, length band | Engaged ÷ views > 60%; RRP at 10 s > 0.5; any views past day 2 |
