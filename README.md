<p align="center"><img src="assets/brand/alvenx-wordmark.svg" width="250" alt="AlvenX" /></p>

# AlvenX Liquid Glass

Full pearl volumes, refractive controls, and continuous motion. An independent React 19 design kit with a live material playground, a precise design specification, and measured rendering evidence.

**[Explore the live showcase](https://alvenx.com/ui/)** · [Design language](docs/design-language.md) · [Integration guide](docs/integration.md) · [Performance comparison](https://alvenx.com/ui/docs/hover-comparison.html)

[![The live AlvenX pearl volume and glass controls](public/social-preview.png)](https://alvenx.com/ui/)

**Publication status:** Source release [v1.3.2](https://github.com/AlbertXXuu/alvenx-liquid-glass/releases/tag/v1.3.2) and its tested packages are public. Website deployment is pending API upload connectivity; the live showcase still serves 1.3.1. See the [verified source and current production state](docs/releases/1.3.2/source-publication.md).

Version **1.3.2** brings the horizontal demonstration into the opening view. A compact gradient title and Replay control replace the long introduction and separate first-section heading. Slow budding plays once when the stage first becomes visible in the foreground; Replay then starts another cycle. The showcase defaults to English and offers a dedicated Language selector for a complete Chinese presentation, with MiSans readiness checked before switching. The reusable `MenuToggle` preserves the official site's two-line navigation pattern. See [the 1.3.2 record and validation status](docs/releases/1.3.2/README.md).

Version **1.3.0** adds a reusable `BuddingLink`: one empty mother form grows through a soft connection into a native link chamber, using the existing actual-backdrop glass material. Its real document width pushes neighboring content continuously. The [live homepage](https://alvenx.com/) uses it between Explore the work and GitHub. See [the 1.3.0 record](docs/releases/1.3.0/README.md).

Version **1.3.1** moved only the typed-text start inside the existing message field. Its field dimensions, contour, send button and placement remain the accepted baseline; none of the independent A/B/C sizing variants was selected. See [the measured correction](docs/releases/1.3.1/README.md). Authoring specifications are in Chinese; product and demonstration copy defaults to English, with Chinese available by explicit choice in the current source showcase.

The [19 October review ledger](docs/reviews/2026-10-19/README.md) preserves the rejected R1, intermediate self-review, R2/R3 screenshots, source snapshots and their original acceptance status. Those historical review URLs and records remain separate from the current release. Neither publication nor this revision changes the recorded v6 acceptance or grants a reuse license.

The current showcase keeps the volume, motion controls and material parameters in one section with normal document scrolling. Expanding Surface parameters does not pin, resize or restyle the horizontal form. The default specimen uses English; editing it in Chinese retains immediate native drafts, IME composition and font-ready specimen updates. Ask anything keeps its local message Easter egg. The homepage's independently pinned 1.3.0 entrance remains between Explore the work and GitHub, revealing its “explore me!” chamber through continuous growth.

## Try it locally

Use Node.js **22.13+** (or Node 20.19+ supported by the kit), npm, and React 19:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5174/`. Drag the sliders beyond their endpoints, re-grab during the return, move the lens across text, and edit the material values directly. Reset restores the material defaults, including **glass background opacity 0.3**. Both blur ranges remain **0–6 px**.

## What is included

- `BuddingLink`: one continuous mother/neck/chamber, native reveal/link semantics and real layout growth.
- `MenuToggle`: canonical two-line mobile navigation, a native 44 px button with controlled disclosure state.
- `LiquidControl`: contour-matched button, field, lens and circular control surfaces.
- `GlassSlider`, `GlassSwitch`, `GlassNumber`: continuous gestures, bounded overdrag, release-only spring return and validated numeric drafts.
- `VolumeStage`: mother form, soft connection and expanding content chamber, with opt-in first-visible budding and a canvas pixel budget.
- `GlassClock` and `useGlassSettings`: shared activity scheduling, visibility handling, settings persistence and reduced motion.
- `ControlledScene` and `ControlledSource`: opt-in shared SVG sources for displacement inside a lens, including engines where SVG backdrop displacement is unavailable.
- Scoped CSS, blue/indigo/violet tokens, canonical AlvenX assets, Instrument Sans and MiSans with their individual licenses.

Large forms use an analytic 2.5D environment approximation. Small glass controls can refract the actual browser backdrop where supported. The current showcase instead demonstrates an explicitly registered SVG scene: the visible background and its lens share the same source. This is real displacement of that source, without arbitrary DOM backdrop capture. Text and native fields outside the lens remain clear and selectable. See the [compatibility contract](docs/compatibility.md).

## Use in another React project

Build and create a local package; the versioned tarball can be installed directly. The package is **not published to the npm registry**.

```sh
npm run build
npm run pack:kit
# In your React 19 project:
npm install ./alvenx-liquid-glass-1.3.2.tgz
```

```tsx
import {
  GlassSlider,
  LiquidControl,
  useGlassSettings,
} from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/fonts.css';

export function GlassExample() {
  const { clock, settings, updateSettings, reset } = useGlassSettings({
    storageKey: 'example-project:glass:v1',
  });

  return (
    <section className="alvenx-design">
      <GlassSlider
        id="interactionStrength"
        label="Interaction strength"
        min={0}
        max={4}
        step={0.1}
        unit="×"
        value={settings.interactionStrength}
        clock={clock}
        onChange={(value) => updateSettings({ interactionStrength: value })}
      />
      <LiquidControl id="example-reset" className="example-reset" clock={clock} onClick={reset}>
        Reset defaults
      </LiquidControl>
    </section>
  );
}
```

The host owns layout, control dimensions and actions:

```css
.alvenx-design .example-reset { width: 148px; height: 44px; }
```

For SSR, custom backgrounds, alternate rendering and lifecycle guidance, read the [integration guide](docs/integration.md). Public visibility does not itself grant a reuse license; see the license section below.

## Verification and measured limits

```sh
npm run check
npm run build
npm run test:contract
npm run test:runtime
node scripts/verify-kit.mjs --baseline-only
npm run pack:kit
npm run test:install
```

The original v6 acceptance manifest is preserved with its 41 files. Contract tests compare current geometry and endpoints against that frozen source. Runtime checks cover clock cadence, pixel budgets and exact normal-map output; a fresh consumer install checks package exports and the README example.

The measured 1.1.0 → 1.1.1 sustained-hover case reduced median scripting occupancy **32.75% → 25.47%**, and total main-thread occupancy **57.64% → 54.96%**. Three settled-state image comparisons were pixel-identical. This is one documented desktop scenario, not a universal performance guarantee. See the [self-contained comparison](docs/hover-comparison.html) for the method, samples and visual evidence.

Automatic backdrop rendering selects SVG backdrop refraction in validated Chromium environments and compatible native/flat appearances elsewhere. Explicit registered scenes use ordinary SVG source displacement independently of that backdrop policy. The versioned evidence covers Windows Chromium, Firefox and Playwright WebKit within its stated scenarios; physical Safari/iOS, Combo Touch, OS IME, assistive technology and sustained mobile power use remain validation work. The 1.2.0 scoped tap-highlight change targets the native grey overlay reported on iPad, while retaining authored press response, keyboard focus and text editing; Windows WebKit cannot certify the iOS-specific overlay's disappearance. See [compatibility](docs/compatibility.md) and [runtime quality](docs/runtime-quality.md).

Raw machine-specific audit files stay local in ignored `docs/validation/`; the public comparison embeds its relevant screenshots and measurements. Source checks regenerate their own reports. Historical validation is identified by version rather than presented as a test of later changes.

With Playwright CLI available, run the real showcase header, narrow-layout and navigation checks against an open local or public showcase:

```sh
playwright-cli -s=glass-qa open http://127.0.0.1:5174/
playwright-cli -s=glass-qa run-code --filename=scripts/showcase-browser-qa.cjs
playwright-cli -s=glass-qa close
```

## Documentation and source map

| Path | Purpose |
| --- | --- |
| [Design language](docs/design-language.md) | Contour, edge light, typography, B endpoints and numeric input contracts |
| [Integration](docs/integration.md) | React API, host responsibilities and adaptation points |
| [Navigation](docs/navigation.md) | Canonical two-line disclosure, focus, keyboard and host layout responsibilities |
| [Runtime quality](docs/runtime-quality.md) | Scheduling, buffers, cache, pixel budgets and measured costs |
| [Compatibility](docs/compatibility.md) | Rendering probes, automatic selection and validation boundaries |
| [Baseline and checklist](docs/baseline-and-checklist.md) | Acceptance identity and versioned checks |
| [1.3.2 release record](docs/releases/1.3.2/README.md) | Current opening, first-visible budding, explicit language selection and validation status |
| [1.2.0 release record](docs/releases/1.2.0/README.md) | Historical production changes, publication identities and device acceptance boundaries |
| [Attribution](docs/attribution.md) | References and individual asset notices |
| `src/`, `styles/`, `tokens.json` | Library implementation and scoped styles |
| `showcase/` | Editable public playground; build emits `site-dist/` |
| [SKILL.md](SKILL.md) | Project-local instructions for subsequent design work |

## License and attribution

Copyright © 2026 AlvenX. Source and design are publicly viewable with **all rights reserved**, as explicitly confirmed by the owner on 2026-10-18; no open-source reuse license is granted; `license: UNLICENSED` and `private: true` prevent accidental npm publication. This is not an MIT-licensed project. Brand assets and fonts retain their separate terms. Instrument Sans uses SIL OFL 1.1; MiSans uses its own bundled agreement. Preserve all notices. See [LICENSE-NOTICE.md](LICENSE-NOTICE.md).

The optical studies by [Kube](https://kube.io/blog/liquid-glass-css-svg/) and [Apple's Liquid Glass design session](https://developer.apple.com/videos/play/wwdc2025/219/) informed the research. This is AlvenX's implementation and design language; it does not use Apple's native renderer.
