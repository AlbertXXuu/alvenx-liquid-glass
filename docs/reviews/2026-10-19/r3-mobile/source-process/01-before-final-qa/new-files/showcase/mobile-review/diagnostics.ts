export type InputRecord={event:string;time:number;pointer?:string;target:string;capture?:boolean;nextFrameMs?:number;secondFrameMs?:number};
/** Local-only bounded trace. RAF timing is scheduling evidence, not paint latency. */
export function observeDeviceInput(){
 const records:InputRecord[]=[];let frames=new Set<number>();
 const record=(event:Event)=>{
  const target=event.target as Element|null;
  if(!target?.closest('.lab'))return;
  const pointer=event instanceof PointerEvent?event:undefined;
  const item:InputRecord={event:event.type,time:performance.now(),pointer:pointer?.pointerType,target:target.closest('[aria-label]')?.getAttribute('aria-label')||target.closest('[data-local-glass]')?.getAttribute('data-local-glass')||target.tagName};
  if(pointer&&target instanceof Element)item.capture=target.hasPointerCapture(pointer.pointerId);
  records.push(item);if(records.length>80)records.shift();
  if(event.type==='pointerdown'||event.type==='mousedown'){
   let first=0,second=0;first=requestAnimationFrame(()=>{frames.delete(first);item.nextFrameMs=performance.now()-item.time;second=requestAnimationFrame(()=>{frames.delete(second);item.secondFrameMs=performance.now()-item.time;});frames.add(second);});frames.add(first);
  }
 };
 const names=['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','mousedown','mouseup'];
 for(const name of names)document.addEventListener(name,record,{capture:true,passive:true});
 return{snapshot:()=>({userAgent:navigator.userAgent,dpr:devicePixelRatio,coarse:matchMedia('(pointer:coarse)').matches,hover:matchMedia('(any-hover:hover)').matches,records:records.map(x=>({...x,time:+x.time.toFixed(2),nextFrameMs:x.nextFrameMs===undefined?undefined:+x.nextFrameMs.toFixed(2),secondFrameMs:x.secondFrameMs===undefined?undefined:+x.secondFrameMs.toFixed(2)}))}),clear:()=>{records.length=0;},destroy:()=>{for(const name of names)document.removeEventListener(name,record,true);for(const frame of frames)cancelAnimationFrame(frame);frames.clear();}};
}
