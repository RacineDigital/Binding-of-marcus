// Contact sheets of every boss: each animation's frames side by side at 3x on a floor-coloured
// background, with the hitbox drawn over the first frame (circle = body radius, line = hit height).
//   npx tsx tests/tools/bosssheet.ts [outDir] [id,id,...] [enemies]   (npm run dev first; 'enemies' sheets the regular creatures)
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
import * as fs from 'fs';
const out = process.argv[2] ?? 'test-output/bosses', only = process.argv[3] ?? '', regular = process.argv[4] === 'enemies';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs: string[] = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:5173/'); await p.waitForTimeout(2500);
  const n: number = await p.evaluate(`(async () => {
    const { ALL_ENEMY_DEFS } = await import('/src/enemies/registry.ts'); const { getSprites } = await import('/src/enemies/enemy.ts');
    const only = ${JSON.stringify(only)}.split(',').filter(Boolean);
    const defs = ALL_ENEMY_DEFS().filter((d) => (${regular} ? !d.boss : d.boss) && (!only.length || only.includes(d.id)));
    window.__sheets = [];
    for (const d of defs) {
      const set = getSprites(d), S = 3, pad = 10;
      const rows = Object.entries(set);
      let W = 0, H = 30;
      for (const [, fr] of rows) { W = Math.max(W, fr.reduce((s, sp) => s + sp.w * S + pad, 120)); H += Math.max(...fr.map((sp) => sp.h)) * S + 26; }
      const c = document.createElement('canvas'); c.width = Math.min(4000, W); c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#2c2630'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
      x.fillStyle = '#efe6d0'; x.font = 'bold 18px sans-serif'; x.fillText(d.name + '  (' + d.id + ', r=' + d.r + ', hitY=' + (d.hitY ?? d.r) + ')', 10, 22);
      let y = 34;
      for (const [anim, fr] of rows) {
        const h = Math.max(...fr.map((sp) => sp.h)) * S;
        x.fillStyle = '#9a90a8'; x.font = '13px sans-serif'; x.fillText(anim + ' (' + fr.length + ')', 10, y + 14);
        let xx = 120;
        fr.forEach((sp, i) => {
          x.fillStyle = '#3a3440'; x.fillRect(xx - 2, y, sp.w * S + 4, h + 4);
          const fy = y + h - sp.h * S;
          x.drawImage(sp.canvas, xx, fy, sp.w * S, sp.h * S);
          // the eyes the rig draws live, looking toward the camera
          for (const m of (sp.eyes || [])) {
            const ir = Math.max(1, m.r * 0.6), ix = xx + (m.x + 0.5) * S, iy = fy + (m.y + 0.5 + m.r * 0.3) * S;
            x.fillStyle = m.iris; x.beginPath(); x.arc(ix, iy, ir * S, 0, Math.PI * 2); x.fill();
            x.fillStyle = m.pupil || '#0a0408'; if (m.slit) x.fillRect(ix - S / 2, iy - ir * 0.8 * S, S, ir * 1.6 * S); else { x.beginPath(); x.arc(ix, iy, Math.max(0.5, ir * 0.5) * S, 0, Math.PI * 2); x.fill(); }
            if (m.glint !== false) { x.fillStyle = '#fff'; x.fillRect(ix - ir * 0.45 * S, iy - ir * 0.5 * S, S, S); }
          }
          if (i === 0) {
            // hitbox: feet at the sprite origin, body circle and hit height above it
            const ox = xx + sp.ox * S, oy = fy + sp.oy * S;
            x.strokeStyle = 'rgba(80,255,120,0.8)'; x.lineWidth = 1;
            x.beginPath(); x.ellipse(ox, oy, d.r * S, d.r * S * 0.35, 0, 0, Math.PI * 2); x.stroke();
            x.beginPath(); x.arc(ox, oy - (d.hitY ?? d.r) * S, d.r * S, 0, Math.PI * 2); x.stroke();
          }
          xx += sp.w * S + pad;
        });
        y += h + 26;
      }
      window.__sheets.push([d.id, c.toDataURL()]);
    }
    return window.__sheets.length; })()`);
  for (let i = 0; i < n; i++) { const [id, d]: [string, string] = await p.evaluate(`window.__sheets[${i}]`); fs.writeFileSync(`${out}/${id}.png`, Buffer.from(d.split(',')[1], 'base64')); }
  console.log(n, 'boss sheets in', out, errs.length ? 'ERRORS ' + errs.join(' | ') : '');
  await b.close();
})();
