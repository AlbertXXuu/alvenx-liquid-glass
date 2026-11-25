import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createRenderer,OPTIONS,type Model,type Option} from './renderer';

const paragraphs=[
 'A large glass surface can have a broad, quiet center. Its rounded edge carries the visible bend instead of stretching the entire reading area into a magnifying lens.',
 'The words you are reading are native page text. They sit above the optical background, so selection, keyboard focus and ordinary scrolling keep their normal browser behavior.',
 'A local rendering comparison helps separate three decisions: how far the edge transition reaches, how strongly it displaces the background, and how much sampling work is spent on a smooth contour.',
 'These panels use an artistic edge mapping. They do not solve a measured thickness field, a refractive index, or the light path through two real glass interfaces.',
 'Scroll through this passage, select a sentence, and switch A, B and C. The content and your place in the document should remain stable while the background changes.',
];
const longText=Array.from({length:18},(_,i)=>`${i+1}. ${paragraphs[i%paragraphs.length]}`).join('\n\n');

function PlateSurface({model,label,children,className=''}:{model:Model;label:string;children:ReactNode;className?:string}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(model),engine=useRef<ReturnType<typeof createRenderer>|null>(null),frame=useRef(0),shown=useRef(false);latest.current=model;
 const [error,setError]=useState('');
 const draw=()=>{if(shown.current&&!document.hidden&&!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;try{if(!engine.current&&canvas.current)engine.current=createRenderer(canvas.current,{plate:true});engine.current?.render(latest.current);setError('')}catch(e){setError(String(e));if(canvas.current)canvas.current.dataset.ready='false'}})};
 useEffect(()=>{
  const c=canvas.current;if(!c)return;
  const resize=new ResizeObserver(draw);resize.observe(c);
  const visibility=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{shown.current=entries.some(e=>e.isIntersecting);if(shown.current)draw();else{cancelAnimationFrame(frame.current);frame.current=0}});visibility?.observe(c);
  if(!visibility){shown.current=true;draw()}
  const lost=(e:Event)=>{e.preventDefault();c.dataset.ready='false';setError('Graphics context lost. Native text remains available; reload the review to retry.')};
  c.addEventListener('webglcontextlost',lost);window.addEventListener('resize',draw);document.addEventListener('visibilitychange',draw);
  return()=>{resize.disconnect();visibility?.disconnect();c.removeEventListener('webglcontextlost',lost);window.removeEventListener('resize',draw);document.removeEventListener('visibilitychange',draw);cancelAnimationFrame(frame.current);engine.current?.dispose();engine.current=null};
 },[]);
 useEffect(draw,[model]);
 return <div className={`plate-surface ${className}`} role="group" aria-label={label}>
  <canvas ref={canvas} aria-hidden="true" data-panel={className}/>
  {children}
  {error&&<span className="plate-error" role="alert">{error}</span>}
 </div>;
}

export function LargePanels({model,onOptionChange}:{model:Model;onOptionChange:(option:Option)=>void}){
 const requested=[10,16,22][['a','b','c'].indexOf(model.option)];
 return <section id="large-panels" className="large-panels" aria-labelledby="large-heading">
  <h2 id="large-heading">A flat face, with a rounded edge.</h2>
  <p className="intro">The compact lenses above magnify their centers. These large panels keep their central background unwarped and put the bend in a bounded edge band. Text stays on top.</p>
  <nav aria-label="Large panel rendering options">{(['a','b','c'] as const).map(option=><button key={option} aria-label={`Large panels option ${option.toUpperCase()}`} aria-pressed={model.option===option} onClick={()=>onOptionChange(option)}>{OPTIONS[option].label}</button>)}</nav>
  <p className="description">Shared option {model.option.toUpperCase()} · requested edge band {requested} CSS px · central sampling 1× · same seven material parameters</p>
  <figure className="section-sketch">
   <svg viewBox="0 0 640 94" role="img" aria-label="Illustrative flat central face, rounded shoulders and flat supporting surface; not a physical simulation">
    <defs><linearGradient id="plate-section" x2="0" y2="1"><stop stopColor="#D9E8FF"/><stop offset="1" stopColor="#DDD1F0"/></linearGradient></defs>
    <path d="M28 65C28 40 40 24 64 24H576C600 24 612 40 612 65Z" fill="url(#plate-section)" stroke="#899BC5" strokeWidth="1.5"/>
    <path d="M12 67H628" stroke="#A1AECF" strokeWidth="1"/>
    <text x="320" y="49" textAnchor="middle" fill="#52678F" fontSize="13">Broad flat face</text>
    <text x="320" y="88" textAnchor="middle" fill="#6D7E9E" fontSize="11">Illustrative section · not a reconstructed shader height field</text>
   </svg>
   <figcaption>The renderer is an artistic background mapping. It does not calculate Snell refraction, Fresnel reflection or measured glass thickness.</figcaption>
  </figure>
  <h3>Multiline editor</h3>
  <PlateSurface model={model} label="Multiline glass panel" className="editor-panel">
   <textarea className="plate-content plate-editor" aria-label="Review multiline text" defaultValue={longText} spellCheck={false}/>
  </PlateSurface>
  <h3>Reading panel</h3>
  <PlateSurface model={model} label="Large glass reading panel" className="reading-panel">
   <article className="plate-content plate-reading" tabIndex={0} aria-label="Review long reading text">
    <h4>Room to read.</h4>
    {Array.from({length:20},(_,i)=><p key={i}>{i+1}. {paragraphs[i%paragraphs.length]}</p>)}
    <p className="reading-end">End of the reading sample.</p>
   </article>
  </PlateSurface>
  <p className="note">Scroll within either panel. The canvas contains only the background; paragraphs, caret and selection are native DOM. Increasing panel height does not enlarge the requested 10 / 16 / 22 px optical band. This remains a local A/B/C comparison, with no selected production preset.</p>
 </section>;
}
