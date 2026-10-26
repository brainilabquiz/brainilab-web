# Saved review queue in Next checks

The matched search table and saved unfinished decisions are different sets.
Previously a pending/approved decision with no query/page row disappeared from
Next checks. A click/start focus or text filter could also hide unfinished work.
The queue now remains visible independently of those lenses, using only the
validated currently loaded workspace decisions. An imported proposal status is
never a current approval. Reload Growth before acting.

Approved pages appear first, then conflicting records, then pending review.
An exact URL appears once. Multiple unfinished records for one URL are labelled
as conflicting and must be reconciled, never promoted as approval. A published,
monitoring or dismissed record protects its whole URL and excludes it from the
queue. Duplicate record IDs invalidate the current decision set.

The queue names whether an exact positive-impression Web query/page row was
returned, or whether that independent source is unavailable. It preserves the
source's period, timezone and capture date without summing queries. Missing
search evidence is unknown demand, not a reason to cancel a decision. Pending
records are not new approved opportunities. Every row links to its existing
decision card using the existing keyboard-focus action; it creates no decision.

The queue is separate from the matched-evidence counter and 37-column CSV.
The UI states that Download current view exports the matched evidence table,
not the queue. No collector, metric, report, baseline, decision state, permission
or tracking changes. No public-page reads, indexing requests or writes happen
when opening or filtering Next checks.

Reproduction with the saved 26 October report and saved current decision
metadata: zero Needs review query matches, but three pending decisions
(Survival, the Post-it article and the wrong-guess/pretesting article). These
are review records, not three justified edits or evidence of zero demand.
