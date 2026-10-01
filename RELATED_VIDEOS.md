# Related BrainiLab videos

In Admin → Articles → open an article → Related video, paste a YouTube link and select **Load video**. The server verifies the existing admin session (owner/editor and required MFA), then checks that the video is a published public upload on the fixed BrainiLab channel. The title and same-origin thumbnail are loaded automatically. Save draft, preview or publish using the article's normal controls. Remove video and publish to withdraw it.

The optional **Also suggest after the related game** checkbox links the same video to the article's selected game. If several published articles nominate a video for that game, the latest updated article wins, with a stable slug tie-break. Drafts never enter the public lookup. General Knowledge otherwise uses the existing automatic latest-video playlist feed; unrelated games have no default video.

Public visitors see one compact link after the article's game invitation, or below the result actions. There is no iframe, autoplay or direct third-party thumbnail request from the browser. `/api/youtube-thumbnail/:id` remains the image proxy. Missing images leave the play tile; lookup failures keep the optional result slot hidden. Game saving and scores do not wait for it. Results reuse an in-page lookup per game; new page loads pick up publication changes through the existing 60-second publication cache.

`/api/admin/video-info?id=` is authenticated, no-store, and accepts only a single YouTube video identifier. The existing `YOUTUBE_API_KEY` secret is used server-side only; it never reaches HTML, browser code or responses. No database migration, privilege change or new credential is needed: the optional `document.video` field uses the existing revisioned JSON publication workflow.

With statistics consent, `video_click` records only a validated video ID and one of `home`, `article`, `post_game`. It measures outbound clicks, not YouTube views. Existing social-click totals remain available. No event is sent without consent or from the admin.

Validation: `node tools/test-related-video.mjs`, `node tools/test-site-analytics.mjs`, existing article editor, result, playlist and learning-journey tests; set `JSDOM_MODULE` to the installed jsdom entry point. Run the normal build before tests that read bundles. `tools/build.mjs` bundles the shared video helper into the shell using an idempotent marker.
