# Breaking News

Homepage summaries, independent of the desktop agent. No visitor data is sent to OpenAI. The existing Cloudflare Worker owns one SQLite Durable Object named `world-news-v1`; its state contains the last edition, private research evidence, API usage, operational status and monthly reservation ledger. No public write or refresh endpoint exists.

## Scheduling and budget

Cloudflare Cron runs at 00:00 and 12:00 UTC. The first homepage read schedules a single bootstrap alarm. Both paths share an atomic 12-hour slot reservation, so concurrent invocations cannot duplicate a paid request. Each attempted request reserves 14 euro cents before transmission, including failures; maximum monthly reservations are 896 cents (64 attempts). The month follows Europe/Madrid. Failed requests are never automatically retried in the same slot. Preserve this object's identity and ledger across deployments.

This is a conservative local expenditure allowance, **not an invoice or a provider-enforced euro billing cap**. Official prices checked on 9 October 2026: GPT-4.1 mini $0.40/M input, $1.60/M output, web search $0.01/call with an 8,000-token input block. The request has one maximum tool call, a low search context and 1,800 maximum output tokens. The reservation allows substantial currency/tax margin and a worst-case 128k search context. Review prices/exchange/taxes before changing the model or limits. No other paid tools, retries or subscriptions are enabled. The user's overall authorization is at most EUR10/month; do not increase the allowance automatically. Provider account usage by other apps is outside this ledger. Configure a dedicated API project, low prepaid balance and disabled automatic recharge for additional protection.

## Configuration

Keep `OPENAI_API_KEY` as a Cloudflare secret. Never commit, print or export it. The user entered it in Cloudflare. Existing unrelated secrets and bindings must remain unchanged. Wrangler provisions the SQLite object and cron when the deployment succeeds. No Supabase migration or privileged database credential is required.

## Editorial rules

Live search only, allowlisted established newsrooms and primary institutions. At most five distinct consequential stories, original short English prose, simple titles, direct HTTPS source links and honest dates. This is an editorial selection, not an objective ranking of the world's five most important events. A recently reported development in an older event must be described as an update. A source link must occur in the actual search results or annotations, not only the model's JSON. Reject absent search, incomplete responses, unsupported links, invalid dates and empty results. Evidence and usage stay private. Automated grounding reduces mistakes but does not prove each generated sentence; periodically review editions against their sources and correct errors.

At every render, remove stories reported 48 hours ago or earlier, future-dated stories and stale editions. If there are no valid stories, omit the homepage block rather than inventing or promoting stale news. On API failure keep the prior edition with its original date. The date shown is the last successful edition, never a failed attempt. No publisher feeds, images or copied paragraphs are imported.

## Visual rules and verification

Compact white card with a low-opacity red border/aura, four-second pulse, no strobing or flashing text. Respect reduced motion, keyboard focus, short summaries, mobile layout and links opening in another tab. CSS has no third-party dependency.

Run `node --test tests/breaking-news.test.mjs tests/news-refresh.test.mjs`, the normal site build and desktop/mobile visual checks. Check the production deployment (not just preview), then inspect a real edition, source links and the cron binding. A successful local test is not evidence of a successful API call or a configured secret. Do not claim the feature is active until production has a current edition and a verified server schedule.

Official references: https://developers.openai.com/api/docs/guides/tools-web-search ; https://developers.openai.com/api/docs/models/gpt-4.1-mini ; https://developers.openai.com/api/docs/pricing ; https://developers.cloudflare.com/workers/configuration/cron-triggers/ ; https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ .
