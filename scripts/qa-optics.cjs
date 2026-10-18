async page => {
  await page.goto('http://127.0.0.1:5174/');
  return await page.evaluate(async () => {
    // A distinct module instance keeps the test's ownership/cache isolated from
    // the showcase. Run via playwright-cli in a separate browser session.
    const module = await import('/src/backdropOptics.ts?optics-regression=' + Date.now());
    const baseline = await import('/docs/baseline/v6/shared/src/ui/backdropOptics.ts');
    const geometry = await import('/src/geometry.ts');
    const checks = [], fail = message => { throw new Error(message); };
    const check = (condition, name) => { if (!condition) fail(name); checks.push(name); };
    const pixels = async result => {
      const bitmap = await createImageBitmap(await (await fetch(result.href)).blob());
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); bitmap.close();
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const cases = [];
    for (const [width, height] of [[64,44],[42,42],[168,64],[320,76]]) {
      const scale = Math.max(3, Math.min(6, 264 / height));
      for (const deformation of [0, .37, .95]) {
        const shape = { ...geometry.contourShape(width * (.89 + deformation * .02), height * (.82 - deformation * .035), 2.4 + deformation), x: width/2 + deformation, y: height/2 - deformation*.7 };
        cases.push({ path: geometry.shellPath(shape), width: width*scale, height: height*scale,
          camera: { x: width/2, y: height/2+8/scale, zoom:scale }, light: {x:-450+deformation*63,y:-350,z:950}, version:cases.length });
      }
    }
    cases.push({path:'M -120 -160 L 640 -160 L 640 620 L -120 620 Z',width:850,height:460,camera:{x:180,y:140,zoom:1.15},version:99});
    const engines = [], timings = [];
    for (let index=0; index<cases.length; index++) {
      const original = baseline.createBackdropOptics(), current = module.createBackdropOptics(); engines.push(current);
      const before = original.render(cases[index]), after = current.render(cases[index]);
      const a = await pixels(before), b = await pixels(after);
      check(a.length === b.length && a.every((value,i)=>value===b[i]), `RGB pixel equality ${index}`);
      check(before.maskScale===after.maskScale && before.mapCssWidth===after.mapCssWidth && before.mapCssHeight===after.mapCssHeight,`map dimensions ${index}`);
      const rg = current.render({...cases[index],channels:'rg',version:100+index});
      const c = await pixels(rg);
      check(a.length===c.length && a.every((value,i)=>i%4===2 ? c[i]===0 : value===c[i]),`RG displacement/alpha equality ${index}`);
      timings.push({case:index,baselineMs:before.computeMs,rgbMs:after.computeMs,rgMs:rg.computeMs});
      original.destroy();
    }
    const first=module.createBackdropOptics(), second=module.createBackdropOptics(); engines.push(first,second);
    const input={...cases[0],path:cases[0].path+' ',channels:'rg',version:101};
    first.render(input); const count=module.getBackdropOpticsDiagnostics().encodes;
    const shared=second.render({...input,version:102,light:{x:99,y:20,z:45}});
    check(shared.version===102 && shared.computeMs===0 && module.getBackdropOpticsDiagnostics().encodes===count,'same geometry across controls reuses one encoded PNG');
    first.render({...input,version:103});
    check(module.getBackdropOpticsDiagnostics().encodes===count,'local previous result avoids PNG encoding');
    for(let index=0;index<90;index++)first.render({...input,path:input.path+' '.repeat(index+2),version:104+index});
    const bounded=module.getBackdropOpticsDiagnostics();
    check(bounded.cacheEntries<=bounded.maxCacheEntries && bounded.cacheBytes<=bounded.maxCacheBytes,'cross-control cache stays within entry and byte budgets');
    check(bounded.workspaceBytes<=498*434*3*4,'all instances share bounded three-buffer workspace');
    for(const engine of engines)engine.destroy(); first.destroy();
    const released=module.getBackdropOpticsDiagnostics();
    check(released.owners===0 && released.workspaceBytes===0 && released.cacheBytes===0 && released.cacheEntries===0,'last destroy releases scratch/canvas cache; repeated destroy is safe');
    const population=Array.from({length:32},()=>module.createBackdropOptics());
    const beforePopulation=module.getBackdropOpticsDiagnostics();
    for(const engine of population)engine.render({...cases[0],channels:'rg'});
    const populated=module.getBackdropOpticsDiagnostics();
    const shared32={instances:32,encodes:populated.encodes-beforePopulation.encodes,workspaceBytes:populated.workspaceBytes,cacheBytes:populated.cacheBytes,baselineFloat32BytesPerInstance:466*406*4*4,baselineFloat32BytesFor32:466*406*4*4*32};
    check(shared32.encodes===1,'32 identical mounted lenses encode their exact normal once');
    check(shared32.workspaceBytes===466*406*3*4+466*8,'32 mounted lenses retain shared buffers plus bounded Float64 column sums');
    for(const engine of population)engine.destroy();
    check(module.getBackdropOpticsDiagnostics().owners===0 && module.getBackdropOpticsDiagnostics().workspaceBytes===0,'32-owner unmount releases shared workspace');
    const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
    return {status:'passed',checks,timings,medianMs:{baseline:median(timings.map(x=>x.baselineMs)),rgb:median(timings.map(x=>x.rgbMs)),rg:median(timings.map(x=>x.rgMs))},bounded,released,shared32,
      note:'Native canvas decoded image bytes compared with frozen v6. Timings are a single short run; not stable FPS or device-general performance guarantees.'};
  });
}
