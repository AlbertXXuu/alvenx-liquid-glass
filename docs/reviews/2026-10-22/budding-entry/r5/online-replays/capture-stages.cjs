async page=>{
 const base=page.url();if(!/^https?:/.test(base))throw new Error('Open the review URL before replay.');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1413,height:1000});await page.goto(base);
 const target=page.locator('[data-review-bud]');await target.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(300);
 const box=await target.boundingBox();await target.screenshot({path:'output/playwright/budding-refinement-r5-20261022/online/stage-0.png',scale:'css'});
 const client=await page.context().newCDPSession(page);const images=[];
 await page.getByRole('button',{name:'Grow refinement-proposal'}).click();
 try{
  for(const stage of [.25,.55,.85,.95]){
   await page.waitForFunction(t=>Number(document.querySelector('[data-review-bud]').getAttribute('data-growth'))>=t,stage);
   const growthBefore=Number(await target.getAttribute('data-growth'));const consistency=await target.evaluate(h=>{const shadow=h.querySelector('.refinement-contact path').getAttribute('d'),clip=h.querySelector('.local-edge path').getAttribute('d');return {shadowMatchesEdge:clip===shadow,canvasWidth:h.querySelector('canvas').getBoundingClientRect().width,hostWidth:h.getBoundingClientRect().width};});
   const shot=await client.send('Page.captureScreenshot',{format:'png',clip:{x:box.x-8,y:box.y-10,width:325,height:box.height+20,scale:2}});
   const growthAfter=Number(await target.getAttribute('data-growth'));images.push({stage,growthBefore,growthAfter,consistency,data:shot.data});
  }
 }finally{await client.detach();}
 await page.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-ready')==='true');await page.mouse.move(1,1);await page.waitForTimeout(350);
 await page.locator('.discovery-pair').first().screenshot({path:'output/playwright/budding-refinement-r5-20261022/online/stage-1.png',scale:'css'});
 return {createdAt:new Date().toISOString(),method:'Actual shared-clock interaction and native CDP screenshots after observed growth thresholds. Before/after progress brackets are retained; these are not synthetic frozen frames.',images};
}
