# Release 1.3.2 CI completion audit

Final independent API observation: **2026-10-21 16:02:07.547965 UTC / 2026-10-22 00:02:07 Asia/Shanghai**. All four tracked workflows, all four jobs and all 40 reported steps completed successfully on attempt 1. The run and job heads match the exact expected source commits. Reported steps include setup and cleanup; this count is not a count of product assertions.

| Scope | Exact head commit | Successful run |
|---|---|---|
| Kit main | 24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07 | [39628187957](https://github.com/AlbertXXuu/alvenx-liquid-glass/actions/runs/39628187957) |
| Kit v1.3.2 source tag | 24ef6e8c7db79e62c997e1fb1b4a12db15ad9d07 | [39628187847](https://github.com/AlbertXXuu/alvenx-liquid-glass/actions/runs/39628187847) |
| Website PR43 source | 55b9abf3380128ff52b01accc8e3eb5d6769e59a | [39629180328](https://github.com/AlbertXXuu/AlvenXWebsite/actions/runs/39629180328) |
| Website merged main | 5d5cffd7d32052d4d90119b4b8e1a2594c34cea1 | [39629820701](https://github.com/AlbertXXuu/AlvenXWebsite/actions/runs/39629820701) |

Kit CI at the exact source commit uses Ubuntu latest and Node 22. It passed npm ci, TypeScript check, production build, contract tests, runtime tests and frozen baseline-only verification. Website CI uses Ubuntu latest and Node 22.13.0. Its full validate command passed ESLint; brand, homepage navigation, language, asset, consistency and engineering-case checks; production build; built-CSS validation; and Wrangler deployment dry-run. The CI workflow does not deploy production.

Fresh GitHub commit API reads confirmed that website source and merged main have the same Git tree, `1876e4bd6a619165a205de29ee17beb1090dfba4`. This provenance check is recorded in `ci-audit-provenance.json` and is separate from the successful CI results for both commits.

Earlier PR43 job/check projections still reported in_progress while the parent run and all steps reported success. The final fresh run/jobs snapshot converges at every level. No actual runner waiting time or external service cause is inferred from those earlier projections. Historical snapshots are labeled and superseded by the final receipt.

Machine-readable final evidence is `ci-audit-final.json`, with `allSuccess: true`, complete repository/SHA/ref/run URL/attempt metadata, and every job and step. No rerun, cancellation, code/workflow edit, push or permissions change was performed by this audit. Feature-specific browser, installed-consumer and production validation belong to their separate receipts; no previous-release validation is used here.
