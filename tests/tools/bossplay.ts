// Boss play-check (npm run dev first): drops Marcus into each boss's room with a simple strafing AI,
// keeps him alive, and screenshots the fight at normal game size: idle, the first wind-up, the first
// attack, a hit flinch, after the phase change (its HP is knocked under the line), and the death.
// Also records which rig sets were shown, the frame rate and any page errors.
//   npx tsx tests/tools/bossplay.ts <outDir> [id,id,...] [--hitboxes]
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
import * as fs from 'fs';
const out = process.argv[2] ?? 'test-output/bossplay';
const ids = (process.argv[3] ?? 'grubmother,wardrobe,snipA+snipB,furnaceheart,oldstoker,ratking,bilgemaw,matron,sleepwalker,ossuaryknight,mothmother,bellringer,choirmaster,blottedman,unbound,itremembers,thornwife,rimebride,pendulum,typesetter,bookbinder,ironlung,patient,unwritten,author').split(',');
const hit = process.argv.includes('--hitboxes');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message, (e.stack ?? '').split('\n').slice(0, 4).join(' | ')); });
  await page.goto('http://localhost:5173/'); await page.waitForTimeout(2500);
  const shot = (name: string) => page.screenshot({ path: `${out}/${name}.png` });
  for (const boss of ids) {
    await page.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', 'PLAY${boss.length}'); })()`);
    await page.waitForTimeout(1200);
    await page.evaluate(`(async () => {
      const d = window.__bomDebug, w = d.world, room = w.floor.rooms.find((r) => r.type === 'boss');
      room.bossId = '${boss}'; room.cleared = false;
      d.give('iron_filings'); d.give('hot_cocoa');
      d.goto(room.id); d.god(); ${hit ? 'd.hitboxes(true);' : ''}
      // a strafing driver, run every frame from a timer
      const g = d.game, inp = g.input.down;
      clearInterval(window.__drv);
      window.__seen = {}; window.__fr = 0; window.__t0 = performance.now(); window.__worst = 0; let last = performance.now();
      const { rigFrame } = await import('/src/bosses/rig.ts');
      window.__drv = setInterval(() => {
        const now = performance.now(); window.__worst = Math.max(window.__worst, now - last); last = now; window.__fr++;
        const w = d.world, P = w.player; P.health.red = P.health.redMax;
        for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) inp.delete(k);
        const b = w.enemies.find((e) => e.isBoss && !e.dead); if (!b) return;
        // which rig set is it showing right now?
        if (b.sprites.death) { const spr = rigFrame(b, w); for (const [k, v] of Object.entries(b.sprites)) if (v.includes(spr)) window.__seen[k] = (window.__seen[k] || 0) + 1; }
        const dx = b.x - P.x, dy = b.y - P.y, dist = Math.hypot(dx, dy) || 1;
        inp.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
        const s = Math.floor((now - window.__t0) / 2600) % 2 ? 1 : -1;
        let mx = -dy / dist * s, my = dx / dist * s;
        if (dist > 120) { mx += dx / dist; my += dy / dist; } else if (dist < 85) { mx -= dx / dist; my -= dy / dist; }
        if (mx > 0.35) inp.add('KeyD'); if (mx < -0.35) inp.add('KeyA'); if (my > 0.35) inp.add('KeyS'); if (my < -0.35) inp.add('KeyW');
      }, 16);
    })()`);
    const name = boss.replace('+', '_');
    const st = () => page.evaluate(`(() => { const b = window.__bomDebug.world.enemies.find((e) => e.isBoss && !e.dead); return b ? { s: b.state, f: b.flash, ph: b.data.phase ?? 0, hp: b.hpFrac() } : null; })()`) as Promise<{ s: string; f: number; ph: number; hp: number } | null>;
    await page.waitForTimeout(2600); await shot(`${name}_1idle`);
    // wait for a wind-up / attack / flinch to photograph
    const want = new Set(['windup', 'attack', 'hurt']);
    for (let i = 0; i < 120 && want.size; i++) {
      const b = await st(); if (!b) break;
      if (want.has(b.s)) { want.delete(b.s); await shot(`${name}_2${b.s}`); }
      else if (b.f > 0 && want.has('hurt')) { want.delete('hurt'); await shot(`${name}_2hurt`); }
      await page.waitForTimeout(80);
    }
    // knock it under its first phase line and watch the change
    await page.evaluate(`(() => { const b = window.__bomDebug.world.enemies.find((e) => e.isBoss && !e.dead); if (b) b.hp = Math.min(b.hp, b.maxHp * 0.45); })()`);
    await page.waitForTimeout(450); await shot(`${name}_3phase`);
    await page.waitForTimeout(2600); await shot(`${name}_4after`);
    // death
    await page.evaluate(`window.__bomDebug.killAll()`);
    await page.waitForTimeout(350); await shot(`${name}_5death`);
    await page.waitForTimeout(500); await shot(`${name}_6death`);
    const r = await page.evaluate(`(() => { clearInterval(window.__drv); const secs = (performance.now() - window.__t0) / 1000; return { fps: Math.round(window.__fr / secs), worstMs: Math.round(window.__worst), seen: window.__seen }; })()`);
    console.log(JSON.stringify({ boss, ...(r as object) }));
  }
  console.log(errors.length ? 'ERRORS ' + errors.length : 'no page errors');
  await browser.close();
})();
