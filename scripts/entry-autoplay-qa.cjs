async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const failures = [], checks = [];
  const check = (name, pass, detail) => { checks.push({ name, pass, detail }); if (!pass) failures.push(name); };
  const fixture = `<!doctype html><meta charset="utf-8"><title>Entry budding lifecycle QA</title><div id="root"></div><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import {VolumeStage} from '/src/VolumeStage.tsx';
    import {useGlassSettings} from '/src/useGlassSettings.ts';
    import '/styles/glass.css';
    const {StrictMode,useRef}=React,{createRoot}=ReactDOM;
    const query=new URLSearchParams(location.search);
    window.__entryEvents=[];
    if(query.has('slow-frames')){
      window.__entryNow=10000;let next=0;const frames=new Map();
      Object.defineProperty(performance,'now',{configurable:true,value:()=>window.__entryNow});
      window.requestAnimationFrame=callback=>{const id=++next;frames.set(id,callback);return id;};
      window.cancelAnimationFrame=id=>frames.delete(id);
      window.__entryStep=ms=>{window.__entryNow+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(window.__entryNow));};
    }
    window.__entryDraws=0;
    const drawArrays=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args){window.__entryDraws++;return drawArrays.apply(this,args);};
    if(query.has('hidden'))window.__entryHidden=true;
    if(query.has('stored-reduced'))localStorage.setItem('alvenx-entry-autoplay-qa',JSON.stringify({reducedMotion:true}));
    if(query.has('ambient-off'))localStorage.setItem('alvenx-entry-autoplay-qa',JSON.stringify({ambient:false}));
    if(query.has('no-webgl')){
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};
    }
    function Fixture(){
      const controller=useGlassSettings({storageKey:'alvenx-entry-autoplay-qa'}),stage=useRef(null);
      window.__entryQA={replay:()=>stage.current.replay(),update:controller.updateSettings};
      return React.createElement('main',{className:'alvenx-design',style:{maxWidth:1000,margin:'0 auto'}},
        React.createElement('div',{id:'spacer',style:{height:query.has('offscreen')?1100:0}}),
        React.createElement(VolumeStage,{ref:stage,clock:controller.clock,settings:controller.settings,responsive:true,
          ...(!query.has('manual')?{autoPlay:true}:{}),onPlayingChange:playing=>window.__entryEvents.push(playing)},
          React.createElement('p',null,'Clear native foreground')),
        React.createElement('div',{style:{height:1400}}));
    }
    createRoot(document.getElementById('root')).render(React.createElement(StrictMode,null,React.createElement(Fixture)));
  </script>`;
  await page.route('**/__entry-autoplay-qa*', route => route.fulfill({ contentType:'text/html',body:fixture }));
  await page.setViewportSize({ width:1200,height:850 });
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await page.addInitScript(() => {
    localStorage.removeItem('alvenx-entry-autoplay-qa');
    window.__entryHidden = false;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__entryHidden});
  });
  const read = () => page.locator('.stage').evaluate(el => ({ growth:Number(el.dataset.growth),visible:el.dataset.visible,status:el.dataset.entryPlayback,events:[...window.__entryEvents],draws:window.__entryDraws,error:el.querySelector('canvas').dataset.error??'' }));
  const load = async query => { await page.goto(origin+'/__entry-autoplay-qa'+query); await page.locator('.stage').waitFor(); };
  await load('?offscreen');
  await page.waitForTimeout(450);
  const pending = await read();
  check('offscreen entry stays unconsumed at mother form',pending.growth===0&&pending.events.length===0&&pending.visible==='false'&&pending.draws===0,pending);
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>window.__entryEvents.length===1);
  const started=await read();
  check('first visible entry starts once under StrictMode',started.growth<.5&&started.status==='playing'&&started.events.join(',')==='true',started);
  await page.evaluate(()=>{window.__entryHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  const hiddenStart=await read();
  await page.waitForTimeout(300);
  const hiddenEnd=await read();
  check('foreground lifecycle pauses automatic play while hidden',hiddenStart.growth===hiddenEnd.growth&&hiddenStart.draws===hiddenEnd.draws, {hiddenStart,hiddenEnd});
  await page.evaluate(()=>{window.__entryHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(160);
  const foreground=await read();
  check('foreground return resumes pending animation',foreground.growth>hiddenEnd.growth&&foreground.events.length===1,foreground);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const offscreenStart=await read();
  await page.waitForTimeout(300);
  const offscreenEnd=await read();
  check('automatic play pauses offscreen without GPU/lifecycle consumption',offscreenStart.visible==='false'&&offscreenStart.growth===offscreenEnd.growth&&offscreenStart.draws===offscreenEnd.draws,{offscreenStart,offscreenEnd});
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.stage').dataset.growth==='1.0000',null,{timeout:10000});
  const complete=await read();
  check('automatic introduction completes with one start/end pair',complete.status==='completed'&&complete.events.join(',')==='true,false',complete);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(160);
  const returned=await read();
  check('scrolling away/back never restarts completed introduction',returned.growth===1&&returned.events.length===2,returned);
  await page.evaluate(()=>window.__entryQA.replay());
  await page.waitForTimeout(100);
  const replay=await read();
  check('manual replay remains available after initial automatic play',replay.growth<.5&&replay.events.join(',')==='true,false,true',replay);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(130);
  const reducedDuring=await read();
  check('reduced motion completes active play immediately',reducedDuring.growth===1&&reducedDuring.events.join(',')==='true,false,true,false',reducedDuring);
  await load('');
  await page.waitForTimeout(150);
  const reducedInitial=await read();
  check('system reduced motion initially presents complete form',reducedInitial.growth===1&&reducedInitial.events.length===0&&reducedInitial.status==='reduced-motion',reducedInitial);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForTimeout(150);
  const optedOut=await read();
  check('turning reduced motion off does not trigger a late introduction',optedOut.growth===1&&optedOut.events.length===0,optedOut);
  await load('?stored-reduced');
  await page.waitForTimeout(150);
  const storedReduced=await read();
  check('saved reduced-motion preference suppresses initial animation',storedReduced.growth===1&&storedReduced.events.length===0&&storedReduced.status==='reduced-motion',storedReduced);
  await load('?hidden');
  await page.waitForTimeout(150);
  const hiddenInitial=await read();
  check('initial hidden document does not consume automatic entry',hiddenInitial.growth===0&&hiddenInitial.events.length===0,hiddenInitial);
  await page.evaluate(()=>{window.__entryHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>window.__entryEvents.length===1);
  const firstForeground=await read();
  check('initial hidden document starts once when foregrounded',firstForeground.growth<.5&&firstForeground.events.join(',')==='true',firstForeground);
  await load('?ambient-off');
  await page.waitForFunction(()=>window.__entryEvents.length===1);
  const ambientOff=await read();
  check('saved background-motion off retains finite introduction',ambientOff.growth<.5&&ambientOff.events.join(',')==='true',ambientOff);
  await load('?no-webgl');
  await page.locator('[data-renderer="static-pearl-fallback"]').waitFor();
  const unavailable=await read();
  check('renderer failure suppresses automatic play and retains usable foreground',unavailable.growth===1&&unavailable.events.length===0&&unavailable.status==='unavailable'&&await page.locator('.foreground').isVisible(),unavailable);
  await load('?manual');
  await page.waitForTimeout(160);
  const defaultStage=await read();
  check('omitting autoPlay preserves complete manual-only default',defaultStage.growth===1&&defaultStage.events.length===0,defaultStage);
  await page.evaluate(()=>window.__entryQA.replay());
  await page.waitForTimeout(100);
  const defaultReplay=await read();
  check('manual-only consumer still replays on demand',defaultReplay.growth<.5&&defaultReplay.events.join(',')==='true',defaultReplay);
  await load('?slow-frames');
  await page.waitForFunction(()=>document.querySelector('.stage').dataset.visible==='true');
  await page.evaluate(()=>window.__entryStep(16));
  const slowStart=await read();
  check('automatic first rendered frame retains the mother form',slowStart.growth===0&&slowStart.events.join(',')==='true',slowStart);
  await page.evaluate(()=>window.__entryStep(1000));
  const slowOne=await read();
  await page.evaluate(()=>window.__entryStep(1000));
  const slowTwo=await read();
  await page.evaluate(()=>window.__entryStep(1000));
  const slowComplete=await read();
  check('three 1000ms active frames finish budding despite capped 34ms physics delta',Math.abs(slowOne.growth-1/3)<.001&&Math.abs(slowTwo.growth-2/3)<.001&&slowComplete.growth===1&&slowComplete.events.join(',')==='true,false',{slowOne,slowTwo,slowComplete});
  await page.evaluate(()=>{window.__entryQA.replay();window.__entryStep(17);window.__entryStep(1000);window.__entryStep(1000);window.__entryStep(1000);});
  const slowReplay=await read();
  check('manual replay also uses three seconds of real active time',slowReplay.growth===1&&slowReplay.events.join(',')==='true,false,true,false',slowReplay);
  await page.unroute('**/__entry-autoplay-qa*');
  const result={status:failures.length?'failed':'passed',checks,failures,visibilityCoverage:'document.hidden lifecycle simulated; native IntersectionObserver and WebGL rendered in Edge Chromium; no physical-device claim'};
  if(failures.length)throw new Error(JSON.stringify(result));
  return result;
}
