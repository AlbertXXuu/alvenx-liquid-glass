# Local refraction options — owner selection pending

2026-10-30. Independent review branch: `codex/refraction-options-20261030`, based on preserved `b0e8874432b4b78688ff263cad9655ef15a50521`. These files do not change the production showcase, homepage, shared component defaults or package version. No option has been accepted or promoted.

## Actual baseline coverage

The b0e8874 production build remains on port 5236. Chromium DOM inspection and code agree:

| Surface | Actual b0e8874 path |
| --- | --- |
| Clarity text/grid and its free lens | New full-scene WebGL continuous sampling; separate existing rim/material overlay |
| Progress track | Registered native SVG source, not a new WebGL surface |
| Progress glass thumb | Old registered-scene SVG `feDisplacementMap`; source track visible through this thumb |
| Switch track | Registered native SVG source |
| Switch glass thumb | Old registered-scene SVG displacement |
| Message field glass background | Old registered-scene SVG displacement of the explicit field grid |
| Typed message | Native DOM input above the optical background; intentionally not refracted |
| Slider numeric capsule | Old SVG browser-backdrop filter in observed Chromium; not the new full-scene renderer |

`controlledRefraction` registers a source; it does not select the new WebGL renderer. Existing parameter sliders use the same legacy thumb mechanism. Sharing material parameters is not global renderer integration.

## Observed aliasing and edge behavior

At baseline refraction 3 / blur 0, actual thumb normal PNGs are 192×132 for a 64×44 CSS-pixel slider host and 191×127 for an approximately 63×42 switch. The field's normal PNG is 224×26 across roughly 650×74 CSS pixels. The map dimensions are independent of display DPR. Thumb SVG displacement scale is 18 CSS pixels; field scale is 39. Normals are rounded to 8-bit R/G values, introducing displacement increments up to 18/255 or 39/255 CSS pixels before browser resampling.

Same-fixture old-slider screenshots at DPR3 show a straight smooth source at refraction 0 and visible stepped/fragmented interior edges at 3. Therefore this observed defect is introduced by the optical path, and raising display DPR alone did not remove it. The source is registered vector SVG, not a DOM screenshot. The current path includes a rasterized/quantized normal field, browser SVG filter rasterization/resampling and final path clipping. The browser's internal SVG filter raster resolution is not exposed here. This audit does not isolate the exact percentage of error caused by each stage; low map resolution alone is not asserted as the sole cause.

The b0e8874 shader uses q = normalized superellipse radius, t = 1−q², and f = t³. Its source point is p−(p−center)·k·f. The center has zero positional offset but nonzero magnification through the mapping derivative. The outer region quickly approaches identity: at q=.9, f is only .006859. The visible rim is also a separate lighting overlay. That combination explains the clear center and relatively quiet perimeter. At the exact contour identity is intentional to avoid a source-image seam.

## Three live alternatives

All alternatives use one explicit Canvas2D source uploaded into a WebGL renderer and analytic superellipse sampling for the free lens, slider thumb, switch thumb and field background. No RG8 normal map or SVG transmission filter is used in this comparison. The slider/switch tracks are the shared source. The native field text stays above it. The parameter panel is ordinary native review controls, not a claimed rollout to production parameter sliders.

| Option | Profile f(t) | Visible intent | Sampling cost |
| --- | --- | --- | --- |
| A · Soft center | t³ | Previous compact center profile; quiet outside | Source capped at 2 logical samples/unit; four coverage samples |
| B · Balanced edge | t³(4−3t) | Broader clear center, visible shoulder bending and medium volume | Source cap 3; four coverage samples |
| C · Full lens | t³(10−15t+6t²) | Widest clear center, stronger outer bending, broader reflection/volume | Source cap 4; nine coverage samples; highest cost |

