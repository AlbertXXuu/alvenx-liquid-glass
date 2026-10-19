// Bounded live-release acceptance callback. Run only after deployment is confirmed.
// Windows browser evidence does not certify physical iOS input or software keyboards.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name();
 const out='output/playwright/ui-1.2.1-2026-10-19/';
 const report={engine,browserVersion:browser.version(),physicalDevice:false,expectedSource:'17a47f4cd67cbed9176582cb2d6809a3dffabc9d',checks:[],layouts:[],pixels:[],focusEdgeNotes:[],errors:[],networkErrors:[],consoleErrors:[]};
 const check=(ok,name,detail)=>{if(!ok)throw Error(name+' '+JSON.stringify(detail));report.checks.push(name);};
 const geometry=p=>p.evaluate(()=>{const box=e=>e.getBoundingClientRect().toJSON(),host=document.querySelector('.lab-material-workbench'),preview=document.querySelector('.lab-material-preview');return{header:box(document.querySelector('header')),preview:box(preview),frame:box(host.querySelector('.stage-scroll')),stage:box(host.querySelector('.stage')),foreground:box(host.querySelector('.foreground')),dock:host.dataset.previewDock,position:getComputedStyle(preview).position,canvas:host.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth+1};});
 for(const [width,height] of [[393,852],[1180,852]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1}),p=await context.newPage();
  const pending=[],fontRequests=[];let hold=true,phase='release identity';
  p.on('pageerror',error=>report.errors.push({width,message:error.message}));
  p.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({width,message:message.text()});});
  p.on('requestfailed',request=>report.networkErrors.push({width,url:request.url(),error:request.failure()?.errorText}));
  p.on('response',response=>{if(response.status()>=400)report.networkErrors.push({width,url:response.url(),status:response.status()});});
  await p.route('**/misans-600-*.woff2',async route=>{fontRequests.push(route.request().url());if(hold)await new Promise(resolve=>pending.push(resolve));await route.continue();});
  try {
   await p.goto('https://alvenx.com/ui/');await p.evaluate(()=>document.fonts.ready);
   const identity=await p.evaluate(()=>({url:location.href,version:document.querySelector('meta[name="alvenx-kit-version"]')?.content,source:document.querySelector('meta[name="alvenx-source-commit"]')?.content,ref:document.querySelector('meta[name="alvenx-source-ref"]')?.content,entry:[...document.scripts].find(s=>s.type==='module')?.src,storage:localStorage.getItem('alvenx-design-showcase-v1')}));
   check(identity.version==='1.2.1'&&identity.source===report.expectedSource&&identity.ref==='v1.2.1'&&identity.entry.includes('/ui/releases/1.2.1/'),'live immutable release identity '+width,identity);
   const progress=p.getByRole('spinbutton',{name:'Progress value',exact:true});
   check(await progress.inputValue()==='50','fresh demo begins at 50% '+width);
   const relations=await p.evaluate(()=>{const v=document.querySelector('#volume'),params=document.querySelector('#parameters'),r=document.querySelector('#refraction');return{together:v.contains(params),before:!!(params.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING),canvas:v.querySelectorAll('canvas').length};});
   check(relations.together&&relations.before&&relations.canvas===1,'material controls share the volume section and one canvas '+width,relations);

   phase='cold Chinese font';
   const lens=p.getByRole('button',{name:'Drag the refractive lens, or use arrow keys'});await lens.focus();for(let i=0;i<16;i++)await lens.press('ArrowDown');
   const input=p.getByRole('textbox',{name:'Sample text',exact:true}),source=p.locator('.lab-optical-scene [data-controlled-source] text').first();
   await input.scrollIntoViewIfNeeded();
   await p.evaluate(()=>{const t=document.querySelector('.lab-optical-scene [data-controlled-source] text');window.__onlineSampleChanges=[];new MutationObserver(()=>window.__onlineSampleChanges.push({text:t.textContent,time:performance.now(),width:t.getBBox().width,pending:Array.from(document.fonts).filter(f=>f.family.replaceAll('"','')==='MiSans'&&f.weight==='600'&&f.status==='loading').length})).observe(t,{subtree:true,childList:true,characterData:true});});
   await input.fill('你好世界');await p.waitForTimeout(90);
   const cold={draft:await input.inputValue(),source:await source.textContent(),busy:await input.getAttribute('aria-busy'),fontRequests:fontRequests.map(url=>url.split('/').at(-1))};
   check(cold.draft==='你好世界'&&cold.source==='Clarity'&&cold.busy==='true'&&cold.fontRequests.length>0,'live cold font retains the readable sample while typing stays immediate '+width,cold);
   hold=false;pending.splice(0).forEach(resolve=>resolve());
   await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='你好世界');
   const ready=await source.evaluate(e=>({family:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight,width:e.getBBox().width,changes:window.__onlineSampleChanges.slice()}));
   check(ready.family.includes('Instrument Sans')&&ready.family.includes('MiSans')&&ready.weight==='600'&&ready.changes.filter(c=>c.text==='你好世界').length===1&&ready.changes.find(c=>c.text==='你好世界').pending===0,'live Chinese publishes once in its final font '+width,ready);
   await p.waitForTimeout(170);check(await source.evaluate(e=>e.getBBox().width)===ready.width,'live glyph width remains stable after publication '+width);
   await p.locator('#refraction').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.screenshot({path:out+`online-${engine}-${width}-font.png`,scale:'css'});
   await input.evaluate(e=>{e.focus();e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'ni');e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'ni',inputType:'insertCompositionText',isComposing:true}));});
   check(await input.inputValue()==='ni'&&await source.textContent()==='你好世界','live composition keeps its editable draft outside the sample '+width);
   await input.evaluate(e=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'你');e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'你',inputType:'insertCompositionText',isComposing:true}));e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'你'}));e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'你',inputType:'insertText',isComposing:false}));});
   await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='你');check(await input.getAttribute('aria-busy')==='false','live composition commits at its end '+width);

   phase='material controls';
   await p.locator('#volume').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(160);
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();await p.waitForTimeout(180);
   await p.locator('.lab-material-workbench').evaluate(e=>scrollBy({top:e.getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom-12,behavior:'instant'}));
   const first=p.getByRole('spinbutton',{name:'Interaction strength value',exact:true});await first.focus();await p.waitForTimeout(100);
   const initial=await geometry(p),opacity=p.getByRole('spinbutton',{name:'Glass background opacity value',exact:true});
   check(await opacity.inputValue()==='0.3','fresh material opacity remains 0.3 '+width);
   check(initial.canvas===1&&!initial.overflow&&initial.stage.width>initial.stage.height&&initial.position==='sticky'&&initial.dock==='true'&&Math.abs(initial.preview.top-initial.header.bottom-12)<1,'live horizontal preview docks once below the header '+width,initial);
   check(initial.foreground.bottom<=initial.preview.bottom+1&&initial.preview.height<=height-initial.header.bottom-224,'live preview text fits and leaves editing space '+width,initial);
   await p.screenshot({path:out+`online-${engine}-${width}-material-first.png`,scale:'css'});
   const last=p.getByRole('spinbutton',{name:'Glass background opacity value',exact:true});for(let i=0;i<12;i++)await p.keyboard.press('Tab');await p.waitForTimeout(100);
   const final=await geometry(p),lastRect=await last.evaluate(e=>{const b=e.getBoundingClientRect();return{...b.toJSON(),focused:e===document.activeElement,visible:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===e};});
   check(final.canvas===1&&final.position==='sticky'&&Math.abs(final.preview.top-final.header.bottom-12)<1&&lastRect.focused&&lastRect.visible&&lastRect.top>=final.preview.bottom-1&&lastRect.bottom<=height+2,'live final parameter remains operable below the same preview '+width,{final,lastRect});
   if(lastRect.bottom>height)report.focusEdgeNotes.push({width,height,bottom:lastRect.bottom,overshootPx:lastRect.bottom-height,note:'Native Tab focus minimum scrolling; inside the existing 2px prerelease tolerance. Center hit point remains unobscured.'});
   await p.screenshot({path:out+`online-${engine}-${width}-material-last.png`,scale:'css'});
   if(width===1180&&engine==='chromium') {
    phase='live material pixels';
    const ambient=p.getByRole('switch',{name:'Background motion',exact:true});if(await ambient.getAttribute('aria-checked')==='true')await ambient.click();
    const field=p.getByRole('spinbutton',{name:'Specular opacity value',exact:true});
    await field.fill('0');await field.press('Enter');await p.mouse.move(0,0);await p.waitForTimeout(220);const before=await p.locator('.volume-canvas').screenshot({scale:'css'});
    await field.fill('1');await field.press('Enter');await p.mouse.move(0,0);await p.waitForTimeout(220);const after=await p.locator('.volume-canvas').screenshot({path:out+'online-chromium-specular-opacity.png',scale:'css'});
    check(!before.equals(after),'live material edit changes the existing pearl pixels',{beforeBytes:before.length,afterBytes:after.length});report.pixels.push({parameter:'specularOpacity',changed:true,beforeBytes:before.length,afterBytes:after.length});
   }
   if(width===393) {
    phase='short editing viewport';const old=(await geometry(p)).preview;await p.setViewportSize({width,height:550});await p.waitForTimeout(180);await last.focus();
    const short=await geometry(p);check(short.dock==='false'&&short.position==='relative'&&short.canvas===1&&short.preview.height<=old.height+1,'short viewport undocks without enlarging the canvas '+width,short);
    await p.screenshot({path:out+`online-${engine}-${width}-short.png`,scale:'css'});
   }
   report.layouts.push({width,height,identity,cold,ready,initial,final,lastRect});
  }catch(error){throw Error(`${engine} ${width} ${phase}: ${error.message}`);}
  finally {hold=false;pending.splice(0).forEach(resolve=>resolve());await context.close();}
 }
 check(report.errors.length===0,'no live page errors',report.errors);
 check(report.networkErrors.length===0,'no failed live requests or HTTP errors',report.networkErrors);
 check(report.consoleErrors.length===0,'no live console or CSP errors',report.consoleErrors);
 report.limitations=['Synthetic composition and viewport resizing test application contracts; physical iOS IME and software keyboards remain separate device acceptance.'];
 if(engine==='webkit')report.limitations.push('Windows WebKit canvas resize/compositor retention limitation was already reproduced in 1.2.0; this port does not certify idle WebGL pixels. Pixel-response assertions run only in Chromium.');
 if(report.focusEdgeNotes.length)report.limitations.push('Native focus scrolling can leave the final input border up to 2px below the viewport edge; exact observations are retained in focusEdgeNotes. The field center remains visible and operable.');
 return report;
}
