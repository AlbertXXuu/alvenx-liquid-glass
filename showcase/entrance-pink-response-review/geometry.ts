import { volumeHitContour, type VolumeGeometry } from '../../src/volume-hit-geometry';
import type { BuddingGeometry, BuddingTransform } from '../../src/buddingGeometry';

type Point = [number, number];
export type VolumeLobeTransform=BuddingTransform&{pull?:{x:number;y:number;dx:number;dy:number;radiusX:number;radiusY:number;anchored?:boolean}};
export type ReviewBuddingTransform=BuddingTransform&{mother?:VolumeLobeTransform;chamber?:VolumeLobeTransform};
// Near-elliptic sides keep the content chamber visibly convex instead of
// approaching the accepted large panel's broad, nearly vertical shoulders.
export const reviewChamberExponent=2.2;
const resting:VolumeGeometry={parentX:1,parentY:1,childX:1.15,childY:1,deformX:500,deformY:280,deformDX:0,deformDY:0,curvature:3.2};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};
const number=(v:number)=>String(Math.round(v*1e6)/1e6);
const pair=(p:Point)=>`${number(p[0])} ${number(p[1])}`;

/** Measured Instrument Sans 600 label advance at the actual 15/14px sizes.
 * Preserve about 0.22 chamber heights of optical space on either side. */
export function refinementRoom(diameter:number){
 const scale=diameter/300,advance=diameter<=44?77.3125:82.83487,base=255*1.15*2*scale;
 return .12*diameter+Math.max(0,advance+420*scale*.44-(base+.12*diameter));
}

/** A periodic, uniform cubic B-spline. At every join (including the seam),
 * adjacent spans share their first and second derivatives. Point edits below
 * are therefore resampled into an actual C2 curve, rather than a warped SVG. */
function c2Boundary(points:Point[]) {
 const at=(i:number)=>points[(i+points.length)%points.length];
 const mix=(a:Point,b:Point,c:Point,wa:number,wb:number,wc:number,d:number):Point=>[(a[0]*wa+b[0]*wb+c[0]*wc)/d,(a[1]*wa+b[1]*wb+c[1]*wc)/d];
 return `M ${pair(mix(at(-1),at(0),at(1),1,4,1,6))} ${points.map((p,i)=>`C ${pair(mix(p,at(i+1),at(i+1),2,1,0,3))} ${pair(mix(p,at(i+1),at(i+1),1,2,0,3))} ${pair(mix(p,at(i+1),at(i+2),1,4,1,6))}`).join(' ')} Z`;
}

/** Accepted volume geometry with optional local pulls resampled into C2 curves.
 * Without motion this stays identical to the R7 reference. Original
 * buddingGeometry and BuddingLink remain untouched. */
