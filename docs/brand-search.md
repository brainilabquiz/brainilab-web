# BrainiLab brand identity

BrainiLab is the preferred public name. Use this spelling consistently; do not replace it with the generic phrase “brain games”. The canonical website is https://brainilabgames.com/.

The existing home and About JSON-LD graph keeps one WebSite entity and one Organization entity, with stable identifiers. WebSite alternatives, in preference order, are BrainiLab Games, Braini Lab and brainilabgames.com. The lowercase domain is a fallback site name, not a separate product. The Organisation alternatives are BrainiLab Games and Braini Lab. Retain the same official social profiles already linked from the website.

The homepage title leads with BrainiLab. Open Graph, Twitter and WebPage titles match it. Keep descriptions specific to each page and retain the short, friendly headline. A single brief introduction identifies BrainiLab in text; keep the mobile game-first order and existing uncluttered layout.

## Scope and limits

Google site-name selection and query spelling correction are separate systems. These signals make the brand identity clearer; they do not disable autocorrection, guarantee a chosen site name or guarantee rankings. Do not create keyword-stuffed pages, repeat the domain unnaturally, invent social profiles or mass-request indexing.

Before changing canonical URLs or redirects, check the actual public response and preserve the existing HTTPS apex destination. Do not change DNS or hosting for a brand-copy task. A home page already indexed by Google is not evidence of a missing-index problem.

Official guidance checked 18 October 2026:

- https://developers.google.com/search/docs/appearance/site-names
- https://developers.google.com/search/docs/appearance/title-link

After deployment, verify the actual public titles and graph, one WebSite entity, canonical, crawlability, home and About rendering, and the unchanged mobile game-first order. If requesting a recrawl for changed content, submit once after publication; processing can take days or weeks. Check spelling-corrected and literal branded searches separately before describing an outcome.

## Shared page identity

The static build and CMS Learn/Academy renderers use lib/brand-identity.js. It supplies one og:site_name tag and the same publisher identity used on Home/About. It does not add visible text, change canonical or noindex directives, or add a WebSite entity to every page. Page titles retain the page subject; a title that already contains BrainiLab is not given a second brand suffix. Academy supplies its own current social title and description rather than inheriting article metadata.

The build runs tools/test-brand-identity.mjs to protect repeated rendering, publisher agreement and the unchanged body, canonical, robots and unrelated schema. When reviewing the catalogue, distinguish tracked HTML templates from all pages generated from current content. Do not describe a missing social site-name tag as evidence of an indexing problem or as the proven cause of query autocorrection.
