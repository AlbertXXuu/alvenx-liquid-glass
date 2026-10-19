from pathlib import Path
from PIL import Image, ImageChops
import json

root=Path('output/playwright/r3-protocol-replay')
results=[]
def read_result(engine):
    raw=(root/(engine+'-integration-result.txt')).read_text(encoding='utf-8-sig')
    decoder=json.JSONDecoder()
    marker=raw.index('### Result')+len('### Result')
    return decoder.raw_decode(raw[marker:].lstrip())[0]

def compare(engine,name_a,name_b,lens):
    a=Image.open(root/(engine+'-integration-'+name_a+'.png')).convert('RGB')
    b=Image.open(root/(engine+'-integration-'+name_b+'.png')).convert('RGB')
    assert a.size==b.size
    changed_inside=changed_outside=inside_pixels=outside_pixels=0
    max_inside=max_outside=0
    left,top,right,bottom=lens
    diff=ImageChops.difference(a,b)
    for y in range(a.height):
        for x in range(a.width):
            value=max(diff.getpixel((x,y)))
            if left<=x<=right and top<=y<=bottom:
                inside_pixels+=1;changed_inside+=value>2;max_inside=max(max_inside,value)
            else:
                outside_pixels+=1;changed_outside+=value>2;max_outside=max(max_outside,value)
    return {'inside':{'pixels':inside_pixels,'changedAbove2':changed_inside,'percent':round(100*changed_inside/inside_pixels,3),'maxDelta':max_inside},'outside':{'pixels':outside_pixels,'changedAbove2':changed_outside,'maxDelta':max_outside}}

for engine in ['chromium','webkit']:
    r=read_result(engine);cases=[]
    for c in r['cases']:
        kind=c['kind'];l=c['initial']['lens'];box=(int(l['x'])-1,int(l['y'])-1,int(l['x']+l['width'])+2,int(l['y']+l['height'])+2)
        zero=compare(engine,kind+'-zero',kind+'-refracted',box)
        updated=compare(engine,kind+'-updated-zero',kind+'-updated',box)
        live=compare(engine,kind+'-refracted',kind+'-updated',box)
        assert zero['inside']['changedAbove2']>100, (engine,kind,zero)
        assert updated['inside']['changedAbove2']>100,(engine,kind,updated)
        assert zero['outside']['changedAbove2']==0,(engine,kind,zero)
        assert updated['outside']['changedAbove2']==0,(engine,kind,updated)
        assert live['inside']['changedAbove2']>100,(engine,kind,live)
        cases.append({'kind':kind,'mode':c['initial']['mode'],'originalScale':c['initial']['scale'],'refraction':zero,'updatedRefraction':updated,'liveSourceUpdate':live['inside']})
    results.append({'engine':engine,'version':r['version'],'cases':cases})
report={'date':'2026-10-19','scope':'Actual R3 mobile-review.html integration; cross-SVG source use with current LiquidControl C2 map/material. No physical iOS device claim.','method':'UI Reduced motion stabilizes geometry; filter scale zero vs original, then change real Source word and Source line. Source pixels outside lens show no changes above 2/255 for each scale comparison; inspect reported maxDelta for exact-zero versus low-level raster variance. No CSS blur settings change.','pass':True,'results':results}
(root/'integration-pixel-summary.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
