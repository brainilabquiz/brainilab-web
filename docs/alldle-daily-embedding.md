# Daily inside Alldle

The public directory loads /daily-quiz/ in an iframe. The user explicitly authorized this integration on 11 October 2026, keeping the rest of the website protected.

Only Daily and the ten game pages in its rotation have an enforced frame-ancestors policy allowing https://alldle.net and https://www.alldle.net. All other pages retain X-Frame-Options: DENY. No wildcard hosts, arbitrary subdomains, self-framing or HTTP ancestors are allowed. Modern browsers give enforced frame-ancestors precedence over X-Frame-Options; DENY remains a fail-closed fallback for older browsers.

Rules cover the directory URL, trailing slash and index.html aliases. Internal Daily links stay in the directory frame. Other BrainiLab links open a separate tab while embedded, so protected profiles, libraries and account pages are never framed. Direct visits retain the normal internal-navigation behavior.

This changes document framing only. Database authorization, admin access, scores, consent, authentication and payment settings are unchanged. A browser may partition account storage in a third-party frame; visitors can still play without an account or open the official site for their account. Do not infer visits or conversions from technical test rounds.

When the Daily rotation changes, update the exact route exceptions together with the link-policy allowlist. The header test checks the configured rotation and its page destinations, protected routes and both URL aliases.

Verify the deployed headers through the public domain (including its fixed Netlify-to-Worker proxy) and then open the existing Alldle listing. Start a game and check that a question can be answered and the next question loads without leaving Alldle. Check an unrelated-origin iframe is still blocked. Never remove framing protection globally to fix a directory.

References:
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- https://w3c.github.io/webappsec-csp/#frame-ancestors-and-frame-options
- https://docs.netlify.com/manage/routing/headers/
