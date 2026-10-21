# 1.3.2 — production activation and HTTP verification

**Production 1.3.2 is active and verified.** The public source release and exact tested packages remain unchanged. The homepage retains its independently pinned kit 1.3.0 entrance.

This activation supersedes the deployment-pending checkpoint under `v1.3.2-source-verified` and the historical `source-publication.json` release asset. Their original tags and bytes remain available. The completed deployment and online records are published separately under `v1.3.2-published`.

## Source and active deployment identities

| Scope | Actual identity |
|---|---|
| Kit source | `v1.3.2` / `24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07` |
| Website source | `ui-v1.3.2` / `55b9abf3380128ff52b01accc8e3eb5d6769e59a` |
| Website merged main | `5d5cffd7d32052d4d90119b4b8e1a2594c34cea1` |
| Website source/main tree | `1876e4bd6a619165a205de29ee17beb1090dfba4` — identical |
| Active Worker version | `b85e1e8c-3a6d-4ad6-b278-7eb79dc662c5` at **100%**, confirmed by a fresh deployments API read |
| Deployment | `a834f964-3260-4768-b5da-8015ab890a59`, created `2026-10-21T16:53:54.130645Z` |
| Served showcase | `https://alvenx.com/ui/`, manifest version `1.3.2`, source commit `24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07` |
| Release namespace | `/ui/releases/1.3.2/` |
| Homepage entrance | Kit `1.3.0`, source `7f202150b2e95f744d90eab39eaf5e2d18d40bd8` |

## Deployment outcome and process boundary

Read-only inspection found an existing enabled Windows system proxy while the CLI/curl process lacked proxy configuration. Supplying that existing configuration only through the deployment process's `HTTPS_PROXY` enabled the same transport adapter to complete API uploads and activation requests. No operating-system network setting was changed.

The resulting API receipt reports **13 HTTP 200 responses, one 201 and two 202 responses**, no recorded transport failures, and Worker version `b85e1e8c-3a6d-4ad6-b278-7eb79dc662c5`. A subsequent authenticated deployments read independently confirms that version active at 100%; the public manifest and byte checks confirm the served source.

The CLI remained open after the successful API operations and was stopped by the five-minute process limit. Its wrapper receipt truthfully retains **`childExitCode: 1`, `timedOut: true`, `success: false`**. Production activation is established by the API and served-resource evidence; a normal CLI exit 0 is not claimed. Earlier unsuccessful transport attempts remain historical process evidence.

## Source packages and independent installation

The four original source-release assets retain their verified bytes and server digests.

| Asset | Bytes | SHA-256 |
|---|---:|---|
| `alvenx-design-kit-1.3.2.zip` | 134122941 | `0b7458a58109e39c64ce45dfe39bb3e197ef850532cb945278859a2c44f8b342` |
| `alvenx-liquid-glass-1.3.2.tgz` | 28921923 | `6e941d2e875c2a38ca5c4913815b3025439c3e6e5737f1f1660f3159d7f4e0a8` |
| `installed-consumer.json` | 1259 | `523ee031134cace071ee5e05d90a86e85efe97ad17b44cf4c37bf648f1f7eddd` |
| `SHA256SUMS.txt` | 190 | `0f6861e72e8319d0d6a9c1f60d0d6689f5683032f8d73541570089287263c5a5` |

All 1047 ZIP manifest entries passed hash/length verification. Embedded and standalone tarballs match; all 295 tarball files match their ZIP counterparts. The frozen v6 baseline retains all 41 entries, and all 228 font files/CSS URLs and their individual licenses were verified.

A fresh consumer outside the repository installed the exact tarball using cached dependencies seeded from the kit lockfile. Offline installation, TypeScript checking and the Vite production build each exited 0; all 295 installed files were byte-identical to the tarball. Coverage includes `MenuToggle`, `VolumeStage autoPlay` and `GlassSlider locale`. Earlier unsuccessful unseeded installation attempts are not counted as passing; this acceptance is the explicitly scoped fresh offline consumer.

## Completed CI and local QA

The independent CI audit at `2026-10-21T16:02:07.547965Z` verified **four runs, four jobs and all 40 reported steps completed successfully on attempt 1**. Reported steps include setup and cleanup.

