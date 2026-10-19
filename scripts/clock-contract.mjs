import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';

// Synthetic display timestamps exercise real scheduling at rates where the
// original 15ms gate dropped frames. No browser/GPU timing claim is made here.
const moduleURL = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const settingsURL = moduleURL(await readFile('src/reviewSettings.ts', 'utf8'));
const source = (await readFile('src/GlassClock.ts', 'utf8')).replace("from './reviewSettings'", 'from ' + JSON.stringify(settingsURL));
const { GlassClock } = await import(moduleURL(source));
const saved = Object.fromEntries(['document','window','performance','requestAnimationFrame','cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let now = 0, next = 0;
const pending = new Map();
const doc = new EventTarget(), win = new EventTarget(); doc.hidden = false;
Object.assign(globalThis, { document: doc, window: win, performance: { now: () => now }, requestAnimationFrame: callback => { pending.set(++next, callback); return next; }, cancelAnimationFrame: id => pending.delete(id) });
const advance = delta => { now += delta; const callbacks = [...pending.values()]; pending.clear(); for (const callback of callbacks) callback(now); };
const checks = [];
try {
  for (const value of [0,-1,NaN,Infinity]) assert.equal(new GlassClock({maxFps:value}).maxFps,60);
  assert.equal(new GlassClock({maxFps:500}).maxFps,240);
  {
    const quick=new GlassClock();let frames=0;
    const stop=quick.subscribe(()=>{frames++;return false;});advance(3);
    assert.equal(frames,1,'new work uses the first available browser frame');
    assert.equal(pending.size,0);stop();quick.destroy();checks.push('first-frame wake latency');
  }
  for (const hz of [60,75,90,120,144,165,240]) {
    const clock = new GlassClock({maxFps:240}); let frames = 0, integrated = 0;
    const unsubscribe = clock.subscribe(delta => { frames++; integrated += delta; return frames < 20; });
    for (let i = 0; i < 20; i++) advance(1000 / hz);
    assert.equal(frames, 20, `${hz}Hz: every delivered frame is used`);
    assert.ok(Math.abs(integrated - 20 * 1000 / hz) < 1e-6, 'actual elapsed time is integrated');
    assert.equal(pending.size, 0, 'settled work sleeps');
    unsubscribe(); clock.destroy(); checks.push(`${hz}Hz continuity and idle suspension`);
  }
  for (const hz of [60,75,90,120,144,165,240]) {
    const clock = new GlassClock(); let frames = 0;
    const unsubscribe = clock.subscribe(() => { frames++; return true; });
    for (let i = 0; i < hz; i++) advance(1000 / hz);
    assert.ok(Math.abs(frames - 60) <= 1, `${hz}Hz -> bounded 60Hz without halving: ${frames}`);
    unsubscribe(); clock.destroy(); checks.push(`${hz}Hz display, default 60Hz budget`);
  }
  const clock = new GlassClock(); let frames = 0;
  const unsubscribe = clock.subscribe(() => { frames++; return true; });
  advance(17); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pending.size, 0, 'hidden tab cancels scheduled work'); advance(1000);
  assert.equal(frames, 1);
  doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); advance(17);
  assert.equal(frames, 2, 'visible tab resumes');
  const old = clock.layoutRevision; doc.dispatchEvent(new Event('scroll')); assert.equal(clock.layoutRevision, old + 1);
  const pointer = new Event('pointermove'); Object.assign(pointer, { clientX: 120, clientY: 240 }); doc.dispatchEvent(pointer);
  assert.deepEqual(clock.pointer, { x: 120, y: 240 }); assert.equal(clock.pointerRevision, 1);
  win.dispatchEvent(new Event('blur')); assert.equal(clock.pointerRevision, 2); assert.ok(clock.pointer.x < 0);
  const down=new Event('pointerdown');Object.assign(down,{clientX:80,clientY:90,isPrimary:true,pointerType:'touch'});doc.dispatchEvent(down);
  assert.deepEqual(clock.pointer,{x:80,y:90},'first contact updates coordinates without a prior move');
  const secondary=new Event('pointermove');Object.assign(secondary,{clientX:500,clientY:600,isPrimary:false});doc.dispatchEvent(secondary);
  assert.deepEqual(clock.pointer,{x:80,y:90},'secondary contact does not steal optical focus');
  const touchUp=new Event('pointerup');Object.assign(touchUp,{isPrimary:true,pointerType:'touch'});doc.dispatchEvent(touchUp);
  assert.ok(clock.pointer.x<0,'lifted touch does not retain a synthetic hover');
  unsubscribe(); assert.equal(pending.size, 0);
  const before = clock.layoutRevision; doc.dispatchEvent(new Event('scroll')); assert.equal(clock.layoutRevision, before, 'last unsubscribe removes listeners');
  const resubscribe = clock.subscribe(() => false); advance(16); resubscribe(); clock.destroy(); clock.destroy();
  assert.equal(pending.size, 0); checks.push('visibility, scroll invalidation, pointer leave, cleanup and resubscription');
  await mkdir('docs/validation', { recursive: true });
  await writeFile('docs/validation/clock-contract.json', JSON.stringify({ status:'passed', checks, note:'Synthetic display timestamps, not physical high-refresh display verification.' }, null, 2)+'\n');
  console.log(JSON.stringify({ status:'passed', checks:checks.length }));
} finally {
  for (const [key, descriptor] of Object.entries(saved)) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; }
}
