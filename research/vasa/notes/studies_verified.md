# Primary-source check of the studies behind the short-video script and edit rules

Checked on 2026-11-23 against primary records, following the earlier notes `shorts_data_studies.md` and `virality_evidence.md`, which were built from search excerpts only.

**How the sources were reached.**
- PMC article pages return a reCAPTCHA wall to scripts. Abstracts and full texts were pulled instead from PMC's official OAI-PMH service (`pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/`, `oai_dc` for the abstract, `pmc` for the full text). The URLs below give the normal PMC article link for each paper.
- **dl.acm.org and journals.sagepub.com answered HTTP 403 (Cloudflare "Just a moment..." bot challenge)**, even though they are on the allow-list. Author-hosted PDFs (cs.rochester.edu, pg.ucsd.edu), the Marketing Trends Congress archive, api.crossref.org (where doi.org's metadata content negotiation sends requests), tandfonline and Springer are all refused by the proxy (403 CONNECT).
- doi.org's handle API (`doi.org/api/handles/<doi>`) does work. It confirms that a DOI exists and where it points, but not its title or content.

**Tags.** VERIFIED means quoted from the primary abstract or full text. CORRECTED means old claim → new claim, with a quote. STILL UNVERIFIED means the reason is given. Evidence grades (strong / moderate / weak / anecdote) are kept from the earlier notes or adjusted where this check changes them. **[T!]** marks a platform-transfer caveat: the study was not run on short vertical video.

---

## 1. Guo, Kim & Rubin 2014 (L@S): speaking rate, wpm bins, 6-minute finding

### Takeaway
The paper was **not reachable**: the ACM DL page and PDF are behind a Cloudflare challenge, and author PDFs are blocked. The DOI is real and resolves to ACM DL, but no wpm bins or the "6 minutes" figure could be confirmed. Treat both as STILL UNVERIFIED and don't turn them into hard numeric rules. A different primary source does give a usable speech-rate range (see Cited Findings).

### Cited Findings
- STILL UNVERIFIED: authors, venue and year (Guo, Kim, Rubin; L@S '14), the sample (6.9M sessions, 4 edX courses), "median engagement ≈ 6 min", and "faster speakers more engaging", together with any wpm bins. Failure reasons: `dl.acm.org/doi/10.1145/2556325.2566239` and `/doi/pdf/...` returned HTTP 403 (Cloudflare challenge), and `cs.rochester.edu` and `pg.ucsd.edu` were refused by the proxy. The DOI 10.1145/2556325.2566239 does resolve: the handle API returns `https://dl.acm.org/doi/10.1145/2556325.2566239` — [doi.org handle](https://doi.org/api/handles/10.1145/2556325.2566239)
- A substitute primary-literature anchor for narration speed, cited **secondary inside** a 2025 PMC paper: "a speech rate between 170 to 190 words per minute (wpm) generates the highest level of recognition for information. The recognition of information deteriorated with rates over 210 wpm". The same paper cites an advertising recommendation of about 160 wpm, with compressed speech "should not exceed 180 wpm". Grade: moderate (secondary citation of audio-only media studies) **[T!]** — [PMC13007775](https://pmc.ncbi.nlm.nih.gov/articles/PMC13007775/)
- VERIFIED (baseline figures, secondary within a primary paper): "Humans generally speak at a rate of 150 words per minute (Peelle & Davis, 2012) ... speech comprehension begins to decline at around 275 words per minute (see Foulke & Sticht, 1969)" — Murphy, Hoover & Castel 2023, *Memory* — [PMC10330257](https://pmc.ncbi.nlm.nih.gov/articles/PMC10330257/)

### Inferences
- Until Guo's bins are confirmed, a narration target of about **160-190 wpm** rests on the audio-recognition literature above. It does not rest on Guo. Keep "faster-speaking narrators drive engagement" as a hypothesis.

### Gaps
- Guo's wpm bins and the 6-minute figure. They need either dl.acm.org to load without the bot challenge, or permission for pg.ucsd.edu / pgbovine.net.

---

## 2. Berger & Milkman 2012 (JMR), "What Makes Online Content Viral?"

### Takeaway
The bibliographic details are VERIFIED. The findings (sample, awe/anger/anxiety/sadness, practical value) are **STILL UNVERIFIED** against the abstract, because SAGE returned a Cloudflare 403.

### Cited Findings
- VERIFIED (bibliographic): Berger, Jonah & Milkman, Katherine L., "What Makes Online Content Viral?", *Journal of Marketing Research* 49(2):192-205, dated 2012-04-01, doi 10.1509/jmr.10.0353. Source is Wikipedia citation metadata (secondary for findings, adequate for the citation) — [Wikipedia: Katy Milkman](https://en.wikipedia.org/wiki/Katy_Milkman); [Wikipedia: Viral phenomenon](https://en.wikipedia.org/wiki/Viral_phenomenon)
- Secondary only: Wikipedia's STEPPS summary cites the paper for "The more something activates emotion, particularly high arousal ones, the more likely people are to pass it on" and for practical value. Grade: secondary — [Wikipedia: Viral phenomenon](https://en.wikipedia.org/wiki/Viral_phenomenon)
- STILL UNVERIFIED: the NYT sample (about 3 months, most-emailed list) and the effects of awe, anger and anxiety (positive) and sadness (negative), with controls for practical value, interest and surprise. Failure reason: `journals.sagepub.com/doi/10.1509/jmr.10.0353` returned HTTP 403 (Cloudflare "Just a moment...") and doi.org redirects there. Keep the earlier grade of **moderate-to-strong** (observational, single outlet, email sharing) **[T!]**.

### Inferences
- The "high-arousal emotion → sharing" rule is well corroborated in direction by other primary work verified below (Brady 2017; Rathje 2021). Watson et al. 2024 verified that negative news is shared about 1.9× more. The **sadness → less sharing** point specifically still rests on an unverified abstract. Robertson 2023 (below) shows sadness **raises clicks**, so the two should not be merged into one rule.

### Gaps
- The primary abstract. A PDF on a permitted host would close it, for example an arXiv mirror if one exists (none was found).

---

## 3. Robertson et al. 2023; Brady et al. 2017; Rathje et al. 2021 (plus a new related primary study)

### Takeaway
All three are VERIFIED from PMC abstracts and full text. One CORRECTION matters for script rules: in Robertson 2023, **sadness words raised CTR, fear and joy words lowered it, and anger had no significant effect**. "Negativity" clicks were therefore not driven by anger or fear. This is headline CTR on Upworthy, not sharing and not video.

### Cited Findings
- **Robertson, Pröllochs, Schwarzenegger, Pärnamets, Van Bavel & Feuerriegel (2023), *Nature Human Behaviour*.** VERIFIED: "we conducted our analyses using a series of randomized controlled trials (N = 22,743). Our dataset comprises ~105,000 different variations of news stories from Upworthy.com that generated ∼5.7 million clicks across more than 370 million overall impressions ... negative words in news headlines increased consumption rates (and positive words decreased consumption rates). For a headline of average length, each additional negative word increased the click-through rate by 2.3%." Grade: **strong** for headline CTR (randomized within story) **[T!]** (2013-2015 Upworthy headlines, not video) — [PMC10202797](https://pmc.ncbi.nlm.nih.gov/articles/PMC10202797/); doi 10.1038/s41562-023-01538-4
  - VERIFIED / CORRECTED (discrete emotions). The old note had "sad words beat angry or scary ones" via Nieman Lab. The full text gives the precise result: "A one standard deviation increase in sadness increases the odds of a user clicking the headline by 0.7%, while a one standard deviation increase in joy or fear decreases the odds ... by 0.9% and 0.7%, respectively. The coefficient estimate for anger (β = 0.000 ... P = 0.666)". The authors note that the fear result was "in the opposite direction of our pre-registered hypotheses". Effects per emotion are small (<1% per SD) — [PMC10202797](https://pmc.ncbi.nlm.nih.gov/articles/PMC10202797/)
  - The 2.3% figure is derived as follows: "the proportion of negative words increases the odds ... by 1.5%. For a headline of average length (14.965 words), this implies that for each negative word, the CTR increases by 2.3%" — [PMC10202797](https://pmc.ncbi.nlm.nih.gov/articles/PMC10202797/)
- **Brady, Wills, Jost, Tucker & Van Bavel (2017), *PNAS*.** VERIFIED: "Using a large sample of social media communications about three polarizing moral/political issues (n = 563,312), we observed that the presence of moral-emotional words in messages increased their diffusion by a factor of 20% for each additional word ... moral-emotional language increased diffusion more strongly within liberal and conservative networks, and less between them." Grade: **moderate** (observational, Twitter, political topics) **[T!]** — [PMC5514704](https://pmc.ncbi.nlm.nih.gov/articles/PMC5514704/); doi 10.1073/pnas.1618923114
- **Rathje, Van Bavel & van der Linden (2021), *PNAS*.** VERIFIED: "Analyzing posts from news media accounts and US congressional members (n = 2,730,215), we found that posts about the political out-group were shared or retweeted about twice as often ... Each individual term referring to the political out-group increased the odds of a social media post being shared by 67% ... about 4.8 times as strong as that of negative affect language and about 6.7 times as strong as that of moral-emotional language". The abstract also says out-group language was "a very strong predictor of 'angry' reactions". The old note's "conflicting per-word effect sizes" is now resolved: **+67% odds of a share per out-group term**. Grade: **moderate** (observational, political) **[T!]** — [PMC8256037](https://pmc.ncbi.nlm.nih.gov/articles/PMC8256037/); doi 10.1073/pnas.2024292118
- NEW, related (VERIFIED): **Watson, van der Linden, Watson & Stillwell (2024), *Scientific Reports*.** "Data from four US and UK news sites (95,282 articles) and two social media platforms (579,182,075 posts on Facebook and Twitter ...) show social media users are 1.91 times more likely to share links to negative news articles." Grade: moderate (observational) **[T!]** — [PMC11405697](https://pmc.ncbi.nlm.nih.gov/articles/PMC11405697/)

### Inferences
- For a history Short, "negative/incredulous framing" (the Vasa capsizing on its maiden voyage, the failed stability test) is supported for **attention and click** (Robertson) and **sharing** (Watson, Brady). The out-group-animosity lever in Rathje is political and is not appropriate or transferable here.
- Robertson's per-emotion effects are tiny. Don't build a rule like "use fear words". If anything, sadness words slightly helped CTR.

### Gaps
- None of these is on short video.

---

## 4. Loewenstein 1994; CHI 2021 clickbait paper; van Laer 2014; story-vs-expository meta-analysis

### Takeaway
The **narrative-vs-expository meta-analysis is now pinned down and VERIFIED**: Mar, Li, Nguyen & Ta 2021, *Psychonomic Bulletin & Review*, Hedges' g = .55. Loewenstein 1994 is verified bibliographically only. The CHI 2021 clickbait paper and van Laer 2014 are STILL UNVERIFIED: the hosts were blocked or unreachable.

### Cited Findings
- **Mar, Li, Nguyen & Ta (2021), "Memory and comprehension of narrative versus expository texts: A meta-analysis", *Psychon Bull Rev*.** This CORRECTS the old entry, which had "authors/journal not confirmed; effect unknown".
  - VERIFIED abstract: "Based on over 75 unique samples and data from more than 33,000 participants, we found that stories were more easily understood and better recalled than essays. Moreover, this result was robust".
  - VERIFIED full text: "Our three-level random-effects meta-analysis of 150 effect-sizes found that ... The mean effect-size was a Hedge's g of .55, with a 95% CI ranging from .31 to .79, p < .001". From Table 3 (37 studies): comprehension g = .48 (93 effect sizes), **memory g = .72** (57 effect sizes).
  - Caveats, from the same full text: heterogeneity is very high (I² ≈ 97%), and Egger's test showed possible publication bias: "higher standard errors did predict larger effect-sizes, b = 2.68 ... p = .01".
  - Grade: **strong** (meta-analysis) for texts **[T!]** (written texts, not 30-45 s video) — [PMC8219577](https://pmc.ncbi.nlm.nih.gov/articles/PMC8219577/); doi 10.3758/s13423-020-01853-1
- **Loewenstein (1994).** VERIFIED (bibliographic): "Loewenstein G (1994) The psychology of curiosity: a review and reinterpretation. Psychological Bulletin 116(1):75-98, doi 10.1037/0033-2909.116.1.75". Wikipedia's Clickbait article describes clickbait as "using an information gap to encourage" clicks. Content claims (a manageable gap, prior knowledge needed) are STILL UNVERIFIED against the primary source, because APA PsycNet is not on the allow-list. Grade: strong as theory (unchanged) — [Wikipedia: Curiosity](https://en.wikipedia.org/wiki/Curiosity); [Wikipedia: Clickbait](https://en.wikipedia.org/wiki/Clickbait)
- **CHI 2021 clickbait paper** ("Does clickbait actually attract more clicks? Three clickbait studies you must read"). STILL UNVERIFIED for authors, sample and findings. Failure reasons: dl.acm.org returned 403 (Cloudflare), the arXiv search found no preprint, and PMC has no copy. I guessed the DOI 10.1145/3411764.3445753 for CHI '21 and it resolves to ACM DL, but **I could not confirm it is this paper**, so it is not cited as such. Keep the earlier grade (moderate, abstract-level only) **[T!]**.
- **van Laer, de Ruyter, Visconti & Wetzels (2014), *J Consumer Research*.** STILL UNVERIFIED (132 effect sizes / 76 articles). Failure reasons: the publisher host is not allowed, and the earlier City Research Online PDF host is not on the allow-list. Grade unchanged (strong, meta-analysis) **[T!]**.

### Inferences
- "Tell it as a story, not a fact list" now has a verified quantitative anchor. Stories beat exposition by about half an SD overall and by about 0.7 SD for **memory**. The publication-bias signal means the true effect is probably smaller. The evidence comes from reading texts, mostly in school and lab settings.

### Gaps
- The CHI 2021 and van Laer primary abstracts. The content of Loewenstein's theory needs the APA source or the CMU PDFs (cmu.edu, not allowed).

---

## 5. Cutting et al. 2011 shot length; Murphy et al. playback speed (2021/2022, 2023, "2024 EPR")

### Takeaway
Cutting is VERIFIED but with **CORRECTED numbers and author order**. Murphy's "Learning in double time" is **2022** in print (Applied Cognitive Psychology 36(1)). A **2025 meta-analysis (Huang et al., Frontiers in Psychology) contradicts** the "no cost up to 2x" reading: acceleration lowered retention (g = −0.41). The "2024 EPR" paper's DOI exists, but its content is STILL UNVERIFIED.

### Cited Findings
- **Cutting, Brunick, DeLong, Iricinschi & Candan (2011), "Quicker, faster, darker: Changes in Hollywood film over 75 years", *i-Perception*.** CORRECTED:
  - Author order: the old note had "Cutting, DeLong, Brunick..."; the record lists Cutting, Brunick, DeLong, Iricinschi, Candan.
  - Shot length: the old note had "about 15 s to about 3.5 s". Full text: "ASLs of about 10 s in the 1930s and 1940s falling to below 4 s after 2000" (r = −.75 on a log scale).
  - Sample, VERIFIED from the abstract: "We measured 160 English-language films released from 1935 to 2010", which found shorter shots, more motion and darker films, and attributed these changes to filmmakers seeking "more control over the attention of filmgoers".
  - Grade: **strong** for the trend **[T!]** (feature films, not Shorts) — [PMC3485803](https://pmc.ncbi.nlm.nih.gov/articles/PMC3485803/); doi 10.1068/i0441aap
- **Murphy, Hoover, Agadzhanyan, Kuehn & Castel, "Learning in double time: the effect of lecture video speed on immediate and delayed comprehension".** CORRECTED citation: *Appl Cogn Psychol* **2022**; 36(1):69-82; doi 10.1002/acp.3899 (earlier listed as 2021, likely the online-first year). Per a citing PMC paper (secondary), it used "108 undergraduate students who looked at asynchronous lectures, watching them at 1x, 1.5x, and 2x". The specific scores (25/40, 26/40, 22/40 at 2.5x) are **STILL UNVERIFIED**: Wiley and the UCLA PDF are not reachable. Grade: strong (controlled experiment) **[T!]** — [PMC10354881 (citing paper, reference 10)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10354881/)
- **Murphy, Hoover & Castel (2023), *Memory*.** VERIFIED: "although younger adults can watch lecture videos at faster speeds without significant deficits in memory, older adults' test performance is generally impaired when watching at faster speeds. Additionally, faster playback speeds seem to reduce mind-wandering". Grade: strong (experiment) **[T!]** — [PMC10330257](https://pmc.ncbi.nlm.nih.gov/articles/PMC10330257/)
- NEW, CONTRADICTING (VERIFIED): **Huang, Du & Yang (2025), "Facilitating or hindering learning — a meta-analysis of acceleration on video learning", *Front Psychol*.** The meta-analysis covers 12 papers: "accelerated playback of instructional videos increased learners' cognitive load (g = 0.59) and decreased maintenance test scores (g = −0.41), migration test scores (g = −0.50), and learning satisfaction (g = −0.24)". The authors warn about publication bias in favour of acceleration. Grade: moderate (small meta-analysis, k = 12) **[T!]** — [PMC12412133](https://pmc.ncbi.nlm.nih.gov/articles/PMC12412133/)
- **"Educational Psychology Review 2024" (doi 10.1007/s10648-024-09917-7).** The DOI exists and resolves to `link.springer.com/10.1007/s10648-024-09917-7` — [doi.org handle](https://doi.org/api/handles/10.1007/s10648-024-09917-7). Authors, title and the "up to 2x no significant effect; audio-visual protects" finding are **STILL UNVERIFIED**: Springer is blocked and there is no PMC copy.

### Inferences
- Replace "speed up narration freely, up to 2x" with **"brisk, but not compressed"**. The single-study "no cost at 2x" result (Murphy) is offset by a meta-analytic retention cost (Huang 2025) and by an age interaction (Murphy 2023). The 160-190 wpm range in section 1 is the safer working rule.
- The Cutting trend supports fast cutting as a cultural norm. It does not set a target shot length for Shorts.

### Gaps
- Murphy 2022's exact scores. The content of the EPR 2024 paper.

---

## 6. Douyin/TikTok educational short-video studies (4,422 videos; 6,606 videos; 34.69 s)

### Takeaway
The 4,422-video study is VERIFIED and pinned down: Li et al. 2026, *PLOS One*. Its "30 s-1 min optimum" comes from a **rank comparison across duration bins**, not a fitted optimum, and the abstract and body disagree on what "ELM" stands for. The 6,606-video study and the 34.69 s paper remain **STILL UNVERIFIED** and should not be used as rules.

### Cited Findings
- **Li, Zhao, Wang, Huang & Liu (2026-01-29), "A study on the dissemination effectiveness and influencing factors of short videos in scientific journals: An empirical analysis based on the ELM model", *PLoS One*.** VERIFIED: "Based on data analysis of 4,422 short videos from scientific journals ... video duration and visual quality show significant positive correlations with dissemination effectiveness, while subtitles and clear covers exert stable effects."
  - The full text gives 18 journal accounts on Douyin, collected 25-26 September 2024.
  - CLARIFIED (duration): "the Kruskal-Wallis H test revealed significant interval effects (p < 0.001). Videos in the 30-second to 1-minute range achieved the highest average rank, significantly outperforming both ultra-short videos under 15 seconds and long videos exceeding 5 minutes."
  - The bin comparison is coarse. 58.71% of the sample is 1-5 min, and the outcome is a likes/comments/favourites/shares index, not retention.
  - Note: the abstract says "Enhanced Logistic Model (ELM)", while the body frames the work in Elaboration Likelihood Model terms (central and peripheral routes).
  - Grade: moderate (cross-sectional, niche: Chinese science journals) **[T!]** (Douyin, institutional accounts) — [PMC12854476](https://pmc.ncbi.nlm.nih.gov/articles/PMC12854476/); doi 10.1371/journal.pone.0341716
- **6,606-video Douyin study** (subtitles negative for comments and shares; vocal background music positive). STILL UNVERIFIED. The candidate DOI 10.1080/02650487.2026.2670858 exists and resolves to tandfonline (International Journal of Advertising) — [doi.org handle](https://doi.org/api/handles/10.1080/02650487.2026.2670858). Its title and content could not be read (tandfonline blocked), and PMC and arXiv searches found no match, so **it is not confirmed that this DOI is the 6,606-video study**.
- **34.69 s "optimal length" (Marketing Trends Congress 2025, PDF 060).** STILL UNVERIFIED: the host archives.marketing-trends-congress.com was refused by the proxy (403 CONNECT). Authors, platform and n are unknown. Grade: weak or unusable.

### Inferences
- The best-supported length statement is narrow. Among one niche of Douyin science videos, 30-60 s clips ranked best on an interaction index versus <15 s and >5 min. A 30-45 s target is consistent with that, but nothing here shows 34-35 s is special.
- The subtitle evidence is now one verified positive (Li 2026) against one **unconfirmed** negative. Don't cite the "subtitles hurt" result.

### Gaps
- The 6,606-video citation, and the 34.69 s paper.

---

## 7. Verizon Media / Publicis Media 2019 sound-off and captions survey

### Takeaway
STILL UNVERIFIED against any primary page this session. The original report is not on an allowed host. A TechCrunch site search and a Tubefilter site search turned up no article on the survey.

### Cited Findings
- STILL UNVERIFIED: 5,616 US adults aged 18-54, "69% watch with sound off in public", "80% more likely to watch an entire video when captions are available". Failure reasons: [techcrunch.com search](https://techcrunch.com/?s=verizon+captions) returned only an unrelated 2023 Netflix subtitles article, the [tubefilter.com search](https://www.tubefilter.com/?s=captions+sound+off) had no matching article, and the 3Play, Streaming Media and NextTV hosts used earlier are not on the allow-list.
- The earlier misquote warning still stands as a reading of the secondary sources. "80% of caption users / 80% more likely to finish" is stated preference from people who use captions, not a measured completion lift. Grade: moderate-weak (self-report, 2019, ad-industry survey).

### Inferences
- Burned-in captions remain justified by sound-off viewing in general and by the verified Li 2026 "subtitles ... stable effects" finding. Don't quote Verizon numbers in docs or rules as verified.

### Gaps
- The primary Verizon/Publicis report or press release.

---

## 8. Banas et al. 2011, humour in education review

### Takeaway
The bibliographic details are VERIFIED via a 2025 PMC review's reference list. The core findings (better instructor perceptions; mixed effects on learning; avoid hostile humour) are STILL UNVERIFIED against the primary source, because Taylor & Francis is blocked.

### Cited Findings
- VERIFIED (bibliographic): "Banas J. A. Dunbar N. Rodriguez D. Liu S. J. (2011). A review of humor in educational settings: four decades of research. Commun. Educ. 60, 115-144. doi: 10.1080/03634523.2010.496867". Note: the word is "settings", where the old note had "in education settings". — [Zhou & Lee 2025, Front Psychol (PMC11814177)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11814177/)
- Secondary (VERIFIED as what the review says about Banas): "Banas et al. (2011) reported that the gender difference in humor usage observed in studies had a small effect" — [PMC11814177](https://pmc.ncbi.nlm.nih.gov/articles/PMC11814177/)
- Related and newer: Zhou & Lee (2025), "Teaching and learning with instructional humor: a review of five-decades research and further direction", *Front Psychol*, an open-access review that could stand in as a citable source for the humour rule. Its conclusions were not extracted in this pass — [PMC11814177](https://pmc.ncbi.nlm.nih.gov/articles/PMC11814177/)
- Grade: moderate (narrative review, classroom) **[T!]**.

### Inferences
- "Content-related, non-hostile humour" is still a reasonable rule. It is not newly verified at the findings level.

### Gaps
- Banas's primary abstract (tandfonline is not allowed).

---

## Summary table for rule-writers

| Claim used for rules | Status | Grade |
|---|---|---|
| Story > fact list (Mar et al. 2021, g = .55; memory g = .72) | VERIFIED (newly pinned) | strong for texts [T!] |
| Negative words +2.3% CTR per word (Robertson 2023); sadness up, fear/joy down, anger n.s. | VERIFIED / CORRECTED | strong for headline CTR [T!] |
| Moral-emotional words +20% diffusion per word (Brady 2017) | VERIFIED | moderate [T!] |
| Out-group term +67% odds of share (Rathje 2021) | VERIFIED (resolved) | moderate [T!] |
| ASL ~10 s (1930s-40s) → <4 s (post-2000), 160 films (Cutting 2011) | CORRECTED | strong [T!] |
| 2x playback has no cost (Murphy 2022) | CORRECTED (2022 citation; contradicted by Huang 2025 meta-analysis, g = −0.41 retention) | mixed |
| 30-60 s best on Douyin science-journal videos (Li 2026) | VERIFIED (rank-based bins) | moderate [T!] |
| Guo 2014 wpm bins / 6-minute cap | STILL UNVERIFIED (ACM 403) | — |
| Berger & Milkman emotion findings | STILL UNVERIFIED (SAGE 403); citation verified | moderate-strong [T!] |
| CHI 2021 clickbait; van Laer 2014; Loewenstein content | STILL UNVERIFIED | — |
| 6,606-video Douyin; 34.69 s paper; Verizon 2019 numbers | STILL UNVERIFIED | do not use as rules |
