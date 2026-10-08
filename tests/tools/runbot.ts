// A representative-run bot (npm run dev first). It plays whole runs in the browser: walks every room
// in order, wins every fight (instantly, so this measures rewards and pacing, not skill), picks up
// everything loose, takes treasure, and kills the boss. It reports what a thorough player has in
// hand at each shop and at the end of each chapter.
//   npx tsx tests/tools/runbot.ts [seeds] [chapters] [char]
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';
const [nSeeds = '4', nCh = '7', char = 'marcus', first = '0'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  const errors: string[] = []; page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message, (e.stack ?? '').split('\n').slice(0, 6).join(' | ')); });
  await page.goto(base); await page.waitForTimeout(2500);
  const rows: any[] = [];
  for (let s = Number(first); s < Number(first) + Number(nSeeds); s++) {
    await page.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('${char}', 'BOT${s}XYZ'); })()`);
    await page.waitForTimeout(2000);
    for (let ch = 0; ch < Number(nCh); ch++) {
      const r: any = await page.evaluate(`(async () => {
        const d = window.__bomDebug, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const w0 = d.world, pl = () => d.world.player;
        d.god();
        const start = { buttons: pl().buttons, items: pl().itemOrder.length };
        const order = w0.floor.rooms.slice().sort((a, b) => a.distance - b.distance).filter((r) => r.type !== 'supersecret' && r.type !== 'secret' && r.type !== 'boss');
        let shopSeen = null, chests = 0, fights = 0, earned = 0;
        const collect = async () => {
          for (let k = 0; k < 3; k++) {
            const w = d.world;
            for (const p of w.pickups.slice()) {
              if (p.price > 0 || p.deal > 0 || p.data?.shop || p.collected || p.dead) continue;
              if (String(p.kind).startsWith('chest')) chests++;
              w.player.x = p.x; w.player.y = p.y; await sleep(40);
            }
            await sleep(250);
          }
        };
        for (const room of order) {
          if (d.world.floor !== w0.floor) break;
          d.goto(room.id); await sleep(200);
          const b0 = pl().buttons;
          if (d.world.enemies.some((e) => !e.dead)) { fights++; for (let t = 0; t < 6 && d.world.enemies.some((e) => !e.dead); t++) { d.killAll(); await sleep(350); } }
          await collect();
          earned += Math.max(0, pl().buttons - b0);
          if (room.type === 'shop') shopSeen = { buttons: pl().buttons, prices: d.world.pickups.filter((p) => p.price > 0).map((p) => p.price) };
        }
        const boss = w0.floor.rooms.find((r) => r.type === 'boss');
        d.goto(boss.id); await sleep(1500);
        for (let t = 0; t < 30 && d.world.enemies.some((e) => !e.dead && e.isBoss); t++) { d.killAll(); await sleep(400); }
        await sleep(2500); await collect();
        const w = d.world, P = w.player;
        return { floor: w.run.floorIndex + 1, theme: w.floor.theme.id, rooms: w0.floor.rooms.length, fights, chests, earned,
          buttons: P.buttons, keys: P.keys, bombs: P.bombs, items: P.itemOrder.length, gained: P.itemOrder.length - start.items,
          dmg: +P.stats.damage.toFixed(2), tears: +P.stats.fireRate.toFixed(2), red: P.health.red / 2 + '/' + P.health.redMax / 2,
          shop: shopSeen ? shopSeen.buttons + ' vs [' + shopSeen.prices.join(',') + ']' : '-' };
      })()`);
      const ink = await page.evaluate(`(() => { const d = window.__bomDebug, s = d.ink.inkState(d.world); return s.slots.map((x) => x.id + x.lv).join(' ') + ' meter ' + s.meter.toFixed(1); })()`);
      rows.push({ seed: s, ...(r as object), ink }); console.log(JSON.stringify({ seed: s, ...(r as object), ink }));
      await page.evaluate(`window.__bomDebug.nextFloor()`); await page.waitForTimeout(2500);
    }
  }
  console.log(errors.length ? 'errors: ' + errors.slice(0, 5).join(' | ') : 'no page errors');
  await browser.close();
})();
