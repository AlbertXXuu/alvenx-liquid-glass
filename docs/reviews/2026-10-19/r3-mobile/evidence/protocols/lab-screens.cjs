async page=>{
 const browser=page.context().browser(),url='http://127.0.0.1:5174/mobile-review.html',out={engine:browser.version(),physicalDevice:false,cases:[],errors:[]};
 for(const width of [320,393,768,1180]){
  const c=await browser.newContext({viewport:{width,height:width<600?852:1024}}),p=await c.newPage();p.on('pageerror',e=>out.errors.push({width,error:e.message}));
  try{
   await p.goto(url);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
   await p.screenshot({path:`output/playwright/r3-protocol-replay/lab-${browser.browserType().name()}-${width}-intro.png`});
   for(const [name,selector]of [['volume','.stage-scroll'],['refraction','.lab-study-grid'],['field','.lab-field-scene']]){
    await p.locator(selector).evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(300);
    if(name==='refraction')await p.waitForFunction(()=>document.querySelector('[data-local-glass="r3-free-lens"]')?.dataset.opticalMode==='scene');
    await p.locator(selector).screenshot({path:`output/playwright/r3-protocol-replay/lab-${browser.browserType().name()}-${width}-${name}.png`});
   }
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();await p.locator('.lab-parameters').scrollIntoViewIfNeeded();await p.waitForTimeout(350);
   await p.locator('.lab-parameters').screenshot({path:`output/playwright/r3-protocol-replay/lab-${browser.browserType().name()}-${width}-parameters.png`});
   const state=await p.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,scenes:[...document.querySelectorAll('[data-optical-mode="scene"]')].length,errors:[...document.querySelectorAll('[data-optical-error],[data-error]')].map(e=>e.getAttribute('data-optical-error')||e.getAttribute('data-error')).filter(Boolean)}));
   if(state.overflow||state.errors.length)throw Error(JSON.stringify(state));out.cases.push(state);
  }finally{await c.close();}
 }
 if(out.errors.length)throw Error(JSON.stringify(out.errors));return out;
}
