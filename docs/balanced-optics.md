# Selected B — local integration contract

The owner selected B on 2026-10-31 and approved the zero-blur rim on 2026-11-05. The `1.5.0-agent.1` package carries that implementation. Its normal B rim is composited against the sampled Canvas pixels inside the current contour. See the [Agent integration guide](agent-integration.md) for consumption.

## Which surfaces use B

- `GlassSlider` and `GlassSwitch` now default `controlledRefraction` to true. Their canonical track is explicitly registered as both SVG and Canvas source. The same C2 shell, rim, focus/hit path, endpoint compensation, continuous pointer value and native numeric editing remain. `controlledRefraction={false}` opts out and uses the browser-host fallback.
- `ControlledScene`/`ControlledSource` accept `paintCanvas(ctx, size)` in addition to their existing `paint(size)` SVG callback. The Canvas painter must fill the complete scene, can await font readiness, and is versioned against stale completion. A pending/failed source leaves the native/SVG base available. Optional `paintSelection(size)` draws transparent native SVG text above the raster for selection; it must not pass semantic foreground editors through filters.
- `LiquidControl` with an available registered Canvas source and `optics="auto"` samples B. Explicit `optics="svg"` retains the old registered SVG transmission for diagnostics/backward inspection. Without a Canvas source, auto chooses native blur or flat styling rather than pretending to supply B magnification. Compound custom contours retain their existing separate behavior; arbitrary DOM capture is not offered.
- `GlassPanel` supplies a calm explicit background, a flat central map and a pixel-bounded B shoulder. `diagnostic` optionally shows a subtle grid; the normal state omits it. Place native textarea/DOM content in its foreground. Use `scrollable={false}` when a native textarea owns scrolling. Provide at least 160×140 CSS px for useful content; 360px height is the default, 140px the CSS minimum. The panel renderer rejects geometry below 64px per side and falls back instead of computing invalid normals.

```tsx
import {GlassPanel, useGlassSettings} from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/fonts.css';

export function ReadingSurface() {
  const {clock} = useGlassSettings({storageKey:'my-reading-glass'});
  return <div className="alvenx-design">
    <GlassPanel id="editor" label="Draft" clock={clock} scrollable={false}>
      <textarea aria-label="Draft" defaultValue="Your words stay native." />
    </GlassPanel>
  </div>;
}
```

The seven material ranges, Reset defaults and stored settings are unchanged. Optical B does not mean changing the original blur settings to zero. Maximum refraction 3 gives compact lenses 1.5× center magnification, with `t³(4−3t)` displacement falloff; panels retain 1× central mapping and an approximately 16 CSS-pixel edge band, capped by local radius/short side. These are art-directed explicit-scene mappings, not physical thickness/refractive-index ray tracing or Apple's renderer.

## Resource and compatibility behavior

One lazy offscreen WebGL context is shared by the B consumers. Source textures are LRU bounded to eight million allocated pixel slots; each source is capped at three million pixels, each output at two million. A shared blur scratch texture can add up to two million pixels. These counts exclude browser/driver overhead, Canvas2D source/target buffers and the independent large-volume renderer, so they are not a whole-page VRAM measurement.

The two-pass dense Gaussian blur supports the full 0–6px base/progressive ranges, without dependence on `CanvasRenderingContext2D.filter`. B copies each completed frame immediately into a normal 2D target canvas, with a two-color capability probe. This avoids exposing the directly composited WebGL canvas that produced black/stale captures in the Windows WebKit fixture. It does not certify physical Safari/iOS.

Missing WebGL/high precision/copy support, allocation/upload/draw failure or context loss degrades to native blur when supported, otherwise flat styling. Native values, focus, text selection and editing remain operable. The mode/error are exposed by `data-optical-mode` / `data-optical-error`; no hidden radius clamp is substituted for requested blur. A graphics failure is latched to avoid retry loops; remount/reload permits a fresh attempt. GPU resources are released when the last consumer unmounts. Offscreen sources defer raster updates; clocks stop when idle/hidden. Native textarea scrolling/typing does not rasterize text into the optical texture.

Windows WebKit Canvas variable-weight rendering was observed to change metrics without changing stroke weight. Three renamed static Instrument Sans instances are used for optical-source Latin only. Original files and OFL remain; build provenance and license are in `assets/fonts/optical/NOTICE.txt`. Native product text continues to use the original Instrument Sans/MiSans stack.

## Validation scope

Targeted Chromium and Windows WebKit checks include material extremes, DPR1/2/3 and narrow layouts, pointer/keyboard interaction, source text updates, native editing/selection, CSS layout zoom, failure injection and installed-consumer lifecycle. Raw evidence and exact outcomes are in the local `output/playwright/b-stability-20261031/` directory and the adjacent versioned review record. A finite parameter matrix is not exhaustive seven-dimensional visual acceptance.

Browser-toolbar zoom, OS scaling/caret handles, physical iOS/Safari/IME/Combo Touch, Firefox and device power are not certified by those tests. CSS `zoom` checks establish operability, not exact contour/endpoint alignment under every transformed ancestor. The unchanged large 2.5D volume has its previously documented Windows WebKit capture limitation; B's registered-scene checks do not recertify that renderer.

Transient NetworkError failures in visible registered sources retry with 1/2/4/5-second backoff; online/focus wakes an earlier attempt. Hidden/offscreen/unmounted or superseded work cancels retry scheduling. The showcase resets failed requested CSS font faces and their failed URL cache entry before loading again. The frame clock accepts an optional prepare phase for host translations before optical rendering; externally committed B position changes are corrected before paint. See the 2026-11-04 follow-up in the selected-B review record.
