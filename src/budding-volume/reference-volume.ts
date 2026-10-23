import rendererSource from '../volume-renderer.js?raw';
import type { MaterialParameters } from '../reviewSettings';
import { refinementRoom,reviewChamberExponent,type ReviewBuddingTransform } from './geometry';

// Reuse the actual accepted large-volume shader, rather than inventing another
// neutral lighting model. The review adds only a bounded coordinate mapping,
// transparent composition and a fixed small raster budget. No source eval.
const fragmentMatch=rendererSource.match(/const FRAGMENT = `([\s\S]*?)`;/);
if(!fragmentMatch)throw new Error('The accepted volume shader could not be located.');
const hook=(source:string,before:string,after:string)=>{
 if(source.split(before).length!==2)throw new Error('The accepted volume shader interface changed.');
 return source.replace(before,after);
};
let fragment=fragmentMatch[1];
fragment=hook(fragment,'uniform vec2 u_resolution;',`uniform vec2 u_resolution;
uniform vec4 u_review_box;
uniform vec4 u_review_transform;
uniform sampler2D u_review_profile;
vec2 reviewProfileCss(vec2 p) {
 float s=u_review_box.z/300.0;
 return vec2(6.0+s*(230.0+(p.x-230.0)*u_review_transform.x-80.0)+u_review_transform.z,
             u_review_box.y*0.5+s*(p.y-280.0)*u_review_transform.y+u_review_transform.w);
}
vec2 reviewProfileBounds(vec2 css) {
 vec4 encoded=texture2D(u_review_profile,vec2(css.x/u_review_box.x,0.5));
 return vec2(dot(encoded.rg,vec2(65280.0,255.0)),dot(encoded.ba,vec2(65280.0,255.0)))/65535.0*u_review_box.y;
}
float reviewProfileDistance(vec2 p) {
 vec2 css=reviewProfileCss(p),bounds=reviewProfileBounds(css);
 float d=max(bounds.x-css.y,css.y-bounds.y);
 return d/(u_review_box.z/300.0);
}
float reviewProfileHeight(vec2 p) {
 vec2 css=reviewProfileCss(p),bounds=reviewProfileBounds(css);
 float halfHeight=(bounds.y-bounds.x)*0.5;
 float q=(css.y-(bounds.x+bounds.y)*0.5)/max(halfHeight,0.001);
 return 106.0*max(halfHeight/(u_review_box.z*0.5),0.0)*sqrt(max(1.0-q*q,0.0));
}`);
// Rest, growth and separated contours share the same displayed C2 profile.
fragment=hook(fragment,'float sceneDistance(vec2 p) {',`float sceneDistance(vec2 p) {
 return reviewProfileDistance(p);`);
fragment=hook(fragment,'float heightAt(vec2 p) {',`float heightAt(vec2 p) {
 return reviewProfileHeight(p);`);
fragment=hook(fragment,`  float scale = min(u_resolution.x / VIEW.x, u_resolution.y / VIEW.y);
  vec2 screen = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 p = (screen - u_resolution * 0.5) / scale + VIEW * 0.5;`,
`  float scale = (u_review_box.z/300.0)*(u_resolution.x/u_review_box.x);
  vec2 screen = vec2(gl_FragCoord.x,u_resolution.y-gl_FragCoord.y);
  vec2 css = screen*u_review_box.xy/u_resolution;
  vec2 local=(css-vec2(6.0,u_review_box.y*0.5))/(u_review_box.z/300.0)+vec2(80.0,280.0);
  vec2 p=vec2(230.0+(local.x-230.0-u_review_transform.z/(u_review_box.z/300.0))/u_review_transform.x,
              280.0+(local.y-280.0-u_review_transform.w/(u_review_box.z/300.0))/u_review_transform.y);`);
// One continuous height model owns rest, growth and separation. Do not switch
// the mother's normals at a growth threshold or transform its profile twice.
// Exterior samples are transparent, avoiding a pale matte around the C2 clip.
fragment=hook(fragment,'    gl_FragColor = vec4(background, 1.0);','    gl_FragColor = vec4(0.0);');
// The DOM clip already antialiases the exact contour. Keep material coverage
// through that edge instead of stacking two fading masks into a pale seam.
fragment=hook(fragment,'float coverage = 1.0 - smoothstep(-aa, aa, distance);','float coverage = 1.0 - smoothstep(aa, 3.0 * aa, distance);');
fragment=hook(fragment,'if (distance > aa) {','if (distance > 3.0 * aa) {');
fragment=hook(fragment,'  float edgeStrength = 0.94;','  float edgeStrength = 0.0;');
fragment=hook(fragment,'sourceShoulder * 0.24','sourceShoulder * 0.0');
fragment=hook(fragment,'  gl_FragColor = vec4(clamp(mix(background, surface, coverage), 0.0, 1.0), 1.0);',`  surface=mix(surface,vec3(0.98,0.985,1.0),0.18);
  float luminance=dot(surface,vec3(0.2126,0.7152,0.0722));
  surface=mix(vec3(luminance),surface,1.16);
  gl_FragColor = vec4(clamp(surface, 0.0, 1.0), coverage * 0.84);`);

