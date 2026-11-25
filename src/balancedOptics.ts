import type {MaterialParameters} from './reviewSettings';
import {lensBlurRadii, lensGaussianPrefilterGLSL, lensInkBlurRadii, lensPrefilterRadii, lensTransmissionGLSL} from './lensTransmission';

export type BalancedSource={id:string;version:number;canvas:HTMLCanvasElement;width:number;height:number};
export type BalancedFrame = {
  width: number;
  height: number;
  origin: {x: number; y: number};
  center: {x: number; y: number};
  half: {x: number; y: number};
  exponent: number;
  path?: string;
  panel?: boolean;
  material: MaterialParameters;
  rim?: {color: string; opacity: number; width: number};
  /** Continuous floating-point transmission. Strength is total displacement in CSS pixels. */
  transmission?: {strength: number; preserveAlpha?: boolean; protectInk?: boolean};
};
const MAX_CACHE_PIXELS=8_000_000,MAX_SOURCE_PIXELS=3_000_000,MAX_OUTPUT_PIXELS=2_000_000;
const totals={draws:0,uploads:0,blurPasses:0,contexts:0,disposed:0,clients:0,cachePixels:0,peakCachePixels:0,copyFailures:0};
export const balancedOpticsMetrics=()=>({...totals,profile:'B',maxCachePixels:MAX_CACHE_PIXELS,maxSourcePixels:MAX_SOURCE_PIXELS,maxOutputPixels:MAX_OUTPUT_PIXELS});
const vertex=`attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;varying vec2 uv;
uniform sampler2D image;uniform sampler2D soft;uniform sampler2D deep;
uniform vec2 sourceSize;uniform vec2 targetSize;uniform vec2 outputSize;uniform vec2 origin;uniform vec2 center;uniform vec2 halfSize;
uniform float exponent;uniform float panel;uniform float level;uniform float baseBlur;uniform float progressive;uniform float saturation;uniform float specular;uniform float opacity;
vec3 readImage(sampler2D tex,vec2 p){return texture2D(tex,vec2(p.x/sourceSize.x,1.-p.y/sourceSize.y)).rgb;}
vec4 sampleScene(vec2 p){
 vec2 delta=p-center;vec2 a=abs(delta/halfSize);float q=pow(pow(a.x,exponent)+pow(a.y,exponent),1./exponent);
 float t=max(0.,1.-q*q);float f=t*t*t*(4.-3.*t);float k=1.-1./(1.+level/6.);
 vec2 point=origin+p-delta*k*f;float depth=t;float volume=pow(min(q,1.),3.)*max(0.,1.-q)*8.;vec2 normal=delta/halfSize;
 if(panel>.5){
  vec2 halfBox=targetSize*.5-vec2(12.);float r=min(28.,min(halfBox.x,halfBox.y)*.3);vec2 v=abs(p-targetSize*.5)-(halfBox-vec2(r)),pos=max(v,0.);
  float n=2.4;float l=pow(pow(pos.x,n)+pow(pos.y,n),1./n);float sd=l+min(max(v.x,v.y),0.)-r;
  if(sd>=0.)return vec4(0.);
  vec2 g=l>.001?pow(pos,vec2(n-1.))*pow(l,1.-n):(v.x>v.y?vec2(1.,0.):vec2(0.,1.));
  float distance=-sd/max(length(g),.001);float band=min(16.,min(r*.8,min(halfBox.x,halfBox.y)*.2));
  depth=clamp(distance/max(band,.01),0.,1.);volume=64.*pow(depth*(1.-depth),3.);normal=normalize(g)*sign(p-targetSize*.5);
  point=origin+p-normal*(level/3.)*band*.18*volume;q=1.-depth;
 }
 vec3 color=readImage(image,point);
 if(baseBlur>.001||progressive>.001){vec3 b=baseBlur>.001?readImage(soft,point):color;vec3 d=progressive>.001?readImage(deep,point):b;color=mix(color,mix(b,d,depth),smoothstep(0.,.4,depth));}
 vec3 tint=mix(vec3(.97),mix(vec3(.79,.88,1.),vec3(.94,.81,.98),clamp(normal.y*.5+.5,0.,1.)),saturation/3.);
 if(panel>.5){color=mix(color,vec3(.94,.95,1.),opacity*smoothstep(0.,.08,depth));color+=specular*volume*(dot(normal,normalize(vec2(-.55,-.8)))*.035+.008)*vec3(.86,.9,1.);}
 color=mix(color,tint,specular*.09*volume);
 return vec4(color,1.);
}
void main(){vec2 p=vec2(uv.x,1.-uv.y)*targetSize,d=targetSize/outputSize*.25;
gl_FragColor=(sampleScene(p+vec2(-d.x,-d.y))+sampleScene(p+vec2(d.x,-d.y))+sampleScene(p+vec2(-d.x,d.y))+sampleScene(p+d))*.25;}`;

const transmissionFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D image;
uniform sampler2D soft;
uniform sampler2D deep;
uniform vec2 sourceSize;
uniform vec2 targetSize;
uniform vec2 origin;
uniform vec2 center;
uniform vec2 halfSize;
uniform float strength;
uniform vec2 blurSigmas;
uniform vec2 filtered;
uniform float preserveAlpha;
uniform float saturation;
uniform float specular;
${lensTransmissionGLSL}
void main() {
  vec2 position = vec2(uv.x, 1.0 - uv.y) * targetSize;
  vec2 normal = (position - center) / halfSize;
  vec2 samplePosition = origin + position - lensDisplacement(normal, strength);
  vec2 sampleUV = vec2(samplePosition.x, sourceSize.y - samplePosition.y) / sourceSize;
  vec4 color = lensTransmission(image, soft, deep, sampleUV, 1.0 / sourceSize, normal, blurSigmas, filtered);
  if (preserveAlpha > .5) {
    gl_FragColor = color;
    return;
  }
  vec3 tint = mix(vec3(.97), mix(vec3(.79, .88, 1.0), vec3(.94, .81, .98),
    clamp(normal.y * .5 + .5, 0.0, 1.0)), saturation / 3.0);
  float distance = min(length(normal), 1.0);
  float reflection = distance * distance * distance * (1.0 - distance);
  gl_FragColor = vec4(mix(color.rgb, tint, specular * .72 * reflection), 1.0);
}`;

type Entry={version:number;canvas:HTMLCanvasElement;width:number;height:number;image:WebGLTexture;base:WebGLTexture;deep:WebGLTexture;blurKey:string;pixels:number;blurPixels:number;stamp:number};
function createPool(){
 const canvas=document.createElement('canvas');canvas.dataset.balancedGpu='true';canvas.width=canvas.height=2;
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)throw Error('Balanced optics: WebGL unavailable');
 totals.contexts++;
 let disposed=false,lost=false,stamp=0;const shaders:WebGLShader[]=[],programs:WebGLProgram[]=[],textures=new Set<WebGLTexture>(),entries=new Map<string,Entry>();let buffer:WebGLBuffer|null=null,fb:WebGLFramebuffer|null=null,scratch:WebGLTexture|null=null,scratchW=0,scratchH=0;
 const remove=(texture:WebGLTexture)=>{gl.deleteTexture(texture);textures.delete(texture)};
 const evict=(key:string)=>{const e=entries.get(key);if(!e)return;remove(e.image);remove(e.base);remove(e.deep);totals.cachePixels-=e.pixels;entries.delete(key)};
 const onLost=(event:Event)=>{event.preventDefault();lost=true};canvas.addEventListener('webglcontextlost',onLost);
 const dispose=()=>{if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',onLost);for(const key of entries.keys())evict(key);for(const texture of textures)gl.deleteTexture(texture);textures.clear();for(const s of shaders)gl.deleteShader(s);for(const p of programs)gl.deleteProgram(p);if(buffer)gl.deleteBuffer(buffer);if(fb)gl.deleteFramebuffer(fb);gl.getExtension('WEBGL_lose_context')?.loseContext();totals.disposed++};
 try{
  // Immediate copy is tested twice. An unsupported copy path degrades before
  // exposing an empty WebGL layer; presentation uses an ordinary 2D canvas.
  const probe=document.createElement('canvas');probe.width=probe.height=2;const pc=probe.getContext('2d',{willReadFrequently:true});if(!pc)throw Error('Balanced optics: 2D canvas unavailable');
  for(const v of [.25,.75]){gl.clearColor(v,.5,1.-v,1);gl.clear(gl.COLOR_BUFFER_BIT);pc.clearRect(0,0,2,2);pc.drawImage(canvas,0,0);const px=pc.getImageData(0,0,1,1).data;if(Math.abs(px[0]-v*255)>3||px[3]!==255){totals.copyFailures++;throw Error('Balanced optics: immediate canvas copy unsupported')}}
  if(!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision)throw Error('Balanced optics: fragment precision unavailable');
  const compile=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)throw Error('Shader allocation failed');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader compilation failed');return s};
  const link=(source:string)=>{const p=gl.createProgram();if(!p)throw Error('Program allocation failed');programs.push(p);gl.attachShader(p,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,source));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Program link failed');return p};
  const display=link(fragment),transmissionDisplay=link(transmissionFragment),blur=link(lensGaussianPrefilterGLSL);for(const s of shaders)gl.deleteShader(s);shaders.length=0;
  buffer=gl.createBuffer();fb=gl.createFramebuffer();if(!buffer||!fb)throw Error('GPU buffer allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const maxTextureSize: number = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxRenderbufferSize: number = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  const maxViewport: Int32Array = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const maxWidth = Math.min(maxTextureSize, maxRenderbufferSize, maxViewport[0]);
  const maxHeight = Math.min(maxTextureSize, maxRenderbufferSize, maxViewport[1]);
  const texture=()=>{const t=gl.createTexture();if(!t)throw Error('Texture allocation failed');textures.add(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t};
  const allocate=(t:WebGLTexture,w:number,h:number)=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null)};
  const use=(program:WebGLProgram)=>{gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0)};
  const gaussian=(input:WebGLTexture,destination:WebGLTexture,w:number,h:number,dx:number,dy:number,sigma:number)=>{
   gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,destination,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Blur framebuffer incomplete');gl.viewport(0,0,w,h);use(blur);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);gl.uniform1i(gl.getUniformLocation(blur,'image'),0);gl.uniform2f(gl.getUniformLocation(blur,'stepSize'),dx,dy);gl.uniform1f(gl.getUniformLocation(blur,'sigma'),sigma);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);totals.blurPasses++;
  };
  const render=(target:HTMLCanvasElement,source:BalancedSource,frame:BalancedFrame)=>{
   if(disposed||lost||gl.isContextLost())throw Error('Balanced optics: graphics context lost');
   const {width,height,material,transmission}=frame;if(!(width>0&&height>0&&source.width>0&&source.height>0))return;
   if(frame.panel&&(width<64||height<64))throw Error('Balanced panel requires at least 64 CSS pixels per side');
   const preserveAlpha = transmission?.preserveAlpha === true;
   const key = JSON.stringify([source.id, preserveAlpha]);
   let entry=entries.get(key);if(!entry){const created:WebGLTexture[]=[];try{for(let i=0;i<3;i++)created.push(texture())}catch(error){for(const t of created)remove(t);throw error}entry={version:-1,canvas:source.canvas,width:1,height:1,image:created[0],base:created[1],deep:created[2],blurKey:'',pixels:3,blurPixels:2,stamp:0};entries.set(key,entry);totals.cachePixels+=3}
   entry.stamp=++stamp;
   const blurDensity = transmission
     ? Math.min(1, maxWidth / source.width, maxHeight / source.height, Math.sqrt(1_000_000 / source.width / source.height))
     : Math.min(2, Math.sqrt(2_000_000 / source.width / source.height));
   const bw = Math.max(1, Math.floor(source.width * blurDensity)), bh = Math.max(1, Math.floor(source.height * blurDensity));
   const sigmas = (transmission?.protectInk ? lensInkBlurRadii : lensBlurRadii)(material.blurLevel, material.progressiveBlur);
   const [baseRadius, deepRadius] = transmission
     ? lensPrefilterRadii(...sigmas) : [material.blurLevel, Math.hypot(material.blurLevel, material.progressiveBlur)];
   const hasBlur = baseRadius > 0 || deepRadius > 0;
   const blurPixels = transmission ? (baseRadius > 0 ? bw * bh : 1) + (deepRadius > 0 ? bw * bh : 1) : hasBlur ? 2 * bw * bh : 2;
   const desired = source.canvas.width * source.canvas.height + blurPixels;
   while(totals.cachePixels-entry.pixels+desired>MAX_CACHE_PIXELS&&entries.size>1){const oldest=[...entries].filter(([id])=>id!==key).sort((a,b)=>a[1].stamp-b[1].stamp)[0];if(!oldest)break;evict(oldest[0])}
   if(entry.canvas!==source.canvas||entry.version!==source.version||entry.width!==source.canvas.width||entry.height!==source.canvas.height){
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,entry.image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,preserveAlpha?1:0);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source.canvas);const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`Source upload failed (${error})`);
    const delta=source.canvas.width*source.canvas.height-entry.width*entry.height;entry.pixels+=delta;totals.cachePixels+=delta;entry.canvas=source.canvas;entry.version=source.version;entry.width=source.canvas.width;entry.height=source.canvas.height;entry.blurKey='';totals.uploads++;
   }
   const blurKey = `${transmission ? 'transmission' : 'classic'}:${source.width}:${source.height}:${bw}:${bh}:${baseRadius}:${deepRadius}`;
   if(hasBlur&&entry.blurKey!==blurKey){
    if(!scratch)scratch=texture();if(scratchW!==bw||scratchH!==bh){allocate(scratch,bw,bh);scratchW=bw;scratchH=bh}
    const make = (dest: WebGLTexture, sigma: number) => {
      if (transmission && !sigma) { allocate(dest, 1, 1); return; }
      allocate(dest, bw, bh);
      if (!sigma) return;
      gaussian(entry!.image, scratch!, bw, bh, 1 / bw, 0, sigma * (transmission ? bw / source.width : blurDensity));
      gaussian(scratch!, dest, bw, bh, 0, 1 / bh, sigma * (transmission ? bh / source.height : blurDensity));
    };
    make(entry.base, baseRadius);make(entry.deep, deepRadius);const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`Blur failed (${error})`);
    const delta=blurPixels-entry.blurPixels;entry.pixels+=delta;totals.cachePixels+=delta;entry.blurPixels=blurPixels;entry.blurKey=blurKey;
   }
   if(!hasBlur&&entry.blurPixels!==2){allocate(entry.base,1,1);allocate(entry.deep,1,1);const delta=2-entry.blurPixels;entry.pixels+=delta;totals.cachePixels+=delta;entry.blurPixels=2;entry.blurKey=''}
   totals.peakCachePixels=Math.max(totals.peakCachePixels,totals.cachePixels);
   while(totals.cachePixels>MAX_CACHE_PIXELS&&entries.size>1){const oldest=[...entries].filter(([id])=>id!==key).sort((a,b)=>a[1].stamp-b[1].stamp)[0];if(!oldest)break;evict(oldest[0])}
   const dpr = devicePixelRatio || 1;
   const scale = transmission
     ? Math.min(dpr * 2, maxWidth / width, maxHeight / height, Math.sqrt(MAX_OUTPUT_PIXELS / width / height))
     : Math.min(dpr, 2.5, Math.sqrt(MAX_OUTPUT_PIXELS / width / height));
   const w = transmission ? Math.max(1, Math.min(maxWidth, MAX_OUTPUT_PIXELS, Math.ceil(width * scale))) : Math.max(1, Math.round(width * scale));
   const h = transmission ? Math.max(1, Math.min(maxHeight, Math.floor(MAX_OUTPUT_PIXELS / w), Math.ceil(height * scale))) : Math.max(1, Math.round(height * scale));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}if(target.width!==w||target.height!==h){target.width=w;target.height=h}
   const program = transmission ? transmissionDisplay : display;
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);use(program);
   const at = (name: string) => gl.getUniformLocation(program, name);
   for(const [i,t] of [entry.image, entry.base, entry.deep].entries()){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(at(['image','soft','deep'][i]),i)}
   gl.uniform2f(at('sourceSize'),source.width,source.height);gl.uniform2f(at('targetSize'),width,height);gl.uniform2f(at('origin'),frame.origin.x,frame.origin.y);gl.uniform2f(at('center'),frame.center.x,frame.center.y);gl.uniform2f(at('halfSize'),Math.max(.01,frame.half.x),Math.max(.01,frame.half.y));
   const parameters = transmission
     ? {strength: transmission.strength,
       preserveAlpha: preserveAlpha ? 1 : 0, saturation: material.specularSaturation, specular: material.specularOpacity}
     : {exponent:frame.exponent,panel:frame.panel?1:0,level:material.refractionLevel,baseBlur:material.blurLevel,progressive:material.progressiveBlur,saturation:material.specularSaturation,specular:material.specularOpacity,opacity:material.glassOpacity};
   if (transmission) {
    gl.uniform2f(at('blurSigmas'), ...sigmas);
    gl.uniform2f(at('filtered'), Number(baseRadius > 0), Number(deepRadius > 0));
   } else gl.uniform2f(at('outputSize'),w,h);
   for(const [name,value] of Object.entries(parameters))gl.uniform1f(at(name),value);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`Balanced draw failed (${error})`);
   const ctx=target.getContext('2d');if(!ctx)throw Error('Balanced optics: target 2D unavailable');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.save();if(frame.path){ctx.scale(w/width,h/height);ctx.clip(new Path2D(frame.path));ctx.setTransform(1,0,0,1,0,0)}ctx.drawImage(canvas,0,0);
   // Composite the authored rim against the actual sampled scene. A normal
   // bright SVG stroke can wash through dark letterforms at zero blur.
   if(frame.path&&frame.rim){ctx.setTransform(w/width,0,0,h/height,0,0);ctx.globalCompositeOperation='multiply';ctx.globalAlpha=frame.rim.opacity;ctx.strokeStyle=frame.rim.color;ctx.lineWidth=frame.rim.width*2;ctx.stroke(new Path2D(frame.path));}
   ctx.restore();totals.draws++;
   target.dataset.optics='balanced';target.dataset.outputPixels=String(w*h);target.dataset.profile='B';
   if (transmission) target.dataset.sampling = 'linear-oversampled';
   else delete target.dataset.sampling;
  };
  return{render,dispose};
 }catch(error){dispose();throw error}
}
let pool:ReturnType<typeof createPool>|null=null,poolError:unknown=null;
/** One offscreen GPU context, shared by all registered-scene consumers. */
export function acquireBalancedOptics(){
 totals.clients++;let released=false;
 return{render:(target:HTMLCanvasElement,source:BalancedSource,frame:BalancedFrame)=>{if(released)throw Error('Balanced optics client released');if(poolError)throw poolError;if(!pool){try{pool=createPool()}catch(error){poolError=error;throw error}}try{pool.render(target,source,frame)}catch(error){poolError=error;pool.dispose();pool=null;throw error}},release:()=>{if(released)return;released=true;totals.clients--;if(!totals.clients){pool?.dispose();pool=null;poolError=null}}};
}
