# Measured mobile stylesheet delivery

On 23 October 2026, mobile PageSpeed samples reported 94 for Math Rush, 93 for
Sequence and 99 for the sky-blue article. All reported render-blocking CSS.
These are lab observations without CrUX data, not field performance guarantees.

The existing page stylesheet bundler now also handles Math Rush, Sequence and
the shared Learn library template. All page-specific sheets remain complete and
in their original order. Site and mobile sheets keep their shared cache URLs.
There is no async CSS swap, viewport-based rule removal or design change.

The Learn template retains `learning-paths.css` as a separate cascade barrier.
CMS article, library and Academy renderers extract its exact published URL and
the matching script URL. Folding it into a page bundle would break that lookup
and could add a stale fallback. Tests cover this integration explicitly. Runtime
pages inherit the common Learn bundle while retaining their additional Academy
styles; individual static article bundles are not generated.

The build runs the stylesheet and CMS cache tests. Post-deployment checks must
compare public content, canonical URLs, CSS bytes and mobile rendering and retain
both before and after PageSpeed samples. The Worker-added Halloween stylesheet
stays separate and unchanged. Cover files, reading text, metadata, consent,
tracking, gameplay, XP, rankings, scores and stored progress are unchanged.
