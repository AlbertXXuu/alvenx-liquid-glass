async page=>{
 const browser=page.context().browser(),url=page.url(),results=[];
 for(const width of [393,768]){
  const context=await browser.newContext({viewport:{width,height:1024},hasTouch:true}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   const response=await p.goto(url);await p.evaluate(()=>document.fonts.ready);
   await p.locator('.stage-scroll').scrollIntoViewIfNeeded();await p.waitForTimeout(200);
   const heading=await p.locator('.foreground h3').innerText();if(!heading.replace(/\s+/g,' ').includes('room to'))throw Error('Responsive heading lost its word separator: '+heading);
   await p.locator('.stage-scroll').screenshot({path:`output/publication/r3-protocol-replay/online-${browser.browserType().name()}-${width}-volume.png`});
   await p.locator('.lab-optical-scene').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-local-glass="r3-free-lens"]')?.dataset.opticalMode==='scene');
   await p.locator('.lab-study-grid').screenshot({path:`output/publication/r3-protocol-replay/online-${browser.browserType().name()}-${width}-refraction.png`});
   const field=p.getByRole('textbox',{name:'Preview message',exact:true});await field.fill('Clear words · 光与形');await field.press('Enter');
   if(!await p.getByRole('status').filter({hasText:'Saved in this preview.'}).count())throw Error('Native field submit failed');
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();await p.locator('.lab-parameters').scrollIntoViewIfNeeded();
   await p.locator('.lab-parameters').screenshot({path:`output/publication/r3-protocol-replay/online-${browser.browserType().name()}-${width}-parameters.png`});
   const state=await p.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,opticalErrors:[...document.querySelectorAll('[data-optical-error]')].map(e=>e.dataset.opticalError),nativeRangePaint:[...document.querySelectorAll('input[type="range"]')].map(e=>({appearance:getComputedStyle(e).appearance,background:getComputedStyle(e).backgroundColor})),instrumentLoaded:[...document.fonts].some(f=>f.family.includes('Instrument')&&f.status==='loaded'),miSansLoaded:[...document.fonts].some(f=>f.family.includes('MiSans')&&f.status==='loaded'),defaults:[...document.querySelectorAll('input[id^="number-"]')].map(e=>({id:e.id,value:e.value}))}));
   if(state.overflow||state.opticalErrors.length||errors.length||!state.instrumentLoaded||!state.miSansLoaded)throw Error(JSON.stringify({state,errors}));
   results.push({status:response.status(),...state,errors});
  }finally{await context.close();}
 }
 return{url,engine:browser.version(),physicalDevice:false,status:'passed',results};
}
