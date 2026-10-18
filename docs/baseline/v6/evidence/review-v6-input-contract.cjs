async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewportSize({width:390,height:844});
  const storageKey='alvenx-material-direction-v2';
  const legacy={interactionStrength:2.5,specularOpacity:1,specularSaturation:2,refractionLevel:1.234567,blurLevel:2,progressiveBlur:2,glassOpacity:.2712345,ambient:false,reducedMotion:false};
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:legacy});await page.reload();await page.evaluate(()=>document.fonts.ready);
  const field=label=>page.getByRole('spinbutton',{name:label+' value',exact:true}),slider=label=>page.getByRole('slider',{name:label,exact:true});
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  const pause=()=>page.waitForTimeout(160),tests=[];
  const expectValue=async(label,key,expected)=>{await pause();const state=await saved(),actual=+await slider(label).inputValue();if(state[key]!==expected||actual!==expected)throw Error(label+' expected '+expected+': '+JSON.stringify({state:state[key],actual}));};
  const enter=async(label,key,text,expected)=>{const f=field(label);await f.fill(text);await f.press('Enter');await expectValue(label,key,expected);tests.push({label,text,expected,display:await f.inputValue()});};
  if(await page.getByRole('spinbutton').count()!==7)throw Error('Missing numeric fields');
  const untouched=field('Refraction level');await untouched.focus();await untouched.press('Tab');await expectValue('Refraction level','refractionLevel',legacy.refractionLevel);
  const before=await saved();if(before.glassOpacity!==legacy.glassOpacity)throw Error('Old saved opacity was overwritten');
  const reset=page.getByRole('button',{name:'Reset defaults',exact:true});await reset.click();await expectValue('Glass background opacity','glassOpacity',.3);
  const opacity=field('Glass background opacity');await opacity.fill('0.12345');if((await saved()).glassOpacity!==.3)throw Error('Draft reached material before commit');await opacity.press('Enter');await expectValue('Glass background opacity','glassOpacity',.123);
  await enter('Glass background opacity','glassOpacity','2',1);await enter('Glass background opacity','glassOpacity','-.1',0);
  await enter('Glass background opacity','glassOpacity','０．３４５６',.346);await enter('Glass background opacity','glassOpacity','3e-1',.3);await enter('Glass background opacity','glassOpacity','1e-3',.001);
  for(const text of ['','-','.','1e-','1e999','NaN','Infinity','0.3px','0x1','0.2.3'])await enter('Glass background opacity','glassOpacity',text,.001);
  await enter('Refraction level','refractionLevel','1.005',1.01);await enter('Refraction level','refractionLevel','1.235',1.24);await enter('Refraction level','refractionLevel','2.675',2.68);
  await enter('Glass background opacity','glassOpacity','.3005',.301);await enter('Glass background opacity','glassOpacity','.9995',1);await enter('Glass background opacity','glassOpacity','-0',0);
  await enter('Blur level','blurLevel','2.25',2.3);await enter('Progressive blur','progressiveBlur','6.5',6);
  for(const label of ['Blur level','Progressive blur'])if(await slider(label).getAttribute('max')!=='6'||await field(label).getAttribute('aria-valuemax')!=='6')throw Error('Blur range changed');
  const ref=field('Refraction level');await ref.focus();await ref.press('ArrowDown');await expectValue('Refraction level','refractionLevel',2.67);await ref.press('Home');await expectValue('Refraction level','refractionLevel',0);await ref.press('End');await expectValue('Refraction level','refractionLevel',3);
  await ref.fill('1.23');await ref.press('Control+A');const selection=await ref.evaluate(e=>({start:e.selectionStart,end:e.selectionEnd}));if(selection.start!==0||selection.end!==4)throw Error('Text selection was intercepted');await ref.press('Escape');await expectValue('Refraction level','refractionLevel',3);
  await opacity.fill('.8');await reset.click();await expectValue('Glass background opacity','glassOpacity',.3);
  await opacity.focus();await opacity.dispatchEvent('compositionstart',{data:''});await opacity.fill('０．７');await opacity.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,keyCode:229});if((await saved()).glassOpacity!==.3)throw Error('IME Enter submitted material');await opacity.dispatchEvent('compositionend',{data:'０．７'});await opacity.press('Enter');await expectValue('Glass background opacity','glassOpacity',.7);
  await opacity.fill('0.3');await opacity.press('Control+A');const paste=await opacity.evaluate(e=>{const data=new DataTransfer();data.setData('text/plain','1'.repeat(33));const event=new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true});e.dispatchEvent(event);return{prevented:event.defaultPrevented,value:e.value};});await pause();
  if(!paste.prevented||paste.value!=='0.3')throw Error('Overlong paste was truncated or accepted');const pasteNotice=await page.locator('#number-notice-glassOpacity').innerText();if(!pasteNotice.includes('32')||!await page.locator('#number-notice-glassOpacity').isVisible())throw Error('Missing visible paste notice');await opacity.press('Escape');await expectValue('Glass background opacity','glassOpacity',.7);
  const local=[];
  for(const value of [2.5,3]){await enter('Refraction level','refractionLevel',String(value),value);await page.mouse.move(385,3);await page.waitForTimeout(550);local.push({value,scale:+await page.locator('[data-local-glass="refractionLevel-thumb"]').getAttribute('data-refraction-strength')});}
  if(local[1].scale<=local[0].scale)throw Error('New local refraction range was silently clipped');
  for(const value of [.81,1]){await enter('Glass background opacity','glassOpacity',String(value),value);const alpha=+await page.locator('[data-local-glass="glassOpacity-thumb"] .local-edge path').first().getAttribute('fill-opacity');if(alpha!==value)throw Error('New local opacity range was silently clipped');}
  await reset.click();await expectValue('Glass background opacity','glassOpacity',.3);await page.mouse.move(385,3);await page.waitForTimeout(500);
  const style=await opacity.evaluate(e=>({filter:getComputedStyle(e).filter,transform:getComputedStyle(e).transform,maxLength:e.maxLength,inputMode:e.inputMode,role:e.getAttribute('role')}));
  if(style.filter!=='none'||style.transform!=='none'||style.maxLength!==32)throw Error('Numeric text is not clear native editing');
  const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));if(overflow.document>overflow.viewport)throw Error('Number fields overflow the narrow layout');
  await page.screenshot({path:'output/playwright/review-v6-input-contract.png',fullPage:true});if(errors.length)throw Error(JSON.stringify(errors));
  return{status:'passed',viewport:390,legacyPreserved:before,tests,selection,paste,pasteNotice,local,style,overflow,errors,limits:'Native field typing/keyboard; clipboard paste and IME composition events are synthetic. No OS IME or assistive-technology certification claim.'};
}
