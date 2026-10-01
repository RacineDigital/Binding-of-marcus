// Automated smoke playthrough: visits every room on every floor, fights each boss, grants random items.
import { chromium } from 'playwright-core';
import * as fs from 'fs';
const base = process.env.BASE_URL || 'http://localhost:5173/';
const seed = process.argv[2] || 'SMOKE001';
const floors = Number(process.argv[3] || 8);
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack ?? '').split('\n').slice(0, 4).join('\n')));
  await page.goto(base + '?play&seed=' + seed);
  await page.waitForTimeout(2500);
  await page.keyboard.press('KeyD');
  fs.mkdirSync('test-output/smoke', { recursive: true });
  const D = '(window.__bomDebug)';
  for (let f = 0; f < floors; f++) {
    const info = await page.evaluate(`(() => { const w = ${D}.world; return { floor: w.run.floorIndex, name: w.floor.theme.name, rooms: w.floor.rooms.map(r => r.type + (r.cw*r.ch>1?'*':'')), boss: w.floor.rooms.find(r=>r.type==='boss')?.bossId }; })()`) as any;
    console.log(`Floor ${info.floor} ${info.name}: ${info.rooms.length} rooms [${info.rooms.join(',')}] boss=${info.boss}`);
    await page.evaluate(`(() => { const d = ${D}; const ids = d.items(); for (let i = 0; i < 4; i++) d.give(ids[Math.floor(Math.random()*ids.length)]); d.god(); })()`);
    const n = info.rooms.length;
    for (let i = 0; i < n; i++) {
      if (info.rooms[i] === 'boss') continue;
      await page.evaluate(`${D}.goto(${i})`);
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(450);
      await page.keyboard.up('ArrowRight');
      if (i % 5 === 0) await page.screenshot({ path: `test-output/smoke/f${f}_r${i}.png` });
      await page.evaluate(`${D}.killAll()`);
      await page.waitForTimeout(120);
    }
    const bossIdx = info.rooms.indexOf('boss');
    await page.evaluate(`${D}.goto(${bossIdx}); ${D}.god();`);
    await page.waitForTimeout(3000);
    await page.keyboard.down('ArrowUp');
    for (let k = 0; k < 4; k++) { await page.waitForTimeout(1500); await page.screenshot({ path: `test-output/smoke/f${f}_boss${k}.png` }); }
    await page.keyboard.up('ArrowUp');
    const bstate = await page.evaluate(`(() => { const w = ${D}.world; return w.bossList.map(b => b.def.id + ':' + Math.round(b.hp) + '/' + Math.round(b.maxHp) + ':' + b.state + ':' + (b.data.attack && b.data.attack.id)); })()`);
    console.log('  boss', JSON.stringify(bstate), 'proj', await page.evaluate(`${D}.world.proj.count()`));
    await page.evaluate(`(() => { const w = ${D}.world; for (const b of [...w.bossList]) if (!b.dead) w.killEnemy(b); ${D}.killAll(); })()`);
    await page.waitForTimeout(f === floors - 1 ? 4000 : 3000);
    if (f < floors - 1) {
      const hasTrap = await page.evaluate(`!!${D}.world.trapdoor`);
      console.log('  trapdoor', hasTrap, 'scene', await page.evaluate(`${D}.game.scene`));
      await page.evaluate(`(() => { const w = ${D}.world; if (w.trapdoor) { w.player.x = w.trapdoor.x; w.player.y = w.trapdoor.y; } else ${D}.nextFloor(); })()`);
      await page.waitForTimeout(2500);
    } else {
      console.log('  final scene', await page.evaluate(`${D}.game.scene`));
    }
    const stats = await page.evaluate(`(() => { const w = ${D}.world; return { fps: Math.round(${D}.game.fps), items: w.player.itemOrder.length, dmg: w.player.stats.damage.toFixed(1), modes: [...w.player.prof.modes].join('+') }; })()`);
    console.log('  stats', JSON.stringify(stats));
    if (errors.length) { console.log(errors.slice(0, 20).join('\n')); errors.length = 0; }
  }
  await page.screenshot({ path: 'test-output/smoke/final.png' });
  await browser.close();
})();
