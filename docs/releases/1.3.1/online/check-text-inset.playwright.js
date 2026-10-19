async page => {
 const baseline=[{"width":393,"field":{"x":30,"y":2667.734375,"width":285,"height":68},"send":{"x":319,"y":2679.734375,"width":44,"height":44}},{"width":768,"field":{"x":72,"y":2261.6875,"width":554,"height":74},"send":{"x":638,"y":2269.6875,"width":58,"height":58}},{"width":1366,"field":{"x":323,"y":2483.9375,"width":650,"height":74},"send":{"x":985,"y":2491.9375,"width":58,"height":58}}];
 const out='alvenx-design-kit/docs/releases/1.3.1/online/';
 const pageErrors=[],consoleDiagnostics=[],appHttpErrors=[],failedRequests=[],checks=[],widths=[];
 const onError=error=>pageErrors.push(String(error));
 const onConsole=message=>{if(message.type()==='error'||message.type()==='warning')consoleDiagnostics.push({type:message.type(),text:message.text()});};
 const onResponse=response=>{if(response.status()>=400&&response.url().startsWith('https://alvenx.com/'))appHttpErrors.push({status:response.status(),url:response.url()});};
 const onFailed=request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText});
 const check=(name,pass,details=null)=>{checks.push({name,pass,details});if(!pass)throw new Error(name+': '+JSON.stringify(details));};
 page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);page.on('requestfailed',onFailed);
 try{
  await page.goto('https://alvenx.com/ui/',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [393,768,1366]){
   await page.setViewportSize({width,height:900});await page.locator('#fields').scrollIntoViewIfNeeded();await page.locator('.lab-message[data-optical-ready=true]').waitFor();await page.mouse.move(0,0);
   const input=page.getByRole('textbox',{name:'Preview message',exact:true});
   await input.fill('给想法一点生长的空间。');await page.evaluate(()=>document.activeElement.blur());await page.waitForTimeout(700);
   const metrics=await page.locator('.lab-composer').evaluate(form=>{
    const field=form.querySelector('.lab-message'),send=form.querySelector('.lab-send'),hit=field.querySelector('.field-hit'),input=field.querySelector('input');
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};
    const f=rect(field),i=rect(input),s=getComputedStyle(input),h=getComputedStyle(hit);
    return {field:f,send:rect(send),input:{...i,fontSize:s.fontSize,lineHeight:s.lineHeight,padding:s.padding,contentStartWithinField:i.x+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth)-f.x,centerOffset:i.y+i.height/2-f.y-f.height/2},hitPadding:{top:h.paddingTop,right:h.paddingRight,bottom:h.paddingBottom,left:h.paddingLeft},value:input.value,opticalReady:field.dataset.opticalReady,opticalError:field.dataset.opticalError||null};
   });
   widths.push({width,...metrics});const previous=baseline.find(item=>item.width===width);
   for(const name of ['field','send'])check(name+' bounds unchanged '+width,['x','y','width','height'].every(axis=>Math.abs(metrics[name][axis]-previous[name][axis])<.01),{before:previous[name],after:metrics[name]});
   check('native content inset '+width,Math.abs(metrics.input.contentStartWithinField-(width===393?38:60))<.01,metrics.input.contentStartWithinField);
   check('native vertical text and optics '+width,metrics.input.fontSize==='16px'&&Math.abs(metrics.input.centerOffset)<.01&&metrics.opticalReady==='true'&&!metrics.opticalError,metrics.input);
   check('Chinese input '+width,metrics.value==='给想法一点生长的空间。');
   check('no overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(width===393||width===1366)await page.locator('#fields').screenshot({path:out+'production-after-'+width+'.png'});
   const long='A longer thought stays editable and scrolls naturally inside the same glass field, without changing its size.';await input.fill(long);check('long native input '+width,await input.inputValue()===long);
   await input.fill('fluency');await page.getByRole('button',{name:'Send preview message',exact:true}).click();check('fluency Easter egg '+width,(await page.locator('.lab-message-feedback').textContent())==='<3');
   await input.fill('A thoughtful question');await input.press('Enter');check('ordinary Easter egg '+width,(await page.locator('.lab-message-feedback').textContent())==='Good question… but I don’t understand.');
  }
  await page.waitForTimeout(300);check('zero page errors',pageErrors.length===0,pageErrors);check('zero console warning/error/CSP diagnostics',consoleDiagnostics.length===0,consoleDiagnostics);check('zero application HTTP errors',appHttpErrors.length===0,appHttpErrors);
  return {url:page.url(),deploymentIdentitySuppliedByPublisher:{worker:'eba97f87-43b2-45b1-8614-5da6dbb77105',kitSource:'08aa8ed969f2aea0e7edfc09c6d0287ede1cb7da',websiteSource:'242be6814526ec4586df37e2ba78add1200a3fc2'},browser:'Installed Chrome on Windows through Playwright CLI',scope:'Targeted final online text-inset check; Windows viewport checks do not certify physical iPhone/iPad, Safari, IME or Combo Touch.',assertions:checks.length,passed:checks.filter(item=>item.pass).length,widths,pageErrors,consoleDiagnostics,appHttpErrors,failedRequests,checks};
 }finally{page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);page.off('requestfailed',onFailed);}
}


