# Frozen owner-confirmed v6

The owner explicitly confirmed the current effect on 2026-10-16. This folder preserves the 15 preview source files and 19 evidence files from that moment. `SOURCE-MANIFEST-v6.json` is unchanged; its SHA-256 is `8eb6bf9395ec63b2020211bb8b21815060d7399e27f9dbdd1f2128275760cb8d`.

This is an archival baseline, not the reusable runtime. Imports in these unchanged files retain their original repository-relative paths. Read `src/`, `styles/` and the integration guide for the active library.

To resolve the original manifest here:

- `sources`: files directly in this directory.
- `evidence`: files in `evidence/`.
- `readOnlySharedDependencies` and `readOnlySharedAssets`: original paths beneath `shared/`.

All seven shared dependencies/assets in that manifest are preserved in `shared/`. Full current font families and their licenses are delivered separately in the kit's `assets/fonts/`.

Baseline QA states that visual review was pending because it was recorded before the owner's subsequent confirmation. Preserve that historical report; the owner's later acceptance is recorded in `docs/baseline-and-checklist.md`. Confirmation is not a claim of universal browser, device or parameter-combination certification.
