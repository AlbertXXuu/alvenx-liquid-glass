import {StrictMode, useCallback, useId, useLayoutEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ControlledScene, LiquidControl, useGlassSettings, type ControlledSceneSize, type GlassClock} from '../../src';
import '../../styles/glass.css';
import '../../assets/fonts.css';
import './review.css';

const samples = [
  {label:'Placeholder', text:''},
  {label:'Short · English', text:'A little room to grow.'},
  {label:'Short · 中文', text:'给想法一点生长的空间。'},
  {label:'Long · English', text:'A clear place for a longer thought, with a little more room to breathe.'},
  {label:'Long · 中文', text:'让文字在玻璃里清楚地呈现，也给长一点的想法留出舒适的空间。'},
];
const candidates = [
  {id:'a', name:'A', title:'Keep the generous span', copy:'Keep the long silhouette. Move the text inward without shrinking the field.', max:720, height:'74 / 68', inset:'56 / 40'},
  {id:'b', name:'B', title:'Balanced and spacious', copy:'A shorter span and a calmer proportion. The text sits comfortably inside the curved ends.', max:640, height:'68 / 64', inset:'52 / 40'},
  {id:'c', name:'C', title:'Compact and focused', copy:'A smaller composer for short messages. Long text scrolls naturally inside the native field.', max:520, height:'60 / 60', inset:'44 / 36'},
];

function Candidate({candidate, value, onChange, clock}:{candidate:typeof candidates[number]; value:string; onChange:(value:string)=>void; clock:GlassClock}) {
  const uid=useId().replace(/[^a-z0-9]/gi,''), [feedback,setFeedback]=useState(''), form=useRef<HTMLFormElement>(null), [metrics,setMetrics]=useState('Measuring field…');
  useLayoutEffect(()=>{
    const element=form.current?.querySelector<HTMLElement>('.candidate-field');
    if(!element)return;
    const measure=()=>{const box=element.getBoundingClientRect(),hit=element.querySelector<HTMLElement>('.field-hit');if(hit)setMetrics(`Field now ${Math.round(box.width)} × ${Math.round(box.height)} px · Text inset ${Math.round(parseFloat(getComputedStyle(hit).paddingLeft))} px`);};
    measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();
  },[]);
  const paint=useCallback(({width,height}:ControlledSceneSize)=><>
    <defs><linearGradient id={`${uid}-field`} x2="1" y2="1"><stop stopColor="#CDDEFC"/><stop offset="1" stopColor="#D9CEF1"/></linearGradient><pattern id={`${uid}-grid`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#8995BE" strokeWidth=".7" opacity=".35"/></pattern></defs>
    <rect width={width} height={height} fill={`url(#${uid}-field)`}/><rect width={width} height={height} fill={`url(#${uid}-grid)`}/>
  </>,[uid]);
  return <article className={`candidate candidate-${candidate.id}`} aria-labelledby={`title-${candidate.id}`}>
    <div className="candidate-heading"><div><p className="candidate-index">OPTION {candidate.name}{candidate.id==='b'&&<span>Recommended</span>}</p><h2 id={`title-${candidate.id}`}>{candidate.title}</h2></div><p>{candidate.copy}</p></div>
    <ControlledScene className="candidate-scene" paint={paint}>
      <form ref={form} className="candidate-composer" onSubmit={event=>{event.preventDefault();setFeedback(value.trim()?'Preview only · Your text stays on this device.':'Write something to try the field.');}}>
        <LiquidControl id={`field-review-${candidate.id}`} clock={clock} kind="field" className="candidate-field"><input aria-label={`Option ${candidate.name} message`} placeholder="Ask anything…" value={value} maxLength={240} onChange={event=>{onChange(event.target.value);setFeedback('');}}/></LiquidControl>
        <LiquidControl id={`field-review-send-${candidate.id}`} clock={clock} kind="circle" className="candidate-send" label={`Try sending option ${candidate.name}`} type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6m-5 5 5-5 5 5"/></svg></LiquidControl>
      </form>
      <p className="candidate-feedback" role="status">{feedback}</p>
    </ControlledScene>
    <dl className="candidate-spec"><div><dt>Row max</dt><dd>{candidate.max} px</dd></div><div><dt>Height · desktop / phone</dt><dd>{candidate.height} px</dd></div><div><dt>Text inset · desktop / phone</dt><dd>{candidate.inset} px</dd></div></dl>
    <p className="candidate-metrics">{metrics}</p>
  </article>;
}

function Review(){
  const {clock}=useGlassSettings({storageKey:'alvenx-field-sizing-review-v1'});
  const [values,setValues]=useState(['','','']), [active,setActive]=useState(0), [guides,setGuides]=useState(false);
  return <div className="alvenx-design field-options" data-guides={guides}><main>
    <header className="review-intro"><p className="eyebrow">ALVENX LIQUID GLASS · FIELD SIZING REVIEW</p><h1>Room for your words.</h1><p>Compare three proportions using the same glass material. Text remains left aligned and vertically centered; the extra inset keeps it away from the curved ends.</p></header>
    <div className="review-tools" aria-label="Field comparison controls"><div className="sample-options" role="group" aria-label="Load the same sample into all fields">{samples.map((sample,index)=><button key={sample.label} type="button" aria-pressed={active===index} onClick={()=>{setValues([sample.text,sample.text,sample.text]);setActive(index);}}>{sample.label}</button>)}</div><label className="guide-control"><input type="checkbox" checked={guides} onChange={event=>setGuides(event.target.checked)}/> Show text safe areas</label><p>Each field is editable. Sample buttons replace all three values for a fair comparison.</p></div>
    <div className="candidate-list">{candidates.map((candidate,index)=><Candidate key={candidate.id} candidate={candidate} value={values[index]} clock={clock} onChange={value=>{setValues(previous=>previous.map((old,i)=>i===index?value:old));setActive(-1);}}/>)}</div>
    <footer><p>All options use 16 px native text. Row width includes the 44 px send control and its gap. On very narrow screens the inset contracts to 17% of field width, with a 24 px minimum, to preserve usable editing space.</p><p>Review sample · Production styles remain unchanged.</p></footer>
  </main></div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Review/></StrictMode>);
