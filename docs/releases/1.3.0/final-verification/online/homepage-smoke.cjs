async (page) => {
  const engine=page.context().browser().browserType().name(),results=[],errors=[],consoleMessages=[],httpErrors=[],failedRequests=[],samples=[];
  const check=(pass,label,details)=>results.push({pass:!!pass,label,details});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(['warning','error'].includes(m.type()))consoleMessages.push({type:m.type(),text:m.text()});});
  page.on('response',r=>{if(r.status()>=400&&/^https:\/\/(www\.)?alvenx\.com\//.test(r.url()))httpErrors.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText,firstParty:/^https:\/\/(www\.)?alvenx\.com\//.test(r.url())}));
  const state=()=>page.locator('[data-budding-link]').evaluate(e=>{const r=e.getBoundingClientRect(),t=e.querySelector('button').getBoundingClientRect(),g=document.querySelector('.hero__discovery .text-link').getBoundingClientRect(),b=e.querySelector('[data-local-glass]');return{growth:Number(e.dataset.growth),ready:e.dataset.ready,text:e.textContent,width:r.width,x:r.x,y:r.y,center:t.x+t.width/2,githubX:g.x,githubY:g.y,bodyCount:e.querySelectorAll('[data-local-glass]').length,mode:b.dataset.opticalMode,error:b.dataset.opticalError,focus:!!b.querySelector('[data-focus-outline="true"]'),href:e.querySelector('a')?.getAttribute('href'),inert:e.querySelector('a')?.inert,overflow:document.documentElement.scrollWidth-innerWidth};});
  for(const width of [393,768,1366]) {
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto('https://alvenx.com/',{waitUntil:'domcontentloaded'});
    await page.locator('[data-budding-link] [data-optical-ready="true"]').waitFor();await page.evaluate(()=>document.fonts.ready);
    await page.locator('.glass-budding-trigger').scrollIntoViewIfNeeded();
    const start=await state();check(start.growth===0&&start.text===''&&start.bodyCount===1&&!start.error,`${width}: live empty single optical mother`,start);
    if(width!==768)await page.screenshot({path:`alvenx-design-kit/docs/releases/1.3.0/final-verification/online/${engine}-${width}-start.png`});
    await page.locator('.glass-budding-trigger').click();await page.waitForTimeout(420);const mid=await state();
    check(mid.growth>0&&mid.growth<1&&mid.width>start.width&&mid.inert,`${width}: live intermediate continuous right growth`,mid);
    await page.waitForTimeout(1000);await page.mouse.move(0,0);await page.waitForTimeout(1500);const end=await state();
    check(end.growth===1&&end.ready==='true'&&end.bodyCount===1&&end.href==='/ui/'&&!end.inert,`${width}: live native chamber link completes in same body`,end);
    check(Math.abs(mid.center-start.center)<1&&Math.abs(end.center-start.center)<1,`${width}: live mother center stays fixed`,{start:start.center,mid:mid.center,end:end.center});
    check(Math.abs((end.githubX-start.githubX)-(end.width-start.width))<1&&Math.abs(mid.githubY-start.githubY)<1&&Math.abs(end.githubY-start.githubY)<1,`${width}: live GitHub pushed by actual width without row jump`,{start,mid,end});
    check(mid.overflow<=1&&end.overflow<=1,`${width}: live no horizontal overflow`,{mid:mid.overflow,end:end.overflow});
    check(!mid.focus&&!end.focus,`${width}: live pointer keeps normal rim without keyboard outline`);
    if(width!==768)await page.screenshot({path:`alvenx-design-kit/docs/releases/1.3.0/final-verification/online/${engine}-${width}-full.png`});
    samples.push({width,start,mid,end});
  }
  // Native production link, not a direct navigation to the showcase.
  await page.locator('.glass-budding-destination').click();await page.waitForURL('https://alvenx.com/ui/');
  check(page.url()==='https://alvenx.com/ui/','Live native destination enters production UI');
  check((await page.content()).includes('/ui/releases/1.2.2/'),'Accepted production UI stays1.2.2');
  if(engine==='chromium') {
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto('https://alvenx.com/',{waitUntil:'domcontentloaded'});await page.locator('[data-budding-link] [data-optical-ready="true"]').waitFor();
    await page.locator('.glass-budding-trigger').click();await page.waitForTimeout(80);const reduced=await state();
    check(reduced.growth===1&&reduced.ready==='true','Production reduced motion settles immediately',reduced);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('https://alvenx.com/',{waitUntil:'domcontentloaded'});await page.locator('[data-budding-link] [data-optical-ready="true"]').waitFor();
    await page.locator('.glass-budding-trigger').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await page.keyboard.press('Space');await page.waitForTimeout(1400);await page.keyboard.press('Tab');await page.waitForTimeout(150);
    const keyboard=await state();check(keyboard.focus&&await page.locator('.glass-budding-destination').evaluate(e=>e===document.activeElement),'Production native keyboard destination has shared focus outline',keyboard);
    await page.keyboard.press('Enter');await page.waitForURL('https://alvenx.com/ui/');check(page.url()==='https://alvenx.com/ui/','Production keyboard Enter follows native link');
  }
  check(errors.length===0,'No live page errors',errors);check(consoleMessages.length===0,'No live console warnings/errors including CSP',consoleMessages);
  const telemetryCancellations=failedRequests.filter(r=>/^https:\/\/(www\.)?alvenx\.com\/cdn-cgi\/rum\?/.test(r.url)&&/cancel/i.test(r.error||''));
  const appResourceFailures=failedRequests.filter(r=>r.firstParty&&!telemetryCancellations.includes(r));
  check(httpErrors.length===0&&appResourceFailures.length===0,'No live first-party app-resource HTTP/request errors',{httpErrors,appResourceFailures,telemetryCancellations});
  return{date:'2026-10-19',worker:'79be58bd-165f-4a9e-84ad-475ad4cf1359',engine,browser:page.context().browser().version(),passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results,samples,errors,consoleMessages,httpErrors,failedRequests,telemetryCancellations,appResourceFailures,limits:['Windows browser engines, not physical iPhone/iPad or Combo Touch acceptance.','Three production samples per width verify this deployed normal flow; no new device FPS claim or invalid-prop coverage.','Navigation-cancelled same-origin Cloudflare rum telemetry is retained separately; it is not a failed application asset or an HTTP error.']};
}
