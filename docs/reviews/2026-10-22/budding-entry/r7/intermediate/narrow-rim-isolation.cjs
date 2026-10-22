async page=>{
 const c=await page.context().browser().newContext({viewport:{width:320,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}),p=await c.newPage();
 await p.goto('http://127.0.0.1:5197/');const host=p.locator('[data-review-bud]');await host.scrollIntoViewIfNeeded();await p.waitForFunction(()=>Number(document.querySelector('[data-review-bud] canvas')?.dataset.volumeLightRenders)>0);await p.getByRole('button',{name:'Toggle explore link'}).tap();await p.waitForFunction(()=>document.querySelector('[data-review-bud]').dataset.ready==='true');
 const slot=p.locator('.discovery-pair').first(),out='output/playwright/budding-refinement-r7-20261022';
 for(const [name,style] of [['original','/* baseline */'],['no-fill','.refinement-bud .local-edge>path:not([data-focus-outline]){fill:transparent!important}'],['no-backdrop','.refinement-bud .local-backdrop{visibility:hidden}'],['no-shadow','.refinement-contact{visibility:hidden}'],['no-canvas','.refinement-volume-light{visibility:hidden}']]){
  const s=await p.addStyleTag({content:style});await slot.screenshot({path:out+'/narrow-rim-'+name+'.png'});await s.evaluate(n=>n.remove());
 }
 const state=await host.evaluate(h=>({path:h.querySelector('.local-edge path').getAttribute('d'),canvas:{width:h.querySelector('canvas').width,height:h.querySelector('canvas').height},mode:h.querySelector('[data-local-glass]').dataset.opticalMode}));await c.close();return state;
}

