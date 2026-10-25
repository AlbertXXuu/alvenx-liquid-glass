async page => {
 const base=page.url(),browser=page.context().browser(),out='output/playwright/pearl-edge-20261025';
 const checks=[],errors=[],frames=[];
 const check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
 const path=h=>h.locator('.local-edge>path').first().getAttribute('d');
 const parts=d=>d.split(/(?=M )/);
 const box=h=>h.locator('.local-edge>path').first().evaluate(e=>{const r=e.getBBox();return{x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};});
 const canvasBounds=async(h,name)=>{const contour=await box(h),canvas=await h.locator('canvas').evaluate(e=>({width:parseFloat(e.style.width),height:parseFloat(e.style.height)}));check(name,contour.x>=0&&contour.y>=0&&contour.x+contour.width<=canvas.width&&contour.y+contour.height<=canvas.height,{contour,canvas});};
 const capture=async(p,h,key,state)=>{
  const r=await h.boundingBox(),clip={x:Math.max(0,Math.floor(r.x-10)),y:Math.max(0,Math.floor(r.y-10)),width:Math.ceil(r.width+20),height:Math.ceil(r.height+20)};
  clip.width=Math.min(clip.width,p.viewportSize().width-clip.x);clip.height=Math.min(clip.height,p.viewportSize().height-clip.y);
  const file=`${out}/edge-${key}-${state}.png`;
  await p.screenshot({path:file,clip,scale:'device'});
  const contourSha256=await h.evaluate(async e=>{
   const d=e.querySelector('.local-edge>path')?.getAttribute('d');if(!d)return null;
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(d));
   return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  });
  frames.push({key,state,file,clip,deviceScaleFactor:await p.evaluate(()=>devicePixelRatio),scroll:await p.evaluate(()=>({x:scrollX,y:scrollY})),contourSha256});
 };
 // Six representative rendering contexts. The existing full interaction suite
 // separately covers 393 px, reduced motion, fixed targets, toggles and idle.
 for(const diameter of [44,54]) for(const dpr of [1,2,3]){
  const width=diameter===44?320:1413,key=`${diameter}px-dpr${dpr}`;
  const options={viewport:{width,height:1000},deviceScaleFactor:dpr,hasTouch:diameter===44};
  const staticContext=await browser.newContext({...options,javaScriptEnabled:false});
  try{
   const p=await staticContext.newPage();await p.goto(base);await p.evaluate(()=>document.fonts.ready);
   const h=p.locator('[data-volume-budding]');await h.scrollIntoViewIfNeeded();
   const first=await h.evaluate((e,d)=>{const img=e.querySelector(`[data-first-frame="${d}"] img`),a=e.querySelector('a');return{enhanced:e.dataset.enhanced,loaded:!!img&&img.complete&&img.naturalWidth>0,href:a?.href,width:a?.getBoundingClientRect().width};},diameter);
   check(`${key}: native static first frame`,first.enhanced==='false'&&first.loaded&&first.width===diameter,first);
   check(`${key}: no-JS native destination`,first.href==='https://alvenx.com/ui/');
   await capture(p,h,key,'static-first-frame');
  }catch(e){check(`${key}: static scenario completed`,false,String(e));}finally{await staticContext.close();}
  const context=await browser.newContext(options);
  try{
   const p=await context.newPage();p.on('pageerror',e=>errors.push({key,type:'pageerror',message:String(e)}));p.on('console',e=>{if(e.type()==='error')errors.push({key,type:'console',message:e.text()});});
   await p.goto(base);await p.evaluate(()=>document.fonts.ready);
   const h=p.locator('[data-volume-budding]'),b=h.locator('button'),link=h.locator('.glass-budding-destination');await b.scrollIntoViewIfNeeded();
   await p.waitForFunction(()=>document.querySelector('[data-volume-budding] canvas')?.dataset.volumePreparation==='ready');await p.mouse.move(0,0);await p.waitForTimeout(1000);
   check(`${key}: requested diameter and DPR`,Number(await h.getAttribute('data-diameter'))===diameter&&await p.evaluate(()=>devicePixelRatio)===dpr);
   const rest=await path(h),restBox=await box(h),button=await b.boundingBox();
   await capture(p,h,key,'closed-rest');await canvasBounds(h,`${key}: rest fits canvas`);
   await p.mouse.move(button.x+button.width*.88,button.y+button.height*.28);await p.waitForTimeout(500);
   const hoverBox=await box(h);check(`${key}: hover responds and stays anchored`,await path(h)!==rest&&Math.abs(hoverBox.cx-restBox.cx)<.15&&Math.abs(hoverBox.cy-restBox.cy)<.15,{rest:restBox,hover:hoverBox});
   await capture(p,h,key,'closed-hover');await canvasBounds(h,`${key}: hover fits canvas`);
   await b.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await p.mouse.move(0,0);await p.waitForTimeout(1000);
   const opened=await path(h),destination=await link.boundingBox();check(`${key}: opens into detached lobes`,parts(opened).length===2);
   await capture(p,h,key,'open-rest');await canvasBounds(h,`${key}: open fits canvas`);
   await p.mouse.move(destination.x+destination.width*.73,destination.y+destination.height*.3);await p.waitForTimeout(500);const hovered=await path(h);
   check(`${key}: chamber hover is independent`,parts(hovered)[0]===parts(opened)[0]&&parts(hovered)[1]!==parts(opened)[1]);
   await capture(p,h,key,'chamber-hover');await canvasBounds(h,`${key}: chamber hover fits canvas`);
   await p.mouse.down();await p.mouse.move(destination.x+destination.width*.73+28,destination.y+destination.height*.3-18,{steps:8});await p.waitForTimeout(250);const dragged=await path(h);
   check(`${key}: chamber drag is independent`,parts(dragged)[0]===parts(opened)[0]&&parts(dragged)[1]!==parts(hovered)[1]);
   await capture(p,h,key,'chamber-drag');await canvasBounds(h,`${key}: chamber drag fits canvas`);
   await p.mouse.up();await p.mouse.move(0,0);await p.waitForTimeout(1200);
   check(`${key}: drag returns without navigation or toggling`,await path(h)===opened&&p.url()===base&&await h.getAttribute('data-expanded')==='true');
   check(`${key}: page has no horizontal overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }catch(e){check(`${key}: live scenario completed`,false,String(e));}finally{await context.close();}
 }
 check('no page or console errors',errors.length===0,errors);
 return{at:new Date().toISOString(),status:checks.every(c=>c.pass)?'passed':'failed',base,assertions:checks.length,passed:checks.filter(c=>c.pass).length,checks,errors,frames,scope:'Chromium screenshots at native device pixels. 44 px uses a 320 px touch-capable viewport; 54 px uses a 1413 px desktop viewport. This is browser emulation, not physical iOS/Safari acceptance. Edge appearance requires visual comparison; no numerical assertion here claims removal of a white halo.'};
}
