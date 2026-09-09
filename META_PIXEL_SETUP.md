# Meta Pixel — BrainiLab 41.10.0

Pixel: 2674204419702933. Source: assets/js/meta-pixel.js, included in shell.bundle.js.

Events: PageView and custom GameCompleted (game_id and mode only). A completed local scored game fires once; cloud retries and practice do not fire. Historical events are not replayed after consent. Automatic configuration, advanced matching and Meta-enabled CAPI are not enabled.

The SDK is not loaded until explicit Meta marketing consent. The local browser preference expires after 180 days. Manage privacy opens the controls again. Rejecting revokes future events and removes _fbp/_fbc first-party cookies. Google consent remains separately controlled. Pixel loading is restricted to brainilabgames.com/www; admin, reset-password, OAuth callback and local/preview pages are excluded.

Validation: 18 DOM-based consent/event tests in tools/test-meta-pixel.mjs (requires jsdom or JSDOM_MODULE pointing to jsdom/lib/api.js), existing QA regression suite, local visual check. Pixel account ownership and received events must be checked in Meta Events Manager when the owner is signed in.

Reference: Meta's official web template https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel (consent, autoConfig and trackSingle commands).
