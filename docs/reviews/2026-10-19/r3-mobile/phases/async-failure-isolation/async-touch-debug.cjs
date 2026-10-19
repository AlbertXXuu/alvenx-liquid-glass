async page=>{
 const b=page.context().browser(),c=await b.newContext({viewport:{width:393,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'}),p=await c.newPage();
 try{
  await p.addInitScript(()=>{
   const a=window.__debug={active:false,down:0,events:[]};const push=(name,data={})=>{if(a.active)a.events.push({name,t:performance.now()-a.down,...data});};
   const toBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){push('html-submit',{width:this.width,height:this.height});return toBlob.call(this,blob=>{push('html-complete');callback(blob);},...args);};
   const read=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(...args){push('read-submit');this.addEventListener('load',()=>push('read-complete'),{once:true});return read.apply(this,args);};
   document.addEventListener('pointerdown',()=>{if(a.active){a.down=performance.now();push('pointerdown');const off=new OffscreenCanvas(192,132),ctx=off.getContext('2d');ctx.fillStyle='#927bd9';ctx.fillRect(0,0,192,132);push('offscreen-submit');off.convertToBlob({type:'image/png'}).then(()=>push('offscreen-complete'));}},true);
   new MutationObserver(list=>{if(a.active)for(const m of list)if(m.target.dataset.localGlass==='r3-sample-thumb')push('pressure-DOM',{value:m.target.dataset.pressure,version:m.target.dataset.geometryVersion});}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-pressure']});
  });
  await p.goto('http://127.0.0.1:5174/mobile-review.html');await p.evaluate(()=>document.fonts.ready);const slider=p.locator('#range-r3-sample'),thumb=p.locator('[data-local-glass="r3-sample-thumb"]');await slider.evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForFunction(()=>document.querySelector('[data-local-glass="r3-sample-thumb"]').dataset.opticalMode==='scene');await p.waitForTimeout(650);
  const r=await thumb.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2,cdp=await c.newCDPSession(p);await p.evaluate(()=>window.__debug.active=true);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,radiusX:4,radiusY:4,force:1}]});await p.waitForTimeout(250);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(100);
  return await p.evaluate(()=>{window.__debug.active=false;return window.__debug.events;});
 }finally{await c.close();}
}
