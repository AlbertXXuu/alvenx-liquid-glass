// Isolated Playwright CLI callback; no changes to the showcase or saved settings.
async page => {
  await page.route('**/__normal_png_audit', route => route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await page.goto('http://127.0.0.1:5174/__normal_png_audit');
  const report = await page.evaluate(async () => {
    // Rejected runtime candidate kept only inside this reproducible experiment.
    // Stored PNG encoded faster but cost more in the native decode/filter route.
    const encodeNormalPng = (() => {
      /** Internal experiment: synchronous, lossless PNG for the small opaque RG
       * normal maps. Stored DEFLATE trades compression for bounded encoding work.
       * No image resizing, colour quantization, worker, or persistent pixel cache. */
      const CRC_TABLE = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
          let value = i;
          for (let bit = 0; bit < 8; bit++)
              value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
          CRC_TABLE[i] = value >>> 0;
      }
      function u32(bytes, at, value) {
          bytes[at] = value >>> 24;
          bytes[at + 1] = value >>> 16;
          bytes[at + 2] = value >>> 8;
          bytes[at + 3] = value;
      }
      function crc32(bytes, start, end) {
          let value = 0xffffffff;
          for (let i = start; i < end; i++)
              value = CRC_TABLE[(value ^ bytes[i]) & 255] ^ value >>> 8;
          return (value ^ 0xffffffff) >>> 0;
      }
      function adler32(bytes) {
          let a = 1, b = 0;
          // 5552 bytes is the largest safe Adler block before 32-bit overflow.
          for (let start = 0; start < bytes.length; start += 5552) {
              const end = Math.min(start + 5552, bytes.length);
              for (let i = start; i < end; i++) {
                  a += bytes[i];
                  b += a;
              }
              a %= 65521;
              b %= 65521;
          }
          return (b * 65536 + a) >>> 0;
      }
      function base64(bytes) {
          const native = bytes.toBase64;
          if (native)
              return native.call(bytes);
          // Older engines retain a bounded fallback; it is benchmarked separately.
          const chunks = [];
          for (let i = 0; i < bytes.length; i += 0x4000)
              chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x4000)));
          return btoa(chunks.join(''));
      }
      /** RGBA input must be fully opaque. RGB output reconstructs alpha=255 exactly.
       * The 512px/262144-pixel ceiling bounds transient buffers for internal maps. */
      function encodeNormalPng(rgba, width, height, channels = 3) {
          if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
              width > 512 || height > 512 || width * height > 262144 || rgba.length !== width * height * 4 ||
              (channels !== 3 && channels !== 4))
              throw new RangeError('Normal PNG requires a 1–512px opaque RGBA map and 3 or 4 output channels.');
          const stride = width * channels + 1;
          const raw = new Uint8Array(stride * height);
          let input = 0, at = 0;
          for (let y = 0; y < height; y++) {
              raw[at++] = 0; // PNG row filter: None.
              for (let x = 0; x < width; x++) {
                  raw[at++] = rgba[input++];
                  raw[at++] = rgba[input++];
                  raw[at++] = rgba[input++];
                  const alpha = rgba[input++];
                  if (alpha !== 255)
                      throw new RangeError('Normal PNG only accepts fully opaque input.');
                  if (channels === 4)
                      raw[at++] = alpha;
              }
          }
          const blocks = Math.ceil(raw.length / 65535), idatLength = 2 + blocks * 5 + raw.length + 4;
          const png = new Uint8Array(57 + idatLength);
          png.set([137, 80, 78, 71, 13, 10, 26, 10]);
          u32(png, 8, 13);
          png.set([73, 72, 68, 82], 12);
          u32(png, 16, width);
          u32(png, 20, height);
          png[24] = 8;
          png[25] = channels === 3 ? 2 : 6;
          u32(png, 29, crc32(png, 12, 29));
          u32(png, 33, idatLength);
          png.set([73, 68, 65, 84], 37);
          png[41] = 0x78;
          png[42] = 0x01;
          let output = 43;
          for (let start = 0; start < raw.length; start += 65535) {
              const count = Math.min(65535, raw.length - start);
              png[output++] = start + count === raw.length ? 1 : 0;
              png[output++] = count;
              png[output++] = count >>> 8;
              png[output++] = ~count;
              png[output++] = ~count >>> 8;
              png.set(raw.subarray(start, start + count), output);
              output += count;
          }
          u32(png, output, adler32(raw));
          output += 4;
          u32(png, output, crc32(png, 37, output));
          output += 4;
          u32(png, output, 0);
          png.set([73, 69, 78, 68], output + 4);
          u32(png, output + 8, 0xae426082);
          return `data:image/png;base64,${base64(png)}`;
      }

      return encodeNormalPng;
    })();
    const {createBackdropOptics} = await import('/src/backdropOptics.ts');
    const {contourShape,shellPath} = await import('/src/geometry.ts');
    const engine=createBackdropOptics(),cases=[];
    const assert=(value,message)=>{if(!value)throw new Error(message);};
    const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return{n:values.length,medianMs:sorted[Math.floor(sorted.length/2)],meanMs:values.reduce((a,b)=>a+b,0)/values.length,p95Ms:sorted[Math.floor(sorted.length*.95)],minMs:sorted[0],maxMs:sorted.at(-1)};};
    const decode=async href=>{const image=new Image();image.src=href;await image.decode();return image;};
    const pixels=async href=>{const image=await decode(href),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height);};
    for(const [hostWidth,hostHeight,kind]of [[64,44,'thumb'],[240,76,'card'],[224,160,'large']]){
      const scale=kind==='large'?1:Math.max(3,Math.min(6,264/hostHeight));
      const shape={...contourShape(hostWidth-12,hostHeight-8,kind==='thumb'?2.4:3.4),x:hostWidth/2,y:hostHeight/2};
      const map=engine.render({path:shellPath(shape),width:hostWidth*scale,height:hostHeight*scale,camera:{x:hostWidth/2,y:hostHeight/2+8/scale,zoom:scale},channels:'rg',version:1});
      cases.push({name:kind,rgba:await pixels(map.href)});
    }
    // Independent high-entropy opaque data exercises every channel value and a
    // multiple-stored-block payload, not just the smooth normal map fixtures.
    const stress=new ImageData(224,160);let seed=17;for(let i=0;i<stress.data.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;stress.data[i+c]=seed>>>24;}stress.data[i+3]=255;}
    const one=new ImageData(new Uint8ClampedArray([17,244,129,255]),1,1),quality=[];
    for(const test of [...cases,{name:'opaque-random',rgba:stress},{name:'one-pixel',rgba:one}])for(const channels of [3,4]){
      const href=encodeNormalPng(test.rgba.data,test.rgba.width,test.rgba.height,channels),decoded=await pixels(href);let maxDiff=0;
      for(let i=0;i<decoded.data.length;i++)maxDiff=Math.max(maxDiff,Math.abs(decoded.data[i]-test.rgba.data[i]));
      assert(maxDiff===0,test.name+' '+channels+' lossless pixels');quality.push({name:test.name,channels,width:decoded.width,height:decoded.height,maxDiff,uriChars:href.length});
    }
    let rejected=0;for(const args of [[new Uint8Array(4),1,1],[new Uint8Array(4),0,1],[new Uint8Array(4),513,1],[new Uint8Array(3),1,1]])try{encodeNormalPng(...args);}catch{rejected++;}assert(rejected===4,'invalid/transparent inputs rejected');
    const encoding=[];
    for(const test of cases){
      const {rgba}=test,{width,height}=rgba,c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
      const methods={native:()=>{ctx.putImageData(rgba,0,0);return c.toDataURL('image/png');},rgb:()=>encodeNormalPng(rgba.data,width,height,3),rgba:()=>encodeNormalPng(rgba.data,width,height,4)};
      const samples={native:[],rgb:[],rgba:[]},lengths={};
      for(let i=0;i<12;i++)for(const key of Object.keys(methods)){rgba.data[4]=(i*13)&255;methods[key]();}
      for(let round=0;round<7;round++){
        const order=round%2?['rgba','rgb','native']:['native','rgb','rgba'];
        for(const key of order){const start=performance.now();let href='';for(let i=0;i<35;i++){rgba.data[4]=(round*35+i)&255;href=methods[key]();}samples[key].push((performance.now()-start)/35);lengths[key]=href.length;}
      }
      encoding.push({name:test.name,width,height,iterationsPerRound:35,stats:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,stats(v)])),samples,uriChars:lengths});
    }
    const representative=cases[0].rgba,c=document.createElement('canvas');c.width=representative.width;c.height=representative.height;const ctx=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height;
    const svg=href=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="f" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${href}" width="${w}" height="${h}" result="normal"/><feDisplacementMap in="SourceGraphic" in2="normal" scale="18" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g filter="url(#f)"><rect width="${w}" height="${h}" fill="#c4c8ef"/><path d="M0 30H${w}M0 65H${w}M0 100H${w}M35 0V${h}M90 0V${h}M150 0V${h}" stroke="#616bb0" stroke-width="5"/></g></svg>`;
    const filterPixels=async href=>{const url=URL.createObjectURL(new Blob([svg(href)],{type:'image/svg+xml'}));try{const image=await decode(url);ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0);return ctx.getImageData(0,0,w,h).data;}finally{URL.revokeObjectURL(url);}};
    ctx.putImageData(representative,0,0);const reference=await filterPixels(c.toDataURL('image/png'));
    const candidate=await filterPixels(encodeNormalPng(representative.data,w,h));let filterMaxDiff=0;for(let i=0;i<reference.length;i++)filterMaxDiff=Math.max(filterMaxDiff,Math.abs(reference[i]-candidate[i]));assert(filterMaxDiff===0,'native feImage displacement output pixel equality');
    const endToEnd={normalImage:{native:[],rgb:[]},nativeFeImageSvg:{native:[],rgb:[]}};
    for(const route of Object.keys(endToEnd))for(let round=0;round<16;round++)for(const method of round%2?['rgb','native']:['native','rgb']){
      representative.data[4]=(round*11)&255;
      const start=performance.now();let href;
      if(method==='native'){ctx.putImageData(representative,0,0);href=c.toDataURL('image/png');}else href=encodeNormalPng(representative.data,w,h);
      if(route==='normalImage'){const image=await decode(href);ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0);ctx.getImageData(0,0,w,h);}else await filterPixels(href);
      if(round>=3)endToEnd[route][method].push(performance.now()-start);
    }
    // The old-engine fallback is part of portability cost, not blended into the
    // native Uint8Array base64 path measured above.
    const descriptor=Object.getOwnPropertyDescriptor(Uint8Array.prototype,'toBase64'),fallback=[];
    if(descriptor?.configurable){Object.defineProperty(Uint8Array.prototype,'toBase64',{value:undefined,configurable:true,writable:true});try{for(let i=0;i<12;i++){const start=performance.now();encodeNormalPng(representative.data,w,h);if(i>=2)fallback.push(performance.now()-start);}}finally{Object.defineProperty(Uint8Array.prototype,'toBase64',descriptor);}}
    engine.destroy();
    return{date:new Date().toISOString(),userAgent:navigator.userAgent,nativeTypedArrayBase64:typeof Uint8Array.prototype.toBase64==='function',quality,invalidRejected:rejected,encoding,endToEnd:Object.fromEntries(Object.entries(endToEnd).map(([route,methods])=>[route,Object.fromEntries(Object.entries(methods).map(([name,v])=>[name,stats(v)]))])),feImageOutputMaxDiff:filterMaxDiff,fallback:fallback.length?stats(fallback):null,notes:['Seven alternating rounds, 35 unique-pixel encodes per round; native baseline includes putImageData plus toDataURL.','Decode trials use native Image.decode and canvas readback; SVG trial really exercises feImage + feDisplacementMap but is not the page backdrop compositor or a whole-UI frame benchmark.','Helper PNG uses lossless stored DEFLATE; larger data URLs can reduce the existing 2 MiB cache capacity.','No original preview, production source integration, user storage, or public API export changed.']};
  });
  await page.evaluate(result=>window.normalPngAudit=result,report);
  return report;
}
