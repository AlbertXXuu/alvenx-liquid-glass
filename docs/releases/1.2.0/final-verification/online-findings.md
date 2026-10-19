# Production verification — 2026-10-19

URL: https://alvenx.com/ui/

Deployed source: `9539291f27b39b596d1a92f52fc7462f7f76ad1f`, source tag `v1.2.0`, kit version `1.2.0`. The parent deployment receipt identifies Worker version `7078b93f-2618-47f3-a17d-eff45efe1d1a`.

Fresh touch-capable browser contexts checked 393×852 and 1180×820 CSS pixels in Chromium 155.0.8059.84 and Windows Playwright WebKit 26.5. Chromium passed 36 bounded assertions and WebKit passed 30. These online checks supplement the broader local 170-assertion review rather than repeating it.

## Passed online

- HTTP 200, exact source commit and kit version metadata, correct title and canonical URL. Production has no `noindex` meta/header. The historical R3 page still returns 200 and retains `noindex`.
- Every first-party entry script and stylesheet uses `/ui/releases/1.2.0/`. Cloudflare's existing external analytics beacon is recorded separately and is not a kit asset.
- No horizontal overflow; the canonical header retains its position, minimum height and 160 px wordmark. The phone navigation opens and Escape closes it.
- Native gradient title and layered blue/violet backgrounds load correctly. Horizontal mother/connection/chamber volume remains intact, without internal overflow or a reported canvas failure.
- Progress initializes at 50 with a percent unit and an accessible percent value. Pointer clicking and a ten-step mouse drag update the value continuously. Native touch taps change the switch state.
- Live bilingual sample text updates the canonical SVG source. The native preview field accepts bilingual text and submits with Enter.
- All Chromium-sampled kit links, fields and buttons inherit a transparent tap highlight. Windows WebKit does not expose the iOS-specific tap property; the physical iPad overlay still requires owner verification.
- Four Chromium native CDP gesture streams demonstrate shape ownership for inside contact and normal page scrolling for background contact at the two tested widths.
- Across all four contexts: zero JavaScript page errors, failed requests, HTTP errors, console errors and recorded Content Security Policy violations.

## Screenshot inspection

Hero, component and horizontal-volume captures are retained for both engines at both widths: `online-<engine>-<width>-<section>.png`.

The reviewer opened the 393 px Chromium hero, 1180 px Chromium component section, 393 px WebKit component section and 1180 px WebKit horizontal volume. No new visual defect was found. The WebKit component capture includes the authored blue keyboard focus ring on the navigation menu after Escape; this is expected accessible focus, distinct from the iPad native grey tap overlay.

## Boundaries

This is online Windows Chromium/WebKit verification. It does not certify physical iOS Safari, Retina rendering, physical first-click latency or a physical Combo Touch trackpad. The owner's iPhone/iPad feedback remains the physical-device acceptance step. No source files changed during online verification.

Structured results: `online-chromium-qa.json`, `online-webkit-qa.json`. Callback: `online-showcase-qa.cjs`.
