# Homepage budding entry browser evidence — 2026-10-19

This directory is browser evidence for the small, real-backdrop glass entry between Explore the work and GitHub. It is not physical iPhone/iPad certification or owner visual acceptance.

- `local-budding-qa.cjs`: bounded Playwright CLI callback, six widths (320, 393, 640, 641, 768, 1366), first 1.45s of real DOM growth sampled approximately every 50ms, initial/middle/final screenshots at 393/768/1366, native keyboard navigation, reduced motion, pointer focus and settled geometry checks.
- `secondary-budding-qa.cjs`: offscreen suspension, geometry cache after settling, actual Playwright touch input in a separate mobile context, first/second activation behavior.
- The 393px entry/discovery pair is a second action row because all three full-size controls do not fit within the existing narrow hero width. Mother and GitHub stay together; the mother never changes its global position during growth.
- A 44px mother uses a document width of 56→144.47px, pushing GitHub by 88.47px. A 54px mother uses 66→174.58px, pushing GitHub by 108.58px. All tested widths remain free of horizontal overflow or mid-growth wrapping.
- Screenshots are native browser output, not pixel comparisons against a simulated pearl renderer. The homepage applies the library's actual backdrop glass rather than painting a blue/violet environment onto the control.
- Growth recordings observe browser animation callbacks and long tasks in a Windows development session. They are not OS presentation rate, physical input latency or guaranteed device FPS measurements.
- Windows WebKit uses the library's native glass fallback. Default Tab preferences may skip native links; that engine preference is recorded and is not changed in the product.
- Existing Vinext development preload diagnostics are retained in reports. Production diagnostics must be checked separately.

## Process evidence

- `process/process-preview1/`: first prototype captures before the pointer-focus refinement. Six rest checks sampled too soon and observed one pending final geometry update; the later secondary run confirmed settled cache and offscreen suspension.
- `process/process-preview2-stale-vite/`: installed preview2 source contained the focus fix, but the running Vinext/Vite optimized module still served the old field-always-focused branch. Chromium reported six pointer-outline failures; every geometry/layout/rest/keyboard assertion passed. These screenshots are historical process evidence, not validation of the corrected focus source. The exact loaded URL and snippet are in that directory's `stale-cache-note.json`.

## Final verified source

After the owner of the dev server restarted it with a fresh optimized dependency, the browser loaded `@alvenx_liquid-glass.js?v=f0595f01`. Its current field focus branch matches the source: native inputs keep field focus; the custom contour's buttons/links use focus-visible. The stale field-always-focused branch was no longer served.

Top-level captures and JSON reports are now final current-source evidence: **Chromium 129/129**, **WebKit 128/128**, **touch/offscreen/cache 13/13**, total **270/270**. No page errors occurred. Existing development preload messages and the WebKit Tab preference remain explicitly recorded.

The 20 top-level PNGs cover start/middle/full at 393,768,1366 in both engines, a separate mobile touch full state, and a Chromium native keyboard contour. Pointer activation leaves no keyboard contour at every tested width; actual keyboard focus retains the shared path outline. Mother center drift is zero; GitHub displacement equals actual body width increase; all intermediate samples retain the same row without horizontal overflow.

`final-qa-summary.json` contains the final totals, geometry measurements and practical limits. `chromium-local-report.json`, `webkit-local-report.json` and `chromium-secondary-report.json` contain the assertions; raw CLI output preserves development diagnostics. Source hashes are retained in `qa-source-sha256.json`.

This publication copy replaces absolute developer checkout prefixes in the source-hash index with `kit/` and `website/`. Screenshot bytes and recorded source SHA-256 values are unchanged. The reproducible procedure and environment are in `PROTOCOL.md`; the evidence inventory is in `EVIDENCE-MANIFEST.json`.

## Final source review and boundary correction

After the270 normal homepage assertions and screenshots, final source review identified a public-prop boundary case. `BuddingLink` now applies the same finite44–96px clamp to both its diameter prop and responsive CSS measurement; non-finite values use54px. At diameters≤44px the native destination uses14px text, matching the existing homepage's44px case. The actual tested homepage diameters44/54px, their geometry, visual appearance and material are unchanged, so the normal-flow browser evidence remains applicable to those host configurations.

The270 assertions do **not** cover invalid or out-of-range diameter props and must not be cited as that validation. A separate targeted clamp build/test is owned by the release integrator and will be recorded separately. `qa-source-sha256.json` identifies the exact source sampled by the270-run, before this boundary correction; it is not a claim that the later release source has identical bytes.

The short default `explore me!` label is the supported content in this size range; this review does not establish arbitrary long-label fitting. Independent geometry review measured the44px/14px label's Range width at77.328px against an86.016px chamber, leaving4.344px on each side. Its four text-box corners are inside the shared Path2D. Those measurements are independent review findings, not additional assertions silently added to the270 browser total.
