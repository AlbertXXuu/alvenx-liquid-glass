// Playwright CLI callback. Exercises native Chrome touch, mouse/trackpad-style
// pointers, keyboard and persistence in disposable contexts. No physical iOS claim.
async page => {
  const browser=page.context().browser(),origin=await page.evaluate(()=>new URL('.',location.href).href.replace(/\/$/,'')),checks=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message);};
  const result={engine:browser.version(),physicalDevice:false,checks,observations:{}};
  const desktop=await browser.newContext({viewport:{width:1280,height:900}}),mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  try {
    const p=await desktop.newPage(),errors=[];p.on('pageerror',error=>errors.push(error.message));
    await p.goto(origin+'/?optics=native');await p.evaluate(()=>document.fonts.ready);
    const slider=p.getByRole('slider',{name:'Explore the endpoint',exact:true});await slider.scrollIntoViewIfNeeded();
    const number=p.getByRole('spinbutton',{name:'Explore the endpoint value',exact:true});
    await number.fill('0.42');await number.press('Enter');await p.waitForTimeout(50);
    const row=slider.locator('xpath=../..'),thumb=row.locator('.range-thumb-position');
    let box=await thumb.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
    const rail=await slider.boundingBox();await p.mouse.move(rail.x+rail.width+80,rail.y+rail.height/2,{steps:20});await p.waitForTimeout(40);
    const over=await row.locator('.range-rail').getAttribute('data-overshoot');
    assert(Number(over)>3&&Number(await slider.inputValue())===1,'mouse drag reaches legal maximum with elastic overdrag');
    await p.mouse.up();await p.waitForTimeout(20);box=await thumb.boundingBox();const before=box.x;
    // The spring keeps returning between a bounding-box query, mouse movement
    // and pointerdown. Measure the re-grab invariant at the actual event, so a
    // slow test runner cannot mistake legitimate pre-grab motion for a jump.
    await p.evaluate(()=>document.addEventListener('pointerdown',event=>{
      if(event.target.id!=='range-component-slider')return;
      const rail=event.target.closest('.range-rail'),thumb=rail.querySelector('.range-thumb-position');
      window.__regrabAtDown={x:thumb.getBoundingClientRect().x,time:performance.now(),overshoot:Number(rail.dataset.overshoot),progress:Number(rail.dataset.progress)};
    },{capture:true,once:true}));
    await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.waitForTimeout(20);box=await thumb.boundingBox();
    const regrabAtDown=await p.evaluate(()=>window.__regrabAtDown),regrabObservation={staleSampleX:before,atDown:regrabAtDown,heldX:box.x,staleSampleDelta:box.x-before,eventTimeDelta:box.x-regrabAtDown.x};
    assert(Math.abs(regrabObservation.eventTimeDelta)<3,'re-grab preserves the displayed position measured at pointerdown');
    await p.mouse.move(rail.x+rail.width*.3,rail.y+rail.height/2,{steps:10});await p.mouse.up();await p.waitForTimeout(350);
    assert(Number(await slider.inputValue())<.6,'primary mouse pointer remains draggable after re-grab');
    await slider.focus();await slider.press('Home');await p.waitForTimeout(40);assert(Number(await slider.inputValue())===0,'slider Home keyboard input');
    await slider.press('ArrowRight');await p.waitForTimeout(40);assert(Math.abs(Number(await slider.inputValue())-.01)<1e-8,'slider keyboard step remains discrete');
    await number.fill('0.42');await number.press('Enter');await p.waitForFunction(()=>Number(document.querySelector('#range-component-slider').value)===.42);
    await slider.evaluate(el=>{el.focus();el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));document.querySelector('#number-component-slider').focus();});await p.waitForFunction(()=>Math.abs(Number(document.querySelector('#range-component-slider').value)-.43)<1e-8);
    assert(Math.abs(Number(await slider.inputValue())-.43)<1e-8,'queued keyboard edit survives same-task focus change');
    // The numeric field was focused before the preceding frame committed.
    // End that untouched draft before starting the independent window test.
    await number.press('Escape');
    await number.fill('0.42');await number.press('Enter');await p.waitForFunction(()=>Number(document.querySelector('#range-component-slider').value)===.42);
    await slider.evaluate(el=>{el.focus();el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));window.dispatchEvent(new Event('blur'));});await p.waitForFunction(()=>Math.abs(Number(document.querySelector('#range-component-slider').value)-.43)<1e-8);
    assert(Math.abs(Number(await slider.inputValue())-.43)<1e-8,'queued keyboard edit survives same-task window blur');
    await number.fill('1.7');await number.press('Enter');assert(await number.inputValue()==='1','numeric entry clamps to its range');
    const toggle=p.getByRole('switch',{name:'Continuous switch',exact:true});await toggle.scrollIntoViewIfNeeded();
    box=await toggle.boundingBox();await p.mouse.move(box.x+box.width*.7,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x-60,box.y+box.height/2,{steps:12});await p.waitForTimeout(40);
    assert(await toggle.getAttribute('aria-checked')==='false','switch reports midpoint crossing while held');await p.mouse.up();await p.waitForTimeout(300);
    await toggle.press('Space');await p.waitForTimeout(20);const animation=await toggle.locator('xpath=..').getAttribute('data-position');
    assert(await toggle.getAttribute('aria-checked')==='true'&&Number(animation)>0&&Number(animation)<1,'keyboard switch activation travels continuously');await p.waitForTimeout(650);
    assert(Number(await toggle.locator('xpath=..').getAttribute('data-position'))>.999,'keyboard switch finishes at its endpoint');
    await toggle.evaluate(el=>{el.focus();el.click();document.querySelector('#number-component-slider').focus();});await p.waitForTimeout(650);
    assert(await toggle.getAttribute('aria-checked')==='false'&&Number(await toggle.locator('xpath=..').getAttribute('data-position'))<.001,'keyboard-style switch activation survives immediate focus change');
    assert(errors.length===0,'desktop controls produce no page errors');

    const m=await mobile.newPage();m.on('pageerror',error=>errors.push(error.message));
    await m.addInitScript(()=>{const original=Storage.prototype.setItem;window.__controlWrites=[];Storage.prototype.setItem=function(key,value){window.__controlWrites.push({key,value,time:performance.now()});return original.call(this,key,value);};});
    await m.goto(origin+'/?optics=native');await m.evaluate(()=>document.fonts.ready);const cdp=await mobile.newCDPSession(m);
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(point=>({x:point.x,y:point.y,id:point.id??1,radiusX:4,radiusY:4,force:1}))});
    const center=async locator=>{await locator.evaluate(el=>el.scrollIntoView({block:'center'}));await m.waitForTimeout(100);const b=await locator.boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2,box:b};};
    const swipe=async(start,end)=>{await touch('touchStart',[start]);for(let i=1;i<=12;i++){await touch('touchMove',[{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12}]);await m.waitForTimeout(18);}await touch('touchEnd',[]);await m.waitForTimeout(150);};
    const mobileSlider=m.getByRole('slider',{name:'Explore the endpoint',exact:true});let point=await center(mobileSlider),initial=await mobileSlider.inputValue(),scroll=await m.evaluate(()=>scrollY);
    assert((await mobileSlider.evaluate(el=>getComputedStyle(el).touchAction)).includes('pan-y'),'slider permits native vertical pan');
    await swipe(point,{x:point.x+2,y:point.y-135});const sliderDelta=await m.evaluate(()=>scrollY)-scroll;
    assert(sliderDelta>40&&await mobileSlider.inputValue()===initial,'vertical swipe from slider scrolls without editing');
    const mobileToggle=m.getByRole('switch',{name:'Continuous switch',exact:true});point=await center(mobileToggle);initial=await mobileToggle.getAttribute('aria-checked');scroll=await m.evaluate(()=>scrollY);
    await swipe(point,{x:point.x+1,y:point.y-135});const switchDelta=await m.evaluate(()=>scrollY)-scroll;
    assert(switchDelta>40&&await mobileToggle.getAttribute('aria-checked')===initial,'vertical swipe from switch scrolls without toggling');
    point=await center(mobileToggle);await m.touchscreen.tap(point.x,point.y);await m.waitForTimeout(250);
    assert(await mobileToggle.getAttribute('aria-checked')!==initial,'first touch tap toggles once');
    point=await center(mobileSlider);await swipe({x:point.box.x+point.box.width*.25,y:point.y},{x:point.box.x+point.box.width*.8,y:point.y});
    assert(Number(await mobileSlider.inputValue())>.6,'horizontal native touch drag updates the slider continuously');
    point=await center(mobileSlider);await touch('touchStart',[{x:point.box.x+point.box.width*.3,y:point.y,id:1}]);await touch('touchMove',[{x:point.box.x+point.box.width*.4,y:point.y,id:1}]);await m.waitForTimeout(50);const first=Number(await mobileSlider.inputValue());
    await touch('touchStart',[{x:point.box.x+point.box.width*.4,y:point.y,id:1},{x:point.box.x+point.box.width*.9,y:point.y,id:2}]);await m.waitForTimeout(50);const second=Number(await mobileSlider.inputValue());await touch('touchEnd',[]);
    assert(Math.abs(first-second)<.02,'second touch cannot replace the active slider pointer');
    const material=m.getByRole('slider',{name:'Interaction strength',exact:true});point=await center(material);await m.waitForTimeout(350);await m.evaluate(()=>window.__controlWrites=[]);
    await touch('touchStart',[{x:point.box.x+point.box.width*.15,y:point.y}]);for(let i=1;i<=25;i++){await touch('touchMove',[{x:point.box.x+point.box.width*(.15+.65*i/25),y:point.y}]);await m.waitForTimeout(15);}await touch('touchEnd',[]);await m.waitForTimeout(80);
    const during=await m.evaluate(()=>window.__controlWrites.length);assert(during===0,'continuous settings drag does not write synchronous storage per frame');
    await m.waitForTimeout(350);const writes=await m.evaluate(()=>window.__controlWrites.length);assert(writes===1,'settings drag coalesces to one persisted update');
    const opacity=m.getByRole('spinbutton',{name:'Glass background opacity value',exact:true});await opacity.fill('0.45');await opacity.press('Enter');await m.waitForTimeout(20);await m.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
    const saved=await m.evaluate(()=>{const last=window.__controlWrites.at(-1);return last?JSON.parse(localStorage.getItem(last.key)):null;});
    assert(saved.glassOpacity===.45,'pagehide flushes the latest committed settings');
    assert(errors.length===0,'native touch controls produce no page errors');
    result.observations={overdrag:Number(over),keyboardAnimationPosition:Number(animation),verticalScroll:{slider:sliderDelta,switch:switchDelta},secondTouch:{first,second},storageWrites:{during,after:writes},regrab:regrabObservation};
    return {status:'passed',...result};
  } finally {await desktop.close();await mobile.close();}
}
