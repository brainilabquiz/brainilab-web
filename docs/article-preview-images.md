# Representative article preview images

Six existing articles now offer the original 1536 × 1024 artwork in Open Graph, Twitter image metadata and Article structured data. The original PNG bytes are reused without enlarging or modifying the artwork. They are metadata assets only: the visible cover and the 960/480/240 WebP reading/card images are unchanged. Existing alt text, honest AI credits, authors and publication dates remain in place.

Google recommends relevant large images at least 1200 pixels wide and more than 300,000 pixels in total for Discover, along with `max-image-preview:large`. It also recommends a 16:9 composition. These originals are landscape 3:2; their real dimensions are reported and their existing composition is retained rather than blindly cropping the subject. No claim is made that all image recommendations are satisfied or that Google will use these thumbnails. The page already allows large previews.

Source: [Google Discover documentation](https://developers.google.com/search/docs/appearance/google-discover), checked 23 October 2026. Indexing and compliance are required for eligibility; eligibility does not guarantee appearance, clicks or a search position.

`lib/article-preview-images.js` matches the complete current cover URL, not an article slug. A replacement URL falls back to the new cover rather than retaining unrelated old artwork. `tools/test-article-previews.mjs` checks the current cover hash, immutable original hash, PNG dimensions, metadata consistency, repeated rendering, replacement fallback and separation from on-page image requests. If the bytes of a mapped source cover are replaced at the same path, review and update or remove its registry entry before building. A live CMS replacement should use a new immutable cover URL, as usual.

For an additional article, verify that the available high-resolution original is the same artwork as the current cover, review its composition and rights/credit, publish it at an immutable URL and add the exact cover identity with both hashes. Keep the lightweight reading derivatives. Do not upscale a small cover and call it an original. Do not substitute a generic brand logo for a representative article image.

This change adds no tracking, publication-date refresh, game changes or score/progress writes. It does not request another crawl or re-submit a sitemap.
