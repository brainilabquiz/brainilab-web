# Homepage render path and image delivery — 22 October 2026

The public mobile PageSpeed run at 07:19 CEST scored 91, with LCP 3.108 s,
zero blocking time and CLS 0.015. Four CSS requests transferred about 60.6 KiB;
Lighthouse estimated an 880 ms render-blocking opportunity. The consent paragraph
remained the lab LCP. These estimates are not guaranteed savings or visitor data.

Reference: https://pagespeed.web.dev/analysis/https-brainilabgames-com/yav6x6jpn0?form_factor=mobile

The homepage build now embeds the complete existing site, mobile and home-page
styles at their original positions. There is no asynchronous CSS switch or
partial initial stylesheet. Relative image URLs are resolved against the original
stylesheet location; other routes keep their shared cacheable stylesheets. The
tradeoff is a larger homepage HTML response and less cross-route CSS cache reuse
for this entry; the combined compressed transfer budget and actual public result
must be recorded before claiming an improvement. Seasonal CSS remains unchanged.

Three new AVIF derivatives preserve original artwork and aspect ratio: the
200/450 px logos from the existing corporate PNG, and the current 240 px article
thumbnail. Original PNG/WebP assets remain unchanged and are browser fallbacks.
The article derivative matches its exact existing thumbnail URL; a future or
replacement photo cannot inherit it. No CMS document, author, cover credit, crop,
publication date, video metadata, consent purpose, tracking or game logic changes.

Validation includes the original cascade and document body, CSS URL and HTML
boundary safety, external/print/disabled/integrity sheet exclusions, image
fallbacks, current/future cover matching, consent states and normal home entry.
Preview and public checks cover mobile/desktop geometry, keyboard focus, console,
image decoding, actual compressed bytes and a new PageSpeed run. A 100 score is
the target, not a guaranteed or inferred result.
