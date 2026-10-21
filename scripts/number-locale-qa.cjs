async (page) => {
  const origin=await page.evaluate(()=>location.origin),checks=[];
  const check=(name,pass,detail)=>checks.push({name,pass,detail});
  const fixture=`<!doctype html><meta charset="utf-8"><title>Numeric locale QA</title><div id="root"></div><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import {GlassSlider} from '/src/GlassSettingsControls.tsx';
    import {useGlassSettings} from '/src/useGlassSettings.ts';
    import '/styles/glass.css';
    const {StrictMode,useState}=React,{createRoot}=ReactDOM;
    function Fixture(){
      const {clock}=useGlassSettings({storageKey:'alvenx-number-locale-qa'}),[value,setValue]=useState(.3),[locale,setLocale]=useState(undefined);
      window.__numberQA={setLocale,getValue:()=>value};
      return React.createElement('main',{className:'alvenx-design',style:{width:600,padding:40}},
        React.createElement(GlassSlider,{id:'qa-locale',label:locale==='zh-CN'?'透明度':'Opacity',value,min:0,max:1,step:.001,precision:3,clock,locale,onChange:setValue}));
    }
    createRoot(document.getElementById('root')).render(React.createElement(StrictMode,null,React.createElement(Fixture)));
  </script>`;
  await page.route('**/__number-locale-qa',route=>route.fulfill({contentType:'text/html',body:fixture}));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1100,height:700});
  await page.goto(origin+'/__number-locale-qa');
  const input=page.locator('#number-qa-locale'),notice=page.locator('#number-notice-qa-locale'),hint=page.locator('#number-hint-qa-locale');
  await input.waitFor();
  check('English remains the numeric default',await input.getAttribute('aria-label')==='Opacity value'&&(await hint.textContent()).startsWith('Range 0 to 1.'),{label:await input.getAttribute('aria-label'),hint:await hint.textContent()});
  const edit=async(draft,key='Enter')=>{await input.fill(draft);await input.press(key);return {value:await input.inputValue(),notice:await notice.textContent()};};
  const englishInvalid=await edit('-');
  check('English invalid draft restores existing value',englishInvalid.value==='0.3'&&englishInvalid.notice==='0–1 · Restored 0.3',englishInvalid);
  const englishClamp=await edit('4');
  check('English overflow clamps at max',englishClamp.value==='1'&&englishClamp.notice==='0–1 · Set to 1',englishClamp);
  const englishRound=await edit('.12345');
  check('English decimal rounding stays unchanged',englishRound.value==='0.123'&&englishRound.notice==='0–1 · Rounded to 0.123',englishRound);
  await input.fill('.444');
  await page.evaluate(()=>window.__numberQA.setLocale('zh-CN'));
  await page.waitForFunction(()=>document.querySelector('#number-qa-locale').getAttribute('aria-label')==='透明度数值');
  const switching=await input.evaluate(el=>({draft:el.value,focused:document.activeElement===el,committed:window.__numberQA.getValue()}));
  check('language switch preserves native draft, focus and committed value',switching.draft==='.444'&&switching.focused&&switching.committed===.123,switching);
  check('Chinese accessible numeric hint is localized',(await hint.textContent()).includes('范围 0 至 1')&&(await hint.textContent()).includes('最多保留 3 位小数'),await hint.textContent());
  await input.press('Enter');
  check('draft commits normally after language switch',await input.inputValue()==='0.444',await input.inputValue());
  const chineseInvalid=await edit('invalid');
  check('Chinese invalid draft notice is localized',chineseInvalid.value==='0.444'&&chineseInvalid.notice==='0–1 · 已恢复为 0.444',chineseInvalid);
  const chineseClamp=await edit('2');
  check('Chinese out-of-range notice is localized',chineseClamp.value==='1'&&chineseClamp.notice==='0–1 · 已设为 1',chineseClamp);
  const chineseRound=await edit('.0125');
  check('Chinese half-up tie stays numerically exact',chineseRound.value==='0.013'&&chineseRound.notice==='0–1 · 已四舍五入为 0.013',chineseRound);
  const chineseExponent=await edit('1e-2');
  check('finite exponent notation remains accepted',chineseExponent.value==='0.01'&&chineseExponent.notice==='',chineseExponent);
  const cancelled=await edit('.9','Escape');
  check('Chinese Escape cancellation restores existing value',cancelled.value==='0.01'&&cancelled.notice==='已取消编辑',cancelled);
  await input.focus();
  const paste=await input.evaluate(el=>{const transfer=new DataTransfer();transfer.setData('text','9'.repeat(33));el.setSelectionRange(0,el.value.length);const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:transfer});el.dispatchEvent(event);return {prevented:event.defaultPrevented,value:el.value};});
  const pasteNotice=await notice.textContent();
  check('overlong paste remains blocked with Chinese feedback',paste.prevented&&paste.value==='0.01'&&pasteNotice==='最多 32 个字符 · 已忽略粘贴',{...paste,notice:pasteNotice});
  await input.press('ArrowUp');
  check('numeric keyboard step remains unchanged',await input.inputValue()==='0.011',await input.inputValue());
  await page.evaluate(()=>window.__numberQA.setLocale('en'));
  await page.waitForFunction(()=>document.querySelector('#number-qa-locale').getAttribute('aria-label')==='Opacity value');
  check('switching back returns English hint and clears stale notice',(await hint.textContent()).startsWith('Range 0 to 1.')&&await notice.textContent()==='',{hint:await hint.textContent(),notice:await notice.textContent()});
  await page.unroute('**/__number-locale-qa');
  const failures=checks.filter(check=>!check.pass),result={status:failures.length?'failed':'passed',checks,failures,coverage:'Real native text editing, range rounding and keyboard events in Edge Chromium; paste event is synthetic; no OS IME claim'};
  if(failures.length)throw new Error(JSON.stringify(result));
  return result;
}