// Bounded, reusable 1D cross-section texture. Rasterize short chords of the
// actual cubic path, so the material uses its visible boundary throughout the
// morph. No Canvas readback, PNG encoding or per-frame typed-array allocation.
const profileColumns=256;
function fillProfile(path:string,width:number,height:number,pixels:Uint8Array,top:Float32Array,bottom:Float32Array){
 top.fill(height);bottom.fill(0);
 const tokens=path.match(/[MCZ]|-?\d+(?:\.\d+)?/g)??[];
 let x=0,y=0;
 const sample=(ax:number,ay:number,bx:number,by:number)=>{
  const left=Math.min(ax,bx),right=Math.max(ax,bx);
  const first=Math.max(0,Math.ceil(left/width*profileColumns-.5)),last=Math.min(profileColumns-1,Math.floor(right/width*profileColumns-.5));
  for(let i=first;i<=last;i++){
   const px=(i+.5)/profileColumns*width,t=(px-ax)/(bx-ax||1),py=ay+(by-ay)*t;
   top[i]=Math.min(top[i],py);bottom[i]=Math.max(bottom[i],py);
  }
 };
 for(let i=0;i<tokens.length;){
  const command=tokens[i++];
  if(command==='M'){x=Number(tokens[i++]);y=Number(tokens[i++]);continue;}
  if(command==='Z')continue;
  if(command!=='C')throw new Error('Unexpected review contour command.');
  const x1=Number(tokens[i]),y1=Number(tokens[i+1]),x2=Number(tokens[i+2]),y2=Number(tokens[i+3]),x3=Number(tokens[i+4]),y3=Number(tokens[i+5]);
  let px=x,py=y;
  for(let j=1;j<=8;j++){
   const t=j/8,u=1-t,nx=u*u*u*x+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,ny=u*u*u*y+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
   sample(px,py,nx,ny);px=nx;py=ny;
  }
  x=x3;y=y3;i+=6;
 }
 for(let i=0;i<profileColumns;i++){
  const a=Math.round(Math.max(0,Math.min(1,top[i]/height))*65535),b=Math.round(Math.max(0,Math.min(1,bottom[i]/height))*65535);
  pixels[i*4]=a>>8;pixels[i*4+1]=a&255;pixels[i*4+2]=b>>8;pixels[i*4+3]=b&255;
 }
}

