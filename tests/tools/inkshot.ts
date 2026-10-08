// Screenshot of Inklings in play (margins on the HUD, the brimming meter with essence glyphs over the
// creatures, ward shards, an Inkling on the floor and its card). npx tsx tests/tools/inkshot.ts out.png
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/'); await page.waitForTimeout(2500);
  await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game, I = d.ink;
    g.save.data.settings.showStats = false;
    g.menus.stack = []; g.newRun('marcus', 'INKSHOT2');
    await new Promise((r) => setTimeout(r, 2500));
    const w = d.world, s = I.inkState(w);
    s.slots = [{ id: 'ward', lv: 2 }, { id: 'ember', lv: 3 }, { id: 'swarm', lv: 1 }]; I.syncInk(w);
    w.player.hurtPlayer = null; w.hurtPlayer = () => false;
    const id = w.floor.rooms.find((r) => r.type === 'normal' && r.spawns.length >= 3)?.id; d.goto(id);
    await new Promise((r) => setTimeout(r, 1200));
    s.meter = I.METER_MAX;
    const e = d.spawn('moth', w.player.x + 30, w.player.y - 10); e.data.annotated = true;
    const P = w.player; const k = d.spawn('gravedigger', P.x + 18, P.y + 6); k.spawnT = 0; k.data.annotated = true; w.killEnemy(k);
    await new Promise((r) => setTimeout(r, 600));
    const pk = w.pickups.find((p) => p.kind === 'inkling'); if (pk) { pk.noCollect = 99; pk.x = P.x + 16; pk.y = P.y + 6; }
  })()`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: process.argv[2] || 'inkshot.png' });
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], clip: { x: 480, y: 250, width: 340, height: 220 } });
  await browser.close();
})();
