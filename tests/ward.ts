// Chapter IV 2.0 creatures in a real browser, stepped frame by frame (part of npm run test:e2e):
// each one's tell, behaviour and counterplay works as its description says.
//   npx tsx tests/ward.ts
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
    g.menus.stack = []; g.newRun('marcus', 'WARD2');
    await new Promise((res) => setTimeout(res, 2500));
    window.requestAnimationFrame = () => 0;
    await new Promise((res) => setTimeout(res, 100));
    const w = d.world, pl = w.player, inp = g.input, out = {};
    inp.moveVector = () => ({ x: 0, y: 0 }); inp.aimVector = () => null;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { g.step(1 / 60); inp.endStep(); } };
    const c = w.room.center();
    const clear = () => { for (const e of w.enemies) e.dead = true; w.enemies = []; w.proj.clear(); w.pickups = []; w.creep = []; w.room.grid.fill(0); w.room.cleared = false; w.lockdown = true; w.roomTime = 5; };
    const spawn = (id, dx = 0, dy = -40) => { const e = d.spawn(id, c.x + dx, c.y + dy); e.spawnT = 0; return e; };
    const hit = (e, n = 10) => { const hp = e.hp; w.damageEnemy(e, n, { ang: 0, knock: 0, source: 'shot' }); return +(hp - e.hp).toFixed(2); };
    d.god();

    // Spilled Pills: straight lines that bounce off walls; a wobble before turning toward you
    clear(); pl.x = c.x; pl.y = c.y + 90; const P = spawn('pill', 0, -20); P.data.a = 0; P.cd = 9;
    let bounced = false; for (let i = 0; i < 240; i++) { step(1); if (Math.cos(P.data.a) < -0.9) { bounced = true; break; } }
    out.pillBounce = bounced;
    P.cd = 0.01; let wobbled = false, turned = null; for (let i = 0; i < 40; i++) { step(1); if (P.state === 'wobble') wobbled = true; if (wobbled && P.state === 'idle') { turned = P.data.a; break; } }
    out.pillWobble = wobbled; out.pillTowardYou = turned !== null && Math.abs(Math.atan2(Math.sin(turned - Math.atan2(pl.y - P.y, pl.x - P.x)), Math.cos(turned - Math.atan2(pl.y - P.y, pl.x - P.x)))) < 0.4;

    // Monitor: flashes (alarm) before the stream; six blips, all on one path (same angle and weave)
    clear(); pl.x = c.x + 120; pl.y = c.y; const M = spawn('monitor', -80, 0); M.cd = 0.01;
    const shots = []; const real = w.proj.enemy.bind(w.proj); w.proj.enemy = (x, y, a, sp, o) => { shots.push([+a.toFixed(3), o && o.wig]); return real(x, y, a, sp, o); };
    let alarm = false; for (let i = 0; i < 150; i++) { step(1); if (M.state === 'alarm' && M.frame === 1) alarm = true; if (shots.length && M.state === 'idle') break; }
    w.proj.enemy = real;
    out.monAlarm = alarm; out.monShots = shots.length; out.monOnePath = shots.every((s) => s[0] === shots[0][0] && s[1] === 16);

    // Mourner: kneels by the nearest other; while it holds, that one takes nothing; hitting it breaks
    clear(); pl.x = c.x - 150; pl.y = c.y + 70; const Mo = spawn('mourner', 60, -40); const A = spawn('valvehead', 20, -40); A.hp = A.maxHp = 1e5;
    let knelt = false; for (let i = 0; i < 200; i++) { step(1); if (Mo.state === 'kneel' && Mo.st > 0.6) { knelt = true; break; } }
    out.mournKneel = knelt; out.heldDmg = hit(A);
    hit(Mo, 1); out.mournBroke = Mo.state !== 'kneel'; out.freedDmg = hit(A);
    for (let i = 0; i < 300; i++) { step(1); if (Mo.state === 'kneel' && Mo.st > 0.6) break; }
    out.reKnelt = Mo.state === 'kneel'; w.killEnemy(Mo); out.afterDeathDmg = hit(A);

    clear(); pl.x = c.x; pl.y = c.y + 80; pl.iframes = 1e9;
    for (const [id, dx, dy] of [['pill', -80, -40], ['pill', -60, -40], ['pill', -70, -30], ['monitor', 80, -40], ['mourner', 0, -60], ['orderly', -60, 30], ['nursedoll', 60, 30], ['wheelwraith', 0, -20], ['sheetghost', 100, 0]]) spawn(id, dx, dy);
    const t0 = performance.now(); step(600); out.msPerStep = +((performance.now() - t0) / 600).toFixed(3);
    return out;
  })()`);
  let fails = 0;
  const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
  ok(r.pillBounce, 'Spilled Pills roll straight and bounce off walls');
  ok(r.pillWobble && r.pillTowardYou, 'they wobble, then turn toward you');
  ok(r.monAlarm, 'Monitor flashes its alarm before it streams');
  ok(r.monShots === 6 && r.monOnePath, `six blips, all on one weaving path (${r.monShots})`);
  ok(r.mournKneel, 'Mourner kneels beside the nearest other creature');
  ok(r.heldDmg === 0, `while it holds, that creature takes nothing (${r.heldDmg})`);
  ok(r.mournBroke && r.freedDmg === 10, `hitting the Mourner breaks the hold (${r.freedDmg})`);
  ok(r.reKnelt, 'after a while it kneels again');
  ok(r.afterDeathDmg === 10, 'killing it frees its charge for good');
  ok(r.msPerStep < 4, `a crowded room steps in ${r.msPerStep} ms`);
  ok(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join('; '));
  await browser.close();
  if (fails) { console.log(fails + ' ward checks failed'); process.exit(1); }
  console.log('all ward checks passed');
})();
