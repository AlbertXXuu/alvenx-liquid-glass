async page => {
  await page.goto('http://127.0.0.1:5174/');
  return await page.evaluate(async () => {
    const current=await import('/src/backdropOptics.ts?speed='+Date.now());
    const original=await import('/scripts/fixtures/backdropOptics-1.1.0.ts?speed='+Date.now());
    const geometry=await import('/src/geometry.ts');
    const checks=[],check=(ok,name)=>{if(!ok)throw new Error(name);checks.push(name);};
    const pixel=async map=>{
      const image=await createImageBitmap(await(await fetch(map.href)).blob());
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const context=canvas.getContext('2d');context.drawImage(image,0,0);image.close();
      return context.getImageData(0,0,canvas.width,canvas.height).data;
    };
    const cases=[];
    for(const [width,height] of [[64,44],[42,42],[168,64],[320,76],[1,1],[1024,560]])for(const phase of [0,.37,.95]) {
      const scale=Math.max(3,Math.min(6,264/height));
      const shape={...geometry.contourShape(Math.max(.1,width*(.89+phase*.02)),Math.max(.1,height*(.82-phase*.035)),2.4+phase),x:width/2+phase,y:height/2-phase*.7};
      cases.push({path:geometry.shellPath(shape),width:width*scale,height:height*scale,camera:{x:width/2,y:height/2+8/scale,zoom:scale},light:{x:-450+phase*63,y:-350,z:950},version:cases.length});
    }
    cases.push({path:'M -120 -160 L 640 -160 L 640 620 L -120 620 Z',width:850,height:460,camera:{x:180,y:140,zoom:1.15},version:99});
    let seed=721396;
    const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    for(let index=0;index<32;index++){
      const width=16+random()*700,height=16+random()*200,scale=Math.max(3,Math.min(6,264/height));
      const shape={...geometry.contourShape(width*(.5+random()*.6),height*(.5+random()*.6),2.1+random()*2),x:width*(.3+random()*.5),y:height*(.3+random()*.5)};
      cases.push({path:geometry.shellPath(shape),width:width*scale,height:height*scale,camera:{x:width/2,y:height/2+8/scale,zoom:scale},light:{x:-200+random()*400,y:-500+random()*800,z:300+random()*1000},version:cases.length});
    }
    cases.push({path:'M 10000 10000 L 10001 10000 L 10001 10001 Z',width:500,height:300,camera:{x:0,y:0,zoom:1},version:99});
    const old=original.createBackdropOptics(),next=current.createBackdropOptics();
    for(let index=0;index<cases.length;index++)for(const channels of ['rgb','rg']) {
      const input={...cases[index],channels};
      const a=old.render(input),b=next.render(input),pa=await pixel(a),pb=await pixel(b);
      check(pa.length===pb.length&&pa.every((v,i)=>v===pb[i]),`${channels} exactdecodedbytes ${index}`);
      check(a.maskScale===b.maskScale&&a.mapCssWidth===b.mapCssWidth&&a.mapCssHeight===b.mapCssHeight,`${channels} dimensions ${index}`);
    }
    // Finite continuous deformations produce unique geometries, exceeding the
    // LRU capacity. Alternating order avoids giving only one module warm caches.
    const inputAt=(index,channels)=>{
      const phase=index*.1173,width=168,height=64,scale=264/height;
      const shape={...geometry.contourShape(width*(.9+.013*Math.sin(phase)),height*(.85+.021*Math.cos(phase*.79)),3.4),x:width/2+2.2*Math.sin(phase*.63),y:height/2+.8*Math.cos(phase*.71)};
      return {path:geometry.shellPath(shape),width:width*scale,height:height*scale,camera:{x:width/2,y:height/2+8/scale,zoom:scale},channels,version:index};
    };
    for(let index=0;index<20;index++){old.render(inputAt(index,'rg'));next.render(inputAt(index,'rg'));}
    const rounds=[];
    for(let round=0;round<7;round++) {
      const row={round};
      for(const [name,engine]of(round%2?[['current',next],['baseline',old]]:[['baseline',old],['current',next]])) {
        const samples=[],start=performance.now();
        for(let index=0;index<72;index++)samples.push(engine.render(inputAt(100+round*72+index,'rg')).computeMs);
        row[name]={elapsedMs:performance.now()-start,samples};
      }
      rounds.push(row);
    }
    const median=list=>[...list].sort((a,b)=>a-b)[Math.floor(list.length/2)],summary={};
    for(const name of ['baseline','current'])summary[name]={medianMapMs:median(rounds.flatMap(row=>row[name].samples)),medianRoundMeanMs:median(rounds.map(row=>row[name].elapsedMs/72))};
    const after=current.getBackdropOpticsDiagnostics();old.destroy();next.destroy();
    const released=current.getBackdropOpticsDiagnostics();
    check(released.owners===0&&released.workspaceBytes===0&&released.cacheEntries===0,'lastowner releasescolumnscratchandcache');
    return {status:'passed',checks,summary,relativeMapReduction:1-summary.current.medianMapMs/summary.baseline.medianMapMs,rounds,after,released,note:'Native Chrome Canvas; 7 alternating rounds of72 continuously unique RG maps after20warmup. Same path, raster resolution, kernels, rounding, PNG encoder. ExactdecodedRGB/RG compared to1.1.0 snapshot. Microbenchmark is not a presented-frame or fullUI guarantee.'};
  });
}
