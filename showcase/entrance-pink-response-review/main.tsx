import React from 'react';
import {hydrateRoot,createRoot} from 'react-dom/client';
import {useGlassSettings} from '../../src/useGlassSettings';
import {PreviewBuddingLink} from './PreviewBuddingLink';
import '../../styles/glass.css';
import '../../styles/budding-volume.css';
import '../budding-refinement-review/fonts.css';
import './review.css';
import wordmark from '../../assets/brand/alvenx-wordmark.svg';
export function Review(){
 const {clock}=useGlassSettings({storageKey:'entrance-pink-response-review-20261023'});
 return <main><header><a href="https://alvenx.com/" className="brand" aria-label="AlvenX home"><img src={wordmark} alt="AlvenX"/></a><span>INTERACTION PREVIEW</span></header>
 <section className="hero"><p className="eyebrow">A LITTLE MORE LIFE.</p><h1>Soft color.<br/><span>A clearer response.</span></h1><p className="intro">An anchored pearl, a lighter pink glow. Move closer, hold, and gently pull.</p>
 <div className="cta-row"><a className="work" href="#try">Explore the work <span>↓</span></a><div className="discovery"><span className="alvenx-design ui-entry"><PreviewBuddingLink id="website-ui-entrance" clock={clock} href="https://alvenx.com/ui/" earlyActivation/></span><a className="github" href="https://github.com/AlbertXXuu">GitHub ↗</a></div></div>
 <p className="hint">Tap the pearl to open or close. Drag either shape, then let go.</p></section>
 <section id="try" className="notes"><p className="eyebrow">WHAT TO FEEL</p><div><p><strong>Stays in place</strong>The pearl responds around its fixed center.</p><p><strong>Reacts before you touch</strong>Closer pointers bring a fuller contour and shifting light.</p><p><strong>Light blue, rose, violet</strong>Soft color carries the volume, with a brighter interior.</p></div></section><footer>Preview for visual review · <a href="https://alvenx.com/">Back to the homepage ↗</a></footer></main>;
}
if(typeof document!=='undefined'){const root=document.getElementById('root')!;if(root.hasChildNodes())hydrateRoot(root,<Review/>);else createRoot(root).render(<Review/>);}
