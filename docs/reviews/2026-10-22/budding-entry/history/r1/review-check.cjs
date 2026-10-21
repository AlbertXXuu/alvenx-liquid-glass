async page => {
 const out='output/playwright/budding-refinement-review-20261022';
 const errors=[],failedRequests=[],httpErrors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
 page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,...(detail?{detail}:{})});if(!pass)throw new Error(name);};
 for(const width of [1413,820,393,320]){
  await page.setViewportSize({width,height:1000});
  await page.goto('http://127.0.0.1:5194/showcase/budding-refinement-review/index.html');
  await page.evaluate(()=>document.fonts.ready);
  check(`${width}: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const sample=[];
  for(const [variant,selector,button] of [['baseline','[data-budding-link="refinement-baseline"]','Explore Liquid Glass'],['proposal','[data-review-bud="refinement-proposal"]','Grow refinement-proposal']]){
   const element=page.locator(selector);
   const initial=await element.boundingBox();
   const before=await element.locator('..').locator('.github-link').boundingBox();
   await page.getByRole('button',{name:button,exact:true}).click();
   await page.waitForFunction(s=>document.querySelector(s)?.getAttribute('data-ready')==='true',selector,{timeout:6000});
   await page.mouse.move(1,1);await page.waitForTimeout(350);
   const after=await element.locator('..').locator('.github-link').boundingBox(),box=await element.boundingBox();
   check(`${width} ${variant}: grew right`,box.width>initial.width+95);
   check(`${width} ${variant}: mother anchored`,Math.abs(initial.x-box.x)<.1);
   check(`${width} ${variant}: GitHub pushes by occupied width`,Math.abs((after.x-before.x)-(box.width-initial.width))<1);
   check(`${width} ${variant}: one actual optical body`,await element.locator('[data-local-glass]').count()===1);
   check(`${width} ${variant}: label native link`,await element.locator('a').getAttribute('href')==='https://alvenx.com/ui/');
   check(`${width} ${variant}: native button still 54px`,Math.abs((await element.locator('button').boundingBox()).width-54)<.01);
   check(`${width} ${variant}: no optical error`,await element.locator('[data-optical-error]').count()===0);
   sample.push({variant,initial,expanded:box,push:after.x-before.x,mode:await element.locator('[data-local-glass]').getAttribute('data-optical-mode')});
  }
  check(`${width}: no overflow after growth`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(`${width}: proposal more room`,sample[1].expanded.width>sample[0].expanded.width+18);
  await page.screenshot({path:`${out}/expanded-${width}.png`,fullPage:true,scale:'css'});
  for(const [i,name] of ['current','proposal'].entries())await page.locator('.discovery-pair').nth(i).screenshot({path:`${out}/detail-${width}-${name}.png`,scale:'css'});
  await page.getByRole('button',{name:'Reset both pearls'}).click();
  check(`${width}: reset clears growth`,await page.locator('[data-review-bud]').getAttribute('data-growth')==='0.00000');
 }
 await page.setViewportSize({width:1413,height:1000});
 await page.getByRole('button',{name:'Grow refinement-proposal'}).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-ready')==='true');
 check('keyboard Enter grows',await page.locator('[data-review-bud]').getAttribute('data-ready')==='true');
 await page.getByRole('button',{name:'Reset both pearls'}).click();
 await page.getByRole('button',{name:'Grow refinement-proposal'}).focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-ready')==='true');
 check('keyboard Space grows',await page.locator('[data-review-bud]').getAttribute('data-ready')==='true');
 await page.locator('[data-review-bud] a').focus();
 await page.waitForSelector('[data-review-bud] [data-focus-outline=true]');
 check('link focus creates contour ring',await page.locator('[data-review-bud] [data-focus-outline=true]').count()===1);
 await page.keyboard.press('Tab');
 check('Tab advances to GitHub',await page.evaluate(()=>document.activeElement?.textContent==='GitHub ↗'));
 await page.mouse.move(1,1);await page.getByRole('heading',{name:'A little more room.A softer connection.'}).click().catch(()=>{});
 await page.locator('[data-review-bud]').scrollIntoViewIfNeeded();await page.waitForTimeout(650);
 const versions=await page.locator('[data-local-glass]').evaluateAll(es=>es.map(e=>e.getAttribute('data-geometry-version')));await page.waitForTimeout(650);
 check('resting geometry sleeps',JSON.stringify(versions)===JSON.stringify(await page.locator('[data-local-glass]').evaluateAll(es=>es.map(e=>e.getAttribute('data-geometry-version')))));
 await page.getByRole('checkbox',{name:'Contour lighting'}).uncheck();
 check('light off removes added white layer',await page.locator('.refinement-volume-light').count()===0);
 await page.getByRole('checkbox',{name:'Contour lighting'}).check();
 check('light on restores it',await page.locator('.refinement-volume-light').count()===1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Reset both pearls'}).click();
 await page.getByRole('button',{name:'Grow refinement-proposal'}).click();
 check('reduced motion reveals immediately',await page.locator('[data-review-bud]').getAttribute('data-ready')==='true');
 check('page exceptions absent',errors.length===0,errors);
 check('HTTP errors absent',httpErrors.length===0,httpErrors);
 check('failed requests absent',failedRequests.length===0,failedRequests);
 const result={url:page.url(),createdAt:new Date().toISOString(),checks,passed:checks.filter(c=>c.pass).length,total:checks.length,errors,httpErrors,failedRequests,physicalDeviceCoverage:false};
 return result;
}
