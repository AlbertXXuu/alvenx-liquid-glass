# Production 1.2.2 online QA — 2026-10-19

Target: https://alvenx.com/ and its native invitation destination https://alvenx.com/ui/.
Expected kit source: 92a4c1bd62c5f06ef345dc435e301c5aee4607fd / v1.2.2.
Deployment ready identity supplied by root: Worker 45aee022-7598-484d-a3eb-624430a8e490; website source 2ab7023.

The final output-only callback is online-qa.cjs. Chromium 155.0.8059.84 and Windows WebKit 26.5 each passed 43 assertions in fresh 393×852 and 1180×820 contexts, totaling 86 assertions. Both report zero uncaught page errors, zero console messages at warning/error level (including preload and CSP diagnostics), zero HTTP errors and zero first-party product request failures. Homepage visits include a 3.5 second dwell after font readiness to allow preload diagnostics to appear; none appeared in these runs.

The WebKit report retains two cancelled requests to the existing /cdn-cgi/rum analytics endpoint during navigation. They are explicitly marked analytics rather than removed from the raw evidence. Cloudflare also injects a known analytics type=module script; the main first-party module and stylesheet both correctly use /ui/releases/1.2.2/. Both browser reports preserve the full observed module list.

Passed behavior: Explore the work → textless sphere → GitHub hero action order; compact unobscured sphere without overlap; initial invitation absent; first touch reveals `explore me!` without navigation; second native link action enters /ui/; production source/version metadata; unchanged horizontal single-canvas preview geometry and typography on opening Surface parameters; seven same-section parameter controls; preview leaves the viewport by the exact normal document scroll distance; Chinese sample uses ready 600-weight MiSans and has stable width after publishing; ordinary response, literal `<3` and empty validation; no first-party message API calls.

Visually inspected online-chromium-393-home-initial.png, -home-revealed.png, -message-ordinary.png and -message-heart.png. Initial sphere has no visible lettering. The revealed invitation sits below the action row without covering its neighbors. Full fields-section captures show readable reply text without overlapping the native input or heading. Online 1180 px and 393 px volume screenshots are also retained.

Harness-only corrections before the final pass: the Playwright CLI callback sandbox does not expose the URL constructor, so fixed-origin comparisons use exact origin prefixes; Cloudflare's known module injection is recorded separately from first-party artifact provenance. Neither required product changes or redeployment.

Boundary: these are desktop browser contexts. They do not certify physical iPhone/iPad touch, OS IME or Combo Touch. Known Windows WebKit WebGL resize/capture behavior and native Tab defaults remain separate limitations. Chromium screenshots establish this run's visual evidence.

