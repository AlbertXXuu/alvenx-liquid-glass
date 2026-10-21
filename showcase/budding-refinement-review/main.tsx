import { StrictMode, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BuddingLink, LiquidControl, useGlassSettings, type GlassClock, type LiquidContourFrame } from '../../src';
import { refinementGeometry,type ReviewBuddingTransform } from './geometry';
import { buddingGeometry } from '../../src/buddingGeometry';
import { createReferenceVolume } from './reference-volume';
import { firstFrames } from './first-frame';
import '../../styles/glass.css';
import './fonts.css';
import './review.css';

type LobeMotion={near:number;press:number;x:number;y:number};
const emptyMotion=():LobeMotion=>({near:0,press:0,x:0,y:0});
const lobeTransform=(m:LobeMotion,intensity:number)=>({offsetX:m.x*1.05*intensity*.35,offsetY:m.y*.75*intensity*.35,scaleX:1+m.near*.004*intensity,scaleY:1+(m.near*.006-m.press*.016)*intensity});

function FirstFrame({enhanced,onActivate}:{enhanced:boolean;onActivate:()=>void}){
 return <span className="refinement-first-frame" data-static-first-frame="true">
  {([54,44] as const).map(d=><span key={d} data-first-frame={d} className={`first-frame-${d}`}>
   <span className="first-frame-backdrop" style={{clipPath:`path('${firstFrames[d].path}')`}}/>
   <img className="first-frame-texture" src={firstFrames[d].png} width={firstFrames[d].width} height={firstFrames[d].height} style={{width:firstFrames[d].textureCssWidth}} alt="" aria-hidden="true" draggable="false"/>
  </span>)}
  {!enhanced&&<a href="https://alvenx.com/ui/" data-prejs-budding="true" aria-label="Explore Liquid Glass" className="first-frame-action" onClick={e=>{e.preventDefault();onActivate();}}/>}
 </span>;
}

/** This is an isolated visual proposal. The production component is displayed
 * unchanged beside a review-only contour passed to the existing optical body. */
