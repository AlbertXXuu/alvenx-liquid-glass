// Playwright CLI callback: execute against the current candidate's already open page.
// Synthetic composition contracts and Windows WebKit do not certify a physical iOS IME.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name();
 const out='output/playwright/ui-1.2.1-2026-10-19/';
 const result={engine,version:browser.version(),physicalDevice:false,checks:[],layouts:[],errors:[]};
 const assert=(ok,name,detail)=>{if(!ok)throw Error(name+' '+JSON.stringify(detail));result.checks.push(name);};
 const base=page.url().split(/[?#]/)[0];
 for(const width of [393,1180]) {
  const context=await browser.newContext({viewport:{width,height:852},hasTouch:true,deviceScaleFactor:1}),p=await context.newPage();
  const requests=[],releases=[];let hold=true;
  p.on('pageerror',error=>result.errors.push(error.message));
  await p.route('**/misans-600-*.woff2',async route=>{requests.push(route.request().url().split('/').at(-1));if(hold)await new Promise(resolve=>releases.push(resolve));await route.continue();});
  await p.addInitScript(()=>{
   localStorage.setItem('alvenx-design-showcase-v1',JSON.stringify({ambient:false,reducedMotion:false}));
   window.__fontCalls=[];window.__fontGates=[];window.__fontDelay='';window.__fontFail='';
   const load=FontFaceSet.prototype.load;
   FontFaceSet.prototype.load=function(font,text){
    const call={font,text,start:performance.now(),end:null};window.__fontCalls.push(call);
    if(text===window.__fontFail)return Promise.reject(new Error('Deliberate font failure for regression coverage.'));
    return load.call(this,font,text).then(async faces=>{if(text===window.__fontDelay)await new Promise(resolve=>window.__fontGates.push({text,resolve}));call.end=performance.now();return faces;});
   };
  });
  let phase='cold font request';
  try {
   await p.goto(base);await p.evaluate(()=>document.fonts.ready);
   const input=p.getByRole('textbox',{name:'Sample text',exact:true});
   const source=p.locator('.lab-optical-scene [data-controlled-source] text').first();
   await input.scrollIntoViewIfNeeded();
   await p.evaluate(()=>{
    const t=document.querySelector('.lab-optical-scene [data-controlled-source] text');window.__sampleChanges=[];
    new MutationObserver(()=>window.__sampleChanges.push({text:t.textContent,time:performance.now(),width:t.getBBox().width,pending:Array.from(document.fonts).filter(f=>f.family.replaceAll('"','')==='MiSans'&&f.weight==='600'&&f.status==='loading').length})).observe(t,{characterData:true,childList:true,subtree:true});
   });
   await input.fill('你好世界');await p.waitForTimeout(65);
   const cold={draft:await input.inputValue(),source:await source.textContent(),busy:await input.getAttribute('aria-busy'),requests:requests.slice()};
   assert(cold.draft==='你好世界'&&cold.source==='Clarity'&&cold.busy==='true','cold Chinese input stays native; SVG retains the last font-ready sample '+width,cold);
   assert(cold.requests.length>0&&cold.requests.length<8,'only the necessary 600-weight MiSans shards are requested '+width,cold.requests);
   await input.evaluate(e=>e.setSelectionRange(1,3));
   hold=false;releases.splice(0).forEach(resolve=>resolve());
   await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='你好世界');
   const ready=await p.evaluate(()=>{const input=document.querySelector('input[aria-label="Sample text"]'),t=document.querySelector('.lab-optical-scene [data-controlled-source] text');return{changes:window.__sampleChanges.slice(),selection:[input.selectionStart,input.selectionEnd],family:getComputedStyle(t).fontFamily,width:t.getBBox().width,calls:window.__fontCalls.slice()};});
   assert(ready.changes.filter(change=>change.text==='你好世界').length===1&&ready.changes.find(change=>change.text==='你好世界').pending===0,'Chinese sample publishes once after its exact weight has loaded '+width,ready);
   assert(JSON.stringify(ready.selection)==='[1,3]','font completion preserves the editor selection '+width,ready.selection);
   assert(ready.family.includes('Instrument Sans')&&ready.family.includes('MiSans'),'SVG uses the explicit Latin and Chinese families '+width,ready.family);
   const lens=p.getByRole('button',{name:'Drag the refractive lens, or use arrow keys'});await lens.focus();for(let i=0;i<16;i++)await lens.press('ArrowDown');
   await p.locator('.lab-optical-scene').screenshot({path:out+`font-ready-${engine}-${width}.png`,scale:'css',style:'.ax-product-header,.skip-link{visibility:hidden!important}'});
   const stable=ready.width;await p.waitForTimeout(200);assert(await source.evaluate(e=>e.getBBox().width)===stable,'no later font-width jump after publication '+width);

   phase='composition';
   // Synthetic native composition events exercise the app contract, not an OS keyboard.
   await input.evaluate(e=>{
    e.focus();e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'ni');
    e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'ni',inputType:'insertCompositionText',isComposing:true}));
   });
   assert(await input.inputValue()==='ni'&&await source.textContent()==='你好世界','composition draft is editable without publishing pinyin '+width);
   await input.evaluate(e=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'你');
    e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'你',inputType:'insertCompositionText',isComposing:true}));
   });
   assert(await source.textContent()==='你好世界','composing candidate does not replace the sample '+width);
   await input.evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'你'}));e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'你',inputType:'insertText',isComposing:false}));});
   await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='你');
   assert(await input.inputValue()==='你'&&await input.getAttribute('aria-busy')==='false','composition end commits the font-ready Chinese sample '+width);

   phase='late font promise';
   await p.evaluate(()=>{window.__fontDelay='安静';window.__sampleChanges=[];});await input.fill('安静');
   await p.waitForFunction(()=>window.__fontGates.length>0);
   await input.fill('AlvenX 世界');await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='AlvenX 世界');
   await p.evaluate(()=>{window.__fontDelay='';window.__fontGates.splice(0).forEach(gate=>gate.resolve());});await p.waitForTimeout(70);
   assert(await source.textContent()==='AlvenX 世界'&&!await p.evaluate(()=>window.__sampleChanges.some(change=>change.text==='安静')),'a late font promise cannot overwrite a newer mixed-language edit '+width);
   await source.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);getSelection().removeAllRanges();getSelection().addRange(r);});
   assert(await p.evaluate(()=>getSelection().toString())==='AlvenX 世界','published source retains native DOM selection '+width);
   await p.evaluate(()=>getSelection().removeAllRanges());

   phase='grapheme limit';
   const clusters='a'.repeat(17)+'👩‍💻';await input.fill(clusters+'z');
   await p.waitForFunction(expected=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent===expected,clusters);
   assert(await input.inputValue()===clusters,'18-character cap preserves a complete emoji grapheme '+width);
   assert(await input.getAttribute('maxlength')===null,'native UTF-16 maxlength cannot cut composition or emoji '+width);

   phase='font failure';
   await p.evaluate(()=>{window.__fontFail='失败字';});await input.fill('失败字');
   await p.waitForFunction(()=>document.querySelector('input[aria-label="Sample text"]')?.getAttribute('aria-busy')==='false');
   assert(await input.inputValue()==='失败字'&&await source.textContent()===clusters,'font failure keeps the draft and the previous readable sample '+width);
   assert((await p.getByRole('status').allTextContents()).some(text=>/font/i.test(text)),'font failure has a visible status message '+width);
   await p.evaluate(()=>{window.__fontFail='';});await input.fill('');
   await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='');
   assert(await input.inputValue()===''&&await source.textContent()==='','empty input clears immediately '+width);

   phase='clear pending';
   await p.evaluate(()=>{window.__fontDelay='静';});await input.fill('静');await p.waitForFunction(()=>window.__fontGates.length>0);
   await input.fill('');await p.evaluate(()=>{window.__fontDelay='';window.__fontGates.splice(0).forEach(gate=>gate.resolve());});await p.waitForTimeout(70);
   assert(await source.textContent()==='','clearing invalidates a pending font completion '+width);
   await input.fill('光与形 AlvenX');await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='光与形 AlvenX');
   await p.locator('#refraction').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
   await p.screenshot({path:out+`font-final-${engine}-${width}.png`,scale:'css'});
   result.layouts.push({width,cold,ready,requests});
  } catch(error) {throw Error(`${engine} ${width} ${phase}: ${error.message} ${JSON.stringify(await p.evaluate(()=>({draft:document.querySelector('input[aria-label="Sample text"]')?.value,source:document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent,status:document.querySelector('#sample-text-status')?.textContent,calls:window.__fontCalls,gates:window.__fontGates.map(gate=>gate.text)})))}`);}
  finally {hold=false;releases.splice(0).forEach(resolve=>resolve());await context.close();}
 }
 assert(result.errors.length===0,'no page errors',result.errors);
 return result;
}
