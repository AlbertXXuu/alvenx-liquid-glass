# AlvenX Liquid Glass asset record

Recorded on 2026-11-25 from production-equivalent candidate 5199 for the `/ui/` showcase. Each screenshot uses the kit’s public demonstration content. The [measurement receipt](measurements.json) lists browser versions, measured geometry, relevant SHA-256 values and the media inventory. The captured build loaded `main-NfNpivgs.js` and `main-BzkZphjV.css`.

## Candidate 5199

| Check | Browser observation | Evidence |
| --- | --- | --- |
| Header and menu | At a viewport width of 890 CSS px, the Design row is 383.5 px wide and activates at its far edge. The curved light and transmitted text cover 74.56 px around the label. The compact tray and label each use eight cubic segments. Keyboard focus, language selection, forced colors and the native optics fallback passed. | [Desktop header](menu-desktop.png) · [890 px menu](menu-compact-890.png) · [390 px menu](menu-narrow-390.png) |
| Right-chamber title | The center of “Interactive preview” follows the visible chamber at horizontal fraction 0.5 and vertical fraction 0.382 from the top. At widths of 1440, 768 and 390 CSS px, the settled maximum axis error was 0.01 CSS px. During the held drag, it was under 0.017 px. The title remains hidden during early growth and is available in reduced motion and the renderer fallback. | [Desktop chamber](chamber-title-desktop.png) · [390 px chamber](chamber-title-narrow-390.png) |
| Shared control light | The input, send button, switches and sliders receive the stage’s 48-second light cycle. The input and send button show pixel changes at 1200 and 390 CSS px while their geometry stays fixed. Enter submits the sample message. Eleven Chromium rails retained their native targets and visual boxes while the highlight turned. A narrow WebKit switch also retained its box with zero page overflow. | [Moving composer light and Enter submission, WebM](shared-light-controls.webm) · [Rail phase A](rail-light-phase-a.png) · [Rail phase B](rail-light-phase-b.png) |

The light pauses when Background motion is switched off, with the reduced-motion preference, and when the document is hidden. A specular-opacity value of zero removes the rail highlight. Forced colors retains the native controls. The moving-light clip is 8.92 seconds at 1200 × 780 and uses fixture input.

## Earlier comparisons

- **Normalized title placement.** Build 5198 is the baseline before the chamber anchor. At 390 CSS px its settled title center was offset −67.26 px horizontally and +150.66 px vertically from the later target. The receipt retains the earlier offsets at 1440, 768 and 390 px.
- **1× text sampling.** An older build uses a different lens outline and allows explicit linear-versus-nearest sampling of the same warped text. The share of sampled desktop text-edge pixels with intermediate tones was 94.51% with linear sampling and 91.81% with nearest sampling. The four desktop and narrow 1× and 2× comparisons recorded zero pixels beyond the boundary exclusion band above the 4-level per-channel threshold. [Linear](historical-1x-linear.png) · [Nearest](historical-1x-nearest.png)
- **Gaussian prefilter.** An earlier source-module harness measures a synthetic one-sided alpha edge between 10% and 90% alpha. With the expanded Gaussian prefilter, base 6 and progressive 0 produced a 14.5 CSS px transition at center and shoulder. Base 0 and progressive 6 produced a 0 px center transition and a 19 px shoulder transition at both DPRs. The stronger run used a longer plateau and wider sample window to capture the full transition. [Legacy narrow kernel](historical-blur-legacy.png) · [Expanded prefilter](historical-blur-prefilter.png)

## Reproduce from source

Use Node 20.19 or later. In the root of the [Liquid Glass source repository](https://github.com/AlbertXXuu/alvenx-liquid-glass), run the project checks and build the static showcase.

```sh
npm ci
npm run check
npm run build
npm run test:contract
npm run test:runtime
node scripts/test-text-lens-motion.mjs
npm run preview
```

Open the preview at [127.0.0.1:4174](http://127.0.0.1:4174/). The deployed showcase and its evidence are served under `/ui/`. The receipt’s build hashes identify the captured candidate. Rebuilds with a different source snapshot can produce different filenames and hashes.

1. At 1440 px, move across the desktop navigation and tab to a link to check focus. At 890 px, open the compact menu, hover the label, then activate the far edge of the Design row. Repeat the menu-open and close checks at 390 px.
2. At 1440, 768 and 390 px, let the volume grow. Compare the title center with the visible right chamber before and during a held drag. Reload with reduced motion and confirm the title remains available.
3. Leave the composer visible for five seconds with the pointer outside its controls. Compare the high point of the glass on the input, send button and rails. Toggle Background motion and check that the light holds its phase. Repeat with reduced motion and use Enter to submit sample text.
4. In the text-lens study, compare 1× and 2×. Move Refraction level to zero to check registration, then change Blur level and Progressive blur separately. Compare each setting at the center and shoulder. Check the native editing path with keyboard, selection and composition.

Maintainer entry points are `src/VolumeStage.tsx` and `showcase/mobile-review/review.css` for chamber coordinates, `showcase/mobile-review/StudioLight.tsx` for shared light, `showcase/mobile-review/HeaderNavTransmission.tsx` for menu label transmission, and `src/lensTransmission.ts` and `src/balancedOptics.ts` for the shared optical kernel. The [design and replay notes](../../../design-record.md) link the project’s browser QA callbacks and explain their fixture and invocation. [Text lens and shared environment light](../../../text-lens.md) documents the rendering paths and constraints.
