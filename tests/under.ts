// Chapter III 2.0 creatures in a real browser, stepped frame by frame (part of npm run test:e2e):
// each one's tell, behaviour and counterplay works as its description says.
//   npx tsx tests/under.ts
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
    g.menus.stack = []; g.newRun('marcus', 'UNDER2');
    await new Promise((res) => setTimeout(res, 2500));
    window.requestAnimationFrame = () => 0;
    await new Promise((res) => setTimeout(res, 100));
    const w = d.world, pl = w.player, inp = g.input, out = {};
    inp.moveVector = () => ({ x: 0, y: 0 }); inp.aimVector = () => null;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { g.step(1 / 60); inp.endStep(); } };
    const c = w.room.center();
    const clear = () => { for (const e of w.enemies) e.dead = true; w.enemies = []; w.proj.clear(); w.pickups = []; w.creep = []; w.recentDeaths = []; w.room.grid.fill(0); w.room.cleared = false; w.lockdown = true; w.roomTime = 5; };
    const spawn = (id, dx = 0, dy = -40) => { const e = d.spawn(id, c.x + dx, c.y + dy); e.spawnT = 0; return e; };
    d.god();

    // Sluice Keeper: a band trickles first (no push), then the current carries you; outside it, nothing
    clear(); pl.x = c.x; pl.y = c.y; const K = spawn('sluicekeeper', 150, -80); K.cd = 0.01; step(2);
    const f = K.data.flow; out.flowMade = !!f;
    const p0 = { x: pl.x, y: pl.y }; step(30); out.warnMove = +Math.hypot(pl.x - p0.x, pl.y - p0.y).toFixed(1);
    step(60); out.flowMove = +Math.hypot(pl.x - p0.x, pl.y - p0.y).toFixed(1);
    clear(); pl.x = c.x; pl.y = c.y; const K2 = spawn('sluicekeeper', 150, -80); K2.cd = 0.01; step(2);
    if (K2.data.flow.horiz) pl.y += 70; else pl.x += 90; const p1 = { x: pl.x, y: pl.y }; step(80); out.outsideMove = +Math.hypot(pl.x - p1.x, pl.y - p1.y).toFixed(1);

    // Bilge Priest: walks to a fresh body and raises it at half strength; standing on the spot breaks it
    clear(); pl.x = c.x - 150; pl.y = c.y + 70; const P = spawn('bilgepriest', 60, -40); spawn('valvehead', 120, 40).hp = 1e5; const v = spawn('stoker', 20, -40);
    w.killEnemy(v); let rite = false, raised = null;
    for (let i = 0; i < 300 && !raised; i++) { step(1); if (P.state === 'rite') rite = true; raised = w.enemies.find((e) => e.def.id === 'stoker' && !e.dead && e.data.revived); }
    out.priestRite = rite; out.raised = raised ? +(raised.hp / raised.maxHp).toFixed(2) : null;
    clear(); pl.x = c.x - 150; pl.y = c.y + 70; const P2 = spawn('bilgepriest', 60, -40); spawn('valvehead', 120, 40).hp = 1e5; const v2 = spawn('stoker', 20, -40);
    w.killEnemy(v2); let broke = false;
    for (let i = 0; i < 300; i++) { step(1); if (P2.state === 'rite') { pl.x = c.x + 20; pl.y = c.y - 40; } if (P2.state === 'stagger') { broke = true; break; } }
    step(100); out.riteBroken = broke && !w.enemies.some((e) => e.def.id === 'stoker' && !e.dead);

    // Fumarole: bubbles (tell) then belches a slow cloud that drifts toward you; at most three
    clear(); pl.x = c.x + 120; pl.y = c.y; const F = spawn('fumarole', -80, 0); F.cd = 0.8; let bubbled = false;
    for (let i = 0; i < 60; i++) { step(1); if (F.frame === 1) bubbled = true; }
    const cl = w.proj.list.filter((p) => p.active && p.team === 1); out.fumTell = bubbled; out.clouds = cl.length; out.cloudSpeed = cl[0] ? +Math.hypot(cl[0].vx, cl[0].vy).toFixed(1) : null;
    for (let i = 0; i < 60 * 12; i++) { step(1); pl.x = c.x + 120; pl.y = c.y + (i % 120 < 60 ? 50 : -50); }
    out.cloudsCap = F.data.clouds.length;

    clear(); pl.x = c.x; pl.y = c.y + 80; pl.iframes = 1e9;
    for (const [id, dx, dy] of [['sluicekeeper', -80, -40], ['bilgepriest', 80, -40], ['fumarole', 0, -60], ['rat', -60, 30], ['leech', 60, 30], ['drowner', 0, -20], ['bloater', 100, 0]]) spawn(id, dx, dy);
    const t0 = performance.now(); step(600); out.msPerStep = +((performance.now() - t0) / 600).toFixed(3);
    return out;
  })()`);
  let fails = 0;
  const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
  ok(r.flowMade, 'Sluice Keeper marks a band through where you stand');
  ok(r.warnMove < 1, `while it trickles, nothing moves you (${r.warnMove} px)`);
  ok(r.flowMove > 30, `then the current carries you (${r.flowMove} px)`);
  ok(r.outsideMove < 1, `outside the band you are not moved (${r.outsideMove} px)`);
  ok(r.priestRite, 'Bilge Priest goes to the body and chants');
  ok(r.raised === 0.5, `the creature stands up again at half strength (${r.raised})`);
  ok(r.riteBroken, 'standing on the spot breaks the rite');
  ok(r.fumTell, 'Fumarole bubbles before it belches');
  ok(r.clouds === 1 && r.cloudSpeed < 60, `a slow cloud drifts out (${r.clouds}, ${r.cloudSpeed} px/s)`);
  ok(r.cloudsCap <= 3, `no more than three clouds at once (${r.cloudsCap})`);
  ok(r.msPerStep < 4, `a crowded room steps in ${r.msPerStep} ms`);
  ok(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join('; '));
  await browser.close();
  if (fails) { console.log(fails + ' underworks checks failed'); process.exit(1); }
  console.log('all underworks checks passed');
})();
