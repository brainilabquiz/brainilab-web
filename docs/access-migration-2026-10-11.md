# Access repair — 11 October 2026

## Confirmed failure

The public domain resolves to 188.114.96.5 / 188.114.97.5 and 2a06:98c1:3120::5 / 2a06:98c1:3121::5. Local IPv4 and IPv6 TCP/443 time out before TLS and HTTP. A paired HTTPS request using 104.21.74.175 succeeds with ordinary certificate validation. Spain, France, UK and US Globalping probes previously returned HTTP 200. This is a network-path/IP-specific failure, not evidence of a globally broken application. The precise operator-side cause is unconfirmed.

The Supabase public auth endpoint returns its expected unauthenticated HTTP 401 in 202 ms on the same connection. No player records were queried. The www variant returns 301 through the working Cloudflare address.

Cloudflare states that Free/Pro/Business plans use shared IPs, that they do not rotate assigned IPs on request, and that upgrading these plans does not provide exclusive IPs. Pinning a currently working shared address is not a stable repair.

## Prepared alternative

`infra/netlify-entry/` is a manually deployable entry on Netlify. It proxies to the fixed, existing HTTPS production Worker address. The Worker recognizes exactly that hostname as production. Branch preview hostnames remain isolated from production news. No user-supplied forwarding header controls the origin. Query strings, methods, authentication headers and bodies survive normalization; existing method restrictions remain in effect.

The entry contains no application credentials or copied database. Cloudflare continues to run the same Worker, Durable Object `world-news-v1`, scheduled jobs, budget ledger and encrypted secrets. Supabase, canonical URLs, browser account storage, ads and consent stay on the same final public hostname.

**Preparation is not a completed migration.** No production DNS is changed by these files. A real Netlify deployment must verify rewrite status codes, cache behavior, request headers, images and scripts before cutover. Unit tests cannot certify Netlify's runtime.

## Cutover procedure

1. Create a Netlify Free account owned by the user; the user accepts new service terms. Do not add a payment method, paid upgrade, automatic recharge, GitHub OAuth grant or API secret.
2. Manually deploy the contents of `infra/netlify-entry/` (or the prepared ZIP). Confirm that Netlify recognizes `_redirects`; the bootstrap HTML must never be the returned homepage.
3. Test the assigned `.netlify.app` HTTPS URL on the affected connection and external probes: homepage, Learn, an article, games, scripts/images, rankings, public news/video APIs, missing URL = real 404, and archive/challenge query parameters. Confirm cache/security headers, and no redirects to workers.dev.
4. Add `brainilabgames.com` as the primary Netlify custom domain and `www` as its alias. Use the DNS targets shown by its Pending DNS verification panel. Keep Cloudflare as registrar and authoritative DNS provider; do not move nameservers.
5. Prepare and verify the public certificate. If HTTP verification requires temporary DNS cutover, perform it as a controlled maintenance step, continuously checking TLS and ready to restore the previous Worker domain. Do not bypass certificate warnings or assume TLS is ready before issuance.
6. Remove only the existing apex Worker custom-domain attachment when ready to replace its managed DNS record. The Worker and workers.dev backend stay enabled. Add an unproxied apex flattened CNAME to Netlify's displayed load-balancer target. Replace the existing proxied www A record with the displayed unproxied Netlify CNAME. Preserve both Google verification TXT records. Never use 192.0.2.0 as an unproxied web origin.
7. Recheck both hostnames over ordinary DNS, HTTPS certificate validation, HTTP→HTTPS, www→apex, a signed-in profile, an actual game round and admin access. Check Spain including the affected Movistar connection, plus France, UK and US. Confirm no active service worker pins older URLs. Do not declare completion until ordinary access works.

## DNS snapshot and rollback

Before cutover, the Cloudflare DNS UI contains four records: apex Worker `brainilab-web` proxied/Auto; www A `192.0.2.0` proxied/Auto; two apex Google site-verification TXT records (one Auto, one 1h). Keep a fresh DNS export locally immediately before editing.

Rollback: remove the replacement apex DNS entry, reattach `brainilabgames.com` as a custom domain of the same production Worker, restore the www A `192.0.2.0` proxied/Auto and existing redirect rule, preserve both TXT records. A network-blocked route may still fail for affected users after rollback; rollback restores the previous configuration, not the operator path.

## Cost and limits

Netlify Free currently provides 300 credits/month with a hard limit and no automatic charge. Production deployments cost 15 credits, delivery 20 credits/GB, requests 2 credits/10,000. Exhaustion pauses sites. Deploy only the small entry configuration when it changes; ordinary BrainiLab releases continue at the Worker without consuming another Netlify production deployment. Review usage before reaching the limit. This does not guarantee unlimited free traffic or immunity to all future network blocks.

## Primary references

- https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/potential-isp-blocking/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/dns/proxy-status/enforce-dns-only/
- https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/
- https://docs.netlify.com/manage/routing/redirects/redirect-options/
- https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
