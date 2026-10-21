import { StrictMode, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BuddingLink, LiquidControl, useGlassSettings, type GlassClock, type LiquidContourFrame } from '../../src';
import { refinementGeometry } from './geometry';
import { buddingGeometry } from '../../src/buddingGeometry';
import '../../styles/glass.css';
import '../../assets/fonts.css';
import './review.css';

/** This is an isolated visual proposal. The production component is displayed
 * unchanged beside a review-only contour passed to the existing optical body. */
function Proposal({clock,id,light=true,diameter=54}:{clock:GlassClock;id:string;light?:boolean;diameter?:number}) {
 const [growth,setGrowth]=useState(0),[expanded,setExpanded]=useState(false);
 const state=useRef({start:0,active:false,visible:true});
 const host=useRef<HTMLSpanElement>(null),volumePath=useRef<SVGPathElement>(null),shadowPath=useRef<SVGPathElement>(null),lightSource=useRef<SVGFEPointLightElement>(null);
 const uid=`refinement-${useId().replace(/[^a-z0-9]/gi,'')}`;
 const shape=useMemo(()=>refinementGeometry(growth,diameter),[growth,diameter]);
 useLayoutEffect(()=>{
  const node=host.current;
  const observer=new IntersectionObserver(entries=>{state.current.visible=entries.some(e=>e.isIntersecting);if(state.current.visible)clock.wake();});if(node)observer.observe(node);
  const stop=clock.subscribe(()=>{
   const s=state.current;if(!s.active||!s.visible)return false;
   const t=clock.reduced?1:Math.min(1,(performance.now()-s.start)/1150),p=t*t*t*(t*(t*6-15)+10);
   setGrowth(p);if(t===1)s.active=false;return s.active;
  });return()=>{stop();observer.disconnect();};
 },[clock]);
 const reveal=()=>{if(expanded)return;setExpanded(true);state.current.start=performance.now();state.current.active=!clock.reduced;if(clock.reduced)setGrowth(1);clock.wake();};
 const contour=useCallback((frame:LiquidContourFrame)=>{
  const next=refinementGeometry(growth,diameter,{offsetX:frame.shiftX*.35,offsetY:frame.shiftY*.35,scaleX:1+frame.near*.004*frame.intensity,scaleY:1+(frame.near*.006-frame.press*.016)*frame.intensity});
  // The lighting paths update in the same animation callback as LiquidControl's
  // clip, normal map, rim and hit path, with no additional animation loop.
  volumePath.current?.setAttribute('d',next.path);shadowPath.current?.setAttribute('d',next.path);
  lightSource.current?.setAttribute('x',String(diameter*.42+frame.shiftX*2));lightSource.current?.setAttribute('y',String(diameter*.22+frame.shiftY));
  return next.path;
 },[growth,diameter]);
 const m=shape.mother,c=shape.chamber;
 return <span ref={host} className="glass-budding-link refinement-bud" data-review-bud={id} data-growth={growth.toFixed(5)} data-ready={growth===1} data-expanded={expanded} data-volume-light={light} style={{width:shape.width,height:shape.height}}>
  {light&&<svg className="refinement-contact" width={shape.width} height={shape.height} aria-hidden="true"><defs><filter id={`${uid}-contact`} x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.1" result="blur"/><feOffset in="blur" dy="2.8" result="offset"/><feFlood floodColor="#293451" floodOpacity=".105" result="ink"/><feComposite in="ink" in2="offset" operator="in" result="shadow"/><feComposite in="shadow" in2="SourceAlpha" operator="out"/></filter></defs><path ref={shadowPath} d={shape.path} fill="#293451" filter={`url(#${uid}-contact)`}/></svg>}
  <LiquidControl id={`${id}-body`} clock={clock} kind="field" className="glass-budding-body" contour={contour}>
   {light&&<svg className="refinement-volume-light" width={shape.width} height={shape.height} aria-hidden="true"><defs><filter id={`${uid}-light`} x="-5%" y="-15%" width="110%" height="130%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation={diameter*.11} result="height"/><feSpecularLighting in="height" surfaceScale={diameter*.15} specularConstant=".4" specularExponent="18" lightingColor="#FFFFFF" result="volume"><fePointLight ref={lightSource} x={diameter*.42} y={diameter*.22} z={diameter*1.8}/></feSpecularLighting><feComposite in="volume" in2="SourceAlpha" operator="in"/></filter></defs><path ref={volumePath} d={shape.path} fill="#FFFFFF" filter={`url(#${uid}-light)`}/></svg>}
   <button type="button" className="glass-budding-trigger" aria-label={`Grow ${id}`} aria-expanded={expanded} aria-controls={`${id}-destination`} onClick={reveal} style={{left:m.x,top:m.y,width:m.width,height:m.height}}/>
   {expanded&&<a id={`${id}-destination`} href="https://alvenx.com/ui/" className="glass-budding-destination refinement-destination" inert={growth!==1} aria-hidden={growth!==1} style={{left:c.x,top:c.y,width:c.width,height:c.height,fontSize:diameter<=44?14:15,opacity:Math.max(0,(growth-.8)/.2),paddingRight:6+diameter*.16}}>explore me!</a>}
  </LiquidControl>
 </span>;
}

function Review(){
 const {clock}=useGlassSettings({storageKey:'alvenx-budding-refinement-review-v1'});
 const [run,setRun]=useState(0),[light,setLight]=useState(true),[guides,setGuides]=useState(false);
 const baselineWidth=buddingGeometry(1).width,proposal=refinementGeometry(1);
 return <div className="alvenx-design budding-refinement-review" data-guides={guides}><main>
  <header><a href="https://alvenx.com/ui/">AlvenX Liquid Glass ↗</a><p className="eyebrow">BUDDING LINK · VISUAL REVIEW</p><h1>A little more room.<br/><span>A softer connection.</span></h1><p className="review-intro">The current homepage entrance and one proposed refinement. Click each empty pearl. Its real width pushes GitHub to the right.</p></header>
  <div className="review-tools"><button type="button" onClick={()=>setRun(v=>v+1)}>Reset both pearls</button><label><input type="checkbox" checked={light} onChange={e=>setLight(e.target.checked)}/>Contour lighting</label><label><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/>Show bounds</label></div>
  <section className="review-comparison" aria-label="Homepage control comparison">
   <article className="review-case"><div className="case-heading"><span>01 / CURRENT</span><h2>The production component</h2><p>Original 54 px mother, spacing, text slot and optical material.</p></div><div className="homepage-atmosphere"><p className="demo-title">AI systems,<br/><strong>built to be understood.</strong></p><div className="demo-actions"><a className="work-link" href="https://alvenx.com/#work">Explore the work <span>↓</span></a><div className="discovery-pair"><BuddingLink key={`baseline-${run}`} id="refinement-baseline" clock={clock} href="https://alvenx.com/ui/"/><a className="github-link" href="https://github.com/AlbertXXuu">GitHub ↗</a></div></div></div></article>
   <article className="review-case"><div className="case-heading"><span>02 / PROPOSED</span><h2>More separation. A lighter neck.</h2><p>The mother stays anchored. The chamber grows farther right, with more space after its label.</p></div><div className="homepage-atmosphere"><p className="demo-title">AI systems,<br/><strong>built to be understood.</strong></p><div className="demo-actions"><a className="work-link" href="https://alvenx.com/#work">Explore the work <span>↓</span></a><div className="discovery-pair"><Proposal key={`proposal-${run}`} id="refinement-proposal" clock={clock} light={light}/><a className="github-link" href="https://github.com/AlbertXXuu">GitHub ↗</a></div></div></div></article>
  </section>
  <section className="review-notes"><h2>What changes</h2><dl><div><dt>Mother diameter</dt><dd>54 px, unchanged</dd></div><div><dt>Chamber separation</dt><dd>+12.96 px · 0.24 D</dd></div><div><dt>Local neck half-height</dt><dd>−16% at its centre</dd></div><div><dt>Extra room at the chamber’s right</dt><dd>6.48 px contour + 8.64 px text inset</dd></div><div><dt>Expanded occupied width</dt><dd>About {baselineWidth.toFixed(1)} → {proposal.width.toFixed(1)} px</dd></div><div><dt>Volume cues</dt><dd>Contour-derived white light and a weak neutral contact shadow</dd></div></dl><p>The glass uses the existing LiquidControl backdrop optics. No blue or violet color is painted into the pearl. Its surroundings supply that color. The added volume cue is a 2.5D contour-lighting approximation, not a new 3D renderer.</p><p>Both versions preserve native button and link semantics. Reduced motion reveals the full form immediately. The proposal is isolated from the production homepage and library defaults until review.</p></section>
 </main></div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Review/></StrictMode>);
