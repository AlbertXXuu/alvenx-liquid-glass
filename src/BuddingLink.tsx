import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GlassClock } from './GlassClock';
import { LiquidControl, type LiquidContourFrame } from './LiquidControl';
import { buddingGeometry } from './buddingGeometry';

export type BuddingLinkProps = {
  id:string;
  clock:GlassClock;
  href:string;
  label?:string;
  revealLabel?:string;
  className?:string;
  /** Resting mother diameter in CSS pixels, clamped to 44–96 (default 54).
   * A host may override the scoped --ax-bud-diameter variable. */
  diameter?:number;
};

/** One actual-backdrop glass body: mother → soft neck → native link chamber.
 * The same growth value controls its contour and real document width. */
export function BuddingLink({id,clock,href,label='explore me!',revealLabel='Explore Liquid Glass',className='',diameter=54}:BuddingLinkProps){
  const host=useRef<HTMLSpanElement>(null);
  const safeDiameter=Number.isFinite(diameter)?Math.max(44,Math.min(96,diameter)):54;
  const [size,setSize]=useState(safeDiameter),[growth,setGrowth]=useState(0);
  const [expanded,setExpanded]=useState(false);
  const state=useRef({start:0,active:false,visible:true,growth:0});
  const shape=useMemo(()=>buddingGeometry(growth,size),[growth,size]);
  const ready=growth===1;
  useLayoutEffect(()=>{
    const element=host.current;if(!element)return;
    const measure=()=>{const css=Number.parseFloat(getComputedStyle(element).getPropertyValue('--ax-bud-diameter'));setSize(Number.isFinite(css)?Math.max(44,Math.min(96,css)):safeDiameter);};
    const resize=new ResizeObserver(measure);resize.observe(element.parentElement??element);measure();
    const visibility=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{state.current.visible=entries.some(e=>e.isIntersecting);if(state.current.visible)clock.wake();});
    visibility?.observe(element);
    const unsubscribe=clock.subscribe(()=>{
      const s=state.current;if(!s.active||!s.visible)return false;
      const t=clock.reduced?1:Math.min(1,(performance.now()-s.start)/1150);
      // Smootherstep gives zero speed/acceleration at both resting states.
      const p=t*t*t*(t*(t*6-15)+10);
      s.growth=t===1?1:p;setGrowth(s.growth);
      if(t===1)s.active=false;
      return s.active;
    });
    return()=>{resize.disconnect();visibility?.disconnect();unsubscribe();};
  },[clock,safeDiameter]);
  const reveal=()=>{
    if(expanded)return;
    setExpanded(true);state.current.start=performance.now();state.current.active=!clock.reduced;
    if(clock.reduced){state.current.growth=1;setGrowth(1);}
    clock.wake();
  };
  const contour=useCallback((frame:LiquidContourFrame)=>buddingGeometry(growth,size,{
    offsetX:frame.shiftX*.35,offsetY:frame.shiftY*.35,
    scaleX:1+frame.near*.004*frame.intensity,
    scaleY:1+(frame.near*.006-frame.press*.016)*frame.intensity,
  }).path,[growth,size]);
  const mother=shape.mother,chamber=shape.chamber;
  return <span ref={host} className={`glass-budding-link ${className}`} data-budding-link={id} data-expanded={expanded} data-growth={growth.toFixed(5)} data-ready={ready}
    style={{width:shape.width,height:shape.height}}>
    <LiquidControl id={`${id}-body`} clock={clock} kind="field" className="glass-budding-body" contour={contour}>
      <button type="button" className="glass-budding-trigger" aria-label={revealLabel} aria-expanded={expanded} aria-controls={`${id}-destination`}
        onClick={reveal} style={{left:mother.x,top:mother.y,width:mother.width,height:mother.height}}/>
      {expanded&&<a id={`${id}-destination`} href={href} className="glass-budding-destination" inert={!ready} aria-hidden={!ready}
        style={{left:chamber.x,top:chamber.y,width:chamber.width,height:chamber.height,fontSize:size<=44?14:15,opacity:Math.max(0,(growth-.8)/.2)}}>{label}</a>}
    </LiquidControl>
  </span>;
}
