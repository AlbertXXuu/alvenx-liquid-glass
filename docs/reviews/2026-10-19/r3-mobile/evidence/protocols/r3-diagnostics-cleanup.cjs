async page => {
  const context = await page.context().browser().newContext(), p = await context.newPage();
  try {
    await p.route('**/__r3_diagnostics_fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><div class="lab"><button id="target">Trace target</button></div></body></html>' }));
    await p.goto('http://127.0.0.1:5174/__r3_diagnostics_fixture');
    return await p.evaluate(async () => {
      const { observeDeviceInput } = await import('/showcase/mobile-review/diagnostics.ts');
      const scheduled = new Set(), nativeRAF = requestAnimationFrame, nativeCancel = cancelAnimationFrame;
      window.requestAnimationFrame = callback => { let id = nativeRAF(time => { scheduled.delete(id); callback(time); }); scheduled.add(id); return id; };
      window.cancelAnimationFrame = id => { scheduled.delete(id); nativeCancel(id); };
      try {
        const observer = observeDeviceInput(), target = document.getElementById('target');
        const fire = type => target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: 20, clientY: 20 }));
        fire('pointerdown'); fire('pointermove');
        const active = observer.snapshot();
        if (active.records.length !== 1 || active.records[0].moves !== 1 || scheduled.size !== 1) throw new Error('Initial trace/frame tracking');
        observer.clear(); const cleared = observer.snapshot();
        if (cleared.records.length) throw new Error('clear must erase records');
        observer.destroy();
        if (scheduled.size) throw new Error('destroy must cancel pending RAF');
        fire('pointerdown'); fire('pointermove'); fire('pointerup');
        const destroyed = observer.snapshot();
        if (destroyed.records.length || scheduled.size) throw new Error('destroy must detach listeners and prevent further frames');
        return { status: 'passed', scope: 'Direct diagnostics lifecycle fixture', active, clearedRecords: cleared.records.length, destroyedRecords: destroyed.records.length, pendingFramesAfterDestroy: scheduled.size };
      } finally { window.requestAnimationFrame = nativeRAF; window.cancelAnimationFrame = nativeCancel; }
    });
  } finally { await context.close(); }
}
