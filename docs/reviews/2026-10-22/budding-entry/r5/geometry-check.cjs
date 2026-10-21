const fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
const cache=new Map();function load(file){const name=path.resolve(file);if(cache.has(name))return cache.get(name);const exports={};cache.set(name,exports);new Function('exports','require',ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(exports,s=>load(path.resolve(path.dirname(name),s+'.ts')));return exports;}
const {refinementGeometry}=load('showcase/budding-refinement-review/geometry.ts'),checks=[];
const oldGeometryFile=path.resolve('showcase/budding-refinement-review/geometry.ts'),oldExports={};
new Function('exports','require',ts.transpileModule(fs.readFileSync(oldGeometryFile,'utf8').replace('reviewChamberExponent=2.2','reviewChamberExponent=3.2'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(oldExports,s=>load(path.resolve(path.dirname(oldGeometryFile),s+'.ts')));
function sideInset(shape){
 const p=shape.path.match(/M[^M]+/g)[1].match(/-?\d+(?:\.\d+)?/g).map(Number),target=shape.chamber.y+shape.chamber.height*.75;
 let start=p.slice(0,2),x=-Infinity;
 const cubic=(a,b,c,d,t)=>a*(1-t)**3+3*b*(1-t)**2*t+3*c*(1-t)*t*t+d*t*t*t;
 for(let i=2;i<p.length;i+=6){const segment=[start,p.slice(i,i+2),p.slice(i+2,i+4),p.slice(i+4,i+6)];
  if(Math.min(segment[0][1],segment[3][1])<=target&&Math.max(segment[0][1],segment[3][1])>=target){
   let lo=0,hi=1;for(let k=0;k<30;k++){const t=(lo+hi)/2,y=cubic(...segment.map(v=>v[1]),t);if((y<target)===(segment[3][1]>segment[0][1]))lo=t;else hi=t;}
   x=Math.max(x,cubic(...segment.map(v=>v[0]),(lo+hi)/2));
  }start=segment[3];
 }return shape.chamber.x+shape.chamber.width-x;
}

let maxFirstDerivativeError=0,maxSecondDerivativeError=0;
const check=(name,pass)=>{checks.push({name,pass});if(!pass)throw new Error(name);};
for(const diameter of [44,54,96]){
 let previous=0;
 for(let i=0;i<=40;i++){
  const g=i/40,s=refinementGeometry(g,diameter),paths=s.path.match(/M[^M]+/g);
  check(`${diameter}/${g}: finite`,!s.path.includes('NaN')&&Number.isFinite(s.width));
  check(`${diameter}/${g}: monotonic layout width`,s.width+1e-7>=previous);previous=s.width;
  check(`${diameter}/${g}: expected topology`,paths.length===(g>=.95?2:1));
  for(const subpath of paths){
   const v=subpath.match(/-?\d+(?:\.\d+)?/g).map(Number),start=[v.shift(),v.shift()],segments=[];
   for(let k=0;k<v.length;k+=6)segments.push({p0:k===0?start:segments.at(-1).p3,p1:v.slice(k,k+2),p2:v.slice(k+2,k+4),p3:v.slice(k+4,k+6)});
   for(let k=0;k<segments.length;k++){const a=segments[k],b=segments[(k+1)%segments.length];for(const axis of [0,1]){
    maxFirstDerivativeError=Math.max(maxFirstDerivativeError,Math.abs(3*(a.p3[axis]-a.p2[axis])-3*(b.p1[axis]-b.p0[axis])));
    maxSecondDerivativeError=Math.max(maxSecondDerivativeError,Math.abs(6*(a.p3[axis]-2*a.p2[axis]+a.p1[axis])-6*(b.p2[axis]-2*b.p1[axis]+b.p0[axis])));
   }}
  }
 }
 const before=refinementGeometry(.95-1e-6,diameter),after=refinementGeometry(.95,diameter);
 check(`${diameter}: no layout jump at topology change`,Math.abs(before.width-after.width)<.001);
 const final=refinementGeometry(1,diameter),old=oldExports.refinementGeometry(1,diameter);
 check(`${diameter}: R5 mother identical to R4`,final.path.match(/M[^M]+/g)[0]===old.path.match(/M[^M]+/g)[0]);
 check(`${diameter}: R5 chamber slot and occupied width unchanged`,JSON.stringify(final.chamber)===JSON.stringify(old.chamber)&&final.width===old.width);
 check(`${diameter}: R5 side continuously bows at quarter-height`,sideInset(final)>sideInset(old)+final.chamber.height*.035);
 check(`${diameter}: native slot has both-side comfort`,final.chamber.width-(diameter<=44?77.3125:82.83487)>=final.chamber.height*.43);
 const neutral=final.path.match(/M[^M]+/g),right=refinementGeometry(1,diameter,{chamber:{offsetX:1,offsetY:-.5,scaleX:1.01,scaleY:1.015}}).path.match(/M[^M]+/g),left=refinementGeometry(1,diameter,{mother:{offsetX:1,offsetY:-.5,scaleX:1.01,scaleY:1.015}}).path.match(/M[^M]+/g);
 check(`${diameter}: right transform leaves mother byte-identical`,neutral[0]===right[0]);check(`${diameter}: mother transform leaves chamber byte-identical`,neutral[1]===left[1]);
}
check('C1 tolerance for each closed component',maxFirstDerivativeError<.00001);
check('C2 tolerance for each closed component',maxSecondDerivativeError<.000025);
const result={passed:checks.filter(c=>c.pass).length,total:checks.length,checks,maxFirstDerivativeError,maxSecondDerivativeError,width54:refinementGeometry(1,54).width,width44:refinementGeometry(1,44).width,chamber54:refinementGeometry(1,54).chamber,chamber44:refinementGeometry(1,44).chamber,scope:'Individual contours are C2. The topology-changing split instant is not globally C2.'};
fs.writeFileSync('output/playwright/budding-refinement-r5-20261022/geometry-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,checks:undefined}));
