import type { BuddingGeometry } from '../buddingGeometry';
import type { VolumeLobeTransform } from './geometry';

export type LobeMotion = { near:number; press:number; x:number; y:number; pullX:number; pullY:number; anchorX:number; anchorY:number };
export const emptyMotion = ():LobeMotion => ({near:0,press:0,x:0,y:0,pullX:0,pullY:0,anchorX:0,anchorY:0});

/** Exact damped spring integration; a release or re-grab retains velocity. */
export function springStep(value:number,velocity:number,target:number,seconds:number):[number,number] {
 const omega=24,damping=.76,decay=Math.exp(-damping*omega*seconds),frequency=omega*Math.sqrt(1-damping*damping);
 const x=value-target,b=(velocity+damping*omega*x)/frequency,c=Math.cos(frequency*seconds),s=Math.sin(frequency*seconds);
 const displacement=decay*(x*c+b*s);
 return [target+displacement,decay*((-x*frequency*s+b*frequency*c)-damping*omega*(x*c+b*s))];
}

export const boundedPull=(distance:number,limit:number)=>limit*Math.tanh(distance*.32/limit);

export function lobeTransform(m:LobeMotion,intensity:number,rect:BuddingGeometry['mother']):Required<VolumeLobeTransform> {
 const gain=Math.max(0,Math.min(3.125,intensity))/2.5;
 return {
  offsetX:0,
  offsetY:0,
  scaleX:1+(m.near*.05-m.press*.02)*gain,
  scaleY:1+(m.near*.05-m.press*.045)*gain,
  pull:{
   x:rect.x+rect.width*(m.anchorX+1)/2,y:rect.y+rect.height*(m.anchorY+1)/2,
   dx:m.x*3*gain+m.pullX*.9-m.anchorX*m.press*1.2*gain,
   dy:m.y*3*gain+m.pullY*.9-m.anchorY*m.press*1.2*gain,
   radiusX:Math.max(1,rect.width*.48),radiusY:Math.max(1,rect.height*.48), anchored:true,
  },
 };
}
