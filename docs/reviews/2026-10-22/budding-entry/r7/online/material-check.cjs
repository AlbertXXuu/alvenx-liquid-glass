async initialPage=>{
 if(initialPage.url()!=='https://alvenx.com/ui/budding-refinement-review-20261022/')throw Error('Open the exact R7 review URL.');
 const context=await initialPage.context().browser().newContext();const page=await context.newPage();await page.goto(initialPage.url());await page.bringToFront();
 const base=page.url();if(!/^https?:/.test(base))throw new Error('Open review first.');
 await page.addInitScript(()=>{
  const proto=WebGLRenderingContext.prototype,sub=proto.texSubImage2D,draw=proto.drawArrays,states=new WeakMap(),audit=[];window.__materialAudit=audit;
  proto.texSubImage2D=function(...args){
   if(this.canvas.classList.contains('refinement-volume-light')&&ArrayBuffer.isView(args[8])){
    const s=states.get(this)||{version:0,previous:0};s.pixels=new Uint8Array(args[8]);s.version++;states.set(this,s);
   }
   return sub.apply(this,args);
  };
  const ctx=document.createElement('canvas').getContext('2d');
  proto.drawArrays=function(...args){
   const result=draw.apply(this,args);
   if(!this.canvas.classList.contains('refinement-volume-light'))return result;
   const program=this.getParameter(this.CURRENT_PROGRAM),host=this.canvas.closest('[data-review-bud]'),growth=Number(host?.dataset.growth),edge=host?.querySelector('.local-edge path'),s=states.get(this)||{version:0,previous:0};
   if(!edge||!edge.getAttribute('d'))return result;
   const joined=growth>.00001&&growth<.95,failures=[];let samples=0;
   if(s.pixels){
    const path=new Path2D(edge.getAttribute('d')),width=parseFloat(this.canvas.style.width),height=parseFloat(this.canvas.style.height),data=s.pixels;
    for(let i=7;i<256;i+=17){
     const x=(i+.5)/256*width,top=(data[i*4]*256+data[i*4+1])/65535*height,bottom=(data[i*4+2]*256+data[i*4+3])/65535*height;
     if(bottom-top<3)continue;samples++;
     if(!ctx.isPointInPath(path,x,top+1)||ctx.isPointInPath(path,x,top-1)||!ctx.isPointInPath(path,x,bottom-1)||ctx.isPointInPath(path,x,bottom+1))failures.push({x,top,bottom});
    }
   }
   const path=edge.getAttribute('d');audit.push({growth,joined,samples,profileVersion:s.version,uploaded:s.version>s.previous,changed:path!==s.path,failures});s.previous=s.version;s.path=path;states.set(this,s);return result;
  };
 });
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1413,height:1000});await page.goto(base);
 const target=page.locator('[data-review-bud]');await target.scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('[data-review-bud] canvas')?.dataset.volumeLightRenders)>0);
 await page.getByRole('button',{name:'Toggle explore link'}).click();await page.mouse.move(1,1);await page.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-ready')==='true');await page.waitForTimeout(250);
 await page.mouse.click(1,1);await page.waitForFunction(()=>document.querySelector('[data-review-bud]')?.getAttribute('data-growth')==='0.00000');await page.waitForTimeout(100);
 const frames=await page.evaluate(()=>window.__materialAudit),joined=frames.filter(f=>f.joined),terminal=frames.filter(f=>!f.joined),checks=[
  {name:'actual draw inspected during joined growth and return',pass:joined.length>10},
  {name:'profile checked against committed native C2 path',pass:frames.every(f=>f.samples>2&&f.failures.length===0)},
  {name:'changed contours refresh profile at every phase',pass:frames.every(f=>f.uploaded===f.changed)},
  {name:'rest and separate shapes use actual contour profile',pass:terminal.length>0&&terminal.every(f=>f.samples>2)},
  {name:'both growth and return observed',pass:joined.some((f,i)=>i>0&&f.growth<joined[i-1].growth)}
 ];
 const result={base,createdAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,total:checks.length,checks,joinedFrames:joined.length,boundarySamples:joined.reduce((n,f)=>n+f.samples,0),failedFrames:frames.filter(f=>f.failures.length),instrumentationBoundary:'Test-only GL interception reads uniforms and samples native Path2D; not a performance or GPU timing measurement.'};
 if(result.passed!==result.total)throw new Error(JSON.stringify(result));return result;
}
