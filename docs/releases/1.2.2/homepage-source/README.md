# Homepage entrance source snapshot

These two editable source files reproduce the authorized homepage entrance. They are copied byte-for-byte from the isolated official website source before the release freeze; the website continues to install its existing `vendor/alvenx-liquid-glass-1.1.2.tgz`.

Place `<LiquidGlassEntry />` directly between the existing Explore the work anchor and GitHub anchor inside `.hero__actions`. The component owns only its local reveal state, uses the library clock/material and native `LiquidControl kind="circle"`, and adds no painted surface or color layer. The visible empty sphere samples the actual host backdrop according to the engine's supported optical mode. Arbitrary DOM SVG backdrop displacement is not certified on Safari; native compatible glass remains the existing library fallback.

The first click/Enter/Space reveals a separate native `explore me!` anchor with `/ui/` as its href. It preserves keyboard focus and browser link behavior. The 66px desktop/44px mobile control uses a scoped 10px narrow-screen action gap; the revealed link sits below and remains within the viewport. At 320px the existing GitHub action wraps in DOM order. Reduced motion disables the reveal animation.

All visible text remains native DOM text. Public source inspection does not grant a reuse license; the kit's all-rights-reserved notice applies.
