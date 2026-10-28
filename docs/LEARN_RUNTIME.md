# Learn runtime and resource limits

Public Learn rendering is delegated through `LEARN_PAGES` to `LearnPageStore`.
The binding aliases the existing `BreakingNewsStore` class and SQLite namespace.
`public-page-store.js` routes the internal `/_learn-render/` prefix to a separate
named object (`public-learn-v1:<origin host>`). It never uses `world-news-v1`.
There is no new production namespace or migration, and existing news routes,
alarms, storage and budget logic remain inherited unchanged. Previews bind only
the public-render alias, using their own isolated existing-class namespace.
The entry Worker forwards a request without cookies, authorization headers or
query parameters. The object renders only the fixed Learn/public-page routes and
fixed game-video recommendations. It cannot proxy arbitrary URLs or expose its
source cache. Its only retained environment capability is the ASSETS binding.

This avoids the account namespace limit reached by accumulated preview classes.
Do not add a new class migration just to isolate these public rendering calls.
The SQLite-backed namespace works on the existing Free-compatible configuration.
It uses an in-memory cache only: no SQL/KV storage writes, alarms or account data.
Each cache lookup returns a new Response from plain stored strings; streams are
never reused across invocations. The 60-second deadline applies in the object as
well. An eviction creates an empty cache and reloads current public publications.

Moving only body preparation to metadata reduced work but was insufficient:
live verification reproduced another 1102 immediately after cache expiry. The
object has the platform's normal Durable Object execution budget, so catalogue
refresh and HTML rendering no longer share the entry Worker's small CPU limit.
No paid-plan change or CPU-limit override is required. The entry Worker retains
the same security headers, seasonal decoration and homepage video handling.

The public catalogue is a source snapshot with a 60-second cache lifetime. The
cache key is `/_learn-catalogue-v2`; it contains prepared metadata in `articles`
and separate source section bodies in `bodies`. Do not expose this cache key as
an HTTP data endpoint or pass a source body directly to a renderer.

`publishedArticles` keeps its sanitised full-content default for existing callers.
Request handlers use `{summaryOnly:true, articleSlug}`: lists, feeds, sitemaps,
video recommendations and course navigation use metadata; only a requested
reading article goes through full `prepareArticle` HTML sanitisation. Summary
objects have empty sections. Keep the source-body preparation boundary intact.
The author biography does not depend on loading the article catalogue.

The October 2026 incident returned HTTP 503 with Cloudflare error 1102. Database
requests recorded during the incident returned 200. Preparing every article body
on each catalogue cache miss created an avoidable CPU spike as the library grew.
The runtime now prepares metadata once per snapshot and sanitises only the body
being read. This is not a stale-content fallback or a change to a paid plan.

Freshness and withdrawal rules are unchanged. Never extend an expired snapshot,
restore static article files, or turn an upstream failure into a successful page
with withdrawn content. An empty publication set removes those URLs from Learn,
Academy and the sitemap. A genuine source failure still returns a short-lived 503
with `Retry-After: 30`. A corrupt cache record is reloaded from the public source.

`tools/test-learn-runtime.mjs` covers cold and warm snapshots, sanitised reading
bodies, metadata-only lists, cache expiry, withdrawal, upstream failure/recovery,
Academy and the sitemap. It runs in the normal build. Retain the existing Learn,
SEO, schema and image-sitemap checks when changing this path.
