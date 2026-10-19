async page => {
  const url='https://alvenx.com/ui/field-sizing-review-20261019/';
  const out='alvenx-design-kit/docs/reviews/2026-10-19/field-sizing/final-verification/online/';
  const errors=[],consoleDiagnostics=[],httpErrors=[],cancelledRequests=[],checks=[];
  const onError=error=>errors.push(String(error));
  const onConsole=message=>{if(message.type()==='error'||message.type()==='warning')consoleDiagnostics.push({type:message.type(),text:message.text()});};
  const onResponse=response=>{if(response.status()>=400)httpErrors.push({status:response.status(),url:response.url()});};
  const onRequestFailed=request=>cancelledRequests.push({url:request.url(),error:request.failure()?.errorText});
  page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);page.on('requestfailed',onRequestFailed);
  const check=(name,pass,details=null)=>{checks.push({name,pass,details});if(!pass)throw new Error(name+': '+JSON.stringify(details));};
  try{
    await page.goto(url,{waitUntil:'networkidle'});
    check('independent review route',page.url()===url,page.url());
    check('safe-area guides initially off',!await page.getByRole('checkbox',{name:'Show text safe areas'}).isChecked());
    const viewports=[];
    for(const width of [393,768,1366]){
      await page.setViewportSize({width,height:900});
      for(const article of await page.locator('.candidate').all()){
        await article.scrollIntoViewIfNeeded();
        await article.locator('.candidate-field[data-optical-ready=true]').waitFor();
        await page.waitForTimeout(180);
      }
      const metrics=await page.locator('.candidate').evaluateAll(nodes=>nodes.map(node=>{
        const field=node.querySelector('.candidate-field'),input=node.querySelector('.candidate-field input'),hit=node.querySelector('.field-hit');
        const box=field.getBoundingClientRect(),text=input.getBoundingClientRect();
        return {option:node.className,width:box.width,height:box.height,inset:parseFloat(getComputedStyle(hit).paddingLeft),inputFontSize:getComputedStyle(input).fontSize,inputPadding:getComputedStyle(input).padding,textAlign:getComputedStyle(input).textAlign,verticalCenterError:Math.abs(text.y+text.height/2-box.y-box.height/2),opticalReady:field.dataset.opticalReady,opticalMode:field.dataset.opticalMode,opticalError:field.dataset.opticalError||null,readout:node.querySelector('.candidate-metrics').textContent};
      }));
      viewports.push({width,metrics});
      check('no horizontal overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const expectedWidths=width===393?[267,267,267]:width===768?[568,568,460]:[660,580,460];
      const expectedHeights=width===393?[68,64,60]:[74,68,60];
      const expectedInsets=width===393?[40,40,36]:[56,52,44];
      metrics.forEach((metric,index)=>{
        check('geometry and inset '+width+' '+index,Math.abs(metric.width-expectedWidths[index])<.5&&metric.height===expectedHeights[index]&&Math.abs(metric.inset-expectedInsets[index])<.5,metric);
        check('native centered text and optics '+width+' '+index,metric.inputFontSize==='16px'&&metric.inputPadding==='0px'&&metric.textAlign==='left'&&metric.verticalCenterError<.5&&metric.opticalReady==='true'&&!metric.opticalError,metric);
        check('readout agrees '+width+' '+index,metric.readout.includes(Math.round(metric.width)+' × '+Math.round(metric.height))&&metric.readout.includes('Text inset '+Math.round(metric.inset)+' px'),metric.readout);
      });
      await page.getByRole('button',{name:'Short · 中文',exact:true}).click();
      const chinese=await page.locator('.candidate-field input').evaluateAll(inputs=>inputs.map(input=>input.value));
      check('shared short Chinese '+width,chinese.length===3&&chinese.every(value=>value==='给想法一点生长的空间。'),chinese);
      await page.getByRole('button',{name:'Long · English',exact:true}).click();
      const english=await page.locator('.candidate-field input').evaluateAll(inputs=>inputs.map(input=>input.value));
      check('shared long English '+width,english.length===3&&english.every(value=>value==='A clear place for a longer thought, with a little more room to breathe.'),english);
      await page.getByRole('textbox',{name:'Option B message',exact:true}).fill('Independent · 独立编辑');
      const independent=await page.locator('.candidate-field input').evaluateAll(inputs=>inputs.map(input=>input.value));
      check('native independent editing '+width,independent[0]===english[0]&&independent[1]==='Independent · 独立编辑'&&independent[2]===english[2],independent);
      await page.getByRole('checkbox',{name:'Show text safe areas'}).check();
      check('guide overlay '+width,await page.locator('.candidate-field').evaluateAll(fields=>fields.every(field=>getComputedStyle(field,'::after').borderTopStyle==='dashed')));
      await page.getByRole('checkbox',{name:'Show text safe areas'}).uncheck();
      if(width===393||width===1366){
        await page.getByRole('button',{name:'Short · 中文',exact:true}).click();
        await page.evaluate(()=>document.activeElement.blur());
        for(const article of await page.locator('.candidate').all()){await article.scrollIntoViewIfNeeded();await page.waitForTimeout(180);}
        await page.screenshot({path:out+(width===393?'phone-393.png':'desktop-1366.png'),fullPage:true});
      }
    }
    await page.waitForTimeout(500);
    check('zero page errors',errors.length===0,errors);
    check('zero console warning/error/CSP diagnostics',consoleDiagnostics.length===0,consoleDiagnostics);
    check('zero HTTP errors',httpErrors.length===0,httpErrors);
    return {url,reportedWorker:'79be58bd-165f-4a9e-84ad-475ad4cf1359',browser:'Installed Chrome on Windows through Playwright CLI',scope:'Production independent review route; desktop viewport emulation does not certify physical iOS, Safari, IME or Combo Touch.',assertions:checks.length,passed:checks.filter(check=>check.pass).length,viewports,pageErrors:errors,consoleDiagnostics,httpErrors,cancelledRequests,checks};
  }finally{
    page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);page.off('requestfailed',onRequestFailed);
  }
}
