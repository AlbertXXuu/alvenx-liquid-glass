# Pearl edge correction — 2026-10-25

The owner reported a few dark pixels at the left and right ends of the `explore me!` chamber, making its curved sides look vertically clipped. This correction is limited to the independent anchored, pink response review.

## Reproduced cause and repair

Two separate edge mechanisms were isolated:

1. Empty profile columns used inverted bounds (`top = height`, `bottom = 0`). Linear filtering crossed zero thickness inside the true C2 tip. Empty columns now taper to zero thickness at the nearest valid contour centre; the existing DOM C2 clip continues to own the visible boundary. Valid profile samples are unchanged.
2. Transparent-black canvas samples produced dark resampling specks when its fixed 1.5× raster was displayed at different device pixel ratios. A bright constant-colour experiment reproduced those specks without any material shading. Matching premultiplied shader output and WebGL compositing removed them. The constant-colour override was diagnostic only and is absent from the source.

The 44/54px initial PNGs were regenerated from the repaired renderer. Geometry, palette values, interaction, normal model, shared runtime and raster budget are unchanged. The separate production homepage remains installed kit 1.4.1; this is not an approved homepage promotion.

## Evidence

- [Before at DPR 3](images/before-dpr3.png) and [after at DPR 3](images/premul-dpr3.png).
- Constant-colour isolation: [straight alpha](images/flat-canvas-only-dpr3.png), [premultiplied alpha](images/flat-premul-canvas-only-dpr3.png), and [pixel comparison](flat-composition-comparison.json).
- Actual material: [rest](images/edge-54px-dpr3-open-rest.png), [hover](images/edge-54px-dpr3-chamber-hover.png), [drag](images/edge-54px-dpr3-chamber-drag.png), [44px drag](images/edge-44px-dpr3-chamber-drag.png).
- [Local validation](local-validation.json): 85 edge-matrix, 31 first-frame and 106 interaction assertions passed, with zero reported page/console errors; type/doc checks, isolated build, actual SSR prerender and unchanged-production regression passed.
- [Independent visual review](visual-review.md) records the remaining thin light contour observed on parts of the 44px sample. The reported dark lateral defect is resolved in the inspected captures; this is not a claim that every light edge pixel is absent.
- [Hosted desktop](images/online-edge-1413.png), [hosted phone layout](images/online-edge-320.png) and [hosted hover](images/online-edge-hover-1413.png) were captured after deployment.
- [Exact profile-tip probe](profile-tip-probe.json) and [replay script](profile-tip-probe.mjs) preserve the measured root cause.
- [Replay protocol](qa-protocol.md). The screenshots use Chromium device emulation, not physical iPhone/iPad/Safari acceptance.

Implementation source: `c879bb2e877e978150b87ca407b1cb9cbdf09e4e` / `review-pearl-edge-20261025`. Website source: `d6225e754cd8bc44adf1542c7d1825c4a6f9bbac` / `ui-pearl-edge-20261025`. [Publication and online verification](publication.json) records the active Worker, hosted bytes, CI and screenshot identity. Historical source tags and packages remain unchanged. All rights reserved / UNLICENSED.
