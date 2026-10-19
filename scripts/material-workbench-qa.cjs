// Playwright CLI callback. Use an already opened candidate origin.
// Desktop browser emulation is not physical iOS / software keyboard evidence.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),base=page.url().split(/[?#]/)[0];
 const out='output/playwright/ui-1.2.1-2026-10-19/';
 const report={engine,version:browser.version(),physicalDevice:false,checks:[],layouts:[],pixels:[],errors:[]};
 const check=(ok,name,data)=>{if(!ok)throw Error(name+' '+JSON.stringify(data));report.checks.push(name);};
 const geometry=p=>p.evaluate(()=>{const r=e=>e.getBoundingClientRect().toJSON(),group=document.querySelector('.lab-material-workbench'),preview=document.querySelector('.lab-material-preview');return{header:r(document.querySelector('header')),preview:r(preview),group:r(group),dock:group.dataset.previewDock,editing:group.dataset.editing,position:getComputedStyle(preview).position,canvas:group.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth+1,foreground:r(group.querySelector('.foreground')),frame:r(group.querySelector('.stage-scroll')),stage:r(group.querySelector('.stage')),visualHeight:visualViewport?.height??innerHeight};});
 for(const [width,height] of [[320,852],[393,852],[768,1024],[1180,820],[1366,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1}),p=await context.newPage();
  p.on('pageerror',e=>report.errors.push({width,message:e.message}));
  try{
   await p.addInitScript(()=>localStorage.setItem('alvenx-design-showcase-v1',JSON.stringify({ambient:false,reducedMotion:false})));
   await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(180);
   await p.locator('#volume').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(180);
   const collapsed=await geometry(p);
   check(collapsed.editing==='false'&&collapsed.position==='relative','collapsed preview undocked '+width,collapsed);
   check(!collapsed.overflow&&collapsed.canvas===1&&collapsed.stage.width>collapsed.stage.height,'one horizontal canvas without overflow '+width,collapsed);
   check(collapsed.foreground.left>=collapsed.frame.left-1&&collapsed.foreground.right<=collapsed.frame.right+1&&collapsed.foreground.bottom<=collapsed.frame.bottom+1,'collapsed text contained '+width,collapsed);
   await p.screenshot({path:out+`material-${engine}-${width}-collapsed.png`,scale:'css'});
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();await p.waitForTimeout(180);
   await p.locator('.lab-material-workbench').evaluate(e=>scrollBy({top:e.getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom-12,behavior:'instant'}));
   await p.getByRole('spinbutton',{name:'Interaction strength value',exact:true}).focus();await p.waitForTimeout(100);
   const expanded=await geometry(p);
   check(expanded.canvas===1&&expanded.dock==='true'&&expanded.position==='sticky','single existing canvas docks '+width,expanded);
   check(Math.abs(expanded.preview.top-expanded.header.bottom-12)<1,'preview aligns below header '+width,expanded);
   check(expanded.preview.height<=height-expanded.header.bottom-240+16,'preview leaves controls room '+width,expanded);
   check(!expanded.overflow&&expanded.foreground.bottom<=expanded.preview.bottom+1,'expanded text and width contained '+width,expanded);
   check(await p.locator('.lab-parameter-grid .parameter-row').count()===7,'all seven material controls beside preview '+width);
   await p.screenshot({path:out+`material-${engine}-${width}-first.png`,scale:'css'});
   const labels=['Interaction strength','Specular opacity','Specular saturation','Refraction level','Blur level','Progressive blur','Glass background opacity'];
   const fields=[];
   for(const [index,label] of labels.entries()){
    const field=p.getByRole('spinbutton',{name:label+' value',exact:true});if(index){await p.keyboard.press('Tab');await p.keyboard.press('Tab');}await p.waitForTimeout(70);
    const info=await field.evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),focused:e===document.activeElement,preview:document.querySelector('.lab-material-preview').getBoundingClientRect().toJSON(),point:document.elementFromPoint(e.getBoundingClientRect().x+e.getBoundingClientRect().width/2,e.getBoundingClientRect().y+e.getBoundingClientRect().height/2)?.getAttribute('aria-label')}));
    check(info.focused&&info.rect.top>=info.preview.bottom-1&&info.rect.bottom<=height+2&&info.point===label+' value','native focus is visible and unobscured '+width+' '+label,info);fields.push({label,...info});
   }
   await p.screenshot({path:out+`material-${engine}-${width}-last.png`,scale:'css'});
   const rail=p.getByRole('slider',{name:'Glass background opacity',exact:true});await rail.focus();await rail.press('Home');await p.waitForTimeout(120);const b=await rail.boundingBox();
   check(b.y>=((await geometry(p)).preview.bottom)-1&&b.y+b.height<=height,'last slider operable below preview '+width,b);
   await p.mouse.move(b.x+b.width*.12,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width*.68,b.y+b.height/2,{steps:12});await p.mouse.up();await p.waitForTimeout(120);
   check(Number(await rail.inputValue())>.5,'last slider drag updates material '+width,await rail.inputValue());
   report.layouts.push({width,height,collapsed,expanded,fields});
   if(width===393){
    const old=(await geometry(p)).preview;await p.setViewportSize({width,height:550});await p.waitForTimeout(200);const short=await geometry(p);
    check(short.dock==='false'&&short.position==='relative'&&short.preview.height<=old.height+1,'short viewport undocks without expanding canvas',short);
    await p.getByRole('spinbutton',{name:'Glass background opacity value',exact:true}).focus();await p.screenshot({path:out+`material-${engine}-393-short.png`,scale:'css'});
    await p.setViewportSize({width,height});await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(150);
    const reduced=p.getByRole('switch',{name:'Reduced motion',exact:true});check(await reduced.isDisabled()&&await reduced.getAttribute('aria-checked')==='true','system reduced motion retained');
   }
   if(width===1180&&engine==='chromium'){
    // Freeze the background; compare only the same canvas after a real edit.
    await p.getByRole('spinbutton',{name:'Interaction strength value',exact:true}).focus();await p.waitForTimeout(180);await p.mouse.move(0,0);await p.waitForTimeout(350);
    for(const [label,max] of [['Specular opacity',1],['Specular saturation',3],['Refraction level',3],['Blur level',6],['Progressive blur',6],['Glass background opacity',1]]){
     const field=p.getByRole('spinbutton',{name:label+' value',exact:true});await field.fill('0');await field.press('Enter');await p.mouse.move(0,0);await p.waitForTimeout(160);const before=await p.locator('.volume-canvas').screenshot({scale:'css'});
     await field.fill(String(max));await field.press('Enter');await p.mouse.move(0,0);await p.waitForTimeout(160);const after=await p.locator('.volume-canvas').screenshot({path:out+`material-${engine}-${label.toLowerCase().replaceAll(' ','-')}.png`,scale:'css'});
     check(!before.equals(after),'live pearl pixels respond to '+label,{beforeBytes:before.length,afterBytes:after.length});report.pixels.push({label,changed:true,beforeBytes:before.length,afterBytes:after.length});
    }
    const strength=p.getByRole('spinbutton',{name:'Interaction strength value',exact:true}),surface=()=>p.locator('.stage').getAttribute('data-surface');
    await strength.fill('0');await strength.press('Enter');await p.mouse.move(0,0);await p.waitForTimeout(350);let s=await p.locator('.stage').boundingBox();await p.mouse.move(s.x+s.width*.24,s.y+s.height*.52);await p.waitForTimeout(350);const zero=JSON.parse(await surface());
    await strength.fill('4');await strength.press('Enter');await p.mouse.move(0,0);await p.waitForTimeout(350);s=await p.locator('.stage').boundingBox();await p.mouse.move(s.x+s.width*.24,s.y+s.height*.52);await p.waitForTimeout(350);const four=JSON.parse(await surface());
    check(JSON.stringify(zero)!==JSON.stringify(four),'interaction strength changes live surface response',{zero,four});report.interaction={zero,four};
   }
  }finally{await context.close();}
 }
 if(engine==='webkit')report.limitations=['Windows WebKit port canvas resize / compositor retention issue prevents this port from certifying idle WebGL pixels. Reproduced in production 1.2.0 as well. Pixel-response assertions run in Chromium; WebKit checks controls, layout, focus and input only. Physical iOS acceptance remains separate.'];
 check(report.errors.length===0,'no page errors',report.errors);return report;
}
