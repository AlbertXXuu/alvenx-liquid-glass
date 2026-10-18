// Playwright CLI callback. Run in an open --browser=webkit session.
// This is a synthetic iPhone context on the host OS, not physical iOS/Safari.
async page => {
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const browser=page.context().browser(),origin=await page.evaluate(()=>location.origin);
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  const mobile=await context.newPage(),errors=[];mobile.on('pageerror',error=>errors.push(error.message));
  try {
    await mobile.goto(origin+'/?optics=auto',{waitUntil:'domcontentloaded'});await mobile.evaluate(()=>document.fonts.ready);
    const background=mobile.getByRole('switch',{name:'Background motion',exact:true});await background.scrollIntoViewIfNeeded();const switchBox=await background.boundingBox();assert(switchBox,'touch switch visible');
    await mobile.touchscreen.tap(switchBox.x+switchBox.width/2,switchBox.y+switchBox.height/2);
    await mobile.waitForFunction(()=>document.querySelector('[role="switch"][aria-label="Background motion"]').getAttribute('aria-checked')==='false');
    const slider=mobile.getByRole('slider',{name:'Interaction strength',exact:true});await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();assert(box,'touch slider visible');const before=await slider.inputValue();
    await mobile.touchscreen.tap(box.x+box.width*.2,box.y+box.height/2);await mobile.waitForFunction(()=>Number(document.querySelector('#range-interactionStrength').value)<2);
    const after=await slider.inputValue(),number=mobile.getByRole('spinbutton',{name:'Glass background opacity value'});await number.fill('0.3333');await number.press('Enter');assert(await number.inputValue()==='0.333','synthetic numeric commit');
    const width=await mobile.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,dpr:devicePixelRatio,touchPoints:navigator.maxTouchPoints}));assert(width.document===390&&width.viewport===390,'mobile context no page overflow');
    const tier=await mobile.locator('[data-local-glass="input"]').getAttribute('data-optical-mode');assert(tier==='native'||tier==='flat','mobile automatic safe optical tier');
    await mobile.locator('.stage').scrollIntoViewIfNeeded();await mobile.waitForTimeout(200);await mobile.screenshot({path:'../output/playwright/compatibility-2026-10-16/webkit-mobile.png',scale:'css'});
    assert(errors.length===0,'mobile page errors');return {status:'passed',host:'Windows Playwright WebKit, synthetic iPhone context',engineVersion:browser.version(),viewport:width,automaticTier:tier,syntheticTouch:{switch:'passed',slider:{before,after}},numeric:'0.3333 -> 0.333',physicalDevice:false,osKeyboard:false,errors};
  } finally {await context.close();}
}
