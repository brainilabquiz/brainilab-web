# Canonical context: inspect the exact response before proposing a repair

The saved 26 October SEO snapshot has 215 requested entries: 199 passing all
8 checks and 16 legacy index.html entries with a raw canonical mismatch. Each
alias ended at its clean URL, separately inspected in the same observation and
passing all 8 checks. Their response hashes differ and the literal canonical
was not retained. The clean page cannot resolve the different alias response.

Page Trust offers All observed entries, Failed checks to verify, Legacy URL
context and Not inspected. All 16 remain in Failed checks to verify and keep
7/8; zero aliases are cleared in this saved observation. The context helps avoid
editing a correct destination on the basis of an unverified alias diagnosis.
Counts describe requested entries, not unique pages or an authority score.

Context requires an exact public index.html request with HTTP 200, a complete
dated checklist and only canonical failing. Its final URL must be the same path
with index.html removed. Exactly one alias and one clean destination must exist.
The destination must resolve to itself, pass all 8 checks and share the snapshot
capture instant. Private/API URLs are excluded. Missing, duplicate, differently
dated or failing destinations retain the original failed-check triage.

Even then, only matching valid nonempty HTML hashes confirm the same response.
Different, missing or invalid hashes leave the alias canonical unconfirmed and
in the failed-check view. Incomplete inspections remain unknown rather than
8 invented failures or a zero score. Raw checklist values never change.

No sibling checks are copied. No initial redirect code, Google-selected
canonical, indexing verdict, link loss or ranking gain is inferred. Searches,
backlinks and play sessions stay attached to exact URLs and are not merged.

Review a page adds context and navigation to the destination's separate evidence.
Page Trust's CSV keeps its original 7 columns and appends triage state, final
URL, destination capture date, explanation and both HTML hashes (13 columns).
Page review's 13-column CSV gains a dated Canonical context row.

This frontend interpretation uses the existing report without a new crawl,
Google request, import, database/schema/permission change, tracking, player
access or scoring change. It guides verification; it does not claim the 16
aliases are fixed or that a technical change would increase clicks.
