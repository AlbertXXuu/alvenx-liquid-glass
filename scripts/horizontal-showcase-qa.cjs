// Playwright CLI callback. Run from the repository/workspace; screenshots are
// local evidence, never a substitute for owner acceptance or physical Safari.
async page => {
 const browser=page.context().browser(),base=await page.evaluate(()=>new URL('.',location.href).href),root='output/playwright/horizontal-review-2026-10-19/';
 const result={engine:browser.version(),physicalDevice:false,cases:[],errors:[]};
 for(const width of [320,360,393,430,640,768,820,1024,1366]){
  const context=await browser.newContext({viewport:{width,height:width<600?852:1024},deviceScaleFactor:1,hasTouch:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'});
  const p=await context.newPage();p.on('pageerror',e=>result.errors.push({width,message:e.message}));
  try{
   await p.goto(base);await p.evaluate(()=>document.fonts.ready);
   await p.getByRole('button',{name:'Explore the material',exact:true}).click();await p.waitForTimeout(800);
   await p.screenshot({path:root+browser.browserType().name()+'-'+width+'-anchor.png',scale:'css'});
   await p.locator('.stage-scroll').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(250);
   await p.waitForFunction(()=>document.querySelector('[data-local-glass="idea"]')?.getAttribute('data-optical-ready')==='true');
   const geometry=await p.evaluate(()=>{
    const frame=document.querySelector('.stage-scroll'),stage=frame.querySelector('.stage'),idea=frame.querySelector('.idea'),input=frame.querySelector('input[aria-label="Preview message"]');
    const style=getComputedStyle(input),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const texts=[...idea.querySelectorAll('strong,small')].flatMap(e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].map(b=>({left:b.left-idea.getBoundingClientRect().left,right:b.right-idea.getBoundingClientRect().left,top:b.top-idea.getBoundingClientRect().top,bottom:b.bottom-idea.getBoundingClientRect().top}));});
    return{layout:frame.dataset.layout,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,internalOverflow:frame.scrollWidth>frame.clientWidth+1,stage:stage.getBoundingClientRect().toJSON(),placeholderWidth:ctx.measureText(input.placeholder).width,inputWidth:input.clientWidth,inputFont:style.fontSize,cardHeight:idea.clientHeight,cardWidth:idea.clientWidth,texts,canvasError:stage.querySelector('canvas').dataset.error||null};
   });
   if(geometry.internalOverflow||geometry.documentWidth>width+1||geometry.canvasError||geometry.placeholderWidth>geometry.inputWidth+1||geometry.texts.some(r=>r.left<6||r.right>geometry.cardWidth-6||r.top<4||r.bottom>geometry.cardHeight-4))throw Error('Visual geometry failed '+width+': '+JSON.stringify(geometry));
   await p.locator('.stage-scroll').screenshot({path:root+browser.browserType().name()+'-'+width+'-normal.png',scale:'css'});
   if([320,393,768,1366].includes(width)){
    const card=p.locator('[data-local-glass="idea"]'),button=card.locator('button'),r=await button.boundingBox();
    await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.waitForTimeout(180);
    await p.mouse.down();await p.waitForTimeout(220);await p.locator('.stage-scroll').screenshot({path:root+browser.browserType().name()+'-'+width+'-pressed.png',scale:'css'});await p.mouse.up();
    const input=p.getByRole('textbox',{name:'Preview message',exact:true});await input.focus();await p.waitForTimeout(160);await p.locator('.stage-scroll').screenshot({path:root+browser.browserType().name()+'-'+width+'-focus.png',scale:'css'});
    await input.fill('A longer idea, with native text. 给想法一个慢慢生长的空间。');await input.press('Enter');await p.waitForTimeout(120);
    if(await p.locator('#preview-feedback').textContent()!=='Saved in this preview.')throw Error('Long message did not submit');
    await p.locator('.stage-scroll').screenshot({path:root+browser.browserType().name()+'-'+width+'-message.png',scale:'css'});
   }
   if([320,768,1366].includes(width)){
    const parameters=p.locator('.parameters');await parameters.evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-115,behavior:'instant'}));await p.waitForTimeout(200);
    await p.screenshot({path:root+browser.browserType().name()+'-'+width+'-parameters.png',scale:'css'});
    await p.locator('.lens-study').evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-115,behavior:'instant'}));await p.waitForTimeout(200);await p.screenshot({path:root+browser.browserType().name()+'-'+width+'-components.png',scale:'css'});
   }
   result.cases.push({width,passed:true,geometry});
  }finally{await context.close();}
 }
 if(result.errors.length)throw Error(JSON.stringify(result.errors));return result;
}
