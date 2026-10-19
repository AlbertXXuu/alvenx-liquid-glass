# Browser compatibility and optical tiers

The kit retains one blue/indigo/violet contour and interaction family across its optical tiers. Native DOM text, actions, keyboard input, endpoint geometry, bounded overdrag and release remain independent of backdrop-filter support. The large volume remains an analytic 2.5D WebGL scene; it is not the same renderer as the small controls.

The current 1.2.0 showcase uses opt-in **explicit registered scenes** for its refraction demonstration. The tier policy below still governs arbitrary browser-backdrop rendering; a shared scene does not change that policy or capture arbitrary DOM pixels. The [1.2.0 release record](releases/1.2.0/README.md) separates the current publication from the historical engine results below.

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

## Current 1.2.0 input and optical contract (2026-10-19)

`ControlledScene` / `ControlledSource` let a host supply one SVG source for both the visible scene and its displaced image inside a glass lens. The current showcase uses this path for the editable word, source line and controls. It provides displacement in the explicit source without relying on a browser's SVG backdrop-filter implementation. Native fields and text outside the lens stay outside the optical filter. A host must register its scene; arbitrary content behind the component does not automatically become that source.

The reusable `.alvenx-design` scope now sets `-webkit-tap-highlight-color: transparent`. Apple's Safari CSS reference describes the translucent platform overlay shown on tapped interactive elements, and specifies zero alpha to suppress it. The owner's iPad screenshots show a grey pill matching the switch hit area and a grey rectangle matching the native range area; this shape and tap-only timing support identifying that overlay as the cause. [Apple Safari CSS Reference](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html)

The change inherits only within the kit's scope. It retains native hit targets, touch-action, authored pressure/deformation, contour keyboard focus, numeric editing and text selection. Targeted local Chrome tests found a zero-alpha tap color on all sampled kit targets, while a button outside the kit retained the platform default. Local Chrome and Windows Playwright WebKit tests retained touch taps, mouse drags, Tab/ArrowRight focus feedback and Latin/CJK field selection at 393px and 1180px widths, with no page errors in those cases. These are the tap-highlight change's targeted checks, not a complete certification of the later final showcase build.

Windows Playwright WebKit does not expose this iOS-specific CSS property: the declaration probe is false and its computed value is empty. Its functional checks therefore cannot verify that iPad's actual platform overlay has disappeared. After publication, physical iPhone/iPad review must check the overlay, cold first activation and Combo Touch capture. The current showcase begins its separate Progress demonstration at **50%**; this does not change saved material settings or establish any device-performance result.

## Still requires physical-device acceptance

### R3 explicit scene refraction (2026-10-19 historical review)

R3 adds an opt-in `ControlledScene` / `ControlledSource` path: the visible SVG background and the lens reference the same registered source, and ordinary SVG `feDisplacementMap` filters that source. This avoids the unsupported SVG **backdrop** filter reference; it is not an arbitrary DOM screenshot or a claim that WebKit issue 245510 is fixed. The issue was rechecked on 2026-10-19 and remained NEW. Editable source text and track values are part of the shared scene. Native form text stays outside optical filters. Details, before/after evidence and pending physical acceptance are in the [R3 review](reviews/2026-10-19/r3-mobile/README.md).

The asynchronous PNG serialization path is limited to registered scenes during mouse interaction and idle preparation. Active direct-touch deformation and its release settling retain the synchronous exact-map path: a rejected all-async candidate showed over 100ms of first-response delay while Chromium deferred native serialization/FileReader tasks during pending touch. Both routes use the same full normal-map pixels and commit matching contour/map frames together, with bounded encoder jobs and caching; stale results are invalidated on route changes and visibility loss. Local browser tests compare displacement on/off while holding blur and opacity constant, plus source edits, resize, drag and cleanup. Windows Playwright WebKit results establish behavior in that test engine; only the owner's iPhone/iPad test can establish physical Safari composition and Combo Touch behavior.

### 2026-10-19 input and studio review (historical review scope)

The owner supplied physical iPad screenshots showing text selection during a lens drag and rectangular paint behind range lenses, and reported that the first interaction stalls on iPhone 15 Pro and iPad Air M4 (2026), including a Combo Touch trackpad drag failure. These reports supersede any inference that earlier viewport/tap checks established mobile acceptance.

The review separates native range semantics from platform paint, defines primary-pointer ownership and vertical-scroll intent, prevents selection only on the movable lens, coalesces setting persistence, and allows new clock work at the next browser frame. The owner rejected R1's portrait composition. R2 preserves the original horizontal geometry at every width: narrow containers show the form above a full-width content panel, while tablet/desktop containers retain integrated content. One foreground DOM survives breakpoint changes with its focus and drafts. The rotating blue-violet studio environment remains opt-in; both `responsive` and `studioMotion` default off for library consumers. The [versioned review ledger](reviews/2026-10-19/README.md) distinguishes rejected, self-reviewed and owner-pending states. No Apple rendering equivalence or universal DOM refraction is claimed.

Windows Chrome 155, Edge 155 and Playwright WebKit 26.5 checks exercise mouse/keyboard/lens selection, contour hit testing and motion toggles. Chromium native touch checks cover vertical scrolling from controls, second-contact ownership, continuous endpoint overdrag/re-grab and shape gestures. The native range stays in the accessibility tree; its platform paint is transparent, with contour focus feedback supplied by the glass shell. Arbitrary-page SVG backdrop displacement remains unavailable in the conservative iOS path.

Physical Combo Touch, first-activation latency, Safari compositor artifacts and software-keyboard behavior still require the owner's device review. Windows cold/warm tests did not consistently reproduce the reported first-click stall. A Windows WebKit cold drag also required a longer wait than the warm operation, so functional pointer tests must not be described as proof that startup jank has been eliminated. Evidence for this review is under the workspace's `output/playwright/*2026-10-19/`; it does not replace the versioned release measurements above.

- Safari on a supported macOS device, including actual WebGL/backdrop composition and font rendering.
- Physical iPhone/iPad Safari, real touch capture and drag/overdrag/re-grab behavior, viewport changes and software keyboard.
- VoiceOver and other assistive technologies with the actual target platform and browser.
- Physical high-density screens, browser zoom and thermal/battery measurements on intended devices.

Mobile emulation can exercise viewport, user agent and synthetic touch events. It cannot reproduce the device GPU driver, Safari's platform compositor, thermal limits, battery use or physical touch ergonomics. No local desktop test should be described as a physical iOS/Safari pass.


## 1.2.1 sample typography and Windows WebKit capture limit

The sample editor retains its native draft while composition is in progress. It publishes committed SVG text only after the exact font-weight/glyph font-loading promises resolve. This avoids displaying a fallback glyph run and then replacing it with MiSans. It is a showcase behavior; the underlying native input remains editable and selectable. The [1.2.1 release record](releases/1.2.1/README.md) retains delayed-font, composition-contract, race and screenshot evidence.

Windows Playwright WebKit can lose its non-composited WebGL canvas image after a drawing-buffer resize, including in screenshots. The maintainer identified a Windows-port problem; the report distinguishes it from macOS WebKit. See [Playwright issue 42885](https://github.com/microsoft/playwright/issues/42885) and [WebKit issue 326421](https://bugs.webkit.org/show_bug.cgi?id=326421). This limitation was also observed in the old 1.2.0 production page. It prevents treating this Windows port's affected still-frame captures as a Safari visual pass; Chromium supplies the deterministic material pixel-response checks. No keep-drawing loop, context-loss cycle or preserveDrawingBuffer change is added to the product to satisfy this capture path. Physical Safari still-frame acceptance remains separate.
