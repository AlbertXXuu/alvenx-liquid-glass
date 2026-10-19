// Playwright CLI callback. Run only after the 1.2.2 deployment is ready.
// Fresh desktop contexts verify the deployed artifact, not physical iOS or OS IME.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),home='https://alvenx.com/',origin='https://alvenx.com';
 const expectedSource='92a4c1bd62c5f06ef345dc435e301c5aee4607fd',out='output/playwright/ui-1.2.2-2026-10-19/';
 const report={engine,version:browser.version(),physicalDevice:false,expectedVersion:'1.2.2',expectedSource,checks:[],layouts:[],console:[],requestsFailed:[],httpErrors:[],pageErrors:[]};
 const check=(ok,name,detail)=>{if(!ok)throw Error(name+' '+JSON.stringify(detail));report.checks.push(name);};
 const firstParty=url=>url===origin||url.startsWith(origin+'/');
 const analytics=text=>/cloudflareinsights|cloudflareanalytics|static\.cloudflareinsights\.com|cdn-cgi\/rum/i.test(text);
 const geometry=p=>p.evaluate(()=>{
  const group=document.querySelector('.lab-material-workbench'),preview=group.querySelector('.lab-material-preview'),heading=group.querySelector('.foreground h3'),caption=group.querySelector('.volume-caption'),r=preview.getBoundingClientRect();
  return {rect:r.toJSON(),documentTop:r.top+scrollY,scrollY,position:getComputedStyle(preview).position,canvas:group.querySelectorAll('canvas').length,stage:group.querySelector('.stage').getBoundingClientRect().toJSON(),headingFont:getComputedStyle(heading).font,captionFont:getComputedStyle(caption).font,captionDisplay:getComputedStyle(caption).display,overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 for(const [width,height] of [[393,852],[1180,820]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1,locale:'en-US'}),p=await context.newPage();let phase='homepage';const formRequests=[];
  p.on('pageerror',error=>report.pageErrors.push({width,phase,message:error.message}));
  p.on('console',message=>{const text=message.text(),type=message.type();if(type==='warning'||type==='error'||/preload|Content.Security.Policy|CSP/i.test(text))report.console.push({width,phase,type,text,location:message.location(),analytics:analytics(text+message.location().url)});});
  p.on('requestfailed',request=>report.requestsFailed.push({width,phase,url:request.url(),type:request.resourceType(),error:request.failure()?.errorText,firstParty:firstParty(request.url()),analytics:analytics(request.url())}));
  p.on('response',response=>{if(response.status()>=400)report.httpErrors.push({width,phase,url:response.url(),status:response.status(),firstParty:firstParty(response.url()),analytics:analytics(response.url())});});
  p.on('request',request=>{if(phase==='message'&&firstParty(request.url())&&['xhr','fetch'].includes(request.resourceType()))formRequests.push({url:request.url(),type:request.resourceType()});});
  try{
   await p.addInitScript(()=>localStorage.setItem('alvenx-design-showcase-v1',JSON.stringify({ambient:false,reducedMotion:false})));
   const response=await p.goto(home);check(response.status()===200,'homepage HTTP200 '+width,response.status());await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(3500);
   const sphere=p.getByRole('button',{name:'Explore Liquid Glass',exact:true});await sphere.waitFor();await sphere.scrollIntoViewIfNeeded();
   const initial=await p.locator('.hero__actions').evaluate(e=>{
    const rect=n=>n.getBoundingClientRect().toJSON(),entry=e.querySelector('.ui-entry'),sphere=entry.querySelector('.ui-entry__sphere'),r=sphere.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),children=Array.from(e.children).map(n=>n.matches('.ui-entry')?'sphere':n.matches('a[href="#work"]')?'work':n.matches('a[href*="github.com"]')?'github':'other');
    return {order:children,sphere:rect(sphere),text:sphere.textContent.trim(),hitInside:!!hit?.closest('.ui-entry__sphere'),work:rect(e.querySelector('a[href="#work"]')),github:rect(e.querySelector('a[href*="github.com"]')),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   check(initial.order.join(',')==='work,sphere,github','homepage accepted CTA order '+width,initial.order);
   check(initial.text===''&&Math.abs(initial.sphere.width-initial.sphere.height)<1&&initial.sphere.width>=44&&initial.sphere.width<=66,'initial sphere visibly textless and compact '+width,initial);
   check(initial.hitInside&&!initial.overflow&&initial.sphere.x>=0&&initial.sphere.right<=width,'sphere is unobscured and page fits '+width,initial);
   const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   check(!overlaps(initial.sphere,initial.work)&&!overlaps(initial.sphere,initial.github),'sphere does not cover other hero actions '+width,initial);
   check(await p.getByRole('link',{name:'explore me!',exact:true}).count()===0,'invitation absent until interaction '+width);
   if(engine==='chromium')await p.locator('.hero').screenshot({path:out+`online-${engine}-${width}-home-initial.png`,scale:'css'});
   await sphere.tap();await p.getByRole('link',{name:'explore me!',exact:true}).waitFor();await p.waitForTimeout(500);
   check(p.url()===home,'first touch reveals without navigation '+width,p.url());
   const invitation=p.getByRole('link',{name:'explore me!',exact:true});await invitation.scrollIntoViewIfNeeded();
   const revealed=await invitation.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {tag:e.tagName,href:e.getAttribute('href'),rect:r.toJSON(),hitInside:hit===e||e.contains(hit),expanded:document.querySelector('.ui-entry__sphere .glass-hit')?.getAttribute('aria-expanded')};});
   check(revealed.tag==='A'&&revealed.href==='/ui/'&&revealed.hitInside&&revealed.rect.x>=0&&revealed.rect.right<=width,'revealed invitation is visible native link '+width,revealed);
   if(engine==='chromium')await p.locator('.hero').screenshot({path:out+`online-${engine}-${width}-home-revealed.png`,scale:'css'});
   phase='ui';await Promise.all([p.waitForURL(home+'ui/'),invitation.click()]);await p.evaluate(()=>document.fonts.ready);
   check(p.url()===home+'ui/','second native-link action reaches production UI '+width,p.url());
   const provenance=await p.evaluate(()=>({version:document.querySelector('meta[name="alvenx-kit-version"]')?.content,source:document.querySelector('meta[name="alvenx-source-commit"]')?.content,modules:Array.from(document.querySelectorAll('script[type="module"][src]')).map(e=>e.src),styles:Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(e=>e.href),canonical:document.querySelector('link[rel="canonical"]')?.href}));
   check(provenance.version==='1.2.2'&&provenance.source===expectedSource,'live UI provenance matches frozen source '+width,provenance);
   const firstPartyModules=provenance.modules.filter(firstParty),firstPartyStyles=provenance.styles.filter(firstParty);
   check(provenance.canonical===home+'ui/'&&firstPartyModules.length===1&&firstPartyStyles.length>=1&&[...firstPartyModules,...firstPartyStyles].every(url=>url.startsWith(origin+'/ui/releases/1.2.2/'))&&provenance.modules.filter(url=>!firstParty(url)).every(analytics),'first-party main JS/CSS use immutable 1.2.2 namespace '+width,provenance);
   await p.locator('#volume').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(120);const collapsed=await geometry(p);
   if(engine==='chromium')await p.screenshot({path:out+`online-${engine}-${width}-volume.png`,scale:'css'});
   await p.getByRole('button',{name:'Surface parameters',exact:false}).click();const expanded=await geometry(p);
   check(['static','relative'].includes(expanded.position)&&expanded.canvas===1&&expanded.stage.width>expanded.stage.height&&!expanded.overflow,'production keeps one horizontal natural-flow preview '+width,expanded);
   check(Math.abs(collapsed.rect.width-expanded.rect.width)<1&&Math.abs(collapsed.rect.height-expanded.rect.height)<1&&Math.abs(collapsed.documentTop-expanded.documentTop)<1&&collapsed.headingFont===expanded.headingFont&&collapsed.captionFont===expanded.captionFont&&collapsed.captionDisplay===expanded.captionDisplay,'production disclosure preserves size and typography '+width,{collapsed,expanded});
   check(await p.locator('#volume .lab-parameter-grid .parameter-row').count()===7,'production parameters adjacent in same volume section '+width);
   await p.evaluate(()=>{const r=document.querySelector('.lab-material-preview').getBoundingClientRect();scrollBy({top:r.bottom+20,behavior:'instant'});});const passed=await geometry(p);
   check(passed.rect.bottom<0&&Math.abs(passed.rect.top-expanded.rect.top+passed.scrollY-expanded.scrollY)<1,'preview scrolls away by document distance '+width,{expanded,passed});
   const sample=p.getByRole('textbox',{name:'Sample text',exact:true}),source=p.locator('.lab-optical-scene [data-controlled-source] text').first();await sample.fill('中文光与形');
   await p.waitForFunction(()=>document.querySelector('.lab-optical-scene [data-controlled-source] text')?.textContent==='中文光与形');
   const typography=await source.evaluate(e=>({family:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight,width:e.getBBox().width,fontReady:document.fonts.check('600 40px "MiSans"','中文光与形')}));await p.waitForTimeout(200);const stableWidth=await source.evaluate(e=>e.getBBox().width);
   check(await sample.inputValue()==='中文光与形'&&typography.fontReady&&typography.family.includes('MiSans')&&typography.weight==='600'&&Math.abs(stableWidth-typography.width)<.1,'Chinese specimen settles with exact font and stable width '+width,{typography,stableWidth});
   phase='message';const message=p.getByRole('textbox',{name:'Preview message',exact:true}),send=p.getByRole('button',{name:'Send preview message',exact:true}),feedback=p.locator('.lab-message-feedback');
   await message.fill('Hello');await send.click();check(await feedback.textContent()==='Good question… but I don’t understand.','ordinary production Easter egg '+width);
   if(engine==='chromium')await p.locator('#fields').screenshot({path:out+`online-${engine}-${width}-message-ordinary.png`,scale:'css'});
   await message.fill('fluency');await message.press('Enter');check(await feedback.textContent()==='<3'&&await feedback.locator('*').count()===0,'secret production output is literal heart '+width);
   if(engine==='chromium')await p.locator('#fields').screenshot({path:out+`online-${engine}-${width}-message-heart.png`,scale:'css'});
   await message.fill('');await send.click();check(await feedback.textContent()==='Write a message before sending.','production empty validation retained '+width);
   check(formRequests.length===0,'message responses remain local without first-party API requests '+width,formRequests);
   report.layouts.push({width,height,initial,revealed,provenance,collapsed,expanded,passed,typography});
   // Retain preload/CSP/network diagnostics from the entire visit, including homepage.
   await p.waitForTimeout(300);phase='closing';
  }finally{await context.close();}
 }
 const firstPartyFailures=report.requestsFailed.filter(e=>e.firstParty&&!e.analytics&&!/abort|cancel/i.test(e.error??''));
 const firstPartyHttpErrors=report.httpErrors.filter(e=>e.firstParty&&!e.analytics);
 const consoleErrors=report.console.filter(e=>e.type==='error'&&!e.analytics);
 check(report.pageErrors.length===0,'no uncaught production page errors',report.pageErrors);
 check(firstPartyFailures.length===0&&firstPartyHttpErrors.length===0,'no first-party failed requests or HTTP errors',{firstPartyFailures,firstPartyHttpErrors});
 check(consoleErrors.length===0,'no non-analytics production console/CSP errors',consoleErrors);
 report.limitations=['Fresh desktop Chromium and Windows WebKit contexts do not certify physical iPhone/iPad, OS IME or Combo Touch. Windows WebKit canvas capture/resize and native Tab defaults retain their known limitations. All console preload/CSP warnings and failed requests are recorded for inspection; third-party Cloudflare analytics is identified separately rather than silently dropped.'];
 return report;
}
