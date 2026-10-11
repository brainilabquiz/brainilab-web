# API recovery — 11 October 2026

User requests repairing automatic news updates now; any subsequent failure must pause until Codex review. Existing monthly EUR 8.96 reservations / EUR 10 authorization remain. No paid attempt made during diagnosis.

Private diagnostics access is now authorized and works. Data Studio cannot inspect KV API data; Workers Observability was disabled. PR127 mirrors ONLY stored api-diagnostic machine fields to news_api_diagnostic in the same private world-news-v1 object. No credentials, prose, player data, ledger or new public endpoints. GET /edition does not bypass failure guard.

PR127 merged b14b4acaf5c9450b3cd2604e5b8f62d443f96eba. 14 focused tests and full build pass. Production deployed; a public edition read backfilled the private table and the exact diagnostic row was read in Data Studio.

Sources: https://developers.cloudflare.com/durable-objects/observability/data-studio/ (SQL-only UI); https://developers.openai.com/api/docs/guides/tools-web-search (web_search supports GPT-4.1 mini and allowlisted filters).

## Private diagnostic read

Cloudflare Data Studio, same production BreakingNewsStore/world-news-v1 instance:
- checked_at: 2026-10-11T00:00:32.272Z
- http_status: 400
- error_code: null
- error_type: invalid_request_error
- error_param: tools

This identifies rejection of tool configuration, not bad credentials or exhausted credit. The precise upstream prose was intentionally not stored. Official docs accept legacy web_search_preview but exclude domain filters for that tool. Keep the fixed GPT-4.1-mini snapshot and local allowlisted source validation; use preview compatibility mode with explicit allowed domains in instructions. One reviewed recovery trial only; any failure must pause. Preserve existing ledger and reserve the additional trial before transmission.

## Recovery implementation and validation

The compatibility request retains the fixed model, one maximum tool call, low search context, 1,800 output-token ceiling and private usage audit. Direct source URLs must still be returned by actual search and pass the domain and date checks.

The review search-compat-2026-10-11 applies only to the exact diagnostic above and expires at 12 October 00:00 UTC. One additional 14-cent reservation can use the already-consumed slot without resetting it or the monthly ledger. A persistent marker is consumed atomically before the request. Any new failure remains paused across visits, new slots, deployments and months.

32 focused tests pass, including concurrent scheduling and calls, preservation of the existing ledger, success returning to the regular schedule, and failure staying paused. Full site build passes. A real provider request has not yet been made for this recovery; production verification is required after deployment.

Pricing reference: https://developers.openai.com/api/docs/pricing . Web search preview for the non-reasoning model is $0.025/call with search-content tokens free; the existing 14-cent local reservation and 896-cent monthly allowance remain unchanged.
