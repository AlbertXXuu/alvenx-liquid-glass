// Run through playwright-cli run-code. These are Windows browser-engine probes,
// not iOS/Safari/Combo Touch hardware measurements. The first pointerdown is
// delivered after an 80ms mouse hover, then the same gesture repeats warm.
async page => {
  const browser=page.context().browser(),base='http://127.0.0.1:5174/mobile-review.html';
  const out={engine:browser.version(),base,physicalDevice:false,method:'Fresh hybrid touch-enabled browser contexts; cold/warm trusted mouse drags. DOM mutation latency is not presented-frame latency.',runs:[]};
  for(const width of [393,1180])for(let repeat=0;repeat<3;repeat++){
    const context=await browser.newContext({viewport:{width,height:width<600?844:900},hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15'});
    const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    try{
      await p.addInitScript(()=>{
        const a=window.__r3={active:false,down:0,frames:[],events:[],mutations:[],api:[],long:[],longSupported:PerformanceObserver.supportedEntryTypes?.includes('longtask')??false};
        if(a.longSupported)new PerformanceObserver(l=>{if(a.active)for(const e of l.getEntries())a.long.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask'});
        for(const [prototype,key] of [[HTMLElement.prototype,'focus'],[Element.prototype,'setPointerCapture'],[Element.prototype,'getBoundingClientRect']]){
          const fn=prototype[key];prototype[key]=function(...args){const t=performance.now();try{return fn.apply(this,args);}finally{if(a.active)a.api.push({name:key,ms:performance.now()-t,tag:this.tagName,id:this.id});}};
        }
        for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture']){
          document.addEventListener(type,e=>{if(!a.active)return;if(type==='pointerdown')a.down=performance.now();a.events.push({type,t:performance.now(),target:e.target.id||e.target.tagName,pointerType:e.pointerType,pointerId:e.pointerId,buttons:e.buttons,isPrimary:e.isPrimary});},true);
        }
        new MutationObserver(list=>{if(a.active)for(const m of list){const e=m.target;if(e.dataset.localGlass==='r3-sample-thumb'&&m.attributeName==='data-pressure')a.mutations.push({t:performance.now(),name:'pressure',value:Number(e.dataset.pressure)});if(e.classList.contains('range-rail')&&m.attributeName==='data-progress')a.mutations.push({t:performance.now(),name:'progress',value:Number(e.dataset.progress)});}}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-pressure','data-progress']});
        const tick=t=>{if(a.active)a.frames.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);
      });
      await p.goto(base,{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);
      const slider=p.locator('#range-r3-sample'),thumb=p.locator('[data-local-glass="r3-sample-thumb"]');
      await slider.evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForFunction(()=>{const e=document.querySelector('[data-local-glass="r3-sample-thumb"]');return e.dataset.opticalMode==='scene'&&e.dataset.opticalReady==='true';});await p.waitForTimeout(650);
      const record={width,repeat,phases:[]};
      for(const phase of ['cold','warm']){
        const box=await thumb.boundingBox(),rail=await slider.boundingBox();
        const x=box.x+box.width/2,y=box.y+box.height/2;
        // CDP mouse coordinates can be positioned without DOM hover dispatch;
        // WebKit has no equivalent; move first but isolate the pointerdown.
        await p.mouse.move(x,y);await p.waitForTimeout(80);
        await p.evaluate(()=>Object.assign(window.__r3,{active:true,down:0,frames:[],events:[],mutations:[],api:[],long:[]}));
        const before=Number(await slider.inputValue());
        await p.mouse.down();await p.waitForTimeout(90);
        const target=rail.x+rail.width*(before>.5?.15:.85);
        await p.mouse.move(target,y,{steps:20});await p.waitForTimeout(60);
        const held=Number(await slider.inputValue());await p.mouse.up();await p.waitForTimeout(180);
        const metrics=await p.evaluate(()=>{const a=window.__r3;a.active=false;const gaps=a.frames.slice(1).map((v,i)=>v-a.frames[i]),first=a.mutations.find(m=>m.name==='pressure'&&m.value>0);return {pressDOMLatency:first?first.t-a.down:null,maxRAfGap:Math.max(0,...gaps),over34:gaps.filter(v=>v>34).length,longSupported:a.longSupported,long:a.long,api:a.api,events:a.events};});
        const selection=await p.evaluate(()=>getSelection().toString());
        if(Math.abs(held-before)<.1)throw Error('hybrid mouse drag did not change the slider');
        if(selection)throw Error('drag accidentally selected text');
        record.phases.push({phase,before,held,selection,...metrics});await p.mouse.move(1,1);await p.waitForTimeout(550);
      }
      record.errors=errors;if(errors.length)throw Error(errors.join(';'));out.runs.push(record);
    }finally{await context.close();}
  }
  return out;
}
