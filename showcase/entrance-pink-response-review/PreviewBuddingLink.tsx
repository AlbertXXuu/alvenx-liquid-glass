import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LiquidControl, type LiquidContourFrame } from '../../src/LiquidControl';
import type { GlassClock } from '../../src/GlassClock';
import { refinementGeometry, type ReviewBuddingTransform } from './geometry';
import { createReferenceVolume, type ReviewLighting } from './reference-volume';
import { firstFrames } from './first-frame';
import { emptyMotion,lobeTransform,springStep,boundedPull,type LobeMotion } from './motion';

type Lobe='mother'|'chamber';
type Gesture={name:Lobe;pointerId:number;x:number;y:number;dx:number;dy:number;startPullX:number;startPullY:number;anchorX:number;anchorY:number;moved:boolean;element:HTMLElement};

// Keep the soft contact shadow continuous beneath the translucent body. Cutting
// it out with SourceAlpha leaves a pale antialiased seam at narrow/high-DPR sizes.
function FirstFrame({enhanced,onActivate,href}:{enhanced:boolean;onActivate:()=>void;href:string}){
 const shadowId=`first-shadow-${useId().replace(/[^a-z0-9]/gi,'')}`;
 return <span className="volume-budding-first-frame" data-static-first-frame="true">
  {([54,44] as const).map(d=><span key={d} data-first-frame={d} className={`volume-first-frame-${d}`}>
   {!enhanced&&<svg className="volume-first-frame-contact" width={firstFrames[d].cssWidth} height={firstFrames[d].cssHeight} aria-hidden="true"><defs><filter id={`${shadowId}-${d}`} x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.1" result="blur"/><feOffset in="blur" dy="2.8" result="offset"/><feFlood floodColor="#293451" floodOpacity=".105" result="ink"/><feComposite in="ink" in2="offset" operator="in" result="shadow"/></filter></defs><path d={firstFrames[d].path} fill="#293451" filter={`url(#${shadowId}-${d})`}/></svg>}
   <span className="volume-first-frame-backdrop" style={{clipPath:`path('${firstFrames[d].path}')`}}/>
   <img className="volume-first-frame-texture" src={firstFrames[d].png} width={firstFrames[d].width} height={firstFrames[d].height} style={{width:firstFrames[d].textureCssWidth}} alt="" aria-hidden="true" draggable="false"/>
  </span>)}
  {!enhanced&&<a href={href} data-prejs-budding="true" aria-label="Explore Liquid Glass" className="volume-first-frame-action" onClick={e=>{e.preventDefault();onActivate();}}/>}
 </span>;
}

/** The accepted R7 entrance, with its first frame, continuous material and
 * reversible growth. Its native destination remains available without JS. */
export type PreviewBuddingLinkProps = {
 id: string;
 clock: GlassClock;
 href: string;
 toggleLabel?: string;
 /** Opt one above-the-fold entrance into the optional early-activation script. */
 earlyActivation?: boolean;
};
export function PreviewBuddingLink({clock,id,href,toggleLabel='Toggle explore link',earlyActivation=false}:PreviewBuddingLinkProps) {
 const [enhanced,setEnhanced]=useState(false);
 useLayoutEffect(()=>setEnhanced(true),[]);
 const diameter=54,light=true;
 const [growth,setGrowth]=useState(0),[expanded,setExpanded]=useState(false),[size,setSize]=useState(diameter),[firstFrameReady,setFirstFrameReady]=useState(false);
 const state=useRef({growth:0,velocity:0,target:0,active:false,visible:true});
 const earlyFocused=useRef(false);
 const lobeState=useRef({mother:emptyMotion(),chamber:emptyMotion()}),held=useRef<'mother'|'chamber'|null>(null);
 const gesture=useRef<Gesture|null>(null),motionRevision=useRef(0),suppressClick=useRef(0);
 const pullVelocity=useRef({mother:{pullX:0,pullY:0},chamber:{pullX:0,pullY:0}});
 const [lobes,setLobes]=useState(lobeState.current);
 const host=useRef<HTMLSpanElement>(null),volumeCanvas=useRef<HTMLCanvasElement>(null),volumeRenderer=useRef<ReturnType<typeof createReferenceVolume>|null>(null),shadowPath=useRef<SVGPathElement>(null);
 const materialFrames=useRef(new Map<string,{growth:number;transform:ReviewBuddingTransform;lighting:ReviewLighting}>()),commitMaterial=useRef(()=>{});
 const uid=`volume-budding-${useId().replace(/[^a-z0-9]/gi,'')}`;
 const shape=useMemo(()=>refinementGeometry(growth,size),[growth,size]);
 const currentShape=useRef(shape);currentShape.current=shape;
 const visiblePath=useRef(shape.path);
 const wakeMotion=useCallback(()=>{motionRevision.current++;clock.wake();},[clock]);
 const releaseGesture=useCallback((cancelled=false)=>{
  const active=gesture.current;gesture.current=null;held.current=null;
  if(active){
   if(active.moved&&!cancelled)suppressClick.current=performance.now()+700;
   if(active.element.hasPointerCapture(active.pointerId))active.element.releasePointerCapture(active.pointerId);
  }
  wakeMotion();
 },[wakeMotion]);
 useLayoutEffect(()=>{const media=matchMedia('(max-width:360px)'),measure=()=>setSize(media.matches?44:diameter);measure();media.addEventListener('change',measure);return()=>media.removeEventListener('change',measure);},[diameter]);
 const animate=useCallback((target:number)=>{
  const s=state.current;s.target=target;setExpanded(target===1);
  if(clock.reduced){s.growth=target;s.velocity=0;s.active=false;setGrowth(target);}else s.active=true;
  clock.wake();
 },[clock]);
 useLayoutEffect(()=>{
  if(!volumeCanvas.current||!light||!enhanced)return;
  setFirstFrameReady(false);
  const full=refinementGeometry(1,size);let renderer:ReturnType<typeof createReferenceVolume>|null=null,stopPreparation:(()=>void)|null=null;
  const prepare=()=>{
   if(renderer||!volumeCanvas.current)return;
   try{renderer=createReferenceVolume(volumeCanvas.current,full.width+2,full.height,size);volumeRenderer.current=renderer;
    const poll=(_delta:number,elapsed:number)=>{const pending=renderer?.poll(elapsed)??false;if(!pending){stopPreparation?.();stopPreparation=null;if(renderer?.ready){commitMaterial.current();clock.invalidateLayout();}}return pending;};
    if(renderer.poll())stopPreparation=clock.subscribe(poll);else if(renderer.ready){commitMaterial.current();clock.invalidateLayout();}
   }catch(error){volumeCanvas.current.dataset.volumeError=String(error);}
  };
  // Prewarm as the pearl approaches the viewport, before first activation.
  const visibility=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){prepare();visibility.disconnect();}},{rootMargin:'160px'});
  if(host.current)visibility.observe(host.current);
  return()=>{visibility.disconnect();stopPreparation?.();renderer?.destroy();volumeRenderer.current=null;};
 },[light,size,enhanced]);
 useLayoutEffect(()=>{
  const displayed=host.current?.querySelector<SVGSVGElement>('.local-edge');
  const flush=()=>{
   const path=displayed?.querySelector('path')?.getAttribute('d'),frame=path?materialFrames.current.get(path):undefined;
   if(!path||!frame)return;
   volumeRenderer.current?.draw(path,frame.growth,clock.material,frame.transform,frame.lighting);
   if(volumeRenderer.current?.ready)setFirstFrameReady(true);
   shadowPath.current?.setAttribute('d',path);
  };
  commitMaterial.current=flush;
  const observer=new MutationObserver(flush);
  if(displayed)observer.observe(displayed,{subtree:true,childList:true,attributes:true,attributeFilter:['d']});
  flush();
  return()=>{observer.disconnect();commitMaterial.current=()=>{};materialFrames.current.clear();};
 },[clock,size,enhanced]);
 useLayoutEffect(()=>{
  const node=host.current;
  const observer=new IntersectionObserver(entries=>{
   const s=state.current;s.visible=entries.some(e=>e.isIntersecting);
   if(s.visible)clock.wake();else if(s.growth>0||s.target>0){s.growth=0;s.velocity=0;s.target=0;s.active=false;setExpanded(false);setGrowth(0);}
  });if(node)observer.observe(node);
  let localMotionActive=false,lastPointer=-1,lastLayout=-1,lastReduced=clock.reduced,lastMotion=-1;
  const stop=clock.subscribe(delta=>{
   const s=state.current;if(!s.visible)return false;
   if(!s.active&&!localMotionActive&&lastPointer===clock.pointerRevision&&lastLayout===clock.layoutRevision&&lastReduced===clock.reduced&&lastMotion===motionRevision.current)return false;
   lastPointer=clock.pointerRevision;lastLayout=clock.layoutRevision;lastReduced=clock.reduced;lastMotion=motionRevision.current;
   if(s.active){if(clock.reduced){s.growth=s.target;s.velocity=0;s.active=false;}else{
    const dt=delta/1000,omega=8.5,x=s.growth-s.target,velocity=s.velocity,decay=Math.exp(-omega*dt),blend=velocity+omega*x;
    s.growth=s.target+(x+blend*dt)*decay;s.velocity=(velocity-omega*blend*dt)*decay;
    if(s.growth<0||s.growth>1){s.growth=Math.max(0,Math.min(1,s.growth));s.velocity=0;}
    if(Math.abs(s.growth-s.target)<.00004&&Math.abs(s.velocity)<.0005){s.growth=s.target;s.velocity=0;s.active=false;}
   }
   setGrowth(s.growth);}
   let moving=false,changed=false;
   const bounds=node?.getBoundingClientRect(),blend=clock.reduced?1:1-Math.exp(-delta/75);
   const gap=currentShape.current.chamber.x-currentShape.current.mother.x-currentShape.current.mother.width;
   const proximity=s.growth<.95?30:Math.max(1,Math.min(24,gap/2));
   for(const name of ['mother','chamber'] as const){
    const rect=currentShape.current[name],x=clock.pointer.x-(bounds?.left??0),y=clock.pointer.y-(bounds?.top??0);
    const distance=Math.hypot(Math.max(rect.x-x,0,x-rect.x-rect.width),Math.max(rect.y-y,0,y-rect.y-rect.height));
    const active=gesture.current?.name===name?gesture.current:null;
    const available=name==='mother'||s.growth>=.95;
    const near=available&&!clock.reduced&&(!gesture.current||active)?(active?1:Math.max(0,1-distance/proximity)):0;
    const nx=Math.max(-1,Math.min(1,(x-rect.x)/Math.max(1,rect.width)*2-1)),ny=Math.max(-1,Math.min(1,(y-rect.y)/Math.max(1,rect.height)*2-1));
    const limit=Math.min(name==='mother'?4.8:6,rect.height*.09)*Math.min(1,clock.strength/2.5);
    const pull=(axis:'X'|'Y')=>active&&limit>0&&!clock.reduced?Math.max(-limit,Math.min(limit,active[axis==='X'?'startPullX':'startPullY']+boundedPull(active[axis==='X'?'dx':'dy'],limit))):0;
    const target={near,press:near>0&&held.current===name?1:0,x:near*(active?active.anchorX:nx),y:near*(active?active.anchorY:ny),pullX:pull('X'),pullY:pull('Y')};
    const previous=lobeState.current[name],next={...previous};
    for(const channel of ['near','press','x','y'] as const){const difference=target[channel]-previous[channel];moving ||= Math.abs(difference)>=.0008;next[channel]=Math.abs(difference)<.0008?target[channel]:previous[channel]+difference*blend;changed ||= next[channel]!==previous[channel];}
    for(const channel of ['pullX','pullY'] as const){
     const velocity=pullVelocity.current[name][channel],settled=Math.abs(target[channel]-previous[channel])<.002&&Math.abs(velocity)<.02;
     const [value,speed]=clock.reduced||settled?[target[channel],0]:springStep(previous[channel],velocity,target[channel],delta/1000);
     next[channel]=value;pullVelocity.current[name][channel]=speed;moving ||= !settled;changed ||= value!==previous[channel];
    }
    const returning=Math.abs(next.pullX)+Math.abs(next.pullY)>.02;
    next.anchorX=active?.anchorX??(returning?previous.anchorX:nx);next.anchorY=active?.anchorY??(returning?previous.anchorY:ny);
    changed ||= next.anchorX!==previous.anchorX||next.anchorY!==previous.anchorY;
    lobeState.current[name]=next;
   }
   localMotionActive=moving;if(changed)setLobes({...lobeState.current});
   return s.active||moving;
  });
  const hitContext=document.createElement('canvas').getContext('2d');
  const outside=(event:globalThis.PointerEvent)=>{
   if(!event.isPrimary)return;
   if(!node||(!state.current.target&&!state.current.growth))return;
   const target=event.target as Element;
   if(node.contains(target)){
    if(target.closest('button,a'))return;
    const bounds=node.getBoundingClientRect();
    if(hitContext?.isPointInPath(new Path2D(visiblePath.current),event.clientX-bounds.left,event.clientY-bounds.top))return;
   }
   animate(0);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&node?.contains(document.activeElement)){animate(0);node.querySelector<HTMLButtonElement>('button')?.focus();}};
  const release=(event:Event)=>{if('pointerId' in event&&gesture.current&&event.pointerId!==gesture.current.pointerId)return;if(held.current)releaseGesture(event.type!=='pointerup');};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  return()=>{stop();observer.disconnect();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);};
 },[clock,animate,enhanced,releaseGesture]);
 const toggle=()=>animate(state.current.target===1?0:1);
 useLayoutEffect(()=>{if(!enhanced)earlyFocused.current=host.current?.querySelector('[data-prejs-budding]')===document.activeElement;else if(earlyFocused.current)host.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});},[enhanced]);
 useLayoutEffect(()=>{if(!enhanced||!earlyActivation)return;const early=globalThis as typeof globalThis&{__alvenxVolumeBuddingIntent?:boolean;__alvenxVolumeBuddingReleaseEarly?:(activate:()=>void)=>(()=>void)|void};if(early.__alvenxVolumeBuddingIntent)animate(1);const release=early.__alvenxVolumeBuddingReleaseEarly?.(()=>animate(1));delete early.__alvenxVolumeBuddingIntent;delete early.__alvenxVolumeBuddingReleaseEarly;host.current?.removeAttribute('data-early-intent');return release;},[enhanced,animate,earlyActivation]);
 const contour=useCallback((frame:LiquidContourFrame)=>{
  const base=currentShape.current;
  const transform:ReviewBuddingTransform={mother:lobeTransform(lobes.mother,frame.intensity,base.mother),chamber:lobeTransform(lobes.chamber,frame.intensity,base.chamber)};
  const next=refinementGeometry(growth,size,transform);
  visiblePath.current=next.path;
  // The contour is requested before LiquidControl commits its optical frame.
  // Draw material only when the exact matching rim/clip is present in the DOM.
  materialFrames.current.set(next.path,{growth,transform,lighting:{mother:lobes.mother,chamber:lobes.chamber}});
  if(materialFrames.current.size>8)materialFrames.current.delete(materialFrames.current.keys().next().value!);
  commitMaterial.current();
  return next.path;
 },[growth,size,lobes]);
 const m=shape.mother,c=shape.chamber;
 const ct=lobeTransform(lobes.chamber,clock.strength,c);
 return <span ref={host} className="glass-budding-link volume-budding-bud" data-volume-budding={id} data-budding-early={earlyActivation} data-growth={growth.toFixed(5)} data-ready={growth===1&&expanded} data-expanded={expanded} data-detached={growth>=.95} data-diameter={size} data-volume-light={light} data-enhanced={enhanced} data-mother-near={lobes.mother.near.toFixed(4)} data-chamber-near={lobes.chamber.near.toFixed(4)} style={enhanced?{width:shape.width,height:shape.height}:undefined}
  onPointerDownCapture={e=>{
   if(!e.isPrimary||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||gesture.current)return;
   const action=(e.target as Element).closest<HTMLElement>('button,a');if(!action||!e.currentTarget.contains(action))return;
   const name:Lobe=action.tagName==='BUTTON'?'mother':'chamber',rect=currentShape.current[name],bounds=e.currentTarget.getBoundingClientRect();
   held.current=name;suppressClick.current=0;
   gesture.current={name,pointerId:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,startPullX:lobeState.current[name].pullX,startPullY:lobeState.current[name].pullY,anchorX:Math.max(-1,Math.min(1,(e.clientX-bounds.left-rect.x)/rect.width*2-1)),anchorY:Math.max(-1,Math.min(1,(e.clientY-bounds.top-rect.y)/rect.height*2-1)),moved:false,element:action};
   action.setPointerCapture(e.pointerId);wakeMotion();
  }}
  onPointerMoveCapture={e=>{const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;g.dx=e.clientX-g.x;g.dy=e.clientY-g.y;g.moved ||= Math.hypot(g.dx,g.dy)>6;wakeMotion();}}
  onLostPointerCapture={e=>{if(gesture.current?.pointerId===e.pointerId)releaseGesture(true);}}
  onClickCapture={e=>{if(e.detail>0&&performance.now()<suppressClick.current){suppressClick.current=0;e.preventDefault();e.stopPropagation();}}}
  onDragStart={e=>e.preventDefault()}>
  {(!enhanced||(!firstFrameReady&&growth===0&&light))&&<FirstFrame enhanced={enhanced} onActivate={toggle} href={href}/>}
  {enhanced&&light&&<svg className="volume-budding-contact" width={shape.width} height={shape.height} aria-hidden="true"><defs><filter id={`${uid}-contact`} x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.1" result="blur"/><feOffset in="blur" dy="2.8" result="offset"/><feFlood floodColor="#293451" floodOpacity=".105" result="ink"/><feComposite in="ink" in2="offset" operator="in" result="shadow"/></filter></defs><path ref={shadowPath} fill="#293451" filter={`url(#${uid}-contact)`}/></svg>}
  {enhanced&&<LiquidControl id={`${id}-body`} clock={clock} kind="field" className="glass-budding-body" contour={contour}>
   {light&&<canvas ref={volumeCanvas} className="volume-budding-volume-light" aria-hidden="true"/>}
   <button type="button" className="glass-budding-trigger" aria-label={toggleLabel} aria-expanded={expanded} aria-controls={`${id}-destination`} onClick={toggle} style={{left:m.x,top:m.y,width:m.width,height:m.height}}/>
   {growth>0&&<a id={`${id}-destination`} href={href} className="glass-budding-destination volume-budding-destination" inert={growth!==1||!expanded} aria-hidden={growth!==1||!expanded} style={{left:c.x+ct.offsetX-c.width*(ct.scaleX-1)/2,top:c.y+ct.offsetY-c.height*(ct.scaleY-1)/2,width:c.width*ct.scaleX,height:c.height*ct.scaleY,fontSize:size<=44?14:15,opacity:Math.max(0,(growth-.8)/.2),paddingLeft:6.4,paddingRight:6}}>explore me!</a>}
  </LiquidControl>}
 </span>;
}
