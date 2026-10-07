// Contact sheets of every item icon, big, with its name, for reviewing how recognizable they are.
//   npx tsx tests/tools/iconsheet.ts [outDir] [redrawn | id,id,...]  (npm run dev first)
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
import * as fs from 'fs';
const out = process.argv[2] ?? 'test-output/icons', only = process.argv[3] ?? '';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p.goto('http://localhost:5173/'); await p.waitForTimeout(2000);
  const n: number = await p.evaluate(`(async () => {
    const { ALL_ITEMS } = await import('/src/items/registry.ts'); const { itemIconCanvas } = await import('/src/art/items.ts');
    const only = ${JSON.stringify(only)}; const { ICONS } = await import('/src/art/itemicons.ts');
    const items = ALL_ITEMS.filter((i) => only.includes(',') ? only.split(',').includes(i.id) : only === 'redrawn' ? !!ICONS[i.id] : (!(i.tags || []).includes('quest') || (i.tags || []).includes('innate') || (i.tags || []).includes('tainted')));
    const per = 48, cols = 8, cell = 170, pages = Math.ceil(items.length / per);
    window.__sheets = [];
    for (let pg = 0; pg < pages; pg++) {
      const c = document.createElement('canvas'); c.width = cols * cell; c.height = Math.ceil(per / cols) * (cell - 10);
      const x = c.getContext('2d'); x.fillStyle = '#2a2430'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
      items.slice(pg * per, pg * per + per).forEach((it, i) => {
        const cx = (i % cols) * cell, cy = Math.floor(i / cols) * (cell - 10);
        x.fillStyle = (i % 2) ? '#3a3440' : '#342e3a'; x.fillRect(cx, cy, cell, cell - 10);
        x.drawImage(itemIconCanvas(it.id), cx + 31, cy + 6, 108, 108);
        x.fillStyle = '#efe6d0'; x.font = '13px sans-serif'; x.textAlign = 'center';
        x.fillText(it.name.slice(0, 22), cx + cell / 2, cy + 132); x.fillStyle = '#9a90a8'; x.font = '11px sans-serif'; x.fillText(it.id, cx + cell / 2, cy + 148);
      });
      window.__sheets.push(c.toDataURL());
    }
    return pages; })()`);
  for (let i = 0; i < n; i++) { const d: string = await p.evaluate(`window.__sheets[${i}]`); fs.writeFileSync(`${out}/sheet${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')); }
  console.log(n, 'sheets in', out); await b.close();
})();
