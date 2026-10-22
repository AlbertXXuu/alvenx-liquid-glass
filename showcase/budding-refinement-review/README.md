# Budding entrance — R7 continuous material and toggle review

The owner requested one consistent mother throughout growth and rest, a reversible mother button, a lighter/brighter blue-violet volume, and removal of the white outline visible on phones. This remains the independent review at `/ui/budding-refinement-review-20261022/`; the production homepage and library defaults are unchanged pending review.

`geometry.ts` is byte-identical to the accepted R5 outline (SHA-256 `bcf9efa6e6b5db5bcf55cc295e22798fe66a0fdfd20f6328092a8da84aa55b7d`). The round mother, exponent-2.2 chamber, balanced native label, final gap and independent hover remain.

## Continuous material

R6 changed height models at growth 0.00001 and 0.95. R7 uses the actual displayed C2 contour profile for resting, growing, returning and separated states. The profile parser handles both closed subpaths after separation; it uploads only when the displayed path changes. Per-lobe deformation is already present in that path and is not applied twice. The spherical cross-section keeps the mother's normals consistent when the neck appears or disappears.

The reference shader retains broad internal reflection and the accepted blue/violet environment. Its output is lifted toward a near-white blue and modestly saturated. The actual browser backdrop remains underneath; the additional reference material is an analytic 2.5D environment approximation, not an arbitrary DOM screenshot or Apple's renderer.

The small control no longer stacks the native white rim with the reference rim. The reference exterior is transparent. The DOM C2 clip owns silhouette antialiasing, with material coverage extended slightly through that boundary to avoid two fading masks producing a pale seam. Authored keyboard focus remains available. All overrides are scoped to the reference-material proposal; disabling the material retains native glass optics.

## Toggle and startup

The mother button toggles the animation target using the current target, not a stale render state. A second activation retracts the chamber; another activation during return opens it again from its current position and velocity. Outside/gap clicks, Escape and scrolling out of view still close it. Reduced motion settles directly. Native text and the separate destination link remain outside optical filters.

R6's progressive startup remains: actual SSR markup, responsive transparent first-frame textures, a working native link before JavaScript, bounded early-gesture handoff, visibility-triggered shader preparation and the existing shared clock. The 54/44 px first-frame PNGs are regenerated from the R7 renderer's actual growth-zero draw, synchronously before drawing-buffer clear, clipped with the exact contour. Their embedded data and file hashes are checked by `prerender.mjs`. No extra rendering loop, `preserveDrawingBuffer`, runtime PNG encoding or new dependency is added.

Preparation uses `KHR_parallel_shader_compile` when available. The existing no-extension fallback still has a synchronous status wait after an initial paint opportunity. A visible first-frame texture is not a claim of instantaneous live readiness or zero network/GPU latency.

## Verification and retained history

Current evidence and replay callbacks are under `output/playwright/budding-refinement-r7-20261022/`, with published records under `docs/reviews/2026-10-22/budding-entry/r7/`. They cover contour geometry, native layout and hit targets, repeat/reverse activation, mobile touch/DPR emulation, material/path alignment, no duplicate rim, keyboard focus, reduced motion, first-frame preparation and early gesture handoff. Browser captures are inspected before publication. Physical iPhone/iPad Safari appearance and Combo Touch acceptance remain owner checks; emulation is not a device certificate.

R6 source and evidence remain immutable under `review-budding-20261022-r6` and its published records. Its original PNGs and measurements are historical, not validation of R7. The new immutable source tag is `review-budding-20261022-r7`; the prior review entry is archived under `/ui/budding-refinement-review-20261022-r6/` at publication.

All rights reserved / UNLICENSED. No npm package publication or new reuse license.

Local R7 pre-publication checks passed: TypeScript/docs, 28 kit contracts, 410 library geometry checks, 392 unchanged review geometry assertions, 129 responsive interaction assertions, 5 material/path checks, 31 mobile touch/DPR toggle/rim/focus assertions, 19 startup assertions and 16 early-gesture handoff assertions. The initial persistent browser session timed out; the interaction/material callbacks were rerun in clean isolated browser contexts with no timeout relaxation. The handoff replay exposed and then verified the fix for a real synthesized touch click that otherwise toggled the newly replaced button twice. Physical-device acceptance is not claimed. The final no-JS/ready contact shadow is also shared; detailed final receipts accompany the published review records.
