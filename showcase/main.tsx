import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiquidControl, GlassSlider, GlassSwitch, VolumeStage, PARAMETER_ROWS, useGlassSettings, resolveGlassOptics, type GlassOpticsMode, type VolumeStageHandle } from '../src';
import '../styles/glass.css';
import '../assets/fonts.css';
import './showcase.css';
import wordmark from '../assets/brand/alvenx-wordmark.svg';

const GITHUB = 'https://github.com/AlbertXXuu/alvenx-liquid-glass';
const REVIEW_REF = 'review-20261019-r2';
const REVIEW_SOURCE = GITHUB + '/tree/' + REVIEW_REF;
const SECTIONS = [['experience', 'Experience'], ['components', 'Components'], ['language', 'Design'], ['reuse', 'Code']] as const;
const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6m-5 5 5-5 5 5" transform={diagonal ? 'rotate(45 12 12)' : undefined}/></svg>;
const usage = `import { LiquidControl, useGlassSettings } from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/fonts.css';

function Example() {
  const { clock } = useGlassSettings({ storageKey: 'my-ui-glass' });
  return <div className="alvenx-design">
    <LiquidControl id="continue" clock={clock}
      className="my-button" onClick={() => console.log('Continue')}>
      Continue
    </LiquidControl>
  </div>;
}
// .my-button { width: 160px; height: 48px; }`;