export function refinementGeometry(growth:number,diameter=54,transform:ReviewBuddingTransform={}):BuddingGeometry {
 const g=clamp(growth),scale=diameter/300,height=1.4*diameter+12,cy=height/2,cx=6+diameter/2;
 const ease=g*g*(3-2*g),size=g**.85;
 const separation=.50*diameter*ease,room=refinementRoom(diameter)*ease;
 const chamberX=373+317*ease,rx=255*resting.childX*size,ry=210*size;
 const mother={x:6,y:cy-diameter/2,width:diameter,height:diameter};
 const chamber={x:6+(chamberX-rx-80)*scale+separation,y:cy-ry*scale,width:rx*2*scale+room,height:ry*2*scale};
 const chamberCentre=chamber.x+chamber.width/2,outerRx=chamber.width/2;
 const apply=([x,y]:Point,t:VolumeLobeTransform,anchor:number):Point=>{
  const p=t.pull;
  const gaussian=(px:number,py:number)=>p?Math.exp(-(((px-p.x)/p.radiusX)**2+((py-p.y)/p.radiusY)**2)):0;
  // Equal and opposite contour displacement keeps the lobe center anchored.
  // Pointer-side pull remains local; its opposite balances the optical center.
  const weight=p?.anchored?(gaussian(x,y)-gaussian(2*anchor-x,2*cy-y))*.5:gaussian(x,y);
  const dx=(x-anchor)*((t.scaleX??1)-1)+(t.offsetX??0)+(p?.dx??0)*weight;
  const dy=(y-cy)*((t.scaleY??1)-1)+(t.offsetY??0)+(p?.dy??0)*weight;
  const bound=(d:number)=>p?.anchored?4.8*Math.tanh(d/4.8):d;
  return [x+bound(dx),y+bound(dy)];
 };
 const transformPoint=(point:Point,lobe?:'mother'|'chamber'):Point=>{
  if(lobe)return apply(point,transform[lobe]??transform,lobe==='chamber'?chamberCentre:cx);
  if(!transform.mother&&!transform.chamber)return apply(point,transform,cx);
  const a=apply(point,transform.mother??transform,cx),b=apply(point,transform.chamber??transform,chamberCentre);
  const weight=smooth(g/.35)*smooth((point[0]-(cx+diameter*.28))/Math.max(diameter*.4,chamberCentre-cx-diameter*.28));
  return [a[0]+(b[0]-a[0])*weight,a[1]+(b[1]-a[1])*weight];
 };
 const morph=smooth((g-.70)/.25);
 const sampled=volumeHitContour(resting,g,64).points;
 let path:string;
 if(g>=.95){
  // Terminal separation is a topology change. Each individual component is
  // C2; no claim is made of one global C2 surface through the split instant.
  const circle:Point[]=Array.from({length:128},(_,i)=>{const t=2*Math.PI*i/128;return transformPoint([cx+diameter/2*Math.cos(t),cy+diameter/2*Math.sin(t)],'mother');});
  const n=2+(reviewChamberExponent-2)*ease;
  const chamberPoints:Point[]=Array.from({length:128},(_,i)=>{const t=2*Math.PI*i/128,c=Math.cos(t),s=Math.sin(t);return transformPoint([chamberCentre+outerRx*Math.sign(c)*Math.abs(c)**(2/n),cy+ry*scale*Math.sign(s)*Math.abs(s)**(2/n)],'chamber');});
  path=`${c2Boundary(circle)} ${c2Boundary(chamberPoints)}`;
 }else{
 const points:Point[]=sampled.map(([x,y])=>{
  // Delay the separation until a chamber exists. The mother at x=230 stays
  // anchored; the chamber moves right with a broad transition around its neck.
  const baseX=6+(x-80)*scale;
  const progress=smooth((x-330)/235);
  const chamberRoom=smooth((x-450)/500);
  const neck=1-.14*ease*smooth((x-330)/45)*Math.exp(-(((x-410)/60)**2));
  const px=baseX+separation*progress+room*chamberRoom;
  const parentHalf=Math.sqrt(Math.max(0,(diameter/2)**2-(px-cx)**2));
  const q=Math.abs((px-chamberCentre)/Math.max(.1,outerRx)),n=2+(reviewChamberExponent-2)*ease;
  const chamberHalf=ry*scale*Math.max(0,1-q**n)**(1/n);
  const bridgeGate=smooth((px-(6+diameter*.75))/(diameter*.2))*(1-smooth((px-(chamber.x+diameter*.05))/(diameter*.2)));
  const bridgeHalf=Math.max(.025,diameter*.22*(1-morph))*bridgeGate;
  const targetHalf=Math.max(parentHalf,chamberHalf,bridgeHalf);
  const baseHalf=Math.abs((y-280)*scale*neck);
  const half=baseHalf*(1-morph)+targetHalf*morph;
  return transformPoint([px,cy+(y<280?-half:half)]);
 });
  path=c2Boundary(points);
 }
 // Occupied width stays continuous through the terminal topology change and
 // reverses with the same growth value when the entrance returns.
 const width=Math.max(diameter+12,...sampled.map(([x])=>6+(x-80)*scale+separation*smooth((x-330)/235)+room*smooth((x-450)/500)+6));
 return {path,width,height,growth:g,mother,chamber};
}
