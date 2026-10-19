# CI closure and release identity verification — 2026-10-20

This supplement follows the original delivery snapshot. The implementation remains `v1.3.1` (`08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da`); the publication snapshot remains `v1.3.1-published` (`18341427aea5124724e90c4b8a8c82a99acce42e`). Final CI conclusions and exact run/job identities are recorded in `ci-closure.json` and `ci-audit-final.json`. Delivery-time queued/in-progress observations remain historical records.

All seven tracked CI runs, all seven jobs and all 76 steps completed successfully on attempt 1. No failed implementation check, rerun, cancellation or redeployment was needed. The final API observation was 2026-10-19 16:30:10 UTC, or 2026-10-20 00:30:10 Asia/Shanghai. See the [run table and coverage](ci-audit-final.md) and [machine-readable closure](ci-closure.json).

## Source identities

| Surface | Version and source | Website source |
| --- | --- | --- |
| Production showcase | 1.3.1 / `08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da` | `242be6814526ec4586df37e2ba78add1200a3fc2` |
| Homepage entrance | Pinned 1.3.0 / `7f202150b2e95f744d90eab39eaf5e2d18d40bd8` | Same website build; merged as `909cee105a83402c14ef7b8e40d0bb3d90403ff0` |

The current Worker is `eba97f87-43b2-45b1-8614-5da6dbb77105`. Fresh HTTP verification compares the showcase and historical/review resources against 21 local files. A separate check compares 14 homepage JavaScript/CSS resources with the actual deployed local build and confirms the native budding component is present. No UI implementation, material default or deployment is changed by this supplement.

## Receipt clarification

The original `online-http-verification.json` serialized the homepage manifest's commit under the ambiguous top-level name `sourceCommit`, next to the showcase version. The helper had independently asserted the correct showcase commit before writing that summary, so the actual byte comparisons and runtime assertions remain valid. The active protocol and refreshed receipt now distinguish `showcaseSourceCommit` and `homepageSourceCommit` and assert both source references. The original bytes remain accessible through `v1.3.1-published` and the frozen release archive; existing raw logs are preserved.

## Artifact verification

`artifact-consistency.json` records remote tag resolution, release server digests/sizes and local archive contents. All 1,008 indexed ZIP files, the embedded tarball, all 292 packaged/installed files, 837 website manifest files, 41 frozen baseline entries and 228 font references were checked. Existing ZIP/tarball payloads and their hashes are preserved. Twenty-five checkout files differ from canonical Git blobs only by CRLF/LF; source content matches after that explicit text normalization. Exact asset and ZIP-manifest comparisons remain raw-byte checks.

The replay helper verifies the four original release payloads independently of supplemental record assets. A later main commit is accepted only when it descends from the publication snapshot and changes files exclusively under `docs/releases/1.3.1/`; immutable source/publication tag identities remain exact. Original audit snapshots are retained with their observation times.

The follow-up commit contains only records and verification helpers. It uses `[skip ci]` to avoid recursively scheduling the workflow merely to record the completed workflow. The source, website merge and publication revisions listed in the closure are verified independently; this does not skip or replace their CI. Product files, dependencies and workflows remain identical to those checked revisions.

These checks establish source/build/release consistency. They do not add physical iPhone/iPad, Safari, system IME, Combo Touch or OS frame-rate certification beyond the retained device evidence.
