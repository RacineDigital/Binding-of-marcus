// Walk into a boss room through its door while firing (the path that hung Snap and Old Stoker in 3.5-3.7).
//   BOSS=twinsnips npx tsx tests/tools/doorwalk.ts
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  for (const fire of ['same']) for (const seed of ['FREEZE1']) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs: string[] = []; const hb: string[] = [];
    p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack ?? '').split('\n').slice(0, 6).join(' | ')));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); if (m.text().startsWith('HB')) hb.push(m.text()); });
    p.on('crash', () => { console.log('PAGE CRASHED; last heartbeats:\n' + hb.slice(-12).join('\n')); });
    await p.goto(base); await p.waitForTimeout(2500);
    await p.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', '${seed}'); })()`); await p.waitForTimeout(2000);
    const info: any = await p.evaluate(`(async () => { const d = window.__bomDebug, w = d.world; const boss = w.floor.rooms.find(r => r.type === 'boss'); boss.bossId = '${process.env.BOSS || 'twinsnips'}';
      const nb = w.floor.rooms.find(r => r.doors.some(x => x.to === boss.id)); const door = nb.doors.find(x => x.to === boss.id);
      d.goto(nb.id); d.killAll(); await new Promise(r => setTimeout(r, 1500)); nb.cleared = true; w.room.cleared = true; w.lockdown = false;
      const dd = w.doors.find(x => x.def.to === boss.id); for (const x of w.doors) x.open = 1;
      const c = w.room.center(); const k = 0.55; w.player.x = c.x + (dd.x - c.x) * k; w.player.y = c.y + (dd.y - c.y) * k;
      return { side: door.side, nb: nb.id, boss: boss.id }; })()`);
    console.log('setup done', JSON.stringify(info));
    await p.evaluate(`(() => { const d = window.__bomDebug; let n = 0; const tick = () => { const w = d.world; if (w && w.room && w.room.type === 'boss' && w.roomTime > 1.9) { n++; console.log('HB ' + n + ' t=' + w.roomTime.toFixed(3) + ' proj=' + w.proj.count() + ' en=' + w.enemies.length + ' fam=' + w.familiars.length + ' fx=' + w.fx.parts.filter(p => p.active).length + ' tele=' + w.telegraphs.length + ' after=' + (w.timers ? w.timers.length : '?') + ' b=' + w.enemies.filter(e => e.isBoss).map(e => e.def.id + ':' + e.state + ':' + e.x.toFixed(0) + ',' + e.y.toFixed(0)).join(' ') + ' pl=' + w.player.x.toFixed(0) + ',' + w.player.y.toFixed(0) + ' hp=' + w.player.health.red); } requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
    const MOVE = ['KeyW', 'KeyD', 'KeyS', 'KeyA'][info.side], FIRE = { same: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][info.side], opposite: ['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight'][info.side], side: ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'][info.side] }[fire]!;
    await p.keyboard.down(FIRE); await p.waitForTimeout(300); await p.keyboard.down(MOVE);
    const t0 = Date.now(); let maxGap = 0, entered = false; const samples: any[] = [];
    while (Date.now() - t0 < 9000) {
      const s0 = Date.now();
      const st: any = await Promise.race([p.evaluate(`(() => { const d = window.__bomDebug, w = d.world; return { room: w.room.id, scene: d.game.scene, t: +w.roomTime.toFixed(2), b: w.enemies.filter(e => e.isBoss && !e.dead).map(e => e.def.id + ':' + e.state).join(','), proj: w.proj.count(), hs: +w.hitstopT.toFixed(2), lock: w.inputLocked(), trans: !!w.transition }; })()`), new Promise((r) => setTimeout(() => r({ hung: true }), 4000))]);
      const gap = Date.now() - s0; maxGap = Math.max(maxGap, gap);
      if (st.hung) { samples.push('HUNG'); break; }
      if (st.room === info.boss) entered = true;
      if (samples.length < 40) samples.push(st);
      console.log(Date.now() - t0, JSON.stringify(st));
      if (entered && Date.now() - t0 > 4000) await p.keyboard.up(MOVE);
      await p.waitForTimeout(150);
    }
    await p.keyboard.up(FIRE); await p.keyboard.up(MOVE).catch(() => {});
    const last = samples[samples.length - 1];
    console.log(fire.padEnd(8), seed, 'entered', entered, 'maxEvalMs', maxGap, 'last', JSON.stringify(last), errs.length ? 'ERR ' + errs.slice(0, 3).join(' || ') : '');
    await p.close();
  }
  await b.close();
})();
