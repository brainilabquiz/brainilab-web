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

The first public run after PR310 scored 100 mobile (07:40 CEST), LCP 1.697 s,
speed index 1.572 s and CLS 0.023. Lighthouse still attributed a small shift to
the article/introduction below the asynchronous video card. Reserve two label
and title lines in both playlist and video states, and remove the image wrapper's
intrinsic minimum height. A local browser fixture using the actual built styles
confirmed identical video height, article position and social-link position before
and after the real fallback/latest text and class transition at 320, 390, 768 and
1440 px. No delayed style activation or game/account change is involved. The
final public performance and layout measurement must still be recorded.

PR311 removed the measured shift (CLS 0 in the 07:48 run), but that run scored
92 because the consent paragraph was again the LCP at 3.157 s. Do not select only
the earlier 100 run. To remove the remaining controller-download dependency, the
homepage now executes the exact existing minified consent controller immediately
after its initial markup/gate, before main content and unrelated deferred SDKs.
Other routes keep the original external bundle. No consent logic or text changes.
Nine full parser-time fixtures verify functional controls while readyState is
still loading, prior rejections, expired/future values, no pre-consent vendor tags
and the unchanged account loader and game entry. Record the final public samples
and their limitations rather than promising a permanent score.

The 08:01 run after inline consent scored 94, not a stable 100. The remaining
critical network tree contained only the seasonal stylesheet. The next build
also includes that exact version in the homepage response; the event decorator
skips its link only when the embedded version matches, and other routes retain
their normal sheet. Calendar/configuration and decorations are unchanged. This
small stylesheet remains embedded outside the event window, without activating
the event or loading its scripts; this is an explicit HTML-byte tradeoff.

The homepage copy of shared CSS now omits rules whose every selector has a
positive, top-level profile/ranking/stats/social/group/friends namespace. It is
not a general purge. Negated/functional alternatives, mixed shared rules, all
auth/account/consent/quiz states, shared avatars, frames, achievements and profile
title/rank helpers are retained in order. The original shared CSS on all other
routes is untouched. PostCSS, already in the lockfile through sanitize-html, is
declared explicitly for this build step. Tests cover shared components and the
seasonal exact-version fallback. Preview must include guest sign-in and the
signed-in account menu as well as normal mobile/desktop content.
