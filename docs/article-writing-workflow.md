# A small, evidence-led article workflow

The admin editor and the command-line review use `lib/article-writing.js`. Keep these checks aligned. They check structure and readability; they do not research a subject, verify facts or give an SEO score.

## 1. Choose a question before writing

Read the current published catalogue and course lesson lists. Count independent readings separately from Academy lessons, prioritise useful gaps in smaller categories, and check for the same search intent before creating another URL. Getting started is for genuinely missing help, not balancing totals.

Use the project's current OpenSEO context and research log first. Reuse relevant research less than 30 days old, retaining its actual observation and provider update dates. Prefer page-filtered Search Console queries when available, or dated, relevant estimates for the exact question and market. Record unknown metrics as unknown; do not add countries or near variants together or borrow a difficulty label from another query.

## 2. Keep the brief beside the private draft

In a private work folder, keep a fresh `baseline.json`, `documents.json` and one `<slug>.json` per article. Each individual file must match its entry in documents.json. The baseline contains the current public `articles` with slug, document and revision, `paths` with lesson lists, and a `capturedAt` timestamp.

Run from the repository:

```sh
node tools/review-article-writing.mjs brief /absolute/private-folder
```

To include the existing saved Growth evidence, without making new metric queries:

```sh
node tools/review-article-writing.mjs brief /absolute/private-folder --growth /absolute/private-growth-data/growth-report.json
```

Only the BrainiLab property is accepted. This creates a small, hash-bound private context for the article and its selected destinations, rather than copying the full Growth report. It omits outreach contacts, correspondence, decision notes and unrelated queries. Source dates, periods and exact URLs remain independent. Query-only, Images, overlapping windows and Google Links totals are not substituted or added to the Web query/page sample. No matching rows mean no matching rows in that sample, not zero demand. A verified HTML backlink is neither a visit nor an endorsement. Pending distribution receipts do not count as backlinks.

This creates `editorial-brief.json` with pending fields, source URLs and category counts. It never overwrites an existing brief, invents research, generates facts or publishes. Keep briefs and source captures outside content, assets, public and dist.

Complete the reader question, search intent, novelty explanation and actual research evidence. For each source, record when its actual page was opened, which claim was checked and where the supporting passage appears. A blocked page is not a checked source. Evidence references have the shape `{ "file": "source-capture.txt", "sha256": "…" }` and must resolve inside the private folder.

New briefs use version 2. Complete `answerReview` with the location of the central answer, the checked source URLs that support it, and your review notes. Complete `linkReview` with the actual destination checks, notes, timestamp and evidence hashes. Publication review requires link checks from the last 24 hours. These are manual assertions with evidence, not automatic fact checks. Existing briefs are not silently rewritten; add missing review fields only after performing the actual review.

The current brief is version 2. Complete `demand.intentMatch` with `status: "reviewed"` and a specific `notes` explanation of how the observed query fits this reading. An ambiguous query can mix unrelated subjects: for example, snow colour and the fictional Snow White. Keep a broad topic’s figures separate from a specific question. This is a recorded manual judgement, not an automated intent check.

English and cover reviews each need `status: "reviewed"`, meaningful `notes` and an `evidence` list. Reference the actual review record or inspected image/crop evidence. The CLI checks those hashes too; a reviewed label alone is insufficient. Existing version-1 briefs are preserved: add the missing fields after actually reviewing them rather than regenerating or overwriting their records.

## 3. Write one enjoyable answer

Give the answer near the start, then a concrete example or small surprise. Use original, everyday British English, short paragraphs and a few headings that help the reader. Use the relevant search words naturally; do not add unrelated trends, repeated definitions, artificial FAQs, exaggerated promises or internal acquisition goals.

Read it aloud. Check grammar, meaning, uncertainty and examples manually. The tool can flag a long paragraph, a long sentence or a repeated word, but those are suggestions, not quotas or proof of an English error. There is no fixed word count, section count or daily publication limit.

## 4. Give it a quiet next step

Use an appropriate game, a short invitation and a small number of genuinely related readings. Preserve existing URLs when revising an article. Check every destination on the live website before publication; the catalogue check catches missing article slugs but does not prove a live HTTP response or game behaviour.

The link plan distinguishes internal links, outgoing source links and incoming links from supplied published readings. Absolute BrainiLab addresses receive the same catalogue checks as relative addresses; unpublished drafts are not published destinations. An incoming-link claim excludes an admin row whose current document has unpublished changes. This plan is a supplied-catalogue observation, not a live whole-site crawl. Use it to check context, not to manufacture cross-links or impose a number of links.

Create a relevant original photorealistic cover, inspect the original, wide cover, square and small crops, and keep truthful credit and alternative text. Generate and inspect lightweight 960/480/240 WebP variants. Never assume a generated label, count, historical scene or scientific detail is correct.

## 5. Review without confusing draft and publication

```sh
node tools/review-article-writing.mjs review /absolute/private-folder
node tools/review-article-writing.mjs review /absolute/private-folder --publish
```

The tools use the existing JSDOM test runtime: set `JSDOM_MODULE` to its absolute `lib/api.js` path, or provide jsdom in the development environment. No API keys are needed.

