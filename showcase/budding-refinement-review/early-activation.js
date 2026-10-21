// Progressive native link before hydration; one bounded intent queue after load.
(()=>{
 globalThis.__alvenxBuddingReleaseEarly?.();
 if(document.querySelector('[data-review-bud="refinement-proposal"][data-enhanced="true"]'))return;
 let destination='',gesture=null,activate=null;
 const release=()=>{for(const [type,handler] of [['click',handle],['pointerdown',down],['pointerup',up],['pointercancel',cancel],['keydown',keyDown],['keyup',keyUp]])document.removeEventListener(type,handler,true);window.removeEventListener('error',failed,true);clearTimeout(deadline);};
 const linkFor=event=>event.target.closest?.('[data-prejs-budding]');
 const modified=event=>event.metaKey||event.ctrlKey||event.shiftKey||event.altKey;
 const queue=link=>{destination=link.href;globalThis.__alvenxBuddingIntent=true;link.closest('[data-review-bud]')?.setAttribute('data-early-intent','true');};
 const down=event=>{const link=linkFor(event);if(link&&event.button===0&&!modified(event)){const r=link.getBoundingClientRect();gesture={pointerId:event.pointerId,left:r.left,top:r.top,right:r.right,bottom:r.bottom};}};
 const up=event=>{if(!gesture||gesture.pointerId!==event.pointerId)return;const g=gesture;gesture=null;if(activate){if(event.clientX>=g.left&&event.clientX<=g.right&&event.clientY>=g.top&&event.clientY<=g.bottom)activate();release();}};
 const cancel=()=>{gesture=null;if(activate)release();};
 const keyDown=event=>{const link=linkFor(event);if(link&&event.key===' '&&!event.repeat&&!modified(event)){event.preventDefault();gesture={key:' ',link};}};
 const keyUp=event=>{if(event.key!==' '||gesture?.key!==' ')return;event.preventDefault();const link=gesture.link;gesture=null;if(activate){activate();release();}else queue(link);};
 const failed=event=>{if(event&&!(event.target instanceof HTMLScriptElement&&event.target.type==='module'))return;const follow=globalThis.__alvenxBuddingIntent;release();delete globalThis.__alvenxBuddingIntent;delete globalThis.__alvenxBuddingReleaseEarly;if(follow&&destination)location.assign(destination);};
 const handle=event=>{
  const link=linkFor(event);
  if(!link||event.defaultPrevented||event.button!==0||modified(event))return;
  event.preventDefault();queue(link);
 };
 const deadline=setTimeout(()=>failed(),10000);
 document.addEventListener('click',handle,true);window.addEventListener('error',failed,true);
 for(const [type,handler] of [['pointerdown',down],['pointerup',up],['pointercancel',cancel],['keydown',keyDown],['keyup',keyUp]])document.addEventListener(type,handler,true);
 // A press may start on the native link and end after React replaces it.
 // Retain only that bounded gesture; its release invokes the hydrated action.
 globalThis.__alvenxBuddingReleaseEarly=action=>{if(gesture&&action){activate=action;document.removeEventListener('click',handle,true);document.removeEventListener('pointerdown',down,true);document.removeEventListener('keydown',keyDown,true);window.removeEventListener('error',failed,true);return release;}release();};
})();
