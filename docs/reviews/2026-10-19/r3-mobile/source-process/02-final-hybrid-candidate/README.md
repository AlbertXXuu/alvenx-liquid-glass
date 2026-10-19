# R3 final hybrid candidate source capture

Date: 2026-10-19. This capture was taken after root froze runtime changes for final hybrid validation, before the authoritative source commit/tag. It is not atomic, not a Git commit and not a claim that this archived working interval itself passed build/install.

The [binary tracked patch](source-from-r2.patch) starts from `review-20261019-r2-published` (`3f62f90debbb79e8318e6ce44c5070febe750068`). Newly added source, proof-fixture and verification files are copied under `new-files/` with their relative paths. [Manifest](manifest.json) · [SHA-256](SHA256SUMS.txt).

The runtime candidate uses exact synchronous normal maps for direct touch and release settlement, asynchronous encoding for mouse/idle, pointer-type selection, epoch guards and offscreen cancellation. Final tests, build, installation and the later Git source identity have separate records. Earlier source process and rejected async phases remain unchanged.
