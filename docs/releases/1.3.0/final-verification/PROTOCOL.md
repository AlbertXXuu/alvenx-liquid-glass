# Budding homepage entry — final browser verification protocol

Verification date: 2026-10-19, Asia/Shanghai. This record covers the library's single-body budding entrance applied to the existing homepage. It does not change or re-accept the production `/ui/` page; navigation checks established that it still loads the accepted 1.2.2 resources.

## Environment and source

- Windows host with Playwright CLI, Chrome 155.0.8059.84 and Playwright WebKit 26.5. These are desktop browser engines, not physical Safari/iOS devices.
- Viewports: 320, 393, 640, 641, 768 and 1366 CSS pixels wide, 900 pixels high, DPR1. A separate touch-enabled mobile context uses 393×852.
- Local host: `http://localhost:5187/`, using the isolated official website worktree and the installed current library package.
- Measured-source hashes are in `qa-source-sha256.json`; paths use portable `kit/` and `website/` prefixes. They identify the270-run before the later finite-diameter boundary correction described in `QA-NOTES.md`.
- The final loaded optimized module was `@alvenx_liquid-glass.js?v=f0595f01`. Its onFocus logic matched the current opt-in custom contour behavior. This check matters because a prior dev optimizer had served stale dependency code even after the package files changed; those earlier results are isolated under `process/`.

## Browser procedure

Use an owned, named Playwright CLI session. First open the page and inspect its accessibility snapshot. Wait for the component's optical-ready state and font readiness before measuring an interactive control; an unhydrated development page is a separate initialization condition.

At each viewport, reload to start with the textless resting mother, use ordinary motion, and record occupied width, mother target and center, GitHub position, overflow, optical mode and shared contour identity. Check for exactly one optical control, one backdrop layer and matching rim/shadow paths.

Activate the actual native button. Sample real DOM growth, geometry version, link inertness, mother center and GitHub coordinates at approximately 50ms intervals for 1450ms. Preserve actual timestamps. The product growth is 1150ms; this observation window includes its completed state. Capture initial, middle and complete screenshots at 393,768,1366 in both engines.

Assert that width grows monotonically to the right, GitHub displacement equals the actual increase in occupied width, the mother center stays fixed, and neither intermediate nor final states overflow or change row. Verify that the destination is inert until completion, its final text is `explore me!`, and its native href is `/ui/`. Pointer activation must not leave a keyboard contour.

Move the pointer away and allow the interaction spring to settle for at least1500ms before comparing cached geometry versions over a further600ms. This is a settled-state check, not a demand that all final spring work cease immediately after release.

Use native keyboard input to activate with Space, reach the native link and enter the showcase. Confirm visible shared-path keyboard focus. WebKit's default Tab preference skips native links in this Windows automation configuration; record that preference and focus the same native link only for its Enter-navigation check. Do not change product keyboard behavior to accommodate this test preference.

Repeat with reduced motion, verifying immediate completed growth and retained native focus. The separate mobile context sends actual Playwright touch input: first tap starts continuous growth, the link stays inert during growth, pointer focus leaves no keyboard outline, and a second tap on the completed link navigates to the accepted showcase. Transparent platform tap highlighting is checked as configuration; it does not certify disappearance of every physical iOS overlay.

For visibility/cache coverage, start growth, scroll the hero offscreen, compare frozen growth and geometry values, then return and verify elapsed growth resolves. After settling, verify that geometry stays cached. The component's visible return may complete immediately because time elapsed while offscreen; no offscreen drawing is needed to preserve that behavior.

## Commands

The `.cjs` files contain bounded Playwright CLI callbacks, not standalone Node test programs. From the project root, after opening a named session and inspecting its snapshot, pass the callback text to the CLI:

```powershell
playwright-cli -s=budding-review open http://localhost:5187/ --browser=chrome
playwright-cli -s=budding-review snapshot
playwright-cli -s=budding-review run-code (Get-Content -Raw -LiteralPath alvenx-design-kit/docs/releases/1.3.0/final-verification/local-budding-qa.cjs)
playwright-cli -s=budding-review run-code (Get-Content -Raw -LiteralPath alvenx-design-kit/docs/releases/1.3.0/final-verification/secondary-budding-qa.cjs)
```

The callbacks write screenshots under `output/playwright/budding-entry-2026-10-19/` relative to the calling project root and return structured results. Capture the returned JSON for durable reports. Use another owned session with `--browser=webkit` for the second engine. Do not close unrelated browser sessions or services.

## Results and practical limits

The final reports contain **270 passed,0 failed** assertions: Chromium129, WebKit128, touch/offscreen/cache13. They cover the actual homepage's44/54px host configurations; invalid diameter props are outside this test total. Final source review subsequently standardized the finite44–96px clamp and the existing44px/14px text sizing without changing those measured host cases. Separate targeted boundary verification is required for the new invalid-prop behavior. Both engines reported zero page errors. Existing Vinext development preload diagnostics and WebKit's default Tab preference remain visible in the reports. Production network/CSP/runtime diagnostics require a separate deployed-page check.

Chrome's six growth observation windows each reported zero long tasks. Maximum observed RAF gaps ranged from15.5 to29.2ms while the two development browser runs were active. These are browser callback observations, not physical display FPS, energy use, GPU profiling, device memory use or input-to-display latency. WebKit does not provide an equivalent Long Tasks measurement in this protocol.

All tested sizes retain zero mother-center drift. A44px mother grows its occupied width from56 to144.46875px and moves GitHub by88.46875px; a54px mother grows66 to174.578125px and moves GitHub by108.578125px. The narrow discovery row is established before interaction, so expansion does not wrap it midway.

No physical iPhone15Pro, iPad Air, Combo Touch, Retina or OS IME certification is implied. The homepage uses actual SVG backdrop displacement where supported and the library's native compatible material in WebKit. Its pixels should not be described as the large analytic pearl renderer or Apple's renderer.

## Recommended review images

- [Desktop completed state](chromium-1366-full.png): final mother, connection, native link chamber and displaced GitHub.
- [Desktop middle of growth](chromium-1366-mid.png): connected geometry while the actual document width is changing.
- [Phone completed state](chromium-393-full.png): pre-established discovery row, readable link and rightward GitHub displacement.
- [Tablet completed state](chromium-768-full.png): horizontal action group at intermediate width.
- [Keyboard focus state](chromium-1366-keyboard-focus.png): a visible shared contour for the native destination.
- [Compatible WebKit phone state](webkit-393-full.png): the separately observed native fallback appearance.

Earlier failing or cached-source images under `process/` are historical process evidence. The20 final PNGs at this directory's top level are the current-source captures; their bytes match the originals recorded locally.
