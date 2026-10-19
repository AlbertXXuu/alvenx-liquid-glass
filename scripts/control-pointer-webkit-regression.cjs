// Playwright CLI callback for WebKit on Windows with a desktop-class iPad UA.
// Mouse input approximates the Pointer Events route used by a trackpad; this is
// not a physical iPad / Combo Touch or Safari certification.
async page => {
  const browser=page.context().browser(),origin=await page.evaluate(()=>new URL('.',location.href).href.replace(/\/$/,'')),checks=[],observations={};
  const assert=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message);};
  const context=await browser.newContext({viewport:{width:1180,height:820},deviceScaleFactor:2,hasTouch:true,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'});
  try {
    const p=await context.newPage(),errors=[];p.on('pageerror',error=>errors.push(error.message));
    await p.goto(origin+'/?optics=native');await p.evaluate(()=>document.fonts.ready);
    const slider=p.getByRole('slider',{name:'Explore the endpoint',exact:true});await slider.scrollIntoViewIfNeeded();
    let box=await slider.boundingBox();await p.mouse.move(box.x+box.width*.3,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width*.75,box.y+box.height/2,{steps:15});await p.waitForTimeout(600);const held=Number(await slider.inputValue());await p.mouse.up();
    assert(held>.65,'iPad-UA mouse pointer drags native slider while held');
    await p.waitForTimeout(100);await slider.press('End');await p.waitForTimeout(50);assert(Number(await slider.inputValue())===1,'WebKit native slider keyboard input');
    const toggle=p.getByRole('switch',{name:'Continuous switch',exact:true});await toggle.scrollIntoViewIfNeeded();box=await toggle.boundingBox();
    await p.mouse.move(box.x+box.width*.7,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x-50,box.y+box.height/2,{steps:12});await p.waitForTimeout(50);
    assert(await toggle.getAttribute('aria-checked')==='false','iPad-UA mouse drag crosses switch midpoint');await p.mouse.up();await p.waitForTimeout(350);
    await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(40);const animation=Number(await toggle.locator('xpath=..').getAttribute('data-position'));
    assert(await toggle.getAttribute('aria-checked')==='true'&&animation>0&&animation<1,'WebKit first mouse click toggles once and animates');await p.waitForTimeout(550);
    await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(300);assert(await toggle.getAttribute('aria-checked')==='false','WebKit first touch tap toggles once');
    const before=await toggle.getAttribute('aria-checked');await toggle.evaluate(el=>{
      const r=el.getBoundingClientRect(),send=(type,y)=>el.dispatchEvent(new PointerEvent(type,{pointerId:71,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:r.x+r.width/2,clientY:y,bubbles:true,cancelable:true}));
      // Synthetic pointer dispatch does not create an active native capture, so
      // stub capture only within this disposable element for the intent test.
      el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;
      send('pointerdown',r.y+r.height/2);send('pointermove',r.y-70);send('pointerup',r.y-70);
    });await p.waitForTimeout(100);assert(await toggle.getAttribute('aria-checked')===before,'vertical touch intent does not toggle in WebKit handler');
    assert(errors.length===0,'WebKit control interactions produce no page errors');
    observations.sliderHeld=held;observations.clickAnimationPosition=animation;
    return {status:'passed',engine:browser.version(),physicalDevice:false,scope:'WebKit engine on Windows; desktop iPad UA; native mouse and tap; synthetic vertical-intent handler test',checks,observations};
  } finally {await context.close();}
}
