// Serial Chromium native-touch probe, without hover before the first contact.
// It measures JS scheduling and DOM acknowledgement, not physical presentation.
async page=>{
 const browser=page.context().browser(),out={engine:browser.version(),url:'http://127.0.0.1:5174/mobile-review.html',mode:'registered scene refraction',physicalDevice:false,runs:[]};
 for(const width of [393,1180])for(let repeat=0;repeat<3;repeat++){
  const context=await browser.newContext({viewport:{width,height:width<600?844:900},hasTouch:true,deviceScaleFactor:1,isMobile:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.addInitScript(()=>{
    const a=window.__touchCold={active:false,down:0,events:[],press:[],progress:[],frames:[],encodes:[],blobSubmissions:[],fileReads:[]};
    const originalBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(...args){const start=performance.now();try{return originalBlob.apply(this,args);}finally{if(a.active)a.blobSubmissions.push(performance.now()-start);}};const originalRead=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(...args){const start=performance.now();try{return originalRead.apply(this,args);}finally{if(a.active)a.fileReads.push(performance.now()-start);}};const old=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(...args){const t=performance.now(),value=old.apply(this,args);if(a.active)a.encodes.push(performance.now()-t);return value;};
    for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture'])document.addEventListener(type,e=>{if(!a.active)return;if(type==='pointerdown')a.down=performance.now();a.events.push({type,pointerType:e.pointerType,id:e.pointerId,time:performance.now()});},true);
    new MutationObserver(list=>{if(a.active)for(const m of list){if(m.attributeName==='data-pressure'&&m.target.dataset.localGlass==='r3-sample-thumb')a.press.push({t:performance.now(),value:Number(m.target.dataset.pressure)});if(m.attributeName==='data-progress'&&m.target.querySelector?.('#range-r3-sample'))a.progress.push({t:performance.now(),value:Number(m.target.dataset.progress)});}}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-pressure','data-progress']});
    const tick=t=>{if(a.active)a.frames.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);
   });
   await p.goto(out.url);await p.evaluate(()=>document.fonts.ready);
   const slider=p.locator('#range-r3-sample'),thumb=p.locator('[data-local-glass="r3-sample-thumb"]');
   await slider.evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForFunction(()=>{const e=document.querySelector('[data-local-glass="r3-sample-thumb"]');return e.dataset.opticalMode==='scene'&&e.dataset.opticalReady==='true';});await p.waitForTimeout(650);
   await p.evaluate(async()=>{window.__getR3Optics=(await import('/src/backdropOptics.ts')).getBackdropOpticsDiagnostics;});
   const cdp=await context.newCDPSession(p),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(pt=>({...pt,id:1,radiusX:4,radiusY:4,force:1}))});
   const record={width,repeat,phases:[]};
   for(const phase of ['cold','warm']){
    const box=await thumb.boundingBox(),rail=await slider.boundingBox(),before=Number(await slider.inputValue()),x=box.x+box.width/2,y=box.y+box.height/2;
    const countersBefore=await p.evaluate(()=>window.__getR3Optics());
    await p.evaluate(()=>Object.assign(window.__touchCold,{active:true,down:0,events:[],press:[],progress:[],frames:[],encodes:[],blobSubmissions:[],fileReads:[]}));
    await touch('touchStart',[{x,y}]);await p.waitForTimeout(90);
    const target=rail.x+rail.width*(before>.5?.2:.8);for(let i=1;i<=15;i++){await touch('touchMove',[{x:x+(target-x)*i/15,y}]);await p.waitForTimeout(12);}
    await p.waitForTimeout(50);const held=Number(await slider.inputValue());await touch('touchEnd',[]);await p.waitForTimeout(180);
    const metrics=await p.evaluate(()=>{const a=window.__touchCold;a.active=false;const first=a.press.find(e=>e.value>0),gaps=a.frames.slice(1).map((v,i)=>v-a.frames[i]);return {pressureDOMMs:first?first.t-a.down:null,pressureUpdates:a.press.length,continuousProgress:a.progress,maxRAfGap:Math.max(0,...gaps),events:a.events,blobSubmissions:{count:a.blobSubmissions.length,total:a.blobSubmissions.reduce((sum,x)=>sum+x,0),max:Math.max(0,...a.blobSubmissions)},fileReads:{count:a.fileReads.length,total:a.fileReads.reduce((sum,x)=>sum+x,0),max:Math.max(0,...a.fileReads)},encodes:{count:a.encodes.length,total:a.encodes.reduce((sum,x)=>sum+x,0),max:Math.max(0,...a.encodes)}};});
    const countersAfter=await p.evaluate(()=>window.__getR3Optics());if(Math.abs(held-before)<.2)throw Error('Touch drag did not change the value continuously');if(!metrics.events.some(e=>e.type==='gotpointercapture'))throw Error('Touch did not capture');
    record.phases.push({phase,before,held,countersBefore,countersAfter,...metrics});await p.waitForTimeout(550);
   }
   record.errors=errors;if(errors.length)throw Error(errors.join(';'));out.runs.push(record);
  }finally{await context.close();}
 }
 return out;
}
