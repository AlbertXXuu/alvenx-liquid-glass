# Continuous refraction — local verification checkpoint

Date: 2026-10-30, Asia/Shanghai. Branch: `codex/continuous-magnifier-20261029`.
Base commit: `7ffe6c0e02406054d46e4238cfe58610ee546398`.
Status: **local Chromium candidate verified; cross-engine acceptance incomplete; not published**.

This follow-up preserves the existing uncommitted continuous-scene implementation and its seven public material parameter ranges. It adds no package/version change, push, release or deployment. The private website checkout remains clean at `3d77d176e73fa87ade7e91be865e725672b1c936`. Homepage rendering and copy/reveal source are outside this change.

## Fixed in this follow-up

Production initialization could stall on the old SVG path. The continuous renderer installed its geometry observer in a layout effect before the later sibling lens ref was attached. A fast source upload could draw before the lens had usable geometry, with no observer to wake it afterward. Development StrictMode's second setup masked this race. Initial attachment now uses a passive effect, as the existing controlled source does for externally supplied refs. Its observers and allocated resources retain the existing unified cleanup.

The prior work remains intact: obsolete font completions cannot replace a newer source; upload cache keys commit only after success; failed upload/first draw preserves the original source and can recover on a later change; partial initialization releases allocated resources; hidden/offscreen changes defer upload and drawing until visible again.

## Executed checks

- `npm run check`, `npm run build`, `npm run test:contract`, `npm run test:runtime` passed. Showcase production build and type/document checks were rerun after the attachment fix. `git diff --check` passed.
- Production Chromium matrix: 37 parameter/viewport/DPR cases, 297 explicit readiness/settings assertions, no page exceptions. All entered `scene-continuous`. The sampled 1365px and 320px/DPR3 maximum-refraction screenshots were visually inspected: center text strokes remain continuous, with visible magnification and no old fragmented duplicate strokes.
- Production lifecycle faults: 18 assertions passed, covering stale font rejection, offscreen/background pause and latest-state restoration, texture-upload failure and first-draw error recovery. Background visibility is synthetically injected; this does not certify OS suspension.
- Partial resource allocation faults: 32 assertions passed across shader/program/buffer/texture allocation failure. Every successfully allocated tracked resource was deleted and the original SVG source remained available. These are API allocation/deletion counts, not an external GPU-memory measurement.
- Same-machine production comparison: 12 runs, old/candidate × blur 0/6 × three repeats, alternating order, fresh Chromium contexts, local no-store HTTP server, viewport 1365×900, DPR2. Candidate idle produced zero scene uploads/draws; dragging produced zero source uploads. No candidate main-thread long tasks were observed during the measured idle/drag/tuning/edit phases. One old-version tuning run recorded a 99ms long task. This small sample is not a performance guarantee. rAF intervals, command durations and GPU submission counters are not presented as FPS/GPU duration. Disk/GPU caches were not cleared, and this protocol does not isolate first-frame startup latency.

### Actual visual coverage

Maximum refraction 3 maps to 1.5× center magnification, with a continuous transition to identity at the boundary. In the inspected zero-blur text/grid examples it behaves as a magnifier with continuous strokes. This is a controlled-scene approximation; it does not establish physical lens accuracy or arbitrary-page refraction.

The 37 cases comprise 21 desktop/DPR2 cases, 12 phone/DPR2 cases and four maximum-refraction cases at desktop/phone DPR1/3. The main optical sample is nine pairwise cases across refraction 0/1.5/3, blur and progressive blur 0/3/6, opacity 0/.5/1; three zero-blur refraction cases are added. The other three parameters are sampled individually at low/mid/high on desktop. This is not a Cartesian sweep of all seven parameters. Screenshots are retained for the matrix, but numerical readiness/settings assertions do not grade their appearance. Human inspection was limited to selected maximum-refraction desktop/phone images and representative blur/Chinese scenes. Long text, every intermediate value, all seven-way combinations and all dynamic geometries have not received exhaustive visual acceptance.

## Remaining boundaries

Production Windows WebKit was checked at 1365px/320px with refraction 3 and blur/progressive 0/6. Its Canvas2D blur probe returns no blurred pixels. At 6/6 the component deliberately falls back to the old SVG path with `Canvas blur unavailable`; the new high-refraction quality improvement therefore does not cover that condition. No parameter is silently reduced.

At zero blur WebKit reports continuous readiness, but captured frames are black or stale (the Chinese edit remains English in one capture). Prior immediate framebuffer/texture diagnostics are consistent with the already documented Windows WebKit capture issue, but they do not establish correct visible output. This remains **unverified**, not passed or conclusively attributed to the capture system. Physical iOS/Safari, real IME/Combo Touch, true browser zoom and device power are not certified. The separate GPU-blur experiment was not integrated in this bounded follow-up.

The shader blends selected base/deep blur textures and fades to the unchanged scene at the rim; this is an approximation, not a continuously varying exact Gaussian. This controlled scene is explicit Canvas/SVG source data, not arbitrary DOM backdrop capture. Context loss preserves the old SVG fallback; automatic recreation of the new renderer is not claimed.

## Evidence and replay

Local evidence directory relative to the project root: `output/playwright/refraction-fix-20261029/qa/`.

- `production-compare.cjs`, raw results and `production-compare-summary.json`.
- `lifecycle-built.cjs` / `lifecycle-built-results.json` (18 assertions).
- `resource-faults.cjs` / `resource-faults-results.json` (32 assertions).
- `scene-matrix-continuous.cjs` / `built-matrix-results.json` (37 cases).
- `webkit-built.cjs` / `webkit-built-results.json` and associated screenshots.
- `verification-state.json` identifies the actual edited source bytes and indexed evidence.

The versioned `verification-snapshot.json` is a copy of that pre-commit verification state; its `committed: false` describes the original verification checkpoint. The subsequent local commit identity is recorded separately in the local `delivery-local.json`, avoiding a self-referential commit hash.

Exact screenshot paths relative to the project root:

- Maximum refraction, desktop: `output/playwright/refraction-fix-20261029/qa/local-candidate-1365-d2-sharp-3.png`.
- Maximum refraction, phone: `output/playwright/refraction-fix-20261029/qa/local-candidate-320-d3-sharp-3.png`.
- Production comparison, before/candidate: `output/playwright/refraction-fix-20261029/qa/built-before-blur0.png` and `built-candidate-blur0.png` in the same directory; matching `blur6` files are also retained. These comparison captures occur after the scripted blur tuning and Chinese edit; the filename's blur value identifies the initial condition, not a pure final zero-blur specimen. Use the `sharp-3` files for maximum-refraction/zero-blur inspection.

For a standalone local production preview, run `npm run preview -- --port 5236` inside `alvenx-design-kit/`, then open `http://127.0.0.1:5236/mobile-review.html#refraction`. The current built output is preserved. For an editable development preview use `npm run dev -- --port 5237` and the same path on port 5237. Existing saved settings apply; use the visible controls to set Refraction 3 and both blur values 0 for the sharp maximum-magnification example.

`static-server.py` serves the saved website production entry at `/before` and `site-dist` at `/candidate/`, both on local port 5235. After a production build, run the browser scripts via `playwright-cli run-code --filename=<script>`. The matrix script uses the current tab URL; open `/candidate/mobile-review.html` first. These helpers write only local evidence. Owned QA browser/server sessions are closed at completion; preexisting services are preserved.

Next bounded task: resolve and validate unsupported native blur without losing the single-scene mapping, then establish trustworthy WebKit visible output. Homepage/production promotion requires those quality gaps to be handled or an explicitly accepted compatibility scope.
