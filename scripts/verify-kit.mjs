import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const digest=data=>createHash('sha256').update(data).digest('hex');
const baselineRoot='docs/baseline/v6',raw=await readFile(`${baselineRoot}/SOURCE-MANIFEST-v6.json`);
if(digest(raw)!=='8eb6bf9395ec63b2020211bb8b21815060d7399e27f9dbdd1f2128275760cb8d')throw new Error('Owner-confirmed manifest changed');
const manifest=JSON.parse(raw);let baselineFiles=0;
for(const [group,base] of [['sources',baselineRoot],['evidence',baselineRoot+'/evidence'],['readOnlySharedDependencies',baselineRoot+'/shared'],['readOnlySharedAssets',baselineRoot+'/shared']])for(const [name,value]of Object.entries(manifest[group])){
  const expected=typeof value==='string'?value:value.sha256;
  if(digest(await readFile(path.join(base,name)))!==expected)throw new Error('Frozen baseline mismatch: '+name);
  baselineFiles++;
}
const css=await readFile('assets/fonts/misans/misans.css','utf8');let fontURLs=0;
for(const match of css.matchAll(/url\(["']?([^\)"']+)["']?\)/g)){await access(path.resolve('assets/fonts/misans',match[1]));fontURLs++;}
let kitFiles=0;
if(!process.argv.includes('--baseline-only'))try{
  const kit=JSON.parse(await readFile('KIT-MANIFEST.json','utf8'));
  for(const item of kit.files){if(digest(await readFile(item.path))!==item.sha256)throw new Error('Kit mismatch: '+item.path);kitFiles++;}
}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(JSON.stringify({status:'passed',baselineFiles,fontURLs,kitFiles}));