Draft review permits pending manual research. Publication review requires the brief, recent demand and source observations, claim-level review notes, unchanged evidence hashes, English and cover review, and mobile and desktop evidence. Refresh the catalogue first. The generated `writing-review.html` and JSON show structural problems, suggestions and manual work separately.

Review reads the saved Growth context and checks its hash; it never refreshes or retimestamps it. If link destinations change, preserve the old record and create a fresh private brief/context for the revised link plan. Ordinary copy changes still require the existing document hash and manual re-review. A new report arriving in Growth does not silently replace the evidence used by an earlier brief.

Demand and source observations may be up to 30 days old when still relevant; the catalogue snapshot for publication must be less than 24 hours old. Its freshness does not replace the publisher’s revision checks. Reports include the section and an exact excerpt for applicable writing suggestions, so a reviewer can find the passage without guessing. Repeated long paragraphs are advisory, as repetition can be deliberate. The review never rewrites copy or certifies its grammar.

For an existing URL, use `--revision` and a fresh baseline with its actual revision. This permits reviewing an existing article; it does not permit overwriting a concurrent edit. If the text changes after review, re-review the changed parts and bind the brief to the new individual-file SHA-256; do not refresh evidence hashes or dates without actually rechecking the evidence.

## 6. Preview, publish and verify

In the admin, use Focus on writing, the live reading count and the Desktop/Mobile preview. Review links focus the relevant field. Search related readings without changing the draft. Ctrl/Cmd+S saves a private draft; it never publishes. The publish button checks required fields and structural problems, while leaving writing suggestions advisory.

Open **Search evidence & link plan** to inspect the same plan. **Load saved Growth report** reads the existing authorised workspace only after a click. It does not query Google, crawl a site, change a Growth decision or add data to the article. A failed or late response preserves the draft and existing evidence; leaving the editor discards its private cache. Technical checks, Google’s saved index state and HTML backlink verification keep their own observation times. A pending indexing state is not a demonstrated technical block, and a recent edit should not be rewritten before a complete follow-up period exists.

The folded **Measured landings & recorded starts** section reuses the validated saved GA4 play-session observation for the article and selected destinations. All measured sources and Google / organic remain separate, overlapping scopes. Only matching landing rows enter the private context, preserving the period, timezone, independent landing-query dates and quality flags. No matching row or null start count means unknown, not zero; an explicitly returned zero remains zero. Session shares are hidden for missing, zero-denominator, inconsistent or quality-limited counts. A recorded start may occur later in the session and in any game. It is not a completion, unique player, keyword conversion or proof that an article, CTA or backlink caused play. Do not divide GA4 starts by Search Console clicks or add the two source scopes. This adds no tracking or queries and does not replace the existing manual research requirements.

For AEO/GEO, retain a clear early answer and attributable claims. Google documents that its AI search features need no special additional optimisation or schema. For links, use readable, contextual anchors and ordinary crawlable links. Do not buy, swap or automatically create backlinks. See [Google’s AI-feature guidance](https://developers.google.com/search/docs/appearance/ai-features), [link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and [link-spam policy](https://developers.google.com/search/docs/essentials/spam-policies#link-spam).

Click an excerpt-based suggestion to select its text in the section. Only the first three suggestions are expanded initially; open the remaining ones when useful. Search appearance is a folded illustration of the current title, URL and description, not a promise of Google’s snippet. Check library crops shows the actual selected small and thumbnail assets at wide and square ratios. These controls do not dirty or rewrite a draft. Saving an unchanged existing draft creates no duplicate revision.

Select text and choose Add link to use a website address, a named source already in this draft, or a published Learn reading. The link chooser keeps the section selection, shows eight results at a time and never sends the text to an external writing service. Cancelling changes no copy; only Insert link or Update link changes the draft. Existing links can be edited by placing the cursor inside them. Check the exact passage in the source before citing it: appearing in this chooser does not certify its claims.

Related readings keep selected items visible and initially suggest a short list, with the current category first. Search words can appear in any order; Show more articles expands the list without selecting anything. These suggestions use the local catalogue, not popularity or traffic data. A new article’s review and private brief also show up to three titles with overlapping words. Compare their actual reader questions manually; title overlap is advisory and does not establish duplicate intent or block publication.

Complete the existing review record and guarded editorial release after the cover assets are deployed and checked. Preserve authentication, revision checks, author, original publication date and history; do not impersonate an admin or change permissions. This assistant does not replace that publisher.

After publishing, check the real URL, text, cover, byline, canonical, Article data, source and game links, category/course, Learn, feed and sitemap on the live domain and at mobile/desktop widths. Record what was actually verified. Published and indexable does not mean indexed, ranked, cited by AI, visited or converted into accounts.

## Tests

Run the shared review, editor workflow and private CLI tests with the configured JSDOM runtime, followed by the existing learn-editor and affected presentation tests. Negative cases cover unsafe and missing links, stale evidence, document mismatches, revisions and accidental publication. Browser checks still matter: tests cannot inspect a real photograph or judge whether an explanation is enjoyable.

Also run `node tools/test-article-evidence.mjs`. It covers exact query/page matching, backlink source verification and deduplication, unpublished/draft catalogue rows, independent dates, unknown data and private-field minimisation.
