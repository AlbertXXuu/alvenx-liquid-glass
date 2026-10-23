async page=>{

 const base=page.url(),out='output/playwright/entrance-local-response-20261023/built',browser=page.context().browser(),checks=[],metrics=[];
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(name+' '+JSON.stringify(detail));};
 for(const width of [320,393,1413]){
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:width<=393?852:1000}}),p=await c.newPage();await p.goto(base);await p.evaluate(()=>document.fonts.ready);
  const v=await p.locator('[data-volume-budding]').evaluate(h=>{const d=innerWidth<=360?44:54,a=h.querySelector('[data-prejs-budding]'),picture=h.querySelector('[data-first-frame="'+d+'"]'),img=picture.querySelector('img');return {enhanced:h.dataset.enhanced,slot:h.getBoundingClientRect().toJSON(),diameter:a.getBoundingClientRect().width,href:a.href,display:getComputedStyle(picture).display,imageReady:img.complete&&img.naturalWidth>0,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  check(`${width}: actual static native first frame without JavaScript`,v.enhanced==='false'&&v.imageReady&&v.display!=='none',v);check(`${width}: responsive first native target and working destination`,v.diameter===(width<=360?44:54)&&v.href===base.replace(/\/$/,'')+'/ui/'&&!v.overflow,v);
  await p.screenshot({path:`${out}/no-js-${width}.png`,scale:'css'});metrics.push({width,noJS:v});await c.close();
 }
 const make=async(mode)=>{
  const c=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'no-preference'}),p=await c.newPage();
  await p.addInitScript(mode=>{
   const proto=WebGLRenderingContext.prototype,getExt=proto.getExtension,getParam=proto.getProgramParameter,link=proto.linkProgram,states=new WeakMap(),audit=window.__startupAudit={calls:[],violations:[],deletes:0};
   proto.getExtension=function(name){if(mode==='no-khr'&&name==='KHR_parallel_shader_compile')return null;const e=getExt.call(this,name);if(name==='KHR_parallel_shader_compile'&&e)states.set(this,{extension:e,start:0,completed:false});return e;};
   proto.linkProgram=function(...args){const s=states.get(this);if(s)s.start=performance.now();return link.apply(this,args);};
   proto.getProgramParameter=function(program,param){const s=states.get(this),start=performance.now();
    if(s&&param===s.extension.COMPLETION_STATUS_KHR){audit.calls.push({type:'completion',at:start});if(mode==='never'||(mode==='pending'&&!window.__allowPendingDone)||(mode==='resume-complete'&&!window.__resumeProgramReady))return false;const value=getParam.call(this,program,param);s.completed=!!value;return value;}
    if(s&&param===this.LINK_STATUS&&!s.completed)audit.violations.push('LINK_STATUS before completion');
    const value=getParam.call(this,program,param);if(param===this.LINK_STATUS)audit.calls.push({type:'linkStatus',at:start,duration:performance.now()-start,painted:performance.getEntriesByType('paint').length>0});return value;
   };
   for(const name of ['getUniformLocation','getAttribLocation','drawArrays']){const original=proto[name];proto[name]=function(...args){const s=states.get(this);if(s&&!s.completed)audit.violations.push(name+' before completion');return original.apply(this,args);};}
   const del=proto.deleteProgram;proto.deleteProgram=function(...args){audit.deletes++;return del.apply(this,args);};
  },mode);return{c,p};
 };
 {
  const {c,p}=await make('pending');await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('canvas[data-volume-preparation=pending]');
  const native=await p.locator('[data-volume-budding]').evaluate(h=>({buttons:h.querySelectorAll('button').length,anchors:h.querySelectorAll('[data-prejs-budding]').length}));check('hydrated pending circle has one native action',native.buttons===1&&native.anchors===0,native);
  const start=await p.evaluate(()=>performance.now());await p.getByRole('button',{name:'Toggle explore link'}).focus();await p.keyboard.press('Space');await p.waitForFunction(()=>Number(document.querySelector('[data-volume-budding]').dataset.growth)>0);
  const first=await p.evaluate(()=>({at:performance.now(),preparation:document.querySelector('[data-volume-budding] canvas').dataset.volumePreparation}));check('Space starts real growth while compile remains pending',first.preparation==='pending'&&first.at-start<200,first);
  await p.waitForTimeout(80);await p.locator('.hero__discovery').first().screenshot({path:`${out}/forced-pending-growth.png`,scale:'css'});await p.evaluate(()=>window.__allowPendingDone=true);await p.waitForSelector('canvas[data-volume-preparation=ready]');await p.waitForTimeout(220);await p.locator('.hero__discovery').first().screenshot({path:`${out}/forced-pending-material.png`,scale:'css'});
  const audit=await p.evaluate(()=>window.__startupAudit),canvas=await p.locator('[data-volume-budding] canvas').evaluate(c=>({...c.dataset}));check('all reflection and draws wait for parallel completion',audit.violations.length===0,audit.violations);check('pending growth blends matching live material',canvas.volumeReveal==='blend'&&Number(canvas.volumeLightRenders)>0,canvas);metrics.push({forcedPending:{first,audit,canvas}});await c.close();
 }
 {
  const {c,p}=await make('never');await p.clock.install();await p.goto(base);await p.waitForSelector('canvas[data-volume-preparation=pending]');await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.clock.fastForward(11000);
  check('hidden wall time does not consume foreground preparation budget',await p.locator('[data-volume-budding] canvas').getAttribute('data-volume-preparation')==='pending');await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await p.clock.fastForward(10100);await p.waitForSelector('canvas[data-volume-preparation=failed]');
  const before=await p.evaluate(()=>window.__startupAudit.calls.length);await p.clock.fastForward(1000);const after=await p.evaluate(()=>window.__startupAudit.calls.length),audit=await p.evaluate(()=>window.__startupAudit);
  check('never-completing driver reaches bounded failure and releases program',audit.deletes>0&&before===after,{before,after,deletes:audit.deletes});await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'Toggle explore link'}).click();check('failed shader preserves native interaction',await p.locator('[data-volume-budding]').getAttribute('data-ready')==='true');metrics.push({never:{audit}});await c.close();
 }
 {
  const {c,p}=await make('resume-complete');await p.clock.install();await p.goto(base);await p.waitForSelector('canvas[data-volume-preparation=pending]');await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(300);await p.clock.fastForward(11000);await p.evaluate(()=>{window.__resumeProgramReady=true;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForSelector('canvas[data-volume-preparation=ready]');
  const audit=await p.evaluate(()=>window.__startupAudit);check('program completed across 11s hidden interval becomes ready on return',audit.deletes===0&&audit.violations.length===0,audit);metrics.push({hiddenResume:{simulatedHiddenMs:11000,audit,boundary:'Controlled document.hidden visibility event and browser clock; not physical OS background behavior.'}});await c.close();
 }
 {
  const {c,p}=await make('no-khr');await p.goto(base);await p.waitForSelector('canvas[data-volume-preparation=ready]');const audit=await p.evaluate(()=>window.__startupAudit),canvas=await p.locator('[data-volume-budding] canvas').evaluate(c=>({...c.dataset}));check('no-KHR keeps accepted live renderer after first observed paint',canvas.volumePreparationMode==='deferred-sync'&&canvas.volumeFallbackPaint==='observed'&&audit.calls.filter(c=>c.type==='linkStatus').every(c=>c.painted),{canvas,calls:audit.calls});metrics.push({noKHR:{canvas,audit}});await c.close();
 }
 {
  const c=await browser.newContext({viewport:{width:393,height:852}}),p=await c.newPage();let unblock;const gate=new Promise(r=>unblock=r);await c.route('**/_next/static/chunks/index-*.js',async route=>{await gate;await route.continue();});
  await p.addInitScript(()=>{window.__earlyTiming={};document.addEventListener('click',e=>{if(e.target.closest?.('[data-prejs-budding]'))window.__earlyTiming.activation=performance.now();},true);new MutationObserver(()=>{if(window.__earlyTiming.firstGrowth===undefined&&Number(document.querySelector('[data-volume-budding]')?.dataset.growth)>0)window.__earlyTiming.firstGrowth=performance.now();}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-growth']});});
  await p.goto(base,{waitUntil:'commit'});await p.waitForSelector('[data-prejs-budding]');await p.waitForFunction(()=>typeof window.__alvenxVolumeBuddingReleaseEarly==='function');await p.locator('[data-prejs-budding]').focus();await p.keyboard.press('Enter');check('pre-main native activation retains intent',await p.evaluate(()=>window.__alvenxVolumeBuddingIntent===true));await p.waitForTimeout(200);await p.evaluate(()=>window.__earlyTiming.mainReleased=performance.now());unblock();await p.waitForSelector('[data-enhanced=true] button');await p.waitForFunction(()=>Number(document.querySelector('[data-volume-budding]').dataset.growth)>0);metrics.push({preMain:{...await p.evaluate(()=>window.__earlyTiming),artificialModuleHoldMs:200,boundary:'Native link exists before main; after early controller loads, activation waits for the deliberately held main module. This does not measure zero-delay physics.'}});
  check('queued activation is consumed and early handlers removed',await p.evaluate(()=>window.__alvenxVolumeBuddingIntent===undefined&&window.__alvenxVolumeBuddingReleaseEarly===undefined));check('focused first frame hands focus to the single native button',await p.evaluate(()=>document.activeElement?.matches('[data-volume-budding] button')));await c.close();
 }
 {
  const c=await browser.newContext({viewport:{width:393,height:852}}),p=await c.newPage();await c.route('**/_next/static/chunks/index-*.js',r=>r.abort());await p.goto(base);await p.waitForFunction(()=>window.__alvenxVolumeBuddingReleaseEarly===undefined,null,{timeout:12000});
  check('main resource failure releases interception within the bounded startup deadline',await p.evaluate(()=>window.__alvenxVolumeBuddingReleaseEarly===undefined&&!!document.querySelector('[data-prejs-budding][href="/ui/"]')));await c.close();
 }
 return {base,createdAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,total:checks.length,checks,metrics,boundary:'No-JS first frame is exact static R7 texture over native backdrop. Pre-main activation is queued only after the tiny controller loads; no-JS/error retains a genuine destination link. Pending real growth uses native C2 optics until accepted GL can blend in; its temporary lower volume is retained in screenshots. No claim of zero network latency.'};
}


