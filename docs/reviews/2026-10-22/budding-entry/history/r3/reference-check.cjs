async page=>{
 const out='output/playwright/budding-refinement-r3-20261022',checks=[];
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,...(detail?{detail}:{})});if(!pass)throw new Error(name);};
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:393,height:700});
 await page.goto('http://127.0.0.1:5194/showcase/budding-refinement-review/index.html');
 await page.waitForTimeout(300);
 const box=await page.locator('[data-review-bud]').boundingBox();
 if(box.y>860)check('offscreen shader allocation waits for approach',await page.locator('canvas').getAttribute('data-material-source')===null);
 await page.locator('[data-review-bud]').scrollIntoViewIfNeeded();
 await page.waitForSelector('canvas[data-material-source]');
 const prepared=await page.locator('canvas').evaluate(e=>({width:e.width,height:e.height,...e.dataset}));
 check('accepted reference shader prepared before activation',prepared.volumeHeightModel==='accepted-reference-potential');
 check('shader reuses actual accepted source',prepared.materialSource==='src/volume-renderer.js');
 check('small lighting raster is bounded',prepared.width*prepared.height===38940);
 await page.getByRole('button',{name:'Grow refinement-proposal'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-ready')==='true');
 await page.mouse.move(1,1);await page.waitForTimeout(700);
 const count=await page.locator('canvas').getAttribute('data-volume-light-renders');await page.waitForTimeout(700);
 check('reference material sleeps at rest',count===await page.locator('canvas').getAttribute('data-volume-light-renders'));
 check('reference material has no renderer error',await page.locator('canvas[data-volume-error]').count()===0);
 check('native backdrop optics remain under the material',await page.locator('[data-review-bud] [data-optical-mode=svg]').count()===1);
 await page.getByRole('checkbox',{name:'Reference volume material'}).uncheck();
 check('material off retains real optical body',await page.locator('[data-review-bud] [data-optical-mode=svg]').count()===1);
 check('material off removes canvas',await page.locator('canvas').count()===0);
 await page.getByRole('checkbox',{name:'Reference volume material'}).check();
 await page.waitForSelector('canvas[data-material-source]');
 check('material can reinitialise coherently at full growth',await page.locator('[data-review-bud]').getAttribute('data-ready')==='true');
 await page.setViewportSize({width:1413,height:1000});await page.getByRole('button',{name:'Explore Liquid Glass',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-budding-link]')?.getAttribute('data-ready')==='true');
 await page.mouse.move(1,1);await page.waitForTimeout(550);
 await page.screenshot({path:`${out}/final-environment-1413.png`,fullPage:true,scale:'css'});
 await page.locator('.discovery-pair').nth(1).screenshot({path:`${out}/final-detail-54.png`,scale:'css'});
 const context=await page.context().browser().newContext({viewport:{width:1413,height:1000},deviceScaleFactor:3});
 try{
  const p=await context.newPage();await p.goto('http://127.0.0.1:5194/showcase/budding-refinement-review/index.html');
  await p.getByRole('button',{name:'Grow refinement-proposal'}).click();await p.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-ready')==='true');
  await p.mouse.move(1,1);await p.waitForTimeout(600);
  check('DPR 3 keeps identical 38940-pixel budget',await p.locator('canvas').evaluate(e=>e.width*e.height)===38940);
  await p.locator('[data-review-bud]').screenshot({path:`${out}/final-detail-3x-device.png`,scale:'device'});
 }finally{await context.close();}
 return {createdAt:new Date().toISOString(),checks,passed:checks.filter(c=>c.pass).length,total:checks.length,prepared,physicalDeviceCoverage:false,measurementBoundary:'Canvas compute time describes CPU submission only, not GPU completion or FPS.'};
}