function Proposal({clock,id,light=true,diameter=54,enhanced=false}:{clock:GlassClock;id:string;light?:boolean;diameter?:number;enhanced?:boolean}) {
 const [growth,setGrowth]=useState(0),[expanded,setExpanded]=useState(false),[size,setSize]=useState(diameter),[firstFrameReady,setFirstFrameReady]=useState(false);
 const state=useRef({growth:0,velocity:0,target:0,active:false,visible:true});
 const earlyFocused=useRef(false);
 const lobeState=useRef({mother:emptyMotion(),chamber:emptyMotion()}),held=useRef<'mother'|'chamber'|null>(null);
 const [lobes,setLobes]=useState(lobeState.current);
 const host=useRef<HTMLSpanElement>(null),volumeCanvas=useRef<HTMLCanvasElement>(null),volumeRenderer=useRef<ReturnType<typeof createReferenceVolume>|null>(null),shadowPath=useRef<SVGPathElement>(null);
 const materialFrames=useRef(new Map<string,{growth:number;transform:ReviewBuddingTransform}>()),commitMaterial=useRef(()=>{});
 const uid=`refinement-${useId().replace(/[^a-z0-9]/gi,'')}`;
 const shape=useMemo(()=>refinementGeometry(growth,size),[growth,size]);
 const currentShape=useRef(shape);currentShape.current=shape;
 const visiblePath=useRef(shape.path);
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
   volumeRenderer.current?.draw(path,frame.growth,clock.material,frame.transform);
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
  let localMotionActive=false,lastPointer=-1,lastLayout=-1,lastReduced=clock.reduced;
  const stop=clock.subscribe(delta=>{
   const s=state.current;if(!s.visible)return false;
   if(!s.active&&!localMotionActive&&lastPointer===clock.pointerRevision&&lastLayout===clock.layoutRevision&&lastReduced===clock.reduced)return false;
   lastPointer=clock.pointerRevision;lastLayout=clock.layoutRevision;lastReduced=clock.reduced;
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
   const proximity=Math.max(1,Math.min(28,gap/2));
   for(const name of ['mother','chamber'] as const){
    const rect=currentShape.current[name],x=clock.pointer.x-(bounds?.left??0),y=clock.pointer.y-(bounds?.top??0);
    const distance=Math.hypot(Math.max(rect.x-x,0,x-rect.x-rect.width),Math.max(rect.y-y,0,y-rect.y-rect.height));
    const near=s.growth>=.95&&!clock.reduced?Math.max(0,1-distance/proximity):0;
    const target:LobeMotion={near,press:near>0&&held.current===name?1:0,x:near*Math.max(-1,Math.min(1,(x-rect.x)/rect.width*2-1)),y:near*Math.max(-1,Math.min(1,(y-rect.y)/rect.height*2-1))};
    const previous=lobeState.current[name],next={...previous};
    for(const channel of ['near','press','x','y'] as const){const difference=target[channel]-previous[channel];moving ||= Math.abs(difference)>=.0008;next[channel]=Math.abs(difference)<.0008?target[channel]:previous[channel]+difference*blend;changed ||= next[channel]!==previous[channel];}
    lobeState.current[name]=next;
   }
   localMotionActive=moving;if(changed)setLobes({...lobeState.current});
   return s.active||moving;
  });
  const hitContext=document.createElement('canvas').getContext('2d');
  const outside=(event:globalThis.PointerEvent)=>{
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
  const release=()=>{if(held.current){held.current=null;localMotionActive=true;clock.wake();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  return()=>{stop();observer.disconnect();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);};
 },[clock,animate,enhanced]);
 const reveal=()=>animate(1);
 useLayoutEffect(()=>{if(!enhanced)earlyFocused.current=host.current?.querySelector('[data-prejs-budding]')===document.activeElement;else if(earlyFocused.current)host.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});},[enhanced]);
 useLayoutEffect(()=>{if(!enhanced)return;const early=globalThis as typeof globalThis&{__alvenxBuddingIntent?:boolean;__alvenxBuddingReleaseEarly?:(activate:()=>void)=>(()=>void)|void};if(early.__alvenxBuddingIntent)animate(1);const release=early.__alvenxBuddingReleaseEarly?.(()=>animate(1));delete early.__alvenxBuddingIntent;delete early.__alvenxBuddingReleaseEarly;host.current?.removeAttribute('data-early-intent');return release;},[enhanced,animate]);
 const contour=useCallback((frame:LiquidContourFrame)=>{
  const transform:ReviewBuddingTransform=growth>=.95?{mother:lobeTransform(lobes.mother,frame.intensity),chamber:lobeTransform(lobes.chamber,frame.intensity)}:{offsetX:frame.shiftX*.35,offsetY:frame.shiftY*.35,scaleX:1+frame.near*.004*frame.intensity,scaleY:1+(frame.near*.006-frame.press*.016)*frame.intensity};
  const next=refinementGeometry(growth,size,transform);
  visiblePath.current=next.path;
  // The contour is requested before LiquidControl commits its optical frame.
  // Draw material only when the exact matching rim/clip is present in the DOM.
  materialFrames.current.set(next.path,{growth,transform});
  if(materialFrames.current.size>8)materialFrames.current.delete(materialFrames.current.keys().next().value!);
  commitMaterial.current();
  return next.path;
 },[growth,size,lobes]);
 const m=shape.mother,c=shape.chamber;
 const mt=growth>=.95?lobeTransform(lobes.mother,clock.strength):{offsetX:0,offsetY:0,scaleX:1,scaleY:1},ct=growth>=.95?lobeTransform(lobes.chamber,clock.strength):{offsetX:0,offsetY:0,scaleX:1,scaleY:1};
 return <span ref={host} className="glass-budding-link refinement-bud" data-review-bud={id} data-growth={growth.toFixed(5)} data-ready={growth===1&&expanded} data-expanded={expanded} data-detached={growth>=.95} data-diameter={size} data-volume-light={light} data-enhanced={enhanced} data-mother-near={lobes.mother.near.toFixed(4)} data-chamber-near={lobes.chamber.near.toFixed(4)} style={enhanced?{width:shape.width,height:shape.height}:undefined}
  onPointerDownCapture={e=>{const action=(e.target as Element).closest('button,a');if(action&&e.currentTarget.contains(action)){held.current=action.tagName==='BUTTON'?'mother':'chamber';clock.wake();}}}>
  {(!enhanced||(!firstFrameReady&&growth===0&&light))&&<FirstFrame enhanced={enhanced} onActivate={reveal}/>}
  {enhanced&&light&&<svg className="refinement-contact" width={shape.width} height={shape.height} aria-hidden="true"><defs><filter id={`${uid}-contact`} x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.1" result="blur"/><feOffset in="blur" dy="2.8" result="offset"/><feFlood floodColor="#293451" floodOpacity=".105" result="ink"/><feComposite in="ink" in2="offset" operator="in" result="shadow"/><feComposite in="shadow" in2="SourceAlpha" operator="out"/></filter></defs><path ref={shadowPath} fill="#293451" filter={`url(#${uid}-contact)`}/></svg>}
  {enhanced&&<LiquidControl id={`${id}-body`} clock={clock} kind="field" className="glass-budding-body" contour={contour}>
   {light&&<canvas ref={volumeCanvas} className="refinement-volume-light" aria-hidden="true"/>}
   <button type="button" className="glass-budding-trigger" aria-label={`Grow ${id}`} aria-expanded={expanded} aria-controls={`${id}-destination`} onClick={reveal} style={{left:m.x+mt.offsetX,top:m.y+mt.offsetY,width:m.width,height:m.height}}/>
   {growth>0&&<a id={`${id}-destination`} href="https://alvenx.com/ui/" className="glass-budding-destination refinement-destination" inert={growth!==1||!expanded} aria-hidden={growth!==1||!expanded} style={{left:c.x+ct.offsetX-c.width*(ct.scaleX-1)/2,top:c.y+ct.offsetY-c.height*(ct.scaleY-1)/2,width:c.width*ct.scaleX,height:c.height*ct.scaleY,fontSize:size<=44?14:15,opacity:Math.max(0,(growth-.8)/.2),paddingLeft:6.4,paddingRight:6}}>explore me!</a>}
  </LiquidControl>}
 </span>;
}

