// Usage: tsx tests/shot.ts <query> <out.png> [waitMs] [script.json]
import { chromium } from 'playwright-core';
import * as fs from 'fs';
const [query = '', out = 'test-output/shot.png', wait = '1500', scriptPath] = process.argv.slice(2);
const base = process.env.BASE_URL || 'http://localhost:5173/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: Number(process.env.VW || 1440), height: Number(process.env.VH || 810) } });
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); if (m.type() === 'log') console.log('LOG', m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
  await page.goto(base + (query ? '?' + query : ''));
  await page.waitForTimeout(Number(wait));
  if (scriptPath) {
    const steps = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
    for (const s of steps) {
      if (s.down) await page.keyboard.down(s.down);
      if (s.up) await page.keyboard.up(s.up);
      if (s.press) await page.keyboard.press(s.press);
      if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined) console.log('EVAL', JSON.stringify(r)); }
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.shot) { await page.screenshot({ path: s.shot }); console.log('shot', s.shot); }
    }
  }
  fs.mkdirSync('test-output', { recursive: true });
  const clip = process.env.CLIP ? (([x, y, width, height]) => ({ x, y, width, height }))(process.env.CLIP.split(',').map(Number)) : undefined;
  await page.screenshot({ path: out, clip });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
