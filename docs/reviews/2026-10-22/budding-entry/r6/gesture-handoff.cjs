async page=>{
 const base=page.url(),browser=page.context().browser(),results=[],checks=[];
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+' '+JSON.stringify(detail));};
 for(const mode of ['mouse','touch','space','outside','cancel']){
  const c=await browser.newContext({viewport:{width:393,height:852},hasTouch:mode==='touch'}),p=await c.newPage();let unblock;const gate=new Promise(r=>unblock=r);
  await c.route('**/buddingRefinementReview-*.js',async r=>{await gate;await r.continue();});await p.goto(base,{waitUntil:'commit'});await p.waitForSelector('[data-prejs-budding]');await p.waitForFunction(()=>typeof window.__alvenxBuddingReleaseEarly==='function');
  const a=p.locator('[data-prejs-budding]'),b=await a.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;let cdp;
  if(['mouse','outside','cancel'].includes(mode)){await p.mouse.move(x,y);await p.mouse.down();}
  if(mode==='touch'){cdp=await c.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});}
  if(mode==='space'){await a.focus();await p.keyboard.down('Space');}
  unblock();await p.waitForSelector('[data-enhanced=true] button');
  if(mode==='mouse')await p.mouse.up();if(mode==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});if(mode==='space')await p.keyboard.up('Space');if(mode==='outside'){await p.mouse.move(1,1);await p.mouse.up();}if(mode==='cancel'){await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));await p.mouse.move(1,1);await p.mouse.up();}
  await p.waitForTimeout(200);const result={mode,growth:Number(await p.locator('[data-review-bud]').getAttribute('data-growth')),expanded:await p.locator('[data-review-bud]').getAttribute('data-expanded'),globals:await p.evaluate(()=>({intent:window.__alvenxBuddingIntent,release:typeof window.__alvenxBuddingReleaseEarly}))};results.push(result);check(`${mode}: press across hydration ${['outside','cancel'].includes(mode)?'does not activate':'activates'}`,['outside','cancel'].includes(mode)?result.growth===0:result.growth>0,result);await c.close();
 }
 {
  const c=await browser.newContext({viewport:{width:393,height:852}}),p=await c.newPage();let unblock;const gate=new Promise(r=>unblock=r);await c.route('**/buddingRefinementReview-*.js',async r=>{await gate;await r.continue();});await p.goto(base,{waitUntil:'commit'});await p.waitForSelector('[data-prejs-budding]');await p.waitForFunction(()=>typeof window.__alvenxBuddingReleaseEarly==='function');
  for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey','middle']){
   const result=await p.evaluate(mod=>{const a=document.querySelector('[data-prejs-budding]');let intercepted;const stop=e=>{intercepted=e.defaultPrevented;e.preventDefault();};document.addEventListener('click',stop,{once:true});a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:mod==='middle'?1:0,[mod]:true}));return{intercepted,queued:window.__alvenxBuddingIntent===true};},modifier);check(`${modifier}: native modified link is not intercepted`,!result.intercepted&&!result.queued,result);
  }unblock();await c.close();
 }
 return{base,createdAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,total:checks.length,checks,results};
}
