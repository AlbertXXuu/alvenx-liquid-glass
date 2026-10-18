async page=>{
  await page.setViewportSize({width:1364,height:1100});await page.goto('http://127.0.0.1:5174/');
  await page.getByRole('button',{name:'Reset defaults',exact:true}).click();await page.evaluate(()=>document.fonts.ready);
  await page.mouse.move(0,0);await page.waitForTimeout(200);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'docs/validation/showcase-clean.png',fullPage:true});
  await page.locator('.experience').screenshot({path:'docs/validation/showcase-experience.png'});
  return {status:'captured',url:page.url(),image:'showcase-clean.png',experience:'showcase-experience.png'};
}
