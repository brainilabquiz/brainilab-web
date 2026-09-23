# Homepage YouTube card

The public channel is `UCy35EdjSpdYufOLJBybevsA`, confirmed from the official
`@BrainiLab` channel links. `worker.js` reads its public Atom feed without an API key.
The latest publication includes Shorts. The frontend uses textContent for titles,
validated video IDs and fixed YouTube URLs; it never inserts feed HTML.

The cache is checked on visits, refreshed after 15 minutes, and retained up to 7 days
for upstream outages (Cloudflare can evict cache entries earlier). YouTube can delay
feed updates. Stale data is labelled “From our YouTube channel”; without data the
card remains a working channel link. This is not an instant upload webhook.

Thumbnail requests are proxied through a fixed i.ytimg.com host. No embedded player,
YouTube scripts, API keys or visitor cookies are sent to YouTube by this feature.
Only /api/* runs the Worker before assets. All other pages remain static.
Worker requests are subject to the account's normal Workers quota and pricing.

Instagram and TikTok are direct official profile links, verified from the YouTube
channel description. They do not claim to show automatically fetched posts.
Future live feeds for those platforms require a separate official integration.

Validation: `node tools/test-latest-video.mjs`; verify /api/latest-video and its
thumbnail on the Cloudflare preview before merging. `python -m http.server` serves
the static fallback, not the Worker API. Use Wrangler for local Worker execution.
