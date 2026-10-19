# R3 async-touch failure isolation / 异步触摸延迟定位

Date: 2026-10-19. Parent R3 remains **draft**. This supplements the rejected [first async strategy](../after-async/README.md) without rewriting its saved measurements or pixels.

[The focused trace](async-touch-debug.json) starts at pointerdown 0ms. Real HTML toBlob submitted at about8.6ms but completed at112.9ms; a diagnostic same-thread OffscreenCanvas convertToBlob submitted at0.2ms also completed at112.9ms. FileReader then completed the first map at117.8ms and coherent pressure DOM appeared at122.5ms. A second FileReader operation **within the same gesture** ran from124.1ms to221.2ms, about97.1ms later. This is an actual encoding/callback/read deferral, not just an isolated React pressure-attribute effect.

The simple same-thread OffscreenCanvas API substitution was locally ruled out for this tested path. This is not proof against every worker architecture or every browser. [The exact diagnostic callback](async-touch-debug.cjs) has no private output paths and is preserved unchanged; it runs through Playwright CLI from the parent workspace with the local kit Vite server at5174. Archiving did not rerun it.

**Counter correction:** zero cache/normal-map diagnostics in the earlier async-touch JSON came from a separate HMR module instance and are invalid as cost evidence. Their historical values stay untouched in the earlier phase. Native encode observations and pressure DOM latencies remain valid; zero counters must not be interpreted as zero computations or zero CPU.

Root engineering selected a hybrid strategy: exact synchronous normal maps during active touch and release settlement, asynchronous encoding for mouse/idle, plus epoch guards and offscreen cancellation. Implementation/typecheck was reported complete, but final matched cold/functional validation is pending. It is not yet an owner-accepted fix and does not establish physical iPhone/iPad/Combo Touch behavior.

[Summary](summary.json) · [SHA-256](SHA256SUMS.txt)
