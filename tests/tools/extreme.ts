// Extreme builds (npm run dev first): stacks of items that multiply each other, firing into a crowd.
// Fails on duplicate kills, NaN/negative health, enemies left alive at 0 hp, page errors; reports
// peak projectiles / particles / familiars and frame times.
//   npx tsx tests/tools/extreme.ts
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
const BUILDS: Record<string, string[]> = {
  rapid: ['fine_nib', 'triple_seam', 'prism', 'long_needle', 'lamp_lure', 'hot_cocoa', 'gavyns_pouch', 'clock_spring', 'twin_wick', 'weathervane'],
  boom: ['powder_ink', 'split_nib', 'ricochet_stone', 'rubber_band', 'static_heart', 'red_thread', 'bookends', 'marrow', 'ink_pact', 'printing_plate'],
  summons: ['spilt_inkwell', 'shadow_twin', 'mirror_twin', 'lantern_wisp', 'ghost_cat', 'crayon_box', 'oil_flask', 'paper_cut', 'moth_friend', 'stitch_spider', 'marginalia'],
  beams: ['burning_glass', 'copper_filament', 'prism', 'powder_ink', 'split_nib', 'static_heart', 'lamp_lure', 'reading_lamp', 'spectacles'],
  melee: ['bone_folder', 'prism', 'powder_ink', 'static_heart', 'split_nib', 'marrow', 'crayon_box', 'creasing_iron'],
};
let failures = 0;
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message, (e.stack ?? '').split('\n').slice(0, 4).join(' | ')); });
  await page.goto(base); await page.waitForTimeout(2500);
  for (const [name, ids] of Object.entries(BUILDS)) {
    await page.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', 'EXTREME${name.length}'); })()`);
    await page.waitForTimeout(1500);
    const r: any = await page.evaluate(`(async () => {
      const d = window.__bomDebug, g = d.game, w = d.world, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      d.god(); for (const id of ${JSON.stringify(ids)}) d.give(id);
      const kills = new Map(); let dupKills = 0, onKillCalls = 0;
      const ok0 = w.killEnemy.bind(w); w.killEnemy = (e, ...a) => { if (kills.has(e)) dupKills++; kills.set(e, 1); return ok0(e, ...a); };
      const ih = w.itemHook.bind(w); w.itemHook = (n, ...a) => { if (n === 'onKill') onKillCalls++; return ih(n, ...a); };
      const ids = ['valvehead', 'gasper', 'ragcrawler', 'pillbug', 'moth', 'stoker'];
      const c = w.room.center();
      const spawnWave = () => { for (let i = 0; i < 12; i++) { const e = d.spawn(ids[i % ids.length], c.x - 90 + (i % 6) * 36, c.y - 40 + Math.floor(i / 6) * 50); if (e) { e.spawnT = 0; e.hp = e.maxHp = 60; } } };
      spawnWave();
      w.player.x = c.x; w.player.y = c.y + 60;
      let maxProj = 0, maxFx = 0, maxFam = 0, frames = 0, worst = 0, last = performance.now(); const t0 = last;
      const inp = g.input.down; let wave = 1;
      while (performance.now() - t0 < 7000) {
        const n = performance.now(); worst = Math.max(worst, n - last); last = n; frames++;
        const k = Math.floor((n - t0) / 600) % 4; inp.delete('ArrowUp'); inp.delete('ArrowLeft'); inp.delete('ArrowRight');
        if (k === 3) { /* release so charged modes fire */ } else inp.add(k === 0 ? 'ArrowUp' : k === 1 ? 'ArrowLeft' : 'ArrowRight');
        maxProj = Math.max(maxProj, w.proj.count()); maxFam = Math.max(maxFam, w.familiars.length);
        maxFx = Math.max(maxFx, w.fx.parts.filter((p) => p.active).length);
        if (!w.enemies.some((e) => !e.dead) && wave < 3) { wave++; spawnWave(); }
        await sleep(16);
      }
      for (const k of [...inp]) inp.delete(k);
      await sleep(400);
      const bad = w.enemies.filter((e) => Number.isNaN(e.hp) || e.maxHp <= 0 || (!e.dead && e.hp <= 0 && !e.invuln));
      return { killed: kills.size, dupKills, onKillCalls, waves: wave, maxProj, maxFx, maxFam, fps: +(frames / 7).toFixed(1), worstMs: Math.round(worst), badEnemies: bad.map((e) => e.def.id + ':' + e.hp).slice(0, 5), dmg: +w.player.stats.damage.toFixed(2), tears: +w.player.stats.fireRate.toFixed(2), mode: w.player.mode };
    })()`);
    const ok = r.dupKills === 0 && r.badEnemies.length === 0 && r.onKillCalls <= r.killed * 1.01;
    if (!ok) failures++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name.padEnd(8), JSON.stringify(r));
  }
  if (errors.length) failures++;
  console.log(errors.length ? 'page errors: ' + errors.length : 'no page errors');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
