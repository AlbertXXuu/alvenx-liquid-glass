# Homepage living pearl — 2026-10-29

The owner approved the showcase living-pearl interaction for the homepage. The installed `VolumeBuddingLink` 1.4.3 uses the same anchored geometry, independent pointer response and blue-violet animated lighting. The mother toggles the chamber; the chamber links to `/ui/`. The existing early frame and keyboard, native link and reduced-motion behavior remain. Ambient rendering follows the stored setting, visibility and reduced-motion preference.

- Kit implementation: `e2290b0c9ed43143240a6912e0560ecdf89ee132`, tag `v1.4.3`. Package SHA-256 `b7ee608f1fba07573d3ab3086ca75c44998d331168d7f98d06c0eab77aeb238a`.
- Website source: `12c8bf74fdaa3402b98a37d218c67932506d62e9`; PR 60 merged as `51352e0af2216afc117ceeb5602618c0dd7bc42c`.
- Cloudflare Worker `818540aa-6a43-49c7-931c-f8ab7d9debc5`, 100% active, deployment `886da5ed-9033-4581-9122-7b26d4274620`.
- Kit source CI run 40740719222 and website PR CI run 40741817287 and merged-main CI run 40742262699 passed.
- Local and production Chromium checks each passed 56 assertions at 320, 393 and 1413 CSS pixels, including independent lobe hover/drag, simulated touch, toggling, navigation, keyboard, reduced motion, ambient motion and no-JS first frame. Production recorded zero page or console errors. The deployed build matched 18 hosted resources byte for byte. See `online-qa.json` and `http-verification.json`.
- Screenshots: [desktop](images/home-1413-open.png), [phone](images/home-393-open.png), [phone detail](images/detail-393.png). These are responsive browser captures; physical iOS/Safari is not independently certified.

The separate showcase remains on its earlier source at this publication point. This record does not change the 1.4.3 package or historical tags. Rights remain reserved / UNLICENSED.
