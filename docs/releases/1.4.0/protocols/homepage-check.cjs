async page=>{
 const base=page.url(),out='output/playwright/homepage-budding-1.4.0/local',browser=page.context().browser(),checks=[],errors=[];
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(JSON.stringify(checks.at(-1)));};
 for(const width of [320,393,640,820,1413]){
  const c=await browser.newContext({viewport:{width,height:width<700?852:1000},deviceScaleFactor:width<700?3:2}),p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(base);const host=p.locator('[data-volume-budding]'),button=host.locator('button'),github=p.locator('.hero__discovery>.text-link');
  await host.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-volume-budding] canvas')?.dataset.volumePreparation==='ready');await p.mouse.move(0,0);await p.waitForTimeout(220);
  const before=await github.boundingBox(),beforeBox=await host.boundingBox();await p.screenshot({path:`${out}/home-${width}-closed.png`,scale:'css'});
  await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await p.mouse.move(0,0);await p.waitForTimeout(200);
  const after=await github.boundingBox(),box=await host.boundingBox();
  check(`${width}: real width pushes GitHub`,after.x-before.x>120&&Math.abs(after.x-before.x-(box.width-beforeBox.width))<1,{before,after,beforeBox,box});
  check(`${width}: link and right margin remain in viewport`,after.x+after.width<=width-6,{after,width});
  check(`${width}: no horizontal overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(`${width}: native chamber destination`,await host.locator('.glass-budding-destination').getAttribute('href')==='/ui/');
  const actions=await p.locator('.hero__actions').evaluate(el=>[...el.querySelectorAll('a,button')].map(x=>x.getAttribute('href')||x.getAttribute('aria-label')));
  check(`${width}: CTA sequence`,actions[0]==='#work'&&actions[1]==='Toggle explore link'&&actions[2]==='/ui/'&&actions[3]==='https://github.com/AlbertXXuu',actions);
  await p.screenshot({path:`${out}/home-${width}-open.png`,scale:'css'});await p.locator('.hero__discovery').screenshot({path:`${out}/detail-${width}.png`});
  const near=async()=>host.evaluate(h=>({mother:Number(h.dataset.motherNear),chamber:Number(h.dataset.chamberNear)}));
  await host.locator('.glass-budding-destination').hover();await p.waitForTimeout(350);check(`${width}: chamber hover is independent`,(await near()).chamber>.9&&(await near()).mother===0,await near());
  await button.hover();await p.waitForTimeout(600);check(`${width}: mother hover is independent`,(await near()).mother>.9&&(await near()).chamber===0,await near());
  await p.locator('#hero-title').click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.growth==='0.00000');check(`${width}: outside click returns`,await button.getAttribute('aria-expanded')==='false');
  await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.growth==='0.00000');check(`${width}: scroll away returns`,await button.getAttribute('aria-expanded')==='false');
  await button.scrollIntoViewIfNeeded();await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await button.focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.growth==='0.00000');check(`${width}: Escape returns focus`,await button.evaluate(el=>el===document.activeElement));
  await c.close();
 }
 for(const width of [320,393,1413]){
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}}),p=await c.newPage();await p.goto(base);const host=p.locator('[data-volume-budding]');
  const initial=await host.evaluate(h=>{const img=h.querySelector(`[data-first-frame="${innerWidth<=360?44:54}"] img`);return{enhanced:h.dataset.enhanced,img:img.complete&&img.naturalWidth>0,href:h.querySelector('a').getAttribute('href'),width:h.querySelector('a').getBoundingClientRect().width};});
  check(`${width}: SSR exact native first frame`,initial.enhanced==='false'&&initial.img&&initial.href==='/ui/'&&initial.width===(width<=360?44:54),initial);
  await p.screenshot({path:`${out}/no-js-${width}.png`,scale:'css'});await c.close();
 }
 check('zero page exceptions',errors.length===0,errors);
 return{base,at:new Date().toISOString(),passed:checks.filter(x=>x.pass).length,total:checks.length,checks,boundary:'Desktop Chromium responsive emulation; not physical iOS acceptance.'};
}
