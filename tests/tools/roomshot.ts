// Screenshot rooms built from named layouts: npx tsx tests/tools/roomshot.ts out-dir name1,name2,...
// Each layout is stamped into an unvisited Chapter I room (debug.layout) and photographed.
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
(async () => {
  const [dir, names] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/'); await page.waitForTimeout(2500);
  for (const name of names.split(',')) {
    const found = await page.evaluate(`(async () => {
      const d = window.__bomDebug, g = d.game;
      g.newRun('marcus', 'ROOMSHOT'); g.menus.stack = []; d.god();
      return await d.layout(${JSON.stringify(name)});
    })()`);
    if (!found) { console.log(name, 'not found'); continue; }
    // let the room settle (enemies rise) with the sim stepping
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/${name}.png` });
    console.log(name, found);
  }
  await browser.close();
})();
