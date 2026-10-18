async page=>{
  await page.reload();
  const result=await page.evaluate(async()=>{
    const {createGlassPreview}=await import('/work/material-direction-preview/volume-renderer.js');
    const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;left:0;top:0;width:525px;height:280px;visibility:hidden;pointer-events:none';document.body.append(canvas);
    const renderer=createGlassPreview(canvas),gl=canvas.getContext('webgl');
    if(!gl)throw Error('Missing WebGL');
    const base={edge:'pearl',flat:false,growth:1,time:0,lightX:.22,lightY:.08,curvature:3.2,parentX:1,parentY:1,childX:1,childY:1,deformX:500,deformY:280,deformDX:0,deformDY:0,specularOpacity:1,specularSaturation:2,refractionLevel:2,blurLevel:2,progressiveBlur:2,glassOpacity:.3};
    const uniform=(name)=>{const v=gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM),gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM),name));return ArrayBuffer.isView(v)?Array.from(v):v;};
    const render=options=>{renderer.render({...base,...options});const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);if(gl.getError()!==gl.NO_ERROR||canvas.dataset.error)throw Error('WebGL error: '+canvas.dataset.error);return pixels;};
    const difference=(a,b)=>{let total=0,changed=0,max=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const d=Math.abs(a[i]-b[i]);total+=d;max=Math.max(max,d);changed+=d>0?1:0;}return{mean:total/(a.length*.75),changed,max};};
    const changes={};
    for(const [key,a,b] of [['specularSaturation',2,3],['refractionLevel',2,3],['glassOpacity',.6,1]]){const p=render({[key]:a}),q=render({[key]:b});changes[key]=difference(p,q);if(changes[key].changed===0)throw Error('Extended range has no visible effect: '+key);}
    render({specularSaturation:3,refractionLevel:3,glassOpacity:1,blurLevel:6,progressiveBlur:6,parentX:1.12804,childX:1.12804,parentY:.89968,childY:.89968,deformDX:29.7,deformDY:-29.7});
    const actual={saturation:uniform('u_specular_saturation'),refraction:uniform('u_refraction_level'),opacity:uniform('u_glass_opacity'),deformation:uniform('u_deform_amount'),parentScale:uniform('u_parent_stretch'),childScale:uniform('u_child_stretch')};
    if(actual.saturation!==3||actual.refraction!==3||actual.opacity!==1||Math.abs(actual.deformation[0]-29.7)>.001||Math.abs(actual.parentScale[0]-1.12804)>.001)throw Error('The renderer silently clipped an expanded range');
    const allMaxError=canvas.dataset.error||null;
    renderer.destroy();canvas.remove();return{changes,actual,allMaxError};
  });
  return{status:'passed',...result,limits:'Frozen-time native WebGL renderer. Pixel differences prove new endpoints affect the analytic volume, not arbitrary DOM refraction or universal performance.'};
}
