// Laser synergies, checked in the real game: hold exactly a set of items, fire at a line of sturdy
// dummies for two simulated seconds, and record what the lasers actually did (rays per pull, child
// rays, lashes, searchlights, colours, embers, heat, damage). Each scenario names what it expects.
//   npx tsx tests/tools/laserprobe.ts  (npm run dev first)
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
const base = process.env.BASE_URL || 'http://localhost:5173/';

const SCENARIOS: [string, string[], string][] = [
  ['copper alone', ['copper_filament'], 'lasers=1 tier=0'],
  ['two lasers', ['copper_filament', 'mirror_shard'], 'tier=1 twin rays, orange, more damage'],
  ['three lasers', ['copper_filament', 'mirror_shard', 'arc_lamp'], 'tier=2, Live Wire, arcs'],
  ['four lasers', ['copper_filament', 'mirror_shard', 'arc_lamp', 'stained_glass'], 'tier=3, prism rays, giant ray'],
  ['refraction (Prism)', ['copper_filament', 'prism'], 'child rays'],
  ['boomerang', ['copper_filament', 'tin_boomerang'], 'child rays come back'],
  ['scorch (Burnt Toast)', ['copper_filament', 'burnt_toast'], 'ember creep'],
  ['lash (Worm Apple)', ['copper_filament', 'worm_apple'], 'lashing lasers'],
  ['spiral (Snail Shell)', ['copper_filament', 'snail_shell'], 'spinning ray'],
  ['orbit (Pocket Moon)', ['copper_filament', 'pocket_moon'], 'orbiting ray'],
  ['searchlight', ['lighthouse_lens'], 'sweeping beam'],
  ['focus heat', ['jewellers_loupe'], 'heat builds'],
  ['size', ['copper_filament', 'swollen_ink', 'swollen_ink'], 'wide lasers'],
  ['growing pains', ['copper_filament', 'growing_pains'], 'wide lasers'],
  ['beam overcharged', ['burning_glass', 'copper_filament'], 'beam tier=1 colour'],
  ['glass eye overcharged', ['glass_eye', 'copper_filament'], 'eye lasers overcharged'],
];

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs: string[] = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base); await p.waitForTimeout(2500);
  await p.evaluate(`(async () => { const g = window.__bomDebug.game; g.menus.stack = []; g.newRun('marcus', 'LASERS'); await new Promise((r) => setTimeout(r, 1500)); })()`);
  const rows: any[] = [];
  for (const [name, ids, expect] of SCENARIOS) {
    const r: any = await p.evaluate(`(() => {
      const d = window.__bomDebug, g = d.game, w = d.world, pl = w.player;
      for (const e of w.enemies) e.dead = true;
      w.enemies = []; w.proj.clear(); w.beams = []; w.bombs = []; w.creep = []; w.tasks = (w.tasks || []).filter(() => false);
      pl.items.clear(); pl.itemOrder = []; pl.temp = []; pl.transformations.clear(); pl.active = null; pl.charms = [];
      pl.wcharge = 0; pl.wasAiming = false; pl.fireCd = 0; pl.swing = null;
      for (const id of ${JSON.stringify(ids)}) d.give(id);
      pl.recompute();
      const c = w.room.center();
      pl.x = c.x - 90; pl.y = c.y; pl.vx = pl.vy = 0; pl.iframes = 1e9;
      const spots = [[40, -8], [80, 0], [120, 8], [160, -4], [60, 40], [60, -40], [110, 30]];
      const dummies = spots.map(([dx, dy]) => { const e = w.spawnEnemy('valvehead', pl.x + dx, pl.y + dy, false); e.hp = e.maxHp = 1e6; e.spawnT = 0; e.freeze = 99; return e; });
      const inp = g.input, orig = inp.aimVector;
      inp.aimVector = () => (pl.wcharge >= 1 ? null : { x: 1, y: 0 });
      const colors = new Set(), o = { maxRays: 0, child: 0, lash: 0, sweep: 0, maxWidth: 0, embers: 0, heat: 0 };
      const seen = new WeakSet();
      for (let f = 0; f < 120; f++) {
        w.update(1 / 60); pl.iframes = 1e9; pl.x = c.x - 90; pl.y = c.y;
        const mine = w.beams.filter((bm) => !bm.enemyBeam);
        o.maxRays = Math.max(o.maxRays, mine.filter((bm) => bm.laser && !bm.child && bm.t < 0.02).length);
        for (const bm of mine) {
          if (seen.has(bm)) continue; seen.add(bm);
          colors.add(bm.color); o.maxWidth = Math.max(o.maxWidth, +bm.width.toFixed(1));
          if (bm.child) o.child++; if (bm.lash) o.lash++; if (bm.sweepSpan) o.sweep++;
        }
        for (const e of dummies) o.heat = Math.max(o.heat, +(e.data.heat ?? 0).toFixed(2));
      }
      o.embers = w.creep.filter((cr) => cr.color === '#c8501a').length;
      inp.aimVector = orig;
      const dmg = Math.round(dummies.reduce((s, e) => s + (e.maxHp - e.hp), 0));
      for (const e of dummies) e.dead = true;
      return { lasers: pl.prof.lasers, mode: pl.mode, liveWire: pl.transformations.has('laser'), ...o, colors: [...colors].slice(0, 6), dmg };
    })()`);
    rows.push({ name, expect, ...r });
    console.log(name.padEnd(22), JSON.stringify(r));
  }
  console.log(errs.length ? 'PAGE ERRORS ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
