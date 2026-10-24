# Automatic editorial upload

Owner authorisation: 24 October 2026, “soluciona això i automatitza la pujada d'articles”.

The existing browser CMS remains available with the same role/MFA checks. The unattended route uses the already authenticated management connector to call the private SECURITY INVOKER function brainilab_editor.publish_reviewed_release(text). Only postgres can execute it. There is no public RPC, HTTP endpoint, new token, service-role key or simulated editor session.

The two restricted save helpers preserve the observed CMS validation, advisory locks, exact revision checks, original dates, revision history, author checks and quiz triggers. A null actor truthfully records management automation rather than attributing a save to a person. The release wrapper checks the original CMS function fingerprints; a later CMS change stops automation until compatibility is reviewed. It does not change any existing authentication or player table.

## Queue and review

Reconcile the existing local editorial run and its edition ledger before work. This uploader consumes reviewed content; it does not add a third daily generation stream. A shared database lock and deterministic release ID prevent overlapping retries. The release-wide daily allowance is two new supporting articles, including manual publications. Hubs are additional; Academy extensions reuse current lessons. A failed transaction publishes nothing.

Keep queue documents, raw Search Console/Growth reports, source captures, screenshots, backups and receipts in a private working directory outside the public repository. Never commit them to fix a rejected upload. Public repository research may contain public sources, never internal analytics exports. PR361 contains text drafts, not approved publication packets.

A private plan has an id and entries with kind (article, lesson, hub, links or path), document and review relative filenames. Hubs also list exactly ten supportingSlugs. A review is bound to the exact document bytes by documentSha256. It contains a checkedAt timestamp and records for intent, novelty, sources, examples, english, metadata, links, mobile, desktop and validators. Each record needs status verified, a relative proofFile and the actual proofSha256. Missing or edited proof files fail preparation.

Demand additionally requires type search-console or external-estimate, the precise query, market, language en and checkedAt within 30 days. A Trends index, a search result or a broad commercial keyword alone is insufficient. Record the actual page-filtered query evidence and the original observation date. The tool validates evidence integrity and required fields; it cannot decide whether a source supports an argument. The editor/agent must perform and record that judgement honestly. Never generate synthetic evidence to satisfy a gate.

For a quiz, include a quiz review with the real renderer test proof, allCorrect equal to the number of questions, allWrong zero and status verified. These are optional quizzes in the public reading flow. Preserve existing lesson identifiers/order, quiz versions and account progress.

## Execute one release

1. Read current PROJECT_CONTEXT.md, EDITORIAL_WORKFLOW.md, content/AGENTS.md and content/PUBLIC_COPY.md. Audit the live published catalogue and private drafts for duplicate intent.
2. Complete the original-cover, source, demand, language, metadata, existing-validator and mobile/desktop reviews. New article/hub covers need truthful credit and 960/480/240 WebP assets. Deploy only the scoped assets through the normal reviewed GitHub/Cloudflare flow.
3. Write a targets JSON array of kind article or path and slug. Run node tools/editorial-publish.mjs snapshot private-targets.json. Execute its SELECT through Supabase management on the BrainiLab project. Save the returned snapshot object privately as JSON. It includes explicit missing targets, current draft/public revisions, document fingerprints and the backup documents.
4. Run node tools/editorial-publish.mjs prepare PRIVATE/plan.json PRIVATE/snapshot.json PRIVATE/release-output. The directory must be new. This hashes local proofs and backup, checks review freshness, fetches the exact public covers without redirects, checks WebP MIME/dimensions and emits a private packet.json and publish.sql. Never upload either file to public GitHub.
5. Execute the emitted SELECT through the authenticated Supabase management connector. No scripts read connector credentials. The server verifies all gates again, compares current revisions and document fingerprints, publishes articles before paths in one transaction and records an immutable receipt. Publish a hub and its ten return-link changes in the same packet. The hub must not overlap another route merely to reach ten.
6. Save the receipt privately. Retry the exact packet after an interrupted response; the same ID and hash returns the existing receipt without another revision. A changed packet with the same ID is rejected. A stale revision requires a fresh backup and renewed review, never a forced overwrite.
7. The receipt state is published-pending-public-verification. Check actual public URLs after the cache refresh: headline, sources, cover variants/crops, category/course navigation, author, canonical, Article schema, RSS and sitemap. Inspect both screen sizes. Only then report completed publication. A retry must finish verification before taking a new item.

Preparation is not publication, and a database receipt is not public rendering or Google indexing.

## Validation and failure recovery

Run node --test tools/test-editorial-publish.mjs. Run supabase/tests/editorial_management_release.sql inside BEGIN / ROLLBACK through the management connector; all fixture evidence is synthetic and all writes must roll back. Tests cover missing evidence, assets, expiry, stale revisions, atomic hub failure, idempotency, history, path publication and denial of browser/anon/service roles. Run the normal repository editorial/course/build checks for the actual content packet as well.

If the management connection fails, keep the private queue and exact packet for retry. Do not open browser credential storage, fabricate a JWT, grant public access, weaken RLS or publish directly around the release checks. If demand or another substantive gate is missing, keep the draft, record the specific gap privately and move to a genuinely supported candidate. Notify only for completed publications or a new actionable incident.
