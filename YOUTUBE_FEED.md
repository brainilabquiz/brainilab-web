# Homepage videos — current behaviour (25 October 2026)

Both homepage cards now follow their official channel's newest public long video (more than 180 seconds): BrainiLab Knowledge (`UCcqUq1aWcDoKyGT9QYCPqIA`) and BrainiLab (`UCy35EdjSpdYufOLJBybevsA`). The owner requested the latest uploads on 24 October; the BrainiLab homepage card is therefore no longer limited to the older General Knowledge playlist. `/api/latest-video?channel=knowledge` and `?channel=brainilab` accept these two fixed selections only. The legacy playlist endpoint is retained for existing related-game integrations.

The homepage renders validated cached video records into its initial HTML, while refreshing in the background. It does not wait for YouTube before showing the Daily. The client also refreshes each card independently on a visit. The existing 15-minute freshness window, short failure backoff and bounded stale fallback remain. The verified 23 October videos are included as the initial fallback; no new credential or billing change is required. This is automatic visit-driven refresh, not an instant upload webhook.

Only the two allowlisted channels and public videos longer than 180 seconds are eligible. The server checks the actual `videos.list` duration, owner, privacy and publication date; titles or hashtags are not used to guess whether a video is a Short. Unknown duration and live/upcoming broadcasts are rejected. The browser and initial HTML independently reject short or unverified records. A versioned cache discards previous unfiltered entries. Atom feeds lack duration, so the homepage keeps a verified long-video fallback if the API cannot verify a replacement. This conservative rule also excludes horizontal clips of three minutes or less. Official references: https://developers.google.com/youtube/v3/docs/videos and https://support.google.com/youtube/answer/15424877 . Actual video publication dates determine recency. Titles are escaped, future/foreign/malformed data is rejected, and each video opens directly without a playlist parameter. Cache outages retain a useful existing card. No visitor cookies or account data are sent to YouTube by these requests.

Validation: `tools/test-home-video-freshness.mjs`, `tools/test-knowledge-video.mjs`, `tools/test-latest-video.mjs`, `tools/test-video-card.mjs`, plus the complete review suite. Check both public API selections, initial HTML and rendered cards after deployment.

## Historical playlist integration

# Homepage YouTube card

The public channel is `UCy35EdjSpdYufOLJBybevsA`, confirmed from the official
`@BrainiLab` channel links. The homepage is restricted to the public General Knowledge
playlist `PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4` requested by the owner.
With the `YOUTUBE_API_KEY` Worker secret configured, `lib/youtube-playlist.js` reads
YouTube Data API v3 `playlistItems.list`. It scans every page (50 items per page,
maximum 10 pages within one 7-second deadline), filters public videos owned by this
channel, and chooses the newest `contentDetails.videoPublishedAt`. Playlist order
and `snippet.publishedAt` (date added) do not determine recency. A partial scan,
unexpected playlist or invalid pagination fails safely instead of claiming an old
item is the latest. A successful empty playlist clears the previous item.

Without the secret, the Worker retains the existing Atom feed integration. This
feed returned HTTP 404 on 24 and 25 September 2026, so it is not a reliable source
until YouTube restores it. The API integration is implemented and tested with
fixtures; activation and real API verification require the secret below.

New videos must be public and added to this playlist to appear. Unrelated channel
uploads cannot replace it. The frontend uses textContent, validated video IDs and
fixed YouTube URLs; it never inserts upstream HTML.

The cache is checked on visits, refreshed after 15 minutes, and retained up to 7 days
for upstream outages (Cloudflare can evict cache entries earlier). YouTube can delay
feed updates. Failures back off for 60 seconds per cache location. Original success
time bounds stale retention even across repeated failures. Stale/unavailable data
leaves the frontend as a useful playlist link, without an old thumbnail or title.
This is not an instant upload webhook. The cache is per Cloudflare location, so the
refresh interval is not a global API quota cap; monitor actual API usage.

Thumbnail requests are proxied through a fixed i.ytimg.com host. No embedded player,
YouTube scripts, API keys or visitor cookies are sent to YouTube by this feature.
The Worker also serves the homepage, Learn and sitemap using the published CMS.
Worker requests are subject to the account's normal Workers quota and pricing.

Instagram and TikTok are direct official profile links, verified from the YouTube
channel description. They do not claim to show automatically fetched posts.
Future live feeds for those platforms require a separate official integration.

Validation: `node tools/test-latest-video.mjs` and `tools/test-video-card.mjs` (with
JSDOM_MODULE set); verify /api/latest-video and its
thumbnail on the Cloudflare preview before merging. `python -m http.server` serves
the static fallback, not the Worker API. Use Wrangler for local Worker execution.

The cache key includes playlist ID, source and version, never the secret. Switching
to the API cannot reuse an old feed result. Video links keep playlist context.

## Activation (owner confirmation required for a new credential)

1. In a BrainiLab Google Cloud project, enable YouTube Data API v3. No OAuth access
   to private channel data is needed; do not alter unrelated OAuth clients.
2. Create a dedicated server API key, restricted to **YouTube Data API v3**. Keep
   billing and unrelated services unchanged. A browser referrer restriction is
   unsuitable for Worker server requests; apply an IP restriction only if fixed
   outbound IPs actually exist. Set appropriate project quota limits and alerts.
3. Save it as an encrypted Worker secret named `YOUTUBE_API_KEY` in Cloudflare for
   `brainilab-web`, using the dashboard or `wrangler secret put YOUTUBE_API_KEY`.
   Never put it in Git, `wrangler.jsonc`, a public environment variable or browser JS.
4. Verify the endpoint returns `source: youtube-api`, `stale: false`, correct public
   title/ID and playlist. Verify the homepage and thumbnail. No actual key should
   be copied into test output, error logs or documentation.
5. Removing the secret restores the feed/playlist fallback without exposing it.

Official references: https://developers.google.com/youtube/v3/docs/playlistItems/list
and https://developers.google.com/youtube/v3/docs/playlistItems.
