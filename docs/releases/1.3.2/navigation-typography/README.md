# Navigation typography correction — 2026-10-22

The owner identified a smaller Language label in the expanded navigation. Production measurements reproduced 14 px / 18.2 px line height for the adjacent navigation items, while the nested Language control retained 12 px / 15.6 px at 393 and 820 CSS-pixel widths. Their font family and weight were already identical.

The navigation now owns one font rule. Direct links/buttons and the nested language component inherit it, including the 14 px expanded-navigation rule up to 900 px; the desktop row remains 12 px. Font weight 500, line height 1.3, left alignment and 44 px targets are preserved. The reusable guidance is in [navigation.md](../../../navigation.md).

This is a showcase presentation correction. Library package version 1.3.2, the original `v1.3.2` implementation tag and all six existing release assets remain unchanged. The correction has its own source tag `v1.3.2-nav-type-20261022` and hosted namespace `/ui/releases/1.3.2-nav-type-20261022/`; it does not require a repackaged library or a homepage dependency change. Final deployment and online observations are recorded separately after actual verification.

Targeted browser verification checks shared computed font family, size, weight and line height, left alignment, target height, layout overflow, Chinese switching and keyboard disclosure/Escape focus restoration at 320, 393, 820, 900, 901 and 1180 CSS-pixel widths. Screenshots are visually reviewed at phone, tablet and desktop sizes. These are desktop browser observations, not physical iOS acceptance.
