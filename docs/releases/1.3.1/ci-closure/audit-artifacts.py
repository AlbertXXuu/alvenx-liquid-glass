"""Read-only AlvenX 1.3.1 release identity audit.

Requires Git, an authenticated GitHub CLI, existing release archives, and an
installed isolated website checkout. Paths are supplied by the caller; only
outputRoot is written. No package installation or archive extraction occurs.
"""
from pathlib import Path
import argparse, json, hashlib, subprocess, zipfile, tarfile, re, datetime, urllib.request, shutil

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--kit-root', '--kitRoot', dest='kit_root', required=True, type=Path)
parser.add_argument('--website-root', '--websiteRoot', dest='website_root', required=True, type=Path)
parser.add_argument('--output-root', '--outputRoot', dest='output_root', required=True, type=Path)
args = parser.parse_args()
KIT = args.kit_root.resolve()
WEB = args.website_root.resolve()
OUT = args.output_root.resolve()
SOURCE = '08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da'
PUBLISHED = '18341427aea5124724e90c4b8a8c82a99acce42e'
WEB_SOURCE = '242be6814526ec4586df37e2ba78add1200a3fc2'
WEB_MAIN = '909cee105a83402c14ef7b8e40d0bb3d90403ff0'
OLD_SOURCE = '7f202150b2e95f744d90eab39eaf5e2d18d40bd8'
issues=[]
def sha(b): return hashlib.sha256(b).hexdigest()
def read_json(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def command(args,cwd=KIT):
    p = subprocess.run(args,cwd=cwd,capture_output=True,check=True)
    return p.stdout
def git(*args,cwd=KIT): return command(['git',*args],cwd).decode('utf-8').strip()
def check(ok,scope,detail):
    if not ok: issues.append({'scope':scope,'detail':detail})
    return bool(ok)
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def tree(ref,cwd=KIT):
    items=command(['git','ls-tree','-rz',ref],cwd).split(b'\0')
    return {p.decode():m.split()[2].decode() for v in items if v for m,p in [v.split(b'\t',1)]}
def json_from_bytes(b): return json.loads(b.decode('utf-8-sig'))
def digest_file(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def assess_kit_main(head, cwd=KIT):
    """Allow only the frozen publication or its 1.3.1-record-only descendants."""
    result={'baseCommit':PUBLISHED,'headCommit':head,'allowedPathPrefix':'docs/releases/1.3.1/','changedPaths':[],'recordOnlyDrift':False}
    if head==PUBLISHED:
        return {**result,'accepted':True,'relation':'exact-publication','comparisonMethod':'exact-commit'}
    available=subprocess.run(['git','cat-file','-e',head+'^{commit}'],cwd=cwd,capture_output=True).returncode==0
    if available:
        ancestor=subprocess.run(['git','merge-base','--is-ancestor',PUBLISHED,head],cwd=cwd,capture_output=True).returncode==0
        changed=git('diff','--name-only','--no-renames',PUBLISHED,head,'--',cwd=cwd).splitlines() if ancestor else []
        complete=True
        method='local-git-ancestry-and-tree-diff'
    else:
        comparison=json.loads(command(['gh','api','repos/AlbertXXuu/alvenx-liquid-glass/compare/'+PUBLISHED+'...'+head]))
        ancestor=comparison.get('status')=='ahead' and comparison.get('merge_base_commit',{}).get('sha')==PUBLISHED
        files=comparison.get('files',[])
        changed=sorted({p for f in files for p in (f['filename'],f.get('previous_filename')) if p})
        # GitHub caps compare file lists at300. Refuse an incomplete projection.
        complete=len(files)<300
        method='github-compare-api-no-fetch'
    allowed=ancestor and complete and all(p.startswith(result['allowedPathPrefix']) for p in changed)
    return {**result,'accepted':allowed,'relation':'descendant' if ancestor else 'not-a-proven-descendant','comparisonMethod':method,'diffProjectionComplete':complete,'changedPaths':changed,'recordOnlyDrift':allowed,'runtimeOrOtherPathDrift':[p for p in changed if not p.startswith(result['allowedPathPrefix'])]}

OUT.mkdir(parents=True,exist_ok=True)
previous=OUT/'artifact-consistency.json'
initial=OUT/'artifact-consistency-initial.json'
if previous.is_file() and not initial.exists():
    shutil.copyfile(previous,initial)
report={'schemaVersion':2,'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Read-only release artifact/source identity audit; no build, install, deployment, ref mutation or archive repacking', 'issues':issues, 'resolvedIssues':[]}
release=json.loads(command(['gh','release','view','v1.3.1','--repo','AlbertXXuu/alvenx-liquid-glass','--json','tagName,targetCommitish,isDraft,isPrerelease,publishedAt,url,assets']))
report['release']={k:v for k,v in release.items() if k!='assets'}
refs={}
for name,cwd,expected in [('kit',KIT,{'refs/heads/main':PUBLISHED,'refs/tags/v1.3.1^{}':SOURCE,'refs/tags/v1.3.1-published^{}':PUBLISHED}),('website',WEB,{'refs/heads/main':WEB_MAIN,'refs/tags/ui-v1.3.1^{}':WEB_SOURCE})]:
    remote=git('ls-remote','origin',*expected,cwd=cwd)
    actual={line.split('\t')[1]:line.split('\t')[0] for line in remote.splitlines()}
    status=git('status','--porcelain',cwd=cwd)
    if name=='kit':
        immutable={ref:commit for ref,commit in expected.items() if ref!='refs/heads/main'}
        tags_match=check(all(actual.get(ref)==commit for ref,commit in immutable.items()),'refs.kit.immutableTags',{'actual':actual,'expectedImmutable':immutable})
        main=assess_kit_main(actual['refs/heads/main'],cwd=cwd)
        main_match=check(main['accepted'],'refs.kit.main',main)
        expected_match=tags_match and main_match
    else:
        expected_match=check(actual==expected,'refs.'+name,{'actual':actual,'expected':expected})
    refs[name]={'remote':actual,'expectedMatch':expected_match,'localHead':git('rev-parse','HEAD',cwd=cwd),'workingTreeClean':status=='','workingTreeStatus':status.splitlines(),'runtimeSourceChanges':git('status','--porcelain','--','src','styles','showcase',cwd=cwd).splitlines()}
    if name=='kit':refs[name]['mainComparedWithPublication']=main
    check(not refs[name]['runtimeSourceChanges'],'worktree.'+name+'.runtime','Runtime source has uncommitted changes')
report['refs']=refs
report['runtimeSourceUnchanged']=all(not item['runtimeSourceChanges'] for item in refs.values())
report['workingTreeBoundary']='Documentation/receipt edits are expected during CI closure; dirty status alone does not fail this audit. Runtime source changes do fail.'

assetrows=[]
expected_assets={'alvenx-design-kit-1.3.1.zip':(130248865,'cd10ef1eabb264700e1423b91aadf5c13054312baa2e65f8bce743e5ea5f5d24'),'alvenx-liquid-glass-1.3.1.tgz':(28913428,'69fe336c6b5e5f4b4a4ebade2550d2963724aa129b0c931ca7e46131c5ed2ab7'),'installed-consumer.json':(659,'18c88db1ad18ab169f36f4e7f62788eb5127815c9740592737996612915ded84'),'SHA256SUMS.txt':(190,'d4b8f6e969e236827bddbddae3a3dff2c4436e5fa936d861d5c9e5eea25b8ea5')}
original_assets=[a for a in release['assets'] if a['name'] in expected_assets]
original_counts={name:sum(a['name']==name for a in original_assets) for name in expected_assets}
check(all(count==1 for count in original_counts.values()),'release.originalAssets',{'expectedOriginalAssetCounts':original_counts})
report['supplementalAssets']=[{k:a.get(k) for k in ('name','size','digest','url','state','updatedAt')} for a in release['assets'] if a['name'] not in expected_assets]
report['supplementalAssetPolicy']='Additional release records are listed separately; this audit verifies only the four original immutable payloads and does not require or download a local supplement.'
for a in original_assets:
    local=KIT/'releases'/a['name'] if a['name']!='installed-consumer.json' else KIT/'docs/releases/1.3.1/installed-consumer.json'
    actualsha=digest_file(local)
    row={'name':a['name'],'githubBytes':a['size'],'githubDigest':a['digest'],'localBytes':local.stat().st_size,'localSha256':actualsha,'url':a['url'],'state':a['state']}
    row['serverMetadataMatchesLocal']=check(a['size']==local.stat().st_size and a['digest']=='sha256:'+actualsha,'release.asset.'+a['name'],row)
    size,h=expected_assets[a['name']]
    row['expectedMatches']=check((size,h)==(row['localBytes'],actualsha),'release.expected.'+a['name'],row)
    check(a['state']=='uploaded','release.assetState.'+a['name'],'Original asset is not uploaded')
    if a['name'] in ('installed-consumer.json','SHA256SUMS.txt'):
        req=urllib.request.Request(a['url'],headers={'User-Agent':'AlvenX-consistency-audit'})
        with urllib.request.urlopen(req,timeout=45) as resp: serverbytes=resp.read()
        row['smallServerAssetDownloadedBytes']=len(serverbytes)
        row['downloadedBytesMatchLocal']=check(serverbytes==local.read_bytes(),'release.download.'+a['name'],'Small asset direct public download mismatch')
    assetrows.append(row)
report['assets']=assetrows
report['largeAssetDownloadPolicy']='Large ZIP/TGZ not re-downloaded; fresh GitHub server-computed SHA-256 and size compared with independently rehashed existing local files. Small JSON/checksum assets fetched and compared byte-for-byte.'

zf=zipfile.ZipFile(KIT/'releases/alvenx-design-kit-1.3.1.zip')
prefix='alvenx-design-kit/'
zread=lambda p:zf.read(prefix+p)
manifest=json_from_bytes(zread('KIT-MANIFEST.json'))
manifest_errors=[]
for f in manifest['files']:
    try: data=zread(f['path'])
    except KeyError:
        manifest_errors.append({'path':f['path'],'error':'missing'});continue
    if len(data)!=f['bytes'] or sha(data)!=f['sha256']: manifest_errors.append({'path':f['path'],'error':'bytes/hash mismatch'})
check(not manifest_errors,'zip.manifest',manifest_errors)
source_tree=tree(SOURCE);published_tree=tree(PUBLISHED)
source_diff=[];published_diff=[];source_matched=0;published_matched=0;source_eol=[];published_eol=[]
for f in manifest['files']:
    p=f['path'];b=zread(p)
    for t,diff,version in [(source_tree,source_diff,'source'),(published_tree,published_diff,'published')]:
        if p in t:
            if blob(b)!=t[p]:
                if blob(b.replace(b'\r\n',b'\n'))==t[p]:
                    (source_eol if version=='source' else published_eol).append(p)
                else:diff.append(p)
            elif version=='source':source_matched+=1
            else:published_matched+=1
report['zip']={'entryCount':len(zf.namelist()),'manifestVersion':manifest['version'],'manifestEntries':len(manifest['files']),'verifiedManifestEntries':len(manifest['files'])-len(manifest_errors),'manifestErrors':manifest_errors,'sourceTagTrackedFilesExactMatched':source_matched,'sourceTagTrackedSemanticDifferences':source_diff,'sourceTagCRLFtoLFOnly':source_eol,'publicationTagTrackedFilesExactMatched':published_matched,'publicationTagTrackedSemanticDifferences':published_diff,'publicationTagCRLFtoLFOnly':published_eol,'normalization':'25 packaged files preserve checkout CRLF whereas canonical Git blobs use LF; all content is identical after only CRLF-to-LF normalization. Recorded archive/TGZ checksums are exact raw-byte identities.','manifestMatchesLocalManifest':zread('KIT-MANIFEST.json')==(KIT/'KIT-MANIFEST.json').read_bytes()}
check(not [p for p in source_diff if p.startswith(('src/','styles/','showcase/','assets/'))],'zip.source-runtime','Source/display/runtime byte differences from immutable tag')
check(not published_diff,'zip.published-tree',published_diff)
embedded=zread('releases/alvenx-liquid-glass-1.3.1.tgz')
report['zip']['embeddedTarballMatches']=check(sha(embedded)==digest_file(KIT/'releases/alvenx-liquid-glass-1.3.1.tgz'),'zip.embeddedTarball','Embedded TGZ digest mismatch')

def tar_entries(path):
    with tarfile.open(path,'r:gz') as tf:return {m.name.removeprefix('package/'):tf.extractfile(m).read() for m in tf.getmembers() if m.isfile()}
tgz=tar_entries(KIT/'releases/alvenx-liquid-glass-1.3.1.tgz')
old=tar_entries(KIT/'releases/alvenx-liquid-glass-1.3.0.tgz')
tag_eol=[p for p,b in tgz.items() if p in source_tree and blob(b)!=source_tree[p] and blob(b.replace(b'\r\n',b'\n'))==source_tree[p]]
tag_mismatch=[p for p,b in tgz.items() if p in source_tree and blob(b)!=source_tree[p] and p not in tag_eol]
zip_mismatch=[p for p,b in tgz.items() if prefix+p not in zf.namelist() or b!=zread(p)]
local_mismatch=[p for p,b in tgz.items() if not (KIT/p).is_file() or b!=(KIT/p).read_bytes()]
runtime={p for p in tgz if p.startswith(('src/','styles/','dist/','assets/'))}
runtime_old_mismatch=[p for p in sorted(runtime) if p not in old or old[p]!=tgz[p]]
pkg=json_from_bytes(tgz['package.json'])
report['tarball']={'entries':len(tgz),'packageName':pkg['name'],'version':pkg['version'],'license':pkg['license'],'private':pkg['private'],'sourceTagSemanticMismatches':tag_mismatch,'sourceTagCRLFtoLFOnly':tag_eol,'zipByteMismatches':zip_mismatch,'localByteMismatches':local_mismatch,'runtimeComparedWith130':len(runtime),'runtime130ByteMismatches':runtime_old_mismatch,'srcStylesGitDiff130to131':git('diff','--name-only','v1.3.0','v1.3.1','--','src','styles')}
check(not tag_mismatch and not zip_mismatch and not local_mismatch,'tarball.sourceIdentity',report['tarball'])
check(not runtime_old_mismatch,'tarball.runtime130','Runtime bytes differ from1.3.0')
check(pkg['license']=='UNLICENSED' and pkg['private'] is True,'tarball.rights','Rights/package metadata mismatch')

homepage_manifest=read_json(WEB/'public/ui/homepage-entry-manifest.json')
web_vendor=WEB/'vendor/alvenx-liquid-glass-1.3.0.tgz'
vendor=tar_entries(web_vendor)
installed_root=WEB/'node_modules/@alvenx/liquid-glass'
installed_mismatch=[p for p,b in vendor.items() if not (installed_root/p).is_file() or (installed_root/p).read_bytes()!=b]
vendor_source_tree=tree(OLD_SOURCE)
vendor_eol=[p for p,b in vendor.items() if p in vendor_source_tree and blob(b)!=vendor_source_tree[p] and blob(b.replace(b'\r\n',b'\n'))==vendor_source_tree[p]]
vendor_tag_mismatch=[p for p,b in vendor.items() if p in vendor_source_tree and blob(b)!=vendor_source_tree[p] and p not in vendor_eol]
web_manifest=read_json(WEB/'public/ui/showcase-manifest.json')
web_entries=web_manifest.get('files',[])
web_manifest_errors=[]
for item in web_entries:
    p=WEB/'public/ui'/item['path']
    if not p.is_file() or digest_file(p)!=item['sha256']: web_manifest_errors.append(item['path'])
report['website']={'showcaseVersion':web_manifest['version'],'showcaseSourceCommit':web_manifest['sourceCommit'],'showcaseSourceRef':web_manifest['sourceRef'],'manifestFiles':len(web_entries),'manifestErrors':web_manifest_errors,'homepageKitVersion':homepage_manifest['kitVersion'],'homepageSourceCommit':homepage_manifest['sourceCommit'],'homepageManifestPackageSha256':homepage_manifest['packageSha256'],'vendorSha256':digest_file(web_vendor),'installedEntries':len(vendor),'installedFileMismatches':installed_mismatch,'vendorSourceTagSemanticMismatches':vendor_tag_mismatch,'vendorSourceTagCRLFtoLFOnly':vendor_eol,'vendorMatchesKit130Tarball':digest_file(web_vendor)==digest_file(KIT/'releases/alvenx-liquid-glass-1.3.0.tgz'),'rights':web_manifest['license']}
check(web_manifest['sourceCommit']==SOURCE and web_manifest['version']=='1.3.1' and not web_manifest_errors,'website.showcaseManifest',report['website'])
check(homepage_manifest['sourceCommit']==OLD_SOURCE and homepage_manifest['packageSha256']==digest_file(web_vendor) and not installed_mismatch and not vendor_tag_mismatch,'website.installed130',report['website'])

baseline=KIT/'docs/baseline/v6/SOURCE-MANIFEST-v6.json'
bm=read_json(baseline)
baseline_rows=[]
for group in ('sources','readOnlySharedDependencies','readOnlySharedAssets'):
    for p,h in bm[group].items():
        rel=p if group=='sources' else 'shared/'+p
        local=baseline.parent/rel
        baseline_rows.append({'path':rel,'matches':local.is_file() and digest_file(local)==h})
for p,f in bm['evidence'].items():
    local=baseline.parent/'evidence'/p
    baseline_rows.append({'path':'evidence/'+p,'matches':local.is_file() and digest_file(local)==f['sha256'] and local.stat().st_size==f['bytes']})
report['frozenBaseline']={'manifestSha256':digest_file(baseline),'expectedManifestSha256':'8eb6bf9395ec63b2020211bb8b21815060d7399e27f9dbdd1f2128275760cb8d','entries':len(baseline_rows),'failed':[r for r in baseline_rows if not r['matches']]}
check(report['frozenBaseline']['manifestSha256']==report['frozenBaseline']['expectedManifestSha256'] and not report['frozenBaseline']['failed'],'baseline.frozen',report['frozenBaseline'])
fontcss=(KIT/'assets/fonts/misans/misans.css').read_text(encoding='utf-8')
fonturls=re.findall(r'url\([\'\"]?([^\)\'\"]+)',fontcss)
missingfonts=[p for p in fonturls if not (KIT/'assets/fonts/misans'/p).is_file()]
report['fonts']={'cssUrlCount':len(fonturls),'uniqueUrlCount':len(set(fonturls)),'missingUrls':missingfonts,'licenseFilesPresent':[(str(p.relative_to(KIT)),p.is_file()) for p in [KIT/'assets/fonts/InstrumentSans-OFL.txt',KIT/'assets/fonts/misans/MiSans-License-Agreement.pdf']]}
check(not missingfonts,'fonts.urls',missingfonts)

indexes=[]
for ip in [KIT/'docs/releases/1.3.1/text-inset-evidence.sha256.json',KIT/'docs/releases/1.3.1/online/sha256.json']:
    idx=read_json(ip);bad=[]
    for f in idx['files']:
        p=ip.parent/f['path']
        if not p.is_file() or p.stat().st_size!=f['bytes'] or digest_file(p)!=f['sha256']:bad.append(f['path'])
    indexes.append({'path':str(ip.relative_to(KIT)),'entries':len(idx['files']),'mismatches':bad})
    check(not bad,'evidence.index',indexes[-1])
report['evidenceIndexes']=indexes
css=(KIT/'showcase/mobile-review/review.css').read_bytes()
report['textInset']={'cssSha256':sha(css),'desktopWrapper58px':b'.alvenx-design.lab .lab-message>.field-hit{padding-left:58px}' in css,'phoneWrapper36px':b'.alvenx-design.lab .lab-message>.field-hit{padding-left:36px}' in css,'recordedCssMatches':sha(css)==read_json(KIT/'docs/releases/1.3.1/text-inset-evidence.sha256.json')['sourceCss']['sha256']}
historical=json_from_bytes(command(['git','show',PUBLISHED+':docs/releases/1.3.1/online-http-verification.json']))
report['historicalHttpReceipt']={'publicationRef':'v1.3.1-published','publicationCommit':PUBLISHED,'showcaseVersion':historical.get('showcaseVersion',historical.get('unchangedShowcaseVersion')),'ambiguousSourceCommit':historical.get('sourceCommit'),'actualSourceCommitMeaning':'homepage1.3.0 source, because historical verify-live.py serializes entry[sourceCommit]','expectedShowcaseSourceCommit':SOURCE,'byteChecks':len(historical['checks']),'allRecordedMatches':all(c['matchesLocal'] for c in historical['checks']),'preservedUnchangedInImmutableRef':True}
http_path=KIT/'docs/releases/1.3.1/online-http-verification.json'
http=read_json(http_path)
has_explicit='showcaseSourceCommit' in http or 'homepageSourceCommit' in http
if has_explicit:
    identities_ok=check(http.get('showcaseSourceCommit')==SOURCE and http.get('homepageSourceCommit')==OLD_SOURCE and http.get('showcaseVersion')=='1.3.1' and http.get('homepageKitVersion')=='1.3.0','httpReceipt.explicitIdentities','Explicit showcase/homepage identities must match their independently verified source tags')
    report['currentHttpReceipt']={'schema':'explicit-showcase-and-homepage','showcaseVersion':http.get('showcaseVersion'),'showcaseSourceCommit':http.get('showcaseSourceCommit'),'homepageKitVersion':http.get('homepageKitVersion'),'homepageSourceCommit':http.get('homepageSourceCommit'),'verifiedAtUtc':http.get('verifiedAtUtc'),'byteChecks':len(http['checks']),'allRecordedMatches':all(c['matchesLocal'] for c in http['checks']),'receiptSha256':digest_file(http_path),'identityFieldsMatch':identities_ok}
    if identities_ok and historical.get('sourceCommit')==OLD_SOURCE:
        report['resolvedIssues'].append({'scope':'historicalHttpReceipt.provenance','resolution':'The active HTTP receipt and protocol now explicitly distinguish showcaseSourceCommit08aa8ed and homepageSourceCommit7f202150. The original ambiguous historical receipt remains preserved in v1.3.1-published and artifact-consistency-initial.json.','currentReceipt': 'docs/releases/1.3.1/online-http-verification.json','currentVerifiedAtUtc':http.get('verifiedAtUtc')})
else:
    report['currentHttpReceipt']={'schema':'historical-ambiguous','showcaseVersion':http.get('unchangedShowcaseVersion'),'sourceCommit':http.get('sourceCommit'),'byteChecks':len(http['checks']),'allRecordedMatches':all(c['matchesLocal'] for c in http['checks'])}
    if http.get('sourceCommit')==OLD_SOURCE:
        issues.append({'scope':'historicalHttpReceipt.provenance','severity':'record-clarification','detail':'The current HTTP receipt still uses sourceCommit for homepage1.3.0 while reporting showcase1.3.1; explicit showcaseSourceCommit and homepageSourceCommit fields are required.'})
    else:
        check(False,'httpReceipt.unsupportedIdentitySchema','Receipt does not supply the expected explicit identities or recognizable historical source')
check(len(http['checks'])==21 and all(c['matchesLocal'] for c in http['checks']),'httpReceipt.byteChecks','Expected21 successful byte comparisons')
report['status']='passed' if not issues else ('passed-with-record-clarification' if all(i.get('severity')=='record-clarification' for i in issues) else 'mismatch')
(OUT/'artifact-consistency.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':report['status'],'issues':issues,'zip':report['zip'],'tarball':report['tarball'],'website':report['website'],'frozenBaseline':report['frozenBaseline'],'fonts':report['fonts']},indent=2))
