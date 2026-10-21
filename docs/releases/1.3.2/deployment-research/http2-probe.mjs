import http2 from 'node:http2';
const ips=['104.19.193.29','104.19.192.175','104.19.192.174','104.19.192.176','104.19.192.177'];
const out=await Promise.all(ips.map(ip=>new Promise(resolve=>{
 const started=Date.now();const c=http2.connect('https://api.cloudflare.com',{lookup:(_h,o,cb)=>cb(null,o.all?[{address:ip,family:4}]:ip,...(o.all?[]:[4]))});
 const t=setTimeout(()=>finish({ip,error:'deadline'}),8000);let done=false;
 function finish(r){if(done)return;done=true;clearTimeout(t);c.destroy();resolve({...r,ms:Date.now()-started});}
 c.on('error',e=>finish({ip,error:e.code||e.name}));
 c.on('connect',()=>{const req=c.request({':path':'/client/v4/user',':method':'GET'});req.on('response',h=>finish({ip,status:h[':status'],alpn:c.alpnProtocol}));req.on('error',e=>finish({ip,error:e.code||e.name}));req.resume();req.end();});
})));
console.log(JSON.stringify(out));
