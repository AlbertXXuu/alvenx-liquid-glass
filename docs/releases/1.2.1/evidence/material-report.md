# Material workbench regression evidence — 2026-10-19

The page keeps one existing pearl canvas and moves its seven Surface parameters into the same bounded section. Opening the controls docks the preview below the fixed header when the visual viewport is at least 700 px high. The preview preserves the horizontal form and its DOM caption. A shorter viewport undocks it without expanding the canvas.

## Executed checks

- Chromium 155.0.8059.84: **95 checks passed**, five layouts (320×852, 393×852, 768×1024, 1180×820, 1366×900), no page errors.
- Windows WebKit: **88 input/layout checks passed**, the same five layouts, no page errors. This is the Playwright Windows port, not Safari on an Apple device.
- All seven numeric fields were reached using real Tab traversal and remained hit-testable below the preview. The final opacity slider accepted a continuous pointer drag. The preview remains exactly 12 px below the fixed header once docked and has sufficient room below it for controls.
- All six material parameters produced different pixels in the **same Chromium pearl canvas** after a real numeric edit from zero to their maximum. Interaction strength 0 versus 4 changed the live surface response to the same pointer position.
- A simulated 550 px viewport undocked the preview without making it larger. This does not emulate an actual iOS software keyboard.
- System reduced motion remained active and disabled its override switch.
- Screenshots were viewed for the five sizes in both ports. The final full-width backing prevents old controls from appearing beside the narrower desktop canvas. The 12 px backing between header and preview hides controls passing through that gap.

## Windows WebKit pixel limitation

With background motion disabled, a large resized WebGL drawing buffer sometimes becomes black or absent in the Windows WebKit screenshot. This also reproduced on the existing production **1.2.0**, before the workbench change.

An independent page containing only two WebGL canvases reproduces the same failure. Both canvases initially show blue. After changing their drawing-buffer dimensions, both disappear in Windows WebKit, including the one using `preserveDrawingBuffer: true`. Their immediate in-frame `readPixels` still reads `[64,96,239,255]`, with `getError() === 0`. Both canvases remain visible after the same resize in Chromium. See `material-{chromium,webkit}-minimal-gl-{initial,resized}.png` and `material-minimal-webgl-retention.cjs`.

This matches the Windows port resize issue documented in [Playwright #42885](https://github.com/microsoft/playwright/issues/42885) and [WebKit #326421](https://bugs.webkit.org/show_bug.cgi?id=326421). Consequently the WebKit results certify the stated control, layout and focus checks only; the six idle canvas pixel-response checks are intentionally confined to Chromium. No renderer or drawing-buffer retention setting was changed to work around this test-port issue. Physical iPhone/iPad acceptance remains separate.

## Reproduction

Open the desired candidate with Playwright CLI, take its initial snapshot, then run `scripts/material-workbench-qa.cjs` through `run-code --filename`. Evidence paths are relative to the parent project folder. JSON results are in `material-chromium-result.json` and `material-webkit-result.json`; they contain no machine-specific paths.
