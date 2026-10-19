# Process and owner decisions — 2026-10-19

The prior 1.2.1 docking behavior was an implementation misunderstanding. The owner wanted the material and parameters in the same section with normal scrolling. This patch removes its measurement hook and conditional preview styling while preserving the same canvas and shared settings.

The first unpublished homepage draft put a painted blue/violet reflection layer on a far-right pearl. During this task the owner clarified the placement and material: the existing glass component belongs directly between Explore the work and GitHub and receives its color from the host background. That draft was superseded before deployment. Final source has no painted layer and uses the actual existing component; the final screenshots use the `homepage-chromium-*` names. Local draft screenshots are retained as process evidence and are not accepted final visuals.

Screenshot review found a narrow-layout invitation intersection. The final invitation appears below the circle with 14px clearance and a scoped 10px mobile action gap. At393px all three actions fit one row; at320px the existing GitHub link wraps in DOM order. Neither the header nor hero text styling changes.

The focused kit test harness was corrected for native focus behavior in a three-column grid: focus need not scroll the entire preview offscreen. Its assertions now measure the exact document-scroll delta and explicitly scroll beyond the preview. WebKit value reads await the React state commit. These test corrections required no product change.

The owner accepted the other existing effects. This acceptance preserves their current source; measured runtime/geometry invariants remain separately documented. No new performance claim or physical-device certification is inferred from this patch.
