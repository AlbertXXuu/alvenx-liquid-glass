async page => {
  const browser = page.context().browser();
  const base = page.url().split(/[?#]/)[0];
  const result = {base,engine:browser.browserType().name(),checks:[],layouts:[],errors:[],physicalDevice:false};
  const check = (ok, name, detail) => {if(!ok)throw Error(name+' '+JSON.stringify(detail));result.checks.push(name);};
  for(const width of [320,393,720,820,1000,1100,1101,1180,1375]) {
    const context = await browser.newContext({viewport:{width,height:852},reducedMotion:'reduce'});
    const p = await context.newPage();
    p.on('pageerror',e=>result.errors.push(e.message));
    try {
      await p.goto(base);await p.evaluate(()=>document.fonts.ready);
      const menu = p.locator('.lab-menu');
      const ensureMenu = async()=>{if(width<=1100&&await menu.getAttribute('aria-expanded')!=='true')await menu.click();};
      for(const language of ['en','zh-CN']) {
        await ensureMenu();
        if(language==='zh-CN') {
          await p.locator('.lab-language__toggle').click();
          await p.getByRole('button',{name:'简体中文',exact:true}).click();
          await p.waitForFunction(()=>document.documentElement.lang==='zh-CN');
          await p.evaluate(()=>document.fonts.ready);
        }
        await ensureMenu();
        const layout = await p.locator('#showcase-navigation').evaluate(nav=>{
          const snapshot = element=>{const s=getComputedStyle(element),r=element.getBoundingClientRect();return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,tracking:s.letterSpacing,transform:s.textTransform,color:s.color,radius:s.borderRadius,padding:s.padding,height:r.height,left:r.left+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth),right:r.right,width:r.width};};
          return {items:[...nav.querySelectorAll(':scope > button,:scope > a')].map(snapshot),language:snapshot(nav.querySelector('.lab-language__toggle')),documentWidth:document.documentElement.scrollWidth,display:getComputedStyle(nav).display,gridColumns:getComputedStyle(nav).gridTemplateColumns};
        });
        const label = width+'/'+language;
        const keys = ['family','size','weight','lineHeight','tracking','transform','color','radius','padding'];
        check(layout.items.every(item=>keys.every(key=>item[key]===layout.language[key])),'same typography '+label,layout);
        check(layout.language.size==='12.48px'&&layout.language.weight==='590'&&layout.language.lineHeight==='18.72px','canonical homepage font '+label,layout.language);
        check((language==='en'?layout.language.tracking==='0.9984px':['0px','normal'].includes(layout.language.tracking))&&layout.language.transform==='uppercase','canonical locale tracking '+label,layout.language);
        check(layout.language.height>=44&&layout.items.every(item=>item.height>=44),'44px targets '+label,layout);
        check(layout.documentWidth<=width,'no horizontal overflow '+label,layout.documentWidth);
        if(width<=1100)check(layout.display==='grid'&&layout.gridColumns.split(' ').length===2,'two column mobile navigation '+label,layout);
        else check(layout.items.at(-1).right<layout.language.left,'GitHub before Language '+label,layout);
        result.layouts.push({width,locale:language,...layout});
        if((width===393&&language==='en')||(width===820&&language==='zh-CN')||(width===1375&&language==='en')) {
          await p.screenshot({path:'output/playwright/navigation-type-2026-10-22/after-'+width+'-'+language+'.png',scale:'css'});
        }
        const toggle=p.locator('.lab-language__toggle');
        await toggle.focus();await p.keyboard.press('Enter');
        check(await p.getByRole('button',{name:'English',exact:true}).isVisible(),'language disclosure keyboard '+label);
        await p.keyboard.press('Escape');
        check(await toggle.evaluate(el=>el===document.activeElement),'language Escape restores focus '+label);
      }
    } finally {await context.close();}
  }
  check(result.errors.length===0,'no page errors',result.errors);
  return result;
}
