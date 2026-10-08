// Chapter II 2.0 creatures in a real browser, stepped frame by frame (part of npm run test:e2e):
// each one's tell, behaviour and counterplay works as its description says.
//   npx tsx tests/boiler.ts
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
    const d = window.__bomDebug, g = d.game;
    g.menus.stack = []; g.newRun('marcus', 'BOILER2');
    await new Promise((res) => setTimeout(res, 2500));
    window.requestAnimationFrame = () => 0;
    await new Promise((res) => setTimeout(res, 100));
    const w = d.world, pl = w.player, inp = g.input, out = {};
    inp.moveVector = () => ({ x: 0, y: 0 }); inp.aimVector = () => null;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { g.step(1 / 60); inp.endStep(); } };
    const c = w.room.center();
    const clear = () => { for (const e of w.enemies) e.dead = true; w.enemies = []; w.proj.clear(); w.pickups = []; w.creep = []; w.room.grid.fill(0); w.room.cleared = false; w.lockdown = true; w.roomTime = 5; };
    const spawn = (id, dx = 0, dy = -40) => { const e = d.spawn(id, c.x + dx, c.y + dy); e.spawnT = 0; return e; };
    const hit = (e, ang, n = 10) => { const hp = e.hp; w.damageEnemy(e, n, { ang, knock: 0, source: 'shot' }); return +(hp - e.hp).toFixed(2); };
    d.god();

    // Bellows: inhales (tell) before it blows; the gust shoves you inside its cone, not outside; fires spit
    clear(); const B = spawn('bellows', -60, 0); B.cd = 0.05; pl.x = c.x + 20; pl.y = c.y;
    w.room.setOb(...(() => { const [cc, rr] = w.room.cellAt(c.x - 10, c.y - 2); return [cc, rr]; })(), 6, 6, 0);
    let inhaled = false, x0 = null, shots = 0; const real = w.proj.enemy.bind(w.proj); w.proj.enemy = (...a) => { shots++; return real(...a); };
    for (let i = 0; i < 120; i++) { step(1); B.x = c.x - 60; B.y = c.y; if (B.state === 'inhale') { inhaled = true; pl.x = c.x + 20; pl.y = c.y; } if (B.state === 'blow' && x0 === null) x0 = pl.x; if (B.state === 'blow' && B.st > 0.5) break; }
    out.bellowsTell = inhaled; out.bellowsPush = x0 === null ? null : +(pl.x - x0).toFixed(1); out.bellowsFireSpit = shots;
    w.proj.enemy = real;
    clear(); const B2 = spawn('bellows', -60, 0); B2.cd = 0.05; pl.x = c.x + 20; pl.y = c.y - 80; let y0 = null;
    for (let i = 0; i < 120; i++) { step(1); B2.x = c.x - 60; B2.y = c.y; if (B2.state === 'inhale') { B2.data.ga = 0; } if (B2.state === 'blow') { B2.data.ga = 0; if (y0 === null) y0 = { x: pl.x, y: pl.y }; } if (B2.state === 'blow' && B2.st > 0.5) break; }
    out.bellowsOutside = y0 === null ? null : +Math.hypot(pl.x - y0.x, pl.y - y0.y).toFixed(1);

    // Foreman: lifts its whistle (tell), then hastens allies near it, not far ones
    clear(); pl.x = c.x - 150; pl.y = c.y + 60; const F = spawn('foreman', 60, 0); const near = spawn('stoker', 90, 10); const far = spawn('stoker', -140, -60); F.cd = 0.05;
    let lifted = false; for (let i = 0; i < 90; i++) { step(1); if (F.state === 'lift') lifted = true; if (near.data.hasteT > 0) break; }
    out.foremanTell = lifted; out.hasteNear = +(near.data.hasteT || 0).toFixed(2); out.hasteFar = far.data.hasteT || 0; out.hastedSpd = near.spd();

    // Riveter: aim line tracks, then locks; three rivets go down the locked line; then it reloads
    clear(); pl.x = c.x + 100; pl.y = c.y; const R = spawn('riveter', -80, 0); R.cd = 0.01;
    let tracked = false, lockedA = null, fired = [];
    const real2 = w.proj.enemy.bind(w.proj); w.proj.enemy = (x, y, a, ...rest) => { fired.push(+a.toFixed(3)); return real2(x, y, a, ...rest); };
    for (let i = 0; i < 150; i++) {
      step(1);
      if (R.state === 'aim' && R.st < 0.4) { pl.y = c.y + Math.sin(i / 5) * 30; tracked = tracked || (!!R.data.aimLine && Math.abs(R.data.aimLine.a) > 0.05); }
      if (R.state === 'aim' && R.data.aimLine && R.data.aimLine.locked && lockedA === null) { lockedA = +R.data.aimLine.a.toFixed(3); pl.y = c.y - 60; }
      if (R.state === 'reload') break;
    }
    w.proj.enemy = real2;
    out.rivTracked = tracked; out.rivLocked = lockedA; out.rivShots = fired; out.rivReload = R.state === 'reload';

    // Brickback: the slab turns shots from the side it faces; from behind, full; after the slam, more
    clear(); pl.x = c.x + 100; pl.y = c.y; const K = spawn('brickback', 0, 0); step(60);
    out.brickFace = K.data.face;
    out.brickFront = hit(K, Math.PI);   // a shot travelling left, i.e. from the right (its face)
    out.brickBack = hit(K, 0);
    pl.x = c.x - 100; step(20); out.brickStillFacing = K.data.face; step(40); out.brickTurned = K.data.face;
    K.hp = K.maxHp = 100; K.setState('down'); out.brickDown = hit(K, 0);

    // a crowded boiler room of all four with friends: no errors, sane cost
    clear(); pl.x = c.x; pl.y = c.y + 80; pl.iframes = 1e9;
    for (const [id, dx, dy] of [['bellows', -80, -40], ['foreman', 80, -40], ['riveter', 0, -60], ['brickback', -60, 30], ['stoker', 60, 30], ['sootsprite', 0, -20], ['valvehead', 100, 0]]) spawn(id, dx, dy);
    const t0 = performance.now(); step(600); out.msPerStep = +((performance.now() - t0) / 600).toFixed(3);
    return out;
  })()`);
  let fails = 0;
  const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
  ok(r.bellowsTell, 'Bellows breathes in before it blows');
  ok(r.bellowsPush !== null && r.bellowsPush > 15, `its gust shoves you back inside the cone (${r.bellowsPush} px)`);
  ok(r.bellowsOutside !== null && r.bellowsOutside < 2, `outside the cone you are not moved (${r.bellowsOutside} px)`);
  ok(r.bellowsFireSpit >= 1, `a fire in the gust spits embers (${r.bellowsFireSpit})`);
  ok(r.foremanTell, 'Foreman lifts its whistle before it blows');
  ok(r.hasteNear > 2.5 && r.hastedSpd > 1.3, `allies near it are hastened (${r.hasteNear}s, x${r.hastedSpd})`);
  ok(!r.hasteFar, 'allies far from it are not');
  ok(r.rivTracked, "Riveter's aim line follows you");
  ok(r.rivLocked !== null, 'then it locks');
  ok(r.rivShots.length === 3 && r.rivShots.every((a: number) => Math.abs(a - r.rivLocked) < 0.01), `three rivets go down the locked line (${JSON.stringify(r.rivShots)} vs ${r.rivLocked})`);
  ok(r.rivReload, 'then it reloads');
  ok(r.brickFace === 1 && r.brickFront === 1.5 && r.brickBack === 10, `Brickback's slab turns shots from its face (front ${r.brickFront}, back ${r.brickBack})`);
  ok(r.brickStillFacing === 1 && r.brickTurned === -1, 'it turns to face you, but slowly');
  ok(r.brickDown === 13, `after the slam it takes more (${r.brickDown})`);
  ok(r.msPerStep < 4, `a crowded room steps in ${r.msPerStep} ms`);
  ok(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join('; '));
  await browser.close();
  if (fails) { console.log(fails + ' boiler checks failed'); process.exit(1); }
  console.log('all boiler checks passed');
})();
