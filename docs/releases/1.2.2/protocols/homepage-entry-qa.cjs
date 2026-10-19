// Playwright CLI callback. Run against an already opened candidate homepage.
// Browser touch simulation does not certify physical iOS or Combo Touch.
async page => {
  const browser = page.context().browser(), engine = browser.browserType().name();
  const base = page.url().split(/[?#]/)[0].replace(/(https?:\/\/[^/]+).*/, '$1/');
  const out = 'output/playwright/ui-1.2.2-2026-10-19/';
  const report = { engine, version: browser.version(), physicalDevice: false, revision:'Final owner steering: existing native glass circle, no painted pearl overlay, between Explore the work and GitHub.', checks: [], layouts: [], errors: [], limitations:[] };
  const check = (ok, name, detail) => { if (!ok) throw Error(name + ' ' + JSON.stringify(detail)); report.checks.push(name); };
  for (const [width, height] of [[320,852],[393,852],[768,1024],[1180,820],[1366,900]]) {
    const context = await browser.newContext({ viewport:{width,height}, hasTouch:true, deviceScaleFactor:1 });
    const p = await context.newPage();
    p.on('pageerror',e => report.errors.push({width,message:e.message}));
    try {
      await p.goto(base); await p.evaluate(() => document.fonts.ready);
      const sphere = p.getByRole('button',{name:'Explore Liquid Glass',exact:true});
      await sphere.scrollIntoViewIfNeeded();
      await p.waitForFunction(() => document.querySelector('.ui-entry__sphere')?.dataset.opticalReady === 'true');
      const before = await p.evaluate(() => {
        const e=document.querySelector('.ui-entry'), b=e.querySelector('button'), r=b.getBoundingClientRect();
        return {text:b.innerText,expanded:b.getAttribute('aria-expanded'),rect:r.toJSON(),clip:b.style.clipPath,overflow:document.documentElement.scrollWidth>innerWidth+1,url:location.href};
      });
      check(before.text==='' && before.expanded==='false','initial sphere is textless native disclosure '+width,before);
      check(before.rect.width>=44 && before.rect.height>=44 && Math.abs(before.rect.width-before.rect.height)<1,'sphere retains square accessible target '+width,before);
      check(before.clip.startsWith('path('),'native target follows actual kit contour '+width,before);
      check(await sphere.locator('*').count()===0,'sphere has no painted overlay or visible child content '+width);
      const order=await p.locator('.hero__actions').evaluate(e=>[...e.children].map(n=>n.className));
      check(order[0]==='liquid-button' && order[1]==='alvenx-design ui-entry' && order[2]==='text-link','sphere sits between existing hero links '+width,order);
      check(!before.overflow,'initial page has no horizontal overflow '+width,before);
      check(await p.getByRole('link',{name:'explore me!',exact:true}).count()===0,'invitation absent before activation '+width);
      if(engine==='chromium') await p.screenshot({path:out+`homepage-${engine}-${width}-initial.png`,scale:'css'});
      await sphere.tap();
      const invitation = p.getByRole('link',{name:'explore me!',exact:true});
      await invitation.waitFor({state:'visible'}); await p.waitForTimeout(500);
      check(p.url()===before.url,'first touch reveals without navigating '+width,p.url());
      check(await sphere.getAttribute('aria-expanded')==='true','expanded state exposed '+width);
      check(await invitation.getAttribute('href')==='/ui/','invitation uses native showcase anchor '+width);
      await sphere.tap();
      check(await invitation.count()===1,'repeated sphere activation keeps one invitation '+width);
      const geometry=await p.evaluate(() => {
        const rect=e=>e.getBoundingClientRect().toJSON(), link=document.querySelector('.ui-entry__link');
        const r=rect(link), others=[...document.querySelectorAll('.hero__actions > a')].map(rect);
        const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
        return {sphere:rect(document.querySelector('.ui-entry')),link:r,others,overlap:others.map(o=>overlap(r,o)),overflow:document.documentElement.scrollWidth>innerWidth+1,header:rect(document.querySelector('.site-header'))};
      });
      check(geometry.link.left>=0 && geometry.link.right<=width && !geometry.overflow,'revealed link stays inside page '+width,geometry);
      check(geometry.overlap.every(v=>v===0),'invitation does not cover existing hero actions '+width,geometry);
      check(geometry.link.height>=44,'revealed link keeps touch target height '+width,geometry);
      report.layouts.push({width,height,before,geometry});
      if(engine==='chromium') await p.screenshot({path:out+`homepage-${engine}-${width}-reveal.png`,scale:'css'});
      await invitation.click(); await p.waitForURL('**/ui/');
      check(p.url()===base+'ui/','second activation reaches showcase '+width,p.url());
    } finally { await context.close(); }
  }
  const context=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'}), p=await context.newPage();
  p.on('pageerror',e=>report.errors.push({mode:'keyboard',message:e.message}));
  try {
    await p.goto(base); const sphere=p.getByRole('button',{name:'Explore Liquid Glass',exact:true});
    await p.waitForFunction(() => document.querySelector('.ui-entry__sphere')?.dataset.opticalReady === 'true');
    await sphere.focus(); await sphere.press('Space');
    const link=p.getByRole('link',{name:'explore me!',exact:true}); await link.waitFor({state:'visible'});
    check(await link.isVisible(),'Space reveals invitation');
    check(await p.locator('.ui-entry__invitation').evaluate(e=>getComputedStyle(e).animationName)==='none','reduced motion disables reveal animation');
    await sphere.press('Tab');
    const tabReached=await link.evaluate(e=>document.activeElement===e);
    if (!tabReached && engine==='webkit') {
      report.limitations.push('Observed Windows WebKit26.5 Tab traversal skips generated and ordinary homepage anchors to the next native button; no product tab-order workaround applied. Chromium native Tab path passes. WebKit verifies focus()+Enter on the existing native anchor.');
      await link.focus();
      check(await link.evaluate(e=>document.activeElement===e),'native anchor accepts focus in Windows WebKit');
    } else check(tabReached,'native Tab reaches generated anchor after sphere');
    await link.press('Enter'); await p.waitForURL('**/ui/');
    check(p.url()===base+'ui/','keyboard Enter on anchor reaches showcase');
    await p.goto(base); await p.waitForFunction(() => document.querySelector('.ui-entry__sphere')?.dataset.opticalReady === 'true'); await sphere.focus(); await sphere.press('Enter'); await link.waitFor({state:'visible'});
    check(await link.isVisible(),'Enter reveals invitation');
    await p.emulateMedia({forcedColors:'active'}); await sphere.focus();
    const forced=await sphere.evaluate(e=>({border:getComputedStyle(e).borderTopStyle,outline:getComputedStyle(e).outlineStyle}));
    check(forced.border==='solid','forced colors preserves sphere boundary',forced);
  } finally { await context.close(); }
  check(report.errors.length===0,'no page errors',report.errors);
  report.limitations.push('Automated touch and Windows browser engines are not physical iOS or Combo Touch certification. Existing vendor1.1.2 optics and actual C2 clipping are preserved; no renderer/dependency change.');
  return report;
}
