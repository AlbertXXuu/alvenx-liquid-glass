from pathlib import Path
from PIL import Image
import hashlib,json
from datetime import datetime,timezone
q=Path(__file__).resolve().parent
before=q.parent/'narrow-rim-original.png'
if not before.exists():before=q/'intermediate/narrow-rim-original.png'
cases=[('before',before),('local',q/'touch-narrow-open.png')]
if (q/'online/touch-narrow-open.png').exists():cases.append(('online',q/'online/touch-narrow-open.png'))
records=[]
for stage,path in cases:
 im=Image.open(path).convert('RGB');assert im.size==(810,288),'Expected 320 CSS px / DPR 3 capture.'
 def lum(x,y):return sum(c*w for c,w in zip(im.getpixel((x,y)),(.2126,.7152,.0722)))
 peaks=[]
 for x in range(round(im.width*.04),round(im.width*.64)):
  if im.width*.17<x<im.width*.32:continue
  peaks.append(max(lum(x,y)-max(lum(x,y-3),lum(x,y+3)) for y in range(round(im.height*.7),round(im.height*.94))))
 record=dict(stage=stage,path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),columns=len(peaks),maxRidge=round(max(peaks),4),p95=round(sorted(peaks)[int(len(peaks)*.95)],4),columnsOver8=sum(p>8 for p in peaks))
 if stage=='before':assert record['columnsOver8']>100,'Regression fixture must reproduce the white band.'
 else:assert record['maxRidge']<8,'Residual bright band relative to both neighboring pixels.'
 records.append(record)
r=dict(status='passed',createdAtUtc=datetime.now(timezone.utc).isoformat(),scope='Bottom arc of mother and chamber, 320 CSS px / DPR 3 Chromium screenshot. Detect local luminance ridge at 1 CSS px neighbors; not whole-image aesthetics or physical Safari certification.',threshold=8,records=records)
(q/('rim-pixels-online.json' if len(cases)==3 else 'rim-pixels-local.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(json.dumps(r))