| Scope | Successful run |
|---|---|
| Kit main | [39628187957](https://github.com/AlbertXXuu/alvenx-liquid-glass/actions/runs/39628187957) |
| Kit source tag | [39628187847](https://github.com/AlbertXXuu/alvenx-liquid-glass/actions/runs/39628187847) |
| Website PR43 source | `39629180328` |
| Website merged main | `39629820701` |

Kit checks passed TypeScript/documentation checks, production build, 438 contract assertions and the clock/volume-budget/optics runtime checks. Local presentation passed 93 assertions; navigation/language passed 41 in Chromium and 41 in Windows WebKit native UI with reduced motion; entry lifecycle passed 21 and numeric locale passed 15. Full website validation exited 0, including build, CSS checks and Wrangler deployment dry-run. These source/local checks remain distinct from the fresh online results below.

## Fresh online HTTP verification

`online-http-final.json`, completed at **2026-10-21 16:59:13 UTC / 2026-10-22 00:59:13 Asia/Shanghai**, reports:

- **39 of 39 selected hosted resources match expected bytes**, with **23 identity/local checks passed** and **zero issues**.
- The live showcase manifest identifies version 1.3.2 and frozen source `24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07`.
- Homepage SSR contains the BuddingLink component and references 14 sampled build resources. The actual pinned dependency remains kit 1.3.0; the homepage vendor tarball hash remains `3acd90283037d999406d322c385f36570582191b1194f999c6a149c484c470f4`.
- Selected retained historical resources are included. This is a bounded resource check, rather than a recursive verification of every historical asset. Homepage SSR is inspected for component/resource references rather than compared as static HTML.

## Completion evidence

| Item | Current status |
|---|---|
| Fresh online browser assertions, screenshots and diagnostics | Passed: 100 presentation, 41 navigation, 14 entry/interaction assertions; zero page, entry-console and entry-HTTP errors. |
| Completion records and receipt | `v1.3.2-published`, with a separate `publication.json` release asset; original artifacts and historical status receipt remain unchanged. |

Windows browser tests and viewport/touch emulation do not certify physical iPhone/iPad Safari, OS IME, Combo Touch or mobile power use. The passing Windows WebKit suite covers native UI with reduced motion; its existing normal-motion canvas waiting/capture limitation and black captured WebGL pixels are not successful rendering evidence. Physical-device acceptance remains separate. No all-device FPS or Apple-renderer equivalence is claimed.

Rights remain all rights reserved / `UNLICENSED`; fonts retain their individual licenses. No npm-registry publication or open-source reuse license is granted.


## Final online browser evidence

Production Edge/Chromium 155 passed 100 bilingual responsive assertions across 320, 393, 768, 820, 1180, 1366 and 1413 CSS-pixel widths, 41 navigation/language/keyboard/state checks, and 14 entry/replay/scroll/reduced-motion/Easter-egg/diagnostic checks. The latter reported zero page exceptions, console errors, HTTP error responses and failed requests. Screenshots were visually inspected at phone, tablet and desktop sizes, including a clean Chinese tablet view. These are desktop-browser observations with touch/viewport emulation, not physical iOS acceptance.

The initial two navigation invocations inherited the CLI-selected `about:blank` page as their target and timed out before any navigation assertion ran. Their JSONs are retained. Pinning the intended production URL in the final protocol produced 41 passing assertions without changing product code. The separate entry protocol observed mother, intermediate growth and completion in actual production.

The successful publication receipt is [publication.json](publication.json); fresh activation is [production-activation-verified.json](production-activation-verified.json); HTTP results are [online-http-final.json](online-http-final.json). Browser results and replay protocols sit beside this file, and the [online screenshot index](online-evidence/sha256.json) verifies the retained captures. Records are tagged `v1.3.2-published`, separate from immutable implementation `v1.3.2` and historical source-phase `v1.3.2-source-verified`.

The four original source/package/checksum/consumer assets and the earlier source-publication.json status asset retain their exact bytes. A separate publication.json release asset records completion; the historical pending receipt does not describe current production. No source artifact was repacked to append deployment history.
