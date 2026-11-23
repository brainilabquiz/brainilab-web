# First-response consent on measured entries

The 23 October Math Rush mobile trace identified the optional-cookie paragraph as
LCP, appearing after about 2.3 seconds. The CSS-only deployment retained its lower
lab samples; fewer stylesheet requests did not establish a global speed gain.

Math Rush, Sequence and the shared Learn template now reuse the homepage's exact
first-response prompt, local choice gate and compiled consent controller. The
controller runs before main markup and deferred account/game SDKs. Its external
copy is removed so there is one controller. Saved choices and account exclusion
remain owned by the unchanged controller; no choices are made for the visitor.

The existing home-only wrappers retain their behavior. Unmeasured games, profile,
privacy settings and game engines are unchanged. This does not change the prompt
text, consent expiry, analytics policy, tracking events, XP, scores or progress.

The build checks delivery structure and boundaries. The separate browser-state
test uses the existing JSDOM test runtime to check ten real privacy states per
entry, including no choice, rejection, expired/future/malformed choices and a
saved account awaiting its inclusion/exclusion decision. Retain every before and
after PageSpeed sample; a lab score is not field data or search traffic.
