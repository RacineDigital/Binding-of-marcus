// Chapter I 2.0 creatures in a real browser, stepped frame by frame (part of npm run test:e2e):
// each one's tell, behaviour and counterplay works as its description says.
//   npx tsx tests/cellar.ts
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
    g.menus.stack = []; g.newRun('marcus', 'CELLAR2');
    await new Promise((res) => setTimeout(res, 2500));
    window.requestAnimationFrame = () => 0;
    await new Promise((res) => setTimeout(res, 100));
    const w = d.world, pl = w.player, inp = g.input, out = {};
    const step = (n = 1) => { for (let i = 0; i < n; i++) { g.step(1 / 60); inp.endStep(); } };
    const c = w.room.center();
    const clear = () => { for (const e of w.enemies) e.dead = true; w.enemies = []; w.proj.clear(); w.pickups = []; w.creep = []; w.room.grid.fill(0); w.room.cleared = false; w.lockdown = true; w.roomTime = 5; };
    const spawn = (id, dx = 0, dy = -40) => { const e = d.spawn(id, c.x + dx, c.y + dy); e.spawnT = 0; return e; };
    const hit = (e, n = 10) => { const hp = e.hp; w.damageEnemy(e, n, { ang: Math.PI / 2, knock: 0, source: 'shot' }); return +(hp - e.hp).toFixed(2); };
    d.god();

    // Paper Lurker: disguised and harmless to touch while buried; wakes when approached, with a tell
    clear(); pl.x = c.x; pl.y = c.y + 70; const L = spawn('lurker'); step(30);
    out.lurkStill = L.state === 'buried' && L.data.noContact === true && Math.hypot(L.x - c.x, L.y - (c.y - 40)) < 1;
    const fodder = spawn('pillbug', 100, 30); fodder.hp = 1e5;
    pl.x = c.x; pl.y = c.y - 2; step(2); out.lurkTell = L.state === 'tell';
    step(30); out.lurkBurst = L.state === 'skitter' && !L.data.noContact;
    // shot while buried: falls out stunned and takes 1.5x
    clear(); pl.x = c.x; pl.y = c.y + 70; const L2 = spawn('lurker'); L2.hp = L2.maxHp = 100; const f2 = spawn('pillbug', 100, 30); f2.hp = 1e5; step(5);
    out.lurkShotDmg = hit(L2); out.lurkStunned = L2.state === 'stun';
    // alone in the room it gives itself up
    clear(); pl.x = c.x; pl.y = c.y + 80; const L3 = spawn('lurker'); step(60 * 3.4); out.lurkAloneReveals = L3.state !== 'buried';

    // Mildew: glows, then puffs three spore patches; they hurt; killing it dries them up
    clear(); pl.x = c.x - 120; pl.y = c.y + 60; const M = spawn('mildew'); M.cd = 0.8; step(20); out.mildewSwells = M.frame === 1;
    step(40); out.mildewPatches = w.creep.filter((k) => k.team === 'enemy').length;
    w.killEnemy(M); step(40); out.mildewDried = w.creep.filter((k) => k.team === 'enemy').length;

    // Lampkeeper: allies inside its light take half damage; outside, full
    clear(); pl.x = c.x; pl.y = c.y + 90; const K = spawn('lampkeeper', 0, -40); const A = spawn('pillbug', 20, -40); A.hp = 1e5; const B = spawn('pillbug', -150, 40); B.hp = 1e5;
    K.x = A.x - 15; K.y = A.y;
    out.wardIn = hit(A); out.wardOut = hit(B); out.keeperSelf = hit(K, 2);
    // it stays away from you and behind its friends
    clear(); pl.x = c.x - 100; pl.y = c.y; const K2 = spawn('lampkeeper', 0, 0); const A2 = spawn('valvehead', 40, 0); A2.hp = 1e5; step(180);
    out.keeperBehind = K2.x > A2.x - 10; out.keeperPos = [Math.round(K2.x - c.x), Math.round(K2.y - c.y), Math.round(A2.x - c.x), Math.round(A2.y - c.y), K2.state];

    // Old Trunk: rattle, hop with a landing mark at the player's spot, slam (shots), then gape open (1.6x)
    clear(); pl.x = c.x + 40; pl.y = c.y; const T = spawn('trunk', -40, 0); T.cd = 0.1; w.roomTime = 5;
    let rattled = false, mark = null, opened = false, shots = 0;
    const real = w.proj.enemy.bind(w.proj); w.proj.enemy = (...a) => { shots++; return real(...a); };
    for (let i = 0; i < 160 && !opened; i++) { step(1); if (T.state === 'rattle') rattled = true; if (T.data.landAt && !mark) mark = { ...T.data.landAt }; if (T.state === 'open') opened = true; }
    out.trunkRattled = rattled; out.trunkMarkNearPlayer = !!mark && Math.hypot(mark.x - (c.x + 40), mark.y - c.y) < 12; out.trunkOpened = opened;
    out.trunkOpenDmg = hit(T); step(40); out.trunkShots = shots; w.proj.enemy = real;
    T.setState('idle'); T.cd = 9; out.trunkClosedDmg = hit(T);

    // a crowded cellar room of all four plus friends for a while: no errors, sane cost
    clear(); pl.x = c.x; pl.y = c.y + 80; pl.iframes = 1e9;
    for (const [id, dx, dy] of [['lurker', -80, -40], ['mildew', 80, -40], ['lampkeeper', 0, -60], ['trunk', -60, 30], ['gasper', 60, 30], ['ragcrawler', 0, -20], ['mitenest', 100, 0]]) spawn(id, dx, dy);
    const t0 = performance.now(); step(600); out.msPerStep = +((performance.now() - t0) / 600).toFixed(3);
    return out;
  })()`);
  let fails = 0;
  const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
  ok(r.lurkStill, 'Paper Lurker waits still as a heap and cannot hurt you while buried');
  ok(r.lurkTell, 'walking close starts its shudder');
  ok(r.lurkBurst, 'then it bursts out and can hurt you');
  ok(r.lurkShotDmg === 15 && r.lurkStunned, `shooting the heap first knocks it out stunned for 1.5x damage (${r.lurkShotDmg})`);
  ok(r.lurkAloneReveals, 'alone in a room it gives itself up');
  ok(r.mildewSwells, 'Mildew glows and swells before it puffs');
  ok(r.mildewPatches === 3, `it puffs three spore patches (${r.mildewPatches})`);
  ok(r.mildewDried === 0, `killing it dries its spores up (${r.mildewDried} left)`);
  ok(r.wardIn === 5 && r.wardOut === 10, `Lampkeeper's light halves damage to allies (in ${r.wardIn}, out ${r.wardOut})`);
  ok(r.keeperSelf === 2, 'the Lampkeeper itself is not protected');
  ok(r.keeperBehind, 'it stands behind its allies, away from you ' + JSON.stringify(r.keeperPos));
  ok(r.trunkRattled && r.trunkOpened, 'Old Trunk rattles, hops and gapes open');
  ok(r.trunkMarkNearPlayer, 'its landing mark shows where you stood');
  ok(r.trunkShots >= 4, `its slam throws shots (${r.trunkShots})`);
  ok(r.trunkOpenDmg === 16 && r.trunkClosedDmg === 7.5, `open it takes 1.6x, closed 0.75x (${r.trunkOpenDmg}, ${r.trunkClosedDmg})`);
  ok(r.msPerStep < 4, `a crowded room steps in ${r.msPerStep} ms`);
  ok(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join('; '));
  await browser.close();
  if (fails) { console.log(fails + ' cellar checks failed'); process.exit(1); }
  console.log('all cellar checks passed');
})();
