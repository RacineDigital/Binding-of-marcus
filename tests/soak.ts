// A long session in a real browser (npm run dev first): fight after fight, room after room, floor after
// floor for a few minutes, watching frame rate, live objects and JS heap for leaks.
//   npx tsx tests/soak.ts [minutes]
import { chromium } from 'playwright-core';
const base = process.env.BASE_URL || 'http://localhost:5173/', minutes = Number(process.argv[2] ?? 3);
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base); await page.waitForTimeout(3000); await page.keyboard.press('Enter');
  await page.evaluate(`(() => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', 'SOAK1'); })()`);
  await page.waitForTimeout(2500);
  const samples: any[] = [];
  const end = Date.now() + minutes * 60_000;
  for (let round = 0; Date.now() < end; round++) {
    const s = await page.evaluate(`(async () => {
      const d = window.__bomDebug, w = d.world; d.god();
      if (${round} % 6 === 5) { d.nextFloor(); await new Promise((r) => setTimeout(r, 2500)); return null; }
      const ids = ['valvehead', 'moth', 'mite', 'gasper', 'cinderhopper'];
      for (let i = 0; i < 10; i++) d.spawn(ids[i % ids.length]);
      if (${round} % 3 === 0) d.give(['triple_seam', 'rubber_band', 'marrow', 'printing_plate', 'red_thread', 'spilt_inkwell', 'paper_cut'][${round} % 7]);
      const t0 = performance.now(); let frames = 0;
      await new Promise((res) => { const f = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(0); }; requestAnimationFrame(f); });
      if (window.gc) window.gc();
      const W = d.world;
      return { fps: +(frames / 3).toFixed(1), heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576), enemies: W.enemies.length, proj: W.proj.count(), fx: W.fx.count ? W.fx.count() : -1, fam: W.familiars.length, floor: W.run.floorIndex };
    })()`);
    // fight it out with the arrow keys
    for (const k of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) { await page.keyboard.down(k); await page.waitForTimeout(400); await page.keyboard.up(k); }
    if (s) { samples.push(s); console.log(JSON.stringify(s)); }
  }
  const first = samples.slice(0, 3), last = samples.slice(-3), avg = (a: any[], k: string) => a.reduce((x, s) => x + s[k], 0) / Math.max(1, a.length);
  console.log(`heap ${avg(first, 'heapMB').toFixed(0)} MB → ${avg(last, 'heapMB').toFixed(0)} MB, fps ${avg(first, 'fps').toFixed(1)} → ${avg(last, 'fps').toFixed(1)}, errors ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5).join('\n'));
  await browser.close();
  process.exit(errors.length || avg(last, 'heapMB') > avg(first, 'heapMB') * 2 + 30 ? 1 : 0);
})();
