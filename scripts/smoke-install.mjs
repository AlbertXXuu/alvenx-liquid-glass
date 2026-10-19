import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// A fresh consumer outside the source repository prevents ancestor resolution
// from disguising missing runtime files or package exports. No files deleted.
if(!process.env.npm_execpath)throw new Error('Run npm run test:install.');
const consumer=await mkdtemp(path.join(os.tmpdir(),'alvenx-glass-consumer-'));
const pkg=JSON.parse(await readFile('package.json','utf8'));
const tarball=path.resolve(`releases/alvenx-liquid-glass-${pkg.version}.tgz`);
const tarballSHA256=createHash('sha256').update(await readFile(tarball)).digest('hex');
const reportRoot=process.env.ALVENX_VALIDATION_DIR||'docs/validation';
const packageJSON={name:'alvenx-consumer-smoke',private:true,type:'module',scripts:{check:'tsc --noEmit',build:'vite build',dev:'vite --host 127.0.0.1 --port 5184 --strictPort'},dependencies:{'@alvenx/liquid-glass':`file:${tarball.replaceAll('\\','/')}`,react:pkg.devDependencies.react,'react-dom':pkg.devDependencies['react-dom']},devDependencies:{vite:pkg.devDependencies.vite,typescript:pkg.devDependencies.typescript,'@types/react':pkg.devDependencies['@types/react'],'@types/react-dom':pkg.devDependencies['@types/react-dom']}};
await writeFile(path.join(consumer,'package.json'),JSON.stringify(packageJSON,null,2));
await writeFile(path.join(consumer,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,skipLibCheck:true,noEmit:true},include:['*.tsx']},null,2));
const readmeExample=(await readFile('README.md','utf8')).match(/```tsx\r?\n([\s\S]*?)```/);
if(!readmeExample)throw new Error('README React example is missing.');
await writeFile(path.join(consumer,'README-example.tsx'),readmeExample[1]);
await writeFile(path.join(consumer,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Installed AlvenX consumer</title><style>.alvenx-design .scene-lens{position:absolute;left:24px;top:30px;width:180px;height:70px}</style><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await writeFile(path.join(consumer,'main.tsx'),`import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BuddingLink, ControlledScene, LiquidControl, GlassSlider, GlassSwitch, VolumeStage, useGlassSettings } from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/fonts.css';
function App(){const {clock,settings,updateSettings,reset}=useGlassSettings({storageKey:'fresh-consumer'});const [on,setOn]=useState(true);return <><button id="outside" style={{fontFamily:'serif',fontSize:20,color:'rgb(80, 40, 100)'}}>Host page</button><main className="alvenx-design" style={{padding:32,maxWidth:900}}><h1>Installed, independent.</h1><BuddingLink id="consumer-bud" clock={clock} href="#outside" /><p lang="zh-CN">清晰的中文排版。</p><GlassSlider id="interactionStrength" label="Interaction strength" value={settings.interactionStrength} min={0} max={4} step={.1} clock={clock} onChange={interactionStrength=>updateSettings({interactionStrength})}/><GlassSwitch id="consumer-switch" label="Consumer switch" checked={on} onChange={setOn} clock={clock}/><LiquidControl id="consumer-reset" className="reset" clock={clock} onClick={reset}>Reset defaults</LiquidControl><ControlledScene className="consumer-scene" style={{position:'relative',height:130}} paint={({width,height})=><><rect width={width} height={height} fill="#DCE2FA"/><path d="M0 65H1000" stroke="#8C8BD3" strokeWidth="14"/></>}><LiquidControl id="consumer-scene-lens" clock={clock} className="scene-lens"><span>Shared scene</span></LiquidControl></ControlledScene><GlassSwitch id="consumer-scene-switch" label="Registered track" checked={on} onChange={setOn} clock={clock} controlledRefraction/><VolumeStage clock={clock} settings={settings}><h1>Room to grow.</h1></VolumeStage></main></>};createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);`);
const log=[];
for(const args of [['install','--ignore-scripts','--no-audit','--no-fund'],['run','check'],['run','build']]){
  const run=spawnSync(process.execPath,[process.env.npm_execpath,...args],{cwd:consumer,encoding:'utf8'});log.push({command:['npm',...args].join(' '),exitCode:run.status,output:run.stdout+run.stderr});
  if(run.status!==0){console.error(log.at(-1).output);throw new Error(`Consumer ${args.join(' ')} failed in ${consumer}`);}
}
await mkdir(reportRoot,{recursive:true});
await writeFile(path.join(reportRoot,'install.json'),JSON.stringify({status:'passed',consumer,tarball,tarballSHA256,commands:log.map(({command,exitCode})=>({command,exitCode})),note:'Fresh temporary directory outside original repository; own node_modules and types/build; browser smoke is reported separately.'},null,2)+'\n');
await writeFile(path.join(reportRoot,'install-build.log'),log.map(x=>x.command+'\n'+x.output).join('\n'));
console.log(JSON.stringify({status:'passed',consumer,tarball}));
