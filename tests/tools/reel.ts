// Captures gameplay for a vertical trailer, frame by frame. The page runs on a virtual clock, so every
// captured frame is exactly 1/30 s of game time no matter how slowly the headless browser draws it.
// Each scene is cropped to a 1080x1080 square that follows the action and saved as numbered JPEGs.
//   npx tsx tests/tools/reel.ts <outDir> [scene,...]   (npm run dev first)
import { chromium, type Page } from 'playwright-core';
import { CHROME } from '../browser';
import * as fs from 'fs';
import * as path from 'path';

const base = process.env.BASE_URL || 'http://localhost:5173/';
const out = process.argv[2] ?? 'test-output/reel';
const only = (process.argv[3] ?? '').split(',').filter(Boolean);
const FPS = 30;

/** Installed before the game loads: time only moves when the capture script says so. */
const CLOCK = `(() => {
  let vt = 0; const q = [];
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__vstep = (ms) => { vt += ms; for (const cb of q.splice(0)) cb(vt); };
})()`;

/** In-page helpers: a simple fighter AI, a camera that follows the action, and the square crop. */
const HELPERS = `(() => {
  const R = window.__R = { mode: { kind: 'fight' }, fx: null, fy: null, zoom: 1 };
  const d = window.__bomDebug, g = d.game;
  const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  R.ai = () => {
    const inp = g.input.down; for (const k of KEYS) inp.delete(k);
    const w = d.world; if (!w || g.scene !== 'run') return;
    const pl = w.player, m = R.mode;
    if (m.immortal !== false) { pl.health.red = pl.health.redMax; }
    const press = (dx, dy, keys) => { if (dx > 0.35) inp.add(keys[3]); if (dx < -0.35) inp.add(keys[1]); if (dy > 0.35) inp.add(keys[2]); if (dy < -0.35) inp.add(keys[0]); };
    if (m.kind === 'idle') return;
    if (m.kind === 'walk') { const dx = m.x - pl.x, dy = m.y - pl.y, l = Math.hypot(dx, dy) || 1; if (l > 3) press(dx / l, dy / l, ['KeyW', 'KeyA', 'KeyS', 'KeyD']); return; }
    const es = w.enemies.filter((e) => !e.dead && !e.charm && e.spawnT <= 0);
    if (!es.length) { if (m.wander) press(Math.cos(w.time), Math.sin(w.time * 0.7), ['KeyW', 'KeyA', 'KeyS', 'KeyD']); return; }
    let t = es.find((e) => e.isBoss) ?? es.reduce((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) < Math.hypot(b.x - pl.x, b.y - pl.y) ? a : b);
    const dx = t.x - pl.x, dy = t.y - pl.y, dist = Math.hypot(dx, dy) || 1;
    // aim: diagonal when the target is off-axis, so fans and beams sweep across the room
    const ax = dx / dist, ay = dy / dist;
    if (Math.abs(ax) > 0.38) inp.add(ax > 0 ? 'ArrowRight' : 'ArrowLeft');
    if (Math.abs(ay) > 0.38) inp.add(ay > 0 ? 'ArrowDown' : 'ArrowUp');
    // charged weapons fire on release: let go now and then
    if (m.release && Math.floor(w.time / m.release) % 2 === 1 && (w.time % m.release) < 0.12) { inp.delete('ArrowRight'); inp.delete('ArrowLeft'); inp.delete('ArrowDown'); inp.delete('ArrowUp'); }
    const s = Math.floor(w.time / 2.6) % 2 ? 1 : -1;
    let mx = -ay * s, my = ax * s;
    const far = m.far ?? 140, near = m.near ?? 80;
    if (dist > far) { mx += ax; my += ay; } else if (dist < near) { mx -= ax * 1.2; my -= ay * 1.2; }
    // stay off the walls
    const c = w.room.center(); if (Math.abs(pl.x - c.x) > 150) mx += Math.sign(c.x - pl.x); if (Math.abs(pl.y - c.y) > 70) my += Math.sign(c.y - pl.y);
    press(mx, my, ['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  };
  /** Where the crop should look: the player, pulled toward the boss when there is one. */
  R.focus = () => {
    const r = g.r, cw = r.display.width, ch = r.display.height, w = d.world;
    if (!w || g.scene !== 'run') return [cw / 2, ch / 2];
    const pl = w.player, sx = (x) => r.offX + (x - w.renderCamX) * r.scale, sy = (y) => r.offY + (y - w.renderCamY) * r.scale;
    let x = sx(pl.x), y = sy(pl.y - 10);
    const b = w.enemies.find((e) => e.isBoss && !e.dead);
    if (b) { x = x * 0.55 + sx(b.x) * 0.45; y = y * 0.55 + sy(b.y - 10) * 0.45; }
    // boss cards and banners sit in the middle of the screen: keep them in shot
    if (w.hud.bossIntroT > 0 || (R.mode.center ?? false)) { x = cw / 2; y = ch / 2; }
    return [x, y];
  };
  const crop = document.createElement('canvas'); crop.width = 1080; crop.height = 1080;
  const cx = crop.getContext('2d');
  /** Keep the room busy: whenever it thins out, more enemies crawl in away from the player. */
  R.waves = null;
  R.spawn = () => {
    const wv = R.waves, w = d.world; if (!wv || !w || g.scene !== 'run') return;
    wv.cd = (wv.cd ?? 0) - 1; if (wv.cd > 0) return;
    if (w.enemies.filter((e) => !e.dead).length >= wv.min) return;
    const pl = w.player, c = w.room.center();
    for (let k = 0; k < 12; k++) {
      const x = c.x + (Math.random() - 0.5) * 340, y = c.y + (Math.random() - 0.5) * 150;
      if (Math.hypot(x - pl.x, y - pl.y) < 110) continue;
      const e = w.spawnEnemy(wv.ids[Math.floor(Math.random() * wv.ids.length)], x, y, false);
      if (e) { e.hp = e.maxHp = e.maxHp * (wv.hp ?? 1.6); w.room.cleared = false; }
      break;
    }
    wv.cd = 5;
  };
  R.frame = (capture) => {
    // a fresh save unlocks achievements as it goes: keep their pop-ups out of the footage
    g.unlockQueue.length = 0;
    R.spawn(); R.ai(); window.__vstep(1000 / ${FPS});
    if (!capture) return null;
    const disp = g.r.display, [tx, ty] = R.focus();
    R.fx = R.fx == null ? tx : R.fx + (tx - R.fx) * 0.12; R.fy = R.fy == null ? ty : R.fy + (ty - R.fy) * 0.12;
    // a boss card is wider than the square: show the whole screen, letterboxed over a blurred copy of itself
    if (d.world && d.world.hud.bossIntroT > 0 || R.mode.full) {
      cx.filter = 'blur(14px) brightness(0.45)'; cx.drawImage(disp, (disp.width - disp.height) / 2, 0, disp.height, disp.height, -40, -40, 1160, 1160);
      cx.filter = 'none'; cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
      const h = 1080 * disp.height / disp.width; cx.drawImage(disp, 0, (1080 - h) / 2, 1080, h);
      return crop.toDataURL('image/jpeg', 0.9);
    }
    const size = 1080 / R.zoom;
    const x = Math.max(0, Math.min(disp.width - size, R.fx - size / 2)), y = Math.max(0, Math.min(disp.height - size, R.fy - size / 2));
    cx.imageSmoothingEnabled = R.zoom !== 1; cx.drawImage(disp, x, y, size, size, 0, 0, 1080, 1080);
    return crop.toDataURL('image/jpeg', 0.9);
  };
})()`;

