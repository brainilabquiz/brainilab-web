# Odd One Out stylesheet delivery

The mobile PageSpeed sample from 24 October 2026 reported performance 91,
LCP 2,925 ms and CLS 0 for `/games/odd-one-out/`, with an estimated 850 ms
of render-blocking request savings. This is one laboratory observation, not
field performance, a current search ranking or evidence of more players.

The existing stylesheet bundler combines the four complete page-specific
sheets in their original order: post-game, continuity, visual-system and
game-entry. Site and mobile keep their shared cache URLs. Source HTML has
six stylesheet links; the transformed page has three. The separate seasonal
stylesheet added by the Worker is retained. Bundle cache versions follow the
published bytes.

No CSS rules are removed, deferred or swapped after rendering. The game body,
practice example, source CSS, scripts, consent and analytics delivery, score
calculations and stored progress are unchanged. In particular, this change
does not include the separate consent-delivery proposal.

The existing build runs route and cascade-barrier tests. Deployment checks
must also compare the complete CSS syntax trees, public page content and
script references, the published bundle hash, and the actual 390/1280px
layout. Retain both before and after PageSpeed samples even when the later
score is lower. A change in one sample does not isolate causality or prove
an increase in organic visits or completed games.
