# Explicit current public-page review

The SEO Explorer page review uses saved evidence until the operator explicitly
selects **Check public page now**. This makes one GET to the exact validated
public BrainiLab URL, with `credentials: omit`, no referrer, no redirects, no query parameters,
a 12-second timeout and a 1 MiB streamed response limit. Private routes, API
routes and index.html aliases are excluded. The fetched HTML is never inserted
into a document: only its title and an unambiguous matching Article JSON-LD
declaration are parsed. Scripts, images, frames and games are not loaded.

The view labels datePublished/dateModified as publisher declarations. They are
not verified deployment timestamps, CMS revisions, Google crawl dates, ranking
evidence or proof of an effect. Missing, invalid, conflicting or ambiguous
declarations remain unknown; the crawl date is never substituted. Explicitly
offset timestamps are required to compare against source-day boundaries.

The declared modification timestamp is converted to the saved Web query/page
source timezone before comparing its day with that source's period. A window
ending before the update cannot measure it; an update inside the window means
the sample may include older content. A window starting after the update does
not, by itself, establish comparable complete periods or causal uplift.

Results and failed attempts are reused per exact URL in the current loaded
workspace. Navigation while a request is pending cannot attach its result to
another page. Reloading Growth permits another explicit check. No periodic
polling, Google query, indexing request, tracking, player lookup, new account,
report import, database write or decision/baseline change is introduced.

The existing page-evidence CSV adds only allowlisted current title, declared
dates, public URL, capture date and source-window context after the check. Raw
HTML, other declarations, account information and backend errors are excluded.
Older saved source observations remain independent. Existing published,
monitoring and dismissed decisions retain their protection.
