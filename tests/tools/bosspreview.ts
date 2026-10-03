// Boss preview strips (npm run dev first): one PNG per rigged boss with its key poses side by side at
// 3x, eyes drawn in looking forward: idle, wind-up, attack, flinch, roar, its last phase, and dying.
//   npx tsx tests/tools/bosspreview.ts <outDir> [id,id,...]
import { chromium } from 'playwright-core';
import * as fs from 'fs';
const out = process.argv[2] ?? 'test-output/bosspreview', only = process.argv[3] ?? '';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p.goto('http://localhost:5173/'); await p.waitForTimeout(2500);
  const n: number = await p.evaluate(`(async () => {
    const { ALL_ENEMY_DEFS } = await import('/src/enemies/registry.ts'); const { getSprites } = await import('/src/enemies/enemy.ts');
    const only = ${JSON.stringify(only)}.split(',').filter(Boolean);
    const defs = ALL_ENEMY_DEFS().filter((d) => d.boss && d.id !== 'twinsnips' && (!only.length || only.includes(d.id)));
    window.__pv = [];
    for (const d of defs) {
      const S = getSprites(d); if (!S.death) continue;
      let last = 0; for (let k = 1; k < 5; k++) if (S['idle_p' + k]) last = k;
      const mid = (l) => l[Math.floor(l.length / 2)];
      const picks = [['idle', S.idle[0]], ['wind-up', S.windup[S.windup.length - 1]], ['attack', S.attack[0]], ['hit', S.hurt[0]], ['roar', mid(S.roar)]];
      if (last) picks.push(['phase ' + (last + 1), S['idle_p' + last][1]]);
      picks.push(['dying', S.death[3]]);
      const sp0 = S.idle[0], Z = 3, pad = 8;
      const c = document.createElement('canvas'); c.width = picks.length * (sp0.w * Z + pad) + pad; c.height = sp0.h * Z + 30;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.fillStyle = '#2c2630'; x.fillRect(0, 0, c.width, c.height);
      picks.forEach(([label, sp], i) => {
        const xx = pad + i * (sp0.w * Z + pad), yy = 4;
        // a floor-coloured tile and a contact shadow, like in a room
        x.fillStyle = '#3a3036'; x.fillRect(xx, yy, sp.w * Z, sp.h * Z);
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(xx + sp.ox * Z, yy + sp.oy * Z, d.r * Z * 1.1, d.r * Z * 0.35, 0, 0, Math.PI * 2); x.fill();
        x.drawImage(sp.canvas, xx, yy, sp.w * Z, sp.h * Z);
        for (const m of (sp.eyes || [])) {
          const ir = Math.max(1, m.r * 0.6), ix = xx + (m.x + 0.5) * Z, iy = yy + (m.y + 0.5 + m.r * 0.3) * Z;
          x.fillStyle = m.iris; x.beginPath(); x.arc(ix, iy, ir * Z, 0, Math.PI * 2); x.fill();
          x.fillStyle = m.pupil || '#0a0408'; if (m.slit) x.fillRect(ix - Z / 2, iy - ir * 0.8 * Z, Z, ir * 1.6 * Z); else { x.beginPath(); x.arc(ix, iy, Math.max(0.5, ir * 0.5) * Z, 0, Math.PI * 2); x.fill(); }
          if (m.glint !== false) { x.fillStyle = '#fff'; x.fillRect(ix - ir * 0.45 * Z, iy - ir * 0.5 * Z, Z, Z); }
        }
        x.fillStyle = '#c8bcd0'; x.font = '13px sans-serif'; x.fillText(label, xx + 2, yy + sp.h * Z + 18);
      });
      window.__pv.push([d.id, c.toDataURL()]);
    }
    return window.__pv.length; })()`);
  for (let i = 0; i < n; i++) { const [id, d]: [string, string] = await p.evaluate(`window.__pv[${i}]`); fs.writeFileSync(`${out}/${id}.png`, Buffer.from(d.split(',')[1], 'base64')); }
  console.log(n, 'boss previews in', out);
  await b.close();
})();
