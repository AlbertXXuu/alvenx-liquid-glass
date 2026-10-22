async page=>{
 const configured=await page.evaluate(()=>{const u=new URL(location.href),baseline=u.searchParams.get('baseline');u.searchParams.delete('baseline');return{candidate:u.href,baseline};}),baseline=configured.baseline;
 if(!baseline||!/^https?:/.test(baseline))throw Error('Open the R6 page with ?baseline=<encoded immutable R5 URL>.');
 const candidate=configured.candidate,browser=page.context().browser(),results=[];
 const scenarios=[{name:'desktop',width:1413,height:1000,cpu:1,latency:0,down:0},{name:'phone-constrained',width:393,height:852,cpu:4,latency:150,down:200000}];
 for(const scenario of scenarios)for(let pair=0;pair<3;pair++)for(const version of pair===1?['R6','R5']:['R5','R6']){
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},deviceScaleFactor:1,reducedMotion:'no-preference'}),p=await context.newPage(),cdp=await context.newCDPSession(p);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:scenario.cpu});
  if(scenario.down)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:scenario.latency,downloadThroughput:scenario.down,uploadThroughput:93750,connectionType:'cellular4g'});
  await p.addInitScript(()=>{
   const s=window.__pairedLatency={marks:{},clicks:{first:{},warm:{}},phase:'first',gl:[],longtasks:[],errors:[]},mark=k=>{if(s.marks[k]===undefined)s.marks[k]=performance.now();};
   new PerformanceObserver(l=>{for(const e of l.getEntries())s.longtasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
   const note=()=>{
    const root=document.getElementById('root'),h=document.querySelector('[data-review-bud]');if(root?.firstElementChild)mark('rootDOM');if(!h)return;mark('motherDOM');
    const d=innerWidth<=360?44:54,img=h.querySelector('[data-first-frame="'+d+'"] img'),canvas=h.querySelector('canvas'),native=h.querySelector('[data-local-glass]');
    if(native?.getAttribute('data-optical-ready')==='true')mark('opticsReady');if(canvas?.dataset.volumePreparation==='ready')mark('engineReady');
    if(Number(canvas?.dataset.volumeLightRenders)>0)mark('liveMaterialDraw');
    if(s.marks.acceptedFrameSubmitted===undefined){let kind;if(img?.complete&&img.naturalWidth&&getComputedStyle(img.parentElement).display!=='none')kind='exact-static-texture';else if(Number(canvas?.dataset.volumeLightRenders)>0)kind='live-material-draw';if(kind){s.firstAcceptedKind=kind;mark('acceptedFrameSubmitted');requestAnimationFrame(()=>requestAnimationFrame(()=>mark('acceptedFramePaintOpportunity')));}}
    const c=s.clicks[s.phase];if(c.pointerdown!==undefined&&Number(h.dataset.growth)>0&&c.firstGrowth===undefined){c.firstGrowth=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>c.paintOpportunity=performance.now()));}
   };
   new MutationObserver(note).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['d','data-growth','data-optical-ready','data-volume-light-renders','data-volume-preparation']});document.addEventListener('load',note,true);
   addEventListener('error',e=>s.errors.push(String(e.message)));for(const type of ['pointerdown','click'])document.addEventListener(type,e=>{if(e.target.closest?.('button')?.getAttribute('aria-label')==='Grow refinement-proposal'){const c=s.clicks[s.phase];if(c[type]===undefined)c[type]=performance.now();}},true);
   const proto=WebGLRenderingContext.prototype,names=new WeakMap(),growths=new WeakMap(),loc=proto.getUniformLocation,u=proto.uniform1f,draw=proto.drawArrays;
   proto.getUniformLocation=function(program,name){const r=loc.call(this,program,name);if(r)names.set(r,name);return r;};proto.uniform1f=function(location,value){if(location&&names.get(location)==='u_growth')growths.set(this,value);return u.call(this,location,value);};
   for(const method of ['compileShader','linkProgram','getProgramParameter','getShaderParameter']){const old=proto[method];proto[method]=function(...args){const t=performance.now(),r=old.apply(this,args);s.gl.push({method,start:t,duration:performance.now()-t,param:method==='getProgramParameter'?args[1]:undefined});return r;};}
   proto.drawArrays=function(...args){const r=draw.apply(this,args);if(this.canvas.classList.contains('refinement-volume-light')){const c=s.clicks[s.phase];if(c.pointerdown!==undefined&&growths.get(this)>0&&c.firstMaterial===undefined)c.firstMaterial=performance.now();}return r;};
  });
  const url=version==='R5'?baseline:candidate;await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>{const h=document.querySelector('[data-review-bud]');return h?.querySelector('button')&&h.querySelector('[data-local-glass]')?.getAttribute('data-optical-ready')==='true'&&Number(h.querySelector('canvas')?.dataset.volumeLightRenders)>0;});
  await p.getByRole('button',{name:'Grow refinement-proposal'}).click();await p.waitForFunction(()=>document.querySelector('[data-review-bud]')?.dataset.ready==='true');
  await p.mouse.click(1,1);await p.waitForFunction(()=>document.querySelector('[data-review-bud]')?.dataset.growth==='0.00000');await p.waitForTimeout(100);await p.evaluate(()=>window.__pairedLatency.phase='warm');await p.getByRole('button',{name:'Grow refinement-proposal'}).click();await p.waitForFunction(()=>window.__pairedLatency.clicks.warm.paintOpportunity!==undefined);await p.waitForTimeout(100);
  const result=await p.evaluate(()=>{const s=window.__pairedLatency,n=performance.getEntriesByType('navigation')[0];s.navigation={ttfb:n.responseStart,htmlEnd:n.responseEnd,encoded:n.encodedBodySize,decoded:n.decodedBodySize};s.paints=performance.getEntriesByType('paint').map(e=>({name:e.name,start:e.startTime}));s.resources=performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').at(-1),type:e.initiatorType,start:e.startTime,end:e.responseEnd,transfer:e.transferSize,encoded:e.encodedBodySize,decoded:e.decodedBodySize}));return s;});
  Object.assign(result,{version,url,pair:pair+1,scenario:scenario.name,conditions:scenario,sequence:results.length+1});results.push(result);await page.evaluate(r=>(window.__pairedResults??=[]).push(r),result);await context.close();
 }
 return{baseline,candidate,createdAt:new Date().toISOString(),protocol:'Three paired samples per condition, order R5/R6, R6/R5, R5/R6. Fresh contexts and HTTP cache disabled. Same own Chromium process. HTTP cold does not guarantee cold GPU/driver shader cache. Accepted static texture timing and live material draw are separate. Double-rAF is a paint opportunity, not GPU completion. First and warm input occur after live optics/material readiness; pre-main activation is covered separately by startup/gesture callbacks.',results};
}
