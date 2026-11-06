import {useCallback,useContext,useEffect,useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {ControlledScene,ControlledSceneContext,type ControlledSceneSize} from './ControlledScene';
import {acquireBalancedOptics} from './balancedOptics';
import type {PreviewClock} from './GlassClock';
import {resolveGlassOptics} from './opticalSupport';

export type GlassPanelProps={id:string;clock:PreviewClock;children:ReactNode;label:string;className?:string;style?:CSSProperties;diagnostic?:boolean;scrollable?:boolean};
function PanelPixels({clock}:{clock:PreviewClock}){
 const scene=useContext(ControlledSceneContext),latest=useRef(scene);latest.current=scene;
 const canvas=useRef<HTMLCanvasElement>(null),fallback=useRef<HTMLDivElement>(null),shown=useRef(false),dirty=useRef(true),[mode,setMode]=useState('flat'),[error,setError]=useState('');
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
    const r=host.getBoundingClientRect();optics.render(el,source,{width:r.width,height:r.height,origin:{x:0,y:0},center:{x:r.width/2,y:r.height/2},half:{x:r.width/2,y:r.height/2},exponent:3.4,panel:true,material:clock.material});setMode('balanced');setError('');
   }catch(reason){failed=true;degrade();setError(String(reason))}
   return false;
  };
  const resize=new ResizeObserver(()=>{dirty.current=true;clock.wake()});resize.observe(host);
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{shown.current=entries.some(e=>e.isIntersecting);if(shown.current){dirty.current=true;clock.wake()}});observer?.observe(host);if(!observer)shown.current=true;
  const unsubscribe=clock.subscribe(draw);
  return()=>{resize.disconnect();observer?.disconnect();unsubscribe();optics.release()};
 },[clock]);
 useEffect(()=>{dirty.current=true;clock.wake()},[scene?.raster?.version,clock]);
 return <><canvas ref={canvas} className="glass-panel-pixels" aria-hidden="true" data-optical-mode={mode} data-optical-profile={mode==='balanced'?'B':undefined} data-optical-error={error||undefined} style={{visibility:mode==='balanced'?'visible':'hidden'}}/><div ref={fallback} aria-hidden="true" style={{position:'absolute',inset:12,borderRadius:28,pointerEvents:'none',display:mode==='native'?'block':'none'}}/></>;
}

/** Flat center, pixel-bounded B shoulder, with native content above all optics. */
export function GlassPanel({id,clock,children,label,className='',style,diagnostic=false,scrollable=true}:GlassPanelProps){
 const key=useId().replace(/[^a-z0-9]/gi,'');
 const paint=useCallback(({width,height}:ControlledSceneSize)=><><defs><linearGradient id={`panel-${key}`} x2="1" y2="1"><stop stopColor="#E9F0FC"/><stop offset="1" stopColor="#EDE7F7"/></linearGradient></defs><rect width={width} height={height} fill={`url(#panel-${key})`}/></>,[key]);
 const paintCanvas=useCallback((ctx:CanvasRenderingContext2D,{width,height}:ControlledSceneSize)=>{
  const sum=width*width+height*height,g=ctx.createLinearGradient(0,0,2*width*height*height/sum,2*height*width*width/sum);g.addColorStop(0,'#E9F0FC');g.addColorStop(1,'#EDE7F7');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  if(diagnostic){ctx.strokeStyle='rgba(112,131,182,.2)';ctx.lineWidth=.6;ctx.beginPath();for(let x=0;x<width;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,height)}for(let y=0;y<height;y+=24){ctx.moveTo(0,y);ctx.lineTo(width,y)}ctx.stroke()}
 },[diagnostic]);
 return <ControlledScene className={`glass-panel ${className}`} style={style} paint={paint} paintCanvas={paintCanvas}>
  <PanelPixels clock={clock}/>
  <div className={`glass-panel-content ${scrollable?'glass-panel-scroll':''}`} data-glass-panel={id} role={scrollable?'region':undefined} aria-label={label} tabIndex={scrollable?0:undefined}>{children}</div>
 </ControlledScene>;
}
