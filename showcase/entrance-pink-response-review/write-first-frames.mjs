// Accept the saved UTF-8 Playwright CLI run-code result from capture-first-frames.
// Writes only this isolated review's embedded frames and its adjacent PNGs.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const input=process.argv[2];
if(!input||process.argv.length!==3)throw Error('Usage: node showcase/entrance-pink-response-review/write-first-frames.mjs <saved-cli-result-utf8.txt>');
const raw=(await readFile(resolve(input),'utf8')).replace(/^\uFEFF/,'');
let result;
try{result=JSON.parse(raw);}catch{
 const marker=raw.indexOf('### Result');
 if(marker<0)throw Error('Expected a complete JSON result or saved Playwright CLI ### Result output.');
 const start=raw.indexOf('{',marker),nextSection=raw.indexOf('\n### ',start);
 const value=raw.slice(start,nextSection<0?undefined:nextSection).trim();
 result=JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g,''));
}
if(!Array.isArray(result.frames)||result.frames.length!==2)throw Error('Expected exactly two captured frames.');
const frames={},pngs=[];
for(const frame of result.frames){
 const d=frame.diameter;
 if(![44,54].includes(d)||frames[d])throw Error('Expected one 44px and one 54px frame.');
 if(!frame.path?.startsWith('M ')||!frame.path.endsWith(' Z')||/NaN|Infinity/.test(frame.path))throw Error('Invalid captured C2 contour.');
 if(Math.abs(frame.cssWidth-(d+12))>.001||Math.abs(frame.cssHeight-(1.4*d+12))>.001||frame.textureCssWidth<=frame.cssWidth)throw Error('Captured CSS dimensions do not match the resting frame contract.');
 if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(frame.png))throw Error('Expected an embedded PNG.');
 const png=Buffer.from(frame.png.split(',')[1],'base64');
 if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||png.readUInt32BE(16)!==frame.width||png.readUInt32BE(20)!==frame.height)throw Error('Captured PNG dimensions differ from metadata.');
 if(frame.width!==Math.ceil(frame.textureCssWidth*1.5)||frame.height!==Math.ceil(frame.cssHeight*1.5))throw Error('Captured texture does not use the live 1.5x raster.');
 if(createHash('sha256').update(png).digest('hex')!==frame.sha256)throw Error('Captured PNG digest mismatch.');
 frames[d]=frame;pngs.push({diameter:d,png});
}
const directory=dirname(fileURLToPath(import.meta.url));
await writeFile(join(directory,'first-frame.ts'),'// Generated from this isolated review renderer at rest; original production frames remain unchanged.\nexport const firstFrames = '+JSON.stringify(frames,null,2)+' as const;\n','utf8');
for(const {diameter,png} of pngs)await writeFile(join(directory,`first-frame-${diameter}.png`),png);
console.log(JSON.stringify({createdAt:result.createdAt,source:result.source,frames:Object.values(frames).map(({png,path,...metadata})=>metadata)},null,2));
