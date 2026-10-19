from pathlib import Path
import json,hashlib,re,subprocess,concurrent.futures,sys
w=Path(sys.argv[1]); out=Path(__file__).parent; data=out/'http'; data.mkdir(exist_ok=True)
html=(w/'public/ui/index.html').read_text(encoding='utf-8')
review='/ui/field-sizing-review-20261019/'
rh=(w/'public'/review.lstrip('/')/'index.html').read_text(encoding='utf-8')
old_assets=re.findall(r'(?:src|href)="(/ui/releases/1.2.2/[^"?#]+(?:\.js|\.css|\.svg))"',html)
new_assets=[review+p.removeprefix('./') for p in re.findall(r'(?:src|href)="([^"?#]+(?:\.js|\.css|\.svg))"',rh)]
paths=['/ui/index.html','/ui/showcase-manifest.json',*old_assets,'/ui/review-20261019/index.html','/ui/review-20261019-r2/index.html','/ui/review-20261019-r3/index.html','/ui/releases/1.2.1/index.html','/ui/archive/production-1.2.1-20261019/index-original.html','/ui/releases/1.2.2/licenses/LICENSE-NOTICE.md','/ui/homepage-entry-manifest.json',review+'index.html',review+'review-manifest.json',*new_assets]
def fetch(p):
    name=hashlib.sha256(p.encode()).hexdigest()[:16]; body=data/(name+'.body'); head=data/(name+'.headers')
    subprocess.run(['curl.exe','--location','--fail','--silent','--show-error','--max-time','35','-A','Mozilla/5.0','-D',str(head),'https://alvenx.com'+p,'-o',str(body)],check=True)
    remote=body.read_bytes(); local=(w/'public'/p.lstrip('/')).read_bytes()
    assert remote==local,p+' byte mismatch'
    return {'path':p,'sha256':hashlib.sha256(remote).hexdigest(),'bytes':len(remote),'matchesLocal':True,'cspPresent':'content-security-policy:' in head.read_text(encoding='utf-8').lower()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: checks=list(pool.map(fetch,paths))
assert '<meta name="robots" content="noindex' not in html
assert 'noindex,nofollow' in rh
m=json.loads((w/'public/ui/showcase-manifest.json').read_text(encoding='utf-8'))
assert m['version']=='1.2.2' and m['sourceCommit']=='92a4c1bd62c5f06ef345dc435e301c5aee4607fd'
entry=json.loads((w/'public/ui/homepage-entry-manifest.json').read_text(encoding='utf-8-sig'))
assert entry['kitVersion']=='1.3.0' and entry['packageSha256']=='3acd90283037d999406d322c385f36570582191b1194f999c6a149c484c470f4'
report={'status':'passed','unchangedShowcaseVersion':m['version'],'homepageKitVersion':entry['kitVersion'],'sourceCommit':entry['sourceCommit'],'productionIndexable':True,'reviewNoindex':True,'checks':checks,'historyPreserved':True}
(out/'online-http-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','byteChecks':len(checks),'showcaseVersion':m['version'],'homepageKitVersion':entry['kitVersion']}))
