// Probes the item mechanics that aren't plain stats, in the real game: give the item, set up the
// situation it's about, and check that the thing it promises actually happens.
//   npx tsx tests/tools/itemprobe.ts  (npm run dev first, or BASE_URL=... for a preview build)
import { chromium } from 'playwright-core';
const base = process.env.BASE_URL || 'http://localhost:5173/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base); await page.waitForTimeout(2500);
  const r: any = await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), inp = g.input.down;
    const fresh = async (ids) => {
      g.menus.stack = []; g.newRun('marcus', 'PROBE' + Math.floor(Math.random() * 1e6)); await sleep(1500);
      for (const k of [...inp]) inp.delete(k);
      for (const id of ids) d.give(id); d.god(); await sleep(200);
      return d.world;
    };
    const sturdy = (w, x, y) => { const e = d.spawn('blot', x, y); if (e) { e.hp = e.maxHp = 5000; e.spawnT = 0; } return e; };
    const out = {};
    // Leaky Pen: walking leaves ink puddles
    { const w = await fresh(['leaky_pen']); w.creep = []; inp.add('KeyD'); await sleep(900); inp.delete('KeyD');
      out.leaky_pen = { puddles: w.creep.filter((c) => c.team === 'player').length }; }
    // Clock Spring: fire rate climbs while you keep firing, then runs down
    { const w = await fresh(['clock_spring']); const fr = () => +w.player.stats.fireRate.toFixed(2); const a = fr();
      inp.add('ArrowUp'); await sleep(3600); const b = fr(); inp.delete('ArrowUp'); await sleep(2500);
      out.clock_spring = { idle: a, wound: b, after: fr() }; }
    // Bold Print: a crit staggers an ordinary enemy
    { const w = await fresh(['bold_print']); w.player.addTemp({ id: 'probe_crit', attack: { crit: 1 } });
      const e = sturdy(w, w.player.x, w.player.y - 70); let froze = 0;
      inp.add('ArrowUp'); for (let i = 0; i < 40; i++) { await sleep(25); if (e && e.freeze > 0) froze++; } inp.delete('ArrowUp');
      out.bold_print = { framesFrozen: froze }; }
    // Burnt Toast: a burning enemy that dies bursts into four embers
    { const w = await fresh(['burnt_toast']); const e = sturdy(w, w.player.x + 60, w.player.y); await sleep(100);
      e.burn = 2; const before = w.proj.list.filter((p) => p.active && p.team === 0).length; w.killEnemy(e);
      out.burnt_toast = { embers: w.proj.list.filter((p) => p.active && p.team === 0).length - before }; }
    // Soot Wings: an enemy right next to you catches fire
    { const w = await fresh(['soot_wings']); const e = sturdy(w, w.player.x + 10, w.player.y); if (e) e.freeze = 5; await sleep(600);
      out.soot_wings = { burning: !!e && e.burn > 0, flying: w.player.flight }; }
    // Wings of the Well: a fight opens with a gust that throws nearby enemies back
    { const w = await fresh(['ink_wings']); const room = w.floor.rooms.find((r) => r.type === 'normal' && !r.cleared);
      d.goto(room.id); const pl = w.player; const dist = () => { const es = w.enemies.filter((e) => !e.dead && !e.isBoss); return es.length ? Math.round(es.reduce((s, e) => s + Math.hypot(e.x - pl.x, e.y - pl.y), 0) / es.length) : -1; };
      // bring the room's enemies in close so the gust has someone to throw
      await sleep(250); for (const e of w.enemies) { const a = Math.random() * 6.28; e.x = pl.x + Math.cos(a) * 50; e.y = pl.y + Math.sin(a) * 30; e.freeze = 3; }
      const before = dist(); await sleep(700);
      out.ink_wings = { enemies: w.enemies.length, before, after: dist() }; }
    return out; })()`);
  console.log(JSON.stringify(r, null, 1));
  const ok = r.leaky_pen.puddles >= 2 && r.clock_spring.wound >= r.clock_spring.idle + 0.5 && r.clock_spring.after < r.clock_spring.wound
    && r.bold_print.framesFrozen > 0 && r.burnt_toast.embers >= 4 && r.soot_wings.burning && r.soot_wings.flying && (r.ink_wings.enemies === 0 || r.ink_wings.after > r.ink_wings.before);
  console.log(ok ? 'all item probes ok' : 'SOME ITEM PROBES FAILED', errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
  await browser.close(); process.exit(ok && !errors.length ? 0 : 1);
})();
