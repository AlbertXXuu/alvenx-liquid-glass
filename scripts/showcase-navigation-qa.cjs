// Playwright CLI callback. Own contexts only; run against an existing candidate.
// Desktop engines and touch emulation are not physical iOS/Combo Touch evidence.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),base=page.url().split(/[?#]/)[0];
 const output='output/playwright/entry-first-demo-2026-10-21/';
 const result={engine,version:browser.version(),base,physicalDevice:false,checks:[],failures:[],errors:[],notes:[]};
 const assert=(ok,name,detail)=>{(ok?result.checks:result.failures).push({name,...(detail===undefined?{}:{detail})});};
 const context=await browser.newContext({viewport:{width:393,height:852},locale:'ja-JP',hasTouch:true,...(engine==='webkit'?{reducedMotion:'reduce'}:{})});
 if(engine==='webkit')result.notes.push('Windows WebKit normal-motion fresh-page growth wait timed out before any assertions in the initial run. This follow-up tests native navigation and localization with reduced motion; it does not certify volume rendering, autoplay or physical Safari.');
 const p=await context.newPage();p.setDefaultTimeout(12000);p.on('pageerror',error=>result.errors.push(error.message));
 const expanded=()=>p.locator('.ax-menu-toggle').getAttribute('aria-expanded');
 const menu=()=>p.locator('.ax-menu-toggle');
 const screenshot=async name=>{try{await p.screenshot({path:output+name,scale:'css',timeout:10000});}catch(error){if(engine!=='webkit')throw error;result.notes.push('Windows WebKit screenshot limitation: '+String(error).split('\n')[0]);}};
 const ensureMenu=async()=>{if(await expanded()!=='true')await menu().click();};
 const changeLanguage=async next=>{
  await ensureMenu();await p.locator('.lab-language__toggle').click();
  await p.getByRole('button',{name:next==='en'?'English':'简体中文',exact:true}).click();
  await p.waitForFunction(locale=>document.documentElement.lang===locale,next);
  await p.keyboard.press('Escape');
 };
 try{
  await p.goto(base);await p.bringToFront();await p.waitForFunction(()=>document.querySelector('.stage')?.dataset.growth==='1.0000');
  assert(await p.evaluate(()=>navigator.language)==='ja-JP','non-English browser locale fixture');
  assert(await p.locator('html').getAttribute('lang')==='en','first visit remains English for Japanese browser locale');
  assert(!/[\u4e00-\u9fff]/u.test(await p.locator('body').innerText()),'English default has no authored Chinese');
  const closed=await menu().evaluate(button=>{
   const r=e=>e.getBoundingClientRect(),b=r(button),icon=r(button.querySelector('.ax-menu-icon'));
   return{button:{width:b.width,height:b.height},icon:{width:icon.width,height:icon.height,dx:(icon.left+icon.width/2)-(b.left+b.width/2),dy:(icon.top+icon.height/2)-(b.top+b.height/2)},bodyTransition:getComputedStyle(button).transitionDuration,bars:Array.from(button.querySelectorAll('.ax-menu-icon>span'),span=>({width:r(span).width,height:r(span).height,transform:getComputedStyle(span).transform,duration:getComputedStyle(span).transitionDuration}))};
  });
  assert(closed.button.width>=44&&closed.button.height>=44,'minimum44px native menu button',closed);
  assert(Math.abs(closed.icon.dx)<.6&&Math.abs(closed.icon.dy)<.6,'menu icon centered inside target',closed.icon);
  assert(closed.bars.length===2&&closed.bars.every(bar=>Math.abs(bar.width-20)<.1&&Math.abs(bar.height-2)<.1),'canonical20x2 double bars',closed.bars);
  assert(engine==='webkit'?closed.bars.every(bar=>bar.duration==='0s')&&closed.bodyTransition==='0s':closed.bars.every(bar=>bar.duration==='0.24s')&&closed.bodyTransition==='0.32s, 0.32s',engine==='webkit'?'system reduced motion removes transitions':'canonical240ms/320ms transitions',closed);
  await menu().focus();await p.keyboard.press('Enter');assert(await expanded()==='true','Enter opens menu');
  await p.keyboard.press('Escape');assert(await expanded()==='false','Escape closes menu');
  assert(await menu().evaluate(el=>el===document.activeElement),'Escape restores menu trigger focus');
  await p.keyboard.press('Space');assert(await expanded()==='true','Space opens menu');
  await p.locator('#showcase-navigation>a').focus();
  if(engine==='webkit'){
   result.notes.push('Windows WebKit default native Tab preference may omit links; focus-leave is checked directly as well.');
  }
  await p.keyboard.press('Tab');
  if(engine==='webkit'&&await expanded()==='true'){
   result.notes.push('Windows WebKit native Tab from an explicitly focused link did not produce a focus target outside navigation. No native Tab pass is claimed.');
   await p.locator('#number-r3-sample').focus();assert(await expanded()==='false','known external focus target closes navigation');
  }else assert(await expanded()==='false','Tab leaving navigation closes it');
  await ensureMenu();
  await p.locator('#showcase-navigation>a').evaluate(anchor=>anchor.addEventListener('click',event=>event.preventDefault(),{once:true}));
  await p.locator('#showcase-navigation>a').click();assert(await expanded()==='false','native anchor activation closes menu');
  await ensureMenu();await p.mouse.click(5,600);assert(await expanded()==='false','outside pointer closes menu');
  await ensureMenu();const language=p.locator('.lab-language__toggle');await language.focus();await p.keyboard.press('ArrowDown');
  assert(await language.getAttribute('aria-expanded')==='true','ArrowDown opens language disclosure');
  assert(await p.getByRole('button',{name:'English',exact:true}).evaluate(e=>e===document.activeElement),'ArrowDown focuses English option');
  await p.keyboard.press('ArrowDown');assert(await p.getByRole('button',{name:'简体中文',exact:true}).evaluate(e=>e===document.activeElement),'ArrowDown moves to Chinese option');
  await p.keyboard.press('Home');assert(await p.getByRole('button',{name:'English',exact:true}).evaluate(e=>e===document.activeElement),'Home moves to English option');
  await p.keyboard.press('End');assert(await p.getByRole('button',{name:'简体中文',exact:true}).evaluate(e=>e===document.activeElement),'End moves to Chinese option');
  await p.keyboard.press('Escape');assert(await language.getAttribute('aria-expanded')==='false','Escape closes language disclosure');
  assert(await language.evaluate(e=>e===document.activeElement),'language Escape restores its own trigger');
  assert(await expanded()==='true','nested language Escape does not close main navigation');
  await language.click();await p.locator('header [data-alvenx-home]').click();assert(await language.getAttribute('aria-expanded')==='false','outside language pointer closes language');
  await p.keyboard.press('Escape');
  await p.getByRole('button',{name:/Surface parameters/}).click();
  const material=p.locator('#number-interactionStrength');await material.fill('3.2');await material.press('Enter');
  const progress=p.locator('#number-r3-sample');await progress.fill('67');await progress.press('Enter');
  await p.getByRole('textbox',{name:'Sample text',exact:true}).fill('Keep my sample');
  await p.waitForFunction(()=>document.querySelector('.lab-optical-scene text')?.textContent==='Keep my sample');
  await p.getByRole('textbox',{name:'Preview message',exact:true}).fill('Keep my draft');
  const sourceBefore=await p.locator('.lab-optical-scene text').first().textContent();
  await p.evaluate(()=>{window.__navigationGrowthResets=[];const stage=document.querySelector('.stage');new MutationObserver(()=>{if(Number(stage.dataset.growth)<1&&window.__navigationGrowthResets.length<10)window.__navigationGrowthResets.push(stage.dataset.growth);}).observe(stage,{attributes:true,attributeFilter:['data-growth','data-entry-playback']});});
  await changeLanguage('zh-CN');
  const fonts=await p.evaluate(()=>{
   const heading=document.querySelector('h1'),eyebrow=document.querySelector('.lab-intro .eyebrow');
   return{lang:document.documentElement.lang,heading:getComputedStyle(heading).fontFamily,headingWeight:getComputedStyle(heading).fontWeight,eyebrowWeight:getComputedStyle(eyebrow).fontWeight,headingReady:document.fonts.check('500 40px "MiSans"',heading.textContent),eyebrowReady:document.fonts.check('500 16px "MiSans"',eyebrow.textContent),loaded500:[...document.fonts].filter(face=>face.family.replaceAll('"','')==='MiSans'&&face.weight==='500'&&face.status==='loaded').length};
  });
  assert(fonts.lang==='zh-CN'&&fonts.heading.includes('MiSans')&&fonts.headingWeight==='500','Chinese heading selects native MiSans500',fonts);
  assert(fonts.eyebrowWeight==='500'&&fonts.headingReady&&fonts.eyebrowReady&&fonts.loaded500>0,'published Chinese heading/eyebrow weight already loaded',fonts);
  assert(await material.inputValue()==='3.2','material parameter survives Chinese switch');
  assert(await progress.inputValue()==='67','progress value survives Chinese switch');
  assert(await p.locator('.source-editor input').inputValue()==='Keep my sample','sample draft survives Chinese switch');
  assert(await p.locator('.lab-optical-scene text').first().textContent()===sourceBefore,'sample display survives Chinese switch');
  assert(await p.locator('.lab-message input').inputValue()==='Keep my draft','message draft survives Chinese switch');
  assert(await p.locator('.lab-optical-scene text').nth(1).textContent()==='光与形','static SVG caption translated');
  assert((await p.locator('.foreground h3').innerText()).includes('生长'),'volume static continuation translated');
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await screenshot(`navigation-${engine}-zh.png`);
  await changeLanguage('en');
  assert(await material.inputValue()==='3.2'&&await progress.inputValue()==='67','numeric values survive round trip');
  assert(await p.locator('.lab-message input').inputValue()==='Keep my draft','message draft survives round trip');
  assert((await p.evaluate(()=>window.__navigationGrowthResets)).length===0,engine==='webkit'?'language changes retain full form under reduced motion':'language changes do not restart budding');
  // Cross-tab storage is the real preference mechanism. Changing it in another
  // owned page preserves focus/draft in the first page, unlike clicking header UI.
  const other=await context.newPage();await other.goto(base);await other.evaluate(()=>localStorage.setItem('alvenx-showcase-language-v1','zh-CN'));
  await p.waitForFunction(()=>document.documentElement.lang==='zh-CN');await p.bringToFront();
  await progress.focus();await progress.fill('71.4');
  await other.evaluate(()=>localStorage.setItem('alvenx-showcase-language-v1','en'));
  await p.waitForFunction(()=>document.documentElement.lang==='en');
  assert(await progress.inputValue()==='71.4','in-progress numeric draft preserved across storage language switch');
  assert(await progress.evaluate(e=>e===document.activeElement),'language update preserves focused numeric editor');
  await progress.press('Enter');assert(await progress.inputValue()==='71','numeric draft still commits with configured precision');
  await other.close();await changeLanguage('zh-CN');await p.reload();await p.waitForFunction(()=>document.documentElement.lang==='zh-CN');
  assert(await p.evaluate(()=>localStorage.getItem('alvenx-showcase-language-v1'))==='zh-CN','explicit Chinese selection persists on reload');
  assert(await p.locator('#number-interactionStrength').count()===0,'parameter disclosure has fresh page state');
  await p.locator('#r3-parameters').count();
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await screenshot(`navigation-${engine}-persisted.png`);
  assert(result.errors.length===0,'no page exceptions',result.errors);
 }catch(error){result.failures.push({name:'suite completion',detail:String(error)});}
 finally{await context.close();}
 result.status=result.failures.length?'failed':'passed';return result;
}
