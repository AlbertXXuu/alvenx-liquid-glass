from pathlib import Path
from PIL import Image,ImageChops
import json
root=Path('output/playwright/r3-protocol-replay')
rows=[]
for engine in ['chromium','webkit']:
    for kind in ['text','track']:
        name=engine+'-integration-'+kind+'-refracted.png'
        a=Image.open(root/'before-async'/name).convert('RGBA')
        b=Image.open(root/'after-async'/name).convert('RGBA')
        difference=ImageChops.difference(a,b)
        pixels=list(difference.getdata())
        rows.append({'engine':engine,'kind':kind,'pixels':len(pixels),'changedAbove2':sum(max(p)>2 for p in pixels),'maxChannelDelta':max(max(p) for p in pixels),'notes':'Same fixed source and reduced-motion geometry; compare recorded lens bounds in the corresponding integration result.'})
report={'date':'2026-10-19','method':'Compare actual integrated R3 settled screenshots before vs after native async PNG encoding; separate from exact decoded normal-field RGBA comparisons.','results':rows}
(root/'before-after-visual.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
