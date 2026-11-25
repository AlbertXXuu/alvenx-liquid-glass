async page=>{
 const context=await page.context().browser().newContext({viewport:{width:1100,height:820}});const p=await context.newPage();let blocked=true,failed=0,loads=0;const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('load',()=>loads++);
 await p.route('**/*Optical*.woff2*',route=>{if(blocked){failed++;return route.abort('failed')}return route.continue()});
 await p.goto('http://127.0.0.1:5241/#refraction');await p.locator('.lab-optical-scene').scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-raster]')?.dataset.sourceError?.includes('NetworkError'));
 const before=await p.locator('[data-local-glass="r3-free-lens"]').getAttribute('data-optical-mode');await p.getByLabel('Preview message',{exact:true}).fill('keep my draft');await p.locator('.lab-optical-scene').scrollIntoViewIfNeeded();
 await p.waitForTimeout(2300);const continuedAttempts=failed;blocked=false;const restoredAt=Date.now();
 await p.waitForFunction(()=>document.querySelector('[data-local-glass="r3-free-lens"]')?.dataset.opticalMode==='balanced',null,{timeout:20000});
 const result={before,after:await p.locator('[data-local-glass="r3-free-lens"]').getAttribute('data-optical-mode'),failedRequests:failed,continuedAttempts,restoreMs:Date.now()-restoredAt,loads,draft:await p.getByLabel('Preview message',{exact:true}).inputValue(),sourceError:await p.locator('.lab-optical-scene [data-controlled-raster]').getAttribute('data-source-error'),errors};
 if(result.loads!==1||result.draft!=='keep my draft'||result.sourceError!==null||result.errors.length)throw Error(JSON.stringify(result));
 const idle=await p.evaluate(()=>{const c=document.querySelector('[data-local-glass="r3-free-lens"]');return c.dataset.geometryVersion});await p.waitForTimeout(1200);result.idle=idle===await p.locator('[data-local-glass="r3-free-lens"]').getAttribute('data-geometry-version');
 await p.screenshot({path:'output/auto-restored.png'});await context.close();return result;
}

