async page=>{
 const browser=page.context().browser(),engine=browser.browserType().name(),c=await browser.newContext({viewport:{width:1180,height:1024}}),p=await c.newPage();
 const root='output/publication/r3-protocol-replay/online-optics/',out={engine,version:browser.version(),physicalDevice:false,cases:[],errors:[]};p.on('pageerror',e=>out.errors.push(e.message));
 try{
  await p.goto('https://alvenx.com/ui/review-20261019-r3/');await p.evaluate(()=>document.fonts.ready);
  const reduce=p.getByRole('switch',{name:'Reduced motion',exact:true});if(!(await reduce.isChecked()))await reduce.click();
  const board=p.locator('.lab-optical-scene'),lens=p.locator('[data-local-glass="r3-free-lens"]');await board.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await p.waitForFunction(()=>document.querySelector('[data-local-glass="r3-free-lens"]')?.dataset.opticalMode==='scene');await p.mouse.move(2,2);await p.waitForTimeout(300);
  const info=()=>p.evaluate(()=>{const l=document.querySelector('[data-local-glass="r3-free-lens"]'),b=document.querySelector('.lab-optical-scene'),lr=l.getBoundingClientRect(),br=b.getBoundingClientRect();return {lens:{x:lr.left-br.left,y:lr.top-br.top,width:lr.width,height:lr.height},board:{width:br.width,height:br.height},mode:l.dataset.opticalMode,geometry:l.dataset.geometryVersion,scale:l.querySelector('feDisplacementMap').getAttribute('scale'),source:document.querySelector('svg[data-controlled-source]')?.dataset.controlledSource};});
  const setScale=value=>lens.locator('feDisplacementMap').evaluate((e,value)=>e.setAttribute('scale',String(value)),value);
  const snap=async name=>{await p.waitForTimeout(120);await board.screenshot({path:root+engine+'-integration-'+name+'.png',scale:'css'});};
  for(const kind of ['text','track']){
   if(kind==='track'){
    const lr=await lens.boundingBox(),br=await board.boundingBox();await p.mouse.move(lr.x+lr.width/2,lr.y+lr.height/2);await p.mouse.down();await p.mouse.move(br.x+br.width*.48,br.y+br.height*.76+7,{steps:10});await p.mouse.up();await p.mouse.move(2,2);await p.waitForTimeout(250);
   }
   const initial=await info();await setScale(0);await snap(kind+'-zero');await setScale(initial.scale);await snap(kind+'-refracted');
   if(kind==='text')await p.getByRole('textbox',{name:'Source word',exact:true}).fill('Lucidity');
   else {const value=p.getByRole('spinbutton',{name:'Source line value',exact:true});await value.fill('0.85');await value.press('Enter');}
   await p.mouse.move(2,2);await p.waitForTimeout(200);await snap(kind+'-updated');const updated=await info();await setScale(0);await snap(kind+'-updated-zero');await setScale(updated.scale);
   out.cases.push({kind,initial,updated});
   if(kind==='text'){await p.getByRole('textbox',{name:'Source word',exact:true}).fill('Clarity');await p.mouse.move(2,2);await p.waitForTimeout(200);}
  }
  await p.screenshot({path:root+engine+'-integration-page.png',scale:'css'});
  if(out.errors.length)throw Error(JSON.stringify(out));return out;
 }finally{await c.close();}
}

