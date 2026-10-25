// Read-only reproduction of the old sentinel/profile tip defect and its taper.
// Run from the kit: node docs/reviews/2026-10-25/pearl-edge/profile-tip-probe.mjs
// Product inputs are immutable commits. The only write is this adjacent receipt.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createServer} from 'vite';

const output=dirname(fileURLToPath(import.meta.url)),kit=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:output,encoding:'utf8'}).trim();
const sourcePath='showcase/entrance-pink-response-review/reference-volume.ts';
const geometryPath='showcase/entrance-pink-response-review/geometry.ts';
const git=(...args)=>execFileSync('git',args,{cwd:kit,encoding:'utf8'});
const beforeCommit=git('rev-parse','8cfd29e').trim(),afterCommit=git('rev-parse','c879bb2').trim();
const beforeSource=git('show',`${beforeCommit}:${sourcePath}`),afterSource=git('show',`${afterCommit}:${sourcePath}`);
const geometry=git('show',`${afterCommit}:${geometryPath}`);
const sha=value=>createHash('sha256').update(value).digest('hex');
const normalize=value=>value.replace(/\r\n/g,'\n');
if(normalize(geometry)!==normalize(git('show',`${beforeCommit}:${geometryPath}`))||normalize(geometry)!==normalize(await readFile(join(kit,geometryPath),'utf8')))throw Error('Expected identical before/after/current geometry.');
function sampler(source){
 const start=source.indexOf('const profileColumns='),end=source.indexOf('export function createReferenceVolume');
 if(start<0||end<=start)throw Error('Profile source markers changed.');
 const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return Function(`${code}\nreturn {fillProfile,profileColumns};`)();
}
function extrema(path){
 const tokens=path.match(/[MCZ]|-?\d+(?:\.\d+)?/g)??[];let x=0,min=Infinity,max=-Infinity;
 for(let i=0;i<tokens.length;){const cmd=tokens[i++];
  if(cmd==='M'){x=Number(tokens[i++]);i++;min=Math.min(min,x);max=Math.max(max,x);continue;}
  if(cmd==='Z')continue;if(cmd!=='C')throw Error('Unexpected contour command.');
  const x1=Number(tokens[i]),x2=Number(tokens[i+2]),x3=Number(tokens[i+4]);
  const a=-x+3*x1-3*x2+x3,b=2*(x-2*x1+x2),c=x1-x,candidates=[0,1],disc=b*b-4*a*c;
  if(Math.abs(a)<1e-9){if(Math.abs(b)>1e-9)candidates.push(-c/b);}
  else if(disc>=0)candidates.push((-b+Math.sqrt(disc))/(2*a),(-b-Math.sqrt(disc))/(2*a));
  for(const t of candidates)if(t>=0&&t<=1){const u=1-t,px=u*u*u*x+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3;min=Math.min(min,px);max=Math.max(max,px);}
  x=x3;i+=6;
 }
 return {min,max};
}
const old=sampler(beforeSource),next=sampler(afterSource);
if(old.profileColumns!==next.profileColumns)throw Error('Profile resolution changed.');
const columns=old.profileColumns,results=[];
const server=await createServer({root:kit,server:{middlewareMode:true},logLevel:'silent'});
try{
 const {refinementGeometry}=await server.ssrLoadModule(`/${geometryPath}`);
 for(const diameter of [44,54]){
  const shape=refinementGeometry(1,diameter),width=shape.width+2,height=shape.height,step=width/columns;
  const sample=({fillProfile})=>{const pixels=new Uint8Array(columns*4),top=new Float32Array(columns),bottom=new Float32Array(columns);fillProfile(shape.path,width,height,pixels,top,bottom);return {pixels,top,bottom};};
  const a=sample(old),b=sample(next),chamberPath=shape.path.slice(shape.path.indexOf('M ',2)),tips=extrema(chamberPath);
  let first=-1,last=-1,validUnchanged=0,emptyNowZero=0;
  for(let i=0;i<columns;i++){
   if(a.top[i]<=a.bottom[i]){
    if(a.top[i]!==b.top[i]||a.bottom[i]!==b.bottom[i])throw Error('A valid profile sample changed.');validUnchanged++;
    if((i+.5)*step>shape.chamber.x){if(first<0)first=i;last=i;}
   }else{if(b.top[i]!==b.bottom[i])throw Error('An empty profile sample retains inverted thickness.');emptyNowZero++;}
  }
  if(first<0||last<first)throw Error('No chamber profile samples.');
  const decoded=(data,i)=>({top:((data.pixels[i*4]<<8)+data.pixels[i*4+1])/65535*height,bottom:((data.pixels[i*4+2]<<8)+data.pixels[i*4+3])/65535*height});
  const left=decoded(a,first),right=decoded(a,last),leftSpan=left.bottom-left.top,rightSpan=right.bottom-right.top;
  const leftZero=(first+.5)*step-step*leftSpan/(height+leftSpan),rightZero=(last+.5)*step+step*rightSpan/(height+rightSpan);
  const taperedLeft=(first-.5)*step,taperedRight=(last+1.5)*step;
  results.push({diameter,textureCssWidth:width,height,columns,columnStepCssPx:step,exactCubicTips:tips,firstValidColumn:first,lastValidColumn:last,
   oldDecodedTextureZeroCrossing:{left:leftZero,right:rightZero,insetLeftCssPx:leftZero-tips.min,insetRightCssPx:tips.max-rightZero},
   taperZeroCrossing:{left:taperedLeft,right:taperedRight,outsideLeftCssPx:tips.min-taperedLeft,outsideRightCssPx:taperedRight-tips.max},
   oldLeftHeightRampGain:(height+leftSpan)/leftSpan,validSamplesUnchanged:validUnchanged,emptySamplesNowZero:emptyNowZero});
 }
}finally{await server.close();}
const result={observedAt:new Date().toISOString(),beforeCommit,afterCommit,rendererBeforeSha256:sha(beforeSource),rendererAfterSha256:sha(afterSource),geometrySha256:sha(geometry),
 method:'Exact extrema of all cubic Bezier spans; actual immutable fillProfile functions; 16-bit encoded bounds decoded before LINEAR zero-crossing calculation. Expanded resting shapes at44/54px. No browser/GPU or physical-device claims.',
 scope:'This quantifies the profile-sentinel geometry defect only. Premultiplied-alpha compositing evidence is separate in flat-composition-comparison.json.',results};
await writeFile(join(output,'profile-tip-probe.json'),JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
