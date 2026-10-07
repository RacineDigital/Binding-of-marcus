// Boss bench (npm run dev first): fights chosen bosses with weak, ordinary and strong builds using a
// simple strafing AI (circles at ~100px, fires along the nearest axis), keeps the player alive and
// counts the hits it takes, and reports time to kill, how much damage landed in the boss's exposed
// windows, the attack order it used, frame rate and page errors.
//   npx tsx tests/tools/bossbench.ts grubmother,wardrobe [weak,normal,strong]
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
const bosses = (process.argv[2] ?? 'grubmother,wardrobe,snipA+snipB,oldstoker,furnaceheart').split(',');
const builds = (process.argv[3] ?? 'weak,normal,strong').split(',');
const BUILDS: Record<string, string[]> = {
  weak: [],
  normal: ['iron_filings', 'hot_cocoa', 'twin_wick', 'spectacles'],
  strong: ['triple_seam', 'powder_ink', 'copper_filament', 'rubber_band', 'split_nib', 'long_needle', 'lamp_lure', 'ink_pact', 'grandpas_pipe', 'moth_friend', 'static_heart', 'crayon_box'],
};
const CH2 = new Set(['oldstoker', 'furnaceheart']);
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message, (e.stack ?? '').split('\n').slice(0, 4).join(' | ')); });
  await page.goto(base); await page.waitForTimeout(2500);
  for (const boss of bosses) for (const build of builds) {
    await page.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', 'BENCH${boss.length}'); })()`);
    await page.waitForTimeout(1500);
    if (CH2.has(boss)) { await page.evaluate('window.__bomDebug.nextFloor()'); await page.waitForTimeout(2200); }
    const r = await page.evaluate(`(async () => {
      const d = window.__bomDebug, g = d.game, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (const id of ${JSON.stringify(BUILDS[build])}) d.give(id);
      const w = d.world, room = w.floor.rooms.find((r) => r.type === 'boss');
      room.bossId = '${boss}'; room.cleared = false;
      d.goto(room.id); await sleep(300);
      const pl = () => d.world.player, inp = g.input.down;
      const bossesAlive = () => d.world.enemies.filter((e) => e.isBoss && !e.dead);
      const seqs = {}; let exposedDmg = 0, totalDmg = 0, frames = 0, worst = 0, last = performance.now();
      // tally damage and attacks
      const orig = d.world.damageEnemy.bind(d.world);
      d.world.damageEnemy = (e, dmg, info) => { const h0 = e.hp; orig(e, dmg, info); if (e.isBoss) { const lost = Math.max(0, h0 - Math.max(0, e.hp)); totalDmg += lost; if (e.data.exposed) exposedDmg += lost; } };
      const t0 = performance.now(); let hits = 0, lastTaken = d.world.run.stats.damageTaken; const hitBy = {};
      while (performance.now() - t0 < 90000) {
        const now = performance.now(); worst = Math.max(worst, now - last); last = now; frames++;
        const bs = bossesAlive(); if (!bs.length && performance.now() - t0 > 4000) break;
        const P = pl(); const H = P.health; if (H.red < H.redMax) H.red = H.redMax; P.dead = false;
        const taken = d.world.run.stats.damageTaken; if (taken > lastTaken) { hits++; lastTaken = taken; const by = bs.find((b) => b.state === 'attack' || b.state === 'windup'); const k = by ? by.data.attack.id : 'contact/idle'; hitBy[k] = (hitBy[k] ?? 0) + 1; }
        for (const b of bs) { const a = b.data.attack; if (a && b.state === 'attack' && b.data._lastSeen !== b.data.seqI + ':' + a.id) { b.data._lastSeen = b.data.seqI + ':' + a.id; (seqs[b.def.id] ??= []).push(a.id); } }
        for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) inp.delete(k);
        const b = bs[0];
        if (b) {
          const dx = b.x - P.x, dy = b.y - P.y, dist = Math.hypot(dx, dy);
          inp.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
          // strafe: perpendicular, flipping every few seconds; close in or back off to ~100px
          const s = Math.floor((now - t0) / 2600) % 2 ? 1 : -1;
          let mx = -dy / dist * s, my = dx / dist * s;
          if (dist > 120) { mx += dx / dist; my += dy / dist; } else if (dist < 80) { mx -= dx / dist; my -= dy / dist; }
          if (mx > 0.35) inp.add('KeyD'); if (mx < -0.35) inp.add('KeyA'); if (my > 0.35) inp.add('KeyS'); if (my < -0.35) inp.add('KeyW');
        }
        await sleep(30);
      }
      for (const k of [...inp]) inp.delete(k);
      const secs = (performance.now() - t0) / 1000;
      return { secs: +secs.toFixed(1), killed: !bossesAlive().length, hits, exposedShare: totalDmg ? +(exposedDmg / totalDmg).toFixed(2) : 0, dmg: Math.round(totalDmg), fps: +(frames / secs).toFixed(0), worstMs: Math.round(worst), hitBy, seqs };
    })()`);
    console.log(JSON.stringify({ boss, build, ...(r as object) }));
  }
  console.log(errors.length ? 'ERRORS ' + errors.length : 'no page errors');
  await browser.close();
})();
