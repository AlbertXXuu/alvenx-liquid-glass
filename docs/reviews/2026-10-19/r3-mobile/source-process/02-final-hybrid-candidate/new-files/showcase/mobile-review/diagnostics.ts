export type InputRecord={event:string;time:number;pointer?:string;pointerId?:number;button?:number;buttons?:number;target:string;capture?:boolean;nextFrameMs?:number;secondFrameMs?:number;moves?:number;firstMoveMs?:number;lastX?:number;lastY?:number};
/** Local-only bounded trace. RAF timing is scheduling evidence, not paint latency. */
export function observeDeviceInput(){
 const records:InputRecord[]=[],frames=new Set<number>(),active=new Map<string,InputRecord>();
 const append=(item:InputRecord)=>{records.push(item);if(records.length>80)records.shift();};
 const record=(event:Event)=>{
  const target=event.target instanceof Element?event.target:null;
  if(!target?.closest('.lab'))return;
  const pointer=event instanceof PointerEvent?event:undefined,mouse=event instanceof MouseEvent?event:undefined;
  const key=pointer?`pointer:${pointer.pointerId}`:'mouse';
  if(event.type==='pointermove'||event.type==='mousemove'){
   const start=active.get(key);if(!start||!mouse)return;
   start.moves=(start.moves||0)+1;start.firstMoveMs??=performance.now()-start.time;
   start.lastX=mouse.clientX;start.lastY=mouse.clientY;start.buttons=mouse.buttons;return;
  }
  const item:InputRecord={event:event.type,time:performance.now(),pointer:pointer?.pointerType,pointerId:pointer?.pointerId,button:mouse?.button,buttons:mouse?.buttons,target:target.closest('[aria-label]')?.getAttribute('aria-label')||target.closest('[data-local-glass]')?.getAttribute('data-local-glass')||target.tagName};
  if(pointer)item.capture=target.hasPointerCapture(pointer.pointerId);
  append(item);
  if(event.type==='pointerdown'||event.type==='mousedown'){
   item.moves=0;active.set(key,item);
   let first=0,second=0;first=requestAnimationFrame(()=>{frames.delete(first);item.nextFrameMs=performance.now()-item.time;second=requestAnimationFrame(()=>{frames.delete(second);item.secondFrameMs=performance.now()-item.time;});frames.add(second);});frames.add(first);
  }else if(event.type==='pointerup'||event.type==='pointercancel'||event.type==='mouseup')active.delete(key);
 };
 const stop=(event:Event)=>{if(records.length)append({event:event.type,time:performance.now(),target:event.type==='visibilitychange'?document.visibilityState:'window'});active.clear();};
 const names=['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','mousedown','mousemove','mouseup'];
 for(const name of names)document.addEventListener(name,record,{capture:true,passive:true});
 window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);
 return{snapshot:()=>({userAgent:navigator.userAgent,dpr:devicePixelRatio,coarse:matchMedia('(pointer:coarse)').matches,hover:matchMedia('(any-hover:hover)').matches,records:records.map(x=>({...x,time:+x.time.toFixed(2),firstMoveMs:x.firstMoveMs===undefined?undefined:+x.firstMoveMs.toFixed(2),nextFrameMs:x.nextFrameMs===undefined?undefined:+x.nextFrameMs.toFixed(2),secondFrameMs:x.secondFrameMs===undefined?undefined:+x.secondFrameMs.toFixed(2)}))}),clear:()=>{records.length=0;active.clear();},destroy:()=>{for(const name of names)document.removeEventListener(name,record,true);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',stop);for(const frame of frames)cancelAnimationFrame(frame);frames.clear();active.clear();}};
}
