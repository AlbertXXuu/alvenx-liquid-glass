async page => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewportSize({width:390,height:844});
  const key='alvenx-material-direction-v2';
  const seed={interactionStrength:4,specularOpacity:1,specularSaturation:2,refractionLevel:1.3,blurLevel:2,progressiveBlur:2,glassOpacity:.3,ambient:false,reducedMotion:false};
  await page.evaluate(({key,seed})=>localStorage.setItem(key,JSON.stringify(seed)),{key,seed});await page.reload();await page.evaluate(()=>document.fonts.ready);
  const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  for(const name of Object.keys(seed))if(persisted[name]!==seed[name])throw Error('Saved parameter replaced: '+name);
  const slider=page.getByRole('slider',{name:'Refraction level',exact:true}),rail=slider.locator('..');
  const background=page.getByRole('switch',{name:'Background motion',exact:true}),body=background.locator('..');
  const waitAway=async(ms=550)=>{await page.mouse.move(385,3);await page.waitForTimeout(ms);};
  const measure=locator=>locator.evaluate(el=>{
    const path=el.querySelector('.local-edge path'),rect=el.querySelector('.range-track,.switch-track').getBoundingClientRect();
    const bbox=path.getBBox(),m=path.getScreenCTM(),toScreen=(x,y)=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});
    const commands=[...path.getAttribute('d').matchAll(/[MC] ([^MCZ]+)/g)].map(v=>v[1].trim().split(/\s+/).map(Number));
    let p={x:commands[0][0],y:commands[0][1]},ends={};
    for(const [x1,y1,x2,y2,x3,y3] of commands.slice(1)){
      const side=Math.abs(p.x-bbox.x)<.002?'left':Math.abs(p.x-bbox.x-bbox.width)<.002?'right':null;
      if(side){const dx=3*(x1-p.x),dy=3*(y1-p.y),ddx=6*(x2-2*x1+p.x),ddy=6*(y2-2*y1+p.y),radius=(dx*dx+dy*dy)**1.5/Math.abs(dx*ddy-dy*ddx),center=toScreen(p.x+(side==='left'?radius:-radius),p.y),edge=toScreen(p.x,p.y),target={x:side==='left'?rect.left+rect.height/2:rect.right-rect.height/2,y:rect.top+rect.height/2};
        ends[side]={radius,center,edge,target,errorX:center.x-target.x,errorY:center.y-target.y,gap:side==='left'?rect.left-edge.x:edge.x-rect.right};}
      p={x:x3,y:y3};
    }
    return{...ends,track:{left:rect.left,right:rect.right,top:rect.top,height:rect.height},position:+el.dataset.position,overshoot:+el.dataset.overshoot};
  });
  const nearZero=(x,limit=.4)=>Math.abs(x)<limit;
  const assertAnchor=(frame,side,label)=>{const e=frame[side];if(!e||!nearZero(e.errorX)||!nearZero(e.errorY))throw Error(label+': '+JSON.stringify(frame));};
  const setSlider=async key=>{await slider.scrollIntoViewIfNeeded();await slider.focus();await page.keyboard.press(key);await waitAway();};
  await setSlider('Home');const min=await measure(rail);assertAnchor(min,'left','Slider minimum');
  await setSlider('End');const max=await measure(rail);assertAnchor(max,'right','Slider maximum');
  await setSlider('Home');let lens=await rail.locator('.local-edge path').first().boundingBox();
  await page.mouse.move(lens.x+9,lens.y+8);await page.waitForTimeout(550);const hover=await measure(rail);assertAnchor(hover,'left','Slider off-axis hover');
  lens=await rail.locator('.local-edge path').first().boundingBox();await page.mouse.move(lens.x+lens.width/2,lens.y+lens.height/2);await page.mouse.down();await page.waitForTimeout(450);const pressed=await measure(rail);assertAnchor(pressed,'left','Slider held');
  for(const frame of [hover,pressed])for(const key of ['left','right','top','height'])if(Math.abs(frame.track[key]-min.track[key])>.02)throw Error('The physical rail moved during morph: '+key);
  let r=await slider.boundingBox();await page.mouse.move(r.x-80,r.y+r.height/2,{steps:6});await page.waitForTimeout(100);const sliderOutside={geometry:await measure(rail),value:+await slider.inputValue()};
  if(sliderOutside.value!==0||sliderOutside.geometry.left.errorX>=-2)throw Error('Slider extra overdrag missing or changes value');
  await page.mouse.up();await waitAway(700);const sliderReturned=await measure(rail);assertAnchor(sliderReturned,'left','Slider returned');
  await slider.focus();await page.keyboard.press('End');await waitAway();lens=await rail.locator('.local-edge path').first().boundingBox();
  await page.mouse.move(lens.x+lens.width/2,lens.y+lens.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width+80,r.y+r.height/2,{steps:4});await page.waitForTimeout(90);
  const sliderRightOutside={geometry:await measure(rail),value:+await slider.inputValue()};if(sliderRightOutside.value!==3||sliderRightOutside.geometry.right.errorX<=2)throw Error('Slider right overdrag missing');
  await page.mouse.move(r.x-60,r.y+r.height/2,{steps:3});await page.mouse.up();await waitAway(700);const reverse=await measure(rail);assertAnchor(reverse,'left','Slider quick reversal');if(+await slider.inputValue()!==0)throw Error('Reversal lost final value');
  await background.scrollIntoViewIfNeeded();await waitAway();const switchOff=await measure(body);assertAnchor(switchOff,'left','Switch off');
  await background.click();const clickFrames=[];for(const delay of [20,55,150,400]){await page.waitForTimeout(delay);clickFrames.push({position:+await body.getAttribute('data-position'),checked:await background.getAttribute('aria-checked')});}await waitAway();
  const switchOn=await measure(body);assertAnchor(switchOn,'right','Switch on');if(!clickFrames.some(x=>x.position>0&&x.position<1))throw Error('Switch click jumped without intermediate geometry');
  const switchFootprint=switchOn.right.edge.x-switchOff.left.edge.x;if(Math.abs(switchFootprint-74.24)>.15)throw Error('Switch settled footprint expanded: '+switchFootprint);
  await background.click();await waitAway();let sw=await background.boundingBox(),off=await body.locator('.local-edge path').first().boundingBox();
  const travel=switchOn.right.edge.x-switchOff.right.edge.x,sy=off.y+off.height/2,start=off.x+off.width/2;
  await page.mouse.move(start,sy);await page.mouse.down();await page.mouse.move(start+travel*.6,sy,{steps:5});await page.waitForTimeout(140);
  const midpoint={position:+await body.getAttribute('data-position'),checked:await background.getAttribute('aria-checked')};if(midpoint.checked!=='true'||midpoint.position<.5)throw Error('Switch did not report at midpoint');
  await page.mouse.move(sw.x+sw.width+80,sy,{steps:4});await page.waitForTimeout(120);const switchOutside=await measure(body);if(switchOutside.right.errorX<2)throw Error('Switch right elasticity missing');
  await page.mouse.up();await waitAway(750);const switchReturned=await measure(body);assertAnchor(switchReturned,'right','Switch elastic return');
  await background.click();await waitAway();off=await body.locator('.local-edge path').first().boundingBox();await page.mouse.move(off.x+off.width/2,off.y+off.height/2);await page.mouse.down();await page.mouse.move(sw.x-80,sy,{steps:5});await page.waitForTimeout(100);const switchLeftOutside=await measure(body);if(switchLeftOutside.left.errorX>-2)throw Error('Switch left elasticity missing');
  await page.mouse.up();await waitAway(750);assertAnchor(await measure(body),'left','Switch left return');
  await background.focus();await page.keyboard.press('Space');await waitAway();const keyboard={checked:await background.getAttribute('aria-checked'),geometry:await measure(body)};if(keyboard.checked!=='true')throw Error('Switch keyboard failed');assertAnchor(keyboard.geometry,'right','Switch keyboard anchor');
  const reduced=page.getByRole('switch',{name:'Reduced motion',exact:true});await reduced.click();await waitAway();await setSlider('Home');r=await slider.boundingBox();lens=await rail.locator('.local-edge path').first().boundingBox();await page.mouse.move(lens.x+lens.width/2,lens.y+lens.height/2);await page.mouse.down();await page.mouse.move(r.x-90,r.y+r.height/2,{steps:4});const reducedHeld=await measure(rail);assertAnchor(reducedHeld,'left','Reduced slider has no elasticity');await page.mouse.up();await waitAway(80);
  await reduced.click();await waitAway();
  const text=page.getByRole('textbox');await text.scrollIntoViewIfNeeded();await text.fill('Clear English 与中文');const inputStyle=await text.evaluate(e=>({filter:getComputedStyle(e).filter,transform:getComputedStyle(e).transform,fontFamily:getComputedStyle(e).fontFamily,value:e.value}));if(inputStyle.filter!=='none'||inputStyle.transform!=='none')throw Error('Text distorted');
  const strength=page.getByRole('spinbutton',{name:'Interaction strength value',exact:true});await strength.fill('0');await strength.press('Enter');
  await page.locator('.stage-scroll').evaluate(e=>{e.scrollLeft=0;});await page.locator('.stage').scrollIntoViewIfNeeded();const stageBox=await page.locator('.stage').boundingBox();await page.mouse.move(stageBox.x+stageBox.width*.31,stageBox.y+stageBox.height*.5);await page.waitForTimeout(500);
  const zeroStrength=JSON.parse(await page.locator('.stage').getAttribute('data-surface'));if(zeroStrength.deformDX!==0||zeroStrength.deformDY!==0||zeroStrength.parentX!==1||zeroStrength.parentY!==1)throw Error('Zero interaction strength still deforms the volume');
  await page.getByRole('button',{name:'Reset defaults',exact:true}).click();await waitAway();
  await page.screenshot({path:'output/playwright/review-v6-b-regression.png',fullPage:true});
  if(errors.length)throw Error(JSON.stringify(errors));
  return{status:'passed',viewport:390,stressStrength:4,zeroStrength,persisted,min,max,hover,pressed,sliderOutside,sliderRightOutside,sliderReturned,reverse,switchOff,switchOn,switchFootprint,clickFrames,midpoint,switchOutside,switchLeftOutside,switchReturned,keyboard,reducedHeld,inputStyle,errors};
}

