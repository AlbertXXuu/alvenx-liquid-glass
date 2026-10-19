# 1.2.2 — normal-flow material controls and a playful entrance

On 2026-10-19 the owner accepted the other existing effects and requested three focused changes. This release preserves the horizontal form, material settings, native typography, continuous gestures and the stable Chinese sample publication from 1.2.1. Source remains public for inspection, all rights reserved / UNLICENSED.

## Owner correction and implementation

1. The volume and its controls stay in the same section and scroll together. Opening Surface parameters only inserts its controls below; it does not pin, shrink, relight or compress the preview. The prior viewport-measurement hook and all editing-dependent preview styles are removed.
2. The native Ask anything form returns `Good question… but I don’t understand.` for nonempty ordinary input. A trimmed, case-insensitive exact `fluency` returns literal `<3`. Empty input retains its prompt, editing clears the old response, and no request is sent to a service.
3. The official homepage replaces the Explore Liquid Glass CTA with an unlettered interactive glass sphere between Explore the work and GitHub. Clicking the sphere reveals `explore me!`; activating that native link enters `/ui/`. Its color comes from the actual component backdrop; no painted color/reflection overlay is added. The homepage retains its separately installed 1.1.2 library dependency and the existing brand/content baseline.

The owner's acceptance is a design decision about the existing visible baseline, not a claim that desktop automation certifies physical iOS input or display latency. New changes receive their own scoped verification before publication.

## Version preservation

Source is frozen under `v1.2.2`; subsequent delivery records use `v1.2.2-published` without moving the source tag. The 1.2.1 entry is archived separately while its `/ui/releases/1.2.1/` assets remain byte-identical. Earlier releases and review routes remain preserved.

The [verification record](verification.json), [process record](process.md), [homepage source snapshot](homepage-source/README.md) and [evidence manifest](evidence-manifest.json) retain the scoped checks and their limits. Local showcase tests passed 128 assertions per engine, and homepage tests passed 82 per engine, totaling 420 with zero page errors. No renderer, optical kernel, material default/range, endpoint contract or scheduling algorithm changes in this patch. Historical performance measurements are not new benchmarks for 1.2.2.
