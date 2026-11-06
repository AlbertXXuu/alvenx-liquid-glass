import type { ControlledSceneSize } from '../../src/ControlledScene';
import { SAMPLE_TEXT_FAMILY } from './useSampleText';
export const OPTICAL_TEXT_FAMILY='"AlvenX Optical Latin", MiSans, sans-serif';

/** The SVG selection layer and the controlled raster share these values. */
export type RefractionSceneModel = {
  title: string;
  subtitle: string;
  caption: string;
  progress: number;
};

export function refractionSvg({width,height}:ControlledSceneSize, model:RefractionSceneModel, uid:string, selectionOnly=false) {
  const small=width<450;
  return <>
    <defs><linearGradient id={`${uid}-board`} x2="1" y2="1"><stop stopColor="#CDDEFF"/><stop offset=".52" stopColor="#E1E8FC"/><stop offset="1" stopColor="#DCCCF5"/></linearGradient><pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#7F8DBB" strokeWidth=".65" opacity=".33"/></pattern><linearGradient id={`${uid}-stripe`}><stop stopColor="#658CE4"/><stop offset="1" stopColor="#A28ADC"/></linearGradient></defs>
    <g opacity={selectionOnly?0:1}><rect width={width} height={height} fill={`url(#${uid}-board)`}/><rect width={width} height={height} fill={`url(#${uid}-grid)`}/></g>
    <text x={width*.085} y={height*.31} fill={selectionOnly?'transparent':'#425990'} fontFamily={SAMPLE_TEXT_FAMILY} fontSize={small?40:60} fontWeight="600" letterSpacing="-2" style={{pointerEvents:'auto',userSelect:'text'}}>{model.title}</text>
    <text x={width*.085} y={height*.47} fill={selectionOnly?'transparent':'#7865AE'} fontFamily={SAMPLE_TEXT_FAMILY} fontSize={small?25:32} fontWeight="500" style={{pointerEvents:'auto',userSelect:'text'}}>{model.subtitle}</text>
    <text x={width*.085} y={height*.61} fill={selectionOnly?'transparent':'#596C92'} fontSize={small?15:19}>{model.caption}</text>
    <g opacity={selectionOnly?0:1}><rect x={width*.085} y={height*.76} width={width*.83} height="15" rx="7.5" fill="#BFC7E2"/><rect x={width*.085} y={height*.76} width={width*.83*model.progress} height="15" rx="7.5" fill={`url(#${uid}-stripe)`}/></g>
  </>;
}

/** Canvas text uses document-loaded faces; no external SVG image/font loads. */
export function paintRefractionScene(ctx:CanvasRenderingContext2D, width:number, height:number, model:RefractionSceneModel) {
  const small=width<450, x=width*.085;
  // SVG's objectBoundingBox gradient is defined in normalized coordinates,
  // so its diagonal is not the same as a CSS-pixel corner-to-corner vector.
  const sum=width*width+height*height;
  const background=ctx.createLinearGradient(0,0,2*width*height*height/sum,2*height*width*width/sum);
  background.addColorStop(0,'#CDDEFF');background.addColorStop(.52,'#E1E8FC');background.addColorStop(1,'#DCCCF5');
  ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
  // The SVG pattern clips each boundary-centred stroke to the tile.
  ctx.strokeStyle='rgba(127,141,187,.33)';ctx.lineWidth=.325;ctx.beginPath();
  for(let px=0;px<=width;px+=24){ctx.moveTo(px+.1625,0);ctx.lineTo(px+.1625,height);}
  for(let py=0;py<=height;py+=24){ctx.moveTo(0,py+.1625);ctx.lineTo(width,py+.1625);}
  ctx.stroke();
  ctx.fillStyle='#425990';ctx.font=`600 ${small?40:60}px ${OPTICAL_TEXT_FAMILY}`;
  // Native shaping stays intact; if a browser lacks letterSpacing the caller
  // retains the original SVG fallback rather than using a mismatched raster.
  ctx.letterSpacing='-2px';ctx.fillText(model.title,x,height*.31);ctx.letterSpacing='0px';
  ctx.fillStyle='#7865AE';ctx.font=`500 ${small?25:32}px ${OPTICAL_TEXT_FAMILY}`;ctx.fillText(model.subtitle,x,height*.47);
  ctx.fillStyle='#596C92';ctx.font=`400 ${small?15:19}px ${OPTICAL_TEXT_FAMILY}`;ctx.fillText(model.caption,x,height*.61);
  ctx.fillStyle='#BFC7E2';ctx.beginPath();ctx.roundRect(x,height*.76,width*.83,15,7.5);ctx.fill();
  const bar=ctx.createLinearGradient(x,0,x+width*.83*Math.max(model.progress,.00001),0);bar.addColorStop(0,'#658CE4');bar.addColorStop(1,'#A28ADC');ctx.fillStyle=bar;
  ctx.beginPath();ctx.roundRect(x,height*.76,width*.83*model.progress,15,7.5);ctx.fill();
}
