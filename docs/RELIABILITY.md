# Public availability and release protection

The Cloudflare build remains `npm run build`. Its deployment commands must be
`npm run deploy:checked -- preview` for non-production and
`npm run deploy:checked -- production` for production. These commands replace
direct Wrangler publishing, rather than adding a check after publication.

## Before production

Every build runs the Learn cache, withdrawal, error, schema, resource and health
tests. The resource test uses 1,000 synthetic publications in a separate Node
process with a 96 MiB heap. It is a local memory regression check, not a measured
Cloudflare CPU or memory limit. Catalogue source reads stop at 8 MiB; directory
reads at 2 MiB. Oversized or invalid source responses fail explicitly instead of
restoring withdrawn static content.

`dist/_release.json` identifies the commit and hashes the built public files,
Worker source, runtime libraries and configuration. It contains no credentials,
visitor identities or publication data. It is excluded from its own hash.

The preview command first deploys the isolated preview, then checks its exact
manifest, Learn, Academy, sitemap, one published article and one course at 0,
65 and 130 seconds. There are no retries or cache bypasses. A mismatch or failed
read exits nonzero and the Cloudflare build cannot finish successfully.

The production command requires a two-parent reviewed merge. It looks up the
latest Cloudflare preview check for the merged head, verifies that it succeeded,
and verifies that its URL belongs to the fixed account and Worker. It
requires the exact candidate commit and an identical runtime/content hash, then
repeats the 130-second public check before invoking Wrangler. Direct commits,
missing/failed checks, GitHub status unavailability, unexpected origins, changed
preview contents or changed main contents stop production publishing. Update
the branch and its preview if main has changed; do not weaken the check.

Wrangler is selected explicitly as 4.155.0, the version used by the successful
October 28 production builds. A deliberate upgrade needs build and gate checks.
Run these commands through npm so the Node child process uses its existing npm
CLI without constructing shell commands or exposing credentials in arguments.

## Five-minute server monitor

The `*/5 * * * *` UTC cron uses an object named `site-health-v1` in the existing
namespace. It makes five anonymous GETs through the real public domain: Learn,
Academy, sitemap, an article and a course selected from that sitemap. The last
two rotate every five-minute slot. Only status codes, fixed public paths,
durations, counts and coarse error codes are stored. No scripts run, accounts
are created, analytics events sent, paid news calls made or player data read.

The bounded record contains the latest check, the last failing check and a
failure counter. It does not grow into an unbounded log. `/api/site-health` is
read-only and never starts a check. It returns 503 if the last check failed, is
missing or is more than 15 minutes old. The old news cron and singleton remain
separate; the five-minute event cannot call the paid news refresher.

Cron changes can take up to 15 minutes to propagate. A healthy status is evidence
of a completed check, not a promise about the next five minutes. The server
monitor shares Cloudflare with the application, so it cannot independently
detect every provider-wide outage.

## Alerts in Codex

The requested five-minute heartbeat runs `tools/monitor-availability.mjs` with a
private state file outside the repository. It independently reads the public
pages and server status. It reports a new failure, a stale server monitor or a
previously unseen server error recorded between runs. Identical ongoing failures
are deduplicated; successful checks and routine recoveries do not generate an
alert. No email, messaging webhook or extra paid service is configured.

Heartbeat execution/delivery requires Codex and its local host to be available.
The server cron continues when the desktop is closed, and keeps its last error
for the next heartbeat. Do not describe local Codex notifications as an
independent always-on external paging service.

## Namespace budget

Production reuses the existing class and migration. It does not create another
production namespace. Preview classes still count toward the account quota.
The October 28 dashboard showed 99 namespaces before the final preview reused
one class; the account then had no headroom for many fresh preview branches.
Every checked preview reuses the existing `codex/learn-render-store-oct28` slot,
so routine publishing does not allocate another namespace for each branch.
Concurrent candidates may replace this shared preview; exact commit/hash checks
then stop the displaced release. Rebuild the intended candidate before merging.
Review old previews, their ownership and stored data before any separately authorised
permanent removal. Never delete the production namespace or upgrade a plan as a
side effect of a release. The migration identity regression test remains in the
normal build.

## Learn and Academy structured data gate

The release check also audits every published Learn article and Academy course
listed in the sitemap, with two concurrent anonymous reads and a short pause.
It reuses Growth's Article/Course comparison against inert HTML. Titles, author
bylines, visible covers, registered social-image equivalents, publication time,
the displayed publication date, modification metadata and ordered course lessons
must agree. Missing or ambiguous evidence stops the release as unverified; it
is not labelled a proven mismatch. Publication dates are visible; modification
dates are compared with the existing HTML metadata, not invented visible dates.
The complete inventory is reread at the end and the candidate manifest checked
again, so a changed catalogue or replaced preview cannot pass with partial work.
JSDOM is a pinned development-only parser: scripts, images and remote validators
are never loaded. This site consistency policy does not claim Google's optional
Article fields are mandatory, verify factual claims or guarantee search features.
When blocked, inspect the reported path and field, correct the declaration or
renderer against the stored publication record, then build a new candidate.
Do not invent an updated date or relax the gate just to make a release pass.
