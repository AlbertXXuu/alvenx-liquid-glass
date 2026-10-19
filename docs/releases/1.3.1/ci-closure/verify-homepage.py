from pathlib import Path
import concurrent.futures, datetime, hashlib, json, re, subprocess, sys

website=Path(sys.argv[1]); out=Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).parent
out.mkdir(parents=True,exist_ok=True)
(out/'http').mkdir(exist_ok=True); (out/'homepage-http').mkdir(exist_ok=True)
subprocess.run(['curl.exe','--fail','--silent','--show-error','--max-time','35','-A','Mozilla/5.0','https://alvenx.com/','-o',str(out/'http/homepage.html')],check=True)
html=(out/'http/homepage.html').read_text(encoding='utf-8')
paths=sorted(set(re.findall(r'(?:src|href)="(/_next/static/[^"?#]+\.(?:js|css))"',html)))
assert any('home-content-' in p and p.endswith('.js') for p in paths)
assert any('home-content.' in p and p.endswith('.css') for p in paths)
assert 'glass-budding-link' in html and 'data-budding-link="website-ui-entrance"' in html

def verify(p):
    name=hashlib.sha256(p.encode()).hexdigest()[:16]+'.body'
    target=out/'homepage-http'/name
    subprocess.run(['curl.exe','--fail','--silent','--show-error','--max-time','35','-A','Mozilla/5.0','https://alvenx.com'+p,'-o',str(target)],check=True)
    data=target.read_bytes(); local=(website/'dist/client'/p.lstrip('/')).read_bytes()
    assert data==local, 'Homepage resource differs from deployed local build: '+p
    return {'path':p,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'matchesLocalBuild':True}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: checks=list(pool.map(verify,paths))
result={'status':'passed','verifiedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'websiteSourceCommit':'242be6814526ec4586df37e2ba78add1200a3fc2','homepageKitVersion':'1.3.0','homepageSourceCommit':'7f202150b2e95f744d90eab39eaf5e2d18d40bd8','nativeBuddingControlPresent':True,'checks':checks}
(out/'homepage-resource-verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','homepageByteChecks':len(checks)}))
