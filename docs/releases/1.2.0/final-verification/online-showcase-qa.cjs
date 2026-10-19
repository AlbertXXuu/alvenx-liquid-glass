// Run with Playwright CLI after the production deployment has been confirmed.
async page=>{
 const browser=page.context().browser(),engine=browser.browserType().name(),out='output/playwright/ui-production-2026-10-19/';
 const expectedCommit='9539291f27b39b596d1a92f52fc7462f7f76ad1f';
 const result={engine,version:browser.version(),url:'https://alvenx.com/ui/',sourceCommit:expectedCommit,physicalDevice:false,checks:[],cases:[]};
 const assert=(value,label,detail)=>{if(!value)throw Error(label+' '+JSON.stringify(detail));result.checks.push(label);};
 for(const [width,height] of [[393,852],[1180,820]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1}),p=await context.newPage(),errors=[],failed=[],httpErrors=[],consoleErrors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));p.on('response',r=>{if(r.status()>=400)httpErrors.push({status:r.status(),url:r.url()});});p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await p.addInitScript(()=>{window.__onlineCsp=[];document.addEventListener('securitypolicyviolation',e=>window.__onlineCsp.push({directive:e.violatedDirective,blocked:e.blockedURI}));});
  try{
   const response=await p.goto(result.url);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(350);
   const head=await p.evaluate(()=>({title:document.title,commit:document.querySelector('meta[name="alvenx-source-commit"]')?.content,version:document.querySelector('meta[name="alvenx-kit-version"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,robots:document.querySelector('meta[name="robots"]')?.content||'',assets:[...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e=>e.src||e.href)}));
   assert(response.status()===200&&head.commit===expectedCommit&&head.version==='1.2.0','published source provenance '+width,head);
   assert(head.title==='AlvenX Liquid Glass — Glass that follows your hand.'&&head.canonical===result.url&&!/noindex/i.test(head.robots+(response.headers()['x-robots-tag']||'')),'production title canonical and indexability '+width,head);
   const firstPartyAssets=head.assets.filter(url=>url.startsWith('https://alvenx.com/'));assert(firstPartyAssets.length>=2&&firstPartyAssets.every(url=>url.includes('/ui/releases/1.2.0/')),'versioned first-party production assets '+width,head.assets);
   const visual=await p.evaluate(()=>{const h=document.querySelector('h1'),header=document.querySelector('.ax-product-header');return{width:innerWidth,documentWidth:document.documentElement.scrollWidth,heroGradient:getComputedStyle(h).backgroundImage,heroColor:getComputedStyle(h).color,heroRect:h.getBoundingClientRect().toJSON(),background:getComputedStyle(document.querySelector('.lab')).backgroundImage,headerTop:header.getBoundingClientRect().top,headerHeight:header.getBoundingClientRect().height,wordmark:header.querySelector('img').getBoundingClientRect().width};});
   assert(visual.documentWidth<=width&&visual.headerTop===14&&visual.headerHeight>=70&&visual.wordmark===160,'published responsive header and overflow '+width,visual);
   assert(visual.heroGradient.includes('linear-gradient')&&visual.heroColor==='rgba(0, 0, 0, 0)'&&visual.heroRect.right<=width&&visual.background.includes('radial-gradient'),'published gradient and varied canvas '+width,visual);
   const number=p.getByRole('spinbutton',{name:'Progress value',exact:true}),slider=p.getByRole('slider',{name:'Progress',exact:true});
   assert(await number.inputValue()==='50'&&(await slider.getAttribute('aria-valuetext')).replace(/\s/g,'')==='50%','published initial 50 percent '+width);
   const tapColors=await p.locator('.lab button,.lab input,.lab a').evaluateAll(els=>els.map(el=>getComputedStyle(el).getPropertyValue('-webkit-tap-highlight-color')));
   if(engine==='chromium')assert(tapColors.length>15&&tapColors.every(c=>c==='rgba(0, 0, 0, 0)'),'published transparent scoped tap color '+width,tapColors);
   await p.screenshot({path:out+`online-${engine}-${width}-hero.png`,scale:'css'});
   if(width<600){const menu=p.getByRole('button',{name:'Navigation menu'});await menu.click();assert(await menu.getAttribute('aria-expanded')==='true','published mobile menu opens');await p.keyboard.press('Escape');assert(await menu.getAttribute('aria-expanded')==='false','published menu Escape closes');}
   await p.locator('.stage-scroll').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(250);
   const volume=await p.locator('.stage-scroll').evaluate(e=>{const s=e.querySelector('.stage');return{layout:e.dataset.layout,width:s.clientWidth,height:s.clientHeight,overflow:e.scrollWidth>e.clientWidth+1,error:s.querySelector('canvas').dataset.error||null};});
   assert(volume.width>volume.height&&!volume.overflow&&!volume.error,'published horizontal form '+width,volume);
   await p.locator('.stage-scroll').screenshot({path:out+`online-${engine}-${width}-volume.png`,scale:'css'});
   let nativeTouch=null;
   if(engine==='chromium'){
    const cdp=await context.newCDPSession(p),read=()=>p.locator('.stage').evaluate(e=>({scrollY,surface:JSON.parse(e.dataset.surface)}));
    const point=(x,y)=>p.locator('.stage').evaluate((e,q)=>{const r=e.getBoundingClientRect(),s=Math.min(r.width/1000,r.height/560);return{x:r.x+r.width/2+(q.x-500)*s,y:r.y+r.height/2+(q.y-280)*s};},{x,y});
    const touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:q?[{id:1,x:q.x,y:q.y,radiusX:2,radiusY:2,force:.5}]:[]});
    const move=async(q,dy)=>{for(let i=1;i<=8;i++){await touch('touchMove',{x:q.x,y:q.y+dy*i/8});await p.waitForTimeout(12);}await p.waitForTimeout(80);};
    const inside=await point(230,280),before=await read();await touch('touchStart',inside);await move(inside,-65);const held=await read();await touch('touchEnd');await p.waitForTimeout(800);
    assert(Math.abs(held.scrollY-before.scrollY)<=1&&held.surface.deformDY<-8,'published shape touch owns gesture '+width,{before,held});
    const outside=await point(20,280),outsideBefore=await read();await touch('touchStart',outside);await move(outside,-90);const panned=await read();await touch('touchEnd');await p.waitForTimeout(160);
    assert(panned.scrollY>outsideBefore.scrollY+35&&panned.surface.deformDY===0,'published background touch scrolls '+width,{outsideBefore,panned});nativeTouch={before,held,outsideBefore,panned};
   }
   await p.locator('#refraction').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(220);
   await p.screenshot({path:out+`online-${engine}-${width}-components.png`,scale:'css'});
   await slider.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(120);const range=await slider.boundingBox();await p.mouse.click(range.x+range.width*.34,range.y+range.height/2);await p.waitForTimeout(100);const tapped=Number(await slider.inputValue());assert(tapped>20&&tapped<45,'published range click '+width,tapped);
   await p.mouse.move(range.x+range.width*.34,range.y+range.height/2);await p.mouse.down();await p.mouse.move(range.x+range.width*.78,range.y+range.height/2,{steps:10});await p.mouse.up();await p.waitForTimeout(100);assert(Number(await slider.inputValue())>65,'published range continuous drag '+width,await slider.inputValue());
   const toggle=p.getByRole('switch',{name:'Continuous switch',exact:true}),beforeToggle=await toggle.getAttribute('aria-checked');await toggle.tap();await p.waitForTimeout(100);assert(await toggle.getAttribute('aria-checked')!==beforeToggle,'published switch native tap '+width);
   await p.getByRole('textbox',{name:'Sample text',exact:true}).fill('光与形 AlvenX');await p.waitForTimeout(120);assert((await p.locator('.lab-optical-scene [data-controlled-source]').textContent()).includes('光与形 AlvenX'),'published shared optical source updates '+width);
   const message=p.getByRole('textbox',{name:'Preview message',exact:true});await message.fill('Clear thoughts. 清晰的文字。');await message.press('Enter');assert((await p.locator('.lab-message-feedback').textContent()).includes('Saved'),'published native message and Enter '+width);
   const review=await context.request.get('https://alvenx.com/ui/review-20261019-r3/'),reviewText=await review.text();assert(review.status()===200&&/name="robots"[^>]*noindex/.test(reviewText),'historical review remains noindex '+width,{status:review.status()});
   const csp=await p.evaluate(()=>window.__onlineCsp);assert(errors.length===0&&failed.length===0&&httpErrors.length===0&&consoleErrors.length===0&&csp.length===0,'no published page network script or CSP errors '+width,{errors,failed,httpErrors,consoleErrors,csp});
   result.cases.push({width,height,head,visual,volume,nativeTouch,tapColors:engine==='chromium'?{sampled:tapColors.length,allTransparent:true}:{supported:false},errors,failed,httpErrors,consoleErrors,csp});
  }finally{await context.close();}
 }
 return{...result,status:'passed'};
}
