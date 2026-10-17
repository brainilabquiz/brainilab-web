# Portrait redraws during page loading

Repeated startup and cloud events replaced the header portrait even when its generated artwork was unchanged. The profile renderer separately replaced the same header portrait, level portrait, account portrait, main preview and mobile preview. Replacing a decoded image starts a new image element lifecycle; replacing an SVG rebuilds the artwork. A failed custom photo was also retried after every refresh instead of retaining the fallback already shown.

The shared `BrainiProgressUI.setAvatarMarkup` keeps unchanged portrait nodes in place. It remembers only the generated markup and the current container's child references in a WeakMap. An actual photo or illustrated avatar change still replaces the artwork immediately. A change in XP updates header rank classes and title independently. The image error handler can continue to replace a failed photo's source with its existing fallback without a later unchanged refresh retrying that photo. An externally cleared/replaced container is detected and repaired.

No authentication, storage, network request, scoring, progression, navigation, consent or security behavior changes. The first personalization after reading the current player still happens normally; no content is hidden or delayed to conceal loading.

## Reproduction and checks

`tools/test-avatar-render-stability.mjs` uses the real account, progression, artwork and profile renderers with controlled local player/store data. The same sequence of 12 repeated events and three profile renders produced **42 portrait replacements** on base `2ffef06eed741da0df434c9b521753dfc6cd4eec`. With this change it produces **zero replacements** and retains all five portrait nodes.

The regression also checks failed-photo fallback, a real photo change, an XP-only decoration change, equipped custom SVGs, account switch, logout, recovery from an externally cleared container, and unchanged player score/XP/level. Run it with the existing JSDOM dependency:

```powershell
$env:JSDOM_MODULE='C:/Users/PC/Documents/Codex/2026-09-23/posa/work/growth-test-deps/node_modules/jsdom/lib/api.js'
node tools/test-avatar-render-stability.mjs
```

For the repeat-event count against a separate checkout, set `AVATAR_SOURCE_ROOT` to that checkout and pass `--measure-only`.

## Public loading observations, 17 October 2026

Public response measurements from one desktop connection at 09:02–09:05 UTC:

| Resource | Status / redirects | Transferred bytes | Time to first byte | Total transfer time |
| --- | --- | ---: | ---: | ---: |
| `/` | 200 / 0 | 5,110, gzip | 0.416 s | 0.416 s |
| `/games/` | 200 / 0 | 5,038, gzip | 0.448 s | 0.449 s |
| `/profile/` | 200 / 0 | 5,384, gzip | 0.420 s | 0.420 s |
| `site.css` | 200 / 0 | 30,922, gzip | 0.413 s | 0.438 s |
| `mobile.css` | 200 / 0 | 4,519, gzip | 0.622 s | 0.622 s |
| `shell.bundle.js` | 200 / 0 | 58,262, Brotli | 0.456 s | 0.502 s |
| `cloud.bundle.js` | 200 / 0 | 15,886, gzip | 0.196 s | 0.218 s |
| Existing jsDelivr Supabase SDK | 200 / 0 | 55,802, gzip | 0.354 s | 0.357 s |

These independent requests are not browser paint timings, Core Web Vitals or a representative performance sample. They cannot be added into a page-load duration. Versioned site CSS/JS responses already have `public,max-age=31536000,immutable`. The HTML remains revalidated or short-lived. No redirect loop or sustained slow server response was reproduced.

The page loads render-blocking CSS and ordered deferred scripts. The existing remote SDK is before the cloud and page scripts, so an unusually slow SDK response could postpone those later scripts and DOMContentLoaded. This dependency order is documented in the [HTML script processing model](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer). Its request was quick in this observation, so this patch does not change the dependency or authentication startup on speculation.

The Breaking News pill already has static styling in `site.css`; its equivalent runtime style is redundant but was not demonstrated to cause a layout flash. No web fonts were found in the current stylesheet imports, so this audit does not attribute the report to font swapping. Other page-wide flicker and physical-device paint behavior still require visual observation; the quantified regression here concerns unnecessary portrait replacement.
