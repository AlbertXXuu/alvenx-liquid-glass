async page => {
 const result={url:'https://alvenx.com/',layouts:[]};
 const browser=page.context().browser();
 for(const width of [320,393,820,1180,1375]) {
  const context=await browser.newContext({viewport:{width,height:852},reducedMotion:'reduce'});
  const p=await context.newPage();
  try {
   await p.goto(result.url);await p.evaluate(()=>document.fonts.ready);
   if(width<=720)await p.locator('.mobile-nav-toggle').click();
   const data=await p.evaluate(()=>{
    const style=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();const values={};for(const key of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','color','minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','gap','display'])values[key]=s[key];return {...values,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};};
    const nav=[...document.querySelectorAll('.site-nav')].find(n=>n.getBoundingClientRect().width>0);
    return {width:innerWidth,clientWidth:document.documentElement.clientWidth,header:style(document.querySelector('.site-header')),wordmark:style(document.querySelector('.brand-wordmark')),navigation:style(nav),link:style(nav.querySelector('a')),language:style(nav.querySelector('.site-language__toggle'))};
   });
   result.layouts.push(data);
   if(width===1375||width===393)await p.screenshot({path:'output/playwright/navigation-type-2026-10-22/reference-'+width+'.png',scale:'css'});
  } finally {await context.close();}
 }
 return result;
}
