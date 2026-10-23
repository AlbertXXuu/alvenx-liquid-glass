# 1.4.1 production verification

The homepage entrance now has independent, bounded local pulling and a damped release. Ordinary clicks retain toggle/navigation behavior. The accepted resting geometry, light material, first frame and mobile shadow are retained. [Implementation](README.md).

Production: https://alvenx.com/ — source `b3bca3c46913c31c8ce37cac9906bfbdd6544597` / `v1.4.1`, website source `3ed2e8b52c7e393428ae6c887aa1659f9e8c3d7a`, merged through PR52 as `20452f801b9e72e8a3a4899ceb9d9c222489d7fd`. Source and merge share tree `a6b2bbee0010483dcbbe9f9986f3b8905d69cee0`. Worker `a91f3e72-86cd-45bb-b54a-e1c4a730857d` was independently read at 100% active. Deployment exited 0 without timeout.

The built homepage passed **132** browser assertions. Fresh production runs passed **74**, covering local deformation, lobe independence, drag-versus-click, touch scrolling, keyboard/reduced motion, idle sleep, navigation and diagnostics. Normal final phone/tablet/desktop views were captured separately; the online interaction protocol uses touch media only for narrow viewports. Built startup and held-gesture tests preserve the original first-frame/fallback behavior.

All **5 CI runs**, 5 jobs and 58 reported steps passed. **510 served resources** match local bytes, including the current manifests and retained showcase/review resources. The actual installed tarball matches **310 files** and passes independent consumer type checking/build. Source contracts compare 202 resting/growth cases to R7, exercise local pull isolation and bounded spring settling; existing clock/geometry/normal-map tests and frozen baseline/font checks pass.

There are **46 screenshots** in the [evidence index](evidence-index.json). Production diagnosis reported no page exceptions; final diagnostics are in [final-smoke.json](final-smoke.json). Early test harness corrections are retained in [publication.json](publication.json); they are not product fixes.

The separate [process archive](../../maintenance/archive-20261023/README.md) moved 2,462 local intermediate files, preserving every byte and a reversible path map. It did not move runtime code, versioned acceptance evidence, live URLs or frozen release assets. Current production packages and this follow-up remain accessible.

Physical iPhone/iPad Safari and Combo Touch remain owner/device acceptance, separate from Chromium emulation. Absolute zero startup latency and stable FPS are not claimed. Root `/ui/` remains source `e95fd08ad897c540788d6b78ecc4baa778e68fe2`. Historical tags/releases are unchanged; reserved rights / UNLICENSED remain in force.
