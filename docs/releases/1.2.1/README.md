# 1.2.1 — stable sample typography and a connected material workbench

The owner reported a visible Chinese font substitution while editing Sample text and requested the original volume/parameter relationship to be restored. This patch keeps the v6 material, horizontal shape, native input and shared settings contract. Public source remains all rights reserved / UNLICENSED.

## Changes

- Native Sample text editing stays immediate. The refracted specimen receives committed text only after the exact Instrument Sans/MiSans 600-weight glyph faces are ready. IME preedit remains in the native editor until composition ends; outdated asynchronous completions cannot overwrite a newer edit. A loading/error status explains retained preview text. Font requests are bounded and browser font caches are reused; no full Chinese-font preload is introduced.
- Sample length is limited after composition at 18 grapheme clusters on supported engines, preserving joined emoji and Chinese input. SVG text uses the declared brand families explicitly.
- Surface parameters returns to the same volume section, directly after the volume and motion controls. The original single canvas reads the same settings as the controls; no duplicate preview or renderer is introduced.
- When the parameter panel is expanded and visible viewport height is sufficient, this same horizontal preview stays above the editing controls within the workbench. The mobile caption becomes compact but stays native text outside the shape. Navigation clearance is measured; a short viewport or software keyboard disables docking without expanding the preview above the focused field.
- Parameter values/ranges, persisted settings, 50% Progress, default opacity 0.3, both 0–6px blur ranges, continuous pointer values, B endpoints and the scoped transparent tap highlight remain unchanged.

The large preview remains an analytic 2.5D environment; the refractive specimen remains an explicitly registered SVG scene. These are distinct optical scopes.

## Version and evidence

Source is frozen under `v1.2.1`. Later online delivery records use `v1.2.1-published` without moving the source tag. Historical 1.2.0 and R1/R2/R3 assets remain unchanged. The previous production entry is retained with its original manifest; its assets keep their immutable version namespace.

Focused font tests deliberately delay the exact CJK font requests and separately exercise composition and request races. They establish browser behavior, not physical iOS keyboard certification. Actual iPhone/iPad/Combo Touch acceptance and physical first-paint timing remain owner-device checks.

The [verification record](verification.json) and [evidence manifest](evidence-manifest.json) retain completed checks. Font tests passed 35 assertions per engine; material/layout tests passed 95 in Chromium and 88 in Windows WebKit, totaling 253. The [workbench report](evidence/material-report.md) separates deterministic Chromium pixel changes from the Windows WebKit canvas limitation. A minimal unrelated WebGL fixture reproduced the known Windows-port failure after resize; no renderer buffer or continuous-redraw workaround is introduced.

Self-reviewed screenshots: [phone material editing](evidence/material-chromium-393-first.png), [lower parameters with the same preview](evidence/material-chromium-393-last.png), [desktop material editing](evidence/material-chromium-1366-first.png), [font-ready Chinese](evidence/font-ready-chromium-393.png). Before/after delayed-font evidence is retained in the same folder. The behavior follows [CSS Font Loading](https://drafts.csswg.org/css-font-loading/#dom-fontfaceset-load) and the [compositionend contract](https://w3c.github.io/uievents/#event-type-compositionend).

The [publication receipt](publication-receipt.json) records source `17a47f4cd67cbed9176582cb2d6809a3dffabc9d`, source tag `v1.2.1`, and deployed Worker `2f460e2c-93da-4e57-8fbc-8a5c45683584`. Fresh online Chromium/Windows WebKit checks passed 57 assertions at 393/1180px with zero page/network/console/CSP errors, including actual delayed-font publication and the one-canvas material workbench. See the [online curation notes](final-verification/online-curation-notes.json), [HTTP byte checks](final-verification/online-http-verification.json) and [final evidence manifest](final-evidence-manifest.json). Windows-port focus-edge/compositing limits are retained explicitly, not converted into physical Safari acceptance. Publication records follow separately under `v1.2.1-published` without moving the source tag. Historical performance numbers are not new benchmarks for this patch.
