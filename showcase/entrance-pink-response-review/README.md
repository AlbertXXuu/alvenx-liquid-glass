# Anchored pearl and pink response review — 2026-10-23

This independent visual proposal responds to the owner’s request for a fixed initial pearl, visibly stronger proximity/hover response, and lighter, more vivid colour with a larger pink contribution. It is not a change to the installed homepage 1.4.1 component.

- The action and optical center stay anchored. Equal/opposite local contour pulls and centered hover growth replace global translation; a smooth 4.8px displacement cap fits the existing raster padding. The absent chamber has no influence at zero growth.
- Hover grows each lobe by up to 5% before local compensation, with a 30px approach zone for the closed pearl. Detached approach zones remain separated. Drag retains spring release, re-grab, click suppression, toggles, outside/scroll dismissal and native destination semantics.
- Blue and rose studio colours are sampled by the existing analytic volume model. Each lobe has independent pointer lighting. This is an environment approximation layered over native backdrop glass, not a claim of full 3D rendering.
- First-frame images are regenerated from the same resting contour, renderer and defaults at 44/54px. The shared runtime and historical review remain unchanged. Reduced motion stays static; inactive rendering sleeps.

Run the repository dev server and open `/showcase/entrance-pink-response-review/`. Build with `node node_modules/vite/bin/vite.js build --config showcase/entrance-pink-response-review/vite.config.mjs --base /ui/releases/entrance-pink-response-20261023/`, then run `prerender.mjs` with that base and `--out-dir output/playwright/entrance-pink-response-20261023/dist`.

To regenerate first frames, run `capture-first-frames.cjs` through Playwright CLI against the development page; save its UTF-8 result and pass that file to `node showcase/entrance-pink-response-review/write-first-frames.mjs`. Readback is build-time only.

User visual acceptance is pending. Chromium viewport checks are not physical iOS/Safari/Combo Touch acceptance. Reserved rights / UNLICENSED are unchanged.
