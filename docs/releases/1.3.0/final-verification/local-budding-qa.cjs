async (page) => {
  const out = 'output/playwright/budding-entry-2026-10-19';
  const engine = page.context().browser().browserType().name();
  const results = [], errors = [], consoles = [], timelines=[];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (['error','warning'].includes(message.type())) consoles.push({ type:message.type(), text:message.text() }); });
  const check = (condition, label, details) => { results.push({pass:!!condition,label,details}); };
  const info = async () => page.evaluate(() => {
    const el = document.querySelector('[data-budding-link]');
    const trigger = el?.querySelector('.glass-budding-trigger');
    const dest = el?.querySelector('.glass-budding-destination');
    const github = document.querySelector('.hero__discovery .text-link');
    const work = document.querySelector('.hero__actions .liquid-button');
    const rect = x => { const r=x?.getBoundingClientRect(); return r ? {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom} : null; };
    const body=el?.querySelector('[data-local-glass]');
    const triggerRect=rect(trigger);
    const ds = [...(body?.querySelectorAll('.local-shadow path,.local-edge path') || [])].map(x=>x.getAttribute('d'));
    return {width:innerWidth, scrollWidth:document.documentElement.scrollWidth, host:rect(el), trigger:triggerRect, center:triggerRect ? triggerRect.x+triggerRect.width/2:null,
      github:rect(github), work:rect(work), growth:Number(el?.dataset.growth), ready:el?.dataset.ready, expanded:el?.dataset.expanded,
      text:el?.textContent, href:dest?.getAttribute('href'), inert:dest?.inert, ariaHidden:dest?.getAttribute('aria-hidden'),
      bodies:el?.querySelectorAll('[data-local-glass]').length, backdrop:el?.querySelectorAll('.local-backdrop').length,
      opticalMode:body?.dataset.opticalMode, opticalReady:body?.dataset.opticalReady, geometryVersion:body?.dataset.geometryVersion,
      pathsIdentical:ds.length>0&&new Set(ds).size===1, focus:document.activeElement?.className,
      focusOutline:body?.querySelector('[data-focus-outline="true"]')!==null,
      headline:document.querySelector('.hero__title')?.textContent,
      overlays:[...el.querySelectorAll('*')].filter(x => !['svg','defs','linearGradient','stop','filter','feImage','feGaussianBlur','feDisplacementMap','feComposite','feMorphology','feSpecularLighting','fePointLight','feComponentTransfer','feFuncA','feDiffuseLighting','feColorMatrix','feFlood','feMerge','feMergeNode','feOffset','path'].includes(x.tagName)).map(x=>({tag:x.tagName,cls:x.className,background:getComputedStyle(x).backgroundImage}))};
  });
  for (const width of [320,393,640,641,768,1366]) {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto('http://localhost:5187/',{waitUntil:'domcontentloaded'});
    await page.locator('[data-budding-link] [data-optical-ready="true"]').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.glass-budding-trigger').scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    const start=await info();
    check(start.expanded==='false'&&start.growth===0,`${width}: initial mother at rest`,start);
    check(start.text==='',`${width}: initial mother visibly textless`,start.text);
    check(start.bodies===1&&start.backdrop===1&&start.pathsIdentical,`${width}: one shared optical contour`,start);
    check(start.scrollWidth<=width+1,`${width}: no initial horizontal overflow`,start.scrollWidth);
    check(start.trigger.width>=44&&start.trigger.height>=44,`${width}: mother native target at least44px`,start.trigger);
    check(start.github.x>start.host.right-1,`${width}: GitHub initially to the right`,{host:start.host,github:start.github});
    if ([393,768,1366].includes(width)) await page.screenshot({path:`${out}/${engine}-${width}-start.png`,fullPage:false});
    const timeline=page.evaluate(async()=>{
      const rows=[], interval=[], longTasks=[];
      const read=()=>{const e=document.querySelector('[data-budding-link]'), t=e.querySelector('button').getBoundingClientRect(),g=document.querySelector('.hero__discovery .text-link').getBoundingClientRect(),r=e.getBoundingClientRect();return{time:performance.now(),growth:Number(e.dataset.growth),ready:e.dataset.ready,width:r.width,x:r.x,y:r.y,center:t.x+t.width/2,githubX:g.x,githubY:g.y,inert:e.querySelector('a')?.inert,version:e.querySelector('[data-local-glass]').dataset.geometryVersion,overflow:document.documentElement.scrollWidth-innerWidth};};
      let obs;try{obs=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration}))));obs.observe({type:'longtask',buffered:false});}catch{}
      while(document.querySelector('[data-budding-link]').dataset.expanded!=='true')await new Promise(requestAnimationFrame);
      const start=performance.now();let last=start, sampleAt=0;
      while(performance.now()-start<1450){await new Promise(requestAnimationFrame);const n=performance.now();interval.push(n-last);last=n;if(n-start>=sampleAt){rows.push({...read(),elapsed:n-start});sampleAt+=50;}}
      obs?.disconnect();return{rows,interval,longTasks,start};
    });
    await page.locator('.glass-budding-trigger').click();
    await page.waitForTimeout(470);
    check(!(await info()).focusOutline,`${width}: pointer activation has no persistent keyboard contour`);
    if ([393,768,1366].includes(width)) await page.screenshot({path:`${out}/${engine}-${width}-mid.png`,fullPage:false});
    const frames=await timeline;
    await page.mouse.move(0,0);
    await page.waitForTimeout(1500);
    const end=await info();
    if ([393,768,1366].includes(width)) await page.screenshot({path:`${out}/${engine}-${width}-full.png`,fullPage:false});
    check(end.ready==='true'&&end.growth===1,`${width}: growth completes`,end);
    check(end.href==='/ui/'&&!end.inert,`${width}: revealed native link active only after completion`,end);
    check(end.text==='explore me!',`${width}: revealed link label`,end.text);
    check(end.host.width>start.host.width+60,`${width}: actual document width grows right`,{start:start.host,end:end.host});
    check(Math.abs(end.center-start.center)<1,`${width}: mother global center fixed`,{start:start.center,end:end.center});
    check(Math.abs((end.github.x-start.github.x)-(end.host.width-start.host.width))<1,`${width}: GitHub displacement equals body growth`,{start,end});
    check(Math.abs(end.github.y-start.github.y)<1,`${width}: GitHub does not wrap during growth`,{start:start.github,end:end.github});
    check(end.scrollWidth<=width+1,`${width}: no final horizontal overflow`,end.scrollWidth);
    check(frames.rows.every(x=>Math.abs(x.center-start.center)<1&&Math.abs(x.y-start.host.y)<1&&Math.abs(x.githubY-start.github.y)<1&&x.overflow<=1),`${width}: no intermediate mother drift/wrap/overflow`,frames.rows);
    check(frames.rows.every((x,i)=>i===0||x.growth>=frames.rows[i-1].growth),`${width}: continuous monotonic growth`,frames.rows.map(x=>[x.elapsed,x.growth]));
    check(frames.rows.some(x=>x.growth>0&&x.growth<1&&x.inert===true),`${width}: growing destination remains inert`,frames.rows.map(x=>[x.elapsed,x.growth,x.inert]));
    check(end.bodies===1&&end.backdrop===1&&end.pathsIdentical,`${width}: one body through completion`,end);
    const restfulVersion=end.geometryVersion;
    await page.waitForTimeout(600);
    const rest=await info();
    check(rest.geometryVersion===restfulVersion,`${width}: geometry does not rebuild after settling`,{before:restfulVersion,after:rest.geometryVersion});
    timelines.push({width,start,end,rest,frames});
  }
  // Native keyboard activation, no synthetic click shortcuts.
  await page.setViewportSize({width:1366,height:900});
  await page.goto('http://localhost:5187/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-budding-link] [data-optical-ready="true"]').waitFor();
  await page.locator('.glass-budding-trigger').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  check((await info()).expanded==='true','Space starts reveal');
  await page.waitForTimeout(1300);
  check((await info()).ready==='true','Space reveal completes');
  check((await info()).focusOutline,'Keyboard activation retains visible shared contour');
  await page.keyboard.press('Tab');
  const tabFocus=String((await info()).focus);
  if(engine==='webkit'&&!tabFocus.includes('glass-budding-destination')) {
    consoles.push({type:'known-engine-preference',text:'Windows WebKit default Tab preference skips links; direct native focus used only in the test for Enter navigation.'});
    await page.locator('.glass-budding-destination').focus();
  } else check(tabFocus.includes('glass-budding-destination'),'Tab reaches the native destination');
  const keyboardHref=await page.locator('.glass-budding-destination').getAttribute('href');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/ui/');
  check(page.url().endsWith('/ui/'),'Enter destination navigates to UI',{url:page.url(),href:keyboardHref});
  check((await page.content()).includes('/ui/releases/1.2.2/'),'UI remains accepted1.2.2');
  // Reduced motion is stable and immediate; focus remains on native trigger.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://localhost:5187/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-budding-link] [data-optical-ready="true"]').waitFor();
  await page.locator('.glass-budding-trigger').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  const reduced=await info();
  check(reduced.ready==='true'&&reduced.growth===1,'Reduced motion reveals immediately',reduced);
  check(String(reduced.focus).includes('glass-budding-trigger'),'Reduced-motion trigger focus retained',reduced.focus);
  await page.waitForTimeout(1500);
  const version=(await info()).geometryVersion;
  await page.waitForTimeout(650);
  check((await info()).geometryVersion===version,'Reduced-motion geometry remains settled');
  return {engine,at:new Date().toISOString(),passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results,timelines,errors,consoles};
}
