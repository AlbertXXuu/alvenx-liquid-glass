import { StrictMode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import {createRoot} from 'react-dom/client';
import {ControlledScene,GlassSlider,GlassSwitch,LiquidControl,PARAMETER_ROWS,VolumeStage,useGlassSettings,type ControlledSceneSize,type VolumeStageHandle,type GlassOpticsMode} from '../../src';
import {observeDeviceInput} from './diagnostics';
import {useSampleText,SAMPLE_TEXT_FAMILY,SAMPLE_TEXT_LIMIT} from './useSampleText';
import '../../styles/glass.css';
import '../../assets/fonts.css';
import './review.css';
import wordmark from '../../assets/brand/alvenx-wordmark.svg';

const REPO='https://github.com/AlbertXXuu/alvenx-liquid-glass';
const Arrow=()=> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6m-5 5 5-5 5 5"/></svg>;

function Showcase(){
 const requestedOptics=new URLSearchParams(window.location.search).get('optics');
 const optics:GlassOpticsMode=requestedOptics==='native'||requestedOptics==='flat'||requestedOptics==='svg'?requestedOptics:'auto';
 const controller=useGlassSettings({storageKey:'alvenx-design-showcase-v1',optics}),{clock,settings,updateSettings,reduced,systemReduced}=controller;
 const header=useRef<HTMLElement>(null),menuButton=useRef<HTMLButtonElement>(null),[menuOpen,setMenuOpen]=useState(false);
 const go=(id:string)=>{setMenuOpen(false);document.getElementById(id)?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
 const home=()=>{setMenuOpen(false);if(window.scrollY!==0)window.scrollTo({top:0,left:window.scrollX,behavior:reduced?'instant':'smooth'});};
 useEffect(()=>{if(!menuOpen)return;const outside=(e:globalThis.PointerEvent)=>{if(!header.current?.contains(e.target as Node))setMenuOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenuOpen(false);menuButton.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[menuOpen]);
 const stage=useRef<VolumeStageHandle>(null),[playing,setPlaying]=useState(false);
 const [position,setPosition]=useState({x:.32,y:.31}),pending=useRef<typeof position|null>(null),lastPosition=useRef(position);lastPosition.current=position;
 const [lensHeld,setLensHeld]=useState(false),[lensFocus,setLensFocus]=useState(false),lens=useRef<HTMLDivElement>(null);
 const drag=useRef<null|{id:number;startX:number;startY:number;x:number;y:number;width:number;height:number;lensWidth:number;lensHeight:number}>(null);
 const sampleText=useSampleText(),sourceText=sampleText.value;
 const [sample,setSample]=useState(.5),[on,setOn]=useState(true),[message,setMessage]=useState(''),[feedback,setFeedback]=useState('');
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
   <text x={width*.085} y={height*.31} fill="#425990" fontFamily={SAMPLE_TEXT_FAMILY} fontSize={small?40:60} fontWeight="600" letterSpacing="-2" style={{pointerEvents:'auto',userSelect:'text'}}>{sourceText}</text>
   <text x={width*.085} y={height*.47} fill="#7865AE" fontFamily="MiSans,sans-serif" fontSize={small?25:32} fontWeight="500" style={{pointerEvents:'auto',userSelect:'text'}}>光与形</text>
   <text x={width*.085} y={height*.61} fill="#596C92" fontSize={small?15:19}>A clear view. A living edge.</text>
   <rect x={width*.085} y={height*.76} width={width*.83} height="15" rx="7.5" fill="#BFC7E2"/><rect x={width*.085} y={height*.76} width={width*.83*sample} height="15" rx="7.5" fill={`url(#${uid}-stripe)`}/>
  </>;
 },[sourceText,sample,uid]);
 const fieldPaint=useCallback(({width,height}:ControlledSceneSize)=><><defs><linearGradient id={`${uid}-field`} x2="1" y2="1"><stop stopColor="#CDDEFC"/><stop offset="1" stopColor="#D9CEF1"/></linearGradient><pattern id={`${uid}-field-grid`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#8995BE" strokeWidth=".7" opacity=".35"/></pattern></defs><rect width={width} height={height} fill={`url(#${uid}-field)`}/><rect width={width} height={height} fill={`url(#${uid}-field-grid)`}/></>,[uid]);
 const showDevice=()=>{setDeviceText(JSON.stringify(trace.current?.snapshot(),null,2));setDeviceOpen(true);setCopyStatus('');};
 return <div className="alvenx-design lab">
  <a className="skip-link" href="#volume">Skip to the experience</a>
  <header ref={header} className="ax-product-header" data-menu-open={menuOpen}>
   <button type="button" data-alvenx-home aria-label="AlvenX — Back to top" onClick={home}><img className="ax-product-header__wordmark" src={wordmark} alt="AlvenX" width="160" height="49"/></button>
   <button type="button" ref={menuButton} className="lab-menu" aria-label="Navigation menu" aria-expanded={menuOpen} aria-controls="showcase-navigation" onClick={()=>setMenuOpen(!menuOpen)}><span aria-hidden="true">{menuOpen?'−':'+'}</span> Menu</button>
   <nav id="showcase-navigation" aria-label="Showcase"><button type="button" onClick={()=>go('volume')}>Experience</button><button type="button" onClick={()=>go('refraction')}>Components</button><button type="button" onClick={()=>go('language')}>Design</button><button type="button" onClick={()=>go('code')}>Code</button><a href={REPO} target="_blank" rel="noreferrer" aria-label="GitHub (opens in a new tab)">GitHub ↗</a></nav>
  </header>
  <main>
   <section className="lab-intro"><p className="eyebrow">ALVENX LIQUID GLASS · INTERACTIVE DESIGN SYSTEM</p><h1>Glass that follows<br/>your hand.</h1><p>Touch the form to shape it. Swipe the surrounding space to scroll. Explore live refraction with your finger or trackpad.</p><button type="button" className="intro-link" onClick={()=>go('volume')}>Explore the material <span aria-hidden="true">↓</span></button><span className="intro-version">V1.2.2 · PUBLIC DESIGN PREVIEW</span></section>
   <section id="volume" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">01 / A CONTINUOUS FORM</p><h2>Hold the form.<br className="phone-break"/> Move in any direction.</h2></div><LiquidControl id="r3-replay" clock={clock} className="lab-replay" disabled={playing||reduced} onClick={()=>stage.current?.replay()}>{playing?'Budding…':'Replay slow budding'} ↗</LiquidControl></div>
    <div className="lab-material-workbench"><div className="lab-material-preview">
    <VolumeStage ref={stage} clock={clock} settings={settings} responsive studioMotion onPlayingChange={setPlaying} ariaLabel="Touch the pearl form; swipe its surrounding background to scroll"><p className="eyebrow">YOUR SPACE</p><h3>A little room<br/>{' '}to grow.</h3><p className="volume-caption">Mother. Connection. Possibility.</p></VolumeStage></div>
    <div className="lab-volume-footer"><p>On the pearl: pull, hold, release.<br/>Outside the pearl: scroll freely.</p><div className="lab-switches"><GlassSwitch id="r3-ambient" label="Background motion" checked={settings.ambient} clock={clock} controlledRefraction onChange={ambient=>updateSettings({ambient})}/><GlassSwitch id="r3-reduced" label="Reduced motion" checked={reduced} disabled={systemReduced} clock={clock} controlledRefraction onChange={reducedMotion=>updateSettings({reducedMotion})}/></div></div>
    <div className="lab-parameters" id="parameters"><div className="lab-parameters-heading"><LiquidControl id="r3-parameters" clock={clock} className="lab-disclosure" expanded={parameters} onClick={()=>setParameters(!parameters)}>Surface parameters <span>{parameters?'−':'+'}</span></LiquidControl><LiquidControl id="r3-reset" clock={clock} className="lab-reset" onClick={controller.reset}>Reset defaults</LiquidControl></div>{parameters&&<p className="lab-parameter-note">Tune the material below. The pearl above and the glass controls share these settings.</p>}{parameters&&<div className="lab-parameter-grid">{PARAMETER_ROWS.map(row=><GlassSlider key={row.key} id={row.key} label={row.label} min={row.min} max={row.max} step={row.step} precision={row.precision} unit={row.unit} value={settings[row.key]} clock={clock} controlledRefraction onChange={value=>updateSettings({[row.key]:value})}/>)}</div>}</div>
    </div>
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
     <GlassSlider id="r3-sample" label="Progress" value={sample*100} min={0} max={100} step={1} precision={0} unit="%" clock={clock} controlledRefraction onChange={value=>setSample(value/100)}/>
     <GlassSwitch id="r3-continuous" label="Continuous switch" checked={on} clock={clock} controlledRefraction onChange={setOn}/>
     <p className="specimen-feedback">{on?'On':'Off'} <span>·</span> Progress {Math.round(sample*100)}%</p>
     <label className="source-editor">Sample text<input aria-label="Sample text" aria-describedby="sample-text-status" {...sampleText.inputProps}/><span className="sample-text-status" id="sample-text-status" role="status">{sampleText.status==='error'?'The sample font could not load. Your text is kept; edit to retry.':sampleText.status==='loading'?'Preparing sample typography…':sampleText.status==='composing'?'Finish choosing your text to update the sample.':`Up to ${SAMPLE_TEXT_LIMIT} characters.`}</span></label>
     <p className="section-copy">Change the word or line. Their refracted pixels update inside the lens. Text outside it stays untouched.</p>
    </div></div>
   </section>
   <section id="fields" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">03 / TYPE CLEARLY</p><h2>The surface bends.<br/>Your words stay clear.</h2></div><p className="section-copy">Native text, selection and keyboard editing above the optical layer.</p></div>
    <ControlledScene className="lab-field-scene" paint={fieldPaint}><form className="lab-composer" onSubmit={e=>{e.preventDefault();const value=message.trim();setFeedback(!value?'Write a message before sending.':value.toLowerCase()==='fluency'?'<3':'Good question… but I don’t understand.');}}><LiquidControl id="r3-message" clock={clock} kind="field" className="lab-message"><input aria-label="Preview message" placeholder="Ask anything…" value={message} onChange={e=>{setMessage(e.target.value);setFeedback('');}}/></LiquidControl><LiquidControl id="r3-send" clock={clock} kind="circle" className="lab-send" label="Send preview message" type="submit"><Arrow/></LiquidControl></form><p className="lab-message-feedback" role="status">{feedback}</p></ControlledScene>
   </section>

   <section id="language" className="lab-section"><p className="eyebrow">04 / DESIGN LANGUAGE</p><h2>Softness with a structure.</h2><div className="lab-principles"><article><span>01 / FORM</span><h3>Full volume</h3><p>A mother form, a soft connection and an expanding chamber share one continuous contour.</p></article><article><span>02 / LIGHT</span><h3>Light at the edge</h3><p>Blue, indigo and violet give the material depth. Edge light follows its living contour.</p></article><article><span>03 / MOTION</span><h3>Motion with memory</h3><p>Continuous gestures, bounded resistance and a return after release preserve the movement of your hand.</p></article><article><span>04 / TYPE</span><h3>Text stays text</h3><p>Instrument Sans and MiSans stay readable, selectable and editable above the optical layer.</p></article></div><div className="lab-type-sample"><p>Room for a new idea.</p><p lang="zh-CN">给想法一个慢慢生长的空间。</p><span>Instrument Sans / MiSans · Native, selectable text</span></div></section>
   <section id="code" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">05 / INSPECT THE SYSTEM</p><h2>A material you can explore.</h2></div><a href={`${REPO}/tree/v1.2.2`}>Explore the source ↗</a></div><p className="code-copy">React components, continuous geometry, scoped styles and editable material parameters. Source is public for inspection; reuse requires permission under the reserved-rights notice.</p><pre tabIndex={0} aria-label="Run the showcase locally"><code>git clone {REPO}.git{'\n'}cd alvenx-liquid-glass{'\n'}git checkout v1.2.2{'\n'}npm ci{'\n'}npm run dev</code></pre><div className="lab-doc-links"><a href={`${REPO}/blob/v1.2.2/docs/design-language.md`}>Design language ↗</a><a href={`${REPO}/blob/v1.2.2/docs/integration.md`}>Integration guide ↗</a><a href={`${REPO}/blob/v1.2.2/docs/compatibility.md`}>Browser support ↗</a><a href={`${REPO}/blob/v1.2.2/docs/attribution.md`}>Credits &amp; licenses ↗</a></div><p className="code-boundary">Large forms use a 2.5D lighting environment. The interactive specimens refract a shared SVG scene, including its live text and progress. Arbitrary page capture is not provided. Physical iPhone and iPad validation continues with device feedback.</p></section>
   <section className="lab-section lab-device"><div className="lab-section-heading"><div><p className="eyebrow">DEVICE REVIEW</p><h2>Try it on your device.</h2></div><LiquidControl id="r3-device-check" clock={clock} className="lab-disclosure" onClick={showDevice}>Show input report ↗</LiquidControl></div><p className="section-copy">If a touch or trackpad drag fails, the local report shows which input and capture events reached this page. Frame timings describe scheduling, not physical display latency.</p>{deviceOpen&&<><pre tabIndex={0} aria-label="Local input report">{deviceText}</pre><div className="device-actions"><LiquidControl id="r3-copy-report" clock={clock} className="lab-disclosure" onClick={()=>{navigator.clipboard.writeText(deviceText).then(()=>setCopyStatus('Report copied.'),()=>setCopyStatus('Select the report text to copy.'));}}>Copy input report ↗</LiquidControl><p role="status">{copyStatus}</p></div></>}</section>
  </main><footer><img src={wordmark} alt="AlvenX" width="110"/><p>Shaped for interaction.<br/>V1.2.2 · Public design preview · All rights reserved.</p><div><a href={`${REPO}/tree/v1.2.2`}>GitHub ↗</a><a href="https://alvenx.com/">AlvenX.com ↗</a><a href={`${REPO}/blob/v1.2.2/LICENSE-NOTICE.md`}>License notice ↗</a></div></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Showcase/></StrictMode>);
