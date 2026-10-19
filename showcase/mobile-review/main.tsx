import { StrictMode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import {createRoot} from 'react-dom/client';
import {ControlledScene,GlassSlider,GlassSwitch,LiquidControl,PARAMETER_ROWS,VolumeStage,useGlassSettings,type ControlledSceneSize,type VolumeStageHandle} from '../../src';
import {observeDeviceInput} from './diagnostics';
import '../../styles/glass.css';
import '../../assets/fonts.css';
import './review.css';
import wordmark from '../../assets/brand/alvenx-wordmark.svg';

const REPO='https://github.com/AlbertXXuu/alvenx-liquid-glass';
const Arrow=()=> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6m-5 5 5-5 5 5"/></svg>;

function MobileReview(){
 const controller=useGlassSettings({storageKey:'alvenx-mobile-review-r3-20261019'}),{clock,settings,updateSettings,reduced,systemReduced}=controller;
 const stage=useRef<VolumeStageHandle>(null),[playing,setPlaying]=useState(false);
 const [position,setPosition]=useState({x:.32,y:.31}),pending=useRef<typeof position|null>(null),lastPosition=useRef(position);lastPosition.current=position;
 const [lensHeld,setLensHeld]=useState(false),[lensFocus,setLensFocus]=useState(false),lens=useRef<HTMLDivElement>(null);
 const drag=useRef<null|{id:number;startX:number;startY:number;x:number;y:number;width:number;height:number;lensWidth:number;lensHeight:number}>(null);
 const [sourceText,setSourceText]=useState('Clarity'),[sample,setSample]=useState(.42),[on,setOn]=useState(true),[message,setMessage]=useState(''),[feedback,setFeedback]=useState('');
 const [parameters,setParameters]=useState(false),[deviceOpen,setDeviceOpen]=useState(false),[deviceText,setDeviceText]=useState(''),[copyStatus,setCopyStatus]=useState('');
 const trace=useRef<ReturnType<typeof observeDeviceInput>|null>(null);
 const uid=useId().replace(/[^a-z0-9]/gi,'');
 useEffect(()=>{const observer=observeDeviceInput();trace.current=observer;return()=>{observer.destroy();trace.current=null;};},[]);
 useLayoutEffect(()=>clock.subscribe(()=>{if(!pending.current)return false;setPosition(pending.current);pending.current=null;return false;}),[clock]);
 const release=()=>{const id=drag.current?.id;drag.current=null;setLensHeld(false);if(id!==undefined&&lens.current?.hasPointerCapture(id))lens.current.releasePointerCapture(id);};
 useEffect(()=>{const stop=()=>release();window.addEventListener('blur',stop);window.addEventListener('resize',stop);return()=>{window.removeEventListener('blur',stop);window.removeEventListener('resize',stop);};},[]);
 const moveLens=(event:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d||event.pointerId!==d.id)return;pending.current={x:Math.max(d.lensWidth/2,Math.min(d.width-d.lensWidth/2,d.x*d.width+event.clientX-d.startX))/d.width,y:Math.max(d.lensHeight/2,Math.min(d.height-d.lensHeight/2,d.y*d.height+event.clientY-d.startY))/d.height};clock.wake();};
 const paint=useCallback(({width,height}:ControlledSceneSize)=>{
  const small=width<450;
  return <>
   <defs><linearGradient id={`${uid}-board`} x2="1" y2="1"><stop stopColor="#CDDEFF"/><stop offset=".52" stopColor="#E1E8FC"/><stop offset="1" stopColor="#DCCCF5"/></linearGradient><pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#7F8DBB" strokeWidth=".65" opacity=".33"/></pattern><linearGradient id={`${uid}-stripe`}><stop stopColor="#658CE4"/><stop offset="1" stopColor="#A28ADC"/></linearGradient></defs>
   <rect width={width} height={height} fill={`url(#${uid}-board)`}/><rect width={width} height={height} fill={`url(#${uid}-grid)`}/>
   <text x={width*.085} y={height*.31} fill="#425990" fontSize={small?40:60} fontWeight="600" letterSpacing="-2" style={{pointerEvents:'auto',userSelect:'text'}}>{sourceText.slice(0,18)}</text>
   <text x={width*.085} y={height*.47} fill="#7865AE" fontFamily="MiSans,sans-serif" fontSize={small?25:32} fontWeight="500" style={{pointerEvents:'auto',userSelect:'text'}}>光与形</text>
   <text x={width*.085} y={height*.61} fill="#596C92" fontSize={small?15:19}>A clear view. A living edge.</text>
   <rect x={width*.085} y={height*.76} width={width*.83} height="15" rx="7.5" fill="#BFC7E2"/><rect x={width*.085} y={height*.76} width={width*.83*sample} height="15" rx="7.5" fill={`url(#${uid}-stripe)`}/>
  </>;
 },[sourceText,sample,uid]);
 const fieldPaint=useCallback(({width,height}:ControlledSceneSize)=><><defs><linearGradient id={`${uid}-field`} x2="1" y2="1"><stop stopColor="#CDDEFC"/><stop offset="1" stopColor="#D9CEF1"/></linearGradient><pattern id={`${uid}-field-grid`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#8995BE" strokeWidth=".7" opacity=".35"/></pattern></defs><rect width={width} height={height} fill={`url(#${uid}-field)`}/><rect width={width} height={height} fill={`url(#${uid}-field-grid)`}/></>,[uid]);
 const showDevice=()=>{setDeviceText(JSON.stringify(trace.current?.snapshot(),null,2));setDeviceOpen(true);setCopyStatus('');};
 return <div className="alvenx-design lab">
  <header className="lab-header"><img src={wordmark} alt="AlvenX" width="150"/><span>R3 / MOBILE REVIEW</span><a href={`${REPO}/tree/review-20261019-r3`} target="_blank" rel="noreferrer">Source ↗</a></header>
  <main>
   <section className="lab-intro"><p className="eyebrow">TOUCH · TRACKPAD · REFRACTION</p><h1>Glass that follows<br/>your hand.</h1><p>Touch the form to shape it. Swipe the surrounding space to scroll. Explore live refraction with your finger or trackpad.</p><a href="https://alvenx.com/ui/review-20261019-r2/">Compare the previous review ↗</a></section>
   <section id="volume" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">01 / A CONTINUOUS FORM</p><h2>Hold the form.<br className="phone-break"/> Move in any direction.</h2></div><LiquidControl id="r3-replay" clock={clock} className="lab-replay" disabled={playing||reduced} onClick={()=>stage.current?.replay()}>{playing?'Budding…':'Replay slow budding'} ↗</LiquidControl></div>
    <VolumeStage ref={stage} clock={clock} settings={settings} responsive studioMotion onPlayingChange={setPlaying} ariaLabel="Touch the pearl form; swipe its surrounding background to scroll"><p className="eyebrow">YOUR SPACE</p><h3>A little room<br/>{' '}to grow.</h3><p className="volume-caption">Mother. Connection. Possibility.</p></VolumeStage>
    <div className="lab-volume-footer"><p>On the pearl: pull, hold, release.<br/>Outside the pearl: scroll freely.</p><div className="lab-switches"><GlassSwitch id="r3-ambient" label="Background motion" checked={settings.ambient} clock={clock} controlledRefraction onChange={ambient=>updateSettings({ambient})}/><GlassSwitch id="r3-reduced" label="Reduced motion" checked={reduced} disabled={systemReduced} clock={clock} controlledRefraction onChange={reducedMotion=>updateSettings({reducedMotion})}/></div></div>
   </section>
   <section id="refraction" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">02 / LOOK THROUGH IT</p><h2>A source. A lens.<br/>Real displacement.</h2></div><p className="section-copy">Drag the lens over the letters or the line. The scene is shared by the background and the glass.</p></div>
    <div className="lab-study-grid"><ControlledScene className="lab-optical-scene" paint={paint}>
     <div ref={lens} className="lab-moving-lens" style={{left:`${position.x*100}%`,top:`${position.y*100}%`}}
      onPointerDown={e=>{if(e.button!==0||e.isPrimary===false||drag.current||!(e.target as Element).closest('.glass-hit'))return;e.preventDefault();const rect=e.currentTarget.parentElement!.getBoundingClientRect(),box=e.currentTarget.getBoundingClientRect();drag.current={id:e.pointerId,startX:e.clientX,startY:e.clientY,...lastPosition.current,width:rect.width,height:rect.height,lensWidth:box.width,lensHeight:box.height};e.currentTarget.setPointerCapture(e.pointerId);setLensHeld(true);}}
      onPointerMove={moveLens} onPointerUp={e=>{if(drag.current?.id===e.pointerId){moveLens(e);release();}}} onPointerCancel={e=>{if(drag.current?.id===e.pointerId)release();}} onLostPointerCapture={e=>{if(e.target===e.currentTarget&&drag.current?.id===e.pointerId)release();}}
      onFocus={()=>setLensFocus(true)} onBlur={()=>{setLensFocus(false);release();}}
      onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();pending.current=null;setPosition(p=>e.key==='Home'?{x:.32,y:.31}:{x:Math.max(.25,Math.min(.75,p.x+(e.key==='ArrowLeft'?-.025:e.key==='ArrowRight'?.025:0))),y:Math.max(.2,Math.min(.8,p.y+(e.key==='ArrowUp'?-.025:e.key==='ArrowDown'?.025:0)))});}}>
      <LiquidControl id="r3-free-lens" clock={clock} className="lab-lens-glass" label="Drag the refractive lens, or use arrow keys" interaction={{pressed:lensHeld,focused:lensFocus,position:`${position.x}:${position.y}`}}>{null}</LiquidControl>
     </div>
    </ControlledScene><div className="lab-controls">
     <GlassSlider id="r3-sample" label="Source line" value={sample} min={0} max={1} step={.01} clock={clock} controlledRefraction onChange={setSample}/>
     <GlassSwitch id="r3-continuous" label="Continuous switch" checked={on} clock={clock} controlledRefraction onChange={setOn}/>
     <p className="specimen-feedback">{on?'On':'Off'} <span>·</span> Source line {sample.toFixed(2)}</p>
     <label className="source-editor">Source word<input aria-label="Source word" value={sourceText} maxLength={18} onChange={e=>setSourceText(e.target.value)}/></label>
     <p className="section-copy">Change the word or line. Their refracted pixels update inside the lens. Text outside it stays untouched.</p>
    </div></div>
   </section>
   <section id="fields" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">03 / TYPE CLEARLY</p><h2>The surface bends.<br/>Your words stay clear.</h2></div><p className="section-copy">Native text, selection and keyboard editing above the optical layer.</p></div>
    <ControlledScene className="lab-field-scene" paint={fieldPaint}><form className="lab-composer" onSubmit={e=>{e.preventDefault();setFeedback(message.trim()?'Saved in this preview.':'Write a message before sending.');}}><LiquidControl id="r3-message" clock={clock} kind="field" className="lab-message"><input aria-label="Preview message" placeholder="Ask anything…" value={message} onChange={e=>{setMessage(e.target.value);setFeedback('');}}/></LiquidControl><LiquidControl id="r3-send" clock={clock} kind="circle" className="lab-send" label="Send preview message" type="submit"><Arrow/></LiquidControl></form><p className="lab-message-feedback" role="status">{feedback}</p></ControlledScene>
   </section>
   <section className="lab-section lab-parameters"><div className="lab-parameters-heading"><LiquidControl id="r3-parameters" clock={clock} className="lab-disclosure" expanded={parameters} onClick={()=>setParameters(!parameters)}>Surface parameters <span>{parameters?'−':'+'}</span></LiquidControl><LiquidControl id="r3-reset" clock={clock} className="lab-reset" onClick={controller.reset}>Reset defaults</LiquidControl></div>{parameters&&<div className="lab-parameter-grid">{PARAMETER_ROWS.map(row=><GlassSlider key={row.key} id={row.key} label={row.label} min={row.min} max={row.max} step={row.step} precision={row.precision} unit={row.unit} value={settings[row.key]} clock={clock} controlledRefraction onChange={value=>updateSettings({[row.key]:value})}/>)}</div>}</section>
   <section className="lab-section lab-device"><div className="lab-section-heading"><div><p className="eyebrow">DEVICE REVIEW</p><h2>Try it on your device.</h2></div><LiquidControl id="r3-device-check" clock={clock} className="lab-disclosure" onClick={showDevice}>Show input report ↗</LiquidControl></div><p className="section-copy">If a touch or trackpad drag fails, the local report shows which input and capture events reached this page. Frame timings describe scheduling, not physical display latency.</p>{deviceOpen&&<><pre tabIndex={0} aria-label="Local input report">{deviceText}</pre><div className="device-actions"><LiquidControl id="r3-copy-report" clock={clock} className="lab-disclosure" onClick={()=>{navigator.clipboard.writeText(deviceText).then(()=>setCopyStatus('Report copied.'),()=>setCopyStatus('Select the report text to copy.'));}}>Copy input report ↗</LiquidControl><p role="status">{copyStatus}</p></div></>}</section>
  </main><footer><img src={wordmark} alt="AlvenX" width="110"/><p>Independent R3 review · awaiting physical-device acceptance.<br/>Explicit scene refraction; arbitrary page capture is not provided.</p><a href={`${REPO}/tree/codex/mobile-optics-review-r3`}>Review source &amp; records ↗</a></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><MobileReview/></StrictMode>);
