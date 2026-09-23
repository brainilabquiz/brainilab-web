# Homepage YouTube card

The public channel is `UCy35EdjSpdYufOLJBybevsA`, confirmed from the official
`@BrainiLab` channel links. The homepage is restricted to the public General Knowledge
playlist `PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4` requested by the owner.
`worker.js` reads that playlist Atom feed without an API key and chooses the newest
publication date among its public feed entries (YouTube returns a limited recent window).
New videos must be public and added to this playlist to appear. The playlist is currently
sorted by publication date, newest first. Unrelated channel uploads cannot replace it. The frontend uses textContent for titles,
validated video IDs and fixed YouTube URLs; it never inserts feed HTML.

The cache is checked on visits, refreshed after 15 minutes, and retained up to 7 days
for upstream outages (Cloudflare can evict cache entries earlier). YouTube can delay
feed updates. Stale data is labelled “General Knowledge on YouTube”; without data the
card remains a working playlist link. This is not an instant upload webhook.

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

The cache key includes the playlist ID, so old channel-wide results cannot leak into
this card. Video links keep the playlist context for continued viewing.
