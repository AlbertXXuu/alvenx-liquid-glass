# 1.3.1 — native input text inset correction

Implementation and local verification record, 2026-10-19. Publication is a separate step and is not claimed by this record.

## Owner correction

The owner clarified that the requested adjustment concerns the position of their typed text inside the existing `Ask anything…` composer. The glass field must retain its width, height, contour, and placement. The earlier independent A/B/C field-sizing comparison is not the chosen implementation and remains separate.

The production showcase change is limited to two more-specific CSS declarations in `showcase/mobile-review/review.css`:

```css
.alvenx-design.lab .lab-message>.field-hit{padding-left:58px}
/* Inside the existing max-width:600px media query: */
.alvenx-design.lab .lab-message>.field-hit{padding-left:36px}
```

Only the left padding of the field's native content wrapper changes. Existing top/bottom/right padding, the input's browser padding, field dimensions and contour, send button dimensions, gap, and 720 px composer maximum remain unchanged. No input text alignment or font rule was altered. The independent comparison page's three source files were not modified.

The input's retained browser padding contributes another 2 px on the left. Typed content therefore starts 60 px inside the field on desktop/tablet layouts and 38 px inside on phone layouts. The input's available internal editing width decreases by the same amount as the inset increases; its native horizontal text scrolling is preserved.

## Direct before/after measurements

The baseline was freshly measured at `https://alvenx.com/ui/` before publication of 1.3.1. The changed source was measured at `http://127.0.0.1:5174/mobile-review.html` using the same installed Chrome browser session, viewports, Chinese input, and measurement protocol.

| Viewport width | Existing field size | Existing send size | Content start before | Content start after | Movement right |
| ---: | --- | --- | ---: | ---: | ---: |
| 393 px | 285 × 68 px | 44 × 44 px | 26.8125 px | 38 px | 11.1875 px |
| 768 px | 554 × 74 px | 58 × 58 px | 42.921875 px | 60 px | 17.078125 px |
| 1366 px | 650 × 74 px | 58 × 58 px | 47.25 px | 60 px | 12.75 px |

The 768 px shift is greater than the original approximate 12–15 px estimate because the previous inset used a percentage of the responsive field width. The measured result follows the requested fixed 58 / 36 px wrapper inset exactly; the actual values are retained rather than rounded into that estimate.

For all three viewports, the following before/after values were identical:

- Field x/y/width/height and send button x/y/width/height; every recorded delta is zero.
- The field's rendered contour path.
- Top, right, and bottom wrapper padding.
- Input font family, font size, line height, browser padding, vertical position, and height.
- Composer gap and maximum width.

The input's vertical center error remained 0 px. There was no page horizontal overflow. This confirms that the change moves native text rather than resizing or repositioning the glass control.

## Focused interaction and visual checks

The protocol passed 19 focused assertions against the live baseline and another 19 against the local changed page:

- Native Chinese text can be entered and retained.
- A long English sentence remains editable in the existing single-line field.
- `fluency` still returns literal `<3`.
- An ordinary message still returns `Good question… but I don’t understand.`.
- 16 px native text stays vertically centered; the page does not overflow.
- No page errors were observed during either scoped run.

The implementation reviewer opened and inspected `local-after-393.png`, `local-after-768.png`, and `local-after-1366.png`. The screenshots show the Chinese typed text moved inward with the existing field and send layout preserved. Equivalent baseline screenshots are retained for comparison. These are installed Chrome / Windows browser checks, not physical iOS, Safari, system IME, or Combo Touch certification.

## Evidence and publication boundary

- `measure-text-inset.playwright.js`: the actual bounded browser callback used for both scenarios.
- `production-before.json` / `.log`: fresh live baseline metrics and raw CLI result.
- `local-after.json` / `.log`: changed local metrics and raw CLI result.
- `comparison.json`: direct numerical deltas and equality checks.
- `production-before-{393,768,1366}.png` and `local-after-{393,768,1366}.png`: actual Chinese input screenshots.
- `text-inset-evidence.sha256.json`: byte/hash index of this scoped evidence and the modified CSS.

The homepage remains on its independently delivered 1.3.0 budding entrance. This task does not change homepage code, material rendering, settings, or the comparison review. The root task owns source freeze, version metadata, package validation, GitHub synchronization, and formal `/ui/` deployment. Online after-deployment verification must be recorded separately.
