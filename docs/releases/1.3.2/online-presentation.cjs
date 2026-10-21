// Playwright CLI callback for the compact first-view and bilingual navigation.
// Run against a built candidate or production; screenshots are desktop evidence.
async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),base=page.url().split(/[?#]/)[0];
 const out='output/playwright/entry-first-demo-online-2026-10-22/';
 const result={engine,version:browser.version(),base,physicalDevice:false,checks:[],layouts:[],errors:[]};
 const assert=(ok,name,detail)=>{if(!ok)throw Error(name+' '+JSON.stringify(detail));result.checks.push(name);};
 for(const [width,height] of [[320,740],[393,852],[768,1024],[820,1180],[1180,820],[1366,768],[1413,936]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<1200,isMobile:engine!=='firefox'&&width<600});
  const p=await context.newPage();p.on('pageerror',e=>result.errors.push({width,message:e.message}));
  try{
   await p.goto(base);await p.bringToFront();await p.evaluate(()=>document.fonts.ready);
   await p.waitForFunction(()=>document.querySelector('.stage')?.dataset.growth==='1.0000');
   const geometry=await p.evaluate(()=>{
    const r=e=>e.getBoundingClientRect().toJSON(),stage=document.querySelector('.stage'),intro=document.querySelector('.lab-intro'),h1=document.querySelector('h1'),header=document.querySelector('header');
    return{width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,stage:r(stage),intro:r(intro),h1:r(h1),header:r(header),titleGradient:getComputedStyle(h1).backgroundImage,bodyText:document.body.innerText,language:document.documentElement.lang,canvasError:stage.querySelector('canvas').dataset.error||null,stageLayout:stage.parentElement.dataset.layout};
   });
   assert(!geometry.bodyText.includes('Touch the pearl. Scroll around it.')&&!geometry.bodyText.includes('Hold. Pull. Let go.')&&!geometry.bodyText.includes('01 / A CONTINUOUS FORM'),'redundant opening removed '+width);
   assert(geometry.documentWidth<=width+1,'no overflow EN '+width,geometry.documentWidth);
   assert(!/[\u4e00-\u9fff]/u.test(geometry.bodyText),'default authored copy English '+width);
   assert(geometry.language==='en','default document English '+width,geometry.language);
   assert(geometry.h1.top>=geometry.header.bottom+12,'headline clears header '+width,geometry);
   assert(geometry.stage.top<height*.56,'demonstration visible immediately '+width,geometry.stage);
   assert(geometry.stage.width>geometry.stage.height&&!geometry.canvasError,'horizontal working volume '+width,geometry);
   assert(geometry.titleGradient.includes('linear-gradient'),'gradient title retained '+width);
   await p.screenshot({path:out+`entry-${engine}-${width}-en.png`,scale:'css'});
   const menu=p.getByRole('button',{name:'Navigation menu',exact:true});
   if(await menu.isVisible()){
    assert(await menu.locator('.ax-menu-icon>span').count()===2,'canonical two bars '+width);
    await menu.click();assert(await menu.getAttribute('aria-expanded')==='true','menu opens '+width);
    await p.screenshot({path:out+`entry-${engine}-${width}-menu.png`,scale:'css'});
   }
   await p.getByRole('button',{name:'Choose language',exact:true}).click();
   await p.getByRole('button',{name:'简体中文',exact:true}).click();
   await p.waitForFunction(()=>document.documentElement.lang==='zh-CN');
   if(width<=900)await p.keyboard.press('Escape');
   await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.evaluate(()=>document.fonts.ready);
   const zh=await p.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1').textContent,stage:document.querySelector('.stage').getBoundingClientRect().toJSON(),font:getComputedStyle(document.querySelector('h1')).fontFamily,spacing:getComputedStyle(document.querySelector('h1')).letterSpacing}));
   assert(zh.documentWidth<=width+1,'no overflow ZH '+width,zh);
   assert(/[\u4e00-\u9fff]/u.test(zh.heading)&&zh.font.includes('MiSans'),'Chinese heading and native face '+width,zh);
   assert(zh.stage.top<height*.56,'Chinese demonstration visible immediately '+width,zh);
   assert(Number(await p.getByRole('spinbutton',{name:/进度.*数值/}).inputValue())===50,'language preserves progress '+width);
   await p.screenshot({path:out+`entry-${engine}-${width}-zh.png`,scale:'css'});
   await p.locator('#language').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
   await p.screenshot({path:out+`entry-${engine}-${width}-zh-type.png`,scale:'css'});
   await p.reload();await p.waitForFunction(()=>document.documentElement.lang==='zh-CN');
   assert(true,'explicit language persists '+width);
   result.layouts.push({width,height,english:{...geometry,bodyText:undefined},chinese:zh});
  }finally{await context.close();}
 }
 assert(result.errors.length===0,'no page errors',result.errors);
 return result;
}
