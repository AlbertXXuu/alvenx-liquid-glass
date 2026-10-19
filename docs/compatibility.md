# Browser compatibility and optical tiers

The kit retains one blue/indigo/violet contour and interaction family across its optical tiers. Native DOM text, actions, keyboard input, endpoint geometry, bounded overdrag and release remain independent of backdrop-filter support. The large volume remains an analytic 2.5D WebGL scene; it is not the same renderer as the small controls.

## Tier selection

`useGlassSettings({ optics: 'auto' })` is the default. `GlassClock` also accepts an `optics` constructor option. The resolved tier is visible as `data-optical-mode` on each `.liquid-unit`.

| Option | Rendering contract |
| --- | --- |
| `auto` | Conservative policy: SVG backdrop displacement on Chromium outside iOS when the declaration is accepted; otherwise native backdrop blur/saturation when available, then flat glass. This policy is not a universal rendered-capability detector. |
| `svg` | Explicit host override for actual SVG background displacement. Select only after testing the target engine/version. CSS declaration acceptance alone does not establish correct pixels. |
| `native` | Native backdrop blur/saturation without SVG backdrop references. Current contour, rim, focus, interaction deformation and clear text remain. It does not reproduce refractive displacement or spatial progressive blur. |
| `flat` | Contour, tint, edge light, shadow and interaction states without backdrop sampling. Keeps content legible when background filtering is unavailable or intentionally disabled. |

Pass the choice through the hook rather than rewriting individual controls. The showcase accepts `?optics=native`, `?optics=flat` and `?optics=svg` for review. These query parameters are showcase conveniences, not a library-wide URL contract.

Automatic selection intentionally avoids an SVG backdrop URL on unverified non-Chromium engines. User-agent identity is a conservative routing hint, not a security boundary or proof of rendering support. A new engine can be verified and opted in explicitly. The kit does not take a screenshot or read page pixels at runtime to detect support; that would be intrusive, unreliable and unnecessary for normal UI rendering.

## Why `CSS.supports()` is insufficient

