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

Learn opens with the newest publication per category. Search, category filters and All articles expose the rest. Original publication dates decide recency; ordinary edits do not make an old article new. Display order breaks ties. Covers use a compact crop and readable titles.

## Technical source of truth

- Private `brainilab_editor.articles` and `revisions`: drafts and immutable history, optimistic revision checks. No client table grants. Privileged helpers are in a non-exposed schema and verify active owner/editor role and MFA.
- Public `learn_publications`: intentional publications only, public read RLS, no client write grants. Public RPC wrappers are security invoker.
- Storage `learn-covers`: owner/editor uploads, 3MB maximum, JPEG/PNG/WebP MIME allowlist; no overwrite or deletion permission.
- `lib/learn-content.js`: shared HTML allowlist sanitizer, cards, articles and metadata.
- `lib/learn-worker.js`: server-rendered Learn, articles, home cards and sitemap; public cache 60 seconds. Missing articles return 404. Database failure returns 503 instead of restoring withdrawn static articles.
- `editor/admin-articles.js`: admin editor source; build produces its browser bundle.
- `content/articles/*.json`: initial reviewed seed and static build fixtures. Editing these files does not edit the live database. The generator still supplies the shared shell; the Worker owns public article routes.

Build with `npm run build`. Add new public assets to Git first. Run `tools/test-learn-editor.mjs` with JSDOM_MODULE pointing to jsdom, plus `tools/check-build.py` and `tools/check-editorial.py`. Transactional database checks cover drafts, public isolation, conflicts, publish/unpublish, history and unauthorized access; test writes are rolled back.
