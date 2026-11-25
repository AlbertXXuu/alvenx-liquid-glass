import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {DEFAULT_SETTINGS,PARAMETER_ROWS,type ReviewSettings} from '../../src/reviewSettings';
import {createRenderer,OPTIONS,WIDTH,HEIGHT,type Model,type Option} from './renderer';
import {LargePanels} from './LargePanels';
import '../../assets/fonts.css';
import './review.css';

const initial=new URLSearchParams(location.search).get('option');
function Review(){
 const [option,setOption]=useState<Option>(initial==='b'||initial==='c'?initial:'a');
 const [settings,setSettings]=useState<ReviewSettings>({...DEFAULT_SETTINGS,refractionLevel:3,blurLevel:0,progressiveBlur:0,glassOpacity:.08,ambient:false});
 const [word,setWord]=useState('Clarity'),[progress,setProgress]=useState(.5),[switchPosition,setSwitchPosition]=useState(1),[message,setMessage]=useState('Ask anything…'),[lens,setLens]=useState({x:202,y:90}),[held,setHeld]=useState(-1),[error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<ReturnType<typeof createRenderer>|null>(null),board=useRef<HTMLDivElement>(null),drag=useRef<{id:number;dx:number;dy:number}|null>(null),latest=useRef<Model>(null!),frame=useRef(0),switchFrame=useRef(0),switchTarget=useRef(1),currentSwitch=useRef(switchPosition);currentSwitch.current=switchPosition;
 latest.current={option,settings,word,progress,checked:switchPosition>=.5,switchPosition,lens,held};
 const draw=()=>{if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;try{engine.current?.render(latest.current);setError('')}catch(e){setError(String(e));if(canvas.current)canvas.current.dataset.ready='false'}})};
 useEffect(()=>{
  let live=true;const c=canvas.current;if(!c)return;
  const init=async()=>{try{await Promise.all([document.fonts.load('600 60px "Instrument Sans"'),document.fonts.load('400 19px "Instrument Sans"')]);if(!live)return;engine.current=createRenderer(c);draw()}catch(e){if(live)setError(String(e))}};void init();
  const observer=new ResizeObserver(draw);observer.observe(c);window.addEventListener('resize',draw);
  const lost=(e:Event)=>{e.preventDefault();setError('Graphics context lost. Reload this local review to retry.');c.dataset.ready='false'};c.addEventListener('webglcontextlost',lost);
  return()=>{live=false;observer.disconnect();window.removeEventListener('resize',draw);c.removeEventListener('webglcontextlost',lost);cancelAnimationFrame(frame.current);cancelAnimationFrame(switchFrame.current);engine.current?.dispose();engine.current=null};
 },[]);
 useEffect(draw,[option,settings,word,progress,switchPosition,lens,held]);
 useEffect(()=>{let live=true;if(/[^\x00-\x7f]/.test(word))void document.fonts.load('600 60px MiSans',word).then(()=>{if(live)draw()}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[word]);
 const choose=(next:Option)=>{setOption(next);const url=new URL(location.href);url.searchParams.set('option',next);history.replaceState(null,'',url)};
 const point=(e:PointerEvent)=>{const r=board.current!.getBoundingClientRect();return{x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height}};
 const release=()=>{drag.current=null;setHeld(-1)};
 const switchClick=()=>{switchTarget.current=1-switchTarget.current;cancelAnimationFrame(switchFrame.current);const from=currentSwitch.current,to=switchTarget.current,start=performance.now();const tick=(time:number)=>{const t=Math.min(1,(time-start)/220),s=t*t*(3-2*t);setSwitchPosition(from+(to-from)*s);if(t<1)switchFrame.current=requestAnimationFrame(tick)};switchFrame.current=requestAnimationFrame(tick)};
 const setting=(key:keyof ReviewSettings,value:number)=>setSettings(s=>({...s,[key]:value}));
 return <main>
  <header><a href="http://127.0.0.1:5236/mobile-review.html#refraction">Baseline b0e8874</a><span>LOCAL REVIEW · NO PRESET SELECTED</span></header>
  <h1>A clear center. A living edge.</h1><p className="intro">Choose a rendering option, then drag the lens, move Progress, toggle the switch and type in the field. All options keep the same source, settings and center magnification.</p>
  <nav aria-label="Rendering options">{(['a','b','c'] as const).map(key=><button key={key} aria-pressed={option===key} onClick={()=>choose(key)}>{OPTIONS[key].label}</button>)}</nav>
  <p className="description" aria-live="polite">{OPTIONS[option].description}</p>
  <div className="layout"><section aria-label="Shared interactive scene">
   <div ref={board} className="board" data-review-option={option}>
    <canvas ref={canvas} aria-hidden="true"/>
    <button className="lens-hit" aria-label="Drag the Clarity lens; arrow keys move it" style={{left:`${lens.x/WIDTH*100}%`,top:`${lens.y/HEIGHT*100}%`}}
     onPointerDown={e=>{if(e.button!==0||!e.isPrimary)return;const p=point(e);drag.current={id:e.pointerId,dx:lens.x-p.x,dy:lens.y-p.y};e.currentTarget.setPointerCapture(e.pointerId);setHeld(0)}}
     onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const p=point(e);setLens({x:Math.max(88,Math.min(552,p.x+d.dx)),y:Math.max(58,Math.min(155,p.y+d.dy))})}}
     onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
     onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();setLens(p=>({x:Math.max(88,Math.min(552,p.x+(e.key==='ArrowRight'?4:e.key==='ArrowLeft'?-4:0))),y:Math.max(58,Math.min(155,p.y+(e.key==='ArrowDown'?4:e.key==='ArrowUp'?-4:0)))}))}}}/>
    <input className="progress-hit" aria-label="Review Progress" type="range" min="0" max="100" step="1" value={Math.round(progress*100)} onChange={e=>setProgress(Number(e.target.value)/100)} onPointerDown={()=>setHeld(1)} onPointerUp={()=>setHeld(-1)} onPointerCancel={()=>setHeld(-1)}/>
    <button className="switch-hit" role="switch" aria-checked={switchPosition>=.5} aria-label="Review continuous switch" onClick={switchClick} onPointerDown={()=>setHeld(2)} onPointerUp={()=>setHeld(-1)} onPointerCancel={()=>setHeld(-1)}/>
    <input className="message" aria-label="Review message" value={message} onChange={e=>setMessage(e.target.value)} onPointerDown={()=>setHeld(3)} onPointerUp={()=>setHeld(-1)} onPointerCancel={()=>setHeld(-1)}/>
   </div>
   <p className="values">Progress <output>{Math.round(progress*100)}%</output><span>Switch {switchPosition>=.5?'On':'Off'}</span><span>Center {(1+settings.refractionLevel/6).toFixed(2)}×</span></p>
   <label className="source-word">Source text<input aria-label="Review source text" value={word} onChange={e=>setWord(e.target.value)} maxLength={36}/></label>
   <p className="note">The field text is native and stays clear. Its grid background is refracted. Slider and switch tracks are the source; their glass thumbs use the selected renderer. A keeps the previous center profile, not the previous SVG thumb renderer.</p>
   {error&&<p role="alert">{error}</p>}
  </section><aside aria-label="Shared material parameters">
   <h2>Shared parameters</h2><button className="plain" onClick={()=>setSettings({...DEFAULT_SETTINGS,refractionLevel:3,blurLevel:0,progressiveBlur:0,glassOpacity:.08,ambient:false})}>Sharp comparison</button>
   {PARAMETER_ROWS.map(row=><label key={row.key}>{row.label}<output>{settings[row.key].toFixed(row.precision)}</output><input aria-label={row.label} type="range" min={row.min} max={row.max} step={row.step} value={settings[row.key]} onChange={e=>setting(row.key,Number(e.target.value))}/></label>)}
   <p className="note">All seven ranges are retained. Interaction strength changes held-shape deformation, not optical power. These are local controlled-scene approximations; cross-browser acceptance is pending.</p>
  </aside></div>
  <LargePanels model={latest.current} onOptionChange={choose}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
