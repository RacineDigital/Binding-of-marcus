// Inklings (switched off in the game; turned on here) in a real browser, stepped frame by frame (npm run dev first; part of npm run test:e2e):
// the meter and drops, writing, levelling and overwriting margins, every essence's effect, the
// annotations, a crowded extreme build, and save & continue.
//   npx tsx tests/inklings.ts
import { chromium } from 'playwright-core';
import { CHROME } from './browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base); await page.waitForTimeout(2500);
  const r: any = await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game, I = d.ink;
    I.INK.on = true;   // switched off in the game (game/inkflag.ts); this keeps the system working
    g.menus.stack = []; g.newRun('marcus', 'INKTEST2');
    await new Promise((res) => setTimeout(res, 2500));
    window.requestAnimationFrame = () => 0;
    await new Promise((res) => setTimeout(res, 100));
    const w = d.world, pl = w.player, inp = g.input, out = {};
    const step = (n = 1) => { for (let i = 0; i < n; i++) { g.step(1 / 60); inp.endStep(); } };
    const clear = () => { for (const e of w.enemies) e.dead = true; w.enemies = []; w.proj.clear(); w.pickups = []; w.creep = []; w.room.grid.fill(0); w.room.cleared = true; };
    const c = w.room.center();
    const spawn = (id, dx = 0, dy = -40) => { const e = d.spawn(id, c.x + dx, c.y + dy); e.spawnT = 0; return e; };
    const s = I.inkState(w);
    const set = (slots) => { s.slots = slots.map(([id, lv]) => ({ id, lv })); I.syncInk(w); };
    clear(); pl.x = c.x; pl.y = c.y + 50; d.god(); step(2);

    // the meter: a kill adds the creature's weight; brimming, the next kill leaves its Inkling
    s.meter = 0; const m = spawn('moth'); w.killEnemy(m); out.meterAfterKill = +s.meter.toFixed(2);
    s.meter = I.METER_MAX; const m2 = spawn('moth'); w.killEnemy(m2);
    const drop = w.pickups.find((p) => p.kind === 'inkling'); out.brimDrop = drop ? drop.data.id : null; out.meterReset = s.meter;
    // writing it: walk over it; again: it deepens
    drop.noCollect = 0; drop.z = 0; drop.vz = 0; pl.x = drop.x; pl.y = drop.y; step(3);
    out.afterTouch = JSON.stringify(s.slots);
    const again = spawn('sootsprite'); again.champion = 'swift'; w.killEnemy(again);
    const d2 = w.pickups.find((p) => p.kind === 'inkling' && p.collectT < 0); d2.noCollect = 0; d2.z = 0; d2.vz = 0; pl.x = d2.x; pl.y = d2.y; step(3);
    out.afterSecond = JSON.stringify(s.slots); out.championAlwaysDrops = !!d2;
    // full margins: touching leaves it; {active} writes over the weakest (lowest level, oldest)
    set([['dive', 2], ['swarm', 1], ['ember', 1]]);
    const hy = spawn('choirboy'); hy.champion = 'armored'; w.killEnemy(hy); w.pickups = w.pickups.filter((p) => p.kind === 'inkling' && p.data.id === 'hymn');
    const d3 = w.pickups[0]; d3.noCollect = 0; d3.z = 0; d3.vz = 0; pl.x = d3.x; pl.y = d3.y; step(3);
    out.fullLeftIt = d3.collectT < 0 && !!w.nearInkling;
    inp.pressed.add('KeyE'); inp.down.add('KeyE'); step(1); inp.down.delete('KeyE'); step(3);
    out.overwrote = JSON.stringify(s.slots);

    // the essences at work
    const eff = {};
    const fresh = (slots) => { clear(); set(slots); pl.x = c.x; pl.y = c.y + 50; step(1); };
    fresh([['swarm', 2]]); spawn('valvehead', 60, -40).hp = 1e5; const v1 = spawn('mite', -40, -40); const p0 = w.proj.count(); w.killEnemy(v1); eff.swarm = w.proj.count() - p0;
    fresh([['bloat', 3]]); const b = spawn('mite'); spawn('valvehead', 60, -40).hp = 1e5; const c0 = w.creep.length, q0 = w.proj.count(); w.killEnemy(b); eff.bloat = { creep: w.creep.length - c0, shots: w.proj.count() - q0 };
    fresh([['ember', 1]]); const e1 = spawn('mite', 0, -40), e2 = spawn('valvehead', 20, -40); e2.hp = 1e5; e1.burn = 2; w.killEnemy(e1); eff.ember = e2.burn > 0;
    fresh([['hymn', 1]]); const h1 = spawn('mite', 0, -40), h2 = spawn('valvehead', 25, -40); h2.hp = 1e5; w.killEnemy(h1); eff.hymn = h2.fear > 0;
    fresh([['snare', 2]]); const s1 = spawn('mite', 0, -40), s2 = spawn('valvehead', 8, -40); s2.hp = 1e5; s2.slow = 0; w.killEnemy(s1); step(2); eff.snare = s2.slow > 0;
    fresh([['unwrite', 1]]); const u1 = spawn('valvehead'); u1.hp = u1.maxHp * 0.11; w.damageEnemy(u1, u1.maxHp * 0.02, { ang: 0, knock: 0, source: 'shot' }); eff.unwrite = u1.dead;
    fresh([['scurry', 1]]); const r1 = spawn('mite'); w.killEnemy(r1); eff.scurry = pl.temp.some((t) => t.id === 'ink_scurry');
    fresh([['phase', 3]]); w.hurtPlayer(1, 'test', { ignoreIframes: true }); eff.phase = pl.temp.some((t) => t.id === 'ink_phase') && pl.prof.spectral;
    fresh([['ember', 2]]); eff.emberProfile = pl.prof.burn >= 0.2;
    fresh([['leech', 3]]); d.give('sewing_kit'); pl.charge = 0; const l1 = spawn('valvehead'); l1.hp = 1e6; for (let i = 0; i < 15; i++) w.damageEnemy(l1, 1, { ang: 0, knock: 0, source: 'shot' }); eff.leech = pl.charge;
    fresh([['ward', 2]]); step(1); const [wx, wy] = I.shardPos(w, 0, 2); const ep = w.proj.enemy(wx - 20, wy + 8, 0, 100, { z: 8 }); step(20); eff.ward = !!ep && !ep.active;
    fresh([['bury', 1]]); const t1 = spawn('valvehead', 0, -40); t1.hp = 1e5; const hp0 = t1.hp; I.inkShotEnd(w, { x: t1.x, y: t1.y, depth: 0, fromFamiliar: false }, true); step(40); eff.bury = t1.hp < hp0;
    fresh([['lurch', 3]]); const seq = []; for (let i = 0; i < 4; i++) seq.push(I.inkVolley(w, pl.prof).o.dmgMul ?? 1); eff.lurch = seq.join(',');
    fresh([['gaze', 3]]); s.gazeT = 1.3; const gz = I.inkVolley(w, pl.prof); eff.gaze = gz.prof.pierce >= 999 && gz.prof.spectral;
    fresh([['dive', 3]]); const dv = I.inkVolley(w, pl.prof); const fake = [{ homing: 0, dmg: 3, pierce: 0, r: 3 }]; dv.after(fake); eff.dive = fake[0].homing >= 3;
    fresh([['spit', 2]]); spawn('valvehead').hp = 1e5; const sp0 = w.proj.count(); I.inkLobs(w, pl.prof, pl.x, pl.y, -Math.PI / 2, 2); eff.spit = w.proj.list.filter((p) => p.active && p.lob).length;
    fresh([['hoard', 3]]); w.roomHit = false; w.room.type = 'normal'; const pk0 = w.pickups.length; I.inkHook(w, 'onRoomClear'); eff.hoard = w.pickups.length - pk0;
    // annotations
    fresh([['ember', 2], ['bury', 2]]); eff.wildfire = I.annotationOn(w, 'Wildfire');
    fresh([['gaze', 2], ['lurch', 2]]); s.shotN = 2; s.gazeT = 0; const gl = I.inkVolley(w, pl.prof); eff.glare = gl.prof.pierce >= 999;
    out.eff = eff;

    // a crowded room with an extreme build: everything spawned stays bounded
    clear(); set([['swarm', 3], ['bloat', 3], ['bury', 3], ['ward', 3]]);
    for (const id of ['split_nib', 'triple_seam', 'powder_ink', 'rubber_band', 'copper_filament']) d.give(id);
    pl.x = c.x; pl.y = c.y + 60;
    const ids = ['mite', 'moth', 'gasper', 'rat', 'sludge'];
    for (let i = 0; i < 30; i++) { const e = spawn(ids[i % ids.length], ((i % 6) - 2.5) * 30, -70 + Math.floor(i / 6) * 14); }
    let peakProj = 0, peakCreep = 0; const t0 = performance.now();
    inp.down.add('ArrowUp');
    for (let f = 0; f < 600; f++) { step(1); peakProj = Math.max(peakProj, w.proj.count()); peakCreep = Math.max(peakCreep, w.creep.length); if (w.enemies.length < 8) for (let i = 0; i < 6; i++) spawn(ids[i % ids.length], (i - 2.5) * 30, -70); }
    inp.down.delete('ArrowUp');
    out.stress = { msPerStep: +((performance.now() - t0) / 600).toFixed(2), peakProj, peakCreep, kills: w.run.stats.kills };

    // save & continue keeps the margins and what they do
    clear(); set([['ember', 3], ['phase', 1]]); s.meter = 4.5;
    g.saveSnapshot(); g.quitToMenu(); g.continueRun();
    const w2 = d.world, st2 = I.inkState(w2);
    out.continued = { slots: JSON.stringify(st2.slots), meter: st2.meter, burn: w2.player.prof.burn, spectral: w2.player.prof.spectral };
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    return out;
  })()`);
  console.log(JSON.stringify(r));
  let fails = 0;
  const ok = (cnd: unknown, msg: string) => { console.log((cnd ? '  ok   ' : '  FAIL ') + msg); if (!cnd) fails++; };
  ok(r.meterAfterKill > 0, `a kill pours ink into the meter (${r.meterAfterKill})`);
  ok(r.brimDrop === 'dive' && r.meterReset === 0, 'brimming, the next kill leaves its creature\'s Inkling and the meter empties');
  ok(r.afterTouch === '[{"id":"dive","lv":1}]', 'walking over it writes it into a margin');
  ok(r.afterSecond === '[{"id":"dive","lv":2}]' && r.championAlwaysDrops, 'a champion always leaves its Inkling, and the same essence deepens to II');
  ok(r.fullLeftIt, 'with every margin full, touching an Inkling leaves it where it is');
  ok(r.overwrote === '[{"id":"dive","lv":2},{"id":"hymn","lv":1},{"id":"ember","lv":1}]', `{active} writes over the weakest, oldest margin (${r.overwrote})`);
  const e = r.eff;
  ok(e.swarm >= 2, `Swarm: a kill hatches seekers (${e.swarm})`);
  ok(e.bloat.creep >= 1 && e.bloat.shots >= 4, `Bloat III: a puddle and four outward shots (${JSON.stringify(e.bloat)})`);
  ok(e.ember && e.emberProfile, 'Ember: shots burn, and fire spreads from a burning death');
  ok(e.hymn, 'Hymn: a kill frightens what is near');
  ok(e.snare, 'Snare II: a kill leaves a web that slows');
  ok(e.unwrite, 'Unwrite: a badly hurt enemy is erased');
  ok(e.scurry, 'Scurry: a kill gives a burst of speed');
  ok(e.phase, 'Phase III: shots pass through rocks, and through everything after a hit');
  ok(e.leech >= 1, `Leech III: 15 hits charge the active item (${e.leech})`);
  ok(e.ward, 'Ward: a shard blocks an enemy shot');
  ok(e.bury, 'Bury: a buried charge bursts and hurts');
  ok(e.lurch === '1,2,1,2', `Lurch III: every 2nd volley lunges (${e.lurch})`);
  ok(e.gaze, 'Gaze: a ready stare pierces everything');
  ok(e.dive, 'Dive III: every volley seeks');
  ok(e.spit >= 2, `Spittle II: two lobbed blobs (${e.spit})`);
  ok(e.hoard >= 2, `Hoard III: a clean room pays out (${e.hoard})`);
  ok(e.wildfire && e.glare, 'annotations switch on with both essences at II');
  ok(r.stress.peakProj < 500 && r.stress.msPerStep < 12, `extreme build in a crowded room stays bounded (${JSON.stringify(r.stress)})`);
  ok(r.continued.slots === '[{"id":"ember","lv":3},{"id":"phase","lv":1}]' && r.continued.meter === 4.5 && r.continued.burn >= 0.3 && r.continued.spectral, `save & continue keeps the margins and their effects (${JSON.stringify(r.continued)})`);
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(fails ? `${fails} inkling check(s) FAILED` : 'all inkling checks passed');
  process.exit(fails ? 1 : 0);
})();
