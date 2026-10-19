import { contourShape, shellPath } from '../../src/geometry';
import { createBackdropOptics, getBackdropOpticsDiagnostics } from '../../src/backdropOptics';

// Isolated engineering proof: the supported source is an explicit shared scene,
// never a pretend screen capture. No existing kit component is changed here.
const width=640,height=330,lensWidth=160,lensHeight=96;
const engine=createBackdropOptics(),scale=3;
const shape={...contourShape(lensWidth-12,lensHeight-8,2.4),x:lensWidth/2,y:lensHeight/2};
const path=shellPath(shape),start=performance.now();
const map=engine.render({path,width:lensWidth*scale,height:lensHeight*scale,camera:{x:lensWidth/2,y:lensHeight/2+8/scale,zoom:scale},channels:'rg',version:1});
document.querySelector('#mount')!.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-label="Explicit scene and displaced lens">
 <defs>
  <linearGradient id="board" x2="1" y2="1"><stop stop-color="#CFE6FF"/><stop offset="1" stop-color="#DED2FA"/></linearGradient>
  <linearGradient id="trackGradient"><stop stop-color="#668CE9"/><stop offset="1" stop-color="#9B78DE"/></linearGradient>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#7986B5" stroke-width=".8" opacity=".32"/></pattern>
  <g id="sourceScene"><rect width="640" height="330" fill="url(#board)"/><rect width="640" height="330" fill="url(#grid)"/>
   <text id="sourceText" x="56" y="104" font-family="sans-serif" font-size="46" font-weight="600" fill="#435790">Clarity 123</text>
   <text x="56" y="146" font-family="sans-serif" font-size="20" fill="#68759E">Source pixels, continuously displaced.</text>
   <rect x="56" y="224" width="528" height="16" rx="8" fill="#B6B9D4"/><rect id="sourceTrack" x="56" y="224" width="264" height="16" rx="8" fill="url(#trackGradient)"/>
  </g>
  <clipPath id="lensClip" clipPathUnits="userSpaceOnUse"><path d="${path}"/></clipPath>
  <filter id="transmission" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="${lensWidth}" height="${lensHeight}" color-interpolation-filters="sRGB">
   <feImage id="normal" href="${map.href}" width="${map.mapCssWidth/scale}" height="${map.mapCssHeight/scale}" preserveAspectRatio="none" result="normal"/>
   <feDisplacementMap id="displacement" in="SourceGraphic" in2="normal" scale="28" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
 </defs>
 <use href="#sourceScene"/>
 <g id="lens" transform="translate(240 184)">
  <g clip-path="url(#lensClip)"><g filter="url(#transmission)"><use id="transmittedScene" href="#sourceScene" transform="translate(-240 -184)"/></g></g>
  <path d="${path}" fill="none" stroke="#FAFCFF" stroke-width="1.6"/>
 </g>
</svg>`;
const svg=document.querySelector('svg')!,lens=svg.querySelector('#lens')!,transmitted=svg.querySelector('#transmittedScene')!,displace=svg.querySelector('#displacement')!;
let x=240,y=184,ready=false,preparationMs=0;
const api={
 setLens(nextX:number,nextY:number){x=nextX;y=nextY;lens.setAttribute('transform',`translate(${x} ${y})`);transmitted.setAttribute('transform',`translate(${-x} ${-y})`);},
 setStrength(value:number){displace.setAttribute('scale',String(value));},
 setTrackValue(value:number){svg.querySelector('#sourceTrack')!.setAttribute('width',String(528*value));},
 setText(value:string){svg.querySelector('#sourceText')!.textContent=value;},
 diagnostics(){return{ready,mapComputeMs:map.computeMs,preparationMs,...getBackdropOpticsDiagnostics()};},
};
(window as Window & {controlledProof?:typeof api}).controlledProof=api;
requestAnimationFrame(()=>requestAnimationFrame(()=>{ready=true;preparationMs=performance.now()-start;document.querySelector('#status')!.textContent=`Ready · one cached normal map · ${map.computeMs.toFixed(2)} ms initial map preparation · no shader or map creation on first touch.`;svg.setAttribute('data-ready','true');}));
