async page => {
  const out = 'output/playwright/navigation-type-2026-10-22/';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = [];
  for (const width of [393,820,1180]) {
    await page.setViewportSize({width,height:851});
    if (width <= 900 && await page.locator('.lab-menu').getAttribute('aria-expanded') !== 'true') await page.locator('.lab-menu').click();
    await page.evaluate(() => document.fonts.ready);
    results.push(await page.locator('#showcase-navigation').evaluate((nav, width) => {
      const style = selector => { const s = getComputedStyle(nav.querySelector(selector)); return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight}; };
      return {width,navigation:style(':scope > button'),language:style('.lab-language__toggle')};
    }, width));
    if (width === 393) await page.locator('#showcase-navigation').screenshot({path:out+'before-393-en.png'});
  }
  return {url:page.url(),results};
}
