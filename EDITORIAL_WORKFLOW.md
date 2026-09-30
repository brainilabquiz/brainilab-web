# BrainiLab Learn: editing and publishing

Open `/admin/#articles` with an active owner/editor account. Existing role and MFA requirements are enforced by the database.

1. Open an article or choose **New article**. Search and status filters keep the list compact.
2. Edit the title, description, category, section headings and formatted text. Add, remove or reorder sections. An optional HTML view preserves answer details and other supported formatting.
3. Choose an existing cover or upload JPG/PNG/WebP. Uploads are resized to a maximum 1600px side and encoded to WebP. Set the vertical crop, alt text and accurate credit.
4. Add sources, a relevant game, a short invitation to play and related articles.
5. **Preview** shows the current form without publishing. **Save draft** keeps work private and leaves the current publication intact.
6. **Publish** updates Learn, article metadata, homepage article cards and the sitemap, usually within one minute. Content changes do not need a deployment.

Under **Publishing & history**, load one of the 30 most recent revisions as unsaved changes, then save or publish it. **Move published article to draft** withdraws the public copy while keeping its draft and history. URLs remain stable after the first save; deliberate URL moves need a reviewed redirect. There is no hard-delete button. Uploaded covers are public assets.

## Editorial rules

Write in English for a curious reader. Start with a concrete question, explain a useful example and offer a small activity or related game. Vary the structure and avoid duplicating topics. Do not invent authors, experiences, testimonials or cognitive/medical benefits. Generated covers are labelled as illustrations, not documentary photos. Keep internal SEO, conversion, retention and monetisation targets out of public copy.

**Cover style confirmed by the user on 30 September 2026:** use AI-generated photorealistic imagery with a concrete subject relevant to the article. Do not replace article covers with vector drawings, icons, diagrams or cartoons. Preserve the existing photographic covers when editing older articles unless a replacement is requested. Generate raster images with ImageGen, inspect them, and serve responsive WebP derivatives. Credit them as AI-generated photorealistic images; never imply that a generated historical scene is an authentic archival photograph. Diagrams, if separately useful and requested, belong inside an article rather than replacing its photographic cover.

Learn opens with the newest publication per category. Search, category filters and All articles expose the rest. Original publication dates decide recency; ordinary edits do not make an old article new. Display order breaks ties. Covers use a compact crop and readable titles.

## Daily publishing and topic hubs

The editorial cadence is one reviewed supporting article per day, with an additional hub when a coherent block reaches ten published supporting articles. Quality takes priority over the daily slot. Do not batch missed days into a publishing surge. Before each run, check the live publications and the local daily ledger to avoid duplicate releases.

Plan a shared reader question before filling a block. A category can contain several distinct blocks: ten unrelated articles in one category are not automatically a useful hub. `content/editorial-clusters.json` records two initial ten-article blocks and the next pieces for the other categories. Missing member files are planned ideas, not researched facts or live links. Research can change an unpublished idea or working slug. Expand the other provisional blocks before publishing their follow-up articles. Prioritise categories with fewer articles while steadily completing coherent blocks.

A hub is an original guided reading route with context, meaningful groups and an explanation of what each of the ten articles contributes. It links to all ten supporting articles, which link back to it. The hub is additional to the ten and must never count as a supporting article. Keep later sets of ten as separate, coherent blocks rather than duplicating an existing hub. Update existing hubs as their articles improve; do not refresh publication dates merely to appear new.

The static editorial build validates registered blocks: incomplete blocks cannot have a published hub, and complete blocks require a published hub with all ten links and return links. This is a repository release check, not a database constraint or an automatic rule in the admin editor. Before publishing through the admin or database, verify the same conditions against live documents and publish a tenth member, hub and return-link changes together. Preserve concurrent edits and record revisions. Public links must never point to a planned article or unpublished hub.

Keep original explanations and verified sources, vary titles and structure, and include a useful next reading or game choice. Review weekly using available Search Console and engagement data; do not invent demand, rankings, conversion rates or revenue. The content backlog does not override these rules or require publication before a piece passes review.

## Technical source of truth

- Private `brainilab_editor.articles` and `revisions`: drafts and immutable history, optimistic revision checks. No client table grants. Privileged helpers are in a non-exposed schema and verify active owner/editor role and MFA.
- Public `learn_publications`: intentional publications only, public read RLS, no client write grants. Public RPC wrappers are security invoker.
- Storage `learn-covers`: owner/editor uploads, 3MB maximum, JPEG/PNG/WebP MIME allowlist; no overwrite or deletion permission.
- `lib/learn-content.js`: shared HTML allowlist sanitizer, cards, articles and metadata.
- `lib/learn-worker.js`: server-rendered Learn, articles, home cards and sitemap; public cache 60 seconds. Missing articles return 404. Database failure returns 503 instead of restoring withdrawn static articles.
- `editor/admin-articles.js`: admin editor source; build produces its browser bundle.
- `content/articles/*.json`: initial reviewed seed and static build fixtures. Editing these files does not edit the live database. The generator still supplies the shared shell; the Worker owns public article routes.

Build with `npm run build`. Add new public assets to Git first. Run `tools/test-learn-editor.mjs` and `tools/test-learn-library.mjs` with JSDOM_MODULE pointing to jsdom, plus `tools/check-build.py` and `tools/check-editorial.py`. Transactional database checks cover drafts, public isolation, conflicts, publish/unpublish, history and unauthorized access; test writes are rolled back.

Research queue: consult `content/editorial-research-2026-09-30.md` alongside the cluster plan. These source-backed briefs prioritise thin categories but are not approved drafts; resolve the recorded source conflicts and check current product behaviour before writing.

## Authors and learning paths

All existing articles are credited to Biel Sardà (`authorId: biel-sarda`), also the default for new articles and paths. The admin author selector can change this. About us links each visible member through `/about/#<slug>` and emits Person structured data. In People, edit name, role, biography, photo and optional labelled HTTPS social links; the latter become `sameAs`. Do not invent biographies or credentials. Contributors can stay off the team page while retaining article credit. Archive a person instead of deleting their history.

Learning paths are ordered teaching routes, distinct from the ten-supporting-articles-plus-HUB editorial rule. Publish complete lessons with valid quizzes before publishing their path. A path has 2–30 distinct published lessons, clear objectives, prerequisites, useful sources and an author. Start with fundamentals, then build on them. Use meaningful tables, examples and glossary entries where useful; keep photorealistic article covers.

Each lesson round has 2–8 questions with four distinct options, one correct answer and an explanation. Completing every question records lesson completion regardless of score; percentages measure completed lessons, not mastery. Changing questions requires a new quiz version, so stale completions do not count. Guest progress stays in that browser; signed-in progress is scoped to that account and validated by the database. Guest progress is never silently transferred into another account.

Private learning entities and immutable revisions are accessible only through owner/editor RPCs. Public author/path tables expose intentional publications only. Path publishing validates its lessons; referenced lessons cannot be withdrawn or lose their quiz while the path is public. Draft edits retain the last publication. Deploy new assets before publishing database documents and check expected revisions and hashes against a fresh backup.

Validation: `tools/test-learning-paths.mjs` covers quiz grading, completion, retries, versions, Person markup, privacy, path routing and admin editing. `supabase/tests/learning_paths.sql` runs transactional checks and rolls everything back. Run the normal editorial, library, SEO and build checks as well.
