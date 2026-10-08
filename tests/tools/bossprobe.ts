// Boss probe: fight bosses with weak / average / strong builds in a real browser, stepped frame by
// frame. A simple bot circles the boss at mid range, aims at it with free-angle aim and fires; it has
// real invulnerability frames after a hit but cannot die. Reports time to kill, when each phase
// began, and hits taken (a rough measure of pattern density for a bot that does not dodge on purpose).
//   npx tsx tests/tools/bossprobe.ts grubmother,wardrobe,twinsnips [seconds cap] [circle|dodge] [build]
// 'dodge' mode: each frame the bot scores 16 directions (and standing still) by how close every
// enemy shot will pass over the next 0.4 s, plus boss bodies, walls and spore patches, and takes the
// safest; few hits for this simple dodger is evidence that a boss's patterns leave safe paths.
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
import { BOSS_ALIASES } from '../../src/bosses/aliases';
const [ids = 'grubmother,wardrobe,twinsnips', cap = '150', mode = 'circle', only = ''] = process.argv.slice(2);
const BUILDS: Record<string, string[]> = {
  weak: [],
  average: ['triple_seam', 'long_needle'],
  strong: ['black_quill', 'the_debt', 'last_word', 'ink_pact', 'triple_seam', 'static_heart'],
};
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/'); await page.waitForTimeout(2500);
  const trials = Number(process.env.TRIALS || 1);
  for (const id of ids.split(',')) for (const [build, items] of Object.entries(BUILDS)) for (let trial = 0; trial < trials; trial++) {
    if (only && build !== only) continue;
    const r: any = await page.evaluate(`(async () => {
      const d = window.__bomDebug, g = d.game;
      g.menus.stack = []; g.newRun('marcus', 'BOSSPROBE${trial}');
      await new Promise((res) => setTimeout(res, 2200));
      window.requestAnimationFrame = () => 0;
      const w = d.world, pl = w.player, inp = g.input;
      for (const it of ${JSON.stringify(items)}) d.give(it);
      pl.recompute();
      for (const e of w.enemies) e.dead = true; w.enemies = []; w.proj.clear(); w.room.grid.fill(0); w.roomTime = 5;
      const c = w.room.center();
      const parts = ${JSON.stringify((BOSS_ALIASES[id] ?? id).split('+'))};
      parts.forEach((p, i) => { const b = d.spawn(p, c.x + (i - (parts.length - 1) / 2) * 60, c.y - 30); b.spawnT = 0; });
      const all = () => w.enemies.filter((e) => e.isBoss && !e.dead);
      let hits = 0; const src = {}; const realHurt = w.hurtPlayer.bind(w);
      w.hurtPlayer = (amt, from) => { if (pl.iframes > 0) return false; hits++; const near = all()[0] ? Math.round(Math.hypot(all()[0].x - pl.x, all()[0].y - pl.y) / 20) * 20 : -1; const k = (from || '?') + '[' + near + ']@' + (all()[0] ? all()[0].state + ':' + ((all()[0].data.attack && all()[0].data.attack.id) || '') : ''); src[k] = (src[k] || 0) + 1; pl.iframes = 1; return true; };
      let ang = Math.PI / 2, aim = { x: 0, y: -1 }, mv = { x: 0, y: 0 };
      inp.aimVector = () => aim; inp.moveVector = () => mv;
      const phases = []; let lastPhase = 0, t = 0; const vel = new Map(), prev = new Map();
      const hp0 = all().reduce((a, b) => a + b.maxHp, 0);
      while (t < ${Number(cap)} && all().length) {
        const bs = all(), b = bs[0];
        // circle the boss at about 95 px, keeping inside the room
        const dx = pl.x - b.x, dy = pl.y - b.y, dd = Math.hypot(dx, dy) || 1;
        ang = Math.atan2(dy, dx) + 0.9 / 60 * 2;
        const tx = b.x + Math.cos(ang) * 95, ty = b.y + Math.sin(ang) * 95;
        const ccx = Math.max(c.x - 170, Math.min(c.x + 170, tx)), ccy = Math.max(c.y - 85, Math.min(c.y + 85, ty));
        const mx = ccx - pl.x, my = ccy - pl.y, ml = Math.hypot(mx, my);
        mv = ml > 4 ? { x: mx / ml, y: my / ml } : { x: 0, y: 0 };
        if (${JSON.stringify(mode)} === 'dodge') {
          const sp = pl.stats.speed * 118, shots = w.proj.list.filter((p) => p.active && p.team === 1);
          let best = null, bestD = Infinity;
          for (let k = -1; k < 16; k++) {
            const vx = k < 0 ? 0 : Math.cos(k / 16 * Math.PI * 2) * sp, vy = k < 0 ? 0 : Math.sin(k / 16 * Math.PI * 2) * sp;
            let danger = 0;
            for (const tt of [0.08, 0.16, 0.24, 0.32, 0.4]) {
              const px = Math.max(c.x - 170, Math.min(c.x + 170, pl.x + vx * tt)), py = Math.max(c.y - 98, Math.min(c.y + 98, pl.y + vy * tt));
              for (const q of shots) { const del = Math.max(0, tt - (q.delay || 0)); const qx = q.x + q.vx * del, qy = q.y + q.vy * del; const dd = Math.hypot(qx - px, qy - py) - q.r - pl.hitR; if (dd < 10) danger += (10 - dd) * (dd < 0 ? 40 : 4) / tt; }
              for (const e of w.enemies.filter((x) => !x.dead && !x.friendly)) { const v = vel.get(e) || { x: 0, y: 0 }; const dd = Math.hypot(e.x + v.x * tt - px, e.y + v.y * tt - py) - e.r - 18; if (dd < 0) danger += -dd * 8 / tt; }
              for (const m of w.telegraphs) { const dd = Math.hypot(m.x - px, m.y - py) - m.r - 14; if (dd < 0) danger += -dd * 3; }
              for (const k2 of w.creep) if (k2.team === 'enemy' && Math.hypot(k2.x - px, k2.y - py) < k2.r) danger += 30;
              const wall = Math.min(px - (c.x - 170), (c.x + 170) - px, py - (c.y - 98), (c.y + 98) - py); if (wall < 18) danger += (18 - wall) * 2;
            }
            // mild preference for mid range and for circling
            const nx = pl.x + vx * 0.2, ny = pl.y + vy * 0.2, rng = Math.hypot(nx - b.x, ny - b.y);
            danger += Math.abs(rng - 100) * 0.05 + (k < 0 ? 0.5 : 0) + (mv.x * vx + mv.y * vy < 0 ? 0.3 : 0);
            if (danger < bestD) { bestD = danger; best = { x: vx / (sp || 1), y: vy / (sp || 1) }; }
          }
          mv = best;
        }
        // shoot whatever is closing in first (as a player would), else the boss
        const add = w.enemies.filter((x) => !x.dead && !x.isBoss && !x.friendly && x.spawnT <= 0 && Math.hypot(x.x - pl.x, x.y - pl.y) < 70).sort((p, q) => Math.hypot(p.x - pl.x, p.y - pl.y) - Math.hypot(q.x - pl.x, q.y - pl.y))[0];
        const tgt = add || b;
        const ax = tgt.x - pl.x, ay = (tgt.y - tgt.hitY) - pl.y, al = Math.hypot(ax, ay) || 1;
        // let go of fire for a moment every 1.5 s so charged attacks release
        aim = (t % 1.5) < 0.05 ? null : { x: ax / al, y: ay / al };
        g.step(1 / 60); inp.endStep(); t += 1 / 60;
        for (const e of w.enemies) { const p = prev.get(e); if (p) { const v = vel.get(e) || { x: 0, y: 0 }; vel.set(e, { x: v.x * 0.5 + (e.x - p.x) * 30, y: v.y * 0.5 + (e.y - p.y) * 30 }); } prev.set(e, { x: e.x, y: e.y }); }
        const ph = Math.max(...bs.map((x) => x.data.phase ?? 0));
        if (ph > lastPhase) { phases.push(+t.toFixed(1)); lastPhase = ph; }
      }
      const left = all().reduce((a, b) => a + Math.max(0, b.hp), 0);
      w.hurtPlayer = realHurt;
      return { src, t: +t.toFixed(1), killed: all().length === 0, phases, hits, hpLeft: +(left / hp0).toFixed(2), dmg: +pl.stats.damage.toFixed(2), rate: +pl.stats.fireRate.toFixed(2), shots: pl.prof.shots };
    })()`);
    console.log(JSON.stringify({ boss: id, build, mode, ...r }));
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  await browser.close();
})();
