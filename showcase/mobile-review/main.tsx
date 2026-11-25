import { StrictMode, useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import {createRoot} from 'react-dom/client';
import {ControlledScene,GlassPanel,GlassSlider,GlassSwitch,LiquidControl,MenuToggle,PARAMETER_ROWS,VolumeStage,useGlassSettings,balancedOpticsMetrics,type ControlledSceneSize,type VolumeStageHandle,type GlassOpticsMode} from '../../src';
import {observeDeviceInput} from './diagnostics';
import {useShowcaseLanguage,LanguageControl} from './localization';
import '../../styles/glass.css';
import '../../assets/fonts.css';
import './review.css';
import '../../styles/budding-volume.css';
import {ShowcaseBudding} from './ShowcaseBudding';
import {TextLensStudy} from './TextLensStudy';
import {HeaderNavTransmission} from './HeaderNavTransmission';
import {useStudioLight} from './StudioLight';
import {AssetRecord,archiveTag} from './AssetRecord';
import wordmark from '../../assets/brand/alvenx-wordmark.svg';

const REPO='https://github.com/AlbertXXuu/alvenx-liquid-glass';
const Arrow=()=> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6m-5 5 5-5 5 5"/></svg>;

function Showcase(){
 const {language,setLanguage,t,languageStatus}=useShowcaseLanguage();
 const requestedOptics=new URLSearchParams(window.location.search).get('optics');
 const optics:GlassOpticsMode=requestedOptics==='native'||requestedOptics==='flat'||requestedOptics==='svg'?requestedOptics:'auto';
 const controller=useGlassSettings({storageKey:'alvenx-design-showcase-v1',optics}),{clock,settings,updateSettings,reduced,systemReduced}=controller;
 const showcase=useRef<HTMLDivElement>(null);
 const studioLight=useStudioLight(clock,showcase,settings.ambient,reduced);
 const header=useRef<HTMLElement>(null),menuButton=useRef<HTMLButtonElement>(null),[menuOpen,setMenuOpen]=useState(false);
 const go=(id:string)=>{setMenuOpen(false);document.getElementById(id)?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
 const home=()=>{setMenuOpen(false);if(window.scrollY!==0)window.scrollTo({top:0,left:window.scrollX,behavior:reduced?'instant':'smooth'});};
 useEffect(()=>{if(!menuOpen)return;const outside=(e:globalThis.PointerEvent)=>{if(!header.current?.contains(e.target as Node))setMenuOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenuOpen(false);menuButton.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[menuOpen]);
 const stage=useRef<VolumeStageHandle>(null),[playing,setPlaying]=useState(false);
 const [on,setOn]=useState(true),[message,setMessage]=useState(''),[feedback,setFeedback]=useState('');
 const [panelGrid,setPanelGrid]=useState(false);
 const [parameters,setParameters]=useState(false),[deviceOpen,setDeviceOpen]=useState(false),[deviceText,setDeviceText]=useState(''),[copyStatus,setCopyStatus]=useState('');
 const trace=useRef<ReturnType<typeof observeDeviceInput>|null>(null);
 const uid=useId().replace(/[^a-z0-9]/gi,'');
 useEffect(()=>{const observer=observeDeviceInput();trace.current=observer;return()=>{observer.destroy();trace.current=null;};},[]);
 const fieldPaint=useCallback(({width,height}:ControlledSceneSize)=><><defs><linearGradient id={`${uid}-field`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0"><stop stopColor="#CDDEFC"/><stop offset="1" stopColor="#D9CEF1"/></linearGradient><pattern id={`${uid}-field-grid`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#8995BE" strokeWidth=".7" opacity=".35"/></pattern></defs><rect width={width} height={height} fill={`url(#${uid}-field)`}/><rect width={width} height={height} fill={`url(#${uid}-field-grid)`}/></>,[uid]);
 const fieldCanvas=useCallback((ctx:CanvasRenderingContext2D,{width,height}:ControlledSceneSize)=>{const g=ctx.createLinearGradient(0,0,width,0);g.addColorStop(0,'#CDDEFC');g.addColorStop(1,'#D9CEF1');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);ctx.strokeStyle='rgba(137,149,190,.35)';ctx.lineWidth=.35;ctx.beginPath();for(let x=.175;x<=width;x+=25){ctx.moveTo(x,0);ctx.lineTo(x,height)}for(let y=.175;y<=height;y+=25){ctx.moveTo(0,y);ctx.lineTo(width,y)}ctx.stroke()},[]);
 const showDevice=()=>{setDeviceText(JSON.stringify({...trace.current?.snapshot(),optics:balancedOpticsMetrics()},null,2));setDeviceOpen(true);setCopyStatus('');};
 return <div ref={showcase} className="alvenx-design lab ax-cubic-surface" style={{'--ax-glass-light-strength':settings.specularOpacity} as CSSProperties}>
  {studioLight}
  <a className="skip-link" href="#refraction">{t('Skip to the experience')}</a>
  <header ref={header} className="ax-product-header" data-menu-open={menuOpen}
   style={{
    '--ax-product-header-fill':`rgb(255 255 255 / ${Math.min(.87,settings.glassOpacity * .26 / .3)})`,
    '--lab-header-specular':settings.specularOpacity,
    '--lab-header-saturation':settings.specularSaturation === 2 ? 'none' : `saturate(${settings.specularSaturation / 2})`,
   } as CSSProperties}
   onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node))setMenuOpen(false);}}>
   <button type="button" data-alvenx-home aria-label={t('AlvenX — Back to top')} onClick={home}><img className="ax-product-header__wordmark" src={wordmark} alt="AlvenX" width="160" height="49"/></button>
   <MenuToggle ref={menuButton} className="lab-menu" aria-label={t('Navigation menu')} expanded={menuOpen} controls="showcase-navigation" reducedMotion={reduced} onClick={()=>setMenuOpen(!menuOpen)}/>
   <nav id="showcase-navigation" className="ax-cubic-surface" aria-label={t('Showcase')} onClick={event=>{if((event.target as Element).closest('a'))setMenuOpen(false);}}>
    <button type="button" onClick={()=>go('volume')}><span className="lab-nav-label ax-cubic-surface">{t('Experience')}</span></button>
    <button type="button" onClick={()=>go('refraction')}><span className="lab-nav-label ax-cubic-surface">{t('Components')}</span></button>
    <button type="button" onClick={()=>go('language')}><span className="lab-nav-label ax-cubic-surface">{t('Design')}</span></button>
    <button type="button" onClick={()=>go('code')}><span className="lab-nav-label ax-cubic-surface">{t('Code')}</span></button>
    <a href={REPO} target="_blank" rel="noreferrer" aria-label={t('GitHub (opens in a new tab)')}><span className="lab-nav-label ax-cubic-surface"><span>GitHub</span><span className="lab-nav-arrow" aria-hidden="true">↗</span></span></a>
    <LanguageControl language={language} onLanguageChange={setLanguage} busy={languageStatus==='loading'} error={languageStatus==='error'}/>
   </nav>
   <HeaderNavTransmission header={header} clock={clock}/>
  </header>
  <main>
   <section className="lab-intro"><div className="intro-heading"><h1>{t('Liquid Glass')}</h1></div></section>
   <section id="refraction" className="lab-section">
    <h2 className="visually-hidden">{t('Text refraction')}</h2>
    <div data-text-lens-stage>
     <TextLensStudy clock={clock} settings={settings} reduced={reduced} language={language} refractionEnabled={on} label={t('Sample text')} moveLabel={t('Drag the refractive lens, or use arrow keys')}
      statusText={status=>t(status==='error'?'The sample font could not load. Your text is kept; edit to retry.':status==='loading'?'Preparing sample typography…':'Finish choosing your text to update the sample.')}/>
    </div>
    <div className="lab-controls text-lens-controls">
     <GlassSwitch id="r3-continuous" label={t('Text refraction')} checked={on} clock={clock} controlledRefraction onChange={setOn}/>
    </div>
    <div className="lab-parameters" id="parameters"><div className="lab-parameters-heading"><LiquidControl id="r3-parameters" clock={clock} className="lab-disclosure" expanded={parameters} onClick={()=>setParameters(!parameters)}>{t('Surface parameters')} <span>{parameters?'−':'+'}</span></LiquidControl><LiquidControl id="r3-reset" clock={clock} className="lab-reset" onClick={controller.reset}>{t('Reset defaults')}</LiquidControl></div>{parameters&&<div className="lab-parameter-grid">{PARAMETER_ROWS.map(row=><GlassSlider key={row.key} id={row.key} label={t(row.label)} locale={language} min={row.min} max={row.max} step={row.step} precision={row.precision} unit={row.unit} value={settings[row.key]} clock={clock} controlledRefraction onChange={value=>updateSettings({[row.key]:value})}/>)}</div>}</div>
   </section>
   <section id="volume" className="lab-section"><h2 className="visually-hidden">{t('A continuous form.')}</h2>
    <div className="lab-section-heading"><LiquidControl id="r3-replay" clock={clock} className="lab-replay" disabled={playing||reduced} onClick={()=>stage.current?.replay()}>{t(playing?'Budding…':'Replay slow budding')}</LiquidControl></div>
    <div className="lab-material-workbench"><div className="lab-material-preview">
    <VolumeStage ref={stage} clock={clock} settings={settings} responsive studioMotion foregroundAnchor="chamber" autoPlay onPlayingChange={setPlaying} ariaLabel={t('Touch the pearl form; swipe its surrounding background to scroll')}><div className="lab-volume-copy"><h3>{t('Interactive preview')}</h3></div></VolumeStage></div>
    <div className="lab-volume-footer"><div className="lab-switches"><GlassSwitch id="r3-ambient" label={t('Background motion')} checked={settings.ambient} clock={clock} controlledRefraction onChange={ambient=>updateSettings({ambient})}/><GlassSwitch id="r3-reduced" label={t('Reduced motion')} checked={reduced} disabled={systemReduced} clock={clock} controlledRefraction onChange={reducedMotion=>updateSettings({reducedMotion})}/></div></div>
    <div className="lab-pearl-example"><p>{t('Try the glass')}</p><ShowcaseBudding id="showcase-living-pearl" clock={clock} ambient={settings.ambient} href="#refraction" destinationText={t('explore me!')} toggleLabel={t('Toggle explore link')}/></div>
    </div>
   </section>
   <section id="fields" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">{t('03 / TYPE CLEARLY')}</p><h2>{t('The surface bends.')}<br/>{t('Your words stay clear.')}</h2></div></div>
    <ControlledScene className="lab-field-scene" paint={fieldPaint} paintCanvas={fieldCanvas}><form className="lab-composer" onSubmit={e=>{e.preventDefault();const value=message.trim();setFeedback(!value?'Write a message before sending.':value.toLowerCase()==='fluency'?'<3':'Good question… but I don’t understand.');}}><LiquidControl id="r3-message" clock={clock} kind="field" className="lab-message"><input aria-label={t('Preview message')} placeholder={t('Ask anything…')} value={message} onChange={e=>{setMessage(e.target.value);setFeedback('');}}/></LiquidControl><LiquidControl id="r3-send" clock={clock} kind="circle" className="lab-send" label={t('Send preview message')} type="submit"><Arrow/></LiquidControl></form><p className="lab-message-feedback" role="status">{t(feedback)}</p></ControlledScene>
   </section>

   <section id="large-panels" className="lab-section lab-large-panels"><div className="lab-section-heading"><div><p className="eyebrow">{t('READ AND WRITE')}</p><h2>{t('A quiet center. A rounded edge.')}</h2></div><GlassSwitch id="panel-grid" label={t('Show background grid')} checked={panelGrid} clock={clock} controlledRefraction onChange={setPanelGrid}/></div>
    <h3>{t('Multiline editor')}</h3><GlassPanel id="native-editor" clock={clock} label={t('Multiline editor')} diagnostic={panelGrid} scrollable={false}><textarea aria-label={t('Multiline editor')} spellCheck={false} defaultValue={Array.from({length:14},(_,i)=>`${i+1}. ${t('A broad, quiet surface leaves room for your words. The background bends near the rounded edge while native text stays clear and editable.')}`).join('\n\n')}/></GlassPanel>
    <h3>{t('Reading panel')}</h3><GlassPanel id="native-reader" clock={clock} label={t('Reading panel')} diagnostic={panelGrid} className="lab-reading-panel"><h3>{t('Room to read.')}</h3>{Array.from({length:16},(_,i)=><p key={i}>{i+1}. {t('A broad, quiet surface leaves room for your words. The background bends near the rounded edge while native text stays clear and editable.')}</p>)}<p>{t('End of the reading sample.')}</p></GlassPanel>
   </section>
   <section id="language" className="lab-section"><p className="eyebrow">{t('04 / DESIGN LANGUAGE')}</p><h2>{t('Softness with a structure.')}</h2><div className="lab-principles"><article><span>{t('01 / FORM')}</span><h3>{t('Full volume')}</h3><p>{t('A mother form, a soft connection and an expanding chamber share one continuous contour.')}</p></article><article><span>{t('02 / LIGHT')}</span><h3>{t('Light at the edge')}</h3><p>{t('Blue, indigo and violet give the material depth. Edge light follows its living contour.')}</p></article><article><span>{t('03 / MOTION')}</span><h3>{t('Motion with memory')}</h3><p>{t('Continuous gestures, bounded resistance and a return after release preserve the movement of your hand.')}</p></article><article><span>{t('04 / TYPE')}</span><h3>{t('Text stays text')}</h3><p>{t('Instrument Sans and MiSans stay readable. Native editing preserves the caret and selection.')}</p></article></div><div className="lab-type-sample"><p>{t('Room for a new idea.')}</p><p className="type-sample-secondary">{t('Space for an idea to grow.')}</p><span>{t('Instrument Sans / MiSans · Native, selectable text')}</span></div></section>
   <section id="code" className="lab-section"><div className="lab-section-heading"><div><p className="eyebrow">{t('05 / INSPECT THE SYSTEM')}</p><h2>{t('A material you can explore.')}</h2></div><a href={`${REPO}/tree/${archiveTag}`}>{t('Published source')} ↗</a></div><p className="code-copy">{t('React components, continuous geometry, scoped styles and editable material parameters. Source is public for inspection; reuse requires permission under the reserved-rights notice.')}</p><pre tabIndex={0} aria-label={t('Run the showcase locally')}><code>npm ci{'\n'}npm run check{'\n'}npm run dev</code></pre><div className="lab-doc-links"><a href="#asset-record">{t('Design record')} ↓</a><a href={`${REPO}/blob/${archiveTag}/docs/design-language.md`}>{t('Design language')} ↗</a><a href={`${REPO}/blob/${archiveTag}/docs/integration.md`}>{t('Integration guide')} ↗</a><a href={`${REPO}/blob/${archiveTag}/docs/compatibility.md`}>{t('Browser support')} ↗</a><a href={`${REPO}/blob/${archiveTag}/docs/attribution.md`}>{t('Credits & licenses')} ↗</a></div></section>
   <AssetRecord repository={REPO} t={t}/>
   <section className="lab-section lab-device"><div className="lab-section-heading"><div><p className="eyebrow">{t('DEVICE REVIEW')}</p><h2>{t('Try it on your device.')}</h2></div><LiquidControl id="r3-device-check" clock={clock} className="lab-disclosure" onClick={showDevice}>{t('Show input report')} ↗</LiquidControl></div>{deviceOpen&&<><pre tabIndex={0} aria-label={t('Local input report')}>{deviceText}</pre><div className="device-actions"><LiquidControl id="r3-copy-report" clock={clock} className="lab-disclosure" onClick={()=>{navigator.clipboard.writeText(deviceText).then(()=>setCopyStatus('Report copied.'),()=>setCopyStatus('Select the report text to copy.'));}}>{t('Copy input report')} ↗</LiquidControl><p role="status">{t(copyStatus)}</p></div></>}</section>
  </main><footer><img src={wordmark} alt="AlvenX" width="110"/><p>{t('Shaped for interaction.')}<br/>{archiveTag} · {t('All rights reserved.')}</p><div><a href={`${REPO}/tree/${archiveTag}`}>GitHub ↗</a><a href="https://alvenx.com/">AlvenX.com ↗</a><a href={`${REPO}/blob/${archiveTag}/LICENSE-NOTICE.md`}>{t('License notice')} ↗</a></div></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Showcase/></StrictMode>);
