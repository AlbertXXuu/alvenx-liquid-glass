async page=>{
 const base=page.url(),out='output/playwright/homepage-budding-1.4.0/local',checks=[],errors=[];
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(JSON.stringify(checks.at(-1)));};
 for(const device of [{name:'phone',width:393,height:852,deviceScaleFactor:3,isMobile:true,hasTouch:true},{name:'narrow',width:320,height:852,deviceScaleFactor:3,isMobile:true,hasTouch:true},{name:'tablet',width:820,height:1180,deviceScaleFactor:2,isMobile:true,hasTouch:true}]){
  const {name,...options}=device,c=await page.context().browser().newContext({viewport:{width:options.width,height:options.height},...options}),p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{let held=false;const pending=new Map(),raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);window.requestAnimationFrame=callback=>{const id=raf(time=>{if(held)pending.set(id,callback);else callback(time);});return id;};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};window.__holdTestFrames=()=>{held=true;return new Promise(resolve=>setTimeout(resolve,32));};window.__releaseTestFrames=()=>{held=false;for(const callback of pending.values())raf(callback);pending.clear();};});
  await p.goto(base);const host=p.locator('[data-volume-budding]'),button=p.getByRole('button',{name:'Toggle explore link'});await host.scrollIntoViewIfNeeded();
  await p.waitForFunction(()=>Number(document.querySelector('[data-volume-budding] canvas')?.dataset.volumeLightRenders)>0);
  const rest=async()=>{await p.mouse.move(0,0);await p.waitForTimeout(180);};
  await p.evaluate(()=>{window.__toggleEvents=[];document.addEventListener('click',event=>{if(!event.target.closest('[data-volume-budding] button'))return;const h=document.querySelector('[data-volume-budding]'),entry={at:performance.now(),before:Number(h.dataset.growth),targetBefore:h.dataset.expanded};window.__toggleEvents.push(entry);},true);window.addEventListener('click',event=>{if(!event.target.closest('[data-volume-budding] button'))return;const h=document.querySelector('[data-volume-budding]'),entry=window.__toggleEvents.at(-1);queueMicrotask(()=>{entry.after=Number(h.dataset.growth);entry.targetAfter=h.dataset.expanded;});});});
  const eventState=()=>p.evaluate(()=>window.__toggleEvents.at(-1));
  const target=()=>button.getAttribute('aria-expanded');
  const settle=(v)=>p.waitForFunction(value=>document.querySelector('[data-volume-budding]')?.dataset.growth===value,v?'1.00000':'0.00000');
  await p.screenshot({path:`${out}/touch-${name}-closed.png`,scale:'css'});
  await button.tap();await settle(1);check(`${name}: first tap opens`,await target()==='true');
  await p.locator('.hero__discovery').first().screenshot({path:`${out}/touch-${name}-open.png`});
  await button.tap();check(`${name}: second tap targets close`,await target()==='false');await settle(0);check(`${name}: second tap retracts chamber`,await host.locator('a').count()===0);
  await button.tap();await p.waitForFunction(()=>{const g=Number(document.querySelector('[data-volume-budding]').dataset.growth);return g>.15&&g<.9;});
  // Raw touchscreen avoids locator stability waiting until after the animation.
  await p.evaluate(()=>window.__holdTestFrames());let b=await button.boundingBox();await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);let event=await eventState();await p.evaluate(()=>window.__releaseTestFrames());
  check(`${name}: growing tap reverses without snapping`,await target()==='false'&&event.targetAfter==='false'&&event.before>0&&event.before<1&&Math.abs(event.after-event.before)<.0001,event);
  await p.waitForTimeout(90);await p.evaluate(()=>window.__holdTestFrames());b=await button.boundingBox();await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);event=await eventState();await p.evaluate(()=>window.__releaseTestFrames());
  check(`${name}: returning tap reopens continuously`,await target()==='true'&&event.targetAfter==='true'&&event.before>0&&event.before<1&&Math.abs(event.after-event.before)<.0001,event);await settle(1);
  await button.tap();await settle(0);await rest();
  const edge=await host.evaluate(h=>{const paths=[...h.querySelectorAll('.local-edge>path:not([data-focus-outline])')];return {strokes:paths.map(p=>getComputedStyle(p).stroke),specular:paths.filter(p=>p.hasAttribute('filter')).map(p=>getComputedStyle(p).opacity),model:h.querySelector('canvas').dataset.volumeHeightModel};});
  check(`${name}: no duplicate native white rim`,edge.strokes.every(s=>s==='none')&&edge.specular.every(a=>a==='0'),edge);
  check(`${name}: one continuous material model`,edge.model==='continuous-contour-profile');
  await button.focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');await p.waitForTimeout(150);
  check(`${name}: keyboard focus remains authored`,await host.locator('[data-focus-outline]').count()>0);
  await p.screenshot({path:`${out}/touch-${name}-focus.png`,scale:'css'});
  await p.keyboard.press('Space');await settle(1);await p.keyboard.press('Space');await settle(0);
  check(`${name}: Space also toggles`,await target()==='false');
  await p.emulateMedia({reducedMotion:'reduce'});await button.tap();await settle(1);await button.tap();await settle(0);check(`${name}: reduced motion toggles`,await target()==='false');
  await c.close();
 }
 check('no page exceptions',errors.length===0,errors);
 return {createdAt:new Date().toISOString(),base,passed:checks.filter(c=>c.pass).length,total:checks.length,checks,boundary:'Chromium touch/DPR emulation. Reversal snapshots bracket React click commit; only the presentation RAF is briefly held/drained across the native click, then resumed. This separates handler continuity from queued animation progress. Not physical iPhone/iPad Safari acceptance.'};
}
