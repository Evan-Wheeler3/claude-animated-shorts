# Verification pass: YouTube's official Shorts statements and the @RicksClips3000 channel profile

All pages below were read on **2026-11-23**. Method: WebFetch could not resolve blog.youtube ("ENOTFOUND"), so every page was downloaded with `curl` through the session proxy and its text extracted locally. On YouTube I parsed the `ytInitialData` / `ytInitialPlayerResponse` JSON embedded in the public HTML. No videos were downloaded or transcribed; I used only titles, counts, upload dates and lengths.

Tags: **VERIFIED** = exact quote seen on the page named. **CORRECTED** = the earlier note was wrong or overstated, and the right version is given. **STILL UNVERIFIED** = no primary page confirmed it, with the reason.

This file checks `youtube_official.md` (abbreviated "YO" below) and `channel_ricksclips3000.md` (abbreviated "CH").

## 1. YouTube Help Center: Shorts analytics metrics, view counting, and how recommendations work

### Takeaway
The Help Center now defines the Shorts metric as **"Stayed to watch"**, which it calls "the percentage of times viewers stayed to watch past the initial seconds of a Short". Engaged views exclude loops. Average view duration (AVD) and average percentage viewed (APV) are calculated only over engaged views. In current Help wording, a public view counts "the moment a video starts to play across all formats". The recommendations article (answer 16533387) lists general signals, including surveys, likes, shares, comments, "not interested", and how long and how much viewers watch. It does **not** contain the Shorts-specific list of signals that YO section 1 attributed to it.

