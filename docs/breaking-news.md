# Breaking News

Homepage summaries, independent of the desktop agent. No visitor data is sent to OpenAI. The existing Cloudflare Worker owns one SQLite Durable Object named `world-news-v1`; its state contains the last edition, private research evidence, API usage, operational status and monthly reservation ledger. No public write or refresh endpoint exists.

## Scheduling and budget

Cloudflare Cron runs at 00:00 and 12:00 UTC. The first news-page/API read schedules a single bootstrap alarm. Both paths share an atomic 12-hour slot reservation, so concurrent invocations cannot duplicate a paid request. Each attempted request reserves 14 euro cents before transmission, including failures; maximum monthly reservations are 896 cents (64 attempts). The month follows Europe/Madrid. Following the user's instruction on 11 October, a failed paid refresh pauses ALL later automatic attempts, including future slots and months, until reviewed in Codex. The guard checks the stored failure before reserving any budget. Existing api-error state is covered. Manual publication does not clear the failure or spend money. Preserve this object's identity, failure state and ledger across deployments. Never reset the ledger to resume automation. The existing missing-key bootstrap can still run once when the first key is supplied; no paid failure is retried by page views.

This is a conservative local expenditure allowance, **not an invoice or a provider-enforced euro billing cap**. Official prices checked on 11 October 2026: GPT-4.1 mini $0.40/M input, $1.60/M output; compatibility web search preview for this non-reasoning model is $0.025/call with search content tokens free. The request has one maximum tool call, a low search context and 1,800 maximum output tokens. The 14-cent reservation remains conservative, including currency/tax margin; the monthly allowance is unchanged. Review prices/exchange/taxes before changing the model or limits. No other paid tools or subscriptions are enabled. The user's overall authorization is at most EUR10/month; do not increase the allowance automatically. Provider account usage by other apps is outside this ledger. Configure a dedicated API project, low prepaid balance and disabled automatic recharge for additional protection.

## Reviewed recovery on 11 October

The user explicitly requested repair and one recovery test now. The private diagnostic identified HTTP400, invalid_request_error, param tools at 2026-10-11T00:00:32.272Z. The fixed GPT-4.1 mini snapshot now uses the documented compatibility tool web_search_preview; filters are omitted because preview does not support them. The prompt restricts source domains and the existing parser still rejects every direct source URL absent from actual search evidence or outside the allowlist.

Only that exact reviewed failure can consume review search-compat-2026-10-11 once, before 12 October00:00UTC. The atomic reservation records a separate review attempt and audit without clearing the previous slot, failure diagnostic or monthly ledger. This explicitly reviewed trial can use the already-consumed slot, but reserves an additional14cents and cannot exceed the existing monthly allowance. A concurrent visit, duplicate alarm, later deployment, later failure or another month cannot repeat the review. Success returns to the existing00:00/12:00UTC cron; any new failure remains paused for the next Codex review. No public mutation endpoint exists.

Data Studio cannot inspect the hidden KV table. news_api_diagnostic mirrors only one private timestamp, HTTP status and bounded error identifiers from api-diagnostic. It contains no credentials, response prose, visitor data, news audit or budget. Edition reads can backfill it without paying for a research request or unpausing an unreviewed failure. See docs/news-api-recovery-2026-10-11.md for the diagnosis and validation.

## Configuration

Keep `OPENAI_API_KEY` as a Cloudflare secret. Never commit, print or export it. The user entered it in Cloudflare. Existing unrelated secrets and bindings must remain unchanged. Wrangler provisions the SQLite object and cron when the deployment succeeds. No Supabase migration or privileged database credential is required.

## Editorial rules

The current manually reviewed edition is in `lib/news-first-edition.js` (legacy filename). Review notes and source dates are in `docs/news-review-2026-10-11.md`; the original 9 October launch edition remains in Git history. It is an editorial selection, not an exhaustive ranking. It is available only while individually fresh, retains a fixed preparation time and never resets dates during deployment. A newer successful automated edition replaces it. The public API reports `manual-edition` and a separate `automationStatus`, so a manual publication cannot conceal the pending provider error. No paid research call or storage/budget reset is needed for manual publication.

Live search only, allowlisted established newsrooms and primary institutions. At most five distinct consequential stories, original short English prose, simple titles, direct HTTPS source links and honest dates. This is an editorial selection, not an objective ranking of the world's five most important events. A recently reported development in an older event must be described as an update. A source link must occur in the actual search results or annotations, not only the model's JSON. Reject absent search, incomplete responses, unsupported links, invalid dates and empty results. Evidence and usage stay private. Automated grounding reduces mistakes but does not prove each generated sentence; periodically review editions against their sources and correct errors.

At every render, remove stories reported 48 hours ago or earlier, future-dated stories and stale editions. If there are no valid stories, omit the homepage block rather than inventing or promoting stale news. On API failure keep the prior edition with its original date. The date shown is the last successful edition, never a failed attempt. No publisher feeds, images or copied paragraphs are imported.

## Visual rules and verification

Compact white card with a low-opacity red border/aura, four-second pulse, no strobing or flashing text. Respect reduced motion, keyboard focus, short summaries, mobile layout and links opening in another tab. CSS has no third-party dependency.

Run `node --test tests/breaking-news.test.mjs tests/news-refresh.test.mjs`, the normal site build and desktop/mobile visual checks. Check the production deployment (not just preview), then inspect a real edition, source links and the cron binding. A successful local test is not evidence of a successful API call or a configured secret. Do not claim the feature is active until production has a current edition and a verified server schedule.

Official references: https://developers.openai.com/api/docs/guides/tools-web-search ; https://developers.openai.com/api/docs/models/gpt-4.1-mini ; https://developers.openai.com/api/docs/pricing ; https://developers.cloudflare.com/workers/configuration/cron-triggers/ ; https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ .
