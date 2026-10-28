# Learn runtime and resource limits

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