async function pump(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i += 30) await page.evaluate(`(() => { for (let i = 0; i < ${Math.min(30, n - i)}; i++) window.__R.frame(false); })()`);
}
async function record(page: Page, dir: string, n: number, until?: string): Promise<number> {
  fs.mkdirSync(dir, { recursive: true });
  let i = 0;
  for (; i < n; i++) {
    const url: string = await page.evaluate('window.__R.frame(true)');
    fs.writeFileSync(path.join(dir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    if (until && i % 10 === 0 && await page.evaluate(until)) { n = Math.min(n, i + 1 + FPS * 2); until = undefined; }
  }
  return i;
}
const ev = (page: Page, js: string) => page.evaluate(`(async () => { const d = window.__bomDebug, g = d.game, R = window.__R; ${js} })()`);

/** Start a run on a fixed seed, optionally skipping ahead to a later floor. */
async function run(page: Page, seed: string, floors = 0): Promise<void> {
  await ev(page, `g.menus.stack = []; g.newRun('marcus', '${seed}'); R.mode = { kind: 'idle' }; R.zoom = 1; R.waves = null;`);
  await pump(page, 20);
  for (let i = 0; i < floors; i++) { await ev(page, `d.nextFloor();`); await pump(page, 80); }
}
/** Start a run and go down floor by floor until the given floor theme comes up (seeds are fixed, so this is repeatable). */
async function toTheme(page: Page, seeds: string[], themes: string[]): Promise<void> {
  for (const seed of seeds) {
    await run(page, seed);
    for (let i = 0; i < 10; i++) {
      const th: string = await page.evaluate('window.__bomDebug.world.floor.theme.id');
      if (themes.includes(th)) return;
      await ev(page, `d.world.run.flags.hospital = false; d.nextFloor();`); await pump(page, 80);
    }
  }
  throw new Error('never reached ' + themes.join('/'));
}
/** A fight on one floor: the floor's own room, topped up with that floor's 2.0 creatures, and a build. */
async function floorFight(page: Page, dir: string, seeds: string[], themes: string[], items: string[], ids: string[], mode = '{ kind: \'fight\' }', secs = 7): Promise<void> {
  await toTheme(page, seeds, themes);
  await fightRoom(page, items, 4);
  await ev(page, `R.waves = { ids: ${JSON.stringify(ids)}, min: 8, hp: 1.3 }; R.mode = ${mode}; R.fx = null; R.zoom = 1;`);
  await pump(page, 70);
  await record(page, dir, FPS * secs);
}
/** Walk into the next uncleared room of a type, topping it up with more of its own enemies if it's quiet. */
async function fightRoom(page: Page, items: string[], extra = 0): Promise<void> {
  await ev(page, `for (const id of ${JSON.stringify(items)}) d.give(id); const w = d.world;
    const room = w.floor.rooms.filter((r) => r.type === 'normal' && !r.cleared).pop(); d.goto(room.id);`);
  await pump(page, 12);
  if (extra) await ev(page, `const w = d.world, ids = [...new Set(w.enemies.map((e) => e.def.id))]; const c = w.room.center();
    for (let i = 0; i < ${extra} && ids.length; i++) d.spawn(ids[i % ids.length], c.x + (Math.random() - 0.5) * 300, c.y + (Math.random() - 0.5) * 120);`);
}

const SCENES: Record<string, (page: Page, dir: string) => Promise<void>> = {
  async story(page, dir) {
    await ev(page, `R.mode = { kind: 'idle' };`);
    await record(page, dir, FPS * 4);
  },
  async title(page, dir) {
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Enter'); await pump(page, 20); }
    await page.keyboard.press('Escape'); await pump(page, 30);
    await record(page, dir, FPS * 4);
  },
  async intro(page, dir) {
    await ev(page, `g.menus.stack = []; g.newRun('marcus', 'REELA'); R.mode = { kind: 'idle' }; R.zoom = 1; R.fx = null;`);
    await record(page, dir, FPS * 3);
  },
  async pickup(page, dir) {
    await run(page, 'REELB');
    await ev(page, `const w = d.world; const room = w.floor.rooms.find((r) => r.type === 'treasure'); d.goto(room.id);
      const ped = w.pickups.find((p) => p.pedestal); R.mode = { kind: 'walk', x: ped.x, y: ped.y }; R.fx = null; R.zoom = 1.25;`);
    await record(page, dir, FPS * 6, `!!window.__bomDebug.world.hud.banners.length`);
  },
  async fan(page, dir) {
    await run(page, 'REELC', 1);
    await fightRoom(page, ['prism', 'lamp_lure', 'burnt_toast', 'swollen_ink', 'hot_cocoa'], 6);
    await ev(page, `R.waves = { ids: ['mite', 'moth', 'ragcrawler', 'rat', 'pillbug', 'gasper'], min: 8 };`);
    await ev(page, `R.mode = { kind: 'fight' }; R.fx = null; R.zoom = 1;`);
    await pump(page, 100);
    await record(page, dir, FPS * 6);
  },
  async boom(page, dir) {
    await run(page, 'REELD', 2);
    await fightRoom(page, ['powder_ink', 'triple_seam', 'rubber_band', 'gavyns_pouch', 'hot_cocoa', 'ink_pact'], 8);
    await ev(page, `R.waves = { ids: ['rat', 'leech', 'bloater', 'mite', 'ragcrawler'], min: 9 };`);
    await ev(page, `R.mode = { kind: 'fight' }; R.fx = null; R.zoom = 1;`);
    await pump(page, 100);
    await record(page, dir, FPS * 6);
  },
  async beam(page, dir) {
    await run(page, 'REELE', 2);
    await fightRoom(page, ['burning_glass', 'long_needle', 'hot_cocoa', 'ink_pact', 'black_quill'], 8);
    await ev(page, `R.waves = { ids: ['sootsprite', 'cinderhopper', 'valvehead', 'stoker'], min: 7 };`);
    await ev(page, `R.mode = { kind: 'fight', release: 1.4 }; R.fx = null; R.zoom = 1;`);
    await pump(page, 100);
    await record(page, dir, FPS * 6);
  },
  async melee(page, dir) {
    await run(page, 'REELF', 1);
    await fightRoom(page, ['bone_folder', 'burnt_toast', 'hot_cocoa', 'ink_pact', 'clock_spring'], 8);
    await ev(page, `R.waves = { ids: ['mite', 'rat', 'ragcrawler', 'moth', 'pillbug'], min: 8 };`);
    await ev(page, `R.mode = { kind: 'fight', release: 1.6, near: 20, far: 40 }; R.fx = null; R.zoom = 1;`);
    await pump(page, 100);
    await record(page, dir, FPS * 6);
  },
  async swarm(page, dir) {
    await run(page, 'REELG', 1);
    await fightRoom(page, ['shadow_twin', 'moth_friend', 'thimble', 'ghost_cat', 'belfry_bat', 'bookworm', 'wax_angel', 'stitch_spider', 'hot_cocoa'], 8);
    await ev(page, `R.waves = { ids: ['skullmote', 'gravedigger', 'ossspider', 'choirboy'], min: 8 };`);
    await ev(page, `R.mode = { kind: 'fight' }; R.fx = null; R.zoom = 1;`);
    await pump(page, 100);
    await record(page, dir, FPS * 6);
  },
  async boss(page, dir) {
    await run(page, 'REELH', 1);
    await ev(page, `for (const id of ['prism', 'lamp_lure', 'burnt_toast', 'hot_cocoa', 'ink_pact', 'gavyns_pouch']) d.give(id);
      const w = d.world; const room = w.floor.rooms.find((r) => r.type === 'boss'); d.goto(room.id); R.mode = { kind: 'fight' }; R.fx = null; R.zoom = 1;`);
    await record(page, path.join(dir, 'card'), FPS * 4);
    await record(page, path.join(dir, 'fight'), FPS * 6);
    // skip ahead to the end of the fight and catch the death
    for (let i = 0; i < 90; i++) { await pump(page, 30); if (await page.evaluate(`(() => { const b = window.__bomDebug.world.enemies.find((e) => e.isBoss && !e.dead); return !b || b.hp / b.maxHp < 0.12; })()`)) break; }
    await record(page, path.join(dir, 'death'), FPS * 7, `!window.__bomDebug.world.enemies.some((e) => e.isBoss && !e.dead)`);
  },
  async cellar2(page, dir) {
    await floorFight(page, dir, ['REELK'], ['cellar', 'rootcellar'], ['prism', 'burnt_toast', 'hot_cocoa', 'gavyns_pouch'],
      ['lampkeeper', 'lurker', 'mildew', 'trunk', 'gasper', 'ragcrawler']);
  },
  async boiler2(page, dir) {
    await floorFight(page, dir, ['REELL', 'REELM', 'REELN'], ['boiler', 'coalchute'], ['powder_ink', 'triple_seam', 'rubber_band', 'hot_cocoa', 'gavyns_pouch'],
      ['foreman', 'riveter', 'bellows', 'brickback', 'sootsprite', 'cinderhopper']);
  },
  async under2(page, dir) {
    await floorFight(page, dir, ['REELO', 'REELP', 'REELQ'], ['underworks', 'flooded'], ['burning_glass', 'long_needle', 'hot_cocoa', 'black_quill'],
      ['sluicekeeper', 'bilgepriest', 'fumarole', 'leech', 'rat', 'drowner'], "{ kind: 'fight', release: 1.4 }");
  },
  async ward2(page, dir) {
    await floorFight(page, dir, ['REELR', 'REELS', 'REELT'], ['ward', 'morgue'], ['prism', 'lamp_lure', 'split_nib', 'hot_cocoa', 'gavyns_pouch', 'shadow_twin'],
      ['pill', 'pill', 'monitor', 'mourner', 'bloater']);
  },
  /** The Deep End: the Surgeon's card and the start of the fight. */
  async surgeon(page, dir) {
    await toTheme(page, ['REELU', 'REELV'], ['binding']);
    const OP = ['powder_ink', 'prism', 'lamp_lure', 'hot_cocoa', 'gavyns_pouch', 'marrow', 'iron_filings', 'shadow_twin', 'moth_friend', 'sunday_roast'];
    await ev(page, `for (const id of ${JSON.stringify(OP)}) d.give(id); const w = d.world;
      const room = w.floor.rooms.find((r) => r.type === 'boss'); d.goto(room.id); R.mode = { kind: 'fight', far: 150, near: 95 }; R.fx = null; R.zoom = 1;`);
    await record(page, path.join(dir, 'card'), FPS * 4);
    await pump(page, FPS * 3);
    await record(page, path.join(dir, 'fight'), FPS * 8);
  },
  async final(page, dir) {
    await ev(page, `g.menus.stack = []; g.newRun('marcus', 'ROOMFOUR'); R.mode = { kind: 'idle' }; R.zoom = 1;`);
    await pump(page, 40);
    for (let i = 0; i < 8; i++) {
      const th = await page.evaluate(`(() => { const w = window.__bomDebug.world; w.run.flags.room4 = true; w.run.flags.hospital = true; return w.floor.theme.id; })()`);
      if (th === 'room4') break;
      await ev(page, `d.nextFloor();`); await pump(page, 70);
    }
    const OP = ['powder_ink', 'prism', 'split_nib', 'lamp_lure', 'long_needle', 'static_heart', 'ink_pact', 'ink_horns', 'grandpas_pipe', 'black_quill',
      'hot_cocoa', 'gavyns_pouch', 'marrow', 'iron_filings', 'spectacles', 'shadow_twin', 'moth_friend', 'thimble', 'lodestone', 'tin_heart', 'sunday_roast'];
    await ev(page, `for (const id of ${JSON.stringify(OP)}) d.give(id); const w = d.world;
      const room = w.floor.rooms.find((r) => r.type === 'boss'); d.goto(room.id); R.mode = { kind: 'fight', far: 150, near: 95 }; R.fx = null; R.zoom = 1;`);
    await record(page, path.join(dir, 'card'), FPS * 4);
    await pump(page, FPS * 8);
    await record(page, path.join(dir, 'fight'), FPS * 10);
    for (let i = 0; i < 150; i++) { await pump(page, 30); if (await page.evaluate(`(() => { const b = window.__bomDebug.world.enemies.find((e) => e.isBoss && !e.dead); return !b || b.hp / b.maxHp < 0.08; })()`)) break; }
    await record(page, path.join(dir, 'late'), FPS * 8, `!window.__bomDebug.world.enemies.some((e) => e.isBoss && !e.dead)`);
  },
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(CLOCK);
  await page.goto(base); await page.waitForTimeout(3000);
  await page.evaluate(HELPERS);
  await pump(page, FPS * 6);   // through the splash to the main menu
  for (const [name, fn] of Object.entries(SCENES)) {
    if (only.length && !only.includes(name)) continue;
    const t0 = Date.now(); const dir = path.join(out, name); fs.rmSync(dir, { recursive: true, force: true });
    try { await fn(page, dir); console.log(name, 'ok', ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
    catch (e) { console.log(name, 'FAILED', String(e).slice(0, 300)); }
  }
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 5).join(' | ') : 'no page errors');
  await browser.close();
})();