function Showcase() {
  const requestedOptics = new URLSearchParams(location.search).get('optics');
  const optics: GlassOpticsMode = requestedOptics === 'svg' || requestedOptics === 'native' || requestedOptics === 'flat' ? requestedOptics : 'auto';
  const { clock, settings, updateSettings, reset, reduced, systemReduced } = useGlassSettings({ storageKey: 'alvenx-design-showcase-review-20261019-r2', optics });
  const stage = useRef<VolumeStageHandle>(null), messageInput = useRef<HTMLInputElement>(null), experience = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null), menuButton = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(false), [message, setMessage] = useState(''), [feedback, setFeedback] = useState('');
  const [parametersOpen, setParametersOpen] = useState(true), [playing, setPlaying] = useState(false), [copied, setCopied] = useState(''), [sampleSwitch, setSampleSwitch] = useState(true);
  const [sampleValue, setSampleValue] = useState(.42), [lens, setLens] = useState({ x: .3, y: .45 }), [lensHeld, setLensHeld] = useState(false), [lensFocused, setLensFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lensArea = useRef<HTMLDivElement>(null), lensDrag = useRef<{ id: number; x: number; y: number; left: number; top: number; width:number; height:number; element:HTMLDivElement } | null>(null);
  const lensPosition=useRef(lens);lensPosition.current=lens;
  const pendingLens=useRef<typeof lens|null>(null);
  const mode = resolveGlassOptics(optics);
  const studioMotion=new URLSearchParams(location.search).get('studio')!=='off';
  const behavior = reduced ? 'instant' : 'smooth';
  const go = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' }); };
  const home = () => { setMenuOpen(false); if (window.scrollY !== 0) window.scrollTo({ top: 0, left: window.scrollX, behavior }); };
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !header.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  useEffect(()=>clock.subscribe(()=>{
    if(pendingLens.current){const next=pendingLens.current;pendingLens.current=null;setLens(next);}
    return false;
  }),[clock]);
  const cancelLens=()=>{const active=lensDrag.current;lensDrag.current=null;setLensHeld(false);if(active?.element.hasPointerCapture(active.id))active.element.releasePointerCapture(active.id);};
  useEffect(()=>{
    window.addEventListener('blur',cancelLens);window.addEventListener('resize',cancelLens);
    return()=>{window.removeEventListener('blur',cancelLens);window.removeEventListener('resize',cancelLens);};
  },[]);
  const copy = async () => { try { await navigator.clipboard.writeText(usage); setCopied('Example copied.'); } catch { setCopied('Select and copy the example below.'); } };
  const moveLens = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = lensDrag.current; if (!d || d.id !== event.pointerId) return;
    pendingLens.current={ x: Math.max(0, Math.min(1, d.left + (event.clientX - d.x) / d.width)), y: Math.max(0, Math.min(1, d.top + (event.clientY - d.y) / d.height)) };
    clock.wake();
  };
  const startLens=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(event.button!==0||event.isPrimary===false||lensDrag.current)return;
    const r=lensArea.current?.getBoundingClientRect();if(!r)return;
    // Suppress native selection/drag initiation only on the movable lens.
    // Background typography and actual input fields retain native selection.
    event.preventDefault();
    event.currentTarget.querySelector('button')?.focus({preventScroll:true});
    event.currentTarget.setPointerCapture(event.pointerId);
    pendingLens.current=null;
    lensDrag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:lensPosition.current.x,top:lensPosition.current.y,width:Math.max(1,r.width-160),height:Math.max(1,r.height-96),element:event.currentTarget};
    setLensHeld(true);
  };
  const finishLens=(event:React.PointerEvent<HTMLDivElement>,cancel=false)=>{
    if(lensDrag.current?.id!==event.pointerId)return;
    if(!cancel)moveLens(event);
    cancelLens();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="alvenx-design showcase">
    <a className="skip-link" href="#experience">Skip to the live experience</a>
    <header ref={header} className="ax-product-header site-header">
      <button type="button" data-alvenx-home aria-label="AlvenX — Back to top" onClick={home}><img className="ax-product-header__wordmark" src={wordmark} alt="AlvenX" width="160" height="49"/></button>
      <button ref={menuButton} type="button" className="header-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="showcase-navigation" onClick={() => setMenuOpen(!menuOpen)}><span aria-hidden="true">{menuOpen ? '−' : '+'}</span><span>Menu</span></button>
      <nav id="showcase-navigation" className={menuOpen ? 'is-open' : ''} aria-label="Showcase sections">
        {SECTIONS.map(([id, label]) => <button type="button" key={id} className="header-link" onClick={() => go(id)}>{label}</button>)}
        <a className="header-link header-github" href={REVIEW_SOURCE} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
    <main>
      <section className="intro" aria-labelledby="intro-title">
        <div><p className="eyebrow">ALVENX LIQUID GLASS <span className="version">R2 · HORIZONTAL REVIEW</span></p><h1 id="intro-title">Soft volume.<br/><span>Living glass.</span></h1></div>
        <div className="intro-copy"><p>A surface that meets your gesture. Pearl-like depth, light at the edge, and controls that move with you.</p><div className="intro-actions"><LiquidControl id="explore-material" clock={clock} className="explore-control" onClick={() => go('experience')}>Explore the material <span aria-hidden="true">↓</span></LiquidControl><a href={REVIEW_SOURCE} target="_blank" rel="noreferrer">View the source <span aria-hidden="true">↗</span></a></div><p className="fineprint">Horizontal review · 19 Oct 2026. Separate preview settings.</p></div>
      </section>

      <section ref={experience} id="experience" className="experience" aria-labelledby="experience-title">
        <div className="section-heading experience-heading"><div><p className="eyebrow">01 / THE MATERIAL</p><h2 id="experience-title">One continuous surface.</h2></div><LiquidControl id="replay" clock={clock} className="replay" disabled={playing || reduced} onClick={() => stage.current?.replay()}>{playing ? 'Budding…' : 'Replay slow budding'} <span aria-hidden="true">↗</span></LiquidControl></div>
        <VolumeStage ref={stage} clock={clock} settings={settings} responsive studioMotion={studioMotion} onPlayingChange={setPlaying} ariaLabel="AlvenX pearl volume and interactive glass controls">
          <p className="eyebrow">YOUR SPACE</p><h3>What’s on your mind?</h3>
          <div className="idea-row"><LiquidControl id="idea" clock={clock} className="idea" selected={selected} onClick={() => { setSelected(!selected); setFeedback(''); }}><span className="idea-symbol" aria-hidden="true">✦</span><span><strong>A little inspiration</strong><small>{selected ? 'Selected for this preview' : 'Give an idea room to grow'}</small></span></LiquidControl><LiquidControl id="idea-action" clock={clock} kind="circle" className="inline-action" label="Use inspiration" onClick={() => { setSelected(true); setMessage('Help me explore a new idea.'); setFeedback('Added to your message.'); messageInput.current?.focus(); }}><Arrow diagonal/></LiquidControl></div>
          <form className="composer" onSubmit={event => { event.preventDefault(); setFeedback(message.trim() ? 'Saved in this preview.' : 'Write a message before sending.'); if (!message.trim()) messageInput.current?.focus(); }}><LiquidControl id="input" clock={clock} kind="field" className="input-frame"><input ref={messageInput} aria-label="Preview message" aria-describedby="preview-feedback" placeholder="Ask anything…" value={message} onChange={event => { setMessage(event.target.value); setFeedback(''); }}/></LiquidControl><LiquidControl id="send" clock={clock} kind="circle" type="submit" className="inline-action" label="Send preview message"><Arrow/></LiquidControl></form>
          <p id="preview-feedback" className="feedback" role="status">{feedback}</p>
        </VolumeStage>
        <div className="experience-footer"><p><span className="gesture-line">Press and pull the form. Explore the controls.</span><span>Explore the form and the glass. Your text stays clear.</span></p><div className="switches"><GlassSwitch id="ambient" label="Background motion" checked={settings.ambient} clock={clock} onChange={ambient => updateSettings({ ambient })}/><GlassSwitch id="reduced-motion" label="Reduced motion" checked={reduced} disabled={systemReduced} clock={clock} onChange={reducedMotion => updateSettings({ reducedMotion })}/></div></div>
        <section className="parameters" aria-label="Surface parameters"><div className="parameters-heading"><LiquidControl id="parameters-disclosure" clock={clock} className="parameters-disclosure" expanded={parametersOpen} onClick={() => setParametersOpen(!parametersOpen)}>Surface parameters <span aria-hidden="true">{parametersOpen ? '−' : '+'}</span></LiquidControl><LiquidControl id="reset" clock={clock} className="reset" onClick={reset}>Reset defaults</LiquidControl></div>{parametersOpen && <><p className="parameter-hint">Make it yours. Drag a lens or edit its value directly. Changes apply across this page and stay on this device.</p><div className="parameter-grid">{PARAMETER_ROWS.map(row => <GlassSlider key={row.key} id={row.key} clock={clock} label={row.label} value={settings[row.key]} min={row.min} max={row.max} step={row.step} unit={row.unit} onChange={value => updateSettings({ [row.key]: value })}/>)}</div></>}</section>
      </section>

      <section id="components" className="content-section" aria-labelledby="components-title"><div className="section-heading"><div><p className="eyebrow">02 / INTERACTION</p><h2 id="components-title">Small controls. Real response.</h2></div><p className="section-note">The details are in the gesture.</p></div>
        <div className="component-layout"><article className="lens-study"><div className="demo-title"><h3>Look through the surface.</h3><p>Drag the lens over the text. Focus it to use the arrow keys.</p></div><div className="lens-area" ref={lensArea}><div className="lens-backdrop" aria-hidden="true"><span>Clarity</span><span lang="zh-CN">光与形</span><span>Forms in motion.</span><div className="sample-stripe"/></div><div className="moving-lens" style={{ left: `calc((100% - 160px) * ${lens.x})`, top: `calc((100% - 96px) * ${lens.y})` }} onPointerDown={startLens} onPointerMove={moveLens} onPointerUp={event=>finishLens(event)} onPointerCancel={event=>finishLens(event,true)} onLostPointerCapture={event=>{if(event.target===event.currentTarget&&!event.currentTarget.hasPointerCapture(event.pointerId))finishLens(event,true);}} onFocus={() => setLensFocused(true)} onBlur={() => { setLensFocused(false); cancelLens(); }} onKeyDown={event => { const delta = event.shiftKey ? .1 : .025; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) { event.preventDefault(); pendingLens.current=null; cancelLens(); setLens(old => event.key === 'Home' ? { x: .3, y: .45 } : { x: Math.max(0, Math.min(1, old.x + (event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0))), y: Math.max(0, Math.min(1, old.y + (event.key === 'ArrowDown' ? delta : event.key === 'ArrowUp' ? -delta : 0))) }); } }}><LiquidControl id="moving-lens" clock={clock} className="free-lens" label="Drag optical lens, or move with arrow keys" interaction={{ pressed: lensHeld, focused: lensFocused, position: `${lens.x}:${lens.y}` }}>{null}</LiquidControl></div></div><p className="lens-caption">{mode === 'svg' ? 'Live browser backdrop refraction' : mode === 'native' ? 'Compatible glass material in this browser' : 'Flat glass material'} <span aria-hidden="true">·</span> Native text outside the lens stays untouched.</p></article>
        <article className="control-study"><div className="demo-title"><h3>Soft limits. Clear values.</h3><p>The value stops at the limit. The glass has room to move.</p></div><GlassSlider id="component-slider" label="Explore the endpoint" value={sampleValue} min={0} max={1} step={.01} clock={clock} onChange={setSampleValue}/><GlassSwitch id="component-switch" label="Continuous switch" checked={sampleSwitch} clock={clock} onChange={setSampleSwitch}/><p className="state-caption" role="status">{sampleSwitch ? 'On' : 'Off'} <span aria-hidden="true">/</span> Slider {sampleValue.toFixed(2)}</p><p className="small-copy">Pull past an endpoint and release. Catch the glass during its return. Switch state changes as the lens crosses the midpoint.</p><span className="component-index" aria-hidden="true">DRAG / RELEASE / REGRAB</span></article></div>
      </section>

      <section id="language" className="content-section" aria-labelledby="language-title"><p className="eyebrow">03 / DESIGN LANGUAGE</p><h2 id="language-title">Softness with a structure.</h2><div className="principles"><article><span>01 / FORM</span><h3>Full volume</h3><p>A mother form, a soft neck and an expanding chamber share one continuous shape. Pearl and depth give the large body its presence.</p></article><article><span>02 / LIGHT</span><h3>Light at the edge</h3><p>The optical rim follows the living contour. On supported browsers, local glass refracts the real backdrop beneath it.</p></article><article><span>03 / MOTION</span><h3>Motion with memory</h3><p>Continuous input, bounded resistance and a return after release preserve the gesture. Reduced motion keeps the state clear.</p></article><article><span>04 / TYPE</span><h3>Text stays text</h3><p>Instrument Sans and MiSans stay in the DOM, outside the optical filter. Readable insets give words room to breathe.</p></article></div><div className="type-sample"><span className="eyebrow">A QUIET PLACE TO READ</span><p className="latin-sample">Room for a new idea.</p><p lang="zh-CN">给想法一个慢慢生长的空间。</p><span>Instrument Sans / MiSans · Native, selectable text</span></div></section>

      <section id="reuse" className="content-section reuse-section" aria-labelledby="reuse-title"><div className="section-heading"><div><p className="eyebrow">04 / BUILD WITH IT</p><h2 id="reuse-title">Bring the language with you.</h2></div><LiquidControl id="copy-code" clock={clock} className="copy-control" onClick={copy}>Copy example <span aria-hidden="true">↗</span></LiquidControl></div><div className="reuse-intro"><p className="reuse-copy">Explore the React components, geometry, scoped styles and material parameters in the repository. Inspect and evaluate the showcase locally. Source is public; reuse requires permission under the reserved-rights notice.</p><a className="source-link" href={REVIEW_SOURCE} target="_blank" rel="noreferrer">Explore the repository <span aria-hidden="true">↗</span></a></div><pre tabIndex={0} aria-label="Run the showcase locally" className="start-command"><code>git clone {GITHUB}.git{'\n'}cd alvenx-liquid-glass{'\n'}git checkout {REVIEW_REF}{'\n'}npm ci &amp;&amp; npm run dev</code></pre><pre tabIndex={0} aria-label="React integration example"><code>{usage}</code></pre><p className="copy-status" role="status">{copied}</p><div className="reuse-links"><a href={`${GITHUB}/blob/${REVIEW_REF}/docs/design-language.md`}>Design language ↗</a><a href={`${GITHUB}/blob/${REVIEW_REF}/docs/integration.md`}>Integration guide ↗</a><a href="./docs/hover-comparison.html">Measured performance ↗</a><a href={`${GITHUB}/blob/${REVIEW_REF}/docs/compatibility.md`}>Browser support ↗</a><a href={`${GITHUB}/blob/${REVIEW_REF}/docs/attribution.md`}>Credits & licenses ↗</a></div>
        <div className="release-note"><span className="release-mark">EXPERIMENTAL RELEASE</span><p>A working design system with measured performance and explicit browser fallbacks. Large forms use a 2.5D environment; controls use local backdrop optics where supported. Physical Safari / iOS validation is still in progress.</p><a href={`${GITHUB}/blob/${REVIEW_REF}/docs/baseline-and-checklist.md`}>Read the validation checklist ↗</a></div>
      </section>
    </main>
    <footer className="site-footer"><div className="footer-brand"><img src={wordmark} width="112" height="34" alt="AlvenX"/><p>Shaped for interaction.</p></div><div className="footer-renderer"><p>Current material: <span data-rendering-mode={mode}>{mode === 'svg' ? 'SVG backdrop refraction' : mode === 'native' ? 'Compatible glass' : 'Flat glass'}</span></p><p className="mode-links"><a href="?optics=auto" aria-current={optics === 'auto' ? 'true' : undefined}>Auto</a><a href="?optics=native" aria-current={optics === 'native' ? 'true' : undefined}>Compatible</a><a href="?optics=flat" aria-current={optics === 'flat' ? 'true' : undefined}>Flat</a></p></div><div className="footer-links"><a href="https://alvenx.com/">AlvenX.com ↗</a><a href={REVIEW_SOURCE} target="_blank" rel="noreferrer">GitHub ↗</a><a href={`${GITHUB}/blob/${REVIEW_REF}/LICENSE-NOTICE.md`}>License notice ↗</a><span>V1.1.2 · R2 · HORIZONTAL REVIEW / 2026-10-19</span></div></footer>
  </div>;
}
const root = document.getElementById('root'); if (!root) throw new Error('Showcase root missing'); createRoot(root).render(<StrictMode><Showcase/></StrictMode>);
