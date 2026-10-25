# Pearl edge review protocol — 2026-10-25

These scripts only inspect a served preview and write evidence under this folder. They do not edit product source or publish anything. Run from the `alvenx-design-kit` directory. Use a dedicated Playwright CLI session such as `pearl-edge-qa`; do not reuse the owner's `edge-fix` session.

## Preserved checks

- `online-qa.cjs` is the unchanged interaction protocol from `docs/reviews/2026-10-23/entrance-pink-response/online-qa.cjs`, with only its evidence output directory changed. It retains the 106 checks for anchored hover, separate lobe response, drag return and click suppression, toggles, canvas bounds, overflow, reduced motion, idle and errors.
- `built-smoke.cjs` is the unchanged built/SSR protocol from the same source directory, with only evidence paths changed. Its no-JavaScript first-frame checks require the built and prerendered page, not an empty Vite development document.
- `edge-matrix.cjs` adds a compact six-context edge inspection: 44/54 CSS px diameter × DPR 1/2/3. Each saves native-device-pixel crops for the no-JS static first frame, live closed rest, closed side hover, detached open rest, chamber hover and chamber drag. It preserves real pointer interaction checks and records contour SHA-256/clip/DPR metadata. It does not modify opacity, shadows, backgrounds, CSS or canvas pixels.

## Running

Open the intended built/local or deployed preview URL in a dedicated session first. The scripts derive their target from `page.url()`, so they must not start at `about:blank`.

```powershell
playwright-cli -s=pearl-edge-qa open "<built-or-deployed-preview-URL>"
playwright-cli -s=pearl-edge-qa run-code --filename=output/playwright/pearl-edge-20261025/edge-matrix.cjs > output/playwright/pearl-edge-20261025/edge-matrix-result.log
playwright-cli -s=pearl-edge-qa run-code --filename=output/playwright/pearl-edge-20261025/built-smoke.cjs > output/playwright/pearl-edge-20261025/built-smoke-result.log
playwright-cli -s=pearl-edge-qa run-code --filename=output/playwright/pearl-edge-20261025/online-qa.cjs > output/playwright/pearl-edge-20261025/online-qa-result.log
playwright-cli -s=pearl-edge-qa close
```

`edge-matrix.cjs` is the focused visual check for this edge change. Run the preserved full interaction protocol once on the final affected build, rather than after every material experiment. Run `built-smoke.cjs` after regeneration of the static first-frame assets.

## Inspecting the edge

Compare static and live rest images at the same diameter/DPR, then inspect hover and drag for a detached pale rim, stepped coverage, clipping and dark fringes. The captures preserve the actual page background and compositing. At DPR 2/3, inspect at native pixel size as well as the corresponding CSS display size; do not use smoothing from a resized contact sheet as sole evidence. The script includes 10 CSS px of surrounding background where the viewport permits it.

These are Chromium rendering and viewport checks. Physical iOS/Safari, display color management and device-specific GPU behavior require separate evidence. A passed interaction assertion does not by itself establish the visual disappearance of the halo.
