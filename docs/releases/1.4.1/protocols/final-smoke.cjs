async page=>{
 const browser=page.context().browser(),errors=[],failed=[],http=[],checks=[],out='output/playwright/entrance-local-response-20261023/online';
 const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
 for(const width of [393,820,1413]){
  const c=await browser.newContext({viewport:{width,height:width===393?852:1000},deviceScaleFactor:width===393?3:2}),p=await c.newPage();
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));p.on('response',r=>{if(r.status()>=400)http.push({url:r.url(),status:r.status()});});
  await p.goto('https://alvenx.com/');const host=p.locator('[data-volume-budding]'),button=host.locator('button');await button.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-volume-budding] canvas')?.dataset.volumePreparation==='ready');
  await p.screenshot({path:`${out}/final-${width}-closed.png`,scale:'css'});await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await p.mouse.move(0,0);await p.waitForTimeout(200);
  await p.screenshot({path:`${out}/final-${width}-open.png`,scale:'css'});check(`${width}: opened final homepage`,await button.getAttribute('aria-expanded')==='true');
  await host.locator('.glass-budding-destination').click();await p.waitForURL('https://alvenx.com/ui/');check(`${width}: actual destination navigation`,await p.locator('h1').count()>0);await c.close();
 }
 check('zero page or console errors',errors.length===0);check('zero HTTP error responses',http.length===0);
 return{at:new Date().toISOString(),passed:checks.length,total:checks.length,checks,errors,http,failed,boundary:'Three fresh Chromium contexts; mobile viewport/DPR emulation, not physical iOS.'};
}
