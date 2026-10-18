async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.mouse.move(10,10);await page.waitForTimeout(650);
 const opacity=page.getByRole('spinbutton',{name:'Specular opacity value',exact:true});await opacity.focus();await opacity.press('ControlOrMeta+A');await opacity.pressSequentially('0.12345',{delay:110});await page.waitForTimeout(500);await opacity.press('Enter');await page.waitForTimeout(900);
 const ref=page.getByRole('spinbutton',{name:'Refraction level value',exact:true});await ref.focus();await ref.press('ControlOrMeta+A');await ref.pressSequentially('9',{delay:100});await page.waitForTimeout(400);await ref.press('Enter');await page.waitForTimeout(850);
 const glass=page.getByRole('spinbutton',{name:'Glass background opacity value',exact:true});await glass.focus();await glass.press('ControlOrMeta+A');await glass.pressSequentially('0.8',{delay:120});await page.waitForTimeout(450);await page.getByRole('button',{name:'Reset defaults',exact:true}).click();await page.mouse.move(10,10);await page.waitForTimeout(1400);
 return{status:'captured',capturedAt:new Date().toISOString(),errors,originalSpeed:true,scope:'Native number typing, precision correction, upper-bound correction, and immediate Reset during an edit; final opacity .3.'};
}
