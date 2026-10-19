// Playwright CLI callback; real Canvas/PNG decoders exercise the optional
// asynchronous path. Not a physical iOS/Safari or presented-frame benchmark.
async page=>{
 const browser=page.context().browser(),context=await browser.newContext(),p=await context.newPage();
 try{
  await p.goto('http://127.0.0.1:5174/scripts/fixtures/async-optics-browser.html');
  return await p.evaluate(async()=>{
   const {createBackdropOptics,getBackdropOpticsDiagnostics:stats}=await import('/src/backdropOptics.ts');
   const {contourShape,shellPath}=await import('/src/geometry.ts');
   const checks=[],assert=(ok,name,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));};
   const decode=href=>new Promise((resolve,reject)=>{const image=new Image();image.onerror=reject;image.onload=()=>{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);resolve({width:c.width,height:c.height,pixels:Array.from(ctx.getImageData(0,0,c.width,c.height).data)});};image.src=href;});
   const inputs=Array.from({length:16},(_,i)=>{
    const w=56+i*8.37,h=30+(i%5)*9.23,zoom=3+(i%3)*1.5;
    const shape={...contourShape(w-12,h-8,2.4),x:w/2+(i%3-1)*.371,y:h/2+(i%5-2)*.217};
    return {path:shellPath(shape),width:w*zoom,height:h*zoom,camera:{x:w/2,y:h/2+8/zoom,zoom},light:{x:-43+i*2.1,y:-92,z:620},channels:i%2?'rg':'rgb',version:i};
   });
   const sync=createBackdropOptics(),expected=[];
   for(const input of inputs)expected.push(await decode(sync.render(input).href));
   sync.destroy();assert(stats().cacheEntries===0,'isolated sync owner cleanup clears its cache');
   let syncEncodes=0;const originalURL=HTMLCanvasElement.prototype.toDataURL;
   HTMLCanvasElement.prototype.toDataURL=function(...args){syncEncodes++;return originalURL.apply(this,args);};
   const a=createBackdropOptics(),b=createBackdropOptics(),before=stats();
   try{
    for(let i=0;i<inputs.length;i+=2){
     // Both fields overwrite the one shared map canvas before native encoder
     // callbacks resolve. This detects cross-request bitmap corruption.
     const pending=[a.renderAsync(inputs[i]),b.renderAsync(inputs[i+1])];
     assert(stats().activeAsyncJobs<=2,'native encoder concurrency is bounded '+i);
     const result=await Promise.all(pending);
     for(let j=0;j<2;j++){
      const actual=await decode(result[j].href),e=expected[i+j];
      assert(actual.width===e.width&&actual.height===e.height,'async map dimensions match sync '+(i+j));
      assert(actual.pixels.length===e.pixels.length&&actual.pixels.every((v,k)=>v===e.pixels[k]),'decoded RGBA is byte exact after shared-canvas overwrite '+(i+j));
     }
    }
    assert(syncEncodes===0,'async requests never call synchronous toDataURL',syncEncodes);
    assert(stats().asyncEncodes-before.asyncEncodes===inputs.length,'each uncached map encodes once without duplicate field calculation');
    const count=stats().computations,hit=await a.renderAsync({...inputs[inputs.length-1],version:999});
    assert(hit.version===999&&hit.computeMs===0&&stats().computations===count,'shared async cache reuses exact map with fresh version');
   }finally{a.destroy();b.destroy();HTMLCanvasElement.prototype.toDataURL=originalURL;}

   // Hold real native encoder callbacks to test a saturated queue deterministically.
   const originalBlob=HTMLCanvasElement.prototype.toBlob,held=[];
   HTMLCanvasElement.prototype.toBlob=function(callback,...args){return originalBlob.call(this,blob=>held.push(()=>callback(blob)),...args);};
   const one=createBackdropOptics(),two=createBackdropOptics(),latest=createBackdropOptics(),cancelled=createBackdropOptics();
   const wait=async condition=>{const start=performance.now();while(!condition()){if(performance.now()-start>5000)throw Error('native encoding did not finish');await new Promise(r=>setTimeout(r,1));}};
   const settled=promise=>promise.then(value=>({status:'fulfilled',value}),error=>({status:'rejected',name:error.name}));
   try{
    const first=settled(one.renderAsync({...inputs[0],version:101})),second=settled(two.renderAsync({...inputs[1],version:102}));
    const old=settled(latest.renderAsync({...inputs[2],version:103}));let newest=settled(latest.renderAsync({...inputs[3],version:104}));
    const abandoned=settled(cancelled.renderAsync({...inputs[4],version:105}));cancelled.destroy();
    assert((await old).name==='AbortError','superseded queued map rejects before doing pixel work');
    assert((await abandoned).name==='AbortError','destroy removes a queued map before doing pixel work');
    latest.cancelPending();assert((await newest).name==='AbortError','cancelPending drops queued offscreen work');
    newest=settled(latest.renderAsync({...inputs[3],version:106}));two.cancelPending();
    assert(stats().activeAsyncJobs===2&&stats().queuedAsyncJobs===1,'global work stays at two active plus one latest queued map',stats());
    await wait(()=>held.length===2);one.destroy();held.splice(0).forEach(f=>f());
    const firstResult=await first,secondResult=await second;
    assert(firstResult.name==='AbortError'&&secondResult.status==='fulfilled','destroy guards stale results while cancelPending preserves active work');
    await wait(()=>held.length===1);held.splice(0).forEach(f=>f());
    const final=await newest;assert(final.status==='fulfilled'&&final.value.version===106,'latest queued frame eventually completes');
   }finally{one.destroy();two.destroy();latest.destroy();cancelled.destroy();HTMLCanvasElement.prototype.toBlob=originalBlob;}
   const pressure=createBackdropOptics();
   try{
    for(let i=0;i<64;i++){
     await pressure.renderAsync({...inputs[7],camera:{...inputs[7].camera,x:inputs[7].camera.x+i*.1237},version:200+i});
     const current=stats();assert(current.cacheEntries<=current.maxCacheEntries&&current.cacheBytes<=current.maxCacheBytes,'async LRU stays within entry and byte budgets '+i);
    }
    assert(stats().cacheEntries<64,'async LRU actually evicts old maps');
   }finally{pressure.destroy();}
   HTMLCanvasElement.prototype.toBlob=function(callback){queueMicrotask(()=>callback(null));};
   const failing=createBackdropOptics();
   try{
    const failed=await settled(failing.renderAsync({...inputs[0],version:400}));
    assert(failed.status==='rejected','native null PNG failure rejects instead of hanging');
   }finally{failing.destroy();HTMLCanvasElement.prototype.toBlob=originalBlob;}
   await new Promise(r=>setTimeout(r,0));
   const released=stats();assert(released.owners===0&&released.cacheEntries===0&&released.cacheBytes===0&&released.workspaceBytes===0&&released.queuedAsyncJobs===0&&released.activeAsyncJobs===0,'last-owner cleanup releases cache, buffers and queued jobs',released);
   return {physicalDevice:false,status:'passed',checks,released};
  });
 }finally{await context.close();}
}
