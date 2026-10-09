import type { Page } from 'playwright-core';

/** Run the real room/save/UI lifecycle; these checks deliberately exercise Continue and choice loss. */
export async function gameplayOverhaulChecks(page: Page): Promise<[boolean, string][]> {
  const checks: [boolean, string][] = await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game;
    const flow = await import('/src/game/roomflow.ts');
    const { getItem } = await import('/src/items/registry.ts');
    const { BINDINGS } = await import('/src/game/bindings.ts');
    const { recordScore, dailyReader } = await import('/src/game/progress.ts');
    const checks = [], check = (pass, label) => checks.push([!!pass, label]);
    const close = (a, b) => Math.abs(a - b) < 0.00001;
    g.newRun('marcus', 'POLISH22');
    const base = { damage: d.world.player.stats.damage, rate: d.world.player.stats.fireRate, keys: d.world.player.keys, bombs: d.world.player.bombs };
    g.newRun('marcus', 'POLISH22', null, 'normal', 'ember');
    check(close(d.world.player.stats.damage, base.damage * 1.25) && close(d.world.player.stats.fireRate, base.rate * 0.85), 'Ember has both its damage benefit and fire-rate cost');
    g.newRun('marcus', 'POLISH22', null, 'normal', 'wayfarer');
    check(d.world.player.keys === base.keys + 2 && d.world.player.bombs === base.bombs + 1 && close(d.world.player.stats.damage, base.damage * 0.85), 'Wayfarer grants its exploration kit and damage cost');
    g.newRun('marcus', 'POLISH22', null, 'hard', 'clockwork');
    let w = d.world;
    check(w.player.active === 'tuning_fork' && close(w.player.stats.damage, base.damage * 0.8), 'Clockwork supplies an active and applies its damage cost');
    const treasure = w.floor.rooms.find(r => r.type === 'treasure');
    d.goto(treasure.id);
    check(w.pickups.filter(p => p.pedestal && p.data.id).length === 1, 'a first-chapter treasure room holds one curio');
    // a choice room (deeper in, now and then): forced here so the take-one rules can be checked
    g.newRun('marcus', 'POLISH22', null, 'hard', 'clockwork'); w = d.world;
    w.run.flags.treasureChoice = true;
    const { populateRoom } = await import('/src/generation/populate.ts');
    const { RNG } = await import('/src/core/rng.ts');
    const tr2 = w.floor.rooms.find(r => r.type === 'treasure'); tr2.pickups = [];
    populateRoom(tr2, w.floor, w.run, new RNG('choice-test'), g.save);
    d.goto(tr2.id);
    const offers = w.pickups.filter(p => p.pedestal && p.data.id);
    check(offers.length === 2 && offers[0].data.id !== offers[1].data.id, 'a choice room offers two different treasure items');
    const left = offers[1].data.id;
    flow.takeItem(w, offers[0]);
    check(!offers[1].data.id && (w.run.flags.lostItems ?? []).includes(left), 'taking a choice removes the other and records it for Lost & Found');
    const dmgBefore = w.player.stats.damage;
    g.saveSnapshot(); g.save.flush();
    const taken = JSON.stringify(w.run.pools.serialize()), rng = JSON.stringify(w.run.pools.rngState());
    const next = w.run.pools.roll('shop');
    g.continueRun(); w = d.world;
    check(JSON.stringify(w.run.pools.serialize()) === taken && JSON.stringify(w.run.pools.rngState()) === rng, 'Continue does not consume phantom item-pool entries or RNG rolls');
    check(w.run.pools.roll('shop') === next, 'the next pool reward is identical across Continue');
    check(w.run.binding.id === 'clockwork' && close(w.player.stats.damage, dmgBefore), 'binding bonuses and costs survive Continue exactly once');
    check(w.pickups.filter(p => p.pedestal && p.data.id === left).length === 0, 'Continue cannot restore a rejected treasure offer');
    g.restartRun(); w = d.world;
    check(w.run.mode === 'hard' && w.run.binding.id === 'clockwork', 'Begin again retains difficulty and binding');
    const combats = w.floor.rooms.filter(r => r.type === 'normal' && r.spawns.length);
    const first = combats[0]; d.goto(first.id); w.player.charge = 0;
    w.enemies = []; w.bossList = []; w.lockdown = false; w.room.flags.ambush = null; w.room.cleared = false;
    w.roomTime = 30; flow.checkRoomClear(w);
    check(w.player.charge === getItem(w.player.active).active.charge, 'Clockwork earns its extra charge on a combat clear');
    w.run.flags.cleanStreak = 2;
    const third = combats[1]; d.goto(third.id); w.enemies = []; w.bossList = []; w.lockdown = false;
    w.room.flags.ambush = null; w.room.cleared = false; w.room.flags.variant = undefined; w.roomHit = false; w.roomTime = 30;
    flow.checkRoomClear(w);
    check(w.run.flags.cleanStreak === 3 && w.pickups.some(p => p.kind === 'chest:tin'), 'the third clean clear guarantees a chest without a key cost');
    const paidBefore = w.pickups.length; flow.checkRoomClear(w);
    check(w.pickups.length === paidBefore && w.run.flags.cleanStreak === 3, 'an already-cleared room cannot pay another flawless reward');
    w.room.flags.refights = 1; w.room.cleared = false; flow.checkRoomClear(w);
    check(w.run.flags.cleanStreak === 3, 'deliberate refights cannot farm flawless progress');
    delete w.room.flags.refights;
    w.player.iframes = 0; w.player.health.addExtra('wax', 6); w.roomHit = false; w.run.flags.hitThisFloor = false;
    w.hurtPlayer(1, 'sacrifice test', { redFirst: true });
    check(w.run.flags.cleanStreak === 3 && !w.roomHit && !w.run.flags.hitThisFloor, 'voluntary health payments do not break combat mastery');
    w.player.iframes = 0; w.hurtPlayer(1, 'combat test');
    check(w.run.flags.cleanStreak === 0 && w.roomHit, 'a combat hit breaks the streak immediately');
    w.roomTime = 19; g.saveSnapshot(); g.continueRun(); w = d.world;
    check(w.roomHit && w.roomTime === 19, 'Continue preserves damage and elapsed time in the current room');
    const hitRoom = w.room.id;
    flow.enterRoom(w, w.floor.startId, null, false); flow.enterRoom(w, hitRoom, null, false);
    check(w.roomHit && w.roomTime === 19, 'leaving and re-entering cannot erase combat damage or the clear timer');
    w.room.cleared = false; w.room.type = 'boss'; w.enemies = []; w.bossList = []; w.lockdown = false; w.room.flags.ambush = null;
    w.roomHit = false; w.run.flags.cleanStreak = 2; flow.checkRoomClear(w);
    check(w.run.flags.cleanStreak === 3 && w.pickups.some(p => p.kind === 'chest:tin'), 'a flawless boss clear counts toward the same three-room reward');
    g.newRun('marcus', 'POLISH22', 'glass', 'normal', 'ember');
    check(d.world.run.binding.id === 'unbound', 'challenge rules cannot be bypassed with a custom binding');
    g.newRun('marcus', 'DAILY222', null, 'daily', 'wayfarer'); w = d.world;
    check(w.run.binding.id === 'unbound' && w.run.charId === dailyReader('DAILY222').id, 'the Daily supplies a fixed reader and binding independently of the requested kit');
    w.run.flags.dailyDay = '2001-01-01'; g.restartRun(); w = d.world;
    check(w.run.seed === 'DAILY222' && w.run.mode === 'daily' && w.run.flags.dailyDay === '2001-01-01', 'a Daily retry retains its seed and original UTC day');
    recordScore(g.save, w.run, true);
    check(g.save.data.stats['best_daily_2001-01-01'] > 0, 'a run finished after midnight credits the day it began');
    // teleporting into a locked curio room or shop opens its doors, so you can always leave
    g.newRun('marcus', 'TPLOCKED'); w = d.world; d.nextFloor(); w = d.world;
    for (const type of ['treasure', 'shop']) {
      const r = w.floor.rooms.find((x) => x.type === type);
      if (!r) continue;
      w.room.cleared = true; w.lockdown = false;
      g.teleport(r.id);
      check(w.room.id === r.id && w.doors.length > 0 && w.doors.every((x) => !x.def.locked), 'teleporting into a locked ' + type + ' room unlocks its door');
    }
    // a teleport never lands you on the boss or on the Pincushion's spikes
    const br = w.floor.rooms.find((x) => x.type === 'boss');
    w.room.cleared = true; w.lockdown = false; g.teleport(br.id);
    const boss = w.enemies.find((e) => e.isBoss && !e.dead);
    check(!!boss && Math.hypot(boss.x - w.player.x, boss.y - w.player.y) > 60, 'teleporting into the boss room keeps you clear of the boss (' + (boss ? Math.round(Math.hypot(boss.x - w.player.x, boss.y - w.player.y)) : 'no boss') + ' px)');
    let pin = w.floor.rooms.find((x) => x.type === 'sacrifice');
    for (let k = 0; !pin && k < 40; k++) { g.newRun('marcus', 'PINCUSH' + k); w = d.world; pin = w.floor.rooms.find((x) => x.type === 'sacrifice'); }
    check(!!pin, 'found a floor with a Pincushion room to teleport into');
    if (pin) {
      w.room.cleared = true; w.lockdown = false; g.teleport(pin.id);
      const [pc, pr] = w.room.cellAt(w.player.x, w.player.y);
      check(w.room.id === pin.id && w.room.at(pc, pr) === 0, 'teleporting into the Pincushion room lands on open floor, not the spikes');
    }
    const sr = w.floor.rooms.find((x) => x.type === 'secret');
    if (sr) { w.room.cleared = true; g.teleport(sr.id); check(w.doors.some((x) => !x.def.hidden), 'teleporting into a crawlspace leaves a way out'); }
    g.menus.stack = []; g.menus.push(g.menus.newRunScreen());
    const screen = g.menus.stack.at(-1);
    screen.update(['down'], 0); screen.update(['right'], 0);
    // Drawing the page for a few characters makes layout failures visible to the screenshot pass.
    for (const id of ['marcus', 'nell', 'bram']) { const s = g.menus.newRunScreen(null, id); s.render(g.r.uiBegin()); }
    check(true, 'the new-run page renders through the real menu');
    return checks;
  })()`);
  // Real input, in addition to the lifecycle checks above.
  await page.evaluate(`(() => { const g = window.__bomDebug.game; g.quitToMenu(); g.menus.stack = []; g.menus.push(g.menus.newRunScreen()); })()`);
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.waitForFunction(`window.__bomDebug.game.scene === 'run'`);
  checks.push([await page.evaluate(`window.__bomDebug.world.run.binding.id === 'unbound'`), 'keyboard: Enter, Enter starts a run with the character\'s own kit']);
  await page.evaluate(`(() => { const g = window.__bomDebug.game; g.quitToMenu(); g.menus.stack = []; g.menus.push(g.menus.newRunScreen()); })()`);
  const point = await page.evaluate(`({ scale: window.__bomDebug.game.r.scale / window.devicePixelRatio, x: window.__bomDebug.game.r.offX / window.devicePixelRatio, y: window.__bomDebug.game.r.offY / window.devicePixelRatio })`) as { scale: number; x: number; y: number };
  await page.mouse.click(point.x + 300 * point.scale, point.y + 223 * point.scale);
  await page.waitForFunction(`window.__bomDebug.game.scene === 'run'`);
  checks.push([await page.evaluate(`window.__bomDebug.world.run.binding.id === 'unbound'`), 'clicking Begin starts a run (no playstyle to pick)']);
  return checks;
}
