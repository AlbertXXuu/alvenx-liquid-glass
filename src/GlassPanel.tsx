import {useCallback,useContext,useEffect,useId,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {ControlledScene,ControlledSceneContext,type ControlledSceneSize} from './ControlledScene';
import {acquireBalancedOptics} from './balancedOptics';
import type {PreviewClock} from './GlassClock';
import {resolveGlassOptics} from './opticalSupport';
import {cubicFramePath} from './geometry';

export type GlassPanelProps={id:string;clock:PreviewClock;children:ReactNode;label:string;className?:string;style?:CSSProperties;diagnostic?:boolean;scrollable?:boolean};
function PanelPixels({clock}:{clock:PreviewClock}){
 const scene=useContext(ControlledSceneContext),latest=useRef(scene);latest.current=scene;
 const canvas=useRef<HTMLCanvasElement>(null),fallback=useRef<HTMLDivElement>(null),shown=useRef(false),dirty=useRef(true),[mode,setMode]=useState('flat'),[error,setError]=useState('');
 const edge=useRef<SVGPathElement>(null);
 const edgeGradient=`panel-light-${useId().replace(/[^a-z0-9-]/gi,'')}`;
 const studio=clock.studioLight?.gradients;
 useEffect(()=>{
  const el=canvas.current,host=el?.parentElement;if(!el||!host)return;
  const optics=acquireBalancedOptics();let failed=false,lastMaterial=clock.material,lastOptics=clock.optics;
  const draw=()=>{
   if(!shown.current||document.hidden)return false;
   if(lastOptics!==clock.optics){failed=false;setError('');dirty.current=true;lastOptics=clock.optics}
   if(lastMaterial!==clock.material){dirty.current=true;lastMaterial=clock.material}
   if(!dirty.current)return false;dirty.current=false;
   const degrade=()=>{setMode(resolveGlassOptics(clock.optics==='flat'?'flat':'native'));if(fallback.current){const m=clock.material;fallback.current.style.backdropFilter=`blur(${m.blurLevel+m.progressiveBlur*.35}px)`;fallback.current.style.setProperty('-webkit-backdrop-filter',`blur(${m.blurLevel+m.progressiveBlur*.35}px)`);fallback.current.style.background=`rgba(240,242,255,${m.glassOpacity})`}};
   const source=latest.current?.raster;if(!source||clock.optics!=='auto'||failed){degrade();return false}
   try{
    const {width,height}=host.getBoundingClientRect(),inset=12;
    const radius=Math.min(28,(Math.min(width,height)/2-inset)*.3);
    const path=cubicFramePath(width-2*inset,height-2*inset,radius,inset,inset);
    optics.render(el,source,{width,height,origin:{x:0,y:0},center:{x:width/2,y:height/2},half:{x:width/2,y:height/2},exponent:3.4,path,panel:true,material:clock.material});setMode('balanced');setError('');
   }catch(reason){failed=true;degrade();setError(String(reason))}
   return false;
  };
  const measure=()=>{
   const {width,height}=host.getBoundingClientRect(),inset=12;
   const path=cubicFramePath(width,height,24);
   if(!path)return;
   host.style.clipPath=`path('${path}')`;
   edge.current?.setAttribute('d',path);
   const inner=cubicFramePath(width-2*inset,height-2*inset,Math.min(28,(Math.min(width,height)/2-inset)*.3));
   if(fallback.current&&inner)fallback.current.style.clipPath=`path('${inner}')`;
   dirty.current=true;clock.wake();
  };
  const resize=new ResizeObserver(measure);resize.observe(host);measure();
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{shown.current=entries.some(e=>e.isIntersecting);if(shown.current){dirty.current=true;clock.wake()}});observer?.observe(host);if(!observer)shown.current=true;
  const unsubscribe=clock.subscribe(draw);
  return()=>{resize.disconnect();observer?.disconnect();unsubscribe();optics.release()};
 },[clock]);
 useEffect(()=>{dirty.current=true;clock.wake()},[scene?.raster?.version,clock]);
 return <><canvas ref={canvas} className="glass-panel-pixels" aria-hidden="true" data-optical-mode={mode} data-optical-profile={mode==='balanced'?'B':undefined} data-optical-error={error||undefined} style={{visibility:mode==='balanced'?'visible':'hidden'}}/><div ref={fallback} aria-hidden="true" style={{position:'absolute',inset:12,pointerEvents:'none',display:mode==='native'?'block':'none'}}/>
  {studio&&<svg className="glass-panel-pixels" aria-hidden="true" style={{opacity:'var(--ax-glass-light-strength, 1)'}}>
   <defs><linearGradient id={edgeGradient} href={`#${studio.rim}`}>
    <stop stopColor="#FFFFFF" stopOpacity=".84"/><stop offset=".55" stopColor="#DCE7FC" stopOpacity=".35"/><stop offset="1" stopColor="#A092D8" stopOpacity=".28"/>
   </linearGradient></defs>
   <path ref={edge} fill="none" stroke={`url(#${edgeGradient})`} strokeWidth="2" />
  </svg>}
 </>;
}

