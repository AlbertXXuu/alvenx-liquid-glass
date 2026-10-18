// Playwright CLI callback, not a Playwright Test suite or runtime dependency.
// From the kit directory:
// playwright-cli -s=compat-chrome open http://127.0.0.1:5174/ --browser=chrome
// playwright-cli -s=compat-chrome run-code --filename=scripts/compatibility-qa.cjs
// Repeat with --browser=firefox / webkit and a separate session.
// A mobile viewport is emulation, never a physical iOS/Safari certification.
async page => {
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const wait=async(predicate,label)=>{try{await page.waitForFunction(predicate,null,{timeout:8000});}catch(error){const diagnostics=await page.evaluate(()=>({url:location.href,systemReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,switches:Array.from(document.querySelectorAll('[role="switch"]')).map(el=>({label:el.getAttribute('aria-label'),checked:el.getAttribute('aria-checked')})),slider:document.querySelector('#range-component-slider')?.value,rail:document.querySelector('#range-component-slider')?.closest('.range-rail').dataset}));await page.mouse.up();throw new Error(label+': '+error.message+' '+JSON.stringify(diagnostics));}};
  const base=await page.evaluate(()=>location.origin+'/');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1364,height:1100});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const engine={version:page.context().browser()?.version(),userAgent:await page.evaluate(()=>navigator.userAgent)};
  // CSS.supports accepts declarations. A raster comparison separately checks
  // whether this engine actually applies the SVG displacement to the backdrop.
  const probe=await page.context().newPage();await probe.setViewportSize({width:320,height:120});
  await probe.setContent(`<html><head><style>*{box-sizing:border-box}html,body{margin:0;width:320px;height:120px}#pattern{position:absolute;inset:0;background:repeating-linear-gradient(90deg,#3045ff 0 20px,#a262ff 20px 40px)}#glass{position:absolute;left:40px;top:10px;width:240px;height:100px}</style></head><body><div id="pattern"></div><svg width="0" height="0"><filter id="probe" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feFlood flood-color="rgb(255,128,128)" result="offset"/><feDisplacementMap in="SourceGraphic" in2="offset" scale="40" xChannelSelector="R" yChannelSelector="G"/></filter></svg><div id="glass"></div></body></html>`);
  const declaration=await probe.evaluate(()=>({url:CSS.supports('backdrop-filter','url(#probe)'),blur:CSS.supports('backdrop-filter','blur(2px)'),webkitBlur:CSS.supports('-webkit-backdrop-filter','blur(2px)')}));
  const capture=async()=>{await probe.waitForTimeout(120);return (await probe.screenshot({scale:'css'})).toString('base64');};
  const before=await capture();await probe.locator('#glass').evaluate(el=>{el.style.backdropFilter='url(#probe)';el.style.webkitBackdropFilter='url(#probe)';});const after=await capture();
  await probe.locator('#glass').evaluate(el=>{el.style.backdropFilter='blur(3px)';el.style.webkitBackdropFilter='blur(3px)';});const native=await capture();
  const raster=await probe.evaluate(async({before,after,native})=>{
    const read=async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=320;canvas.height=120;const context=canvas.getContext('2d');context.drawImage(image,0,0);return context.getImageData(80,30,160,60).data;};
    const a=await read(before);const compare=async image=>{const b=await read(image);let changed=0,total=0;for(let i=0;i<a.length;i+=4){const distance=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);total+=distance;if(distance>30)changed++;}return {changedPixels:changed,sampledPixels:a.length/4,meanChannelDelta:total/(a.length/4*3)};};
    const svg=await compare(after),blur=await compare(native);return {svg:{...svg,displacementVisible:svg.changedPixels/svg.sampledPixels>.5},native:{...blur,blurVisible:blur.changedPixels/blur.sampledPixels>.05}};
  },{before,after,native});await probe.close();
  const at=mode=>base+(mode?'?optics='+mode:'');
  await page.goto(at(),{waitUntil:'domcontentloaded'});await page.evaluate(()=>localStorage.removeItem('alvenx-design-showcase-v1'));await page.reload({waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-local-glass="input"]').scrollIntoViewIfNeeded();
  await wait(()=>document.querySelector('[data-local-glass="input"]')?.getAttribute('data-optical-ready')==='true','initial input readiness');
  const auto=await page.locator('[data-local-glass="input"]').getAttribute('data-optical-mode');
  assert(['svg','native','flat'].includes(auto),'resolved automatic optical tier');if(auto==='svg')assert(raster.svg.displacementVisible,'automatic SVG tier has rendered displacement');
  const opacity=page.getByRole('spinbutton',{name:'Glass background opacity value'});
  const edit=async(draft,expected)=>{await opacity.fill(draft);await opacity.press('Enter');assert(await opacity.inputValue()===expected,'numeric normalization '+draft);};
  await edit('8','1');await edit('0.12345','0.123');await edit('0.4px','0.123');await edit('０．３','0.3');
  await opacity.fill('0.8');await opacity.press('Escape');assert(await opacity.inputValue()==='0.3','numeric cancel');
  await page.getByRole('button',{name:'Use inspiration',exact:true}).click();
  const message=page.getByRole('textbox',{name:'Preview message'});assert(await message.inputValue()==='Help me explore a new idea.','action in resolved tier');
  await message.fill('A clear thought. 清晰的文字。');await page.getByRole('button',{name:'Send preview message',exact:true}).click();
  assert(await page.locator('#preview-feedback').textContent()==='Saved in this preview.','submit action');
  const text=await message.evaluate(el=>({filter:getComputedStyle(el).filter,transform:getComputedStyle(el).transform}));assert(text.filter==='none'&&text.transform==='none','native DOM text remains clear');
  await page.getByRole('button',{name:'Components',exact:true}).click();
  const sw=page.getByRole('switch',{name:'Continuous switch',exact:true});await sw.click();assert(await sw.getAttribute('aria-checked')==='false','switch click');await sw.press('Space');assert(await sw.getAttribute('aria-checked')==='true','switch keyboard');
  const slider=page.getByRole('slider',{name:'Explore the endpoint',exact:true});await slider.focus();await slider.press('Home');
  await wait(()=>document.querySelector('#range-component-slider').value==='0','slider Home');
  await slider.press('ArrowRight');await wait(()=>Number(document.querySelector('#range-component-slider').value)===.01,'slider ArrowRight');
  await slider.press('Home');await wait(()=>document.querySelector('#range-component-slider').value==='0','slider Home before drag');
  const thumb=page.locator('[data-local-glass="component-slider-thumb"]');await thumb.scrollIntoViewIfNeeded();await page.waitForTimeout(200);const box=await thumb.boundingBox();assert(box,'slider thumb visible');
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-60,box.y+box.height/2,{steps:15});
  await wait(()=>Number(document.querySelector('#range-component-slider').closest('.range-rail').dataset.overshoot)<-2,'slider pointer overdrag');
  const overshoot=await slider.evaluate(el=>Number(el.closest('.range-rail').dataset.overshoot));assert(await slider.inputValue()==='0','drag value clamps while displayed lens overdrags');
  await page.mouse.up();await wait(()=>Number(document.querySelector('#range-component-slider').closest('.range-rail').dataset.overshoot)===0,'slider release settles');
  await page.locator('.stage').scrollIntoViewIfNeeded();await page.emulateMedia({reducedMotion:'reduce'});await wait(()=>{const sw=document.querySelector('[role="switch"][aria-label="Reduced motion"]');return sw.disabled&&sw.getAttribute('aria-checked')==='true';},'system reduced motion priority');await wait(()=>document.querySelector('.stage').dataset.ambientActive==='false','visible reduced-motion stage');
  const reduced=page.getByRole('switch',{name:'Reduced motion',exact:true});assert(await reduced.isDisabled()&&await reduced.getAttribute('aria-checked')==='true','system reduced motion priority');
  const time=await page.locator('.stage').getAttribute('data-ambient-time');await page.waitForTimeout(180);assert(time===await page.locator('.stage').getAttribute('data-ambient-time'),'decorative time pauses');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const tiers=[];for(const mode of ['native','flat']){
    await page.goto(at(mode),{waitUntil:'domcontentloaded'});await page.locator('[data-local-glass="input"]').scrollIntoViewIfNeeded();await wait(()=>document.querySelector('[data-local-glass="input"]')?.getAttribute('data-optical-ready')==='true',mode+' input readiness');
    const unit=page.locator('[data-local-glass="input"]');assert(await unit.getAttribute('data-optical-mode')===mode,'explicit '+mode+' tier');
    const layers=await unit.locator('.local-backdrop').evaluateAll(nodes=>nodes.map(el=>({backdrop:getComputedStyle(el).backdropFilter,webkit:getComputedStyle(el).webkitBackdropFilter})));assert(mode==='flat'?layers.length===0:layers.length>0,mode+' backdrop sampling contract');assert(layers.every(layer=>!Object.values(layer).some(value=>String(value).includes('url('))),'fallback never references SVG backdrop URL');
    const contour=await unit.evaluate(el=>{const paths=Array.from(el.querySelectorAll('.local-edge path')).map(path=>path.getAttribute('d'));return {pathCount:paths.length,same:paths.length>0&&paths.every(path=>path===paths[0]),hitClip:el.querySelector('.glass-hit').style.clipPath};});assert(contour.same&&contour.hitClip.startsWith('path('),mode+' shared rim and hit contour');
    await page.mouse.move(0,0);await page.waitForTimeout(120);
    const screenshot='../output/playwright/compatibility-2026-10-16/'+engine.version.replace(/[^a-z0-9.-]/gi,'_')+'-'+mode+'.png';await page.locator('.stage').screenshot({path:screenshot});
    await page.getByRole('button',{name:'Use inspiration',exact:true}).click();assert(await page.getByRole('textbox',{name:'Preview message'}).inputValue()==='Help me explore a new idea.',mode+' action');
    tiers.push({mode,layers,contour,screenshot});
  }
  await page.goto(at(),{waitUntil:'domcontentloaded'});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
  const width=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));assert(width.document===390,'narrow viewport no page overflow');
  const stage=await page.locator('.stage').evaluate(el=>({attributes:Object.fromEntries(Array.from(el.attributes).filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])),canvas:Array.from(el.querySelectorAll('canvas')).map(canvas=>({width:canvas.width,height:canvas.height}))}));
  const opticalErrors=await page.locator('[data-optical-error]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('data-optical-error')));assert(opticalErrors.length===0,'optical component errors');assert(errors.length===0,'page errors: '+errors.join(';'));
  return {status:'passed',engine,cssDeclaration:declaration,renderedBackdrop:raster,automaticTier:auto,numericCases:5,keyboard:'passed',sliderOverdrag:overshoot,reducedMotion:'passed',clearText:text,explicitFallbacks:tiers,narrow:width,stage,errors};
}
