// Playwright CLI callback: use an already opened candidate origin.
// Emulation does not certify physical iOS, OS IME or Combo Touch.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),base=page.url().split(/[?#]/)[0];
 const out='output/playwright/ui-1.2.2-2026-10-19/';
 const report={engine,version:browser.version(),physicalDevice:false,checks:[],layouts:[],errors:[]};
 const check=(ok,name,detail)=>{if(!ok)throw Error(name+' '+JSON.stringify(detail));report.checks.push(name);};
 const geometry=p=>p.evaluate(()=>{
  const rect=e=>e.getBoundingClientRect().toJSON(),group=document.querySelector('.lab-material-workbench'),preview=group.querySelector('.lab-material-preview'),foreground=group.querySelector('.foreground'),caption=group.querySelector('.volume-caption'),heading=foreground.querySelector('h3');
  return {preview:rect(preview),previewDocumentTop:preview.getBoundingClientRect().top+scrollY,position:getComputedStyle(preview).position,canvas:group.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth+1,foreground:rect(foreground),frame:rect(group.querySelector('.stage-scroll')),stage:rect(group.querySelector('.stage')),headingFont:getComputedStyle(heading).font,captionDisplay:getComputedStyle(caption).display,captionFont:getComputedStyle(caption).font,captionText:caption.textContent};
 });
 for(const [width,height] of [[320,852],[393,852],[768,1024],[1180,820],[1366,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1}),p=await context.newPage();
  p.on('pageerror',e=>report.errors.push({width,message:e.message}));
  try{
   await p.addInitScript(()=>localStorage.setItem('alvenx-design-showcase-v1',JSON.stringify({ambient:false,reducedMotion:false})));
   await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
   await p.locator('#volume').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(80);
   const collapsed=await geometry(p);
   check(['relative','static'].includes(collapsed.position),'collapsed preview in document flow '+width,collapsed);
   check(!collapsed.overflow&&collapsed.canvas===1&&collapsed.stage.width>collapsed.stage.height,'one horizontal canvas without overflow '+width,collapsed);
   check(collapsed.foreground.left>=collapsed.frame.left-1&&collapsed.foreground.right<=collapsed.frame.right+1&&collapsed.foreground.bottom<=collapsed.frame.bottom+1,'volume text contained '+width,collapsed);
   if(engine==='chromium')await p.screenshot({path:out+`material-${engine}-${width}-collapsed.png`,scale:'css'});
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();await p.waitForTimeout(100);
   const expanded=await geometry(p);
   check(['relative','static'].includes(expanded.position)&&expanded.canvas===1,'disclosure retains normal flow and same canvas '+width,expanded);
   check(Math.abs(collapsed.preview.width-expanded.preview.width)<1&&Math.abs(collapsed.preview.height-expanded.preview.height)<1&&Math.abs(collapsed.previewDocumentTop-expanded.previewDocumentTop)<1,'disclosure does not resize or relocate preview '+width,{collapsed,expanded});
   check(collapsed.headingFont===expanded.headingFont&&collapsed.captionDisplay===expanded.captionDisplay&&collapsed.captionFont===expanded.captionFont&&collapsed.captionText===expanded.captionText,'disclosure preserves typography and caption '+width,{collapsed,expanded});
   check(await p.locator('#volume .lab-material-workbench .lab-parameter-grid .parameter-row').count()===7,'all seven material controls remain in volume section '+width);
   check(await p.locator('#volume .lab-material-workbench .lab-switches [role=switch]').count()===2,'both motion controls remain in same group '+width);
   if(engine==='chromium')await p.screenshot({path:out+`material-${engine}-${width}-expanded.png`,scale:'css'});
   const opacity=p.getByRole('spinbutton',{name:'Glass background opacity value',exact:true});
   await opacity.focus();await p.waitForTimeout(120);
   const scrolled=await geometry(p),field=await opacity.evaluate(e=>{const r=e.getBoundingClientRect();return{rect:r.toJSON(),focused:e===document.activeElement,centerVisible:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e};});
   check(Math.abs(scrolled.previewDocumentTop-expanded.previewDocumentTop)<1&&['relative','static'].includes(scrolled.position),'native focus retains preview document position '+width,scrolled);
   check(field.focused&&field.centerVisible&&field.rect.top>=0&&field.rect.bottom<=height+2,'last native numeric field remains operable '+width,field);
   const priorScroll=await p.evaluate(()=>scrollY);
   await p.evaluate(()=>{const r=document.querySelector('.lab-material-preview').getBoundingClientRect();scrollBy({top:r.bottom+20,behavior:'instant'});});
   const passed=await geometry(p),scrollDelta=await p.evaluate(prior=>scrollY-prior,priorScroll);
   check(Math.abs(passed.preview.top-scrolled.preview.top+scrollDelta)<1,'preview moves by document scroll distance '+width,{scrollDelta,scrolled,passed});
   check(passed.preview.bottom<0,'preview can leave viewport completely '+width,passed);
   await opacity.fill('0.537');await opacity.press('Enter');
   check(Number(await opacity.inputValue())===.537,'numeric entry retains allowed precision '+width,await opacity.inputValue());
   await opacity.fill('999');await opacity.press('Enter');
   check(Number(await opacity.inputValue())===1,'numeric overflow clamps at commit '+width,await opacity.inputValue());
   const slider=p.getByRole('slider',{name:'Glass background opacity',exact:true});await slider.focus();await slider.press('Home');await slider.press('ArrowRight');
   await p.waitForFunction(()=>document.querySelector('[aria-label="Glass background opacity value"]').value==='0.001');
   check(Number(await opacity.inputValue())===.001,'keyboard slider still updates shared numeric value '+width,await opacity.inputValue());
   await p.getByRole('button',{name:'Reset defaults',exact:true}).click();
   check(Number(await opacity.inputValue())===.3,'reset retains accepted glass opacity '+width,await opacity.inputValue());
   if(engine==='chromium')await p.screenshot({path:out+`material-${engine}-${width}-scrolled.png`,scale:'css'});
   report.layouts.push({width,height,collapsed,expanded,scrolled,passed,field});
   if(width===393){
    await p.setViewportSize({width,height:550});await opacity.focus();await p.waitForTimeout(100);const short=await geometry(p);
    check(['relative','static'].includes(short.position)&&Math.abs(short.preview.height-expanded.preview.height)<1,'short viewport retains natural preview size and flow',short);
    await p.setViewportSize({width,height});await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);
    const reduced=p.getByRole('switch',{name:'Reduced motion',exact:true});check(await reduced.isDisabled()&&await reduced.getAttribute('aria-checked')==='true','system reduced motion remains respected');
   }
   const message=p.getByRole('textbox',{name:'Preview message',exact:true}),send=p.getByRole('button',{name:'Send preview message',exact:true}),feedback=p.locator('.lab-message-feedback');
   await message.fill('');await send.click();check(await feedback.textContent()==='Write a message before sending.','empty input keeps validation '+width);
   await message.fill('A small question');check(await feedback.textContent()==='','editing clears previous response '+width);await send.click();
   check(await feedback.textContent()==='Good question… but I don’t understand.','ordinary English produces requested Easter egg '+width);
   if(engine==='chromium')await p.locator('#fields').screenshot({path:out+`message-${engine}-${width}-ordinary.png`,scale:'css'});
   await message.fill('这是一个中文问题');await message.press('Enter');check(await feedback.textContent()==='Good question… but I don’t understand.','Chinese input and Enter submit locally '+width);
   await message.fill('fluency');await send.click();check(await feedback.textContent()==='<3'&&await feedback.locator('*').count()===0,'fluency produces literal heart text '+width);
   await message.fill('  FlUeNcY  ');await message.press('Enter');check(await feedback.textContent()==='<3','secret ignores surrounding spaces and case '+width);
   await message.fill('fluency is a word');await send.click();check(await feedback.textContent()==='Good question… but I don’t understand.','only exact secret word activates heart '+width);
   await message.fill('   ');await message.press('Enter');check(await feedback.textContent()==='Write a message before sending.','whitespace keeps validation '+width);
   check(await message.evaluate(e=>getComputedStyle(e).userSelect!=='none'&&e.tagName==='INPUT'),'composer remains a native editable input '+width);
   if(engine==='chromium'){
    await message.fill('fluency');await send.click();await p.locator('#fields').screenshot({path:out+`message-${engine}-${width}-heart.png`,scale:'css'});
   }
  }finally{await context.close();}
 }
 if(engine==='webkit')report.limitations=['Windows WebKit canvas resize/compositor retention issue prevents this port from certifying WebGL pixels. This run checks normal flow, controls and native input only; screenshots use Chromium. Physical iOS, OS IME and Combo Touch validation remain separate.'];
 check(report.errors.length===0,'no page errors',report.errors);return report;
}