The WebKit issue for `backdrop-filter: url(...)` with `feDisplacementMap` remained **NEW** when checked on **2026-10-16**. The linked discussion contains implementation work, but it does not establish that the feature is present in a shipped Safari release. [WebKit issue 245510](https://bugs.webkit.org/show_bug.cgi?id=245510)

`CSS.supports()` checks CSS feature/declaration support; it does not compare rendered output. [MDN API reference](https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports_static)

The executable compatibility callback therefore records declaration acceptance separately from a raster probe. The probe renders a blue/violet striped backdrop, captures it without a filter, applies a constant horizontal SVG displacement, then compares a central 9,600-pixel region. Chrome is the positive control. This small fixture establishes only whether that known displacement affects those pixels in the tested environment; it is not certification of every SVG primitive or every page's backdrop-root structure.

## Local coverage and evidence

The local host is **Windows**, with Playwright-managed test engines. The following raster and functional runs were actually completed on 2026-10-16:

| Engine | `CSS.supports(backdrop-filter: url(...))` | Displaced sampled pixels | Native-blur changed pixels | Automatic tier / functional suite |
| --- | --- | --- | --- | --- |
| Chrome 155.0.8059.40 | true | 9,600 / 9,600 | 1,920 / 9,600 | SVG / passed |
| Firefox 153.0 | true | 0 / 9,600 | 0 / 9,600 | Native / passed |
| Playwright WebKit 26.5 | true | 0 / 9,600 | 0 / 9,600 | Native / passed |

The native-blur column is a second raster comparison using `blur(3px)` on the same explicit striped DOM backdrop. It changed visible pixels in Chrome, but not in these local Firefox/WebKit runs, even though those engines accepted the declaration. Their **functional compatibility passed**, and their fallback screenshots retain the C2 contour, rim and readable text. These results do **not** establish equivalent native blur, refraction or material fidelity. Native blur on those target platforms remains a visual acceptance item; `flat` remains an explicit option. The runtime does not pretend it can infer successful raster output from declaration support.

Engine names above are actual test engine versions. Playwright WebKit on Windows uses a Safari-like user agent, but **is not the Safari application on macOS or iOS**. Playwright uses a patched WebKit build, and its documentation distinguishes it from branded Safari. [Playwright browser documentation](https://playwright.dev/docs/browsers#webkit)

The full executable callback is `scripts/compatibility-qa.cjs`. All three desktop engines passed five numeric cases (range clamping, precision, invalid input, fullwidth normalization and Escape), native text, actions, switch keyboard, slider keyboard and pointer overdrag/release, system reduced motion, explicit native/flat tiers and a 390px viewport, with zero page errors. Successful overdrag samples were approximately −9.9 to −10.2px and returned to zero. Each fallback also checks that its edge paths agree and that a path clips the hit area. These are technical behavior and consistency checks, not a new owner visual approval.

`scripts/compatibility-mobile-qa.cjs` additionally created a **Windows WebKit synthetic iPhone context**, configured as 390×844, DPR 3, `isMobile: true`, `hasTouch: true` and an iPhone user agent. Playwright `touchscreen.tap()` changed the switch and slider; synthetic numeric editing normalized `0.3333` to `0.333`; there was no horizontal page overflow or page error. Automatic optics selected `native`. This engine reported `navigator.maxTouchPoints` as 0 despite the context option, another reason not to treat the synthetic touch API as a physical-device result. Continuous physical touch drag and the OS software keyboard were not tested.

Raw JSON and seven screenshots are retained in the parent project's `output/playwright/compatibility-2026-10-16/`, with a portable copy in the source delivery at `docs/validation/compatibility-1.1.0/`. The four result files are `chrome.json`, `firefox.json`, `webkit.json` and `webkit-mobile.json`. Native/flat stage screenshots were visually inspected for clear text and continuous contours; they do not prove that an unsupported optical effect suddenly became available.

From the kit directory, with the showcase server already running:

```powershell
New-Item -ItemType Directory -Force ..\output\playwright\compatibility-2026-10-16 | Out-Null
playwright-cli -s=compat-chrome open http://127.0.0.1:5174/ --browser=chrome
playwright-cli -s=compat-chrome run-code --filename=scripts/compatibility-qa.cjs
playwright-cli -s=compat-chrome close

playwright-cli -s=compat-firefox open http://127.0.0.1:5174/ --browser=firefox
playwright-cli -s=compat-firefox run-code --filename=scripts/compatibility-qa.cjs
playwright-cli -s=compat-firefox close

playwright-cli -s=compat-webkit open http://127.0.0.1:5174/ --browser=webkit
playwright-cli -s=compat-webkit run-code --filename=scripts/compatibility-qa.cjs
playwright-cli -s=compat-webkit run-code --filename=scripts/compatibility-mobile-qa.cjs
playwright-cli -s=compat-webkit close
```

`playwright-cli` is a verification tool, not a runtime dependency of the kit. A production-build URL can replace the development URL; the callback uses the current page's origin. Do not run multiple benchmark browsers simultaneously when collecting CPU/memory comparisons.

## Still requires physical-device acceptance

### 2026-10-19 input and studio review (not an accepted release)

The owner supplied physical iPad screenshots showing text selection during a lens drag and rectangular paint behind range lenses, and reported that the first interaction stalls on iPhone 15 Pro and iPad Air M4 (2026), including a Combo Touch trackpad drag failure. These reports supersede any inference that earlier viewport/tap checks established mobile acceptance.

The review separates native range semantics from platform paint, defines primary-pointer ownership and vertical-scroll intent, prevents selection only on the movable lens, coalesces setting persistence, and allows new clock work at the next browser frame. The owner rejected R1's portrait composition. R2 preserves the original horizontal geometry at every width: narrow containers show the form above a full-width content panel, while tablet/desktop containers retain integrated content. One foreground DOM survives breakpoint changes with its focus and drafts. The rotating blue-violet studio environment remains opt-in; both `responsive` and `studioMotion` default off for library consumers. The [versioned review ledger](reviews/2026-10-19/README.md) distinguishes rejected, self-reviewed and owner-pending states. No Apple rendering equivalence or universal DOM refraction is claimed.

Windows Chrome 155, Edge 155 and Playwright WebKit 26.5 checks exercise mouse/keyboard/lens selection, contour hit testing and motion toggles. Chromium native touch checks cover vertical scrolling from controls, second-contact ownership, continuous endpoint overdrag/re-grab and shape gestures. The native range stays in the accessibility tree; its platform paint is transparent, with contour focus feedback supplied by the glass shell. Arbitrary-page SVG backdrop displacement remains unavailable in the conservative iOS path.

Physical Combo Touch, first-activation latency, Safari compositor artifacts and software-keyboard behavior still require the owner's device review. Windows cold/warm tests did not consistently reproduce the reported first-click stall. A Windows WebKit cold drag also required a longer wait than the warm operation, so functional pointer tests must not be described as proof that startup jank has been eliminated. Evidence for this review is under the workspace's `output/playwright/*2026-10-19/`; it does not replace the versioned release measurements above.

- Safari on a supported macOS device, including actual WebGL/backdrop composition and font rendering.
- Physical iPhone/iPad Safari, real touch capture and drag/overdrag/re-grab behavior, viewport changes and software keyboard.
- VoiceOver and other assistive technologies with the actual target platform and browser.
- Physical high-density screens, browser zoom and thermal/battery measurements on intended devices.

Mobile emulation can exercise viewport, user agent and synthetic touch events. It cannot reproduce the device GPU driver, Safari's platform compositor, thermal limits, battery use or physical touch ergonomics. No local desktop test should be described as a physical iOS/Safari pass.
