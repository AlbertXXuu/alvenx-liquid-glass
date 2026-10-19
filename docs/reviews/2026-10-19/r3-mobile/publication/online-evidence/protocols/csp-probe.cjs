async page=>{
 const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1180,height:1024}}),p=await context.newPage(),errors=[],requests=[];
 p.on('console',message=>{if(message.type()==='error')errors.push(message.text());});p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
 await p.addInitScript(()=>{window.r3Csp=[];document.addEventListener('securitypolicyviolation',e=>window.r3Csp.push({directive:e.violatedDirective,blocked:e.blockedURI,disposition:e.disposition}));});
 try{
  const response=await p.goto('https://alvenx.com/ui/review-20261019-r3/');await p.evaluate(()=>document.fonts.ready);await p.locator('.lab-optical-scene').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-local-glass="r3-free-lens"]')?.dataset.opticalMode==='scene');await p.waitForTimeout(250);
  const scene=await p.evaluate(()=>{const lens=document.querySelector('[data-local-glass="r3-free-lens"]'),image=lens.querySelector('feImage'),transmission=lens.querySelector('[data-controlled-transmission]'),id=transmission?.dataset.controlledTransmission,source=id?document.getElementById(id):null;return{mode:lens.dataset.opticalMode,normalProtocol:image?.getAttribute('href')?.split(':')[0],sourceId:id,sourcePresent:!!source,sourceText:source?.querySelector('text')?.textContent,pending:lens.dataset.opticalPending,violations:window.r3Csp};});
  const result={url:p.url(),engine:browser.browserType().name(),version:browser.version(),httpStatus:response.status(),csp:await response.headerValue('content-security-policy'),scene,errors,failedRequests:requests,physicalDevice:false};
  if(result.httpStatus!==200||errors.length||requests.length||scene.violations.length||!scene.sourcePresent||scene.mode!=='scene')throw Error(JSON.stringify(result));return result;
 }finally{await context.close();}
}
