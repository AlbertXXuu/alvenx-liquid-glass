# Publication — native text inset correction

Follow-up CI and identity verification is recorded in the [2026-10-20 closure](ci-closure/README.md). The queued CI observations below describe the original delivery time; the follow-up retains their final run conclusions separately.

Published at [alvenx.com/ui](https://alvenx.com/ui/), with final verification continuing across midnight into 2026-10-20 Asia/Shanghai. Only the typed-text start moves right. The field's width, height, contour and placement, send control, font, vertical text position and other padding remain unchanged. No A/B/C sizing variant was selected.

The native content starts at 38 px on phones and 60 px on desktop/tablet layouts. Compared with the previous production page, it moved right by 11.1875 px at 393 px viewport width, 17.078125 px at 768 px and 12.75 px at 1366 px. The unchanged input and send bounds were measured directly. Chinese, long English, ordinary message feedback and the literal `<3` response pass.

Immutable source: `v1.3.1` / `08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da`. Website source: `242be6814526ec4586df37e2ba78add1200a3fc2`, merged via [PR42](https://github.com/AlbertXXuu/AlvenXWebsite/pull/42) as `909cee105a83402c14ef7b8e40d0bb3d90403ff0`. Deployed Worker: `eba97f87-43b2-45b1-8614-5da6dbb77105`. The homepage keeps the exact 1.3.0 installed budding component; its source and dependency files are unchanged.

38 focused before/after checks and 30 fresh production assertions passed. 21 hosted byte checks matched the local artifacts, including retained history and the independent review. Type/document checks, library/showcase builds, inherited contracts and 410 budding numeric checks passed. The actual final 1.3.1 tarball passed independent installation, type checking and production build; its SHA-256 is `69fe336c6b5e5f4b4a4ebade2550d2963724aa129b0c931ca7e46131c5ed2ab7`. Library `src/` and scoped `styles/` are unchanged from 1.3.0, so its existing runtime and installed-package browser evidence remains applicable to those identical files.

Local website lint, brand/navigation/language/assets/consistency/case checks, production build and built CSS checks passed. Wrangler printed its completed dry-run and deployed Worker identity, but the known Windows helper process stayed open and was stopped after completion output. GitHub's additional CI runs were still queued when these delivery records were written; they are not counted as successful checks here. The exact source and run identities are retained in the receipt.

The final Worker also passed 16 retained-homepage assertions across Chromium and WebKit, following the actual native link into the new 1.3.1 showcase. WebKit cancelled one existing Cloudflare telemetry request on navigation; application resource and HTTP errors remained zero.

The previous 1.2.2 root entry and manifest are archived at `/ui/archive/production-1.2.2-20261019/`; all previous release and review trees remain byte-identical. The independent sizing comparison remains a historical study. Windows browser checks do not independently certify physical iPhone/iPad, Safari, system IME or Combo Touch. Rights remain all rights reserved / UNLICENSED.
