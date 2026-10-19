async page=>{
 await page.goto('http://127.0.0.1:5174/work/r3-controlled-proof/index.html');
 return await page.evaluate(async()=>{
  const current=await import('/src/backdropOptics.ts'),before=await import('/work/r3-controlled-proof/backdropOptics-pre-async.ts'),geometry=await import('/src/geometry.ts');
  const old=before.createBackdropOptics(),now=current.createBackdropOptics(),rows=[];
  const decode=async href=>{const img=new Image();img.src=href;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return{width:c.width,height:c.height,pixels:x.getImageData(0,0,c.width,c.height).data};};
  try{
   for(const [kind,w,h,fullness]of[['thumb',70.125,40.25,2.4],['lens',166.125,104.25,3.4],['field',320.125,68.25,3.4],['circle',58.125,58.125,3.4]]){
    for(const mode of ['sync','async']){
     const width=w+(mode==='async'?.125:0),height=h,scale=Math.max(3,Math.min(6,264/height));
     const shape={...geometry.contourShape(width-12,height-8,fullness),x:width/2,y:height/2};if(kind==='circle')shape.r=Math.min(shape.w,shape.h)/2;
     const input={path:geometry.shellPath(shape),width:width*scale,height:height*scale,camera:{x:width/2,y:height/2+8/scale,zoom:scale},channels:'rg',version:1};
     const reference=old.render(input),candidate=mode==='async'?await now.renderAsync(input):now.render(input);
     const a=await decode(reference.href),b=await decode(candidate.href);let differing=0,maxDelta=0;
     if(a.width!==b.width||a.height!==b.height)throw Error('normal dimensions differ');
     for(let i=0;i<a.pixels.length;i++){const d=Math.abs(a.pixels[i]-b.pixels[i]);if(d)differing++;maxDelta=Math.max(maxDelta,d);}
     const row={kind,mode,width:a.width,height:a.height,channels:a.pixels.length,differingChannels:differing,maxDelta};rows.push(row);if(differing)throw Error(JSON.stringify(row));
    }
   }
   return{date:'2026-10-19',engine:navigator.userAgent,reference:'review-20261019-r2-published:src/backdropOptics.ts',scope:'Decoded RGBA of exact pre-refactor synchronous field versus current synchronous and native toBlob async PNG paths.',rows,diagnostics:current.getBackdropOpticsDiagnostics(),pass:true};
  }finally{old.destroy();now.destroy();}
 });
}