export function createReferenceVolume(canvas:HTMLCanvasElement,width:number,height:number,diameter:number){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL is unavailable; the actual-backdrop glass remains visible.');
 const scale=1.5,w=Math.ceil(width*scale),h=Math.ceil(height*scale);canvas.width=w;canvas.height=h;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
 const parallel=gl.getExtension('KHR_parallel_shader_compile');
 let status:'pending'|'ready'|'failed'='pending',destroyed=false,paintPolls=0;
 let preparationElapsed=0;
 canvas.dataset.volumePreparation=status;
 canvas.dataset.volumePreparationMode=parallel?'parallel':'deferred-sync';
 const compile=(kind:number,source:string)=>{const shader=gl.createShader(kind);if(!shader)throw new Error('Shader allocation failed.');gl.shaderSource(shader,source);gl.compileShader(shader);return shader;};
 const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}'),shader=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
 if(!program)throw new Error('Review volume program allocation failed.');gl.attachShader(program,vertex);gl.attachShader(program,shader);gl.linkProgram(program);
 let buffer:WebGLBuffer|null=null,profile:WebGLTexture|null=null,position=-1;
 const profilePixels=new Uint8Array(profileColumns*4),profileTop=new Float32Array(profileColumns),profileBottom=new Float32Array(profileColumns);
 const names=['resolution','review_box','review_transform','review_profile','light','curvature','growth','edge','flat','grid','time','studio_motion','studio_rotation','parent_stretch','child_stretch','deform_point','deform_amount','specular_opacity','specular_saturation','refraction_level','blur_level','progressive_blur','glass_opacity'];
 let uniforms:Record<string,WebGLUniformLocation|null>={},previous='',previousProfile='',renders=0,total=0;
 return {get ready(){return status==='ready';},poll(elapsedMs=0){
  if(status!=='pending'||destroyed)return false;
  preparationElapsed+=Math.max(0,elapsedMs);
  if(gl.isContextLost()){status='failed';canvas.dataset.volumePreparation=status;gl.deleteTexture(profile);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(shader);destroyed=true;return false;}
  if(parallel){if(!gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){
   // Only foreground shared-clock time consumes the preparation budget.
   // A shader completed during a hidden interval remains usable on return.
   if(preparationElapsed>10000){status='failed';canvas.dataset.volumePreparation=status;canvas.dataset.volumeError='Reference shader preparation timed out.';gl.deleteTexture(profile);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(shader);destroyed=true;return false;}
   return true;
  }}
  else{
   // Preserve the accepted material on engines without the extension. The
   // unavoidable synchronous status wait starts only after initial content has
   // painted, never from an activation handler. Paint timing is preferred;
   // older engines get two existing-clock paint opportunities, recorded below.
   const observed=performance.getEntriesByType('paint').length>0;
   if(!observed&&++paintPolls<3)return true;
   canvas.dataset.volumeFallbackPaint=observed?'observed':'two-clock-paint-opportunities';
  }
  // With KHR, status/location queries run only after completion. The explicitly
  // recorded compatibility branch retains its residual synchronous status wait.
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
   status='failed';canvas.dataset.volumePreparation=status;canvas.dataset.volumeError=gl.getProgramInfoLog(program)||gl.getShaderInfoLog(shader)||'Review volume linking failed.';return false;
  }
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  profile=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,profile);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,profileColumns,1,0,gl.RGBA,gl.UNSIGNED_BYTE,profilePixels);
  position=gl.getAttribLocation(program,'a_position');uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,`u_${name}`)]));
  status='ready';canvas.dataset.volumePreparation=status;return false;
 },draw(path:string,growth:number,material:MaterialParameters,transform:ReviewBuddingTransform={}){
  if(status!=='ready'||destroyed)return;
  const key=path+JSON.stringify(material);if(key===previous)return;previous=key;
  const start=performance.now();gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,profile);gl.uniform1i(uniforms.review_profile,0);
  if(path!==previousProfile){fillProfile(path,width,height,profilePixels,profileTop,profileBottom);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,profileColumns,1,gl.RGBA,gl.UNSIGNED_BYTE,profilePixels);previousProfile=path;}
  gl.uniform2f(uniforms.resolution,w,h);gl.uniform4f(uniforms.review_box,width,height,diameter,refinementRoom(diameter)/(diameter/300));gl.uniform4f(uniforms.review_transform,transform.scaleX??1,transform.scaleY??1,transform.offsetX??0,transform.offsetY??0);
  gl.uniform2f(uniforms.light,.22,.08);gl.uniform2f(uniforms.parent_stretch,1,1);gl.uniform2f(uniforms.child_stretch,1.15,1);gl.uniform2f(uniforms.deform_point,500,280);gl.uniform2f(uniforms.deform_amount,0,0);gl.uniform2f(uniforms.studio_rotation,1,0);
  for(const [name,value] of Object.entries({curvature:reviewChamberExponent,growth,edge:0,flat:0,grid:0,time:0,studio_motion:0,specular_opacity:material.specularOpacity,specular_saturation:material.specularSaturation,refraction_level:material.refractionLevel,blur_level:material.blurLevel/(diameter/300),progressive_blur:material.progressiveBlur/(diameter/300),glass_opacity:material.glassOpacity}))gl.uniform1f(uniforms[name],value);
  if(renders===0)canvas.dataset.volumeReveal=growth===0?'instant':'blend';
  gl.drawArrays(gl.TRIANGLES,0,3);renders++;const ms=performance.now()-start;total+=ms;
  canvas.dataset.volumeLightRenders=String(renders);canvas.dataset.volumeLightComputeMs=ms.toFixed(3);canvas.dataset.volumeLightMeanMs=(total/renders).toFixed(3);canvas.dataset.volumeLightPixels=String(w*h);canvas.dataset.volumeHeightModel='continuous-contour-profile';canvas.dataset.materialSource='src/volume-renderer.js';
 },destroy(){if(destroyed)return;destroyed=true;gl.deleteTexture(profile);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(shader);previous='';}};
}
