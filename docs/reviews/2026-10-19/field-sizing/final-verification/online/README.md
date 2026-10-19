# Hosted independent review — browser spot check

Checked on 2026-10-19: **https://alvenx.com/ui/field-sizing-review-20261019/**.

The deployment identity supplied by the publishing task is Worker `79be58bd-165f-4a9e-84ad-475ad4cf1359`. Browser checks below verify the content at the public URL; they do not independently read a Worker deployment ID from the page.

Installed Chrome on Windows, controlled through Playwright CLI, passed **47 assertions** after a fresh navigation with error/response observers attached. No product files, deployment, or Git state were changed during this check.

| Viewport width | Actual fields A / B / C | Text inset A / B / C |
| ---: | --- | --- |
| 393 px | 267 × 68 / 267 × 64 / 267 × 60 px | 40 / 40 / 36 px |
| 768 px | 568 × 74 / 568 × 68 / 460 × 60 px | 56 / 52 / 44 px |
| 1366 px | 660 × 74 / 580 × 68 / 460 × 60 px | 56 / 52 / 44 px |

At each width, all three fields became optical-ready using `scene` mode, with no optical error. The live size/inset readouts matched measured DOM geometry. The page had no horizontal overflow. Inputs remained 16 px, left aligned, zero padding, and vertically centered with a measured center error of 0 px.

The short Chinese and long English sample buttons populated all three fields correctly. Editing B changed only B, leaving A and C unchanged. Enabling the safe-area guides displayed the dashed overlays; the switch was restored to off. Default state was confirmed to have the guides off.

The fresh observed session reported:

- Page errors: **0**.
- Console warnings/errors, including CSP diagnostics: **0**.
- HTTP responses with status 400 or higher: **0**.
- Failed or cancelled requests: **0**.

`desktop-1366.png` and `phone-393.png` show the hosted page with the short Chinese sample and guides off. Both screenshots were opened and visually inspected: the three options are distinct, the input text has the intended safe inset, and no text/controls overflow their scenes. These are real-browser viewport checks on Windows, **not physical iPhone/iPad, Safari, system IME, or Combo Touch certification**. The owner has not selected A, B, or C through this verification.

Evidence:

- `verification.json`: structured results, measured values, and diagnostics.
- `raw-cli.log`: actual CLI output and recorded callback.
- `spotcheck.playwright.js`: bounded callback used against the public URL.
- `desktop-1366.png`, `phone-393.png`: hosted screenshots.
- `sha256.json`: integrity index for this online evidence, excluding itself.

The owned `fieldonline` browser session was closed after the check. Existing local servers and other browser sessions were preserved.
