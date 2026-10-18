async page=>{
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  await page.goto('http://127.0.0.1:5184/');await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('[data-local-glass="consumer-reset"]')?.dataset.opticalReady==='true');
  const field=page.getByRole('spinbutton',{name:'Interaction strength value'});await field.fill('1.005');await field.press('Enter');if(await field.inputValue()!=='1.01')throw Error('installed numeric parser');
  await page.getByRole('switch',{name:'Consumer switch'}).click();if(await page.getByRole('switch',{name:'Consumer switch'}).getAttribute('aria-checked')!=='false')throw Error('installed switch');
  await page.getByRole('button',{name:'Reset defaults'}).click();if(await field.inputValue()!=='2.5')throw Error('installed reset');
  const outside=await page.locator('#outside').evaluate(el=>({font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize,color:getComputedStyle(el).color}));
  if(outside.font!=='serif'||outside.size!=='20px'||outside.color!=='rgb(80, 40, 100)')throw Error('host CSS changed');
  const actual=await page.evaluate(()=>({surface:document.querySelector('.stage').dataset.surface,ready:Array.from(document.querySelectorAll('[data-local-glass]')).map(el=>el.dataset.opticalReady),fontRequests:performance.getEntriesByType('resource').filter(e=>e.name.includes('woff2')).length,errors:Array.from(document.querySelectorAll('[role="alert"]')).map(x=>x.textContent)}));
  if(actual.ready.some(x=>x!=='true')||actual.errors.length||!actual.surface||actual.fontRequests<2)throw Error('missing installed resources/renderer');
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'[lang="zh-CN"]'});const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});if(!fonts.fonts.some(font=>font.familyName.includes('MiSans')))throw Error('installed MiSans glyph source');
  await page.screenshot({path:'docs/validation/installed-consumer.png',fullPage:true});
  if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
  return {status:'passed',scope:'Compiled production bundle from local tgz installed outside original repository',outside,actual,fonts,errors,failed};
}
