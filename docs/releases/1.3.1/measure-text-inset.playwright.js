async page => {
 const scenario=page.url().startsWith('https://alvenx.com/')?'production-before':'local-after';
 const out='alvenx-design-kit/docs/releases/1.3.1/';
 const errors=[],checks=[],widths=[];
 const onError=error=>errors.push(String(error));page.on('pageerror',onError);
 const check=(name,pass,details=null)=>{checks.push({name,pass,details});if(!pass)throw new Error(name+': '+JSON.stringify(details));};
 try{
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [393,768,1366]){
   await page.setViewportSize({width,height:900});
   await page.locator('#fields').scrollIntoViewIfNeeded();
   await page.locator('.lab-message[data-optical-ready=true]').waitFor();
   await page.mouse.move(0,0);
   const input=page.getByRole('textbox',{name:'Preview message',exact:true});
   await input.fill('给想法一点生长的空间。');
   await page.evaluate(()=>document.activeElement.blur());
   await page.waitForTimeout(700);
   const metrics=await page.locator('.lab-composer').evaluate(form=>{
    const field=form.querySelector('.lab-message'),send=form.querySelector('.lab-send'),hit=field.querySelector('.field-hit'),input=field.querySelector('input');
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};
    const s=getComputedStyle(input),h=getComputedStyle(hit),f=rect(field),i=rect(input);
    return {field:f,send:rect(send),composer:rect(form),gap:getComputedStyle(form).gap,maxWidth:getComputedStyle(form).maxWidth,hitPadding:{top:h.paddingTop,right:h.paddingRight,bottom:h.paddingBottom,left:h.paddingLeft},input:{...i,fontSize:s.fontSize,lineHeight:s.lineHeight,fontFamily:s.fontFamily,padding:s.padding,contentStartWithinField:i.x+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth)-f.x,centerOffset:i.y+i.height/2-f.y-f.height/2},shapePath:field.querySelector('.local-edge path')?.getAttribute('d'),value:input.value};
   });
   widths.push({width,...metrics});
   check('native Chinese input '+width,metrics.value==='给想法一点生长的空间。');
   check('native text baseline '+width,metrics.input.fontSize==='16px'&&Math.abs(metrics.input.centerOffset)<.5,metrics.input);
   check('no page overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#fields').screenshot({path:out+scenario+'-'+width+'.png'});
   const long='A longer thought stays editable and scrolls naturally inside the same glass field, without changing its size.';
   await input.fill(long);check('long native input '+width,await input.inputValue()===long);
   await input.fill('fluency');await page.getByRole('button',{name:'Send preview message',exact:true}).click();
   check('fluency Easter egg '+width,(await page.locator('.lab-message-feedback').textContent())==='<3');
   await input.fill('A thoughtful question');await input.press('Enter');
   check('ordinary Easter egg '+width,(await page.locator('.lab-message-feedback').textContent())==='Good question… but I don’t understand.');
  }
  check('zero page errors',errors.length===0,errors);
  return {scenario,url:page.url(),browser:'Installed Chrome on Windows through Playwright CLI',scope:'Native text inset only; Windows browser emulation does not certify physical iOS, Safari or system IME.',widths,checks,pageErrors:errors};
 }finally{page.off('pageerror',onError);}
}