### Cited Findings
- **VERIFIED.** The "Metrics to know" section of *Understand your YouTube content performance* defines four metrics:
  - **Engaged views:** "How many times viewers stayed to watch past the initial seconds, not including any loops. This does not include co-views."
  - **Stayed to watch:** "The percentage of times viewers stayed to watch past the initial seconds of a Short."
  - **Average view duration:** "Average minutes watched among those who stayed to watch. This is calculated from engaged views and their corresponding watch time."
  - **Average percentage viewed:** "Average percentage of a video watched among those who stayed to watch. This is calculated from engaged views and their corresponding watch time."

  [support.google.com/youtube/answer/12220281](https://support.google.com/youtube/answer/12220281?hl=en)
- **VERIFIED.** The Shorts tab of the same article has a card called **"How viewers engaged"**, described as "The percentage of times viewers stayed to watch past the initial seconds of a Short." Another card, *How viewers find your Shorts*, lists "Shorts feed, YouTube search, channel pages, browse features, external, and others." — [answer/12220281](https://support.google.com/youtube/answer/12220281?hl=en)
- **CORRECTED (YO section 5).** The label "Viewed vs. swiped away" does not appear in the current Help article; the current label is "Stayed to watch". The older label is confirmed only historically, by SEJ in 2023 and by Rene Ritchie in April 2024 (see section 3). The rename date remains **STILL UNVERIFIED**, because no page gives it.
- **VERIFIED.** *Understand your YouTube engagement* defines **Views** as: "The number of legitimate views for your channels or content. Views are counted the moment a video starts to play across all formats, including Shorts, long form videos (VODs), and live streams. This metric incorporates co-viewing estimates for viewers watching together on TV screens." It repeats the same AVD definition as answer 12220281. — [support.google.com/youtube/answer/9313698](https://support.google.com/youtube/answer/9313698?hl=en)
- **VERIFIED (new item).** *How engagement metrics are counted* says: "Beginning November 2026, YouTube public view counts on video watch pages incorporate co-views by estimating the number of individual viewers watching together on TV screens." Also: "Views are counted the moment a video starts to play across all formats, including Shorts, long-form videos (VODs), and live streams." And: "This update won't impact your YouTube Partner Program (YPP) earnings or eligibility. YPP earnings will still be based on 'engaged views' and 'engaged watch hours'. YPP eligibility will still be based on 'qualified views.'" — [support.google.com/youtube/answer/2991785](https://support.google.com/youtube/answer/2991785?hl=en)
- **VERIFIED (new item).** *YouTube Shorts monetization policies* says: "Starting February 1, 2027, to be eligible to earn a share of Shorts ad revenue from the Creator Pool and YouTube Premium revenue for each month, you will need to have at least 10 million qualified Shorts views in the last 90 days." It also says: "For the purposes of calculating payments, YouTube uses eligible 'Engaged views'." — [support.google.com/youtube/answer/12504220](https://support.google.com/youtube/answer/12504220?hl=en)
- **STILL UNVERIFIED (YO section 3).** CreatorEssentials' quoted line, "To count as qualified, Shorts views have to come from public Shorts and be engaged views", was not found on answers 2991785, 12504220 or 12220281. Those pages use the term "qualified views" but do not define it in that wording.
- **Help wording on the 31 March 2025 change: STILL UNVERIFIED as a Help-page quote.** The current Help pages describe only the present rule ("counted the moment a video starts to play"). They do not mention the March 2025 date. The date and the wording are verified from press coverage in section 2.
- **VERIFIED.** *YouTube's Recommendation System* says: "The algorithm is learning from audience signals." The signals are grouped into "Personalization", "Content Performance" ("how well the video performs when it's offered to viewers, like whether they choose to click, watch, or positively engage with the content") and "external factors". — [support.google.com/youtube/answer/16533387](https://support.google.com/youtube/answer/16533387?hl=en)
- **VERIFIED.** The same article, on watch history: "This includes what videos they choose to watch, ignore, or dismiss ('not interested' feedback), how long and how much of a video they watch, and other viewing routines. We also consider content they've searched for or engaged with, such as likes, shares, comments, 'not interested' feedback, and survey responses." — [answer/16533387](https://support.google.com/youtube/answer/16533387?hl=en)
- **VERIFIED.** The same article, on "the algorithm": "Creators often focus on 'the algorithm' but what matters is what viewers enjoy. Instead of asking, 'Does the algorithm like my content?,' creators should focus on their 'audience' and ask, 'Does my audience like this?'" — [answer/16533387](https://support.google.com/youtube/answer/16533387?hl=en)
- **VERIFIED.** The same article, on publish time: "we haven't observed any evidence it affects long-term viewership. This is to say, that publish time is not known to impact a video's long-term performance." — [answer/16533387](https://support.google.com/youtube/answer/16533387?hl=en)
- **VERIFIED.** The same article, on one-off experiments: "The algorithm uses fresh performance data for each individual video, rather than relying on past results, so a single experiment that doesn't land won't necessarily hinder your channel's potential … frequently sharing content that doesn't resonate, can, over time, affect your channel's overall performance." Also: "a consistent title and thumbnail style makes your videos instantly identifiable"; "Prioritize consistent quality content over a high frequency of uploads"; and "positive viewer interactions are a strong signal". — [answer/16533387](https://support.google.com/youtube/answer/16533387?hl=en)
- **CORRECTED (YO section 1).** The claim that the Help article names Shorts-specific signals ("share of viewers who choose to view rather than swipe, average view duration, average percentage viewed, likes, and post-watch survey results") is not on answer 16533387. The current article does not mention swipes. The claim is downgraded to the StreamNeo and OutlierKit paraphrase only. The general signals in that list (how long and how much viewers watch, likes, surveys, "not interested") are in the article, but they are not tied to Shorts.
- **Bonus: VERIFIED.** *Understand three-minute YouTube Shorts* says: "Any videos uploaded on or after this date with a square or vertical aspect ratio up to three minutes in length will be categorized as Shorts on YouTube." It also says: "Any Short that is over one minute in duration with an active copyright claim of any type, including manual claims, will be blocked globally on YouTube." And: "There are no changes in limitations for Shorts that are less than one minute in length." — [support.google.com/youtube/answer/15424877](https://support.google.com/youtube/answer/15424877?hl=en)

### Inferences
- APV and AVD are measured only over viewers who stayed past the first seconds. A Short can therefore have a high APV while many viewers still swipe away. "Stayed to watch" is the hook metric and APV is the hold metric; read them separately.
- For a Vasa Short over 60 s, the one-minute Content ID rule matters. Any claimed music or clip would block a Short longer than 60 s worldwide. Under 60 s, the rule does not apply.

### Gaps
- No Help page gives a numeric threshold for "initial seconds".
- No current Help page gives a Shorts-specific list of ranking signals.

## 2. blog.youtube and press: the 3-minute Shorts post, the March 2025 Shorts view change, and the August 2026 change for all formats

### Takeaway
All three dated changes are confirmed on primary or near-primary pages:
- **Oct 2024:** Shorts of up to 3 minutes, from 15 October, in a blog post by Todd Sherman dated 3 Oct 2024.
- **31 March 2025:** Shorts public views count every play or replay. TechCrunch and SEJ report this, quoting YouTube.
- **24 August 2026:** all formats count a view from the first frame. A blog post dated 19 Aug 2026 announces it and explicitly says there is "no change to recommendations".

### Cited Findings
- **VERIFIED.** blog.youtube, *Tall updates coming to Shorts*, byline Todd Sherman, dated **Oct 03, 2024**: "Starting on October 15, you can upload Shorts up to 3 minutes long. This was a top requested feature by creators, so we're excited to give you more flexibility to tell your story. This change applies to videos that are square or taller in aspect ratio, and won't affect any videos you uploaded before October 15. And we'll be working to improve recommendations for longer Shorts in the coming months." The same post announces templates, a Shorts trends page, comment previews in the feed, and "Show fewer Shorts". — [blog.youtube/news-and-events/tall-updates-coming-to-shorts](https://blog.youtube/news-and-events/tall-updates-coming-to-shorts/)
- **CORRECTED (minor).** The page says "top requested", with no hyphen. Its byline is Todd Sherman. That fits Variety's attribution, which I did not re-check.
- **VERIFIED.** TechCrunch, 26 Mar 2025: "Shorts views will now count the number of times a creator's Short starts to play or replay. In the past, a view had been counted after a Short was viewed for a certain number of seconds." Also: "The metric, now called 'engaged views,' … 'Advanced Mode' within YouTube Analytics", and "The change goes into effect on March 31." — [TechCrunch](https://techcrunch.com/2025/03/26/youtube-is-changing-how-youtube-shorts-views-are-counted/)
- **VERIFIED.** Search Engine Journal, 26 Mar 2025: "The upcoming change will count a view whenever a Short starts to play or replay, with no minimum watch time requirement. YouTube will preserve its current way of counting views under the new name 'engaged views.'" Also: "The 'engaged views' metric will be available in YouTube Analytics' Advanced Mode only." And: "YouTube advises using engaged views when comparing content published before March 31 for a consistent analysis." — [SEJ](https://www.searchenginejournal.com/youtube-changes-shorts-view-counts-no-change-to-monetization/543005/)
- **CORRECTED (YO section 3, small).** SEJ says YPP eligibility and earnings "will be based on 'engaged views'". The current Help page (answer 2991785) distinguishes the two: earnings use engaged views, and eligibility uses "qualified views". Use the Help page wording.
- **VERIFIED.** blog.youtube, *What are 'Engaged' Views on YouTube?*, dated **Aug 19, 2026**: "Starting August 24, 2026, views across YouTube are counted from the first frame going forward — Shorts, Long Form, Podcasts, Live; all the formats. This is the new, standardized, consistent definition of a view. And the previous definition of a view will now be called an 'engaged view.'" — [blog.youtube/inside-youtube/engaged-views-youtube-explained](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)
- **VERIFIED.** The same post defines an engaged view as "clicking to watch or watching past the initial seconds. This has been, and will continue to be, how you qualify to earn (as long as the content is also public)." For the Shorts feed: "The moment it starts to play, it's counted as a view. If you let it keep playing for some amount of seconds after that first frame, it's an engaged view." — [blog.youtube](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)
- **VERIFIED (resolves a YO gap).** The same post: "the vast majority of analytics remain anchored on engaged views, so the way metrics like CTR, AVD, and retention are calculated hasn't changed. Likewise, there's no change to recommendations — the algorithm — and no change to the YouTube Partner Program, that's based on qualified views." — [blog.youtube](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)
- **CORRECTED (YO section 3).** The date conflict ("24 Aug vs 19/27 Aug") is resolved: the post is dated 19 Aug 2026 and the change took effect 24 Aug 2026.
- **STILL UNVERIFIED.** The claim that replays by the same viewer don't add engaged views ("3 loops = 1 engaged view"). The Help page says only that engaged views are counted "not including any loops", which supports the idea but gives no per-viewer rule.

### Inferences
- YouTube says explicitly that recommendations did not change with the first-frame counting, so view inflation since 24 Aug 2026 is cosmetic. When benchmarking against the channel in section 4, its public counts (counted from the first frame, and including TV co-view estimates since Nov 2026) will run higher than its engaged views by an unknown margin.
- I found no sign on blog.youtube that the "improve recommendations for longer Shorts" work was ever reported as shipped. That is STILL UNVERIFIED, not disproved.

### Gaps
- Not checked: other 2025-2026 blog.youtube posts on Shorts recommendations. I fetched only the three posts above plus the "Rene's Top Five" posts in section 3.

## 3. Todd Sherman (Creator Insider, Aug 2023) and Rene Ritchie statements

### Takeaway
The core Sherman 2023 quotes ("The audience is the algorithm", the "meaningful threshold" view, the "seed audience" explanation) are confirmed in TechCrunch and SEJ. Two claims in YO were wrong:
- **Hashtags:** Sherman did not say "not necessary". TechCrunch reports that creators "should be using them", and SEJ reports they "aren't required but can be meaningful".
- **The Ritchie swipe quote:** it comes from Ritchie's own blog.youtube post of 4 Apr 2024, not from Tubefilter. Several Ritchie paraphrases attributed to Tubefilter are not on the Tubefilter page.

### Cited Findings
- **VERIFIED.** SEJ, 28 Aug 2023, on "the 11-minute conversation" with Sherman: "He said, 'The audience is the algorithm.'" — [SEJ](https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/)
- **VERIFIED.** SEJ, on how a view is defined, quoting Sherman: "What we try and do with a view is have it encode for your intent of watching that thing so that creators feel like that view has some meaningful threshold that the person decided to watch." Also: "Exact thresholds aren't shared publicly to avoid potential 'gaming' of the system." — [SEJ](https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/)
- **VERIFIED (SEJ wording, not TechCrunch).** SEJ: "A new metric in YouTube Analytics shows the percentage of times a Short is viewed versus swiped away to help creators analyze performance."
- **CORRECTED (YO section 5).** YO cited TechCrunch for this line. The TechCrunch article does not mention the viewed-vs-swiped metric (0 matches for "swiped"). It is also not a direct Sherman quote calling it a "great metric"; that wording is unverified. — [SEJ](https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/)
- **VERIFIED.** SEJ: "Sherman explained that Shorts may initially gain a few hundred or thousand views and then drop off due to the algorithm's attempt to find an audience for the content." — [SEJ](https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/)
- **VERIFIED.** TechCrunch, 25 Aug 2023, quoting Sherman directly: "There are parts of the algorithm that try and find people, find creators an audience … sometimes those algorithms will go and effectively find like a seed audience, find a set of people that may enjoy your video. And depending on how that goes, it may get a lot more traffic or it may taper off." — [TechCrunch](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/)
- **VERIFIED (TechCrunch paraphrase, not a direct quote).** Each of the following is TechCrunch's paraphrase of Sherman. — [TechCrunch](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/)
  - "the Shorts feed prioritizes a more diverse feed because people are flipping through hundreds of videos versus maybe 10 or 20 in long-form".
  - "there's not a certain length that benefits creators … creators should think about how long they need to tell their story".
  - "Shorts will remain focused on videos that are 60 seconds and under". This is the 2023 position that the Oct 2024 change reversed.
  - "Time of day in publishing is also not a factor to optimize for, with the exception of someone focused on news".
  - "The quantity of Shorts published is also not a factor in gaining traction".
  - He "recommended against deleting and reposting Shorts … given the risk that's seen as spam".
- **CORRECTED (YO section 2, hashtags).** TechCrunch: "hashtags can be useful and meaningful, and creators should be using them but it's hard to generalize this advice." SEJ: "Hashtags aren't required but can be meaningful depending on the creator's needs and context." So the summary is "not required, can be meaningful", not "not necessary". YO's "Not officially confirmed" line saying hashtags are "officially contradicted" overstates it. — [TechCrunch](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/); [SEJ](https://www.searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953/)
- **CORRECTED (YO "Not officially confirmed", re-uploads).** YO listed "deleting and re-uploading an underperforming Short" as having no official statement. TechCrunch reports that Sherman advised against it because of the spam risk (see the paraphrase list above).
- **STILL UNVERIFIED (YO section 2).** The direct quote "It's not something that we think about optimizing for" (MediaPost). I did not fetch MediaPost, because it is not on the allowed host list. TechCrunch gives the same idea only as a paraphrase.
- **VERIFIED and CORRECTED source (YO section 1).** The quote "you have to start playing the actual video (views) and see if someone watches (retention) or leaves (swipes away)" is from Rene Ritchie's post on blog.youtube, dated **Apr 04, 2024** (its URL slug says march-4-2024). Tubefilter is not the source. Full passage: "I asked Todd Sherman, our head of Shorts, about it. The gist is, for long-form on the home page, there are thumbnails (impressions) that you can click-through (CTR) and watch (views). But the vast majority of Shorts are watched in the Shorts feed, where there are no thumbnails, and so no impressions or click-throughs. For the Shorts feed, you have to start playing the actual video (views) and see if someone watches (retention) or leaves (swipes away). So, for Shorts, those initial hundreds or thousands of views are more like what long-form gets with those initial thumbnail impressions … Just instead of impression and click-through, you have view vs swiped away. (Which is the actual metric in YouTube Analytics). But the Shorts feed, like the home page, is competitive. So if your Short doesn't perform as well as others in the feed, it won't go much beyond those initial, impression-like views (though it may blow up another day)." — [blog.youtube, Rene's Top Five, Apr 4 2024](https://blog.youtube/creator-and-artist-stories/renes-top-five-march-4-2024/)
- **VERIFIED.** Tubefilter, 26 Aug 2024 (James Hale): "Since Aug. 19, Ritchie has posted six Shorts, each featuring a different question, with answers from both himself and YouTube's Senior Director of Growth and Discovery, Todd Beaupré." Ritchie is quoted: "The algorithm follows the audience, so please the audience … Check your Audience tab in Analytics, see which videos are growing your audience. Make more videos like those and videos people who watch those videos would just love to watch next. And then the algorithm will take care of itself." — [Tubefilter](https://www.tubefilter.com/2024/08/26/rene-ritchie-shorts-creator-faqs/)
- **STILL UNVERIFIED (YO section 1).** Three Ritchie claims are not on the Tubefilter page (searched for "variety", "same system", "pulls" and "Shorts audience"). No primary page was found for them.
  - Shorts and long-form are "the same system" in principle.
  - Shorts offer "more variety in your recommendations".
  - "the algorithm pulls videos for viewers".
- **VERIFIED.** blog.youtube, *Rene's Top Five, Aug 24 2023*, confirms that the Sherman Q&A took place: "Todd Sherman, who heads up the Shorts team at YouTube, was kind enough to sit down with me and answer…" The questions covered the algorithm, what counts as a view, length, thumbnails, hashtags, and spikes and drop-offs. — [blog.youtube](https://blog.youtube/culture-and-trends/renes-top-five-august-24-2023-edition/)
- **CORRECTED (YO section 1).** The line "an entirely different format, with different consumption behaviors" is not in the blog.youtube deep-dive post (Jan 28, 2025, Sherman and Jenny Hoyos). It remains attributed only to Social Media Today, which I did not re-check. The deep-dive post itself contains quotes from **Jenny Hoyos (a creator, not YouTube staff)**: "I really do think you have one second to hook someone, especially on Shorts." And: "Thumbnails are not important because 99.9% of the views are coming from the Shorts feed…" — [blog.youtube deep dive](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/)

### Inferences
- Ritchie's "initial views are basically impressions" framing, written in 2024 before view counting changed, now applies even more literally. Since 2025-2026 a public view is a first-frame play, so the early view count is literally an impression count. Stayed to watch is the Shorts equivalent of click-through rate.

### Gaps
- I did not open the Creator Insider video page for 23 Aug 2023, and the official transcript remains unchecked. TechCrunch and SEJ quote it directly, so it was not needed.
- The Nov 2025 Ritchie "24-48 h" claim and the "Sept 2026 Beaupré interview" (YO "Not officially confirmed") were not checked. They remain STILL UNVERIFIED.

## 4. Channel @RicksClips3000: profile, top Shorts, runtimes, cadence, title patterns

### Takeaway
The channel is real: **"Ricks Clips", @RicksClips3000, channel ID UC_VeFWlNnRIg558hAeIpJ4w, United States, joined 26 Aug 2025, 208K subscribers, 155 videos, 486,315,858 views** (YouTube About panel, 23 Nov 2026). It has only a Shorts tab, with no long-form. The current format (titles of the "Why/How/The X that Y" kind) started on about **6 Oct 2026** and has run about every 1.4 days since. Runtimes in that run are mostly **55-67 s**, with a median of about **60 s**. The top Short is "The Ancient Jar That Warned an Empire", with 35.5M views.

### Cited Findings: profile
- **VERIFIED.** YouTube About panel (`aboutChannelViewModel`): description "Hey I'm Rick! Just a regular guy who loves doing voiceovers."; country "United States"; "208K subscribers"; "486,315,858 views"; "Joined Aug 26, 2025"; "155 videos". The page header shows the handle as "@RicksClips3000". — [youtube.com/@RicksClips3000/about](https://www.youtube.com/@ricksclips3000/about)
- **VERIFIED.** The channel exposes only a **Shorts** tab; no Videos or Live tab appears in the page data. Its sort chips are "Latest", "Popular" and "Oldest". — [youtube.com/@RicksClips3000/shorts](https://www.youtube.com/@ricksclips3000/shorts)
- **CORRECTED (CH section 1).**
  - The founding date was a gap; it is **26 Aug 2025**.
  - The live subscriber count is **208K**, which matches Viewstats' snippet of 207K.
  - The lower tracker figures (143K, 187K) were older readings.
  - CreatorRecon's page now shows "204.0K subscribers", "482.3M total views", "154 videos", "over 1.2 years on YouTube" and "Upload Cadence 1.9/week", with "Data as of 11/22/2026". — [CreatorRecon](https://www.creatorrecon.com/channel/ricksclips3000)
  - InfluencerMetric.com now shows "207K subscribers and 486.3M total views", 155 videos, "Uploads / mo 20.3" and "32.6M Monthly views". Its earnings figures are estimates, not facts. — [InfluencerMetric](https://influencermetric.com/tools/youtube-analyzer/ricksclips3000)
- **STILL UNVERIFIED.** Social Blade returned HTTP 403. The Viewstats page rendered with no numbers, because its data loads in the browser.

### Cited Findings: top Shorts
"Popular" sort was **not accessible**. Paging the sort needs YouTube's internal browse API, and this session's permission system denied that call. The ranking below therefore covers the **48 most recent Shorts** on /shorts. Exact view counts and upload dates come from each Short's public page, read 2026-11-23.

The 48 latest Shorts sum to about 309M of the channel's 486M views, so the **107 older videos hold about 177M views**. Some older Short could outrank the entries below, so this is **not proven to be the channel's all-time top 15**. CreatorRecon's "Top videos" (Data API) lists the same top items in the same order (Jar 35.4M, Railroads 30.9M, Job 19.0M, Storm Oil 16.9M, Roller Coasters 13.2M, …), which supports the ranking.

Sources: [/shorts](https://www.youtube.com/@ricksclips3000/shorts) plus `youtube.com/shorts/<id>` for each entry.

| # | Title | Views (exact) | Uploaded (PT) | Age at 23 Nov | Length |
|---|---|---|---|---|---|
| 1 | The Ancient Jar That Warned an Empire | 35,510,419 | 2026-10-19 | 35 d | 65 s |
| 2 | Why Perfect Railroads Don't Work | 31,330,720 | 2026-11-01 | 22 d | 65 s |
| 3 | The Job Nobody Wants in Japan | 19,023,067 | 2026-10-21 | 33 d | 61 s |
| 4 | Why Sailors Carried Storm Oil | 16,974,777 | 2026-10-30 | 24 d | 65 s |
| 5 | Your Brain's Secret Idea Zone | 16,699,240 | 2026-10-10 | 44 d | 39 s |
| 6 | The Window That Breaks Japan's Gambling Law | 16,261,943 | 2026-10-15 | 39 d | 45 s |
| 7 | What the Grave Bell Really Meant | 14,087,148 | 2026-10-23 | 31 d | 60 s |
| 8 | This Shape Saved Roller Coasters | 13,419,495 | 2026-11-05 | 18 d | 63 s |
| 9 | The Pink Prison Cell Experiment | 11,813,441 | 2026-11-03 | 20 d | 65 s |
| 10 | The Instinct That Makes You Crash | 11,724,843 | 2026-11-15 | 8 d | 59 s |
| 11 | Why Cashiers Keep Winning The Lottery | 10,740,846 | 2026-10-22 | 32 d | 58 s |
| 12 | The Burglar Who Only Moved Furniture | 10,617,994 | 2026-10-20 | 34 d | 58 s |
| 13 | Levels of Pirate Cannonballs | 10,036,105 | 2026-10-18 | 36 d | 64 s |
| 14 | Why the Second Draw Always Wins | 10,001,062 | 2026-10-26 | 28 d | 56 s |
| 15 | How One Cart Stopped an Entire Army | 9,812,493 | 2026-11-11 | 12 d | 67 s |
| 16 | An Unstoppable Spear vs an Unbreakable Shield | 9,645,799 | 2026-10-17 | 37 d | 45 s |
| (17) | Why Humans Can't Pick Random Numbers | "9.6M" (shelf) | date not retrieved | – | – |

**Other Shorts in the current run** (views from each Short's page; "shelf" means the /shorts list figure):

| Title | Views | Uploaded | Length |
|---|---|---|---|
| What If Humans Invented Teleportation? | 7.34M | Oct 6 | 54 s |
| How Mine Salting Worked | 7.30M | Nov 13 | 61 s |
| He Could Spot Winning Tickets Just by Looking | 6.86M | Oct 24 | 63 s |
| The Scientist's Insane Time Test | 6.8M (shelf) | – | – |
| How a Mirror Rigged a Horse Race | 5.75M | Oct 29 | 64 s |
| Why Drivers Started Filming The Road | 5.05M | Nov 8 | 62 s |
| Would You Upload Your Brain? | 3.98M | Oct 8 | 57 s |
| The Town Built Around a Button | 3.87M | Oct 27 | 66 s |
| This Knight Found the Ultimate Loophole | 1.70M | Oct 17 | 41 s |
| Why Samurai Feared The Flying Thunder | 1.59M | Nov 17 | 59 s |
| This Tree Hates You | 1M (shelf) | – | – |
| The Prisoner Who Tunneled Into a Bank | 975K | Nov 19 | 55 s |
| Why Astronauts Can't Flush in Space | 599K | Nov 21 | 61 s |
| Every Memory Has a Price | 598K | Oct 25 | 78 s |
| How Painkillers Actually Work | 331K | Oct 16 | 35 s |
| The Science Behind Slot Machines | 154K | Oct 14 | 31 s |

Notes on this table:
- The three newest uploads (Nov 17-21) are still accruing views.
- The two tables together list all 33 current-run Shorts: 17 in the first table and 16 in the second.

- **Older run (pre-October 2026).** The 15 oldest of the 48 visible Shorts have reaction-style titles with emoji, such as "Oh Nah 💀" (88K, 1 Aug 2026, 12 s), "The Strange Door" (522K, 7 Jul 2026, 17 s), "You're Free Now 😭🤣" (389K) and "Very Specific Delivery" (1M). They are far shorter and get far fewer views. I did not view their content. — [/shorts](https://www.youtube.com/@ricksclips3000/shorts)
- **CORRECTED (CH section 3).** viralhooks' figure of 27.8M for "Why Perfect Railroads Don't Work" is now **31.3M**, and the Short ranks **#2**, not #1. "The Ancient Jar That Warned an Empire" is #1 at 35.5M.
- **STILL UNVERIFIED (CH sections 1 and 3).** Revid's "15 newest Shorts ≈ 167M as of 2026-11-08, 5 over 10M" refers to a different date window and cannot be re-derived. As of 23 Nov, the 15 newest Shorts total about 131M, but that is a different set of 15.

### Cited Findings: runtimes and cadence (current run)
- **VERIFIED (computed from `lengthSeconds` on 30 Shorts' public pages).** Median 60.5 s, mean 57.4 s, range 31-78 s. 15 of the 30 run longer than 60 s, and only 6 are 45 s or shorter. Those six are mostly from the run's first two weeks: 31 s, 35 s, 39 s, 41 s, 45 s and 45 s. Every Short from 18 Oct onward runs 55-78 s.
- **CORRECTED (CH section 2).** The imitator's estimate of "~65 s" is close but slightly high. The typical length is about 55-67 s.
- **VERIFIED (computed).** The 33 current-run uploads span 6 Oct to 21 Nov 2026 (47 days), about **0.7 per day, or ≈5 per week**.
  - This conflicts with CreatorRecon's "1.9/week", which is probably a lifetime average (155 videos over about 65 weeks).
  - InfluencerMetric's "20.3 uploads / mo" fits the recent rate.

### Cited Findings: title patterns (33 current-run titles)
- **Word count:** median 6 words (range 4-8).
- **Opening words:** "The …" ×10, "Why …" ×8, "How …" ×4, "This …" ×3, "What …" ×2, and one each of "Every", "He", "Levels", "An", "Your" and "Would".
- **Question marks:** only 2 of 33 titles are questions ("Would You Upload Your Brain?" and "What If Humans Invented Teleportation?"). Both come from the first week of the run. The "Why …" titles are statements without a question mark.
- **Patterns in the top 16:**
  - Mostly "The [object/person] That/Who [surprising verb]" (Jar, Burglar, Window, Instinct) or "Why [group] [did odd thing]" (Sailors, Cashiers, Perfect Railroads, Second Draw).
  - Two titles name Japan.
  - None uses a number. ("Levels of Pirate Cannonballs" implies a ranking without stating a number.)
  - None names a specific historical person or date.

### Inferences
- The breakout is recent and steep. The animated run began about 6 Oct 2026 and, after 47 days, accounts for most of the views across the 48 visible Shorts. This fits Revid's "October 2026" framing.
- For a Vasa Short, the channel's evidence points to:
  - a runtime of about 55-65 s rather than 30-45 s;
  - a 5-7 word declarative title built on a curious object or reason, with no question mark, no date, and possibly no proper noun (e.g. "Why the Grandest Warship Sank in Minutes" or "The Ship That Was Too Beautiful to Float").

  These are inferences from 33 titles, not causal proof. Shorts over 60 s also fall under the Content ID blocking rule (section 1).
- The shorter early Shorts (31-45 s) mostly did worse, with two exceptions at 45 s and 39 s that reached 16M each. Length alone does not explain performance.

### Gaps
- The all-time Popular ranking was not obtained, because the internal browse API call was denied. The 107 older videos (about 177M views) are unranked.
- Runtimes and dates are missing for 3 Shorts: "The Scientist's Insane Time Test", "Why Humans Can't Pick Random Numbers" and "This Tree Hates You". Their watch pages returned no player metadata.
- Engaged views and "Stayed to watch" for this channel are private and not obtainable.
- Social Blade (403) and Viewstats (data rendered in the browser) gave no data.