The center magnification is the same 1+Refraction/6 in all options (1.5× at maximum 3). All profiles preserve zero displacement at Refraction 0 and at q=1; they retain a cubic fade at the contour instead of introducing a hard optical cut. At q=.9, B/C profile weights are .023526/.050528 versus A .006859. The broader profile changes shape of the sampled image, not just outline brightness. All options retain the seven material ranges. Interaction strength affects held-shell deformation, not center optical power.

These are controlled-scene approximations, not physical ray tracing or arbitrary DOM backdrop capture. No Gaussian-free hidden blur is added to conceal maximum-refraction edges. The blur inputs explicitly select source blur; source interpolation and coverage sampling still affect antialiasing.

## Evidence and limits

Project-relative evidence directory: `output/playwright/refraction-options-20261030/`.

- `baseline-scope.txt`, `map-audit-results.txt`, `old-controlled-comparison-results.txt`: actual path/map measurements and refraction 0/3 same-fixture captures, at DPR1/3.
- `options-results.json`: 78 assertions, 18 maximum-refraction/zero-blur cases across A/B/C, widths 1365/390 and DPR1/2/3. Source dimensions, output dimensions, parameter preservation and overflow are retained.
- `input-results.json`: 12 targeted assertions for actual pointer lens drag, pointer slider input and maximum blur/progressive 6/6. Native switch, keyboard slider and message editing are also checked by the options script.
- `max-{a,b,c}-1365-d2.png` and matching `390-d3` files are same-parameter comparison captures. Representative desktop A/B/C and narrow C were visually inspected. The tracks inside thumbs are continuous in those inspected captures.
- `zero-{a,b,c}.png` plus `zero-analysis.json`: Refraction, opacity and specular all 0. The mapping is identity, but source density and coverage differ, so raster pixels are not byte-identical (mean absolute RGB A/B≈.728, A/C≈.724 on a 0–255 scale). This does not assert exact cross-profile pixel equality.
- `zoom-0.9-{a,b,c}.png` and `zoom-1.25-{a,b,c}.png`: CSS document-layout zoom, not browser-toolbar zoom or OS scaling certification.

`npm run check` and the independent review production build passed. The matrix is targeted sampling, not exhaustive combinations of all seven parameters or a formal visual-quality score. No FPS, GPU-time, device-power or physical iOS/IME/Combo Touch acceptance is claimed. WebKit's known black/stale capture and unavailable native Canvas blur remain unresolved; the new comparison is not a WebKit acceptance result. Nonzero blur requires native Canvas2D filter support and reports failure rather than secretly reducing the chosen radius.

## Run and choose

From `alvenx-design-kit/`:

```powershell
npx vite build --config showcase/refraction-options-review/vite.config.mjs
npx vite preview --config showcase/refraction-options-review/vite.config.mjs --host 127.0.0.1 --port 5238 --strictPort
```

Open `http://127.0.0.1:5238/showcase/refraction-options-review/index.html?option=a` (or b/c). The in-page buttons switch all four test surfaces without resetting the source, values or settings. Initial comparison: Refraction 3, both blur values 0, opacity .08, other accepted material defaults. The existing baseline stays at `http://127.0.0.1:5236/mobile-review.html#refraction` with its original built files.

The owner selects a visual direction first. Only then should the chosen mapping be reconciled with existing production contours, endpoint compensation, focus/hit ownership, font/IME behavior, failure recovery, scheduling and supported-browser blur before any deployment or broader integration.

## Large native panels: flat center and bounded edge (2026-10-30 follow-up)

The two owner sketches distinguish a broadly flatter face with rounded shoulders from an overall convex lens. The compact A/B/C specimens above remain perceptually closer to the second family: their center derivative magnifies the source. There is no actual solved 3D surface or height field behind those images. Neither the compact shader nor this extension traces light through refractive-index interfaces, solves Fresnel reflection or reconstructs physical thickness. The displayed cross-section is an illustrative design sketch, not a shader reconstruction or a measured glass profile.

