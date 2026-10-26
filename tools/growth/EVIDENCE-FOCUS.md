# Next checks: observed clicks and recorded starts

Evidence focus is a read-only lens over the existing query/page and Play sessions
snapshots. It makes no request, imports no report and writes no decision.

- All observed searches preserves the existing single-query impression order.
- Observed Google clicks chooses the highest-click matching query/page row for
  each candidate and keeps positive returned clicks. It never adds query rows.
- Recorded starts / Google organic uses only that exact landing-path cohort.
- Recorded starts / all sources uses a separate, overlapping all-source cohort.

Start-focused views require a positive returned sessionsWithStart, a compatible
positive session denominator, known landing-query dates and no reported quality
limitation, using the existing validated play-session helper. Missing, zero,
inconsistent or quality-limited observations are not promoted by these lenses.
An empty focus does not establish zero visitors or players. The all-search view
retains pages with unknown start evidence so their absence is visible.

The table names the two start-session scopes explicitly. Events are not playing
sessions, and neither means unique players or completed games. Dates and periods
stay separate from Search Console. A query row and a landing start do not prove
the same visitor, keyword attribution or causal uplift. No opportunity score,
search volume, live ranking or traffic forecast is calculated.

Current loaded decisions are checked before any focus. Published, monitoring and
dismissed pages stay outside Needs review. Every recorded decision excludes the
page from Observed pages without a decision. All matched decisions is an explicit
inspection scope and keeps protection messages. No focus creates approval.

Explicit current-page checks from the existing Review a page action are reused
in Next checks for the exact URL in this loaded session. Publisher-declared
updates are compared with the saved source window; they are not deployment
proof and do not change or dismiss a decision. No automatic HTML read is added.

The full filtered CSV retains its original 19 search/older-organic fields and
adds 18 fields for the evidence focus, both play scopes, query/capture dates,
quality and any explicit current-page check. Older event counts are labelled as
a separate observation. Counters and missing values are never summed or filled.
