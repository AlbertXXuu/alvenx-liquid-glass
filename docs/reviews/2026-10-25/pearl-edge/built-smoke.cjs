async page=>{
 const base=page.url(),browser=page.context().browser(),checks=[],errors=[],shots=[];
 const check=(name,value)=>{checks.push({name,pass:!!value});};
 for(const width of [320,393,1413]){
  const opts={viewport:{width,height:900},deviceScaleFactor:width<700?3:2,hasTouch:width<700};
  const s=await browser.newContext({...opts,javaScriptEnabled:false}),sp=await s.newPage();await sp.goto(base);await sp.evaluate(()=>document.fonts.ready);
  const staticInfo=await sp.locator('[data-volume-budding]').evaluate(h=>{const a=h.querySelector('a'),d=innerWidth<=360?44:54,i=h.querySelector('[data-first-frame="'+d+'"] img');return{ready:i.complete&&i.naturalWidth>0,href:a.href,width:a.getBoundingClientRect().width,enhanced:h.dataset.enhanced};});
  check(width+': native static first frame',staticInfo.ready&&staticInfo.enhanced==='false');check(width+': native destination',staticInfo.href==='https://alvenx.com/ui/');check(width+': first frame target size',staticInfo.width===(width<=360?44:54));
  await sp.locator('.discovery').screenshot({path:'output/playwright/pearl-edge-20261025/built-static-'+width+'.png',scale:'css'});await s.close();
  const c=await browser.newContext(opts),p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.mouse.move(0,0);
  const h=p.locator('[data-volume-budding]'),b=h.locator('button');await p.waitForFunction(()=>document.querySelector('[data-volume-budding] canvas')?.dataset.volumePreparation==='ready');await p.waitForTimeout(500);
  check(width+': hydrated single button',await b.count()===1);check(width+': transparent first frame removed',await h.locator('[data-static-first-frame]').count()===0);check(width+': starts closed',await b.getAttribute('aria-expanded')==='false');
  await p.locator('.discovery').screenshot({path:'output/playwright/pearl-edge-20261025/built-live-'+width+'.png',scale:'css'});
  await b.click();await p.mouse.move(0,0);await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.growth==='1.00000');check(width+': opens',await h.getAttribute('data-ready')==='true');check(width+': link works',await h.locator('.glass-budding-destination').getAttribute('href')==='https://alvenx.com/ui/');
  await p.locator('.cta-row').screenshot({path:'output/playwright/pearl-edge-20261025/built-open-'+width+'.png',scale:'css'});check(width+': no overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await b.click();await p.mouse.move(0,0);await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.growth==='0.00000');check(width+': closes',await b.getAttribute('aria-expanded')==='false');await c.close();
 }
 check('no runtime or console errors',errors.length===0);return {at:new Date().toISOString(),base,assertions:checks.length,passed:checks.filter(c=>c.pass).length,checks,errors};
}
