// Screenshot any menu screen: npx tsx tests/tools/menushot.ts "m.push(m.inklingsScreen())" out.png [setup-js]
// `m` is the menu system, `g` the game; the optional setup runs first (e.g. to fill the save).
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
(async () => {
  const [code, out, setup] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/'); await page.waitForTimeout(2500);
  await page.evaluate(`(() => { const g = window.__bomDebug.game, m = g.menus; ${setup ?? ''}; m.stack = []; ${code}; })()`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: out });
  await browser.close();
})();
