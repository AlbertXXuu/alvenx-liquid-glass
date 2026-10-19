# Installed consumer browser smoke — 2026-10-19

The final1.3.0 tarball was exercised in an independent temporary consumer, using its normal installed package import. Its existing installation, type checking and production build were verified separately by the release integrator. This record adds a browser runtime smoke rather than repeating those claims.

Chrome155.0.8059.84 at1366×1100 passed **20/20** assertions. The installed BuddingLink renders a textless mother with one optical body, passes through intermediate continuous growth, completes the same connected chamber and follows the consumer's native `#outside` link. Its destination stays inert while growing and pointer activation does not leave a keyboard contour. Numeric material editing, native range keyboard input, shared switch state, reset, controlled-scene transmission and unrelated host CSS remain usable. No page errors, console warnings/errors, failed requests or HTTP errors occurred.

`package-identity.json` confirms installed `@alvenx/liquid-glass` version1.3.0, UNLICENSED. The consumer lock SHA-512 integrity matches the actual final tarball; its SHA-256 is `3acd90283037d999406d322c385f36570582191b1194f999c6a149c484c470f4`. No absolute developer checkout or temporary-directory path is included in this public record.

The three PNGs preserve initial, intermediate and completed installed states. The completed screenshot was visually inspected. These are a desktop runtime smoke, not physical touch/iOS or performance certification.

## Test-fixture corrections

Early runner output is retained under `process/`:

1. The CLI callback sandbox does not expose the global `URL` constructor. The harness now checks the returned page URL suffix; no product code changed.
2. A native range input does not need an explicit `aria-valuenow` attribute. The actual input value and `aria-valuetext` both correctly became1.6; the harness now checks the native value property rather than demanding that optional attribute.
3. A diagnostic edit persisted1.6 in this owned fixture. Reset correctly restored the default2.5, so comparing it with that persisted initial value was invalid. The reproducible final harness clears only its own `fresh-consumer` storage key at initialization and checks reset against a fresh baseline.

These corrections are distinguished from product failures and do not alter the prior records. `browser-smoke-report.json` and the top-level callback/output are the final20-pass run. The consumer directory was preserved. The independently started port5184 service and its owned browser session were stopped after verification; other services and user browser tabs were untouched.
