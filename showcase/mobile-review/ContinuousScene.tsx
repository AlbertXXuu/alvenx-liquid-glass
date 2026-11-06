import {useEffect, useLayoutEffect, useRef, type RefObject} from 'react';
import type {ReviewSettings} from '../../src/reviewSettings';
import {paintRefractionScene, type RefractionSceneModel} from './refractionScene';

const vertex=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
uniform sampler2D image;uniform sampler2D blurred;uniform sampler2D deep;uniform vec2 size;uniform vec2 pixels;
uniform vec2 center;uniform vec2 halfSize;uniform float level;uniform float baseBlur;uniform float progressiveBlur;
float qnorm(vec2 p){vec2 q=abs((p-center)/halfSize);return pow(pow(q.x,3.4)+pow(q.y,3.4),1.0/3.4);}
vec3 readScene(vec2 p){return texture2D(image,vec2(p.x/size.x,1.0-p.y/size.y)).rgb;}
vec3 readBlur(sampler2D tex,vec2 p){return texture2D(tex,vec2(p.x/size.x,1.0-p.y/size.y)).rgb;}
vec3 sceneAt(vec2 p){
 float q=qnorm(p);float t=clamp(1.0-q*q,0.0,1.0);float fall=t*t*t;
 float magnification=1.0+level/6.0;float k=1.0-1.0/magnification;
 vec2 source=p-(p-center)*k*fall;
 vec3 sharp=readScene(source);
 if(q>=1.0||(baseBlur<0.001&&progressiveBlur<0.001))return sharp;
 // Both blur textures are generated from the user-selected radii. Their
 // continuous mixture fades at the edge to meet the unfiltered backdrop.
 vec3 soft=readBlur(blurred,source), inner=readBlur(deep,source);
 return mix(sharp,mix(soft,inner,t),smoothstep(0.0,.4,t));
}
void main(){vec2 p=vec2(gl_FragCoord.x,pixels.y-gl_FragCoord.y)*size/pixels;vec2 d=size/pixels*.25;
 vec3 color=(sceneAt(p+vec2(-d.x,-d.y))+sceneAt(p+vec2(d.x,-d.y))+sceneAt(p+vec2(-d.x,d.y))+sceneAt(p+d))*.25;
 gl_FragColor=vec4(color,1.0);
}`;

type Props={model:RefractionSceneModel; settings:ReviewSettings; lens:RefObject<HTMLDivElement|null>; position:{x:number;y:number}; onReady:(ready:boolean)=>void};

/** Controlled showcase only: one canvas image supplies both scene and lens. */
export function ContinuousScene({model,settings,lens,position,onReady}:Props){
 const canvas=useRef<HTMLCanvasElement>(null), latest=useRef({model,settings,position});latest.current={model,settings,position};
 const render=useRef<()=>void>(()=>{}), refresh=useRef<()=>void>(()=>{});
 // The lens is a later sibling. Passive attachment sees its ref in production;
 // development StrictMode's second layout pass otherwise hides this race.
 useEffect(()=>{
  const el=canvas.current,host=el?.parentElement;if(!el||!host)return;
  let gl:WebGLRenderingContext|null=null,program:WebGLProgram|null=null,texture:WebGLTexture|null=null,blurTexture:WebGLTexture|null=null,deepTexture:WebGLTexture|null=null,buffer:WebGLBuffer|null=null;
  let frame=0,disposed=false,ready=false,active=false,request=0;
  let inViewport=typeof IntersectionObserver==='undefined',visible=inViewport&&!document.hidden,pendingUpload=true;
  let uploadedBlur={base:0,progressive:0};
  let sourceKey='',baseKey='',deepKey='';
  const image=document.createElement('canvas'),ctx=image.getContext('2d'),blurImage=document.createElement('canvas'),blurCtx=blurImage.getContext('2d');
  let blurSupported:boolean|undefined;
  const supportsBlur=()=>{
   if(blurSupported!==undefined)return blurSupported;
   const probe=document.createElement('canvas');probe.width=16;probe.height=16;
   const c=probe.getContext('2d',{willReadFrequently:true});
   if(!c||!('filter' in c))return blurSupported=false;
   c.filter='blur(2px)';c.fillStyle='#fff';c.fillRect(7,7,2,2);
   return blurSupported=c.getImageData(5,7,1,1).data[3]>0;
  };
  const stop=()=>{ready=false;if(active){active=false;onReady(false);}host.dataset.continuousReady='false';};
  const schedule=()=>{if(!disposed&&visible&&!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});};
  const draw=()=>{
   if(!visible||!gl||!program||!texture||!ready||!lens.current)return;
   if(gl.isContextLost()){stop();return;}
   const rect=host.getBoundingClientRect(),lrect=lens.current.getBoundingClientRect();
   const edge=lens.current.querySelector<SVGPathElement>('.local-edge path');
   if(!edge||rect.width<=0||rect.height<=0)return;
   let box:DOMRect;try{box=edge.getBBox();}catch{return;}
   if(!(box.width>0&&box.height>0))return;
   const d=Math.min(devicePixelRatio||1,2,Math.sqrt(2_000_000/(rect.width*rect.height)));
   const w=Math.max(1,Math.floor(rect.width*d)),h=Math.max(1,Math.floor(rect.height*d));
   if(el.width!==w||el.height!==h){el.width=w;el.height=h;}
   gl.viewport(0,0,w,h);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,blurTexture);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,deepTexture);
   const uniform=(name:string)=>gl!.getUniformLocation(program!,name);
   gl.uniform1i(uniform('image'),0);gl.uniform1i(uniform('blurred'),1);gl.uniform1i(uniform('deep'),2);gl.uniform2f(uniform('size'),rect.width,rect.height);gl.uniform2f(uniform('pixels'),w,h);
   const cx=lrect.left-rect.left+box.x+box.width/2,cy=lrect.top-rect.top+box.y+box.height/2;
   gl.uniform2f(uniform('center'),cx,cy);
   gl.uniform2f(uniform('halfSize'),box.width/2,box.height/2);
   const s=latest.current.settings;gl.uniform1f(uniform('level'),s.refractionLevel);gl.uniform1f(uniform('baseBlur'),uploadedBlur.base);gl.uniform1f(uniform('progressiveBlur'),uploadedBlur.progressive);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);el.dataset.continuousLevel=String(s.refractionLevel);el.dataset.continuousPixels=String(w*h);el.dataset.continuousCenter=`${cx.toFixed(2)},${cy.toFixed(2)}`;
   if(!active){const error=gl.getError();if(error!==gl.NO_ERROR){el.dataset.continuousError=`Draw failed (${error})`;stop();return;}active=true;host.dataset.continuousReady='true';onReady(true);}
  };
  const upload=async()=>{
   const ticket=++request;
   if(!visible){pendingUpload=true;return;}
   pendingUpload=false;
   if(!gl||!texture||!blurTexture||!deepTexture||!ctx||!blurCtx)return;
   try{
    if(!('letterSpacing' in ctx)||typeof ctx.roundRect!=='function')throw Error('Canvas typography features unavailable');
    const m=latest.current.model;
    const nonAscii=(s:string)=>s.replace(/[\u0000-\u007f]/g,'');
    await Promise.all([document.fonts.load('600 60px "Instrument Sans"',m.title),
     ...(nonAscii(m.title)?[document.fonts.load('600 60px MiSans',nonAscii(m.title))]:[]),
     ...(nonAscii(m.subtitle)?[document.fonts.load('500 32px MiSans',nonAscii(m.subtitle))]:[]),
     ...(nonAscii(m.caption)?[document.fonts.load('400 19px MiSans',nonAscii(m.caption))]:[]),document.fonts.ready]);
    if(disposed||ticket!==request||!gl||!texture)return;
    const rect=host.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return;
    // Sample the source at least twice per CSS pixel so the output's
    // subpixel coverage does not re-filter a one-pixel text raster.
    const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const d=Math.min(Math.max(devicePixelRatio||1,2),3,Math.sqrt(4_000_000/(rect.width*rect.height)),limit/rect.width,limit/rect.height);
    const s=latest.current.settings;if((s.blurLevel>0||s.progressiveBlur>0)&&!supportsBlur())throw Error('Canvas blur unavailable');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
    const put=(tex:WebGLTexture,source:HTMLCanvasElement)=>{gl!.bindTexture(gl!.TEXTURE_2D,tex);gl!.texImage2D(gl!.TEXTURE_2D,0,gl!.RGBA,gl!.RGBA,gl!.UNSIGNED_BYTE,source);};
    const nextSource=JSON.stringify([rect.width,rect.height,d,m]);
    const sourceChanged=nextSource!==sourceKey;
    if(sourceChanged){
     image.width=Math.max(1,Math.ceil(rect.width*d));image.height=Math.max(1,Math.ceil(rect.height*d));
     ctx.setTransform(image.width/rect.width,0,0,image.height/rect.height,0,0);paintRefractionScene(ctx,rect.width,rect.height,m);
     put(texture,image);
    }
    const putBlur=(tex:WebGLTexture,sigma:number)=>{
     if(sigma<=0){put(tex,image);return;}
     blurImage.width=image.width;blurImage.height=image.height;blurCtx.setTransform(1,0,0,1,0,0);
     blurCtx.filter=`blur(${sigma*d}px)`;blurCtx.drawImage(image,0,0);blurCtx.filter='none';put(tex,blurImage);
    };
    const nextBase=String(s.blurLevel),nextDeep=String(Math.hypot(s.blurLevel,s.progressiveBlur));
    if(sourceChanged||nextBase!==baseKey)putBlur(blurTexture,s.blurLevel);
    if(sourceChanged||nextDeep!==deepKey)putBlur(deepTexture,Math.hypot(s.blurLevel,s.progressiveBlur));
    const glError=gl.getError();if(glError!==gl.NO_ERROR)throw Error(`Texture upload failed (${glError})`);
    sourceKey=nextSource;baseKey=nextBase;deepKey=nextDeep;delete el.dataset.continuousError;
    uploadedBlur={base:s.blurLevel,progressive:s.progressiveBlur};
    ready=true;schedule();
   }catch(error){if(disposed||ticket!==request)return;sourceKey='';baseKey='';deepKey='';el.dataset.continuousError=String(error);stop();}
  };
  const lost=(event:Event)=>{event.preventDefault();request++;stop();};
  let resize:ResizeObserver|undefined,visibility:IntersectionObserver|undefined,mutations:MutationObserver|undefined;
  let shaders:WebGLShader[]=[];
  const resizeUpload=()=>{void upload();};
  const setVisible=(next:boolean)=>{
   if(next===visible)return;visible=next;
   if(!visible){request++;pendingUpload=true;if(frame){cancelAnimationFrame(frame);frame=0;}stop();}
   else if(pendingUpload)void upload();else schedule();
  };
  const documentVisibility=()=>setVisible(inViewport&&!document.hidden);
  const dispose=()=>{
   if(disposed)return;disposed=true;request++;if(frame)cancelAnimationFrame(frame);
   resize?.disconnect();visibility?.disconnect();mutations?.disconnect();window.removeEventListener('resize',resizeUpload);document.removeEventListener('visibilitychange',documentVisibility);el.removeEventListener('webglcontextlost',lost);stop();
   if(gl){for(const shader of shaders)gl.deleteShader(shader);if(texture)gl.deleteTexture(texture);if(blurTexture)gl.deleteTexture(blurTexture);if(deepTexture)gl.deleteTexture(deepTexture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);}
   render.current=()=>{};refresh.current=()=>{};
  };
  try{
   gl=el.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl||!ctx||!blurCtx)throw Error('WebGL or canvas unavailable');
   const shader=(type:number,source:string)=>{const s=gl!.createShader(type);if(!s)throw Error('Shader allocation failed');shaders.push(s);gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw Error(gl!.getShaderInfoLog(s)||'Shader failed');return s;};
   const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();if(!program)throw Error('Program allocation failed');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);shaders=[];if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Link failed');
   buffer=gl.createBuffer();if(!buffer)throw Error('Buffer allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   const newTexture=()=>{const tex=gl!.createTexture();if(!tex)throw Error('Texture allocation failed');gl!.bindTexture(gl!.TEXTURE_2D,tex);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_MIN_FILTER,gl!.LINEAR);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_MAG_FILTER,gl!.LINEAR);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_WRAP_S,gl!.CLAMP_TO_EDGE);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_WRAP_T,gl!.CLAMP_TO_EDGE);return tex;};
   texture=newTexture();blurTexture=newTexture();deepTexture=newTexture();
   el.addEventListener('webglcontextlost',lost);render.current=schedule;refresh.current=()=>{void upload();};
   resize=new ResizeObserver(resizeUpload);resize.observe(host);window.addEventListener('resize',resizeUpload);
   mutations=new MutationObserver(schedule);if(lens.current)mutations.observe(lens.current,{attributes:true,subtree:true,attributeFilter:['d','style']});
   visibility=typeof IntersectionObserver==='undefined'?undefined:new IntersectionObserver(entries=>{inViewport=entries.some(entry=>entry.isIntersecting);documentVisibility();});visibility?.observe(host);document.addEventListener('visibilitychange',documentVisibility);
   if(visible)void upload();
   return dispose;
  }catch(error){el.dataset.continuousError=String(error);dispose();return dispose;}
 },[lens,onReady]);
 useLayoutEffect(()=>refresh.current(),[model,settings.blurLevel,settings.progressiveBlur]);
 useLayoutEffect(()=>render.current(),[position,settings]);
 return <canvas ref={canvas} className="lab-continuous-scene" aria-hidden="true"/>;
}
