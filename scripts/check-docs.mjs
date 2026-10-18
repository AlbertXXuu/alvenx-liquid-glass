import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
const files=['README.md','SKILL.md','TODO.md','LICENSE-NOTICE.md','docs/design-language.md','docs/integration.md','docs/baseline-and-checklist.md','docs/attribution.md','docs/runtime-quality.md','docs/compatibility.md'];
let localLinks=0;
for(const file of files){
  const text=await readFile(file,'utf8');
  if(text.includes('\uFFFD'))throw new Error('Invalid UTF-8: '+file);
  if((text.match(/^```/gm)||[]).length%2)throw new Error('Unclosed code fence: '+file);
  for(const match of text.matchAll(/\[[^\]]+\]\((<[^>]+>|[^)\s]+)\)/g)){
    const target=match[1].replace(/^<|>$/g,'');if(/^(?:https?:|mailto:|#)/.test(target))continue;
    await access(path.resolve(path.dirname(file),decodeURIComponent(target.split('#')[0])));localLinks++;
  }
}
console.log(JSON.stringify({status:'passed',documents:files.length,localLinks}));
