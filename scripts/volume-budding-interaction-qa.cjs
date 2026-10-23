async page=>{
 const base=page.url(),browser=page.context().browser(),checks=[],errors=[],out='output/playwright/entrance-local-response-20261023/'+(base.startsWith('https:')?'online':base.includes(':5196')?'fixture':'built');
 const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(JSON.stringify(checks.at(-1)));};
 const path=host=>host.locator('.local-edge>path').first().getAttribute('d');
 const split=p=>p.split(/(?=M )/);
 for(const width of [320,393,820,1413]){
  const c=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width<700?3:2,hasTouch:true}),p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(base);await p.evaluate(()=>document.fonts.ready);
  const host=p.locator('[data-volume-budding]'),button=host.locator('button'),link=host.locator('.glass-budding-destination');
  await button.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-volume-budding] canvas')?.dataset.volumePreparation==='ready');
  await p.mouse.move(0,0);await p.waitForTimeout(800);
  const closed=await path(host),buttonBox=await button.boundingBox();
  await p.mouse.move(buttonBox.x+buttonBox.width*.8,buttonBox.y+buttonBox.height*.25);await p.waitForTimeout(300);
  check(`${width}: closed mother follows pointer`,await path(host)!==closed);
  await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await p.mouse.move(0,0);await p.waitForTimeout(800);
  const rest=await path(host),box=await link.boundingBox(),layout=await host.boundingBox();
  await p.screenshot({path:`${out}/${width}-rest.png`,scale:'css'});
  await p.mouse.move(box.x+box.width*.72,box.y+box.height*.4);await p.mouse.down();
  await p.mouse.move(box.x+box.width*.72+32,box.y+box.height*.4-20,{steps:10});await p.waitForTimeout(230);
  const pulled=await path(host),during=await host.boundingBox();
  check(`${width}: chamber contour pulls`,split(pulled)[1]!==split(rest)[1]);
  check(`${width}: mother remains independent`,split(pulled)[0]===split(rest)[0]);
  check(`${width}: neighboring layout is stable`,Math.abs(during.width-layout.width)<.1);
  const a=split(rest)[1].match(/-?\d+(?:\.\d+)?/g).map(Number),b=split(pulled)[1].match(/-?\d+(?:\.\d+)?/g).map(Number),dx=a.filter((_,i)=>i%2===0).map((v,i)=>b[i*2]-v);
  check(`${width}: local deformation, not only translation`,Math.max(...dx)-Math.min(...dx)>1.4,{min:Math.min(...dx),max:Math.max(...dx)});
  await p.screenshot({path:`${out}/${width}-chamber-pull.png`,scale:'css'});
  await p.mouse.up();await p.mouse.move(0,0);await p.waitForTimeout(45);
  check(`${width}: release has a return interval`,await path(host)!==rest);
  await p.waitForTimeout(1000);
  check(`${width}: release returns to accepted shape`,await path(host)===rest);
  check(`${width}: drag never navigates`,p.url()===base&&await host.getAttribute('data-expanded')==='true');
  const m=await button.boundingBox();await p.mouse.move(m.x+m.width*.6,m.y+m.height*.5);await p.mouse.down();await p.mouse.move(m.x+m.width*.6-26,m.y+m.height*.5+18,{steps:8});await p.waitForTimeout(230);
  const motherPull=await path(host);check(`${width}: mother also pulls`,split(motherPull)[0]!==split(rest)[0]);check(`${width}: chamber remains independent`,split(motherPull)[1]===split(rest)[1]);
  await p.screenshot({path:`${out}/${width}-mother-pull.png`,scale:'css'});await p.mouse.up();await p.mouse.move(0,0);await p.waitForTimeout(1000);
  check(`${width}: mother drag does not toggle`,await host.getAttribute('data-expanded')==='true');
  await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.growth==='0.00000');check(`${width}: next click toggles normally`,await host.getAttribute('data-expanded')==='false');
  await button.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');check(`${width}: keyboard toggle remains usable`,await host.getAttribute('data-expanded')==='true');
  await p.mouse.move(0,0);await p.waitForTimeout(600);const frames=await host.locator('canvas').getAttribute('data-volume-light-renders');await p.waitForTimeout(250);check(`${width}: renderer sleeps when settled`,frames===await host.locator('canvas').getAttribute('data-volume-light-renders'));
  if(width===393){
   const session=await c.newCDPSession(p),r=await link.boundingBox(),scroll=await p.evaluate(()=>scrollY);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.7,y:r.y+r.height*.45}]});
   for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.7+i*3,y:r.y+r.height*.45-i*4}]});
   await p.waitForTimeout(230);check('touch: gesture belongs to shape',await p.evaluate(()=>scrollY)===scroll);await p.screenshot({path:`${out}/393-touch-pull.png`,scale:'css'});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(650);check('touch: release does not navigate',p.url()===base);
   await button.tap();check('touch: subsequent tap still toggles',await host.getAttribute('data-expanded')==='false');
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-12,y:750}]});
   for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width-12,y:750-i*30}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(350);check('touch: background remains scrollable',await p.evaluate(()=>scrollY)>scroll+20);
   await session.detach();await button.scrollIntoViewIfNeeded();await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');
  }
  const href=await link.getAttribute('href');await link.click();await p.waitForURL(url=>url.href!==base);check(`${width}: ordinary link click still navigates`,p.url().replace(/\/$/,'').endsWith(href.replace(/\/$/,'')),{url:p.url(),href});
  await c.close();
 }
 const c=await browser.newContext({reducedMotion:'reduce',viewport:{width:820,height:900}}),p=await c.newPage();await p.goto(base);const h=p.locator('[data-volume-budding]'),button=h.locator('button');await button.scrollIntoViewIfNeeded();await button.click();await p.waitForFunction(()=>document.querySelector('[data-volume-budding]')?.dataset.ready==='true');await p.mouse.move(0,0);await p.waitForTimeout(250);const before=await path(h);await h.locator('a').hover();await p.waitForTimeout(300);check('reduced motion: shape stays static',before===await path(h));await c.close();
 check('no page exceptions',errors.length===0,errors);
 return {status:'passed',base,checks,errors,scope:'Chromium viewport and CDP touch emulation, not physical iOS'};
}
