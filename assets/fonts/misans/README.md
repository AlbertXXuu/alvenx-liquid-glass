# AlvenX Chinese font delivery

Typography revision `2026-10-13.1` implements the owner's request to use
**MiSans across all AlvenX Chinese interfaces** after reviewing the actual
website font comparison. Instrument Sans remains the Latin face. Logo
outlines, the approved palette and header geometry remain their existing
canonical assets and values.

Acceptance is the complete official static web distribution at CSS weights
`400`, `500`, `600` and `700`: 56 original WOFF2 Unicode-range shards per
weight, plus four original complete WOFF2 faces from the official MiSans ZIP,
228 font files in total; matching hashes; the original license; portable CSS;
and verified Chinese core UI glyph coverage in every weight. No local font
conversion, glyph editing or new binary subsetting is part of this delivery.

The official 4.003 web shards contain 11,093 codepoints per weight and omit
full-width Chinese `？` and `／`, both used in the website. The official
4.009 complete fonts contain 29,571 codepoints. Four additional CSS faces
select the 18,478 codepoints absent from effective web-shard coverage, calculated
from each shard's declared range intersected with its actual cmap. Existing
web-shard declarations and binaries remain unchanged. These new CSS ranges
control browser selection; the full font binaries themselves are unchanged.
The 10-character outline/advance comparison across all four weights matched
40/40 samples; its evidence is recorded in the manifest.

## Consumer contract

Copy this **entire directory**, including `manifest.json`, `NOTICE.txt` and
`MiSans-License-Agreement.pdf`, into a product's public `fonts/misans/`
directory. Serve `misans.css` and the sibling WOFF2 files unchanged. A plain
stylesheet link can load `/fonts/misans/misans.css`; a bundler may instead
import a generated CSS copy whose **URLs alone** are rewritten to that public
prefix. Such a copy must preserve every font family, weight, display value
and Unicode range, and its provenance/hash should be recorded by the consumer.
Use the base path appropriate to that product's real public asset routing.

The canonical `misans.css` uses relative `./misans-{weight}-{official-name}.woff2`
URLs and `font-family: "MiSans"`. Its spelling is the runtime family contract.
Place `"Instrument Sans", "MiSans"` first in the sans-serif stack, followed
by the existing system fallbacks. Product code can use weights 400/500/600/700;
the official static distribution maps these CSS weights to its original
face metrics. Do not substitute variable-axis values for the selected faces.
`font-display: swap` keeps text readable during loading. Browsers select
shards using `unicode-range`; do not preload the complete Chinese font bundle.
The upstream CSS is provenance, not the stylesheet served to customers. Normal
characters continue to use small web shards. A character from a missing range,
including the two full-width punctuation marks, fetches the corresponding
original complete font (about 4.86–5.08 MB). This is the documented cost of
preserving official binaries while serving those characters in MiSans. Font
files should receive normal long-lived asset caching in each product.

Keep the original agreement and the MiSans usage/copyright notice accessible
with the delivered assets. The official FAQ permits embedding; the custom
agreement governs attribution, preserved notices, and restrictions. MiSans
is not licensed under Instrument Sans's OFL. Sources and hashes are recorded
in `manifest.json`; this asset directory is the cross-product source of truth.

## Rebuild and verification

Run `python foundation/brand/sources/misans/fetch_fonts.py` from the workspace
using the existing Python runtime with FontTools/Brotli support. The script
fetches the official static CSS and unchanged WOFF2 files, and the official
`MiSans.zip` when the pinned complete faces are not already available. The
227,880,072-byte archive is verified, its four WOFF2 entries are extracted
without conversion, and the temporary ZIP is removed. The script reads cmap
and name tables, computes CSS coverage complements, compares outline/metrics
samples, and writes the portable CSS and provenance manifest. It
uses only `.workspace/tmp/website-misans-20261013` for staging and removes its
own temporary directory in `finally`. Existing hashes pin subsequent fetches;
an upstream change requires a reviewed typography revision.

`python foundation/brand/validate_brand.py` checks the registered contract,
228-file font inventory, original web CSS descriptors, complementary fallback
descriptors and all asset hashes. The manifest's cmap evidence verifies 167
core Chinese interface and punctuation characters for each of the four
weights. Product acceptance must additionally check its actual rendered
text, font loading, layout and missing characters; future rare CJK characters
are not covered by a blanket promise.
