> Source release v1.3.2 is public and verified; production deployment remains pending. The live site still serves 1.3.1. See the actual [source publication and final deployment status](source-publication.md). The preparation record below is retained as history.

# 1.3.2 — demonstration first, explicit language selection

The current candidate responds to the owner's 2026-10-21 corrections. The horizontal pearl demonstration comes directly after the compact gradient headline and Replay control. The opening no longer spends a separate row on interaction instructions, a visible `01` section label or `Hold. Pull. Let go.` heading. The section retains an accessible heading without adding another visible explanation. The accepted horizontal geometry, material parameters, normal document flow and message-field inset remain the baseline.

The first entry now includes a slow-budding cycle. `VolumeStage autoPlay` starts once when the actual stage first becomes visible while the document is in the foreground. It pauses offscreen or in a background document and resumes without consuming hidden time. Scrolling out and back, React StrictMode effect replay, language changes and later setting edits do not start a second automatic cycle. After completion, the existing Replay action can start another cycle. The library default remains `autoPlay={false}` so consumers opt in deliberately.

Playback uses 3000ms of effective presentation time measured by `performance.now()`, separately from the clock's capped delta for deformation physics. This prevents slow frame delivery from stretching a finite introduction through accumulated capped deltas. Hidden introductory time does not count, offscreen drawing is suspended, and a completed state appears on the next delivered frame. This is a lifecycle contract, not an all-device frame-rate guarantee. Reduced motion and an unavailable renderer present the complete form and readable foreground instead of running the introduction.

English remains the default authored language. A separate Language control offers English and 简体中文; browser or operating-system locale does not choose for the visitor. The Chinese presentation covers navigation, headings, body copy, control labels, numeric help and validation, statuses and footer. Native sample-text editing keeps the earlier IME/font-readiness behavior. MiSans 400/500 catalog glyphs load before publishing a Chinese switch, with stale-request protection, a bounded font request and retry behavior. The independent language preference does not reset material settings, progress or sample text. The message Easter egg retains its accepted behavior, including literal `<3` for `fluency`.

`MenuToggle` extracts the official AlvenX website's two-line mobile navigation trigger into the reusable package. It is a controlled native 44px button; the same two bars become the close icon. Host navigation still owns panel layout, link/outside/Escape dismissal and focus. Language selection remains a separate disclosure. See [navigation](../../navigation.md) and [integration](../../integration.md).

## Source, artifacts and publication

This is the source preparation record. Package version is `1.3.2`; the immutable implementation tag is planned as `v1.3.2` after final local review. The implementation commit, exact final ZIP/tarball identities, installed-consumer result, website source/merge, deployed Worker and post-deployment byte checks are not assigned in advance. A later publication receipt must record those actual identities separately rather than rewriting a source tag or treating this candidate record as evidence of a deployment.

The previously verified production remains the 1.3.1 source `08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da`, with publication snapshot `18341427aea5124724e90c4b8a8c82a99acce42e` and CI closure `0b3d762bec5932a3cb7b63ab2e8215f4d88fa161`. Those immutable tags, release assets and historical observations remain unchanged. Homepage entry source/package stays independently pinned to 1.3.0; this revision does not replace it. Promotion must preserve old release, review, archive and root-resource bytes while adding the new release namespace and archiving only the previous production entry/manifest.

## Verification status

The completed checks below are current source checks reported by the responsible verifier. Final visual and publication evidence is recorded separately when its final run completes.

| Check | Actual result and coverage |
| --- | --- |
| Entry lifecycle | Passed, 21 assertions: first visible entry, one-time behavior, pause/resume, reduced motion, renderer failure and bounded timing behavior in the tested browser fixture |
| Numeric locale | Passed, 15 assertions: explicit English/Chinese numeric help and validation with the existing numeric contract retained |
| Static check | Passed: TypeScript and documentation checks |
| Build | Passed: library and showcase production build |
| Contracts | Passed: 438 assertions in the current contract run |
| Runtime suite | Passed: current clock, volume-budget and optics-kernel checks |
| Presentation review | Passed, 93 assertions across 320, 393, 768, 820, 1180, 1366 and 1413 px viewports, for both English and Chinese. The final compact opening is checked; desktop stage top moved from 746.9 to 231.7 px at 1413×936. Phone viewports use mobile emulation. |
| Navigation and language | Passed, 41 assertions in Chromium and 41 in Windows WebKit native UI with reduced motion: canonical bars, keyboard, dismissal, explicit locale, saved preference and preserved input/settings |
| Final package and installed consumer | Pending final packaging and installation of that exact tarball |
| Website validation and deployment | Pending final promotion, website checks and actual deployment receipt |
| GitHub CI and remote identities | Pending source freeze/push and the actual run conclusions |

Replay protocols: [entry lifecycle](../../../scripts/entry-autoplay-qa.cjs), [numeric locale](../../../scripts/number-locale-qa.cjs) and [presentation](../../../scripts/entry-presentation-qa.cjs). Browser evidence must identify the engine, viewport, checked source and final screenshot set. A passing draft is retained as process evidence without replacing final review.

Windows browser tests, simulated viewport/touch capabilities and source checks do not certify physical iPhone/iPad Safari, OS IME, Combo Touch or mobile power use. Existing physical-device feedback and engine limitations remain explicit. This revision introduces no claim of arbitrary DOM capture, equivalence between the 2.5D volume and small-control refraction, or Apple's native renderer.

Rights remain all rights reserved / `UNLICENSED`; no npm-registry publication or open-source reuse license is granted. Fonts and canonical brand assets retain their individual notices. Material defaults, stored user settings, B endpoints and the original frozen v6 acceptance reference remain unchanged.

Selected process and final desktop-browser evidence is retained in [evidence/](evidence/). The before screenshot is the previous 1.3.1 layout; final `entry-*` screenshots and final JSONs describe this candidate. Keyboard focus rings and animation phases are retained as captured. Windows WebKit normal-motion waiting/capture failed in the existing canvas path; its passing native-UI suite explicitly uses reduced motion and does not validate the black captured WebGL pixels.
