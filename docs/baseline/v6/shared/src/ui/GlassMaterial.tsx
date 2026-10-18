import { shellPath, type Shape } from '../spatial/geometry';

/** One world-space softbox. L·N and the view/light half vector approximate a
 * rounded 2.5D surface; this intentionally does not claim physical refraction. */
export const SCENE_LIGHT={x:-450,y:-350,z:950,power:1,range:1700,softness:.65};
export function surfaceLighting(shape:Shape,source=SCENE_LIGHT){
  const dx=source.x-shape.x,dy=source.y-shape.y,distance=Math.hypot(dx,dy,source.z);
  const lx=dx/distance,ly=dy/distance,lz=source.z/distance,halfLength=Math.hypot(lx,ly,lz+1);
  return {x:shape.x+lx/halfLength*shape.w*.48,y:shape.y+ly/halfLength*shape.h*.48,
    diffuse:Math.max(0,lz)*SCENE_LIGHT.power/(1+(distance/SCENE_LIGHT.range)**2)};
}

/** The local pearl body is feathered; the scene union owns every visible rim. */
export function GlassDefinitions(){return <defs>
  <radialGradient id="glass-light"><stop stopColor="#FFFFFF" stopOpacity=".8"/><stop offset=".6" stopColor="#FFFFFF" stopOpacity=".22"/><stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/></radialGradient>
  <radialGradient id="pearl-body-light"><stop offset=".55" stopColor="#FFFFFF"/><stop offset=".8" stopColor="#FFFFFF" stopOpacity=".75"/><stop offset="1" stopColor="#000000"/></radialGradient>
</defs>;}

export function GlassReflection({id,shape,sphere,opacity,light:source=SCENE_LIGHT}:{id:string;shape:Shape;sphere:number;opacity:number;light?:typeof SCENE_LIGHT}) {
  const {x,y,w,h}=shape;
  const light=surfaceLighting(shape,source);
  return <g pointerEvents="none" opacity={opacity}>
    <defs><clipPath id={`glass-clip-${id}`}><path d={shellPath(shape)}/></clipPath><mask id={`pearl-body-${id}`} maskUnits="userSpaceOnUse" x={x-w/2} y={y-h/2} width={w} height={h}><rect x={x-w/2} y={y-h/2} width={w} height={h} fill="url(#pearl-body-light)"/></mask></defs>
    <g clipPath={`url(#glass-clip-${id})`}>
      <g mask={`url(#pearl-body-${id})`}><image href="/materials/pearl-glass-orb-v1.png" x={x-w*.63} y={y-h*.63} width={w*1.26} height={h*1.26} preserveAspectRatio="xMidYMid slice" opacity={.38*sphere}/>
      <ellipse cx={light.x} cy={light.y} rx={w*(.3+SCENE_LIGHT.softness*.18)} ry={h*.34} fill="url(#glass-light)" opacity={light.diffuse*.25*sphere}/></g>
    </g>
  </g>;
}
