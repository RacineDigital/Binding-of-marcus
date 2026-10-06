// End-to-end checks in a real browser against the dev server (npm run dev first), failing loudly.
//   npx tsx tests/e2e.ts
// Covers: a fresh run, save & continue (bonus rooms, doors, floor effects, items, pickups, room),
// death and restart, chapter transitions, music memory, and frame time in a busy fight.
import { chromium, Page } from 'playwright-core';
import { gameplayOverhaulChecks } from './gameplay-overhaul';
const base = process.env.BASE_URL || 'http://localhost:5173/';
let failures = 0;
const ok = (cond: unknown, msg: string) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) failures++; };
const ev = <T>(p: Page, js: string): Promise<T> => p.evaluate(js) as Promise<T>;
const D = 'window.__bomDebug';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForTimeout(3000);
  await page.keyboard.press('Enter');   // unlock audio
  await page.waitForTimeout(300);

  console.log('sprite roster');
  const art = await ev<any>(page, `(async () => {
    const { ALL_ENEMY_DEFS } = await import('/src/enemies/registry.ts');
    const { getSprites } = await import('/src/enemies/enemy.ts');
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 240;
    const ctx = canvas.getContext('2d'); let frames = 0, sets = 0;
    for (const def of ALL_ENEMY_DEFS()) for (const list of Object.values(getSprites(def))) {
      if (!list.length) continue; sets++;
      for (const sprite of list) {
        if (!sprite.w || !sprite.h || sprite.art.data.length !== sprite.w * sprite.h) throw new Error('Invalid sprite: ' + def.id);
        frames++;
      }
      list[0].draw(ctx,120,200); list[0].draw(ctx,120,200,{ flip: true, flash: 0.5 });
    }
    return { sets, frames };
  })()`);
  ok(art.sets > 100 && art.frames > 500, `sprite roster renders normal and flipped/hurt poses (${art.frames} frames in ${art.sets} sets)`);

  console.log('gameplay overhaul');
  for (const [pass, label] of await gameplayOverhaulChecks(page)) ok(pass, label);

  console.log('fresh run');
  await ev(page, `(() => { const g = ${D}.game; g.menus.stack = []; g.newRun('marcus', 'E2ESEED1'); })()`);
  await page.waitForTimeout(2200);
  ok(await ev(page, `${D}.game.scene === 'run' && !!${D}.world.room`), 'a run starts in its first room');
  // move: input reaches the player
  await page.waitForFunction(`!${D}.world.inputLocked()`, null, { timeout: 5000 });
  const x0 = await ev<number>(page, `${D}.world.player.x`);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD');
  ok((await ev<number>(page, `${D}.world.player.x`)) > x0 + 15, 'walking right moves Marcus');

  console.log('pause, help and settings');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  ok(await ev(page, `${D}.game.paused`), 'Esc pauses');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  ok(await ev(page, `${D}.game.menus.stack.length === 1`), 'Help & controls opens from the pause menu');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  ok(await ev(page, `!${D}.game.paused && ${D}.game.menus.stack.length === 0`), 'Esc backs out of help, then resumes');

  console.log('focus loss and safe restart');
  await page.keyboard.down('KeyD');
  await ev(page, `window.dispatchEvent(new Event('blur'))`);
  const pausedAt = await ev<number>(page, `${D}.world.run.stats.time`);
  await page.waitForTimeout(300);
  ok(await ev(page, `${D}.game.paused && ${D}.world.run.stats.time === ${pausedAt}`), 'focus loss pauses simulation');
  ok(await ev(page, `${D}.game.input.moveVector().x === 0`), 'focus loss clears held movement');
  await page.keyboard.up('KeyD');
  await ev(page, `window.dispatchEvent(new Event('focus'))`);
  ok(await ev(page, `${D}.game.paused`), 'regaining focus waits for deliberate resume');
  const seedBeforeRestart = await ev<string>(page, `${D}.world.run.seed`);
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok(await ev(page, `${D}.game.menus.stack.length === 1 && ${D}.game.paused`), 'restart asks for confirmation');
  await page.keyboard.press('Enter'); await page.waitForTimeout(200); // No is selected by default
  ok(await ev(page, `${D}.world.run.seed === ${JSON.stringify(seedBeforeRestart)} && ${D}.game.paused && ${D}.game.menus.stack.length === 0`), 'default No keeps the current run');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(await ev(page, `!${D}.game.paused`), 'the preserved run resumes');

  console.log('save & continue');
  const before = await ev<any>(page, `(async () => {
    const d = ${D}, w = d.world, g = d.game;
    d.god();
    // a room opened during play, beside one with space for it
    let bonus = null;
    for (const r of w.floor.rooms.filter((r) => r.type === 'start' || r.type === 'normal')) { d.goto(r.id); d.killAll(); bonus = await d.bargain('lostfound'); if (bonus !== null) break; }
    w.player.addTemp({ id: 'e2e_floor', stats: { damage: 1 }, floor: true });
    d.give('split_nib'); d.give('moth_friend');
    g.saveSnapshot(); g.save.flush();
    return { rooms: w.floor.rooms.length, room: w.room.id, bonus, type: w.room.type, doors: w.floor.rooms.map((r) => r.doors.length).join(','),
      items: [...w.player.items.keys()].sort().join(','), dmg: w.player.stats.damage, pickups: w.pickups.length, floor: w.run.floorIndex };
  })()`);
  ok(before.type === 'lostfound', 'a Lost & Found room opened during play');
  await ev(page, `(() => { const g = ${D}.game; g.quitToMenu(); g.world = null; })()`);
  await page.waitForTimeout(500);
  ok(await ev(page, `${D}.game.continueRun()`), 'continue succeeds');
  await page.waitForTimeout(1500);
  const after = await ev<any>(page, `(() => { const w = ${D}.world; return { rooms: w.floor.rooms.length, room: w.room.id, type: w.room.type, doors: w.floor.rooms.map((r) => r.doors.length).join(','),
    items: [...w.player.items.keys()].sort().join(','), dmg: w.player.stats.damage, pickups: w.pickups.length, floor: w.run.floorIndex, temp: w.player.temp.some((t) => t.id === 'e2e_floor') }; })()`);
  ok(after.rooms === before.rooms, `the floor keeps its bonus room (${after.rooms}/${before.rooms} rooms)`);
  ok(after.doors === before.doors, 'every door comes back, including the one to the bonus room');
  ok(after.room === before.room && after.type === before.type, 'resumes in the same room');
  ok(after.items === before.items, 'items carried are restored');
  ok(after.temp && Math.abs(after.dmg - before.dmg) < 0.01, 'an effect lasting the floor survives the continue');
  ok(after.pickups === before.pickups, `the room's pickups are restored (${after.pickups}/${before.pickups})`);
  ok(await ev(page, `${D}.game.menus.stack.length === 0`), 'no menu is left open over the continued run');

  console.log('chapter transition');
  await ev(page, `${D}.nextFloor()`);
  await page.waitForTimeout(2500);
  ok((await ev<number>(page, `${D}.world.run.floorIndex`)) === before.floor + 1, 'next chapter loads');
  ok(await ev(page, `!${D}.world.player.temp.some((t) => t.id === 'e2e_floor')`), 'floor effects end with the floor');
  const treasureDoors = await ev<number[]>(page, `${D}.world.floor.rooms.filter((r) => r.type === 'treasure').map((r) => r.doors.length)`);
  ok(treasureDoors.every((n) => n === 1), `treasure rooms have one entrance (${treasureDoors.join(',')})`);

  console.log('item combinations');
  for (const build of [['printing_plate', 'creasing_iron', 'marrow', 'spectacles'], ['grandpas_pipe', 'marginalia', 'copper_filament', 'red_thread'], ['spilt_inkwell', 'ink_pact', 'bookends', 'paper_cut', 'overdue_notice', 'gilt_edge', 'reading_lamp', 'running_shoes', 'hot_cocoa', 'four_leaf']]) {
    await ev(page, `(() => { const d = ${D}, w = d.world; d.god(); for (const e of w.enemies) e.hp = 0; for (const id of ${JSON.stringify(build)}) d.give(id); w.player.buttons = 25; for (let i = 0; i < 6; i++) d.spawn('valvehead'); })()`);
    await page.waitForFunction(`!${D}.world.inputLocked() && !${D}.world.transition`, null, { timeout: 8000 }).catch(() => {});
    const hp0 = await ev<number>(page, `${D}.world.enemies.filter((e) => !e.dead).reduce((s, e) => s + e.hp, 0)`);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(6000);   // stand still: the creasing iron and printing plate both need time
    const hp1 = await ev<number>(page, `${D}.world.enemies.filter((e) => !e.dead).reduce((s, e) => s + e.hp, 0)`);
    ok(hp1 < hp0, `${build.join(' + ')}: the build fights (${Math.round(hp0)} → ${Math.round(hp1)} enemy hp)`);
  }
  ok(await ev(page, `${D}.world.player.temp.some((t) => t.id === 'gilt_edge' && t.stats.damage === 2)`), 'Gilt Edge pays +2 damage for 25 buttons');

  console.log('busy combat');
  const perf = await ev<any>(page, `(async () => {
    const d = ${D}, w = d.world; d.god();
    const ids = ['valvehead', 'moth', 'mite', 'gasper', 'cinderhopper'];
    for (let i = 0; i < 18; i++) d.spawn(ids[i % ids.length], undefined, undefined);
    for (const id of ['triple_seam', 'twin_wick', 'rubber_band', 'powder_ink', 'copper_filament']) d.give(id);
    const t0 = performance.now(); let frames = 0, worst = 0, last = t0, upd = 0, ren = 0;
    await new Promise((res) => { const f = () => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; frames++; upd += d.game.perf.update; ren += d.game.perf.render; if (n - t0 < 4000) requestAnimationFrame(f); else res(0); }; requestAnimationFrame(f); });
    return { fps: frames / 4, worst: Math.round(worst), proj: w.proj.count(), updateMs: +(upd / frames).toFixed(2), renderMs: +(ren / frames).toFixed(2) };
  })()`);
  console.log('   ', JSON.stringify(perf));
  // the game's own work per frame (headless software GL adds a large, machine-dependent cost on top)
  ok(perf.updateMs < 6 && perf.renderMs < 16, `busy fight: game logic ${perf.updateMs} ms and drawing ${perf.renderMs} ms a frame`);

  console.log('death & restart');
  await ev(page, `(() => { const w = ${D}.world; w.player.iframes = 0; w.player.health.red = 1; w.player.health.extra = []; w.hurtPlayer(2, 'test', { ignoreIframes: true }); })()`);
  await page.waitForFunction(`${D}.game.scene === 'dead'`, null, { timeout: 8000 }).catch(() => {});
  ok(await ev(page, `${D}.game.scene === 'dead'`), 'dying shows the death screen');
  await ev(page, `(() => { const g = ${D}.game; g.menus.stack = []; g.newRun('marcus', 'E2ESEED2'); })()`);
  await page.waitForTimeout(2000);
  ok(await ev(page, `${D}.game.scene === 'run' && ${D}.world.player.health.red > 0`), 'a new run starts cleanly after death');

  console.log('unlocks');
  const un = await ev<any>(page, `(() => { const s = ${D}.game.save; s.data.unlocks = s.data.unlocks.filter((u) => u !== 'runs_5'); s.data.seenUnlocks = s.data.unlocks.slice();
    s.unlock('runs_5');
    const raw = localStorage.getItem('slot' + s.slot) || Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('');
    return { stored: raw.includes('"runs_5"'), fresh: !s.data.seenUnlocks.includes('runs_5'), toast: ${D}.game.unlockQueue.some((u) => u.reward.includes('Trash Island')),
      thisRun: (${D}.world.run.flags.unlockedNow || []).includes('runs_5') }; })()`);
  ok(un.stored, 'an unlock is written to storage at once, not at the next save');
  ok(un.fresh && un.toast, 'a new unlock is marked NEW and its toast says what it unlocks');
  ok(un.thisRun, 'the run remembers what it unlocked for its last page');

  console.log('music');
  const mus = await ev<any>(page, `(async () => { const m = await import('/src/audio/render.ts'); const a = ${D}.game.audio; return { cached: m.cachedSongs(), track: a.music && a.music.name, recs: a.music && a.music.recs.size }; })()`);
  console.log('   ', JSON.stringify(mus));
  await page.waitForFunction(`${D}.game.audio.music?.cur?.recording`, null, { timeout: 10000 });
  const gains = await ev<any>(page, `(() => {
    const m = ${D}.game.audio.music, old = m.intensity;
    m.intensity = 0.5; m.applyMix(true);
    const total = m.cur.calm.gain.value + m.cur.combat.gain.value;
    m.intensity = old; m.applyMix(true); return total;
  })()`);
  ok(Math.abs(gains - 1) < 0.001, 'recorded music crossfade avoids a volume surge');

  ok(mus.cached <= 5, 'rendered songs are capped');
  ok(mus.recs <= 2, 'decoded recordings are capped');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'all e2e checks passed');
  process.exit(failures ? 1 : 0);
})();
