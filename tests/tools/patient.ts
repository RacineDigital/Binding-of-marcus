// An overpowered build against the Patient in Room 4, for real: the actual Room 4 floor and its
// ending rules, the player's own hearts (no god mode), a strafing AI. Reports the outcome and where
// frame time goes during the fight (logic vs drawing, worst frames, what was on screen then).
//   npx tsx tests/tools/patient.ts [seconds] [god]
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
const secs = Number(process.argv[2] ?? 180), god = process.argv[3] === 'god';
const OP = ['powder_ink', 'prism', 'split_nib', 'lamp_lure', 'long_needle', 'static_heart', 'ink_pact', 'ink_horns', 'grandpas_pipe', 'black_quill',
  'hot_cocoa', 'gavyns_pouch', 'marrow', 'iron_filings', 'spectacles', 'shadow_twin', 'moth_friend', 'thimble', 'lodestone', 'tin_heart', 'sunday_roast'];
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message, (e.stack ?? '').split('\n').slice(0, 4).join(' | ')); });
  await page.goto(base); await page.waitForTimeout(2500);
  await page.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', 'ROOMFOUR'); })()`);
  await page.waitForTimeout(2000);
  const where = await page.evaluate(`(async () => { const d = window.__bomDebug, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    d.world.run.flags.room4 = true; d.world.run.flags.hospital = true;
    for (let i = 0; i < 8 && d.world.floor.theme.id !== 'room4'; i++) { d.nextFloor(); await sleep(2200); }
    return d.world.floor.theme.id + ' floor ' + d.world.run.floorIndex; })()`);
  console.log('arrived:', where);
  const r: any = await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const id of ${JSON.stringify(OP)}) d.give(id);
    const w = d.world; ${god ? 'd.god();' : ''}
    const room = w.floor.rooms.find((r) => r.type === 'boss'); d.goto(room.id); await sleep(300);
    const P = () => d.world.player, inp = g.input.down;
    const bossOf = () => d.world.enemies.find((e) => e.isBoss && !e.dead);
    // stage timers: wrap the big draw calls
    const stage = {}; const wrap = (obj, name, label) => { const f = obj[name].bind(obj); obj[name] = (...a) => { const s = performance.now(); const r = f(...a); stage[label] = (stage[label] ?? 0) + performance.now() - s; return r; }; };
    wrap(w.proj, 'render', 'shots'); wrap(w.fx, 'render', 'particles'); wrap(w.r, 'present', 'present');
    const t0 = performance.now(); let last = t0, frames = 0, upd = 0, ren = 0; const slow = [];
    let maxProj = 0, maxEnemyProj = 0, maxFx = 0, hp0 = 0, forms = new Set();
    // per-frame sampling
    let run = true;
    const tick = () => { const n = performance.now(), gap = n - last; last = n; frames++; upd += g.perf.update; ren += g.perf.render;
      const W = d.world, b = bossOf(); const pc = W.proj.count(), ep = W.proj.list.filter((p) => p.active && p.team === 1).length;
      maxProj = Math.max(maxProj, pc); maxEnemyProj = Math.max(maxEnemyProj, ep); const fx = W.fx.parts.filter((p) => p.active).length; maxFx = Math.max(maxFx, fx);
      if (b) { if (!hp0) hp0 = b.maxHp; if (b.data.form) forms.add(b.data.form); }
      if (gap > 120 && slow.length < 12) slow.push({ at: +((n - t0) / 1000).toFixed(1), gap: Math.round(gap), upd: +g.perf.update.toFixed(1), ren: +g.perf.render.toFixed(1), proj: pc, enemyProj: ep, fx, attack: b && b.data.attack ? b.data.attack.id : b ? b.state : '-' });
      if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    let died = false;
    while (performance.now() - t0 < ${secs * 1000}) {
      const b = bossOf(), pl = P();
      if (pl.dead || g.scene === 'dead') { died = true; break; }
      if (!b && performance.now() - t0 > 6000) break;
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) inp.delete(k);
      if (b) {
        const dx = b.x - pl.x, dy = b.y - pl.y, dist = Math.hypot(dx, dy) || 1, now = performance.now();
        inp.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
        const s = Math.floor((now - t0) / 2600) % 2 ? 1 : -1;
        let mx = -dy / dist * s, my = dx / dist * s;
        if (dist > 140) { mx += dx / dist; my += dy / dist; } else if (dist < 90) { mx -= dx / dist; my -= dy / dist; }
        if (mx > 0.35) inp.add('KeyD'); if (mx < -0.35) inp.add('KeyA'); if (my > 0.35) inp.add('KeyS'); if (my < -0.35) inp.add('KeyW');
      }
      await sleep(30);
    }
    run = false; for (const k of [...inp]) inp.delete(k);
    const b = bossOf(), W = d.world;
    return { secs: +((performance.now() - t0) / 1000).toFixed(1), died, won: !b && !died, bossHpLeft: b ? Math.round(b.hp) + '/' + Math.round(b.maxHp) : 0, phase: b ? b.data.phase : '-',
      forms: [...forms], dmgTaken: W.run.stats.damageTaken / 2, fps: +(frames / ((performance.now() - t0) / 1000)).toFixed(1), updateMs: +(upd / frames).toFixed(2), renderMs: +(ren / frames).toFixed(2),
      maxProj, maxEnemyProj, maxFx, slow, stageMs: Object.fromEntries(Object.entries(stage).map(([k, v]) => [k, +(v / frames).toFixed(2)])), stats: { dmg: +W.player.stats.damage.toFixed(1), tears: +W.player.stats.fireRate.toFixed(2), hearts: W.player.health.redMax / 2 } };
  })()`);
  console.log(JSON.stringify(r, null, 1));
  console.log(errors.length ? 'ERRORS ' + errors.length : 'no page errors');
  await browser.close();
})();
