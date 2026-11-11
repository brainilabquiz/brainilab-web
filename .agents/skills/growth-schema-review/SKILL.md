---
name: growth-schema-review
description: Review BrainiLab game and Learn structured data using the saved Search Console page report, exact public HTML or saved schema comparisons, and current primary guidance.
---

# Review structured data for BrainiLab Growth

Use the private `growth-report.json` property snapshot and its matching `growth.sqlite` page table. For an impressions-prioritized review, rank exact URLs by impressions within the single saved Web period and record the period, timezone and capture date. Use the current catalog to identify individual Learn articles and lessons and the game inventory to identify playable routes. Exclude hubs and unrelated pages. Record the selected scope and ties. Keep separate observations separate and preserve unavailable evidence as unknown.

For Learn, use the existing exact-URL comparator and the newest valid observation in `seoExplorer.learnSchema` or `learn-schema-latest.json`. Compare the main entity and canonical, headline, visible byline, preview, cover and dates when present. Keep original observation times and hashes. Treat a known cover variant or an equivalent date instant according to the comparator. For games, inspect saved public HTML and the current source when needed. Check JSON-LD parsing, the game or quiz entity's name and URL, and that the visible page supports the declarations about play, rules and offers. Check FAQs against the visible questions and answers. A crawl's structured-data flag establishes presence only. Dynamic quiz question comparisons use the existing `quizSchema` evidence for the exact page and its recorded sources.

Reuse valid captures first and fetch only specific public responses needed to resolve a material gap. Keep syntax, page agreement and Google feature eligibility separate. Check the current [Google Article guide](https://developers.google.com/search/docs/appearance/structured-data/article), [Software App guide](https://developers.google.com/search/docs/appearance/structured-data/software-app), [structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) and the relevant Schema.org type. Google recommends applicable Article properties and specifies no required ones. A game can have valid vocabulary with no Google Software App rich result. Use only genuine visible ratings, reviews, answers and other declarations. Do not infer indexing, search appearance, rankings or visits from markup or impressions.

Record the exact URL, field, declaration, supporting page evidence, original observation time and review decision privately. If a mismatch needs correction, recheck it on the current page and prefer the established renderer or source field. Use the existing Growth or editorial workflow and preserve concurrent changes, revisions and baselines. This review adds no crawl schedule, publisher access or permission to send private inputs to external validators.

Adapted from the installed `schema` skill and [Corey Haines's schema guidance](https://github.com/coreyhaines31/marketingskills/tree/0cd9b3a0ef4c411a1d690419ce843f2a1da32cce/skills/schema). See [MIT license](LICENSE).
