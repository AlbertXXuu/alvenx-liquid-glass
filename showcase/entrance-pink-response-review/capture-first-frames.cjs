// Development-only Playwright run-code helper. Open this review through Vite
// first. It returns transparent PNG data for first-frame.ts; nothing is written
// into production and no readback occurs in the interactive component.
async page=>page.evaluate(async()=>{
 const [{createReferenceVolume},{refinementGeometry},{DEFAULT_SETTINGS}]=await Promise.all([
  import('/showcase/entrance-pink-response-review/reference-volume.ts'),
  import('/showcase/entrance-pink-response-review/geometry.ts'),
  import('/src/reviewSettings.ts'),
 ]);
 const frames=[];
 for(const diameter of [44,54]){
  const shape=refinementGeometry(0,diameter),full=refinementGeometry(1,diameter);
  const canvas=document.createElement('canvas');
  const renderer=createReferenceVolume(canvas,full.width+2,full.height,diameter);
  try{
   const deadline=performance.now()+12000;
   while(!renderer.ready&&performance.now()<deadline){renderer.poll(16);if(!renderer.ready)await new Promise(requestAnimationFrame);}
   if(!renderer.ready)throw Error(canvas.dataset.volumeError||'First-frame shader preparation failed.');
   renderer.draw(shape.path,0,DEFAULT_SETTINGS);
   // Copy synchronously after drawArrays, before the default drawing buffer is
   // cleared. Its full texture extent matches live rendering without stretching.
   const crop=document.createElement('canvas');crop.width=canvas.width;crop.height=canvas.height;
   const context=crop.getContext('2d');if(!context)throw Error('2D capture context unavailable.');
   context.scale(canvas.width/(full.width+2),canvas.height/full.height);
   context.clip(new Path2D(shape.path));context.drawImage(canvas,0,0,full.width+2,full.height);
   const png=crop.toDataURL('image/png');
   const bytes=Uint8Array.from(atob(png.split(',')[1]),c=>c.charCodeAt(0));
   const digest=await crypto.subtle.digest('SHA-256',bytes);
   frames.push({diameter,width:canvas.width,height:canvas.height,cssWidth:shape.width,textureCssWidth:full.width+2,cssHeight:shape.height,path:shape.path,png,sha256:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')});
  }finally{renderer.destroy();}
 }
 return {createdAt:new Date().toISOString(),source:'Isolated pink-response renderer, exact resting contour and default material; transparent C2 clip.',frames};
})
