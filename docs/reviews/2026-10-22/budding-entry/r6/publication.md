# R6 — accepted shape, earlier first frame and retained first activation

The owner accepted R5 and requested removal of visible startup delay. R6 keeps the exact geometry and material, prerenders the real accepted closed mother, reduces the English font critical path, and uses bounded asynchronous shader preparation where available. A pre-main or held gesture survives hydration. The native first-frame link remains useful without JavaScript.

Source: `review-budding-20261022-r6` / `fdfeb10b93fc390c8859a2d475c1fba643ce5a81`. [Hosted review](https://alvenx.com/ui/budding-refinement-review-20261022/); [accepted R5 archive](https://alvenx.com/ui/budding-refinement-review-20261022-r5/). The production homepage and root /ui/ source remain unchanged.

## Verification

| Coverage | Result |
|---|---|
| Geometry | 392/392, byte-identical R5 geometry |
| Interaction | 129/129 local and 129/129 hosted |
| Material synchronization | 5/5 local and 5/5 hosted |
| Startup and hidden-time lifecycle | 19/19 local and 19/19 hosted |
| Held gesture and modified links | 10/10 local and 10/10 hosted |
| GitHub CI | 5 runs, 5 jobs, 58 steps successful |
| Hosted exact bytes | 268 resources matched; homepage presence checked separately |

## Final hosted paired measurements

The same protocol alternates R5/R6, R6/R5, R5/R6, with three fresh HTTP contexts per version and condition. Desktop is 1413×1000; constrained phone is 393×852, 4× CPU, 150 ms latency and 200,000 B/s. Driver/shader cache is uncontrolled. Double-rAF is a paint opportunity, not GPU completion.

| Condition/version | FCP ms | Accepted frame opportunity ms | Live material ms | First ready input → growth ms | Blocking link wait ms |
|---|---:|---:|---:|---:|---:|
| desktop / R5 | 2048 | 2212.5 | 2205.9 | 8.9 | 136 |
| desktop / R6 | 1808 | 1796.4 | 1989.7 | 11.5 | 0 |
| phone-constrained / R5 | 2804 | 3415.7 | 3356.9 | 460.2 | 147.6 |
| phone-constrained / R6 | 1972 | 1965.5 | 2603 | 119.4 | 0 |

R6’s accepted first frame is an exact static material texture; R5’s is its first live draw. They must not be described as equivalent renderer readiness. The complete raw protocols, compression/transfer observations and local/hosted results are retained in [performance/](performance/). Established-input latency was not improved in the earlier local N=3 sample. No zero-delay or FPS claim is made.

During deliberately delayed compilation, native C2 backdrop interaction remains available but the blue/violet volume is temporarily flatter until the full matching material blends in. The forced-pending screenshots document this actual boundary. No static image is stretched into the growing shape. Without KHR, a synchronous wait can remain after first paint.

## Source, activation and evidence

Website source `a89007ebc29c42385fe2b61414039ba44a953590` and merged main `2fb128fb0046f3076a918608ecb08b3f0898c161` share tree `a65bdccd1b6e1c8998cb4509cb8445b9c41eff36`. The activation API and exact hosted resources were checked independently of the deployment process exit; the actual process result is retained in [publication.json](publication.json).

[evidence-index.json](evidence-index.json) hashes the safe results, replay callbacks and screenshots. Local screenshots and final hosted screenshots were inspected. The immutable source and records tags preserve this experiment independently of future review URL changes. Existing release packages and historical receipts are retained; the R6 receipt is a separate attachment.

Windows browser/CDP and viewport tests do not certify physical iOS/Safari, OS IME, Combo Touch, power use or all-device FPS. Owner device experience remains pending. Rights are reserved / UNLICENSED; font licenses remain intact.
