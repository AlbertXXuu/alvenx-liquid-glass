// Counts only: may run during a build. No CPU or frame timing is measured.
async page=>{
 const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1180,height:900}}),p=await context.newPage();
 try{
  await p.addInitScript(()=>{window.__encoder={active:false,sync:0,async:0};const old=HTMLCanvasElement.prototype.toDataURL,blob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toDataURL=function(...args){if(window.__encoder.active)window.__encoder.sync++;return old.apply(this,args);};HTMLCanvasElement.prototype.toBlob=function(...args){if(window.__encoder.active)window.__encoder.async++;return blob.apply(this,args);};});
  await p.goto('http://127.0.0.1:5174/mobile-review.html');await p.evaluate(()=>document.fonts.ready);const slider=p.locator('#range-r3-sample'),thumb=p.locator('[data-local-glass="r3-sample-thumb"]');await slider.evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForFunction(()=>{const e=document.querySelector('[data-local-glass="r3-sample-thumb"]');return e.dataset.opticalMode==='scene'&&e.dataset.opticalReady==='true';});await p.waitForTimeout(300);
  const t=await thumb.boundingBox(),r=await slider.boundingBox();await p.evaluate(()=>window.__encoder.active=true);await p.mouse.move(t.x+t.width/2,t.y+t.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width*.85,t.y+t.height/2,{steps:20});await p.mouse.up();await p.waitForTimeout(150);
  const out=await p.evaluate(()=>{window.__encoder.active=false;return {syncDataURLCalls:window.__encoder.sync,asyncToBlobCalls:window.__encoder.async,value:Number(document.querySelector('#range-r3-sample').value),mode:document.querySelector('[data-local-glass="r3-sample-thumb"]').dataset.opticalMode};});
  if(out.syncDataURLCalls!==0||out.asyncToBlobCalls<1||out.value<.7)throw Error(JSON.stringify(out));return {status:'passed',physicalDevice:false,countsOnly:true,engine:browser.version(),...out};
 }finally{await context.close();}
}
