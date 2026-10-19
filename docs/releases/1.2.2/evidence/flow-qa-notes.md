# Focused normal-flow and Easter egg QA — 2026-10-19

Candidate: local Vite showcase at http://127.0.0.1:5174/ (working tree for 1.2.2).
Harness: alvenx-design-kit/scripts/material-workbench-qa.cjs, Playwright CLI callback.

- Chromium 155.0.8059.84: 128 assertions, five layouts, zero page errors.
- Windows WebKit 26.5: 128 assertions, five layouts, zero page errors.
- Widths/heights: 320×852, 393×852, 768×1024, 1180×820, 1366×900; also 393×550 short viewport and system reduced motion.
- The same single horizontal canvas and all seven parameters remain in the volume section with the two motion switches. Disclosure does not change preview dimensions, document position, heading font or caption. The preview follows the exact document scroll distance and can leave the viewport completely.
- Numeric entry, precision, upper clamping, slider keyboard input and opacity Reset 0.3 pass. Native message input supports ordinary English/Chinese text, Enter/click submission, empty validation, editing after output, literal `<3`, trimmed case-insensitive exact `fluency`, and ordinary output for a longer sentence containing the word.
- Captures named message-chromium-{width}-ordinary.png and message-chromium-{width}-heart.png show the complete #fields section with the output visible. Phone 393px ordinary and heart captures were visually inspected; output and text do not overlap. The 1366px volume and 320px expanded settings screenshots were also inspected.

Harness corrections during execution (no product change): native focus of the last control in a wide three-column grid need not scroll the preview completely offscreen. The test now checks stable document position and explicitly scrolls beyond the preview, then asserts the exact scroll-distance relationship. WebKit output reads await the React numeric value after keyboard input, avoiding an immediate stale read. These are test assumption/timing corrections, not app defects.

Limitations: synthetic desktop contexts do not certify physical iOS, OS IME or Combo Touch. Windows WebKit's known canvas resize/compositor retention issue prevents this port from certifying WebGL pixels; this run asserts layout and controls in WebKit and captures visual evidence in Chromium. No renderer workaround or new rendering loop was introduced.
