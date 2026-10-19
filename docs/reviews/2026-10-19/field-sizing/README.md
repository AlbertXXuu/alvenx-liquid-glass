# Field sizing review — 2026-10-19

Status: **independent review sample; awaiting the owner's choice**. Option B is a recommendation, not an accepted design change. The production `/ui/` composer remains unchanged until a choice is confirmed.

## Request and scope

The owner supplied an image of the long `Ask anything…` field and asked for the text to sit a little farther inward, plus several ways to control the size of a liquid-glass text field for comparison. The request was interpreted as increasing the safe inset from the curved ends while keeping editable text left aligned and vertically centered. It does not mean horizontally centering every input value.

The comparison has three editable candidates using the existing `LiquidControl`, `ControlledScene`, font assets, and material settings defaults. Each has the same blue/violet grid source and the existing 44 px circular send control. The optical renderer and the production page are not altered. Native text is above the optical layer; input font size is 16 px and the input's own padding is zero.

Review source:

- [`field-sizing-review.html`](../../../../field-sizing-review.html)
- [`showcase/field-sizing-review/main.tsx`](../../../../showcase/field-sizing-review/main.tsx)
- [`showcase/field-sizing-review/review.css`](../../../../showcase/field-sizing-review/review.css)

The HTML entry is marked `noindex,nofollow` and uses relative asset references. Hosting is a separate delivery step; the local verification retained here does not claim that an online review was deployed.

## Candidate dimensions

All row maxima below include the input field, send control, and gap. They are not the width of the glass input alone.

| Option | Purpose | Row maximum | Desktop field height | Desktop text inset | Phone field height | Phone text inset cap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A | Preserve the long silhouette; move text inward | 720 px | 74 px | 56 px | 68 px | 40 px |
| B | Balance length, height, and breathing room | 640 px | 68 px | 52 px | 64 px | 40 px |
| C | Compact composer for shorter messages | 520 px | 60 px | 44 px | 60 px | 36 px |

On a wide viewport the send control is 44 px and the gap is 16 px. The actual glass fields are therefore:

- A: `720 − 44 − 16 = 660 px`, measured **660 × 74 px**, with 56 px text inset.
- B: `640 − 44 − 16 = 580 px`, measured **580 × 68 px**, with 52 px text inset.
- C: `520 − 44 − 16 = 460 px`, measured **460 × 60 px**, with 44 px text inset.

At 393 px viewport width, all three fill the same available row. Page padding is 20 px per side, scene padding is 16 px per side, the send control is 44 px, and the phone gap is 10 px. The measured field width is `393 − 40 − 32 − 44 − 10 = 267 px`; heights remain 68 / 64 / 60 px and insets are 40 / 40 / 36 px for A / B / C.

The phone rule applies at viewport widths up to 640 px. Every inset uses `clamp(24px, 17%, option cap)` so very narrow fields retain editing space. At 320 px the measured field is 194 px wide and the inset is about 32.97 px for all three, leaving about 128 px of native editing width. Long single-line text scrolls within the native input rather than resizing the page.

Each candidate includes a live readout of actual field width, height, and resolved text inset, measured from the displayed elements. The size labels show design maxima/caps; the live readout shows the responsive result.

## Recommendation and comparison controls

**B is recommended for evaluation** because shortening the row reduces the empty long-strip impression while the 52 px desktop inset gives the text more room before the curved end. Its 68 px height retains the current generous feel without occupying as much space as A. A suits retaining the larger footprint; C suits a more compact context and shorter messages. At phone widths the candidates intentionally share the available width, making their different heights and insets the useful comparison.

The sample buttons load the same placeholder, short English/Chinese, or long English/Chinese value into all three fields. Editing one field then changes only that field. `Show text safe areas` adds a dashed inspection guide and is off by default. Sending produces local preview feedback only; no message leaves the device. Inputs are limited to 240 UTF-16 code units in this review sample, and do not impose a new production input contract.

## Verification and evidence

Local browser verification used installed Chrome on Windows through Playwright CLI. **19 assertions passed** across 320, 393, 768, and 1366 px viewports: shared samples, independent editing, local send feedback, no horizontal overflow, 16 px left-aligned native text, zero input padding, centered input boxes, and absence of optical errors. The measured vertical center error was 0 px in the four viewport checks. All candidates reached optical-ready after being scrolled into view.

`npx tsc --noEmit` passed after the review source was completed. No runtime/library or production styles were changed for this comparison. Screenshots were captured after scrolling through the specimens, since the existing library deliberately defers offscreen rendering. These checks do not certify physical iOS, Safari, system IME, or Combo Touch behavior.

The retained evidence is in [`final-verification/`](./final-verification/):

- [`verification.json`](./final-verification/verification.json): the local assertion results and measured dimensions.
- [`validation.log`](./final-verification/validation.log): raw CLI result and the recorded bounded browser protocol.
- [`local-validation.playwright.js`](./final-verification/local-validation.playwright.js): replayable CLI `run-code` callback extracted from that protocol.
- Six screenshots: desktop/phone placeholders, desktop/phone Chinese with safe-area guides, 320 px and 768 px independent native-input states.
- [`sha256.json`](./final-verification/sha256.json): bytes and SHA-256 of the retained files, plus the exact three review source files. The index excludes itself.

The screenshots personally inspected during the local implementation were `desktop-chinese-guides.png`, `mobile-chinese-guides.png`, and `320-native-input.png`. The root reviewer additionally inspected the desktop and phone placeholder screenshots before proceeding to an independent hosted review. That review and the owner's eventual choice must be recorded separately; neither is marked accepted in these local results.

To replay the protocol, first start the kit's Vite server at `http://127.0.0.1:5174/`, open the comparison in an owned Playwright CLI Chrome session, and run the saved callback with `playwright-cli -s=<session> run-code (Get-Content -LiteralPath <callback-path> -Raw)` from the parent workspace. The callback writes screenshots to the original `output/playwright/field-sizing-review-2026-10-19/` location. It does not update this frozen evidence directory automatically.
