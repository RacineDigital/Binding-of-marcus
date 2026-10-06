// Boot test of the built game, the file players actually download: opens dist-single/index.html
// straight from disk in headless Chromium, starts a run and lets it play for a few seconds, and
// fails on any page error or if the game never comes up. Catches what unit tests can't (a module
// that breaks at load time, a bad bundle). Run after `npm run build:single`.
//   npx tsx tests/boot.ts [path/to/index.html]
import { chromium } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

const file = path.resolve(process.argv[2] ?? 'dist-single/index.html');
const exe = process.env.CHROME_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
(async () => {
  if (!fs.existsSync(file)) { console.error(`boot test: ${file} not found (run npm run build:single first)`); process.exit(1); }
  if (!exe) { console.error('boot test: no Chrome/Chromium found (set CHROME_PATH)'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // a resource that can't load (the update check offline, music beside the page) is not a broken game
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|music\/[^ ]*\.ogg.*blocked by CORS/.test(m.text())) errors.push('console: ' + m.text()); });
  // Managed browsers may block file://. BOOT_URL can point to this built directory served locally;
  // CI retains the default direct-from-disk test used by the downloadable browser package.
  await page.goto((process.env.BOOT_URL ?? pathToFileURL(file).href) + '?play&seed=BOOTTEST');
  let up = false;
  for (let i = 0; i < 40 && !up; i++) { await page.waitForTimeout(250); up = await page.evaluate(`!!(window.__bomDebug && window.__bomDebug.world)`); }
  if (up) {
    // walk and fire for a few seconds, so a run actually plays
    for (const k of ['KeyD', 'ArrowRight']) await page.keyboard.down(k);
    await page.waitForTimeout(2500);
    for (const k of ['KeyD', 'ArrowRight']) await page.keyboard.up(k);
    await page.waitForTimeout(1500);
  }
  await browser.close();
  if (!up) errors.unshift('the game never started a run');
  if (errors.length) { console.error('BOOT FAILED\n' + errors.slice(0, 10).join('\n')); process.exit(1); }
  console.log('boot ok');
})();
