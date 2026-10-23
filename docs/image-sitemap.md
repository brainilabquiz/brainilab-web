# Article covers in the existing sitemap

The static build and live publication route now share `lib/learn-sitemap.js`. Each eligible published article entry includes the actual same-origin WebP reading cover in `image:image` / `image:loc`. The page URL set stays the same. Article modification dates come from the stored document timestamp, including in the static build, rather than the build date.

Only explicit `/assets/images/learn/*.webp` cover paths are eligible. No guessed image filenames, generic brand logos, preview-original downloads, account paths, arbitrary external hosts or query strings are added. External Storage covers retain their page entries without an image annotation: ownership of that hosting domain has not been independently verified in Search Console. A renderer fallback image is not attributed to a different article.

Regeneration replaces Learn entries from the current published catalogue. Withdrawal removes the article and its image together; a publication-service failure keeps the existing error response rather than reviving a withdrawn static document. Other page entries and their stored timestamps stay intact. No content document, image bytes, layout, scripts, tracking, game or score/progress data are changed.

[Google's image sitemap documentation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps), checked 23 October 2026, allows image annotations in an existing sitemap and requires the image namespace and location tags. It requires verifying external hosting domains and warns against robots exclusions. The deprecated caption/title/licence/location tags are not emitted. The sitemap helps discovery; it is not evidence of indexing, search position, Discover eligibility or traffic.

Validate with `tools/test-image-sitemap.mjs`, `tools/test-sitemap-dates.mjs` and the complete build. Parse the generated and public XML with a namespace-aware parser, compare the page URL sets and dates, and verify each advertised image response before claiming release success. The existing sitemap URL remains in robots.txt and Search Console; this change creates no new sitemap submission or indexing request.
