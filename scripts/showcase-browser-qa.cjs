async page => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const target = page.url().split(/[?#]/)[0];
  if (!/^https?:/.test(target)) throw new Error('Open the showcase before running this check.');
  await page.goto(target + '?optics=auto#inspection');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-local-glass="input"]')?.dataset.opticalReady === 'true');
  const header = await page.locator('.ax-product-header').evaluate(el => {
    const c = getComputedStyle(el), r = el.getBoundingClientRect();
    return { top:r.top, width:r.width, height:r.height, padding:c.padding, gap:c.gap, radius:c.borderRadius, zIndex:c.zIndex, background:c.backgroundColor, backdrop:c.backdropFilter, wordmark:el.querySelector('img').getBoundingClientRect().width };
  });
  assert(header.top === 14 && header.wordmark === 160 && header.height >= 70 && header.padding === '12px 18px 12px 22px' && header.gap === '28px' && header.radius === '26px' && header.zIndex === '100', 'canonical header geometry '+JSON.stringify(header));
  const input = page.getByRole('textbox', { name:'Preview message' });
  await input.fill('A clear thought. 清晰的文字。');
  const sliderValue = page.getByRole('spinbutton', { name:'Explore the endpoint value' });
  await sliderValue.fill('0.71'); await sliderValue.press('Enter');
  const original = await page.evaluate(() => ({url:location.href, history:history.length}));
  const home = page.getByRole('button', { name:'AlvenX — Back to top' });
  const navigation = [];
  for (const activation of ['click','Enter','Space']) {
    // Present the test's forced scroll before sending a new smooth-scroll
    // command. DOM scrollY can update before the previous animation settles.
    await page.evaluate(async () => {
      scrollTo({top:1200,behavior:'instant'});
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert(await page.evaluate(() => Math.abs(scrollY - 1200) < 1), 'initial scroll position presented');
    if (activation === 'click') await home.click(); else { await home.focus(); await home.press(activation); }
    await page.waitForFunction(() => scrollY === 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(await page.evaluate(() => scrollY === 0), 'home return remains settled');
    const after = await page.evaluate(() => ({url:location.href, history:history.length}));
    assert(after.url === original.url && after.history === original.history, 'home preserves URL/history');
    assert(await input.inputValue() === 'A clear thought. 清晰的文字。' && await sliderValue.inputValue() === '0.71', 'home preserves inputs');
    navigation.push(activation);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(() => document.querySelector('#switch-reduced-motion')?.disabled || document.querySelector('[aria-label="Reduced motion"]')?.disabled);
  const reduced = await home.evaluate(el => { scrollTo({top:600,behavior:'instant'}); el.click(); return scrollY; });
  assert(reduced === 0, 'reduced motion return is immediate');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const widths = [];
  for (const width of [320,390,720,768,1024,1440]) {
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(100);
    const size = await page.evaluate(() => ({width:innerWidth, document:document.documentElement.scrollWidth, client:document.documentElement.clientWidth}));
    assert(size.document <= size.client, 'no horizontal document overflow '+JSON.stringify(size));
    widths.push(size);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
  const menu = page.getByRole('button', {name:'Open navigation'});
  await menu.click(); assert(await page.getByRole('button',{name:'Close navigation'}).getAttribute('aria-expanded') === 'true','mobile menu opens');
  await page.keyboard.press('Escape'); assert(await menu.getAttribute('aria-expanded') === 'false','Escape closes menu');
  assert(await menu.evaluate(el => el === document.activeElement),'Escape restores focus');
  await menu.click(); await page.locator('.intro .fineprint').click(); assert(await menu.getAttribute('aria-expanded') === 'false','outside click closes menu');
  await menu.click(); await page.getByRole('button',{name:'Components',exact:true}).click();
  await page.waitForFunction(() => Math.abs(document.getElementById('components').getBoundingClientRect().top-112) < 2);
  assert(await menu.getAttribute('aria-expanded') === 'false','section choice closes menu');
  await page.getByRole('button',{name:'Try the controls',exact:false}).click();
  await page.waitForFunction(() => {const s=document.querySelector('.stage-scroll');return s.scrollLeft>s.scrollWidth-s.clientWidth-2;});
  assert(await input.isVisible(),'mobile controls reachable');
  await page.getByRole('button',{name:'Use inspiration',exact:true}).click();
  assert(await input.inputValue() === 'Help me explore a new idea.','mobile inspiration works');
  await page.getByRole('button',{name:'Send preview message',exact:true}).click();
  assert(await page.locator('#preview-feedback').textContent() === 'Saved in this preview.','composer works');
  await page.getByRole('button',{name:'Pearl volume',exact:false}).click();
  await page.waitForFunction(() => document.querySelector('.stage-scroll').scrollLeft === 0);
  const github = await page.getByRole('link',{name:'GitHub',exact:false}).first().getAttribute('href');
  assert(github === 'https://github.com/AlbertXXuu/alvenx-liquid-glass','public GitHub route');
  assert(await page.getByRole('link',{name:'License notice',exact:false}).getAttribute('href') === './licenses/LICENSE-NOTICE.md','base-safe license link');
  assert(errors.length === 0, 'no page errors '+JSON.stringify(errors));
  return {status:'passed',header,homeActivation:navigation,homePreserves:['URL','history','message','slider value'],reducedImmediate:true,widths,mobileMenu:['open','Escape','outside','section selection'],mobileStage:['controls','composer','volume'],github,errors};
}
