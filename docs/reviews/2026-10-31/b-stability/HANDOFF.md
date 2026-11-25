# Incremental independent review handoff

Review branch `codex/liquid-glass-b-stable-20261031`, version `1.5.0-local.0`, against `db73ade0da93e038ce0d204b4fc4f5ac913df9a5`. Use the exact local commit in the external delivery receipt. Product implementation and local evidence are fixed; no deployment is requested.

Prioritize these actual changed paths:

1. `src/balancedOptics.ts`: source coordinates, B falloff, dense Gaussian blur, immediate-copy validation, texture accounting/eviction, failure latch and all-client cleanup. Confirm no black/stale output at maximum blur/refraction in Windows WebKit.
2. `src/ControlledScene.tsx`: async source/font race cancellation, hidden/offscreen update deferral, correct dimensions/DPR and selectable source overlay.
3. `src/LiquidControl.tsx` and `src/GlassSettingsControls.tsx`: registered Canvas B selection, default track registration, native fallback, unchanged current geometry/rim/focus/hit/endpoint behavior. Test maximum values, release/re-grab and keyboard travel independently.
4. `src/GlassPanel.tsx`, scoped styles and formal showcase integration: calm default, native long-content scrolling/editing, minimum geometry and shared resource lifecycle.
5. Derived optical Latin fonts and build script: exact-weight readiness, retained OFL/source, renamed family, negligible layout discrepancy and no unintended native UI font substitution.

Use the formal candidate at port 5241, not the old comparison on port 5238. Inspect normal, hover, press, drag/release, focus and native numeric edits at narrow/desktop sizes. Check the distinction between compact magnification and flat central large-panel mapping. Review persisted settings/native drafts and the non-B fallback paths. Installed-consumer hooks live only in a temporary QA fixture, not production code.

The independent reviewer should report findings against this fixed commit and separate implementation defects from untested physical-device behavior. Browser-toolbar zoom/OS scaling, physical iOS/IME/Combo Touch, Firefox and power use remain open boundaries; CSS zoom interaction tests do not establish geometric parity under arbitrary transforms. The unchanged large pearl renderer is outside this incremental implementation's capture fix.

See [README.md](./README.md), [results.json](./results.json) and [evidence-index.json](./evidence-index.json) for coverage, phase distinctions and reproducible local evidence. The already-created runtime TGZ contains final implementation and public API docs. These nested review records were appended after packaging and are intentionally separate from the frozen package/archive; do not describe the earlier portable ZIP as containing later records.
