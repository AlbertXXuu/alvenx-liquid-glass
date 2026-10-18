import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import * as kit from '../dist/index.js';

const tokens=JSON.parse(await readFile('tokens.json','utf8'));
const checks=[];
function check(name,run){run();checks.push(name);}
for(const row of kit.PARAMETER_ROWS)check(`parameter ${row.key}`,()=>{
  const expected=tokens.parameters[row.key];
  for(const key of ['min','max','precision'])assert.equal(row[key],expected[key]);
  assert.equal(row.step,expected.sliderStep);assert.equal(kit.DEFAULT_SETTINGS[row.key],expected.default);
});
check('motion default and SSR-safe imports',()=>{assert.equal(kit.DEFAULT_SETTINGS.ambient,true);assert.equal(kit.DEFAULT_SETTINGS.reducedMotion,false);assert.equal(new kit.GlassClock().strength,kit.DEFAULT_SETTINGS.interactionStrength);});
check('storage unavailable uses defaults',()=>assert.deepEqual(kit.readSettings('no-browser-storage'),kit.DEFAULT_SETTINGS));

const asModule=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const originalGeometryURL=asModule(await readFile('docs/baseline/v6/shared/src/spatial/geometry.ts','utf8'));
const originalGeometry=await import(originalGeometryURL);
const originalEndpoint=await import(asModule((await readFile('docs/baseline/v6/endpointGeometry.ts','utf8')).replace(/from ['"][^'"]*geometry(?:\.ts)?['"]/,'from '+JSON.stringify(originalGeometryURL))));
let geometryCases=0;
for(const [width,height] of [[64,44],[63.36,42.24],[160,96],[320,76],[42,42]])for(const fullness of [2.4,3.2,3.8])check(`approved geometry ${width}×${height}/${fullness}`,()=>{
  const oldShape=originalGeometry.contourShape(width,height,fullness),newShape=kit.contourShape(width,height,fullness);
  assert.deepEqual(newShape,oldShape);assert.equal(kit.shellPath(newShape),originalGeometry.shellPath(oldShape));geometryCases++;
});
for(const [width,height,radius] of [[56,36,4.5],[55.36,34.24,9.68],[80,44,6]])check(`B endpoint ${width}×${height}`,()=>{
  const before=originalEndpoint.endpointGeometry(width,height,radius),after=kit.endpointGeometry(width,height,radius);
  assert.deepEqual(after,before);assert.ok(after.gap>0);assert.ok(after.radius>radius);
});
check('component public exports',()=>{for(const name of ['LiquidControl','GlassSlider','GlassSwitch','GlassNumber','useGlassSettings','resolveGlassOptics'])assert.equal(typeof kit[name],'function');assert.ok(kit.VolumeStage);assert.equal(new kit.GlassClock().maxFps,60);assert.equal(new kit.GlassClock({optics:'flat'}).optics,'flat');});

await mkdir('docs/validation',{recursive:true});
const report={status:'passed',checks:checks.length,geometryCases,baseline:'Owner-confirmed v6, original manifest frozen in docs/baseline/v6',details:checks};
await writeFile('docs/validation/contract.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:report.checks,geometryCases}));
