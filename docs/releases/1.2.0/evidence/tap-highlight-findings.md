# Tap overlay investigation — 2026-10-19

## Observation and diagnosis

The owner's physical iPad screenshots show a translucent dark pill matching the full native switch button and a translucent rectangle matching the full native range input hit area. These are larger than the authored glass lens. The overlay appears on a tap and disappears during a drag.

The kit did not previously set `-webkit-tap-highlight-color`. Chromium computed the inherited default as `rgba(0, 0, 0, 0.18)` on every sampled native hit target. Apple documents this separate translucent tap overlay for clickable elements, and explicitly documents zero alpha as its suppression mechanism:

- [Apple Safari CSS Reference: -webkit-tap-highlight-color](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html)
- [Apple Safari Web Content Guide: Highlighting Elements](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/AdjustingtheTextSize/AdjustingtheTextSize.html)

The screenshot geometry, event timing, missing override, and documented behavior support identifying the tap overlay as the cause. No physical iOS rerun has yet been made, so this is not a claimed on-device visual pass.

## Change

The reusable `.alvenx-design` scope now inherits `-webkit-tap-highlight-color: transparent`. It affects the kit and its showcase's links, buttons, sliders and fields, without applying to the rest of a consuming website. The change does not alter hit geometry, touch-action, pointer ownership, default values, focus handling, selection, native editing, optical material or animations.

## Local verification

The callback `tap-highlight-qa.cjs` ran in Chromium 155.0.8059.84 and Playwright WebKit 26.5, each at 393 and 1180 CSS-pixel widths with a touch-capable context.

- Chromium: every sampled native interactive target computed zero-alpha tap color. An outside-the-kit button retained `rgba(0, 0, 0, 0.18)`, confirming scope isolation.
- Both engines: native touch taps toggled the switch and updated the range; mouse dragging continued to update the range.
- Both engines: held pointers preserved the authored glass pressure/shape response, with sampled normalized pressure above 0.86.
- Both engines: reaching the range via genuine Tab navigation and pressing ArrowRight retained `:focus-visible`, the actual contour focus path, and keyboard value updates.
- Both engines: a native field accepted Latin/CJK text and retained its selection range.
- Both engines: zero page errors in these cases.
- Screenshots of a held switch and the contour keyboard focus path were inspected locally.
- `git diff --check` passed for the worktree at the time of this targeted check.

Windows Playwright WebKit does not expose this iOS-specific CSS property (`CSS.supports` is false and computed value is empty). Its tests establish unchanged native interactions and focus, but cannot establish the disappearance of iPad's platform tap overlay. Physical iPad/iPhone verification remains necessary after deployment.

These checks are functional and visual regression checks, not latency or FPS benchmarks. They ran against the local page while unrelated showcase edits could still be in progress; the root task performs final build and deployed-page verification.
