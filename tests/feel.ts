// Movement and input feel checks: drives the simulation step by step (no wall-clock jitter) and
// measures acceleration, stopping, corner forgiveness around a rock, and whether button presses made
// during hit-stop or a room transition are kept. Needs the dev server (part of npm run test:e2e).
//   npx tsx tests/feel.ts
import { chromium } from 'playwright-core';
import { CHROME } from './browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(base); await page.waitForTimeout(2500);
  const r: any = await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game;
    g.menus.stack = []; g.newRun('marcus', 'FEELPRB2');
    await new Promise((res) => setTimeout(res, 2500));
    // freeze the real-time loop: from here the test steps the game itself
    window.requestAnimationFrame = () => 0;
    await new Promise((res) => setTimeout(res, 100));
    const w = d.world, pl = w.player, inp = g.input;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { g.step(1 / 60); inp.endStep(); } };
    const hold = (code, on) => { if (on) { if (!inp.down.has(code)) inp.pressed.add(code); inp.down.add(code); } else inp.down.delete(code); };
    for (const e of w.enemies) e.dead = true; w.enemies = []; w.room.cleared = true;
    const c = w.room.center(); const clear = () => { w.room.grid.fill(0); };
    clear(); pl.x = c.x - 80; pl.y = c.y; pl.vx = pl.vy = 0; step(5);
    const out = {};
    // acceleration: frames to 90% of top speed, stopping distance from top speed
    const top = 118 * pl.stats.speed;
    hold('KeyD', true); let f = 0; while (pl.vx < top * 0.9 && f < 120) { step(); f++; }
    out.framesTo90 = f; step(30);
    hold('KeyD', false); const x0 = pl.x; let fs = 0; while (Math.abs(pl.vx) > 0.5 && fs < 120) { step(); fs++; }
    out.stopFrames = fs; out.stopDist = +(pl.x - x0).toFixed(1); out.topSpeed = +top.toFixed(1);
    // corner forgiveness: a lone rock dead ahead; Marcus walks right, offset up/down from its centre
    const rc = Math.floor((c.x - w.room.ox) / 24), rr = Math.floor((c.y - w.room.oy) / 24);
    const corner = {};
    for (const off of [0, 6, 9, 11, 13, 15]) {
      clear(); w.room.grid[rr * w.room.cols + rc] = 1;
      const rcY = w.room.oy + rr * 24 + 12;
      pl.x = w.room.ox + rc * 24 - 40; pl.y = rcY + off; pl.vx = pl.vy = 0; step(2);
      hold('KeyD', true); step(70); hold('KeyD', false);
      corner[off] = { passed: pl.x > w.room.ox + rc * 24 + 30, dy: +(pl.y - (rcY + off)).toFixed(1) };
    }
    out.corner = corner; clear();
    // a bomb pressed during hit-stop
    pl.bombs = 3; const b0 = w.bombs.length;
    w.hitstopT = 0.08; hold('Space', true); step(1); hold('Space', false); step(10);
    out.bombDuringHitstop = w.bombs.length > b0;
    // a bomb pressed during a room transition
    const b1 = w.bombs.length;
    w.transition = { snap: null, dx: 0, dy: 0, t: 0, dur: 0.3, kind: 'slide' };
    hold('Space', true); step(2); hold('Space', false); step(30);
    out.bombDuringTransition = w.bombs.length > b1;
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    return out;
  })()`);
  console.log(JSON.stringify(r));
  let fails = 0;
  const ok = (c: unknown, m: string) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
  ok(r.framesTo90 <= 10, `reaches 90% speed within 10 frames (${r.framesTo90})`);
  ok(r.stopDist < 12 && r.stopFrames <= 30, `stops within 12px and half a second (${r.stopDist}px, ${r.stopFrames} frames)`);
  ok(r.corner[0].passed === false && r.corner[6].passed === false, 'walking squarely into a rock stops you');
  ok(r.corner[9].passed && r.corner[11].passed && r.corner[13].passed, 'clipping a rock\'s edge slides you round it');
  ok(r.bombDuringHitstop, 'a bomb pressed during hit-stop is placed');
  ok(r.bombDuringTransition, 'a bomb pressed during a room slide is placed when it ends');
  await browser.close();
  console.log(fails ? `${fails} feel check(s) FAILED` : 'all feel checks passed');
  process.exit(fails ? 1 : 0);
})();
