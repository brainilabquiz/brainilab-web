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

This creates `editorial-brief.json` with pending fields, source URLs and category counts. It never overwrites an existing brief, invents research, generates facts or publishes. Keep briefs and source captures outside content, assets, public and dist.

Complete the reader question, search intent, novelty explanation and actual research evidence. For each source, record when its actual page was opened, which claim was checked and where the supporting passage appears. A blocked page is not a checked source. Evidence references have the shape `{ "file": "source-capture.txt", "sha256": "…" }` and must resolve inside the private folder.

## 3. Write one enjoyable answer

Give the answer near the start, then a concrete example or small surprise. Use original, everyday British English, short paragraphs and a few headings that help the reader. Use the relevant search words naturally; do not add unrelated trends, repeated definitions, artificial FAQs, exaggerated promises or internal acquisition goals.

Read it aloud. Check grammar, meaning, uncertainty and examples manually. The tool can flag a long paragraph, a long sentence or a repeated word, but those are suggestions, not quotas or proof of an English error. There is no fixed word count, section count or daily publication limit.

## 4. Give it a quiet next step

Use an appropriate game, a short invitation and a small number of genuinely related readings. Preserve existing URLs when revising an article. Check every destination on the live website before publication; the catalogue check catches missing article slugs but does not prove a live HTTP response or game behaviour.

Create a relevant original photorealistic cover, inspect the original, wide cover, square and small crops, and keep truthful credit and alternative text. Generate and inspect lightweight 960/480/240 WebP variants. Never assume a generated label, count, historical scene or scientific detail is correct.

## 5. Review without confusing draft and publication

```sh
node tools/review-article-writing.mjs review /absolute/private-folder
node tools/review-article-writing.mjs review /absolute/private-folder --publish
```

The tools use the existing JSDOM test runtime: set `JSDOM_MODULE` to its absolute `lib/api.js` path, or provide jsdom in the development environment. No API keys are needed.

Draft review permits pending manual research. Publication review requires the brief, recent demand and source observations, claim-level review notes, unchanged evidence hashes, English and cover review, and mobile and desktop evidence. Refresh the catalogue first. The generated `writing-review.html` and JSON show structural problems, suggestions and manual work separately.

For an existing URL, use `--revision` and a fresh baseline with its actual revision. This permits reviewing an existing article; it does not permit overwriting a concurrent edit. If the text changes after review, re-review the changed parts and bind the brief to the new individual-file SHA-256; do not refresh evidence hashes or dates without actually rechecking the evidence.

## 6. Preview, publish and verify

In the admin, use Focus on writing, the live reading count and the Desktop/Mobile preview. Review links focus the relevant field. Search related readings without changing the draft. Ctrl/Cmd+S saves a private draft; it never publishes. The publish button checks required fields and structural problems, while leaving writing suggestions advisory.

Complete the existing review record and guarded editorial release after the cover assets are deployed and checked. Preserve authentication, revision checks, author, original publication date and history; do not impersonate an admin or change permissions. This assistant does not replace that publisher.

After publishing, check the real URL, text, cover, byline, canonical, Article data, source and game links, category/course, Learn, feed and sitemap on the live domain and at mobile/desktop widths. Record what was actually verified. Published and indexable does not mean indexed, ranked, cited by AI, visited or converted into accounts.

## Tests

Run the shared review, editor workflow and private CLI tests with the configured JSDOM runtime, followed by the existing learn-editor and affected presentation tests. Negative cases cover unsafe and missing links, stale evidence, document mismatches, revisions and accidental publication. Browser checks still matter: tests cannot inspect a real photograph or judge whether an explanation is enjoyable.
