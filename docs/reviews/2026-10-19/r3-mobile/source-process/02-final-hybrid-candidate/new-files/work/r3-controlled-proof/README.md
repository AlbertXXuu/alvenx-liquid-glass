# R3 controlled-scene refraction feasibility proof

Date: 2026-10-19. Engineering proof only; not an owner-accepted visual or public release. No existing runtime source was edited by this proof.

## Result

Regular SVG `filter="url(#...)"` with `feDisplacementMap` can refract a shared explicit source scene in Chrome 155 and the installed Playwright WebKit 26.5. The existing kit C2 contour clips the lens; the existing `createBackdropOptics` RG normal field supplies displacement. The same `<g id="sourceScene">` is rendered once as the board and once inside the lens via `<use>`, so changing text or track value updates both from one definition. No blur is used in the proof, and the source is not a fixed decorative image.

This is real spatial displacement of actual rendered source pixels. **It is not arbitrary DOM backdrop capture**, and it does not repair WebKit's backdrop-filter URL implementation. Production must expose an explicit source-scene contract and retain native semantic controls and readable DOM content outside optical layers. Source scene items can support gradient fields, grid/shape primitives, track endpoints/fill/value, same-origin/CORS-approved image textures, and an explicitly supplied typography specimen. Unregistered HTML behind the control will not be refracted by this path.

## Reproduce and inspect

Run the kit dev server, open `/work/r3-controlled-proof/index.html`, then run the callback at `output/playwright/r3-controlled-proof-2026-10-19/capture.cjs` from the parent workspace via Playwright CLI in a Chrome and WebKit session. The companion `compare.py` writes `pixel-summary.json` from actual SVG screenshots.

Checks compare scale 0 and 28; then update source text and track fill independently and repeat. In WebKit the track region changes 17.774% of pixels and the text region changes 28.972%, with maximum channel deltas 99 and 146. The control-exterior comparison remains pixel-identical. New source data changes the displaced interior too. Chrome shows the same mechanism with small expected rasterization differences. Screenshots were opened and visually inspected; text magnification/curvature and track displacement are visible, not only asserted by metrics.

The proof prepares one normal map before the ready marker. There are no shader compilation, WebGL context, or new normal-map work on subsequent source/position edits: diagnostics remain one computation and one encode. Cold normal generation measured about 128 ms in the initial Chrome load and 41 ms in WebKit on this host, so production should prepare on section approach/mount before interaction and make readiness explicit. Those desktop measurements do not establish first-touch latency on a physical device.

The reusable `ControlledScene`/`ControlledSource` component was additionally exercised in an actual React WebKit page at `component.html`. Sixty consecutive source updates do not starve initial readiness or turn it false after it becomes true. Wrapper and existing-container providers have distinct IDs and both reach revision 62. Resizing 500 to 320 CSS pixels updates the SVG viewBox and source bounds without losing the native input's focus or bilingual value. The test caught and fixed a parent-ref attachment ordering bug: source observation must attach after the parent container ref is assigned. These lifecycle results are recorded in `lifecycle-webkit.txt`; they are distinct from the filter pixel proof.

## Smallest integration recommendation

1. Add an opt-in controlled scene adapter to the independent sample, not a browser-wide override of existing SVG/native behavior.
2. Keep one shared scene definition per demonstration/track; render the same scene definition in the ordinary backdrop and the optical source. Move the optical source by the negative lens offset so track endpoints move correctly relative to the transparent lens.
3. Apply the current RG normal field through a regular SVG filter to that explicit source. Clip and rim must continue using the same current C2 path. Existing native control labels and editing DOM remain above the optical output.
4. Prepare source/normal resources on visibility approach or sample mount; subsequent dragging updates lens transforms and source state only. Avoid synchronous snapshotting, PNG encoding, or shader/program creation in pointerdown. Keep hidden sections paused and retain the existing material settings and reduced-motion behavior.
5. First validate phone/iPad physical Safari, touch, trackpad, cancellation and a second drag/re-grab on the independent public review. Desktop WebKit is useful evidence, not a physical iPad certificate.

If later products require arbitrary mixed DOM refraction on Safari, a controlled-scene adapter cannot supply it. A shared WebGL canvas can own registered scene/textures and refract them, but it still cannot directly sample arbitrary live DOM; use such a pipeline only if the explicit scene contract and shader/per-context cost are justified.

## Direct sources checked

- [WebKit bug 245510](https://bugs.webkit.org/show_bug.cgi?id=245510), checked 2026-10-19: status NEW; the reported missing/crashing path is `backdrop-filter: url(...)`. Latest visible comment is dated 2026-09-05. Proposed patches are not evidence of a shipped Safari fix.
- [Filter Effects specification: feDisplacementMap](https://drafts.csswg.org/filter-effects/#feDisplacementMapElement): defines spatial sampling based on displacement channels. The proof uses this ordinary filtered-source route.
- [WebGL 1.0 specification](https://registry.khronos.org/webgl/specs/latest/1.0/): canvas/image texture sources and origin restrictions apply to a possible GPU-owned controlled scene. WebGL is not a general DOM screenshot API.

Native Safari/iOS hardware, Combo Touch, and first-contact response are pending owner device testing. This proof alone does not establish those outcomes.
