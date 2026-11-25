# Selected B: local stability checkpoint

The owner selected B on 2026-10-31. This checkpoint fixes version `1.5.0-local.0` on `codex/liquid-glass-b-stable-20261031` for independent incremental review. Resolve the exact commit with `git log -1` for this directory; the external `delivery-local.json` records it without a self-referential source hash. No push, tag, registry publication or deployment is part of this checkpoint.

The default showcase now uses B for registered Canvas scenes, slider/switch tracks and the input background. Native text, editor content, caret and selection stay outside optical filters. Exported `GlassPanel` has a quiet central map and a bounded edge shoulder; its diagnostic grid defaults off. Compact lenses retain central magnification up to 1.5×. This is an artistic background mapping, not a physical thickness/index ray tracer. See [the integration contract](../../../balanced-optics.md).

One pooled offscreen WebGL context produces immediately copied Canvas2D frames. Dense two-pass blur supports both full 0–6px ranges. Source/output/cache limits and last-client cleanup are explicit. Unsupported graphics and allocation/upload/context failures fall back to native blur or flat styling. A failed session is latched; remounting all clients or reloading retries. Three renamed OFL static Latin faces fix the observed Windows WebKit Canvas variable-weight stroke mismatch; original font files and native UI typography remain.

## Evidence and checks

Raw protocols, screenshots and logs are in the local `output/playwright/b-stability-20261031/` directory at the parent project root. [evidence-index.json](./evidence-index.json) records their lengths and hashes. [results.json](./results.json) records counts and installed-source identity. Small result files are copied here; large raw matrix/screenshots remain local.

| Check | Result |
| --- | --- |
| Type/document check, production build | Passed |
| Existing contract/geometry/volume tests | Passed; unchanged geometry algorithms retained |
| Runtime tests | 16 clock, 180 pixel-budget, 1,000 exact ROI and 4,800 boundary cases passed |
| Parameter matrix | 37 cases each in Chromium and Windows WebKit; seven numeric settings matched, registered B active, no horizontal overflow/page exceptions |
| Interaction | 48 assertions per engine: native pointer/keyboard, drag, selection, editor/reader scroll retention, source edits, CSS zoom operability |
| Graphics faults | 50 assertions per engine across five failures; fallback remained editable, allocations released and repeated GPU retry avoided |
| Final installed tarball | Independent install/type/build passed; package source/assets/styles/dist bytes matched local files; 25 browser assertions per engine over three mount/unmount cycles |
| Final post-font smoke | 16 assertions per engine at 1365px/DPR2 and 320px/DPR3 |
| Font check | Hard-reload test verified static faces and heavier 600-weight stroke in both engines |
| Performance | 12 alternating baseline/candidate production runs, blur 0/6, N=3; no measured main-thread long tasks in scripted phases; settled candidate idle produced no draws/uploads |

The parameter matrix, interaction, fault and performance runs precede the final static-font adjustment. The final font, installed-package and smoke checks cover the final implementation; the shader/geometry algorithms did not change in that adjustment. Finite cases do not establish exhaustive seven-parameter visual acceptance. Screenshots were inspected selectively, including maximum refraction and narrow WebKit output.

Two initial interaction harness checks observed transitions too early; they were corrected to await native values/displayed geometry. The context-loss harness similarly awaits fallback on the next clock frame. A font probe initially reused a same-document page with stale styles; the final probe reloads and verifies actual FontFace presence. These harness corrections are not product fixes or silently discarded product failures.

## Scope and limits

Registered Canvas backgrounds receive B. Unregistered or SVG-only auto sources use native/flat fallback; explicit legacy SVG and compound/custom contours retain their separate paths. The large pearl/volume renderer and homepage production entry are unchanged. Baselines `b0e8874`, `0f20ff5` and `db73ade` remain recoverable.

Windows WebKit registered B capture/blur and static-font checks pass. This does not recertify the separate large-volume renderer's known WebKit capture limitation. Physical Safari/iOS, OS IME/selection handles/Combo Touch, Firefox, browser-toolbar zoom, OS scale and device power remain untested. CSS zoom checks establish operability rather than exact contour/endpoint alignment under arbitrary transformed ancestors.

Performance timings include automation and deliberate waits; they are not FPS, GPU timings, first-frame latency or cold-cache claims. GPU counters do not count the baseline SVG renderer's work. The eight-million texture-pixel cache limit excludes shared scratch/output, CPU canvases, browser/driver overhead and the separate volume renderer.

## Local review

- Candidate production build: <http://127.0.0.1:5241/?build=b-20261031#refraction>
- Candidate large panels: <http://127.0.0.1:5241/?build=b-20261031#large-panels>
- Frozen `db73ade` build: <http://127.0.0.1:5236/>
- Historical A/B/C comparison: <http://127.0.0.1:5238/showcase/refraction-options-review/index.html?option=b>

The pre-existing comparison is historical and is not the selected formal default. Preview availability depends on the local processes remaining running. The coordinator arranges independent review; passing these developer checks is not independent acceptance.

