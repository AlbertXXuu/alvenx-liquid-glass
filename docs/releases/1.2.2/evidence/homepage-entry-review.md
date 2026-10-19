# Homepage entrance — final scoped implementation, 2026-10-19

The owner's final correction controls this implementation: the existing native kit glass circle sits between **Explore the work** and **GitHub**, with no visible lettering and no painted pearl, gradient reflection or artificial color overlay. The circle samples the homepage backdrop through the installed kit's supported optics. First activation reveals **explore me!**; the separate native link opens `/ui/` on its activation. The original headline, copy, header, other actions and website content are unchanged.

## Source and behavior

- Isolated website: `D:/.Development/AlvenX/.workspace/worktrees/website-liquid-glass-20261018`.
- `app/liquid-glass-entry.tsx`: `LiquidControl kind="circle"`, `children=null`, accessible name, native button disclosure state, and conditional `LiquidControl kind="field"` containing the native `/ui/` anchor. Repeated circle activation retains a single invitation. No renderer or dependency change.
- `app/liquid-glass-entry.css`: transparent wrapper, 66px desktop / 44px mobile target, inherited live C2 clip/rim, 460ms reveal, reduced motion bypass, forced-color focus/boundary. Invitation appears below, avoiding the surrounding links. Narrow hero actions use a scoped 10px column gap; 393px keeps all three actions on one row; 320px preserves DOM order with GitHub naturally wrapping.
- `app/home-content.tsx` finishes byte-equivalent to its pre-task placement: the existing middle entry remains between the two original anchors.
- Dependency remains `@alvenx/liquid-glass` 1.1.2, installed from the same checked-in tarball. There is no additional animation timer, canvas or runtime package.
- Brand token JSON, canonical interface CSS and design-system source were read before implementation. No logo/header/font/canvas change.

## Actual checks

`homepage-pearl-qa.cjs` is a Playwright CLI callback, run against `http://localhost:5187/`. It creates separate fresh contexts at 320×852, 393×852, 768×1024, 1180×820 and 1366×900.

- Chromium 155.0.8059.84: **82 assertions passed**, 5 layouts, 0 uncaught page errors. Result `homepage-pearl-chromium.json`.
- Windows WebKit 26.5: **82 scoped assertions passed**, 5 layouts, 0 uncaught page errors. Result `homepage-pearl-webkit.json`.
- Coverage: actual native C2 target; initial textless state; no overlay children; correct sibling order; no page overflow; first simulated touch reveals without navigating; second activation reaches `/ui/`; repeated activation produces one link; invitation and other CTA rectangles do not overlap; native Space/Enter; Chromium Tab to the generated anchor; reduced motion; forced-color boundary.
- Windows WebKit's default Tab traversal in this run skips both the generated anchor and ordinary homepage anchors to the next native button. This behavior is explicitly recorded, not counted as a successful WebKit Tab traversal. WebKit verifies the existing native anchor with `focus()` and Enter. The separate probe is `homepage-webkit-tab-probe.txt`.
- Targeted TSX ESLint and `git diff --check` passed. Root integration performs the complete website build/validation.

All final Chromium screenshots were inspected. Final images are `homepage-chromium-{320,393,768,1180,1366}-{initial,reveal}.png`. Earlier `homepage-pearl-*` screenshots show superseded process attempts, including the rejected side placement/painted overlay and the reproduced 320px overlap; they are not the delivered effect. `homepage-native-glass-393-initial.png` also depicts the final accepted correction direction.

Development console boundary: vinext/React emits `<link rel=preload> must have a valid as value` from its development React client (warning in Chromium; console error in Windows WebKit). Persistent DOM preload entries observed afterward use valid image/font values. This is recorded separately from the zero uncaught page errors; the production build's console remains part of root publication QA.

Automated touch, keyboard and Windows engine checks do not certify physical iPhone/iPad Safari, OS input methods or Combo Touch. The inherited kit's native fallback and SVG displacement behavior retain their existing engine limits; this entrance change makes no claim of arbitrary DOM refraction on unsupported Safari.
