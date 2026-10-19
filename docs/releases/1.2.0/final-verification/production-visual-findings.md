# Production showcase visual and interaction review — 2026-10-19

The local production candidate passed 85 bounded assertions in Chromium and 85 in the Windows WebKit port. Both engines used 320, 393, 768, 1180 and 1366 CSS-pixel viewports, with a fresh storage context per size. This is browser regression evidence, not physical iPhone, iPad, Retina Safari or Combo Touch certification.

## Results

- No document horizontal overflow across all ten engine/viewport cases.
- Canonical header: top 14 px, wordmark 160 px, minimum height 70 px, padding 12/18/12/22 px and 26 px corners. At narrow widths the menu stays in one row; Escape restores menu focus and outside/section selection closes it.
- Hero uses the blue/indigo/violet gradient as native text. Layered page backgrounds differ visibly on the blue left and violet right, without cropping headline descenders.
- The pearl, connection and content chamber remain horizontal. At narrow phone widths the horizontal overview has contained native text below it; tablet and desktop retain the integrated foreground in the chamber. No internal horizontal scroll or reported canvas failure.
- Progress initializes to 50 with a separate percent unit and accessible `50 %` value text. Numeric entry clamps 999 to 100 and -4 to 0; 34.678 commits as 35; Escape restores the committed value. Arrow keys, Home and End use the percent range. Continuous drag remains separate from display precision.
- Mouse range tap and 12-step drag, switch click and Space, free-lens mouse drag, live shared-SVG word update, and bilingual native message input/Enter submission pass at 393 and 1180 px.
- Actual persisted `interactionStrength: 3.15`, the edited message, Progress 71, URL and history remain unchanged by Home click, Enter and Space. System reduced motion makes the Home return immediate.
- Seven parameter controls stay within their panel at every size. No JavaScript page errors were recorded.
- Explicit `?optics=native` and `?optics=flat` are honored by all sampled glass hosts in both engines; they opt out of controlled-scene refraction.

The native Chromium CDP touch follow-up passed 12 real browser gesture streams at 393 and 1180 px: mother, neck and chamber holds, tablet heading-glyph contact, shape-to-background capture continuation, background-to-shape native page pan and phone copy-area page pan. Inside contacts deformed the shape while holding page scroll; outside contacts scrolled normally without activating the shape.

## Visual inspection

Screenshots were opened and inspected for phone 320/393 hero and menu, phone volume and components, phone parameters, tablet 768 volume, 1180 components and desktop 1366 hero. These show a legible gradient headline, a horizontal pearl family, contained typography and clear control geometry. Full-page and targeted screenshots are retained for every tested engine/width.

## Test development notes

Initial harness failures came from clicking the headline while the expanded menu covered it, asserting React range state before presentation, and reusing range coordinates after scrolling to the parameter panel. The final harness uses a visible outside target, waits for actual input state and centers controls before collecting pointer coordinates. One persistence assertion initially named the wrong storage property; the final test confirms the nondefault stored `interactionStrength` value before testing preservation. No runtime change was needed for these harness corrections.

The iPad grey tap-overlay fix has separate tap-highlight evidence. This review does not claim to have reproduced the OS-specific overlay on a physical iPad, measured physical first-paint latency or used a physical Combo Touch trackpad.

## Evidence

- `production-chromium-qa.json` and `production-webkit-qa.json`: completed structured results, 85 assertions each.
- `production-native-touch.json`: 12 native CDP touch gesture streams.
- `production-optics-modes-chromium.json` and `production-optics-modes-webkit.json`: explicit native/flat mode checks.
- `production-<engine>-<width>-*.png`: hero, menu when applicable, horizontal volume, refraction component, expanded parameters and full page.
- Reusable browser callback: `scripts/production-showcase-qa.cjs` in the kit, invoked through Playwright CLI from the repository parent.
