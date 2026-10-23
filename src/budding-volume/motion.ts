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
 const gain=Math.max(0,Math.min(4,intensity))/2.5;
 return {
  offsetX:m.x*1.1*gain+m.pullX*.12,
  offsetY:m.y*.8*gain+m.pullY*.12,
  scaleX:1+(m.near*.006+m.press*.004)*gain,
  scaleY:1+(m.near*.008-m.press*.009)*gain,
  pull:{
   x:rect.x+rect.width*(m.anchorX+1)/2,y:rect.y+rect.height*(m.anchorY+1)/2,
   dx:m.x*.8*gain+m.pullX*.82-m.anchorX*m.press*.75*gain,
   dy:m.y*.7*gain+m.pullY*.82-m.anchorY*m.press*.75*gain,
   radiusX:Math.max(1,rect.width*.58),radiusY:Math.max(1,rect.height*.58),
  },
 };
}
