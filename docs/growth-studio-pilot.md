# Growth Studio: portable client pilot

Audience: creators and small businesses. This is a complete local-file workflow
for one website at a time, alongside the existing BrainiLab admin. It is not a
hosted multi-client service. The entry point is `/admin/growth-studio/`, linked
from Growth and the article evidence panel. Opening it transfers no report,
draft, credential, decision or session from BrainiLab.

## What a pilot user can do

1. Define a business, exact HTTPS site origin, goal and success measure.
2. Import an English Search Console Web Pages CSV, supplying its actual period
   and UTC capture date. Blank counts stay unknown; numeric zero stays zero.
   Every row must belong to the exact project origin. No totals, forecasts or
   conversion rates are generated. The period and property are user assertions,
   not API-verified facts. Search is sorted for inspection, not automatic edits.
3. Import dated incoming-link records. Source, target and rel are deduplicated.
   These are supplied records, not backlinks verified by this tool or visits.
4. Analyse a saved public HTML file without executing it or following links.
   Compare Article declarations with canonical, main heading, explicitly marked
   byline and metadata. Dates retain source precision and compare instants.
   Missing, conflicting or malformed evidence stays unknown. Different crops or
   intentional canonical aliases may be valid. Supplied address and capture
   time cannot prove a live HTTP response, current index state or deployment.
5. Draft one article with its reader question, early answer, description, body
   and source-review notes. Structure review does not fact-check prose or certify
   grammar, demand, originality, AEO/GEO visibility or publication readiness.
   Export Markdown with explicit draft metadata and removable review notes.
6. Record concrete page actions, evidence and follow-up notes. Planned/done is a
   local user record, not a publication, deployment receipt or measured result.
7. Download/reopen the allowlisted project JSON and a standalone, printable HTML
   review report. The draft is excluded from the report unless selected. Review
   the report before sharing: search rows, observations and action notes are
   included. Downloading the project includes the draft and all project notes.

The simulated Juniper Workshop example uses an `.example` origin and an explicit
demonstration label in the workspace and report. Its numbers are invented sample
data, never evidence about BrainiLab, a customer, traffic or business results.
Starting a new project clears the previous browser workspace. A pending file
from the previous project cannot populate the next one.

## Data boundary and portability

There are no network calls, Google OAuth, account logins, cloud storage, browser
storage, analytics, payments, automated crawling or publication endpoints in the
pilot. The document CSP blocks network connections and third-party resources.
Files are read only after selection and processed in the browser. The upload
control sends nothing to a server. Raw supplied HTML is never saved in a project
or report; bounded observations and its SHA256 are retained. Scripts, images,
styles, iframes and destinations from supplied HTML are never loaded.

A project is for one exact origin; `www`, other schemes, paths and properties
are not silently merged. Imports validate before replacing existing observations.
Older dated search/HTML cannot replace a newer same-project source. Rejected
files preserve existing work. File size is limited to 2 MB; CSV to 2,000 rows;
one project to 100 page observations and 100 actions. JSON exports keep only the
supported fields. Credentials, private BrainiLab reports and player data have no
reader in this tool. Sharing/export remains a deliberate user action.

Use Download project to keep work between visits. The pilot intentionally has no
automatic save. A leave warning protects unsaved browser work, but a download
request does not prove that the user retained the file. The tools do not offer
collaboration, account-level isolation, managed backups or access control over
downloaded files. These capabilities must be designed and validated before
claiming a hosted subscription service.

## Commercial next steps

The usable milestone is a guided pilot and demonstration, with exportable client
deliverables. Validate it with actual creator/business workflows: a correct
property/period import, a defensible existing-page action, an article handoff and
an understandable report. Record actual completion time and feedback; do not
invent adoption, search uplift, revenue or a market-tested price.

Before a hosted paid offering: decide ownership, customer onboarding/support,
service scope, data retention, customer account separation and any individually
authorised data connections. Implement those as a separate reviewed scope;
this pilot adds no billing or permissions and makes no readiness claim for them.
The original BrainiLab editorial publisher, evidence contracts, decisions,
baselines, auth, CMS, XP, scores and player progress remain unchanged.

## Verification

`node tools/test-growth-studio.mjs` checks CSV handling, source scopes, zero versus
unknown, project round-trip and isolation, late file reads, inert HTML, precise
schema date comparisons, ambiguity, edit retention and safe optional-draft
exports. Run the existing admin/editor suites and normal full build. Native
keyboard, file import/export and narrow viewport checks are separate evidence;
automated tests are not a claim of complete accessibility conformance.

Current official source guidance: [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article),
[AI features](https://developers.google.com/search/docs/appearance/ai-features),
and [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable),
consulted 30 October 2026. No required Article fields, artificial FAQ, authority
score, live rank or special AI markup requirement is invented.