function usePanelScrollFeather(content:RefObject<HTMLDivElement|null>,scrollable:boolean){
 const refresh=useRef<(()=>void)|null>(null);
 useEffect(()=>{
  const viewport=content.current;
  const win=viewport?.ownerDocument.defaultView;
  if(!viewport||!win)return;
  let observed:HTMLElement|null=null,frame=0,connected=true;
  const clear=(scroller:HTMLElement)=>{
   scroller.removeAttribute('data-glass-panel-feather');
   for(const name of ['start','end','left','right','bottom'])scroller.style.removeProperty(`--ax-panel-feather-${name}`);
  };
  const measure=()=>{
   frame=0;
   const scroller=scrollable?viewport:viewport.querySelector('textarea');
   if(scroller!==observed){
    if(observed){
     clear(observed);
     if(observed!==viewport)resize.unobserve(observed);
    }
    if(scroller&&scroller!==viewport)resize.observe(scroller);
    observed=scroller;
   }
   if(!scroller)return;
   const limit=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
   if(limit<=1){clear(scroller);return;}
   const offset=Math.max(0,Math.min(limit,scroller.scrollTop));
   const length=(distance:number)=>distance>.75?Math.min(16,scroller.clientHeight*.23,distance*1.4):0;
   const start=length(offset),end=length(limit-offset);
   // Leave classic and overlay scrollbars outside the opacity gradient.
   let left=scroller.clientLeft,right=Math.max(0,scroller.offsetWidth-scroller.clientWidth-left);
   if(!left&&!right){
    if(win.getComputedStyle(scroller).direction==='rtl')left=8;
    else right=8;
   }
   const bottom=Math.max(0,scroller.offsetHeight-scroller.clientHeight-scroller.clientTop);
   scroller.setAttribute('data-glass-panel-feather','');
   for(const [name,value] of Object.entries({start,end,left,right,bottom})){
    scroller.style.setProperty(`--ax-panel-feather-${name}`,`${value}px`);
   }
  };
  const schedule=()=>{if(connected&&!frame)frame=win.requestAnimationFrame(measure)};
  const resize=new ResizeObserver(schedule);
  const mutation=new MutationObserver(schedule);
  resize.observe(viewport);mutation.observe(viewport,{childList:true,subtree:true,characterData:true});
  viewport.addEventListener('scroll',schedule,{capture:true,passive:true});
  viewport.addEventListener('input',schedule);
  viewport.addEventListener('load',schedule,true);
  const fonts=viewport.ownerDocument.fonts;
  fonts?.addEventListener('loadingdone',schedule);
  void fonts?.ready.then(schedule);
  refresh.current=schedule;measure();
  return()=>{
   connected=false;win.cancelAnimationFrame(frame);refresh.current=null;
   if(observed)clear(observed);
   resize.disconnect();mutation.disconnect();
   viewport.removeEventListener('scroll',schedule,true);
   viewport.removeEventListener('input',schedule);
   viewport.removeEventListener('load',schedule,true);
   fonts?.removeEventListener('loadingdone',schedule);
  };
 },[content,scrollable]);
 // Properties of a controlled textarea can change without a DOM mutation.
 useLayoutEffect(()=>{refresh.current?.()});
}

/** Flat center, pixel-bounded glass shoulder, and native text with a soft scroll edge. */
export function GlassPanel({id,clock,children,label,className='',style,diagnostic=false,scrollable=true}:GlassPanelProps){
 const key=useId().replace(/[^a-z0-9]/gi,'');
 const content=useRef<HTMLDivElement>(null);
 usePanelScrollFeather(content,scrollable);
 const paint=useCallback(({width,height}:ControlledSceneSize)=><><defs><linearGradient id={`panel-${key}`} x2="1" y2="1"><stop stopColor="#E9F0FC"/><stop offset="1" stopColor="#EDE7F7"/></linearGradient></defs><rect width={width} height={height} fill={`url(#panel-${key})`}/></>,[key]);
 const paintCanvas=useCallback((ctx:CanvasRenderingContext2D,{width,height}:ControlledSceneSize)=>{
  const sum=width*width+height*height,g=ctx.createLinearGradient(0,0,2*width*height*height/sum,2*height*width*width/sum);g.addColorStop(0,'#E9F0FC');g.addColorStop(1,'#EDE7F7');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  if(diagnostic){ctx.strokeStyle='rgba(112,131,182,.2)';ctx.lineWidth=.6;ctx.beginPath();for(let x=0;x<width;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,height)}for(let y=0;y<height;y+=24){ctx.moveTo(0,y);ctx.lineTo(width,y)}ctx.stroke()}
 },[diagnostic]);
 return <ControlledScene className={`glass-panel ${className}`} style={style} paint={paint} paintCanvas={paintCanvas}>
  <PanelPixels clock={clock}/>
  <div className="glass-panel-content-frame"><div ref={content} className={`glass-panel-content ${scrollable?'glass-panel-scroll':''}`} data-glass-panel={id} role={scrollable?'region':undefined} aria-label={label} tabIndex={scrollable?0:undefined}>{children}</div></div>
 </ControlledScene>;
}
