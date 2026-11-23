# What YouTube has officially said about Shorts recommendation and performance (2023-2026)

> **Method and limits (read first).** This session could not open pages directly: support.google.com, blog.youtube, techcrunch.com and searchenginejournal.com all failed DNS in the sandbox, so WebFetch did not work. Everything below comes from **web-search result excerpts**, which quote or summarise the primary pages. Wording marked as a quote is what the search excerpts gave as YouTube's or a staffer's words. **Check the exact wording against the primary URL before publishing any quote.** Help-center wording in particular is second-hand. Items backed only by creator or SEO blogs are labelled as such or moved to "Not officially confirmed".

## 1. How YouTube says Shorts are recommended (signals)

### Takeaway
YouTube's official framing, from Todd Sherman (Shorts product lead) in 2023 and Rene Ritchie (Creator Liaison) in 2024, is "the audience is the algorithm". A new Short goes to a small **seed audience**. In the feed there is no thumbnail, so the main early signal is whether viewers **watch or swipe away**, followed by how long they stay. YouTube has not published weights or thresholds and says that is deliberate, so the system can't be gamed.

### Cited Findings
- **Todd Sherman, Creator Insider Q&A, 23 Aug 2023:** "The audience is the algorithm." A Short may get a few hundred or a few thousand views and then drop off while the system looks for the right audience. The system first finds "a set of people that may enjoy the content" (the seed audience). — [Search Engine Journal, Aug 2023](https://searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953); [TechCrunch, 25 Aug 2023](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/); [Buffer summary](https://buffer.com/resources/youtube-shorts-algorithm/)
- **Sherman, 2023:** a Shorts view signals the viewer's intent to actively watch, which he called a "meaningful threshold". YouTube does not publish the exact threshold, to prevent gaming. Not every swipe counts as a view (unlike TikTok at the time). Sherman called "viewed vs. swiped away" a great metric for creators to watch. — [TechCrunch, 25 Aug 2023](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/); [MediaPost](https://www.mediapost.com/publications/article/388588/youtube-shorts-product-lead-offers-insights-for-cr.html)
- **Rene Ritchie, Q&A, Apr 2024 (citing Sherman):** most Shorts are watched in the feed, which has no thumbnails. For the Shorts feed, "you have to start playing the actual video (views) and see if someone watches (retention) or leaves (swipes away)." — [Tubefilter, 26 Aug 2024](https://www.tubefilter.com/2024/08/26/rene-ritchie-shorts-creator-faqs/)
- **Ritchie, 2024:** Shorts and long-form recommendation are the same system in principle, and both focus on viewer satisfaction. Shorts can offer "more variety in your recommendations" because they are short. He advised creators to think about the "Shorts audience" rather than the "Shorts algorithm". — [Tubefilter, 26 Aug 2024](https://www.tubefilter.com/2024/08/26/rene-ritchie-shorts-creator-faqs/)
- **Ritchie and Todd Beaupré (Senior Director, Growth & Discovery):** a six-part Shorts Q&A series began on 19 Aug 2024 ("What's the secret to pleasing the algorithm?"). The answer was to please the audience first. — [Tubefilter, 26 Aug 2024](https://www.tubefilter.com/2024/08/26/rene-ritchie-shorts-creator-faqs/); [Social Media Today](https://www.socialmediatoday.com/news/youtube-launches-q-a-shorts-series-for-creator-questions/725188/)
- **Ritchie's general framing:** "the algorithm pulls videos for viewers." It does not push videos out for creators. — via [Tubefilter](https://www.tubefilter.com/2024/08/26/rene-ritchie-shorts-creator-faqs/) / search excerpt
- **YouTube Help, "How YouTube recommendations work" (as paraphrased by third parties):** for Shorts, YouTube names these signals: the share of viewers who choose to view rather than swipe, average view duration, average percentage viewed, likes, and post-watch survey results. It also looks at "Not interested" and similar negative feedback. User surveys "help the system understand satisfaction, not just watch time." — paraphrased by [StreamNeo](https://streamneo.com/blog/how-the-youtube-shorts-algorithm-works) and [OutlierKit](https://outlierkit.com/resources/youtube-viewer-satisfaction-algorithm-2026/), not verified against support.google.com
- **Sherman, 2023, as summarised:** the Shorts feed behaves differently from the regular feed because it is "an entirely different format, with different consumption behaviors". — [Social Media Today](https://www.socialmediatoday.com/news/youtube-advice-for-shorts-creators-hashtags-algorithm/691835/); [YouTube Blog: Shorts deep dive with Todd Sherman and Jenny Hoyos](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/)

### Inferences
- For a 30-45 s animated history Short, the first seconds decide "watch vs swipe". After that, retention and satisfaction signals (completion, likes, surveys) decide whether the Short spreads past the seed audience. This follows from the official framing, but YouTube has not stated exact weights.
- The "few hundred views, then flat" pattern is described officially as the seed-audience search. It is not described as a penalty.

### Gaps
- I found no official ranked weighting of likes vs shares vs comments vs subscribes-from-Short. YouTube names likes and surveys, and blogs add shares, but nothing official quantifies any of them.
- I found no official statement that **loops/replays** count as a positive *ranking* signal. Officially, replays count toward public "views" (since March 2025) but not toward "engaged views" (see section 3).
- I could not verify the exact current Help-center list of Shorts signals; the primary page was unreachable.

## 2. Things YouTube said are NOT factors (or not required)

### Takeaway
Officially, posting time is "not something we optimize for", hashtags are optional, and YouTube says there is no ideal length or posting quota. Each of these came from Sherman's 2023 Creator Insider Q&A.

### Cited Findings
- **Posting time (Sherman, Aug 2023):** "It's not something that we think about optimizing for." He told creators to focus on the content rather than on a favoured time of day. — [MediaPost](https://www.mediapost.com/publications/article/388588/youtube-shorts-product-lead-offers-insights-for-cr.html); [OutlierKit summary](https://outlierkit.com/resources/youtube-shorts-algorithm/)
- **Hashtags (Sherman, Aug 2023):** not necessary for Shorts. They can help when tied to a real-world event or a specific topic. — [MediaPost](https://www.mediapost.com/publications/article/388588/youtube-shorts-product-lead-offers-insights-for-cr.html); [Social Media Today](https://www.socialmediatoday.com/news/youtube-advice-for-shorts-creators-hashtags-algorithm/691835/)
- **Length:** there is no ideal length, posting time or daily quota (a summary of YouTube's statements). Sherman advised prioritising storytelling over hitting a target duration. — [OutlierKit](https://outlierkit.com/resources/youtube-shorts-algorithm/) (secondary); length story in section 4
- **"Audience over algorithm" (Sherman, 2023):** creators benefit most when they focus on the audience rather than the algorithm. — [MediaPost](https://www.mediapost.com/publications/article/388588/youtube-shorts-product-lead-offers-insights-for-cr.html)

### Inferences
- Posting at a "magic hour" or adding #shorts carries no official weight. A topical history hashtag (an anniversary, a news tie-in) is the only use YouTube endorsed.

### Gaps
- No primary transcript was retrieved, so the exact wording on hashtags should be checked against the Creator Insider video of 23 Aug 2023.
- One blog says Ritchie stated in Nov 2025 that waiting 24-48 h between upload and publishing gives no recommendation benefit. I found only that single secondary source; see "Not officially confirmed".

## 3. How Shorts views are counted: the March 2025 change and the August 2026 extension

### Takeaway
From **31 March 2025**, a public Shorts "view" counts every time a Short **starts to play or replays, with no minimum watch time**. The old threshold-based count was kept as **"engaged views"** (Advanced Mode in Analytics). Earnings and YPP eligibility did not change: revenue is based on engaged views, and eligibility on "qualified views". Secondary sources report that in **Aug 2026** YouTube applied first-frame counting to all formats.

### Cited Findings
- YouTube's wording, as quoted in coverage: a Shorts view is "the number of times a Short starts to play or replay, with no minimum watch time requirement", effective 31 March 2025. The previous method is kept under the new name "engaged views". — [TechCrunch, 26 Mar 2025](https://techcrunch.com/2025/03/26/youtube-is-changing-how-youtube-shorts-views-are-counted); [Search Engine Journal](https://www.searchenginejournal.com/youtube-changes-shorts-view-counts-no-change-to-monetization/543005/); [Sprout Social support note](https://support.sproutsocial.com/hc/en-us/articles/35874991211533-YouTube-Shorts-View-Count-Update-March-2025)
- The change does not affect YPP eligibility or earnings. Revenue sharing uses engaged views and eligibility uses "qualified views". Engaged views appear in YouTube Analytics **Advanced Mode** only, and historical view data stays available. — [Search Engine Journal](https://www.searchenginejournal.com/youtube-changes-shorts-view-counts-no-change-to-monetization/543005/); [Entrepreneur](https://www.entrepreneur.com/business-news/youtube-shorts-will-see-more-view-counts-earnings/489190)
- Qualified views, as quoted from YouTube: "To count as qualified, Shorts views have to come from public Shorts and be engaged views." — quoted in a secondary source, [CreatorEssentials](https://www.creatoressentials.com/glossary/shorts-engaged-views/) (unverified against the Help page)
- **YouTube Blog, "What are 'Engaged' Views on YouTube?":** an engaged view means clicking to watch or watching past the initial seconds. According to search summaries, the blog says views across YouTube are counted from the first frame starting **24 Aug 2026**. — [blog.youtube](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/) (page not opened; one secondary source dates the post 19 Aug 2026)
- Secondary coverage of the 2026 change: public views count from the first frame for long-form, Shorts, podcasts and live. The old definition is called "engaged view". Monetization uses "engaged views" and "engaged watch hours". — [vidIQ](https://vidiq.com/blog/post/youtube-view-count-update/); [TubeBuddy](https://www.tubebuddy.com/blog/youtube-engaged-views-view-count-change); [Engadget](https://engadget.com/2238611/youtube-public-view-counts-will-likely-get-higher-starting-next-week/)
- Replays by the same viewer reportedly do not add engaged views (three loops by one viewer count as one engaged view). — secondary, per search summary; unverified

### Inferences
- From April 2025 onward, compare Shorts performance with **engaged views** rather than public views, because loops now inflate public views. Agentio's model puts the gap at about 65% for Shorts, but that is a modelled third-party estimate, not an official figure ([Agentio](https://www.agentio.com/blog/view-vs-engaged-view)).

### Gaps
- The exact effective date and scope of the 2026 change came only from search summaries (24 Aug vs 19/27 Aug conflict). Verify on blog.youtube.
- I found no official statement on whether the counting change altered *recommendation* inputs. YouTube framed it as a display/metric change.

## 4. Length (3-minute Shorts, Oct 2024), hook, looping, captions, titles, frequency, testing

### Takeaway
On 3 Oct 2024 YouTube announced that from **15 Oct 2024**, square or vertical uploads of up to **3 minutes** count as Shorts. It said it would "be working to improve recommendations for longer Shorts in the coming months". That is an implicit admission that longer Shorts were not yet recommended as well. I found no official guidance specific to the hook, looping, captions or titles beyond the swipe-away and retention framing.

### Cited Findings
- **YouTube Blog, "Tall updates coming to Shorts" (3 Oct 2024):** the change "applies to videos that are square or taller in aspect ratio, and won't affect any videos you uploaded before October 15." Also: "we'll be working to improve recommendations for longer Shorts in the coming months." And: "This was a top-requested feature by creators." The same post announced templates, a Trends page and a "Show fewer Shorts" option. — [blog.youtube](https://blog.youtube/news-and-events/tall-updates-coming-to-shorts/); [Variety](https://variety.com/2024/digital/news/youtube-shorts-maximum-video-length-three-minutes-1236166349/); [Engadget](https://www.engadget.com/entertainment/youtube/youtube-shorts-can-now-run-up-to-three-minutes-160002081.html)
- Variety attributes the "coming months" recommendations line to Todd Sherman, Director of Product Management for Shorts. — [Variety](https://variety.com/2024/digital/news/youtube-shorts-maximum-video-length-three-minutes-1236166349/)
- **How the guidance changed:** in 2023 Sherman said extending Shorts beyond 60 s was not being considered. A year later the limit rose to 3 minutes. — [search summary of 2023 coverage](https://searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953) vs [blog.youtube Oct 2024](https://blog.youtube/news-and-events/tall-updates-coming-to-shorts/)
- **Hook and first seconds:** the closest official statements are the "viewed vs swiped away" metric and the definition of an engaged view as watching "past the initial seconds". — [TechCrunch 2023](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/); [blog.youtube](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)
- **Testing with small audiences:** the seed-audience explanation (Sherman 2023) is the official account. A new Short is shown to a small set of likely-interested viewers first. — [Search Engine Journal](https://searchenginejournal.com/youtube-explains-how-shorts-algorithm-works/494953)

### Inferences
- A 30-45 s Short sits well inside both the old and new limits. YouTube's own "coming months" line suggests a 45 s Short carried no length penalty, while 1-3 minute Shorts were the ones still being tuned in late 2024.

### Gaps
- No official statement was found on: looping as a recommendation factor; burned-in captions or on-screen text; Shorts title best practice; posting frequency (beyond "no quota"); or whether the longer-Shorts recommendation work shipped, and what it changed.

## 5. YouTube Analytics definitions (Help-center wording)

### Takeaway
The Shorts metric in Studio was first labelled **"Viewed vs. swiped away"** (launched around 2023). It is now reportedly labelled **"Stayed to watch"**, defined as the percentage of times viewers stayed to watch past the initial seconds of a Short, as opposed to swiping away. It sits in Analytics > Content > Shorts, on the "How viewers engaged" card. The primary Help page could not be opened.

### Cited Findings
- Sherman, Aug 2023: a new Analytics metric shows the percentage of times a Short is viewed vs swiped away. — [TechCrunch](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/)
- Current label "Stayed to watch", described as "the percentage of times viewers stayed to watch past the initial seconds of a Short". YouTube publishes no good/bad benchmark. Average percentage viewed is computed only among viewers who stayed. — secondary: [CreatorEssentials, Stayed to watch](https://www.creatoressentials.com/glossary/stayed-to-watch/); [CreatorEssentials, Viewed vs swiped away](https://www.creatoressentials.com/glossary/viewed-vs-swiped-away/); [Prepublish](https://prepublish.ai/blog/viewed-vs-swiped-away-youtube-shorts)
- Engagement-metric counting rules live on the Help pages "How engagement metrics are counted" and "Understand your YouTube engagement". — [support.google.com 2991785](https://support.google.com/youtubecreatorstudio/answer/2991785?hl=en); [support.google.com 9313698](https://support.google.com/youtube/answer/9313698?hl=en) (not opened)

### Gaps
- **The exact Help-center wording is not verified.** support.google.com was unreachable from this session. The quoted definitions come from blogs.
- I could not confirm the date of the rename from "Viewed vs swiped away" to "Stayed to watch".

## Not officially confirmed (creator lore / single-source claims)
- Specific retention thresholds ("65% retention for <30 s, 50% for 30-60 s") and the claim that Shorts ranking "moved from swipe rate to watch time per impression". These come from blogs only; YouTube publishes no thresholds. — e.g. [TrueFuture Media](https://www.truefuturemedia.com/articles/youtube-shorts-algorithm-data-backed-guide)
- That loops/replays boost recommendation. Widely claimed, with no official source found.
- That shares or comments outweigh likes. No official weighting.
- That #shorts or a set number of hashtags increases reach. Officially contradicted: hashtags are optional (Sherman 2023).
- "Best time to post" windows attributed to "Creator Insider data". These could not be tied to any official source, and they contradict Sherman's 2023 statement. — e.g. [conbersa.ai](https://www.conbersa.ai/learn/best-time-to-post-youtube-shorts-2026)
- Periodic batch surveys asking whether each Short was "interesting, satisfying, or neither". Blog-only description. YouTube does officially cite surveys in general.
- Ritchie (Nov 2025): waiting 24-48 h before publishing gives no benefit. Single secondary source ([OutlierKit](https://outlierkit.com/resources/youtube-shorts-algorithm/)).
- A "September 2026 Creator Insider interview with Todd Beaupré" on surveys and watch time. Single secondary source ([OutlierKit](https://outlierkit.com/resources/youtube-viewer-satisfaction-algorithm-2026/)), not verified.
- "Since 1 Oct 2026 original Shorts rank higher and re-uploads get less reach." No primary YouTube source found.
- Shorts engagement boosting or hurting a channel's long-form ranking. Only third-party readings exist.
- Deleting and re-uploading an underperforming Short. No official statement found.
