# Daily eligibility guidance, 20 October 2026

## Observed reader problem

On the public Brain Mix page, the Daily guard said that another practice round
was available, but offered only Today's Daily, All games and Retry. Retrying the
same out-of-lineup URL could not change the current selection. A link for another
date had the same practice promise without a practice action.

This is a directly observed navigation problem, not a diagnosed ranking loss.
The permanent Brain Mix title from PR267 already works and is preserved.

## Bounded correction

- Describe an old or future Daily link as a different Daily, without claiming it
  has ended or promising an unavailable practice action.
- Point both date and lineup exclusions to the existing Daily and Games links.
- Remove Retry only from these two fixed exclusions. Connection, version,
  main-first and extra-selection errors keep their existing recovery action.
- Keep the eligibility expression, dates, lineup, RPCs, choice recording,
  archive/try bypasses, gameplay, XP and scoring unchanged.

The existing components, status semantics, colours and focus styles are reused.
No new gameplay mode, entitlement, account prompt or analytics event is added.

## Evidence and rejected alternatives

The 20 October Search Console observation covers 20 September–17 October,
America/Los_Angeles, all captured markets without a language filter. There are
no visible query rows for Survival, BrainiWord or Sequence; Higher or Lower has
one ambiguous impression for “how big is the difference”. These are unknown or
sparse demand signals, not proof of zero traffic or current ranking positions.

Six current destination pages and two legacy aliases were checked. Survival,
Higher or Lower, BrainiWord and Sequence already have permanent titles, rules,
examples and relevant readings. The timezone and pretesting articles already
answer their questions with qualified examples. Fifteen relevant internal
destinations returned 200. Flag Dash and Map Hunt are intentional legacy aliases
to World Flags and Topic Rush, not missing articles to recreate.

The reused 17 October audit flags two 164-character descriptions. Their content
still describes the games clearly; length alone does not justify changing them.
The visible navigation error is the stronger bounded correction.

Google's [people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content),
opened 20 October, includes useful interactive features and clear page experience.
The original video reference is still limited to its visible description and
chapters; no full-transcript review, new paid research or ranking promise is claimed.

## Validation

The existing Daily UI suite covers out-of-lineup, past and future dates, offline
recovery and archive access. It checks that only the fixed exclusions lose Retry,
the permanent title survives and no player result is submitted. The Daily
contract covers 730 dates and 6,570 weighted scores. Production build, nineteen
reading journeys and 146 article destinations pass. The 348 protected gameplay,
question, editorial and migration sources retain their original bytes.

Browser previews at 320, 768, 1024 and 1440 CSS pixels show the existing layout
with the corrected actions; 1440 is displayed at 0.8 scale. Keyboard Tab moves
between the two existing links with a visible focus outline. No round was started.
These are browser previews, not native-device tests. Generated editorial/build
output is archived separately and excluded from the focused source change.

Outcome measurement remains pending: the observed search/analytics periods end
before the 19–20 October changes. Preserve original baselines and PR263's change
in inline article-click coverage; compare complete, equal, non-overlapping periods.