The new `#large-panels` section adds one native multiline textarea and one selectable, scrollable article, sharing the existing A/B/C choice and all seven settings. It reuses `createRenderer` with an explicit panel mode; no fourth option or production rollout is added. Typed text, caret, paragraphs and selection are native DOM above the canvas. Only the registered grid/background is optically sampled. Content and native scroll state are not remounted when switching A/B/C.

Panel geometry uses straight sides joined to superelliptic corners of exponent 2.4 (zero curvature at straight-side joins). The corner radius is requested at 28 CSS px. Optical-band distance is estimated from the implicit contour and its gradient, not an exact Euclidean/geodesic distance. The requested edge bands are A=10, B=16, C=22 CSS px, capped by the corner radius and short side for unusually small panels. At the straight sides these are pixel distances; corners retain a controlled local scale, rather than scaling the band with the full panel height.

Within the edge band, u is normalized inward distance and the offset envelope is `64*u^3*(1-u)^3`. It and its first two derivatives vanish at both ends. At Refraction 3 its maximum requested lateral offset is 18% of the effective band: A=1.8, B=2.88, C=3.96 CSS px. The broad central source mapping is identity (1×), unlike the compact magnifiers' 1.5× center. At Refraction 0 the offset is zero everywhere. The separate selected tint/blur/reflection controls still apply; zero refraction does not disable those other parameters.

Panel height may change without increasing the requested 10/16/22 px edge bands. Native editor focus outlines identify the inner editable region; they do not represent a second glass contour. The canvas contour, edge shading and sampled region derive from the same implicit boundary.

Executed validation:

- Type/document check and independent review production build passed.
- `check-panels.cjs` / `panels-results.json`: 36 panel cases (two panels, three options, two viewport widths, DPR1/2/3), 159 assertions passed. Native long-text scroll, editor selection/value/scroll retention across option changes, reader selection/focus, no foreground CSS filter, and a 640px-tall reader retaining its 22px band/28px corner were checked. Typing did not upload or redraw the optical source during the measured operation.
- `check-panel-mapping.cjs` / `panel-mapping-results.json`: six immediate-framebuffer assertions passed. With blur, tint and specular zero, Refraction 0→3 left the center ROI byte-identical for A/B/C and changed the corner ROI. This establishes the sampled central/edge mapping distinction, not physical optics or full-frame equivalence.
- The existing compact C scene was captured again at identical parameters/viewport/DPR. Dimensions matched the prior image; mean absolute RGB difference was .01488/255, maximum 15, with 8,487 changed pixels. The general scene-size uniform therefore is not claimed to preserve byte-identical output. The comparison is in `panels-control-regression-analysis.json`.
- Same-condition captures: `panel-{editor-panel,reading-panel}-{a,b,c}-1365-d2.png` and phone captures ending `390-d3.png` in the existing evidence directory. Native selection/focus captures are `panel-editor-native-selection.png` and `panel-reader-native-selection.png`; `panel-reader-tall-c.png` records the height probe. Representative C desktop/narrow and native selection images were visually inspected.

Cost/compatibility boundaries: each added panel can own a WebGL context with three source textures, plus Canvas2D source/blur buffers and its output buffer. Each renderer retains the existing per-canvas source cap 6M pixels and output cap 3M pixels; those are not whole-page budgets. Three RGBA source textures alone can nominally reach about 72MB at that cap, before other buffers/driver overhead. Panels initialize when visible and pause scheduling offscreen/hidden; native scrolling and editing do not rasterize the text into those textures. No page-wide memory/FPS or physical-device claim is made. The existing Windows WebKit capture/native-blur limitations remain unresolved. Actual OS clipboard, full IME, touch-device caret handles and physical Safari are outside these checks.

Open the same review URL with `?option=a#large-panels` (or b/c). Existing compact controls and prior commits b0e8874 / 0f20ff5 remain available as historical source. No option has been selected for deployment or wider integration.
