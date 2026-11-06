"""Build static optical-source faces from the retained OFL variable font.

Build-only dependency: fonttools[woff]==4.60.1. No runtime dependency.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1]
source = root / "assets/fonts/InstrumentSans-wdth-wght.woff2"
output = root / "assets/fonts/optical"
output.mkdir(exist_ok=True)
for weight, style in [(400, "Regular"), (500, "Medium"), (600, "SemiBold")]:
    font = TTFont(source, recalcTimestamp=False)
    axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
    axes["wght"] = weight
    instantiateVariableFont(font, axes, inplace=True, optimize=True)
    family = "AlvenX Optical Latin"
    names = {1: family, 2: style, 3: f"{family}-{style}-static", 4: f"{family} {style}",
             6: f"AlvenXOpticalLatin-{style}", 16: family, 17: style}
    for record in list(font["name"].names):
        if record.nameID in names:
            font["name"].setName(names[record.nameID], record.nameID, record.platformID,
                                 record.platEncID, record.langID)
    font.flavor = "woff2"
    target = output / f"InstrumentSans-Optical-{weight}.woff2"
    font.save(target)
    print(target.relative_to(root), target.stat().st_size)
