# 1.3.1 final online text-inset check

Public route checked: **https://alvenx.com/ui/**. The browser capture finished just before Asia/Shanghai midnight on 2026-10-19; this record was finalized on 2026-10-20.

Deployment identity supplied by the publishing task: Worker `eba97f87-43b2-45b1-8614-5da6dbb77105`, kit source `08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da`, website source `242be6814526ec4586df37e2ba78add1200a3fc2`. The browser verifies the public content and behavior, rather than independently reading the Worker control plane. The original raw CLI result mislabeled the kit commit as the website source; its raw bytes are preserved, while `verification.json` and the replay callback carry the corrected identities.

Timing provenance: the raw CLI body does not contain an embedded absolute timestamp. Its preserved file UTC creation and last-write times are 2026-10-19 15:59:22 and 15:59:31, corresponding to **2026-10-19 23:59:22–23:59:31 Asia/Shanghai**. The hosted screenshots were written at 15:59:28 and 15:59:30 UTC. The initial README was written at 16:00:02 UTC, already **2026-10-20 00:00:02 Asia/Shanghai**; metadata finalization and the separate homepage-retention record continued after midnight. `verification.json` retains the more precise file timestamps and distinguishes capture date from record date.

Installed Chrome on Windows passed **30 targeted assertions** across 393, 768, and 1366 px viewports. The protocol repeats the original native text measurement and editing steps without rechecking unrelated page parameters.

| Viewport | Typed text start inside field | Field dimensions | Send dimensions |
| ---: | ---: | --- | --- |
| 393 px | 38 px | 285 × 68 px | 44 × 44 px |
| 768 px | 60 px | 554 × 74 px | 58 × 58 px |
| 1366 px | 60 px | 650 × 74 px | 58 × 58 px |

Field and send x/y/width/height match the retained pre-change production baseline at every viewport. Text remains vertically centered at 16 px. All three views have no horizontal page overflow. The field is optical-ready and reports no optical error.

Native Chinese and the retained long English sentence can be entered. `fluency` still returns literal `<3`; ordinary nonempty input returns `Good question… but I don’t understand.`. Tests used the existing native input and submit button/Enter behavior.

Listeners attached before a fresh production navigation observed **zero page errors, zero console warning/error/CSP diagnostics, zero application HTTP errors, and zero failed/cancelled requests** during the scoped check.

The reviewer opened `production-after-393.png` and `production-after-1366.png`. The screenshots show the intended inward text shift while preserving the accepted glass field, surrounding layout, and send button. They match the local corrected screenshots. This is a real browser check on Windows with viewport resizing; it does **not** certify physical iPhone/iPad, Safari, system IME, or Combo Touch.

Retained files:

- `verification.json`: all assertions, measured field/send bounds, text starts, and diagnostics.
- `raw-cli.log`: actual CLI output and recorded protocol.
- `check-text-inset.playwright.js`: bounded callback with the original field/send baseline embedded for replay.
- `production-after-393.png`, `production-after-1366.png`: hosted Chinese-input screenshots.
- `sha256.json`: SHA-256 and byte lengths of this online record, excluding itself.

No previous baseline, frozen source, product configuration, deployment, or Git state was modified for verification. The owned `insetonline` browser session was closed when finished.
