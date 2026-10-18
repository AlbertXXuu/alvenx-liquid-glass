// Open a production build, then run this callback via playwright-cli.
// This measures one fixed 180-point/6s pointer trajectory, not displayed FPS.
async page => {
  const scenario = 'SCENARIO';
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const client = await page.context().newCDPSession(page);
  const browser = await page.context().browser().newBrowserCDPSession();
  await page.setViewportSize({width:1364,height:1100});
  await client.send('Emulation.setDeviceMetricsOverride',{width:1364,height:1100,deviceScaleFactor:1,mobile:false});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Reset defaults',exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);
  const locator = scenario === 'drag' ? page.getByRole('slider',{name:'Explore the endpoint',exact:true}) : page.locator('[data-local-glass="idea"]');
  await locator.scrollIntoViewIfNeeded(); await page.mouse.move(0,0); await page.waitForTimeout(1000);
  const box = await locator.boundingBox(); if(!box) throw Error('Missing target');
  await page.evaluate(()=>{
    if(window.__hoverMeasure) return;
    const p=window.__hoverMeasure={active:false,raf:[],draw:[],rects:0,pngs:0,readbacks:0,long:[]};
    const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{if(p.active)p.raf.push(time);return callback(time);});
    const draw=WebGLRenderingContext.prototype.drawArrays;WebGLRenderingContext.prototype.drawArrays=function(...args){if(p.active)p.draw.push(performance.now());return draw.apply(this,args);};
    const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(...args){if(p.active)p.rects++;return rect.apply(this,args);};
    const png=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(...args){if(p.active)p.pngs++;return png.apply(this,args);};
    const read=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(...args){if(p.active)p.readbacks++;return read.apply(this,args);};
    new PerformanceObserver(list=>{if(p.active)p.long.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask'});
  });
  await client.send('Performance.enable');
  const metrics=result=>Object.fromEntries(result.metrics.map(x=>[x.name,x.value]));
  const before=metrics(await client.send('Performance.getMetrics'));
  const beforeCPU=(await browser.send('SystemInfo.getProcessInfo')).processInfo;
  if(scenario==='drag'){await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();}
  const start=await page.evaluate(()=>{Object.assign(window.__hoverMeasure,{active:true,raf:[],draw:[],rects:0,pngs:0,readbacks:0,long:[]});return Date.now();});
  const input=[];
  for(let index=0;index<180;index++){
    const t=index/30;
    const x=box.x+box.width*(.5+(scenario==='drag'?.34:.38)*Math.sin(t*3));
    const y=box.y+box.height*(scenario==='drag'?.5:.5+.32*Math.cos(t*2));
    await page.mouse.move(x,y);input.push({index,time:Date.now()-start,x,y});
    const remaining=start+(index+1)*1000/30-Date.now(); if(remaining>0)await page.waitForTimeout(remaining);
  }
  if(scenario==='drag')await page.mouse.up();
  const end=await page.evaluate(()=>{window.__hoverMeasure.active=false;return Date.now();});
  const after=metrics(await client.send('Performance.getMetrics'));
  const afterCPU=(await browser.send('SystemInfo.getProcessInfo')).processInfo;
  const data=await page.evaluate(()=>({...window.__hoverMeasure,units:document.querySelectorAll('.liquid-unit').length,canvas:(()=>{const c=document.querySelector('canvas.volume-canvas');return{width:c.width,height:c.height};})()}));
  await client.send('HeapProfiler.collectGarbage');const heap=await client.send('Runtime.getHeapUsage');
  const seconds=(end-start)/1000;
  const cpuSeconds=afterCPU.reduce((sum,p)=>sum+Math.max(0,p.cpuTime-(beforeCPU.find(old=>old.id===p.id)?.cpuTime??p.cpuTime)),0);
  const percentile=(values,q)=>{const a=[...values].sort((x,y)=>x-y);return a.length?a[Math.min(a.length-1,Math.floor(a.length*q))]:null;};
  const gaps=data.draw.slice(1).map((time,index)=>time-data.draw[index]);
  return {scenario,origin:page.url(),seconds,actions:input.length,mainThreadBusyPercent:(after.TaskDuration-before.TaskDuration)/seconds*100,scriptBusyPercent:(after.ScriptDuration-before.ScriptDuration)/seconds*100,cpuEquivalentCorePercent:cpuSeconds/seconds*100,canvasUpdatesPerSecond:data.draw.length/seconds,canvasGapP95:percentile(gaps,.95),rectReads:data.rects,pngEncodes:data.pngs,normalReadbacks:data.readbacks,longTasks:data.long.length,longestTask:Math.max(0,...data.long),heap,canvas:data.canvas,units:data.units,input,errors,processes:afterCPU.map(({id,type})=>({id,type})),browser:await page.context().browser().version(),method:'Production build; fixed 180 control-relative pointer coordinates over ~6s; all 180 inputs delivered, timing recorded; main-thread TaskDuration CDP, not CPU/GPU utilization; canvas submissions are not presented FPS.'};
}