export function Review(){
 const [enhanced,setEnhanced]=useState(false);useLayoutEffect(()=>setEnhanced(true),[]);
 const {clock}=useGlassSettings({storageKey:'alvenx-budding-refinement-review-v1'});
 const [run,setRun]=useState(0),[light,setLight]=useState(true),[guides,setGuides]=useState(false);
 const baselineWidth=buddingGeometry(1).width,proposal=refinementGeometry(1);
 return <div className="alvenx-design budding-refinement-review" data-guides={guides}><main>
  <header className="review-header"><a href="https://alvenx.com/ui/">AlvenX Liquid Glass ↗</a><p className="eyebrow">INTERACTION REVIEW</p><h1>Budding entrance</h1><p className="review-intro">Tap to open. Tap outside or scroll away to close.</p></header>
  <div className="review-tools"><button type="button" onClick={()=>setRun(v=>v+1)}>Reset both pearls</button><label><input type="checkbox" checked={light} onChange={e=>setLight(e.target.checked)}/>Reference volume material</label><label><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/>Show bounds</label></div>
  <section className="review-comparison" aria-label="Homepage control comparison">
   <article className="review-case"><div className="case-heading"><span>01 / PROPOSED</span><h2>Grow. Separate. Return.</h2><p>The mother stays round. The chamber separates, then returns when you leave the entrance.</p></div><div className="homepage-atmosphere"><p className="demo-title">AI systems,<br/><strong>built to be understood.</strong></p><div className="demo-actions"><a className="work-link" href="https://alvenx.com/#work">Explore the work <span>↓</span></a><div className="discovery-pair"><Proposal key={`proposal-${run}`} id="refinement-proposal" clock={clock} light={light} enhanced={enhanced}/><a className="github-link" href="https://github.com/AlbertXXuu">GitHub ↗</a></div></div></div></article>
   <article className="review-case"><div className="case-heading"><span>02 / CURRENT</span><h2>The production component</h2><p>Original 54 px mother, spacing, text slot and optical material.</p></div><div className="homepage-atmosphere"><p className="demo-title">AI systems,<br/><strong>built to be understood.</strong></p><div className="demo-actions"><a className="work-link" href="https://alvenx.com/#work">Explore the work <span>↓</span></a><div className="discovery-pair">{enhanced?<BuddingLink key={`baseline-${run}`} id="refinement-baseline" clock={clock} href="https://alvenx.com/ui/"/>:<span className="baseline-first-placeholder" aria-hidden="true"/>}<a className="github-link" href="https://github.com/AlbertXXuu">GitHub ↗</a></div></div></div></article>
  </section>
  <section className="review-notes"><h2>What changes</h2><dl><div><dt>Mother diameter</dt><dd>54 px · 44 px on the narrowest screens</dd></div><div><dt>Chamber separation</dt><dd>+27 px · 0.50 D, followed by a visible gap</dd></div><div><dt>Mother & connection</dt><dd>A round mother, a thinning soft bridge, then two separate contours</dd></div><div><dt>Label breathing room</dt><dd>About 17 px on both sides at 54 px, centred in the final chamber</dd></div><div><dt>Expanded occupied width</dt><dd>About {baselineWidth.toFixed(1)} → {proposal.width.toFixed(1)} px at 54 px</dd></div><div><dt>Volume material</dt><dd>The accepted large form’s blue-violet environment, continuous height and broad softbox reflection</dd></div></dl><p>The proposal combines LiquidControl’s real backdrop optics underneath with a transparent material layer adapted from the accepted large-volume renderer. Its blue-violet color comes from that reference environment approximation. Toggle the reference material to inspect the underlying real-backdrop glass. This is a 2.5D approximation, not a physically unified 3D glass renderer.</p><p>Click outside or scroll the entrance out of view to return to the mother. Click the mother during its return to reopen from its current position. Escape also closes it. Reduced motion settles immediately. The proposal is isolated from the production homepage and library defaults until review.</p></section>
 </main></div>;
}
if(typeof document!=='undefined'){const root=document.getElementById('root')!;const tree=<StrictMode><Review/></StrictMode>;if(root.hasChildNodes())hydrateRoot(root,tree);else createRoot(root).render(tree);}
