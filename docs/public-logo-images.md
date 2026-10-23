# Reuse the lighter existing logo images

Public game and Learn pages now offer the reviewed homepage AVIF logo derivatives before the existing WebP/PNG fallback. The 200-wide AVIF is 5,745 bytes instead of the WebP's 16,024 bytes (10,279 bytes, about 64% less per uncached logo resource). The 450-wide derivative is also smaller. No image is regenerated or re-encoded.

`lib/brand-logo-images.js` matches the complete existing PNG fallback and both expected WebP candidates. It preserves `sizes`, dimensions, loading/decoding/fetch priority, alt text and all surrounding HTML. Relative root and nested paths keep the same base. Existing AVIF alternatives, replacement artwork, arbitrary external images, comments/scripts/styles and account/admin pages are left alone. The homepage keeps its established transformation.

The static build applies the helper; live Learn pages retain the optimized header/footer from their published template. No JavaScript image swap, stylesheet change, privacy-choice change, game, quiz, progress, XP or score write is added. Browsers select a supported source themselves and retain the original fallback.

The asset-pair hashes in `tools/fixtures/brand-logo-images.json` require a deliberate visual review if either original or derivative is replaced. Run `tools/test-brand-logo-images.mjs`, the homepage first-paint tests and the full build. Check native browser selection and layout, then remeasure the public page. A byte reduction is measurable; a laboratory score can vary and is not proof of ranking, indexing or more players.
