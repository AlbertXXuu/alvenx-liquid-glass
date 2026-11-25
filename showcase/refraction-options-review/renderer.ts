import type {ReviewSettings} from '../../src/reviewSettings';
export type Option='a'|'b'|'c';
export type Model={word:string;progress:number;checked:boolean;switchPosition:number;held:number;lens:{x:number;y:number};settings:ReviewSettings;option:Option};
export const WIDTH=640,HEIGHT=460;
export const OPTIONS={a:{label:'A · Soft center',description:'Compact magnification, quiet outer region. Up to 2× source, four coverage samples.',density:2,output:2},b:{label:'B · Balanced edge',description:'A broader clear center and more visible curved shoulder. Up to 3× source, four coverage samples.',density:3,output:2.5},c:{label:'C · Full lens',description:'The widest clear center, stronger outer bending and volume. Up to 4× source, nine coverage samples; highest pixel cost.',density:4,output:3}} as const;
const vertex='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const fragment=`precision highp float;
uniform sampler2D image;uniform sampler2D soft;uniform sampler2D deep;
uniform vec2 pixels;uniform vec2 sceneSize;uniform vec2 cssSize;uniform float plateMode;uniform float bevel;
uniform vec4 shapes[4];uniform float profile;uniform float level;uniform float opacity;
uniform float specular;uniform float saturation;uniform float blurLevel;uniform float progressive;
float normShape(vec2 p,vec4 s,float n){vec2 v=abs((p-s.xy)/s.zw);return pow(pow(v.x,n)+pow(v.y,n),1./n);}
vec3 sampleImage(sampler2D tex,vec2 p){return texture2D(tex,vec2(p.x/sceneSize.x,1.-p.y/sceneSize.y)).rgb;}
// C2 superelliptic corners join straight sides. Distance is corrected by
// the local gradient so the active optical band is measured in CSS pixels.
vec3 plateScene(vec2 p){
 vec2 c=p/sceneSize*cssSize-cssSize*.5;vec2 halfBox=cssSize*.5-vec2(12.);
 float radius=min(28.,min(halfBox.x,halfBox.y)*.3);vec2 v=abs(c)-(halfBox-vec2(radius));vec2 a=max(v,0.);
 float n=2.4;float l=pow(pow(a.x,n)+pow(a.y,n),1./n);
 vec2 gradient=l>.001?pow(a,vec2(n-1.))*pow(l,1.-n):(v.x>v.y?vec2(1.,0.):vec2(0.,1.));
 float sd=l+min(max(v.x,v.y),0.)-radius;
 vec3 color=sampleImage(image,p);if(sd>=0.)return color;
 float distance=-sd/max(length(gradient),.001);float band=min(bevel,min(radius*.8,min(halfBox.x,halfBox.y)*.2));
 float u=clamp(distance/band,0.,1.);float bump=64.*pow(u*(1.-u),3.);
 vec2 normal=normalize(gradient)*sign(c);
 // This is an artistic lateral offset, not a refractive-index ray solve.
 vec2 source=p-normal*(level/3.)*band*.18*bump*sceneSize/cssSize;
 color=sampleImage(image,source);
 float coverage=smoothstep(0.,1.2,distance);
 if(blurLevel>.001||progressive>.001)color=mix(color,mix(sampleImage(soft,source),sampleImage(deep,source),u),coverage);
 color=mix(color,vec3(.94,.95,1.),opacity*coverage);
 float strength=profile<.5?.025:(profile<1.5?.09:.16);
 float side=dot(normal,normalize(vec2(-.55,-.8)));
 vec3 tint=mix(vec3(.97),mix(vec3(.79,.88,1.),vec3(.94,.81,.98),normal.y*.5+.5),saturation/3.);
 color=mix(color,tint,specular*strength*bump);
 color+=specular*bump*(side*.045+.012)*vec3(.86,.9,1.);
 return color;
}
vec3 scene(vec2 p){
 if(plateMode>.5)return plateScene(p);
 float q=100.;vec4 shape=shapes[0];
 for(int i=0;i<4;i++){float n=(i==1||i==2)?2.4:3.4;float v=normShape(p,shapes[i],n);if(v<q){q=v;shape=shapes[i];}}
 if(q>=1.)return sampleImage(image,p);
 float t=max(0.,1.-q*q);float f=t*t*t;
 if(profile>.5)f=profile<1.5?f*(4.-3.*t):f*(10.-15.*t+6.*t*t);
 float k=1.-1./(1.+level/6.);vec2 source=p-(p-shape.xy)*k*f;
 vec3 color=sampleImage(image,source);
 if(blurLevel>0.001||progressive>0.001)color=mix(color,mix(sampleImage(soft,source),sampleImage(deep,source),t),smoothstep(0.,.4,t));
 float coverage=smoothstep(0.,.045,1.-q);
 color=mix(color,vec3(.94,.95,1.),opacity*coverage);
 vec2 v=(p-shape.xy)/shape.zw;
 float volume=profile<.5?.025:(profile<1.5?.09:.16);
 float shoulder=pow(q,3.)*(1.-q)*8.;
 vec3 tint=mix(vec3(.97),mix(vec3(.79,.88,1.),vec3(.94,.81,.98),clamp(v.y*.5+.5,0.,1.)),saturation/3.);
 color=mix(color,tint,specular*volume*shoulder);
 float side=clamp(dot(v,normalize(vec2(-.55,-.8))),-1.,1.);
 float band=profile<.5?.019:(profile<1.5?.032:.05);
 float edge=exp(-pow((q-(1.-band)) / band,2.))*smoothstep(0.,band*.8,1.-q);
 color+=specular*edge*(side*.08+.025)*vec3(.86,.9,1.);
 color-=specular*volume*shoulder*max(-side,0.)*.45;
 return color;
}
void main(){vec2 p=vec2(gl_FragCoord.x,pixels.y-gl_FragCoord.y)*sceneSize/pixels;vec2 d=sceneSize/pixels;vec3 color=vec3(0.);
 if(profile<1.5){color=(scene(p+d*vec2(-.25,-.25))+scene(p+d*vec2(.25,-.25))+scene(p+d*vec2(-.25,.25))+scene(p+d*.25))*.25;}
 else{for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)color+=scene(p+d*vec2(float(x),float(y))/3.)/9.;}
 gl_FragColor=vec4(color,1.);}`;

function source(ctx:CanvasRenderingContext2D,m:Model,d:number,height=HEIGHT,plate=false){
 ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,WIDTH,height);
 const bg=ctx.createLinearGradient(0,0,640,height);bg.addColorStop(0,'#D4E4FF');bg.addColorStop(.55,'#E7EAFD');bg.addColorStop(1,'#E7D8F7');ctx.fillStyle=bg;ctx.fillRect(0,0,640,height);
 ctx.strokeStyle='rgba(105,126,179,.17)';ctx.lineWidth=.6;ctx.beginPath();for(let x=0;x<=640;x+=20){ctx.moveTo(x,0);ctx.lineTo(x,height)}for(let y=0;y<=height;y+=20){ctx.moveTo(0,y);ctx.lineTo(640,y)}ctx.stroke();
 if(plate){ctx.fillStyle='rgba(116,147,218,.32)';ctx.fillRect(0,height*.28,640,2);ctx.fillStyle='rgba(166,123,205,.24)';ctx.fillRect(0,height*.68,640,2);return;}
 ctx.fillStyle='#425990';ctx.font='600 60px "Instrument Sans",MiSans,sans-serif';ctx.fillText(m.word,52,105);
 ctx.font='400 19px "Instrument Sans",MiSans,sans-serif';ctx.fillStyle='#637399';ctx.fillText('One source. Four interactive glass surfaces.',52,150);
 const line=(x:number,y:number,w:number,h:number,color:string)=>{ctx.beginPath();ctx.fillStyle=color;ctx.roundRect(x,y,w,h,h/2);ctx.fill()};
 line(72,216,496,12,'#BEC9E5');line(72,216,496*m.progress,12,'#879BE8');
 line(72,298,100,20,'#BDC9E7');line(72,298,100*(.2+.8*m.switchPosition),20,m.checked?'#8D9CE8':'#B6B6DD');
 ctx.fillStyle='#53658B';ctx.font='500 16px "Instrument Sans",MiSans,sans-serif';ctx.fillText('Progress',72,192);ctx.fillText('Continuous switch',214,314);ctx.fillText('Native text · refracted background',72,355);
 // A high-contrast seam through the source makes field-background refraction inspectable.
 ctx.fillStyle='#C3D4F6';ctx.fillRect(72,366,248,52);ctx.fillStyle='#DED0F1';ctx.fillRect(320,366,248,52);
 ctx.strokeStyle='rgba(111,128,176,.5)';ctx.lineWidth=1;ctx.beginPath();for(let x=92;x<568;x+=20){ctx.moveTo(x,366);ctx.lineTo(x,418)}ctx.stroke();
}

/** Review-only analytic sampling. No RG8 normal map or DOM image serialization. */
export function createRenderer(canvas:HTMLCanvasElement,{plate=false}:{plate?:boolean}={}){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL unavailable');
 const shaders:WebGLShader[]=[],textures:WebGLTexture[]=[];let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;for(const s of shaders)gl.deleteShader(s);for(const t of textures)gl.deleteTexture(t);if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer)};
 try{
  const compile=(type:number,text:string)=>{const s=gl.createShader(type);if(!s)throw Error('Shader allocation');shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader compile');return s};
  program=gl.createProgram();if(!program)throw Error('Program allocation');gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Shader link');
  gl.useProgram(program);buffer=gl.createBuffer();if(!buffer)throw Error('Buffer allocation');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  for(let i=0;i<3;i++){const tex=gl.createTexture();if(!tex)throw Error('Texture allocation');textures.push(tex);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)}
  const image=document.createElement('canvas'),ctx=image.getContext('2d'),blur=document.createElement('canvas'),bc=blur.getContext('2d');if(!ctx||!bc)throw Error('Canvas unavailable');
  let key='',baseKey='',deepKey='';const uniform=(name:string)=>gl.getUniformLocation(program!,name);
  const put=(index:number,source:HTMLCanvasElement)=>{gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,textures[index]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source)};
  const render=(m:Model)=>{
   if(disposed||gl.isContextLost())throw Error('Renderer unavailable');
   const option=OPTIONS[m.option],rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
   const height=plate?rect.height/rect.width*WIDTH:HEIGHT;
   const output=Math.min(devicePixelRatio||1,option.output,Math.sqrt(3_000_000/(rect.width*rect.height)));
   const w=Math.max(1,Math.round(rect.width*output)),h=Math.max(1,Math.round(rect.height*output));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
   // Source density is measured per logical scene unit; output uses actual CSS width and DPR.
   const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
   const d=Math.min(Math.max(2,rect.width/WIDTH*(devicePixelRatio||1)*1.5),option.density,limit/WIDTH,limit/height,Math.sqrt(6_000_000/(WIDTH*height)));
   const next=JSON.stringify(plate?[height,d]:[m.word,m.progress,m.checked,m.switchPosition,d]);const changed=next!==key;
   if(changed){image.width=Math.ceil(WIDTH*d);image.height=Math.ceil(height*d);source(ctx,m,d,height,plate);put(0,image)}
   const b=m.settings.blurLevel,p=m.settings.progressiveBlur;
   const blurPut=(index:number,sigma:number)=>{
    if(sigma===0){put(index,image);return}
    if(!('filter'in bc))throw Error('This browser lacks Canvas blur; use both blur values 0 for this review');
    blur.width=image.width;blur.height=image.height;bc.filter=`blur(${sigma*d*(plate?WIDTH/rect.width:1)}px)`;bc.drawImage(image,0,0);bc.filter='none';put(index,blur);
   };
   if(changed||String(b)!==baseKey)blurPut(1,b);if(changed||String(Math.hypot(b,p))!==deepKey)blurPut(2,Math.hypot(b,p));
   gl.useProgram(program);gl.viewport(0,0,w,h);
   for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.uniform1i(uniform(['image','soft','deep'][i]),i)}
   gl.uniform2f(uniform('pixels'),w,h);gl.uniform2f(uniform('sceneSize'),WIDTH,height);gl.uniform2f(uniform('cssSize'),rect.width,rect.height);gl.uniform1f(uniform('plateMode'),plate?1:0);
   const bevel=[10,16,22][['a','b','c'].indexOf(m.option)];gl.uniform1f(uniform('bevel'),bevel);
   const shapes=[m.lens.x,m.lens.y,83,52,72+496*m.progress,222,32,20,104+36*m.switchPosition,308,32,23,320,392,248,30];
   if(m.held>=0){shapes[m.held*4+2]*=1+.01*m.settings.interactionStrength;shapes[m.held*4+3]*=1-.02*m.settings.interactionStrength;}
   gl.uniform4fv(uniform('shapes[0]'),new Float32Array(shapes));
   gl.uniform1f(uniform('profile'),['a','b','c'].indexOf(m.option));gl.uniform1f(uniform('level'),m.settings.refractionLevel);gl.uniform1f(uniform('opacity'),m.settings.glassOpacity);gl.uniform1f(uniform('specular'),m.settings.specularOpacity);gl.uniform1f(uniform('saturation'),m.settings.specularSaturation);gl.uniform1f(uniform('blurLevel'),b);gl.uniform1f(uniform('progressive'),p);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`WebGL error ${error}`);
   key=next;baseKey=String(b);deepKey=String(Math.hypot(b,p));canvas.dataset.ready='true';canvas.dataset.option=m.option;canvas.dataset.sourceSize=`${image.width}x${image.height}`;canvas.dataset.outputSize=`${w}x${h}`;canvas.dataset.sourceDensity=String(d);canvas.dataset.magnification=plate?'1':String(1+m.settings.refractionLevel/6);canvas.dataset.sourceKey=next;
   if(plate){const half=Math.min(rect.width,rect.height)/2-12,radius=Math.min(28,half*.3),effective=Math.min(bevel,radius*.8,half*.2);canvas.dataset.bevelRequestedCss=String(bevel);canvas.dataset.bevelCss=String(effective);canvas.dataset.cornerCss=String(radius);canvas.dataset.maxOffsetCss=String(effective*.18*m.settings.refractionLevel/3);canvas.dataset.renderKind='flat-panel';}
  };
  return{render,dispose};
 }catch(error){dispose();throw error}
}
