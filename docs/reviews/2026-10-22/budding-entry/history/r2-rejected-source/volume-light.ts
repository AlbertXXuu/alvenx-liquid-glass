type Point=[number,number];
type Segment={p0:Point;p1:Point;p2:Point;p3:Point};
const clamp=(v:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));

function sampleContour(path:string):Point[]{
 const values=(path.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number),points:Point[]=[];
 let previous:Point=[values[0],values[1]];
 for(let k=2;k+5<values.length;k+=6){
  const s:Segment={p0:previous,p1:[values[k],values[k+1]],p2:[values[k+2],values[k+3]],p3:[values[k+4],values[k+5]]};
  for(let i=0;i<10;i++){const t=i/10,u=1-t;points.push([u*u*u*s.p0[0]+3*u*u*t*s.p1[0]+3*u*t*t*s.p2[0]+t*t*t*s.p3[0],u*u*u*s.p0[1]+3*u*u*t*s.p1[1]+3*u*t*t*s.p2[1]+t*t*t*s.p3[1]]);}
  previous=s.p3;
 }
 return points;
}

/** Review-only transparent lighting. The normal varies throughout the body:
 * each exact contour cross-section supplies a circular depth section, rather
 * than a blurred-alpha plateau. No page pixels, background colors, or text are
 * captured here; LiquidControl still supplies the actual-backdrop optics. */
export function createVolumeLight(canvas:HTMLCanvasElement,width:number,height:number){
 // Soft illumination does not need Retina-sized maps. This fixed allocation
 // covers the final control at 1.5x CSS scale and never resizes during growth.
 const scale=1.5,w=Math.ceil(width*scale),h=Math.ceil(height*scale),size=w*h;
 canvas.width=w;canvas.height=h;canvas.style.width=`${w/scale}px`;canvas.style.height=`${h/scale}px`;
 const context=canvas.getContext('2d',{alpha:true});if(!context)throw new Error('Review volume lighting requires a 2D canvas.');
 const image=context.createImageData(w,h),z=new Float32Array(size),top=new Float32Array(w),bottom=new Float32Array(w);
 const lx=-.38,ly=-.48,lz=.79,ln=1/Math.hypot(lx,ly,lz),hx=lx*ln,hy=ly*ln,hz=lz*ln+1,hn=1/Math.hypot(hx,hy,hz);
 let previousPath='',renders=0,totalMs=0;
 return {draw(path:string,diameter:number){
  if(path===previousPath)return;previousPath=path;
  const started=performance.now(),points=sampleContour(path);top.fill(Infinity);bottom.fill(-Infinity);z.fill(0);
  for(let k=0;k<points.length;k++){
   let a=points[k],b=points[(k+1)%points.length];if(a[0]>b[0])[a,b]=[b,a];
   const dx=b[0]-a[0];if(dx<1e-8)continue;
   const first=Math.max(0,Math.ceil(a[0]*scale-.5)),last=Math.min(w-1,Math.floor(b[0]*scale-.5));
   for(let x=first;x<=last;x++){
    const y=a[1]+(((x+.5)/scale-a[0])/dx)*(b[1]-a[1]);
    if(y<top[x])top[x]=y;if(y>bottom[x])bottom[x]=y;
   }
  }
  for(let x=0;x<w;x++){
   if(!Number.isFinite(top[x])||!Number.isFinite(bottom[x]))continue;
   const cy=(top[x]+bottom[x])/2,r=(bottom[x]-top[x])/2;
   for(let y=Math.max(0,Math.floor(top[x]*scale));y<=Math.min(h-1,Math.ceil(bottom[x]*scale));y++){
    const dy=(y+.5)/scale-cy;
    // Mother becomes a true hemispherical cap; the expanding chamber and
    // slimmer neck use the same continuous cap, with no central flat shelf.
    z[y*w+x]=Math.sqrt(Math.max(0,r*r-dy*dy))*.88;
   }
  }
  const pixels=image.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const index=y*w+x,offset=index*4,depth=z[index];
   if(depth<=0){pixels[offset+3]=0;continue;}
   const left=z[y*w+Math.max(0,x-1)],right=z[y*w+Math.min(w-1,x+1)],up=z[Math.max(0,y-1)*w+x],down=z[Math.min(h-1,y+1)*w+x];
   const dx=(right-left)*scale*.5,dy=(down-up)*scale*.5,inv=1/Math.hypot(dx,dy,1),nx=-dx*inv,ny=-dy*inv,nz=inv;
   // A broad overhead/left softbox and a weaker frontal fill. The half-vector
   // term follows the volume renderer's full-field normal lighting principle.
   const diffuse=Math.max(0,(nx*lx+ny*ly+nz*lz)*ln),half=Math.max(0,(nx*hx+ny*hy+nz*hz)*hn);
   const broad=half**15,focused=half**85,shoulder=(1-nz)**.72;
   const light=broad*.30+focused*.40,shade=Math.min(.095,clamp(.65-diffuse)*.13+shoulder*.035);
   const amount=light-shade;
   // Only achromatic white reflection and neutral attenuation are added.
   // Their alpha keeps the underlying transmitted backdrop visible.
   const color=amount>=0?255:35;pixels[offset]=color;pixels[offset+1]=color;pixels[offset+2]=color;
   const boundary=Math.min((y+.5)/scale-top[x],bottom[x]-(y+.5)/scale);
   pixels[offset+3]=Math.round(clamp(Math.abs(amount),0,.78)*clamp(boundary*scale)*255);
  }
  context.putImageData(image,0,0);
  renders++;const ms=performance.now()-started;totalMs+=ms;
  canvas.dataset.volumeLightRenders=String(renders);canvas.dataset.volumeLightComputeMs=ms.toFixed(3);canvas.dataset.volumeLightMeanMs=(totalMs/renders).toFixed(3);canvas.dataset.volumeLightPixels=String(size);canvas.dataset.volumeHeightModel='contour-cross-section';
 },destroy(){previousPath='';context.clearRect(0,0,w,h);}};
}
