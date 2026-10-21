import { volumeHitContour, type VolumeGeometry } from '../../src/volume-hit-geometry';
import type { BuddingGeometry, BuddingTransform } from '../../src/buddingGeometry';

type Point = [number, number];
const resting:VolumeGeometry={parentX:1,parentY:1,childX:1.15,childY:1,deformX:500,deformY:280,deformDX:0,deformDY:0,curvature:3.2};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};
const number=(v:number)=>String(Math.round(v*1e6)/1e6);
const pair=(p:Point)=>`${number(p[0])} ${number(p[1])}`;

/** A periodic, uniform cubic B-spline. At every join (including the seam),
 * adjacent spans share their first and second derivatives. Point edits below
 * are therefore resampled into an actual C2 curve, rather than a warped SVG. */
function c2Boundary(points:Point[]) {
 const at=(i:number)=>points[(i+points.length)%points.length];
 const mix=(a:Point,b:Point,c:Point,wa:number,wb:number,wc:number,d:number):Point=>[(a[0]*wa+b[0]*wb+c[0]*wc)/d,(a[1]*wa+b[1]*wb+c[1]*wc)/d];
 return `M ${pair(mix(at(-1),at(0),at(1),1,4,1,6))} ${points.map((p,i)=>`C ${pair(mix(p,at(i+1),at(i+1),2,1,0,3))} ${pair(mix(p,at(i+1),at(i+1),1,2,0,3))} ${pair(mix(p,at(i+1),at(i+2),1,4,1,6))}`).join(' ')} Z`;
}

/** Review-only geometry. Reuses the accepted volume coverage kernel and C2
 * construction. Production buddingGeometry and BuddingLink remain untouched. */
export function refinementGeometry(growth:number,diameter=54,transform:BuddingTransform={}):BuddingGeometry {
 const g=clamp(growth),scale=diameter/300,height=1.4*diameter+12,cy=height/2,cx=6+diameter/2;
 const ease=g*g*(3-2*g),size=g**.85;
 const separation=.24*diameter*ease,room=.12*diameter*ease;
 const points:Point[]=volumeHitContour(resting,g,64).points.map(([x,y])=>{
  // Delay the separation until a chamber exists. The mother at x=230 stays
  // anchored; the chamber moves right with a broad transition around its neck.
  const baseX=6+(x-80)*scale;
  const progress=smooth((x-330)/235);
  const chamberRoom=smooth((x-450)/500);
  const neck=1-.14*ease*smooth((x-330)/45)*Math.exp(-(((x-410)/60)**2));
  const px=baseX+separation*progress+room*chamberRoom,py=cy+(y-280)*scale*neck;
  return [cx+(px-cx)*(transform.scaleX??1)+(transform.offsetX??0),cy+(py-cy)*(transform.scaleY??1)+(transform.offsetY??0)];
 });
 const chamberX=373+317*ease,rx=255*resting.childX*size,ry=210*size;
 return {path:c2Boundary(points),width:Math.max(diameter+12,Math.max(...points.map(p=>p[0]))+6),height,growth:g,
  mother:{x:6,y:cy-diameter/2,width:diameter,height:diameter},
  chamber:{x:6+(chamberX-rx-80)*scale+separation,y:cy-ry*scale,width:rx*2*scale,height:ry*2*scale}};
}
