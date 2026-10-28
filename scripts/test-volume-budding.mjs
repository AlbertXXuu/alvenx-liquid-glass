import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';
import { VolumeBuddingLink, GlassClock } from '../dist/index.js';

// The public geometry remains the accepted R7 contour; the production
// renderer and resting frames may receive independently verified edge fixes.
// Match the owner-approved living-pearl implementation after adapting imports.
const acceptedRenderer=(await readFile('showcase/mobile-review/specimen-volume.ts','utf8')).replaceAll('../../src/','../').replace("'../entrance-pink-response-review/geometry'", "'./geometry'").replaceAll('\r\n','\n');
const currentRenderer=(await readFile('src/budding-volume/reference-volume.ts','utf8')).replaceAll('\r\n','\n');
assert.equal(currentRenderer,acceptedRenderer,'The installed renderer matches the approved showcase');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const volume=asModule(await readFile('src/volume-hit-geometry.ts','utf8'));
async function geometry(file){return (await import(asModule((await readFile(file,'utf8')).replace(/from ['"](?:\.\.\/)+src\/volume-hit-geometry['"]|from ['"]\.\.\/volume-hit-geometry['"]/,`from ${JSON.stringify(volume)}`)))).refinementGeometry;}
const current=await geometry('src/budding-volume/geometry.ts'),accepted=await geometry('showcase/entrance-pink-response-review/geometry.ts');
for(const d of [44,54])for(let i=0;i<=100;i++)assert.deepEqual(current(i/100,d),accepted(i/100,d),'Resting and growth geometry preserve the approved showcase');
const frames=(await import(asModule(await readFile('src/budding-volume/first-frame.ts','utf8')))).firstFrames;
for(const diameter of [44,54]){
 const frame=frames[diameter], shape=current(0,diameter);
 assert.equal(frame.path,shape.path,`Initial ${diameter}px frame follows current contour`);
 assert.equal(frame.width,Math.ceil(frame.textureCssWidth*1.5));
 assert.equal(frame.height,Math.ceil(frame.cssHeight*1.5));
 const png=Buffer.from(frame.png.split(',')[1],'base64');
 assert.equal(png.readUInt32BE(16),frame.width);assert.equal(png.readUInt32BE(20),frame.height);
}
const rest=current(1),pull={x:rest.chamber.x+rest.chamber.width*.8,y:rest.chamber.y+10,dx:4,dy:-3,radiusX:45,radiusY:35};
const pulled=current(1,54,{chamber:{pull}});
assert.equal(pulled.path.split('M ')[1],rest.path.split('M ')[1],'Chamber pull leaves mother contour byte-identical');
assert.notEqual(pulled.path.split('M ')[2],rest.path.split('M ')[2],'Chamber has actual local contour deformation');
assert.equal(pulled.width,rest.width,'Pull does not move the adjacent link layout');
assert.ok(pulled.path.match(/-?\d+(?:\.\d+)?/g).map(Number).every(Number.isFinite));
const {springStep,boundedPull}=await import(asModule(await readFile('src/budding-volume/motion.ts','utf8')));
for(const limit of [3.96,4.8,6])for(const input of [-10000,-24,0,24,10000])assert.ok(Math.abs(boundedPull(input,limit))<=limit);
let a=[4,0],b=[4,0];for(let i=0;i<60;i++)a=springStep(...a,0,1/60);for(let i=0;i<120;i++)b=springStep(...b,0,1/120);
assert.ok(Math.abs(a[0])<.002&&Math.abs(a[1])<.02,'Released pull settles');
assert.ok(Math.abs(a[0]-b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9,'Spring is independent of frame subdivision');
const html = renderToString(createElement(VolumeBuddingLink, {
  clock: new GlassClock(), id: 'installed-volume', href: '/destination', earlyActivation: true,
}));
assert.match(html, /data-volume-budding="installed-volume"/);
assert.match(html, /data-budding-early="true"/);
assert.match(html, /data-enhanced="false"/);
assert.match(html, /href="\/destination"/);
assert.equal((html.match(/data:image\/png;base64,/g) || []).length, 2);
assert.equal((html.match(/data-first-frame="(?:44|54)"/g) || []).length, 2);
assert.doesNotMatch(html, /operator="out"/);
assert.doesNotMatch(html, /<canvas|<button/);
console.log('Volume budding: accepted geometry, initial-frame consistency and native SSR passed.');
