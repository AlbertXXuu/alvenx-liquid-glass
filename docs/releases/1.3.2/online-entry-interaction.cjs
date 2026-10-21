async page => {
 const browser=page.context().browser(),base='https://alvenx.com/ui/',out='output/playwright/entry-first-demo-online-2026-10-22/';
 const result={engine:browser.browserType().name(),version:browser.version(),base,physicalDevice:false,checks:[],errors:[],consoleErrors:[],httpErrors:[],cancelledRequests:[]};
 const assert=(ok,name,detail)=>{if(!ok)throw Error(name+' '+JSON.stringify(detail));result.checks.push(name);};
 const watch=p=>{p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});p.on('response',r=>{if(r.status()>=400)result.httpErrors.push({url:r.url(),status:r.status()});});p.on('requestfailed',r=>result.cancelledRequests.push({url:r.url(),error:r.failure()?.errorText}));};
 const context=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
 const p=await context.newPage();watch(p);
 await p.addInitScript(()=>{window.__entryGrowth=[];new MutationObserver(()=>{const e=document.querySelector('.stage');if(!e)return;const v=Number(e.dataset.growth);if(Number.isFinite(v)&&window.__entryGrowth.at(-1)?.v!==v)window.__entryGrowth.push({v,t:performance.now()});}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-growth']});});
 try{
  await p.goto(base);await p.bringToFront();await p.waitForFunction(()=>document.querySelector('.stage')?.dataset.growth==='1.0000');
  const initial=await p.evaluate(()=>window.__entryGrowth);result.initialGrowthSamples=initial;
  assert(initial.some(x=>x.v===0),'first actual page entry begins at mother');
  assert(initial.some(x=>x.v>0&&x.v<1),'first entry visibly grows through intermediate states');
  assert(initial.at(-1)?.v===1,'first entry completes');
  await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(150);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(250);
  assert(await p.locator('.stage').getAttribute('data-growth')==='1.0000','scroll return does not replay automatically');
  await p.getByRole('button',{name:/Replay slow budding/}).click();
  await p.waitForFunction(()=>{const g=Number(document.querySelector('.stage')?.dataset.growth);return g>.25&&g<.65;});
  assert(true,'Replay restarts continuous growth');
  await p.screenshot({path:out+'online-budding-intermediate.png',scale:'css'});
  await p.waitForFunction(()=>document.querySelector('.stage')?.dataset.growth==='1.0000');
  assert(true,'Replay completes');
  await p.getByRole('textbox',{name:'Preview message',exact:true}).fill('A small thought');
  await p.getByRole('button',{name:'Send preview message',exact:true}).click();
  assert(await p.locator('.lab-message-feedback').textContent()==='Good question… but I don’t understand.','ordinary message Easter egg retained');
  await p.getByRole('textbox',{name:'Preview message',exact:true}).fill('  FlUeNcY  ');
  await p.getByRole('button',{name:'Send preview message',exact:true}).click();
  assert(await p.locator('.lab-message-feedback').textContent()==='<3','trimmed case-insensitive fluency Easter egg retained');
  await p.screenshot({path:out+'online-message-fluency.png',scale:'css'});
 }finally{await context.close();}
 const reduced=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const rp=await reduced.newPage();watch(rp);
 try{await rp.goto(base);await rp.bringToFront();await rp.waitForFunction(()=>document.querySelector('.stage')?.dataset.growth==='1.0000');assert(await rp.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),'reduced-motion fixture active');assert(await rp.locator('.stage').getAttribute('data-growth')==='1.0000','reduced motion presents complete usable form');await rp.screenshot({path:out+'online-reduced-motion.png',scale:'css'});}finally{await reduced.close();}
 const zh=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});const zp=await zh.newPage();watch(zp);
 await zp.addInitScript(()=>localStorage.setItem('alvenx-showcase-language-v1','zh-CN'));
 try{await zp.goto(base);await zp.bringToFront();await zp.waitForFunction(()=>document.documentElement.lang==='zh-CN');await zp.waitForFunction(()=>document.querySelector('.stage')?.dataset.growth==='1.0000');await zp.locator('h1').click();await zp.screenshot({path:out+'entry-chromium-820-zh-clean.png',scale:'css'});assert((await zp.locator('h1').textContent()).includes('玻璃'),'Chinese tablet presentation ready');}finally{await zh.close();}
 assert(result.errors.length===0,'no page errors',result.errors);assert(result.consoleErrors.length===0,'no console errors',result.consoleErrors);assert(result.httpErrors.length===0,'no HTTP error responses',result.httpErrors);
 return result;
}