## 2026-11-04 recovery and drag correction

Version `1.5.0-local.1` supersedes the above local candidate for the following fixes. A stopped localhost preview left cached HTML visible while deferred optical fonts failed, and retrying the same rejected CSS FontFace could not recover. Visible registered sources now retry NetworkError with 1/2/4/5-second backoff, wake on online/focus, and cancel their timer when hidden/offscreen/unmounted or superseded. The showcase recreates only failed requested CSS faces and replaces one retry URL token to bypass negative caching. Successful restoration clears the diagnostic and replaces the native fallback without reloading or resetting drafts. Unsupported APIs and GPU failures retain their separate fallback contract.

The freely dragged lens also moved through a React commit after optical consumers had sampled the old DOM position. The clock now has a preparation phase for host translations before optical rendering. A layout correction covers other committed B position changes and skips already aligned frames. The same drag protocol recorded a maximum 17.53px mismatch before and zero afterward in Chromium; the final Windows WebKit run also recorded zero mismatch. Preparatory/cleanup ordering has two new regression cases in the clock contract (18 checks total).

In both browsers, aborted font requests followed by restored access recovered to B in the same document (one load event), preserved a typed draft, cleared source errors and settled idle. The measured delayed recovery was about 9.6 seconds in these background test contexts; the backoff interval is not a network-completion deadline. Type/build, existing contract/runtime and final independent tarball installation passed. Exact observations, environment and hashes are in [recovery-20261104.json](./recovery-20261104.json). The two adjacent `regression-*.cjs` files are Playwright CLI run-code protocols; use a local candidate at port5241 and adjust the screenshot output path before replay elsewhere. This follow-up is local and does not imply a deployment or independent acceptance.

## 2026-11-05 zero-blur edge candidate

The owner opened the local candidate at `4bda813ecc4ffbfe8fab0d535903e0664a0deee6` and reported “我看着感觉挺好的” on 2026-11-05. This records acceptance of the displayed zero-blur appearance. The [Agent reuse package](../../../agent-integration.md) carries this implementation.

A local candidate based on 1.5.0-local.1 retains B refraction and replaces only its normal SVG rim stroke with the same contour drawn inside the existing Canvas2D clip using multiply against sampled background pixels. Its specular lighting filter, glass fill, focus outline and non-B rendering stay independent. The visible rim is on the inner side of the same C2 contour. No parameter range, source/output budget or blur default changes.

At 1100px viewport/DPR2, refraction=3, both blurs=0, glass opacity=0, specular=1 and no focus, a magnified comparison of the same Clarity/y intersection showed a bright diagonal across dark ink. Specular=0 and an isolated stroke-hidden diagnostic reduced it; keyboard focus had contaminated the first diagnostic and was explicitly removed in all final images. A separate one-variable 16-sample shader diagnostic barely altered the image (global mean absolute RGB difference 0.0071/255, 446 pixels >2), while a source-density 3-to-2 diagnostic had visibly broader texture effects. The analytically sampled actual C2 spline differs from the Lamé boundary by at most 0.0032 CSS px of displacement for the tested 151×96px contour/refraction=3; maximum internal local mapping singular value was about 1.47 CSS px per output CSS px (2.20 source texels/output device pixel at source 3× and DPR2). These numbers do not prove a universal root cause at all scales.

With the candidate, the maximum red-channel lift against a specular-zero reference in the measured dark-ink region fell from 85 to 20/255; that reference also changes specular lighting and is a comparative measure, not a complete isolated error metric. Zero blur and blur=2 images were captured in Chromium and Windows WebKit, with B and 1.5× magnification confirmed. Focus remains present on keyboard operation and absent after blur. Chromium/Windows WebKit drag checks recorded zero position mismatch; the WebKit run recorded 37 of 38 animation intervals over 25ms, maximum 40ms, so it does not demonstrate smooth frame rate. Chromium injected font failure recovered in the same document with a draft retained. Check, build, contract and runtime checks passed. Physical-device verification and Agent-specific visual acceptance remain open.

Evidence is under the parent project `output/playwright/edge-20261105/`, especially `unfocused-sharp.png`, `unfocused-no-spec.png`, `candidate-canvas-0.png`, `candidate-canvas-2.png`, `candidate-webkit-0.png`, `candidate-webkit-2.png`, `candidate-canvas-detail.png`, `motion-webkit.txt` and `font-candidate.txt`. The owner screenshot could not be materialized; see the separate `output/library-zero-blur-20261104/materialization-status.json` receipt. No direct comparison against that screenshot has been performed.

Evidence correction: while replaying the 2026-11-04 font regression, its script overwrote `output/playwright/b-recovery-20261104/auto-restored.png`; the original screenshot hash in `recovery-20261104.json` no longer matches and a byte-identical copy was not located. That earlier screenshot must not be presented as hash-verified evidence. Its original log and other recorded checks remain.
