> Completed follow-up: production 1.3.2 is active and verified. The pending checkpoint below is historical; see [final publication](publication.md) and [publication.json](publication.json).

# 1.3.2 source release — production deployment pending

[Source release v1.3.2](https://github.com/AlbertXXuu/alvenx-liquid-glass/releases/tag/v1.3.2) is public, published at **2026-10-21 16:39:40 UTC / 2026-10-22 00:39:40 Asia/Shanghai**, with four verified assets. Source CI, package verification, independent installation and local QA have passed. Production deployment is a separate pending step. **The last verified live showcase remains 1.3.1; online validation of website/showcase 1.3.2 has NOT been performed.**

The source introduces the compact demonstration-first opening, a one-time visible-entry introduction with pause/resume, explicit English/简体中文 selection and the reusable canonical `MenuToggle`.

## Source identities

| Scope | Immutable identity |
|---|---|
| Kit implementation | `v1.3.2` / `24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07` |
| Website source candidate | `ui-v1.3.2` / `55b9abf3380128ff52b01accc8e3eb5d6769e59a` |
| Website merged main | `5d5cffd7d32052d4d90119b4b8e1a2594c34cea1` |

Fresh GitHub commit reads confirmed the website source and merged main share tree `1876e4bd6a619165a205de29ee17beb1090dfba4`. The homepage dependency remains separately pinned to kit 1.3.0 and must be distinguished from the showcase in any later deployment receipt.

## Published assets and independent installation

All four GitHub asset sizes and server-reported digests were verified against the corresponding local bytes.

| Asset | Bytes | SHA-256 |
|---|---:|---|
| `alvenx-design-kit-1.3.2.zip` | 134122941 | `0b7458a58109e39c64ce45dfe39bb3e197ef850532cb945278859a2c44f8b342` |
| `alvenx-liquid-glass-1.3.2.tgz` | 28921923 | `6e941d2e875c2a38ca5c4913815b3025439c3e6e5737f1f1660f3159d7f4e0a8` |
| `installed-consumer.json` | 1259 | `523ee031134cace071ee5e05d90a86e85efe97ad17b44cf4c37bf648f1f7eddd` |
| `SHA256SUMS.txt` | 190 | `0f6861e72e8319d0d6a9c1f60d0d6689f5683032f8d73541570089287263c5a5` |

All 1047 ZIP manifest entries passed hash/length verification. The embedded and standalone tarballs match; all 295 tarball entries match their ZIP counterparts. The frozen v6 baseline retains all 41 entries and manifest SHA-256 `8eb6bf9395ec63b2020211bb8b21815060d7399e27f9dbdd1f2128275760cb8d`. All 228 font files/CSS URLs and their individual licenses were verified.

A fresh consumer outside the repository installed the exact tarball using cached dependencies seeded from the kit lockfile. `npm install --offline --ignore-scripts --no-audit --no-fund`, TypeScript checking and the Vite production build each exited 0; all 295 installed files were byte-identical to the tarball. Coverage includes `MenuToggle` imports/controlled props, `VolumeStage autoPlay` and `GlassSlider locale`. The earlier unseeded online attempt stalled, and an initial unseeded offline attempt lacked a newly resolved Rollup cache entry. Those attempts are not counted as passing; the successful acceptance is the explicitly scoped fresh offline consumer.

## Completed source and local verification

- Kit TypeScript/documentation checks, production build, 438 contract assertions and the current clock, volume-budget and optics runtime checks passed.
- Presentation passed 93 assertions across 320, 393, 768, 820, 1180, 1366 and 1413 px viewports in English and Chinese.
- Navigation/language passed 41 Chromium assertions and 41 Windows WebKit native-UI assertions with reduced motion. Entry lifecycle passed 21 assertions; numeric locale passed 15.
- Full local website validation exited 0, including lint, content/assets/navigation checks, production build, built-CSS validation and Wrangler deployment dry-run.

The final independent CI observation at **2026-10-21 16:02:07.547965 UTC** verified **four runs, four jobs and all 40 reported steps completed successfully on attempt 1**, with exact expected source heads. Reported steps include setup and cleanup.

| Scope | Successful run |
|---|---|
| Kit main | [39628187957](https://github.com/AlbertXXuu/alvenx-liquid-glass/actions/runs/39628187957) |
| Kit v1.3.2 source tag | [39628187847](https://github.com/AlbertXXuu/alvenx-liquid-glass/actions/runs/39628187847) |
| Website PR43 source | `39629180328` |
| Website merged main | `39629820701` |

The earlier PR43 job/status projection disagreement resolved before the final receipt; no rerun or code/workflow fix was needed. `ci-audit-final.json` records `allSuccess: true` and SHA-256 `c9fab770e50fc5289ae677d3a04ef5d12227b7b39e49b6bfece91db1e1a0a6e2`. The CI deployment step was a dry-run. These completed source/local results establish no online 1.3.2 acceptance.

## Production and online result

Deployment requests have encountered external API connection interruptions; a successful 1.3.2 Worker/deployment receipt has not been obtained at this record's preparation time.

| Required final result | Status |
|---|---|
| Final transport/deployment outcome | **FAILED — final plain-body HTTP/2 upload also ended with H2_STREAM_ABORTED; no successful deployment receipt.** |
| Successful deployed Worker/version identity and activation time | **NO NEW ACTIVE WORKER — fresh status still activates eba97f87-43b2-45b1-8614-5da6dbb77105 at 100%; served source remains 1.3.1.** |
| Actual served 1.3.2 source identities and fresh HTTP byte/hash checks | **NOT PERFORMED — await confirmed deployment.** |
| Online 1.3.2 browser QA, diagnostics and screenshots | **NOT PERFORMED — await confirmed deployment.** |

Windows browser tests and viewport/touch emulation do not certify physical iPhone/iPad Safari, OS IME, Combo Touch or mobile power use. The passing Windows WebKit suite covers native UI with reduced motion; the existing normal-motion canvas waiting/capture limitation and black captured WebGL pixels are not successful rendering evidence. Physical-device acceptance remains separate, with no all-device FPS or Apple-renderer equivalence claim.

Rights remain all rights reserved / `UNLICENSED`; fonts retain their individual licenses. No npm-registry publication or open-source reuse license is granted.

Fresh final state is recorded in [production-state-final.json](production-state-final.json); the sanitized [attempt ledger](deployment-attempts.json) and [transport source archive](deployment-research/README.md) preserve the failed process without private child logs. Source publication and production deployment remain explicitly separate. The four source release assets retain their tested bytes.

The GitHub release also carries source-publication.json as a separate status receipt; the four original tested artifacts remain unchanged. The follow-up verification tag is v1.3.2-source-verified. No production-published tag is created for this pending deployment.
