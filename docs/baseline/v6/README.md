# Material direction review — v6 B controls and numeric editing

**Local review preview — not integrated. Visual approval remains pending.**

Run `npm run dev` in the AlvenX-UIUX repository, then open:

http://127.0.0.1:5173/work/material-direction-preview/index.html

This requires the repository's local Vite runtime, existing React dependencies, shared geometry/normal-map modules, and font/brand assets. It is **not standalone offline HTML**. Instrument Sans and MiSans remain native DOM text; the large realtime shape does not load an orb PNG.

## Nine settings

The two motion switches and seven numeric parameters are shared review settings. The ranges below are product choices for this sample, not universal material or industry limits.

| Setting | Meaning | Range | First open / Reset | Manual precision |
| --- | --- | --- | --- | --- |
| Background motion | Slowly changes the blue/lilac environment field. | Off / On | On | — |
| Reduced motion | Suppresses decorative movement and elastic response; system reduced-motion preference still takes priority. | Off / On | Off, unless system requested | — |
| Interaction strength | Amount of the proximity, press and drag response. Zero disables that response without turning off Background motion. | 0–4× | 2.5× | 2 decimals |
| Specular opacity | Opacity of the mirror/highlight contribution; zero does not remove every faint structural edge. | 0–1 | 1 | 3 decimals |
| Specular saturation | Colour intensity of the reflected/highlight layer. | 0–3 | 2 | 2 decimals |
| Refraction level | Strength of background displacement. | 0–3 | 2 | 2 decimals |
| Blur level | Uniform base blur in the transmitted background. | 0–6 px | 2 px | 1 decimal |
| Progressive blur | Additional blur weighted by the surface thickness field. | 0–6 px | 2 px | 1 decimal |
| Glass background opacity | Amount of the pale glass body fill; increasing it hides more of the background. | 0–1 | **0.3** | 3 decimals |

The latest requested default is **0.3**, superseding 0.5. Both blur ranges remain **0–6 px**. Existing valid saved values are retained; Reset defaults explicitly applies the current baseline. The storage key remains `alvenx-material-direction-v2`.

Local optics now bound interactive gain before multiplying Refraction level, so the newly exposed upper range changes actual displacement. The body fill reaches opacity 1 instead of silently stopping at 0.7. RGB channels are bounded. The separate renderer owner updated the large-body parameter bounds and bounded fill mapping; the main application was not integrated as part of this sample.

## Numeric editing contract

Each value has a small glass text field with spinbutton semantics, a decimal input keyboard hint, minimum/maximum/current ARIA values, precision help and visible correction feedback. DOM glyphs remain outside optical filters.

- Typing preserves the raw draft and caret. **Enter or blur** commits; **Escape** cancels. Empty, incomplete or invalid text restores the last valid value. Drafts never enter persistent settings.
- Commit requires the entire trimmed string to be a finite decimal number. Fullwidth digits, signs and decimal points normalize to ASCII. Complete finite scientific notation is accepted, for example `3e-1 → 0.3`; hexadecimal, thousands separators, partial suffixes, `NaN`, `Infinity` and overflowing exponents are rejected.
- Values are clamped to the nearest boundary, then rounded with decimal half-up arithmetic to the parameter's precision. Examples: opacity `0.12345 → 0.123`, refraction `1.236 → 1.24`, and `1.005 → 1.01`. Negative zero displays and stores as zero. Correction messages include the range and resulting value.
- Bare **Up/Down** immediately apply one precision quantum: 0.01, 0.001 or 0.1. **Home/End** immediately apply the parameter boundary. Modified keys, selection, horizontal caret movement and ordinary text editing keep browser behaviour. Text composition does not intercept Enter or commit while active; leaving during an unfinished composition retains the prior value.
- The field accepts at most 32 characters. An overlong paste is rejected as a whole, with visible feedback, rather than truncated into another number. Complete parsing also checks the length.
- Focusing a rounded display and leaving it untouched does **not** rewrite an existing continuous value. Only an actual manual edit is rounded. Slider pointer values remain continuous (`step="any"`); their existing keyboard steps remain separate from number-field precision.
- Numeric commits update the shared value directly and clear pending slider input. An edit followed immediately by Reset defaults therefore ends at the reset baseline, without a delayed blur commit restoring the edit.

## B geometry retained

The lens keeps the existing C2 contour at fullness 2.4. `endpointGeometry.ts` derives its end curvature radius **R** from the unrounded source spline. Resting endpoint gap is **R − r**, where **r** is the rail cap radius: about 15.5 px for sliders and 8.7 px for switches at these sizes. This is a local end-curvature match, not a constant gap around the entire outline.

Fixed rail insets depend only on resting geometry. Hover/press instead compensate current shell width, height and X/Y shift, preserving cap-centre alignment and the short resting footprint. Pointer deltas remain continuous. Elastic overdrag is separate from legal value, both control families return continuously, and re-grabbing preserves the current return offset. The v5 evidence is retained; v6 does not replace the B interaction with a stepped numerical position.

## Evidence and limitations

`evidence-v6/` holds current screenshots and bounded numeric/range checks. `input-checks.json` covers precision, untouched values, fullwidth/scientific input, invalid restoration, bare and modified keyboard actions, saved values and the Reset race. `input-edge-checks.json` adds exact decimal keyboard stepping, visible paste rejection and composition-validity state. Native screenshots include `default-v6.png`, `parameters-v6.png`, `number-edit-focused-v6.png` and `correction-visible-v6.png`.

The 17.12-second `numeric-editing-v6-original-speed.webm` is a native, unedited recording of manual precision correction, a clamped value and Reset during editing. Independent evidence is included as `review-v6-input-contract.json/.png/.cjs` (390px, 27 manual-input cases and no horizontal overflow), `review-v6-b-regression.json/.png/.cjs` (B geometry/returns at strength 4 and zero response at strength 0), and `review-v6-renderer.json/.cjs` (actual WebGL range changes and uniforms). Strict preview-entry TypeScript checking and the in-memory Vite build passed. `QA.json` states the bounded scope; `SOURCE-MANIFEST-v6.json` records the current source and evidence hashes.

Clipboard-event rejection and composition lifecycle were tested with synthetic DOM events; this is **not** a claim of complete OS clipboard or input-method compatibility. Ordinary keyboard, filling, focus and blur use isolated Chromium. The user's in-app browser is not operated.

The large body refracts an analytic environment, not arbitrary DOM pixels. Small controls use actual browser backdrop pixels. Parameter expansion and continuous input do not imply a universal frame-rate guarantee. Other browser engines and production integration remain outside this review. Earlier v5 media and geometry/return evidence remain historical, with the former default opacity superseded by 0.3.
