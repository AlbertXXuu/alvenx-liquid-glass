import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiquidControl } from './LiquidControl';
import { PreviewClock } from './PreviewClock';
import { GlassSlider, GlassSwitch } from './GlassSettingsControls';
import { DEFAULT_SETTINGS, PARAMETER_ROWS, SETTINGS_KEY, readSettings, type ReviewSettings } from './reviewSettings';
// @ts-expect-error The isolated study renderer is a plain ES module.
import { createGlassPreview } from './volume-renderer.js';

type Renderer = { render(options: Record<string, unknown>): void; destroy(): void };
const resting = () => ({ parentX: 1, parentY: 1, childX: 1, childY: 1, deformX: 500, deformY: 280, deformDX: 0, deformDY: 0, curvature: 3.2 });
const ArrowIcon=({diagonal=false}:{diagonal?:boolean})=><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6m-5 5 5-5 5 5" transform={diagonal?'rotate(45 12 12)':undefined}/></svg>;

function MaterialReview() {
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLElement>(null), foreground = useRef<HTMLDivElement>(null);
  const messageInput=useRef<HTMLInputElement>(null);
  const [clock] = useState(() => new PreviewClock());
  const [settings, setSettings] = useState(readSettings);
  const [parametersOpen,setParametersOpen] = useState(true);
  clock.strength = settings.interactionStrength; clock.material = settings;
  const renderer = useRef<Renderer | null>(null);
  const simulation = useRef({ current: resting(), target: resting(), growth: 1, playing: false, ambient: true, time: 0, dirty: true });
  const drag = useRef<{ x: number; y: number; parent: boolean } | null>(null);
  const [playing, setPlaying] = useState(false), [reduced, setReduced] = useState(false);
  const [systemReduced,setSystemReduced] = useState(false);
  const [selected, setSelected] = useState(false), [message, setMessage] = useState(''), [feedback, setFeedback] = useState(''), [error, setError] = useState('');

  useLayoutEffect(() => {
    if (!canvas.current) return;
    renderer.current = createGlassPreview(canvas.current);
    const draw = (delta: number, elapsed: number) => {
      const state = simulation.current;
      let changed = state.dirty, remaining = 0;
      state.dirty = false;
      const ambientActive = state.ambient && !clock.reduced;
      if (ambientActive) { state.time += elapsed / 1000; changed = true; }
      if (state.playing) {
        state.growth = Math.min(1, state.growth + delta / 3000); changed = true;
        if (state.growth === 1) { state.playing = false; setPlaying(false); }
      }
      const blend = clock.reduced ? 1 : 1 - Math.exp(-delta / 78);
      for (const key of Object.keys(state.current) as Array<keyof ReturnType<typeof resting>>) {
        const difference = state.target[key] - state.current[key]; remaining = Math.max(remaining, Math.abs(difference));
        if (difference !== 0) changed = true;
        state.current[key] = Math.abs(difference) < .0005 ? state.target[key] : state.current[key] + difference * blend;
      }
      if (changed) {
        renderer.current?.render({ edge: 'pearl', flat: false, lightX: .22, lightY: .08, showGrid: false, growth: state.growth, time: state.time, ...state.current, ...clock.material });
        if (stage.current) {
          stage.current.dataset.growth = state.growth.toFixed(4);
          stage.current.dataset.ambientTime = state.time.toFixed(4);
          stage.current.dataset.ambientActive = String(ambientActive);
          stage.current.dataset.surface = JSON.stringify(state.current);
        }
        if (foreground.current) {
          // Do not fade a backdrop ancestor: opacity creates a different backdrop root.
          foreground.current.style.visibility = state.growth > .92 ? 'visible' : 'hidden';
          foreground.current.setAttribute('aria-hidden', String(state.growth <= .92));
        }
        const nextError = canvas.current?.dataset.error ?? '';
        if (nextError) setError(nextError);
      }
      return ambientActive || state.playing || remaining > .0005;
    };
    const unsubscribe = clock.subscribe(draw);
    const observer = new ResizeObserver(() => { simulation.current.dirty = true; clock.wake(); });
    if (stage.current) observer.observe(stage.current);
    return () => { unsubscribe(); observer.disconnect(); renderer.current?.destroy(); renderer.current = null; };
  }, [clock]);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      clock.reduced = preference.matches || settings.reducedMotion; setReduced(clock.reduced); setSystemReduced(preference.matches);
      if (clock.reduced) {
        drag.current = null; simulation.current.current = resting(); simulation.current.target = resting();
        simulation.current.growth = 1; simulation.current.playing = false; setPlaying(false);
      }
      simulation.current.dirty = true; clock.wake();
    };
    update(); preference.addEventListener('change', update);
    return () => { preference.removeEventListener('change', update); };
  }, [clock,settings.reducedMotion]);
  useEffect(()=>()=>clock.destroy(),[clock]);
  useEffect(()=>{
    simulation.current.ambient=settings.ambient; simulation.current.dirty=true; clock.wake();
    try { localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); } catch { /* A preview can run without storage. */ }
  },[settings,clock]);
  const updateSettings=(next:Partial<ReviewSettings>)=>setSettings(old=>({...old,...next}));

  function settleSurface(target = resting()) {
    simulation.current.target = clock.reduced ? resting() : target;
    simulation.current.dirty = true; clock.wake();
  }
  function respond(event: React.PointerEvent<HTMLElement>, pressed = false) {
    if (!stage.current || simulation.current.growth < 1 || clock.reduced) return;
    if ((event.target as HTMLElement).closest('.foreground')) { if (!drag.current) settleSurface(); return; }
    const rect = stage.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 1000, y = (event.clientY - rect.top) / rect.height * 560;
    const parent = drag.current?.parent ?? x < 450;
    const nx = (x - (parent ? 230 : 690)) / (parent ? 150 : 255), ny = (y - 280) / (parent ? 150 : 210);
    const proximity = Math.max(0, Math.min(1, (1.25 - Math.hypot(nx, ny)) * 2));
    if (!drag.current && proximity === 0) { settleSurface(); return; }
    if (pressed) { drag.current = { x, y, parent }; event.currentTarget.setPointerCapture(event.pointerId); }
    // 1.65x the prior review's response; the shader still bounds the common field.
    const dx = (drag.current ? Math.max(-7.425, Math.min(7.425, (x - drag.current.x) * .2145)) : nx * 5.28 * proximity) * clock.strength;
    const dy = (drag.current ? Math.max(-7.425, Math.min(7.425, (y - drag.current.y) * .2145)) : ny * 5.28 * proximity) * clock.strength;
    const amount = (drag.current ? .0231 : .0099 * proximity) * clock.strength;
    const target = resting();
    target[parent ? 'parentX' : 'childX'] = 1 + amount + dx * .0012;
    target[parent ? 'parentY' : 'childY'] = 1 - amount * .7 + dy * .0012;
    target.deformX = x; target.deformY = y; target.deformDX = dx; target.deformDY = dy;
    target.curvature = 3.2 + (parent ? 0 : amount * 2); settleSurface(target);
  }
  function replay() {
    if (clock.reduced) return;
    drag.current = null; settleSurface();
    simulation.current.growth = 0; simulation.current.playing = true; setPlaying(true); clock.wake();
  }

  return <main className="review">
    <header className="review-header">
      <img src="/brand/alvenx-wordmark.svg" width="116" height="34" alt="AlvenX"/>
      <div className="review-label">B · Live controls <span>Not integrated</span></div>
      <LiquidControl id="replay" clock={clock} className="replay" onClick={replay} disabled={playing || reduced}>{playing ? 'Budding…' : 'Replay slow budding'}</LiquidControl>
    </header>
    <div className="stage-scroll"><section className="stage" ref={stage} aria-label="Material direction preview" data-growth="1.0000"
      onPointerMove={event => respond(event)} onPointerDown={event => { if (event.button === 0) respond(event, true); }}
      onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); settleSurface(); }}
      onPointerCancel={() => { drag.current = null; settleSurface(); }} onPointerLeave={() => { if (!drag.current) settleSurface(); }}>
      <canvas ref={canvas} className="volume-canvas" aria-hidden="true"/>
      <div ref={foreground} className="foreground">
        <p className="eyebrow">YOUR SPACE</p><h1>What’s on your mind?</h1>
        <div className="idea-row"><LiquidControl id="idea" clock={clock} className="idea" selected={selected} onClick={() => { setSelected(old => !old); setFeedback(''); }}>
          <span className="idea-symbol" aria-hidden="true">✦</span>
          <span><strong>A little inspiration</strong><small>{selected ? 'Selected for this preview' : 'Give an idea room to grow'}</small></span>
        </LiquidControl><LiquidControl id="idea-action" clock={clock} kind="circle" className="inline-action" label="Use inspiration" onClick={()=>{setSelected(true);setMessage('Help me explore a new idea.');setFeedback('Added to your message.');messageInput.current?.focus();}}><ArrowIcon diagonal/></LiquidControl></div>
        <form className="composer" onSubmit={event => { event.preventDefault(); if (message.trim()) setFeedback('Saved in this preview.'); else {setFeedback('Write a message before sending.');messageInput.current?.focus();} }}>
          <LiquidControl id="input" clock={clock} kind="field" className="input-frame">
            <input ref={messageInput} aria-label="Preview message" aria-describedby="preview-feedback" placeholder="Ask anything…" value={message} onChange={event => { setMessage(event.target.value); setFeedback(''); }}/>
          </LiquidControl>
          <LiquidControl id="send" clock={clock} kind="circle" type="submit" className="inline-action" label="Send preview message"><ArrowIcon/></LiquidControl>
        </form>
        <p id="preview-feedback" className="feedback" role="status">{feedback}</p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section></div>
    <footer><div>Move close · Press · Drag · Replay<span>Local material study · Awaiting review</span></div><div className="switches">
      <GlassSwitch id="ambient" label="Background motion" checked={settings.ambient} clock={clock} onChange={ambient=>updateSettings({ambient})}/>
      <GlassSwitch id="reduced-motion" label="Reduced motion" checked={reduced} disabled={systemReduced} clock={clock} onChange={reducedMotion=>updateSettings({reducedMotion})}/>
    </div></footer>
    <section className="parameters" aria-label="Surface parameters">
      <div className="parameters-heading"><LiquidControl id="parameters-disclosure" clock={clock} className="parameters-disclosure" expanded={parametersOpen} onClick={()=>setParametersOpen(old=>!old)}>Surface parameters <span aria-hidden="true">{parametersOpen?'−':'+'}</span></LiquidControl>
        <LiquidControl id="reset" clock={clock} className="reset" onClick={()=>setSettings({...DEFAULT_SETTINGS})}>Reset defaults</LiquidControl></div>
      {parametersOpen&&<div className="parameter-grid">{PARAMETER_ROWS.map(row=><GlassSlider key={row.key} id={row.key} clock={clock} label={row.label} value={settings[row.key]} min={row.min} max={row.max} step={row.step} unit={row.unit} onChange={value=>updateSettings({[row.key]:value})}/>)}</div>}
    </section>
  </main>;
}
const root = document.getElementById('root');
if (!root) throw new Error('Preview root missing');
createRoot(root).render(<MaterialReview/>);
