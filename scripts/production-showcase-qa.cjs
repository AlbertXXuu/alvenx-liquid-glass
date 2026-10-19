// Playwright CLI callback, run against the already opened production candidate.
// Browser emulation is regression evidence; it does not certify physical iOS.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),base=page.url().split(/[?#]/)[0];
 const out='output/playwright/ui-production-2026-10-19/';
 const results={engine,version:browser.version(),physicalDevice:false,layouts:[],checks:[],errors:[]};
 const assert=(value,name,detail)=>{if(!value)throw Error(name+' '+JSON.stringify(detail));results.checks.push(name);};
 for(const [width,height] of [[320,852],[393,852],[768,1024],[1180,820],[1366,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1});
  const p=await context.newPage();p.on('pageerror',error=>results.errors.push({width,message:error.message}));
  try{
   await p.addInitScript(()=>localStorage.setItem('alvenx-design-showcase-v1',JSON.stringify({ambient:false,reducedMotion:false})));
   await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(220);
   const geometry=await p.evaluate(()=>{const header=document.querySelector('.ax-product-header'),h1=document.querySelector('h1'),lab=document.querySelector('.lab'),hr=header.getBoundingClientRect(),cs=getComputedStyle(header);return{viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,header:{top:hr.top,width:hr.width,height:hr.height,padding:cs.padding,radius:cs.borderRadius,wordmark:header.querySelector('img').getBoundingClientRect().width,navDisplay:getComputedStyle(header.querySelector('nav')).display},hero:{rect:h1.getBoundingClientRect().toJSON(),gradient:getComputedStyle(h1).backgroundImage,color:getComputedStyle(h1).color,overflow:getComputedStyle(h1).overflow},background:getComputedStyle(lab).backgroundImage};});
   assert(geometry.documentWidth<=width+1,'no horizontal overflow '+width,geometry);
   assert(geometry.header.top===14&&geometry.header.height>=70&&geometry.header.wordmark===160&&geometry.header.padding==='12px 18px 12px 22px'&&geometry.header.radius==='26px','canonical header '+width,geometry.header);
   assert(geometry.hero.gradient.includes('linear-gradient')&&geometry.hero.color==='rgba(0, 0, 0, 0)'&&geometry.hero.rect.right<=width,'visible gradient headline '+width,geometry.hero);
   assert(geometry.background.includes('radial-gradient')&&geometry.background.includes('linear-gradient'),'varied blue-violet canvas '+width);
   const number=p.getByRole('spinbutton',{name:'Progress value',exact:true}),slider=p.getByRole('slider',{name:'Progress',exact:true});
   assert(await number.inputValue()==='50'&&(await slider.getAttribute('aria-valuetext')).replace(/\s/g,'')==='50%','initial percentage 50 '+width,{numeric:await number.inputValue(),aria:await slider.getAttribute('aria-valuetext')});
   await p.screenshot({path:out+`production-${engine}-${width}-hero.png`,scale:'css'});
   if(width<=600){const menu=p.getByRole('button',{name:'Navigation menu'});await menu.click();assert(await menu.getAttribute('aria-expanded')==='true','menu opens '+width);await p.screenshot({path:out+`production-${engine}-${width}-menu.png`,scale:'css'});await p.keyboard.press('Escape');assert(await menu.getAttribute('aria-expanded')==='false'&&await menu.evaluate(e=>e===document.activeElement),'Escape restores menu focus '+width);await menu.click();await p.locator('.intro-version').click();assert(await menu.getAttribute('aria-expanded')==='false','outside closes menu '+width);await menu.click();await p.getByRole('button',{name:'Components',exact:true}).click();assert(await menu.getAttribute('aria-expanded')==='false','section closes menu '+width);}
   await p.locator('.stage-scroll').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(400);
   const volume=await p.locator('.stage-scroll').evaluate(e=>{const s=e.querySelector('.stage'),canvas=s.querySelector('canvas'),f=e.querySelector('.foreground'),r=s.getBoundingClientRect(),fr=f.getBoundingClientRect();return{layout:e.dataset.layout,frame:e.getBoundingClientRect().toJSON(),stage:r.toJSON(),foreground:fr.toJSON(),text:f.innerText,internalOverflow:e.scrollWidth>e.clientWidth+1,error:canvas.dataset.error||null,surface:s.dataset.surface};});
   assert(!volume.internalOverflow&&!volume.error&&volume.stage.width>volume.stage.height,'horizontal form without internal overflow '+width,volume);
   assert(volume.foreground.x>=volume.frame.x&&volume.foreground.right<=volume.frame.right+1&&volume.foreground.bottom<=volume.frame.bottom+1,'foreground text contained '+width,volume);
   await p.locator('.stage-scroll').screenshot({path:out+`production-${engine}-${width}-volume.png`,scale:'css'});
   await p.locator('#refraction').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(250);
   await p.screenshot({path:out+`production-${engine}-${width}-components.png`,scale:'css'});
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();await p.locator('.lab-parameters').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(150);
   const params=await p.locator('.lab-parameter-grid').evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,rows:e.querySelectorAll('.parameter-row').length}));
   assert(params.scrollWidth<=params.clientWidth+1&&params.rows===7,'material parameters contain seven rows '+width,params);
   await p.screenshot({path:out+`production-${engine}-${width}-parameters.png`,scale:'css'});
   await p.screenshot({path:out+`production-${engine}-${width}-full.png`,scale:'css',fullPage:true});
   results.layouts.push({width,height,geometry,volume:{...volume,surface:undefined},parameters:params});
   if(width===393||width===1180){
    await number.fill('999');await number.press('Enter');assert(await number.inputValue()==='100','percentage upper clamp '+width);
    await number.fill('-4');await number.press('Tab');assert(await number.inputValue()==='0','percentage lower clamp '+width);
    await number.fill('34.678');await number.press('Enter');assert(await number.inputValue()==='35','percentage edit precision '+width);
    await number.fill('81');await number.press('Escape');assert(await number.inputValue()==='35','percentage Escape '+width);
    await slider.focus();await slider.press('Home');await p.waitForFunction(()=>Number(document.querySelector('input[aria-label="Progress"]').value)===0);await slider.press('ArrowRight');await p.waitForFunction(()=>Number(document.querySelector('input[aria-label="Progress"]').value)===1);assert(Number(await slider.inputValue())===1,'keyboard percentage step '+width);await slider.press('End');await p.waitForFunction(()=>Number(document.querySelector('input[aria-label="Progress"]').value)===100);assert(Number(await slider.inputValue())===100,'keyboard percentage End '+width);
    await slider.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(150);const range=await slider.boundingBox();await p.mouse.click(range.x+range.width*.37,range.y+range.height/2);await p.waitForTimeout(120);const tapped=Number(await slider.inputValue());assert(tapped>25&&tapped<50,'range pointer tap '+width,{tapped,range});
    await p.mouse.move(range.x+range.width*.37,range.y+range.height/2);await p.mouse.down();await p.mouse.move(range.x+range.width*.75,range.y+range.height/2,{steps:12});await p.mouse.up();await p.waitForTimeout(120);assert(Number(await slider.inputValue())>60,'range continuous mouse drag '+width,await slider.inputValue());
    const toggle=p.getByRole('switch',{name:'Continuous switch',exact:true}),before=await toggle.getAttribute('aria-checked');await toggle.click();assert(await toggle.getAttribute('aria-checked')!==before,'switch pointer click '+width);await toggle.focus();await toggle.press('Space');assert(await toggle.getAttribute('aria-checked')===before,'switch keyboard Space '+width);
    await p.getByRole('textbox',{name:'Sample text',exact:true}).fill('光与形 AlvenX');await p.waitForTimeout(150);assert((await p.locator('.lab-optical-scene [data-controlled-source]').textContent()).includes('光与形 AlvenX'),'live optical source text '+width);
    const lens=p.getByRole('button',{name:'Drag the refractive lens, or use arrow keys'});await lens.scrollIntoViewIfNeeded();const lb=await p.locator('.lab-moving-lens').boundingBox(),l=await lens.boundingBox();await p.mouse.move(l.x+l.width/2,l.y+l.height/2);await p.mouse.down();await p.mouse.move(l.x+l.width/2+35,l.y+l.height/2+35,{steps:10});await p.mouse.up();await p.waitForTimeout(100);const la=await p.locator('.lab-moving-lens').boundingBox();assert(la.x>lb.x+20&&la.y>lb.y+20,'free lens mouse drag '+width,{before:lb,after:la});await lens.focus();await lens.press('Home');
    const message=p.getByRole('textbox',{name:'Preview message',exact:true});await message.fill('A clear thought. 清晰的文字。');await message.press('Enter');assert((await p.locator('.lab-message-feedback').textContent()).includes('Saved'),'native text Enter submit '+width);
    await number.fill('71');await number.press('Enter');
    const strength=p.getByRole('spinbutton',{name:'Interaction strength value'});await strength.fill('3.15');await strength.press('Enter');await p.waitForTimeout(300);
    const original=await p.evaluate(()=>({url:location.href,history:history.length,storage:localStorage.getItem('alvenx-design-showcase-v1')})),home=p.getByRole('button',{name:'AlvenX — Back to top'});assert(JSON.parse(original.storage).interactionStrength===3.15,'actual stored nondefault setting '+width,original);
    for(const activation of ['click','Enter','Space']){await p.evaluate(async()=>{scrollTo({top:1200,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});if(activation==='click')await home.click();else{await home.focus();await home.press(activation);}await p.waitForFunction(()=>scrollY===0);const after=await p.evaluate(()=>({url:location.href,history:history.length,storage:localStorage.getItem('alvenx-design-showcase-v1')}));assert(JSON.stringify(original)===JSON.stringify(after)&&await message.inputValue()==='A clear thought. 清晰的文字。'&&await number.inputValue()==='71','home '+activation+' preserves state '+width);}
    await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.querySelector('[role="switch"][aria-label="Reduced motion"]')?.disabled===true);const reducedY=await home.evaluate(el=>{scrollTo({top:600,behavior:'instant'});el.click();return scrollY;});assert(reducedY===0,'reduced motion immediate home '+width,reducedY);
   }
  }finally{await context.close();}
 }
 assert(results.errors.length===0,'no page errors',results.errors);return results;
}

