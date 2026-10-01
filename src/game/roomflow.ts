// Room lifecycle: entering, doors, clearing, rewards, special rooms and floor progression.
import type { World, DoorRT } from './world';
import { RoomData, Side, opposite, Ob, ROOM_NAMES, DoorDef, SpawnDef } from '../rooms/room';
import { TILE, VIEW_W, VIEW_H } from '../core/constants';
import { paintRoomBackground } from '../art/roombg';
import { propsFor } from '../art/props';
import { Enemy } from '../enemies/enemy';
import { getEnemy } from '../enemies/registry';
import { Pickup, popPickup } from './pickups';
import { spawnDrop, rollDropKind } from './drops';
import { RNG } from '../core/rng';
import { getItem, getConsumable } from '../items/registry';
import { makeNpc } from './npc';
import { familiarsOnRoomEnter, familiarsOnRoomClear, syncFamiliars } from '../items/familiar_rt';
import { generateFloor, addBargainRoom, pickTheme } from '../generation/floorgen';
import { itemIconCanvas } from '../art/items';
import { dist2, TAU } from '../core/math';
import { solidCell, lineClear } from '../rooms/collide';
import { TRANSFORM_EFFECTS } from '../player/player';
import { SWEET_EFFECTS } from '../items/data/consumables';
import { FINAL_FLOOR, enemyHpMul } from '../data/floors';
import { checkProgress, onChapterCleared } from './progress';
import { BOSS_ALIASES } from '../bosses/aliases';
import { CHALLENGES } from '../data/achievements';

// ------------------------------------------------------------------ floors
export function startFloor(w: World): void {
  const run = w.run;
  const floor = generateFloor(run, run.floorIndex, w.game.save);
  w.floor = floor; w.theme = floor.theme; w.props = propsFor(floor.theme);
  run.flags.hitThisFloor = false; run.flags.bossHit = false; run.flags.floorStartTime = run.stats.time;
  w.player.clearTemp((t) => !!t.floor);
  const start = floor.rooms[floor.startId];
  const c = start.center();
  w.player.x = c.x; w.player.y = c.y + 20; w.player.vx = w.player.vy = 0;
  w.trapdoor = null;
  enterRoom(w, floor.startId, null, false);
  w.itemHook('onFloor');
  if (w.player.transformations.has('bone')) w.player.health.addBrass(1);
  if (floor.curse === 'lost') { /* map hidden */ }
  if (floor.curse === 'seen') revealMap(w, false);
  w.floorIntroT = 2.6;
  w.hud.floorCard(floor.label, floor.theme.subtitle, floor.curse);
  w.audio.setMusic(floor.theme.music);
  w.audio.prepareMusic(w.run.floorIndex >= FINAL_FLOOR ? 'bossFinal' : w.run.floorIndex >= 4 ? 'boss2' : 'boss');
  const nextTheme = pickTheme(w.run, w.run.floorIndex + 1);
  if (nextTheme) w.audio.prepareMusic(nextTheme.music);
  if (w.run.floorIndex === 0) w.audio.prepareMusic('death');
  w.audio.setIntensity(0);
  w.game.saveSnapshot();
}

/** Snapshot of the current floor's mutable state (for mid-run saves). */
export function serializeFloor(w: World): any {
  if (!w.floor || !w.room) return null;
  persistRoom(w);
  return {
    floor: w.run.floorIndex, room: w.room.id, px: Math.round(w.player.x), py: Math.round(w.player.y),
    rooms: w.floor.rooms.map((r) => ({
      c: r.cleared, v: r.visited, s: r.seen, d: r.discovered,
      g: Array.from(r.grid), h: Array.from(r.ghp, (x) => Math.round(x * 10) / 10), gv: Array.from(r.gvar),
      p: r.pickups, n: r.npcs, f: { ...r.flags, lights: undefined }, sp: r.spawns, wv: r.waves,
      dr: r.doors.map((d) => [d.locked ? 1 : 0, d.hidden ? 1 : 0, d.chained ? 1 : 0]),
    })),
  };
}

/** Rebuild a floor from its seed and lay a saved state over it, resuming in the saved room. */
export function restoreFloor(w: World, st: any): void {
  const run = w.run;
  const floor = generateFloor(run, run.floorIndex, w.game.save);
  w.floor = floor; w.theme = floor.theme; w.props = propsFor(floor.theme);
  floor.rooms.forEach((r, i) => {
    const s = st.rooms[i]; if (!s) return;
    r.cleared = s.c; r.visited = s.v; r.seen = s.s; r.discovered = s.d;
    if (s.g?.length === r.grid.length) { r.grid.set(s.g); r.ghp.set(s.h); r.gvar.set(s.gv); }
    r.pickups = s.p ?? []; r.npcs = s.n ?? []; r.flags = { ...(s.f ?? {}) }; r.spawns = s.sp ?? r.spawns; r.waves = s.wv ?? r.waves;
    (s.dr ?? []).forEach((d: number[], k: number) => { const door = r.doors[k]; if (door) { door.locked = !!d[0]; door.hidden = !!d[1]; door.chained = !!d[2]; } });
  });
  w.trapdoor = null;
  const id = floor.rooms[st.room] ? st.room : floor.startId;
  enterRoom(w, id, null, false);
  w.player.x = st.px; w.player.y = st.py; w.player.vx = w.player.vy = 0;
  w.snapCamera();
  w.floorIntroT = 0.8;
  w.hud.roomName('Continued · ' + floor.label);
  w.audio.setMusic(floor.theme.music);
  w.audio.prepareMusic(run.floorIndex >= FINAL_FLOOR ? 'bossFinal' : run.floorIndex >= 4 ? 'boss2' : 'boss');
  w.audio.setIntensity(w.enemies.length ? 1 : 0);
}

export function nextFloor(w: World): void {
  const run = w.run;
  run.stats.floorsCleared++;
  if (run.floorIndex >= FINAL_FLOOR) { w.game.onVictory(); return; }
  run.floorIndex++;
  w.game.save.stat('floorsCleared', 1);
  onChapterCleared(w);
  checkProgress(w);
  // free cached room canvases of the old floor
  for (const r of w.floor.rooms) r.bgCache = null;
  startFloor(w);
}

// ------------------------------------------------------------------ rooms
function persistRoom(w: World): void {
  const room = w.room;
  if (!room) return;
  room.pickups = w.pickups.filter((p) => !p.dead && p.collectT < 0).map((p) => ({ kind: p.kind, x: p.x, y: p.y, data: { ...p.data, price: p.price, deal: p.deal, shop: p.shop, opened: p.opened } }));
  room.npcs = w.npcs.filter((n) => !n.dead).map((n) => ({ kind: n.kind, x: n.x, y: n.y, data: n.data }));
}

export function enterRoom(w: World, id: number, from: Side | null, transition: boolean): void {
  const snap = transition ? w.game.snapshotWorld() : null;
  persistRoom(w);
  const room = w.floor.rooms[id];
  const prevType = w.room?.type;
  w.room = room;
  room.visited = true; room.seen = true; room.discovered = true;
  for (const d of room.doors) { const n = w.floor.rooms[d.to]; if (n && !d.hidden) n.seen = true; }
  if (!room.bgCache) room.bgCache = paintRoomBackground(room, w.theme);
  w.obstacleDirty = true;
  w.enemies = []; w.proj.clear(); w.beams = []; w.bombs = []; w.creep = []; w.fx.clear(); w.bossList = [];
  w.pendingKegs = []; w.lockdown = false; w.labels = [];
  w.tasks = w.tasks.filter((t) => t.persist); w.telegraphs = []; w.corpses = [];
  w.trapdoor = room.flags.trap ? { x: room.flags.trap.x, y: room.flags.trap.y, t: 2, kind: 'down' } : null;
  w.roomTime = 0; w.stuckT = 0; w.roomRng = new RNG(room.seed + ':rt');
  // a beat to read the room before anything fires; enemy shots are slower on early chapters
  w.proj.enemyGrace = room.cleared ? 0 : 0.9;
  w.proj.enemySpeedMul = [0.8, 0.86, 0.92, 0.96, 1, 1.02, 1.05, 1.08][Math.min(7, w.run.floorIndex)] * (w.run.mode === 'hard' ? 1.12 : 1);
  // pickups & npcs
  w.pickups = room.pickups.map((s) => {
    const p = new Pickup(s.kind, s.x, s.y);
    const d = s.data ?? {};
    p.price = d.price ?? 0; p.deal = d.deal ?? 0; p.shop = !!d.shop; p.opened = !!d.opened;
    p.data = { ...d }; delete p.data.price; delete p.data.deal; delete p.data.shop; delete p.data.opened;
    p.noCollect = 0.3;
    return p;
  });
  w.npcs = room.npcs.map((n) => { const npc = makeNpc(w, n.kind, n.x, n.y); npc.data = n.data ?? {}; return npc; });
  // player placement
  const pl = w.player;
  if (from !== null) {
    const side = opposite(from);
    const door = room.doors.find((d) => d.side === side && nearDoorSlot(room, d, pl, from));
    const dd = door ?? room.doors.find((d) => d.side === side);
    if (dd) {
      const p = room.doorPos(dd.side, dd.slot);
      const inset = 16;
      pl.x = p.x + (side === Side.W ? inset : side === Side.E ? -inset : 0);
      pl.y = p.y + (side === Side.N ? inset + 6 : side === Side.S ? -inset + 2 : 6);
      // nudge off anything solid at the entry
      unstick(w);
    }
    pl.squashX = 0.85; pl.squashY = 1.15;
    w.fx.smoke(pl.x, pl.y, 3, 'rgba(90,80,90,', 3, 0.4, 4);
  }
  // doors
  w.doors = room.doors.map((d) => {
    const p = room.doorPos(d.side, d.slot);
    const rt: DoorRT = { def: d, open: 0, x: p.x, y: p.y, revealed: !d.hidden };
    rt.open = room.cleared && !d.locked && !d.hidden ? 1 : 0;
    if (from !== null && d.side === opposite(from) && !room.cleared && !d.hidden) rt.open = 1; // slams shut
    return rt;
  });
  // enemies
  const spawnDelay = 0.55;
  if (!room.cleared) {
    if (room.type === 'boss' || room.type === 'miniboss') startBoss(w, room);
    else for (const s of room.spawns) {
      const c = room.cellCenter(s.c, s.r);
      const e = spawnEnemy(w, s.id, c.x + (s.c % 1) * 0, c.y, false);
      if (e) { e.spawnT = spawnDelay + Math.random() * 0.15; if (s.champion) makeChampion(e); }
    }
    if (room.type === 'challenge' && !room.flags.started) { /* waits for the button */ }
    if (w.enemies.length === 0 && room.type !== 'challenge') room.cleared = true;
    if (room.type === 'challenge' && room.flags.done) room.cleared = true;
  }
  if (room.cleared) for (const d of w.doors) d.open = d.def.locked || (d.def.hidden && !d.revealed) ? 0 : 1;
  // bonus decorations for special rooms
  familiarsOnRoomEnter(w);
  w.flow.build(w);
  w.snapCamera();
  if (snap && from !== null) {
    const dx = [0, 1, 0, -1][from], dy = [-1, 0, 1, 0][from];
    w.transition = { snap, dx, dy, t: 0, dur: 0.3, kind: 'slide' };
  }
  // audio
  const hasEnemies = w.enemies.length > 0;
  w.audio.setIntensity(hasEnemies ? 1 : 0);
  if (from !== null) w.audio.play(hasEnemies ? 'doorSlam' : 'door', { vol: 0.6 });
  if (from !== null) w.game.autosave();
  if (room.flags.variant && !room.cleared && !room.flags.announced) {
    room.flags.announced = true;
    w.hud.roomName(VARIANT_NAMES[room.flags.variant] ?? '');
  }
  if (room.type !== 'normal' && room.type !== 'start' && room.type !== 'boss' && !room.flags.announced) {
    room.flags.announced = true;
    w.hud.roomName(ROOM_NAMES[room.type]);
    if (room.type === 'secret' || room.type === 'supersecret') w.audio.play('secret');
    if (room.type === 'supersecret') w.game.save.unlock('supersecret');
    if (room.type === 'deal') w.audio.stinger('deal');
    if (room.type === 'blessing') w.audio.stinger('blessing');
  }
  if (room.type === 'boss' && room.cleared && prevType !== 'boss') w.audio.setMusic(w.theme.music);
  w.itemHook('onRoomEnter');
  w.player.clearTemp((t) => !!t.room);
  w.player.activeRoomUses = 0;
  if (w.run.challenge === 'darkness') { /* handled in render */ }
}

function nearDoorSlot(room: RoomData, d: DoorDef, pl: { x: number; y: number }, from: Side): boolean {
  // choose the slot aligned with where we left (for big rooms)
  const p = room.doorPos(d.side, d.slot);
  if (from === Side.N || from === Side.S) return Math.abs((p.x % VIEW_W) - (pl.x % VIEW_W)) < 60;
  return Math.abs((p.y % VIEW_H) - (pl.y % VIEW_H)) < 60;
}

function unstick(w: World): void {
  const room = w.room, pl = w.player;
  const [c, r] = room.cellAt(pl.x, pl.y);
  if (!solidCell(room, c, r, 'walk')) return;
  for (let rad = 1; rad < 4; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    if (!room.inGrid(c + dc, r + dr) || solidCell(room, c + dc, r + dr, 'walk')) continue;
    const p = room.cellCenter(c + dc, r + dr); pl.x = p.x; pl.y = p.y; return;
  }
}

export function spawnEnemy(w: World, id: string, x: number, y: number, quick: boolean): Enemy | null {
  const def = getEnemy(id);
  if (!def) { console.warn('unknown enemy', id); return null; }
  const e = new Enemy(def, x, y, enemyHpMul(w.run.floorIndex, w.theme.tier ?? 0, !!def.boss) * (w.run.challenge === 'hard' || w.run.mode === 'hard' ? 1.3 : 1));
  e.spawnT = quick ? 0.25 : 0.55;
  def.init?.(e, w);
  w.enemies.push(e);
  return e;
}

function makeChampion(e: Enemy): void {
  const kinds = ['armored', 'swift', 'bloated'];
  e.champion = kinds[Math.floor(Math.random() * kinds.length)];
  if (e.champion === 'bloated') { e.hp *= 1.8; e.maxHp *= 1.8; e.r *= 1.15; }
}

function startBoss(w: World, room: RoomData): void {
  const c = room.center();
  const raw = room.bossId ?? 'grubmother';
  const ids = raw.split('+').flatMap((id) => (BOSS_ALIASES[id] ?? id).split('+'));
  const introDef = getEnemy(raw.split('+')[0]);
  ids.forEach((id, i) => {
    const e = spawnEnemy(w, id, c.x + (ids.length > 1 ? (i - 0.5) * 80 : 0), c.y - 20, false);
    if (e) {
      e.isBoss = true;
      if (room.type === 'miniboss') { e.hp *= 0.6; e.maxHp *= 0.6; }
      e.spawnT = room.type === 'boss' ? 2.4 : 0.9;
      w.bossList.push(e);
    }
  });
  w.lockdown = true;
  if (room.type === 'boss') {
    const def = introDef ?? w.bossList[0]?.def;
    w.hud.bossIntro(def?.name ?? 'Boss', def?.desc ?? '', w.bossList[0]);
    w.audio.stinger('bossIntro');
    w.audio.setMusic('boss' + (w.run.floorIndex >= FINAL_FLOOR ? 'Final' : w.run.floorIndex >= 4 ? '2' : ''));
  } else {
    w.hud.roomName(w.bossList[0]?.def.name ?? 'Lurker');
  }
}

// ------------------------------------------------------------------ doors
export function doorShouldOpen(w: World, d: DoorRT): boolean {
  if (d.def.hidden && !d.revealed) return false;
  if (d.def.locked) return false;
  if (w.lockdown) return false;
  if (w.room.type === 'challenge' && !w.room.flags.started) return true;
  return w.room.cleared;
}

export function updateDoors(w: World, dt: number): void {
  const pl = w.player;
  for (const d of w.doors) {
    const target = doorShouldOpen(w, d) ? 1 : 0;
    const prev = d.open;
    d.open += Math.sign(target - d.open) * Math.min(Math.abs(target - d.open), dt * (target ? 5 : 9));
    if (prev < 1 && d.open >= 1 && w.roomTime > 0.2) { /* opened */ }
    if (prev > 0.5 && d.open <= 0.5 && w.roomTime < 1) { w.shake(1.2); }
    // unlock locked doors by touching them
    if (d.def.locked && !w.lockdown && w.room.cleared) {
      if (dist2(pl.x, pl.y, d.x, d.y) < 22 * 22 && (pl.keys > 0 || pl.goldKey)) {
        if (!pl.goldKey) pl.keys--;
        unlockDoor(w, d.def);
        w.audio.play('unlock', { x: d.x });
        w.fx.stars(d.x, d.y, 8, '#ffe080', 50);
      }
    }
  }
}
export function unlockDoor(w: World, def: DoorDef): void {
  def.locked = false;
  const other = w.floor.rooms[def.to];
  for (const od of other.doors) if (od.to === w.room.id && od.side === opposite(def.side)) od.locked = false;
}

export function revealSecretsNear(w: World, x: number, y: number, r: number): void {
  for (const d of w.doors) {
    if (!d.def.hidden || d.revealed) continue;
    if (dist2(x, y, d.x, d.y) > r * r) continue;
    d.revealed = true; d.def.hidden = false;
    const other = w.floor.rooms[d.def.to];
    other.discovered = true; other.seen = true;
    for (const od of other.doors) if (od.to === w.room.id) od.hidden = false;
    w.audio.play('secret');
    w.fx.shards(d.x, d.y, 14, w.theme.pal.wall, 120);
    w.fx.smoke(d.x, d.y, 8, 'rgba(90,80,80,', 7, 1);
    w.run.stats.secretsFound++;
    w.game.save.stat('secretsFound', 1);
    if (w.game.save.stat('secretsFound', 0) >= 10) w.game.save.unlock('secrets_10');
  }
}

export function checkExit(w: World): void {
  if (w.transition) return;
  const pl = w.player, room = w.room;
  const L = room.ox, T = room.oy, R = room.ox + room.cols * TILE, B = room.oy + room.rows * TILE;
  let side: Side | null = null;
  if (pl.y < T - 7) side = Side.N; else if (pl.y > B + 7) side = Side.S; else if (pl.x < L - 7) side = Side.W; else if (pl.x > R + 7) side = Side.E;
  if (side === null) return;
  let best: DoorRT | null = null, bd = 1e9;
  for (const d of w.doors) {
    if (d.def.side !== side || d.open < 0.6) continue;
    const dd = dist2(pl.x, pl.y, d.x, d.y);
    if (dd < bd) { bd = dd; best = d; }
  }
  if (!best) return;
  const kind = best.def.kind;
  const target = w.floor.rooms[best.def.to];
  w.enterRoom(target.id, side, true);
  if (kind === 'cursed' || target.type === 'cursed' || w.floor.rooms[best.def.to] && room.type === 'cursed') {
    if (!pl.flight) { w.player.iframes = 0; w.hurtPlayer(1, 'a hexed door', { ignoreIframes: true }); }
  }
}

// ------------------------------------------------------------------ clearing & rewards
const VARIANT_NAMES: Record<string, string> = { ambush: 'Ambush!', champions: 'Champion Den', dark: 'Lights Out', gilded: 'Gilded Room' };

export function checkRoomClear(w: World): void {
  const room = w.room;
  if (room.cleared || w.aliveEnemies() > 0) return;
  // ambush rooms send a second wave once the first falls
  const wave = room.flags.ambush as SpawnDef[] | undefined;
  if (wave && wave.length) {
    room.flags.ambush = null;
    for (const s of wave) { const c = room.cellCenter(s.c, s.r); const e = spawnEnemy(w, s.id, c.x, c.y, false); if (e) e.spawnT = 0.6 + Math.random() * 0.3; }
    w.hud.roomName('Here they come!'); w.audio.play('bossRoar', { vol: 0.35 }); w.shake(2);
    return;
  }
  if (room.type === 'challenge') return; // handled by waves
  if (w.lockdown && w.bossList.some((b) => !b.dead)) return;
  onClear(w, true);
}

function onClear(w: World, reward: boolean): void {
  const room = w.room;
  room.cleared = true;
  w.lockdown = false;
  w.run.stats.roomsCleared++;
  w.audio.play('roomClear');
  w.audio.setIntensity(0);
  if (reward && (room.type === 'normal' || room.type === 'miniboss')) {
    const rng = new RNG(room.seed + ':clear');
    let kind = rollDropKind(rng, w.player.stats.luck, 'room');
    if (room.type === 'miniboss') kind = rng.chance(0.5) ? 'chest' : 'heart';
    // pity: low on health makes hearts much more likely
    const h = w.player.health;
    if (!h.noRed && h.red <= 2 && h.red < h.redMax && rng.chance(0.45)) kind = 'heart';
    else if (w.player.keys === 0 && rng.chance(0.3)) kind = 'key';
    else if (w.player.bombs === 0 && rng.chance(0.3)) kind = 'bomb';
    else if (w.run.mode === 'hard' && rng.chance(0.12)) kind = null;
    if (room.flags.variant === 'champions' || room.flags.variant === 'ambush') kind = rng.chance(0.5) ? 'chest' : kind ?? 'heart';
    if (room.flags.variant === 'dark') { const p2 = freeSpotNear(w, room.center().x + 24, room.center().y); spawnDrop(w, rng.pick(['page', 'sweet', 'key']), p2.x, p2.y, true, rng); }
    if (kind) {
      const p = freeSpotNear(w, room.center().x, room.center().y);
      spawnDrop(w, kind, p.x, p.y, true, rng);
    }
  }
  chargeActive(w, room.cw * room.ch >= 4 ? 2 : 1);
  checkProgress(w);
  familiarsOnRoomClear(w);
  w.itemHook('onRoomClear');
  w.player.clearTemp((t) => !!t.room);
}

export function freeSpotNear(w: World, x: number, y: number): { x: number; y: number } {
  const room = w.room;
  const [c0, r0] = room.cellAt(x, y);
  for (let rad = 0; rad < 6; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    const c = c0 + dc, r = r0 + dr;
    if (!room.inGrid(c, r) || room.at(c, r) !== Ob.None) continue;
    const p = room.cellCenter(c, r);
    if (w.pickups.some((q) => dist2(q.x, q.y, p.x, p.y) < 100 && q.pedestal)) continue;
    return p;
  }
  return { x, y };
}

export function chargeActive(w: World, n: number): void {
  const pl = w.player;
  if (!pl.active) return;
  const it = getItem(pl.active);
  if (!it?.active || it.active.type !== 'room') return;
  const before = pl.charge;
  pl.charge = Math.min(it.active.charge, pl.charge + n);
  if (before < it.active.charge && pl.charge >= it.active.charge) { w.audio.play('charged'); w.hud.flashActive(); }
}
export function fullCharge(w: World): void {
  const it = w.player.active ? getItem(w.player.active) : null;
  if (it?.active) { w.player.charge = it.active.charge; w.audio.play('charged'); w.hud.flashActive(); }
}
export function revealMap(w: World, full: boolean): void {
  for (const r of w.floor.rooms) {
    if (r.type === 'supersecret' || (r.type === 'secret' && !full)) continue;
    r.seen = true; if (full) r.discovered = true;
  }
}

// ------------------------------------------------------------------ bosses & floors
export function onBossKilled(w: World, e: Enemy): void {
  if (w.bossList.some((b) => !b.dead) || w.enemies.some((x) => !x.dead && x.isBoss)) return;
  const room = w.room;
  w.game.save.markBoss(e.def.id);
  w.run.stats.bossesKilled.push(e.def.id);
  w.slowT = 0.6; w.whiteFlash = 0.8; w.shake(8);
  w.audio.stinger('bossDeath');
  for (const x of w.enemies) if (!x.dead && !x.isBoss) w.killEnemy(x);
  w.proj.clear();
  if (room.type === 'miniboss') { w.lockdown = false; return; }
  const fi = w.run.floorIndex;
  w.game.save.unlock('beat_ch' + (fi + 1));
  w.game.save.unlock('beat_' + e.def.id);
  if (!w.run.flags.bossHit) w.game.save.unlock('flawless_boss');
  const goal = w.run.challenge ? CHALLENGES.find((c) => c.id === w.run.challenge)?.goal ?? FINAL_FLOOR : FINAL_FLOOR;
  w.after(1.3, () => {
    if (w.room !== room) return;
    const c = room.center();
    if (fi >= goal) { w.game.onVictory(); return; }
    spawnPedestal(w, c.x, c.y - 44, room.flags.bossItem ?? w.run.pools.roll('boss'), 'treasure');
    const rng = new RNG(room.seed + ':bossdrop');
    spawnDrop(w, rollDropKind(rng, w.player.stats.luck, 'boss') ?? 'heart', c.x - 30, c.y, true, rng);
    w.trapdoor = { x: c.x, y: c.y + 26, t: 0, kind: 'down' };
    room.flags.trap = { x: c.x, y: c.y + 26 };
    w.audio.play('trapdoor');
    // a chance for a bargain door
    const chance = w.run.flags.dealChance + (w.run.flags.hitThisFloor ? 0 : 0.35) + (fi === 0 ? -1 : 0);
    const r2 = new RNG(w.run.seed + ':deal' + fi);
    if (r2.next() < chance) {
      const kind = (w.run.flags.dealsTaken > 0 || r2.next() < 0.5) && w.run.flags.blessingsTaken === 0 ? 'deal' : 'blessing';
      const nr = addBargainRoom(w.run, w.floor, room, kind);
      if (nr) {
        const d = room.doors[room.doors.length - 1];
        const p = room.doorPos(d.side, d.slot);
        w.doors.push({ def: d, open: 0, x: p.x, y: p.y, revealed: true });
        w.audio.stinger(kind);
        w.hud.toast(kind === 'deal' ? 'An inky door has opened.' : 'A door of wax has opened.');
      }
    }
  });
}

/**
 * Failsafe against soft-locks: if every enemy left in the room is walled in where Marcus can
 * neither walk nor shoot, they crumble after a few seconds so the doors open.
 */
function freeSealedEnemies(w: World, dt: number): void {
  const room = w.room, pl = w.player;
  if (room.cleared || w.bossList.some((b) => !b.dead) || w.aliveEnemies() === 0 || w.transition) { w.stuckT = 0; return; }
  const sealed = (e: Enemy): boolean => {
    if (e.mode !== 'walk') return false;
    const [c, r] = room.cellAt(e.x, e.y);
    for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.flow.at(c + dc, r + dr) >= 0) return false;
    return !lineClear(room, pl.x, pl.y - 8, e.x, e.y - (e.def.hitY ?? 6), 'shot');
  };
  const all = w.enemies.filter((e) => !e.dead && !e.friendly && !e.data.noClear);
  if (all.length && all.every(sealed)) w.stuckT += dt; else w.stuckT = 0;
  if (w.stuckT > 5) {
    w.stuckT = 0;
    for (const e of all) { w.fx.burst(e.x, e.y, 6, 14, '#8a8078', 70, 0.5); w.killEnemy(e); }
    w.hud.toast('The walls swallow what they hid.', 2);
  }
}

export function updateSpecial(w: World, dt: number): void {
  const room = w.room, pl = w.player;
  freeSealedEnemies(w, dt);
  if (w.trapdoor) {
    const t = w.trapdoor; t.t += dt;
    if (t.t > 0.8 && dist2(pl.x, pl.y, t.x, t.y) < 11 * 11 && !w.transition && w.deathT < 0 && !w.game.fading) {
      pl.controlLock = 1.5; pl.vx = pl.vy = 0;
      w.audio.play('fall');
      w.game.fadeTo(() => nextFloor(w), 0.7);
    }
  }
  // challenge room: pressure button starts waves
  if (room.type === 'challenge' && !room.cleared) {
    if (!room.flags.started) {
      const btn = findButton(w);
      if (btn && dist2(pl.x, pl.y, btn.x, btn.y) < 12 * 12) {
        room.flags.started = true; room.flags.wave = 0;
        const i = room.idx(btn.c, btn.r); room.gvar[i] = 1; w.obstacleDirty = true;
        w.lockdown = true; w.audio.play('doorSlam'); w.audio.stinger('challenge'); w.audio.setIntensity(1);
        w.hud.toast('Survive.');
        spawnWave(w);
      }
    } else if (w.aliveEnemies() === 0) {
      room.flags.wave++;
      if (room.flags.wave >= room.waves.length) {
        room.flags.done = true; w.lockdown = false; onClear(w, false);
        w.hud.toast('Proven.');
        for (const p of w.pickups) if (p.data.locked) { p.data.locked = false; w.fx.stars(p.x, p.y - 10, 10, '#ffe080'); }
      } else spawnWave(w);
    }
  }
}
function findButton(w: World): { x: number; y: number; c: number; r: number } | null {
  const room = w.room;
  for (let i = 0; i < room.grid.length; i++) if (room.grid[i] === Ob.Button) { const c = i % room.cols, r = (i / room.cols) | 0; const p = room.cellCenter(c, r); return { ...p, c, r }; }
  return null;
}
function spawnWave(w: World): void {
  const wave = w.room.waves[w.room.flags.wave] ?? [];
  for (const s of wave) { const c = w.room.cellCenter(s.c, s.r); const e = spawnEnemy(w, s.id, c.x, c.y, false); if (e) e.spawnT = 0.8; }
}

export function onPincushion(w: World): void {
  const room = w.room;
  const n = (room.flags.pin = (room.flags.pin ?? 0) + 1);
  const rng = new RNG(room.seed + ':pin' + n);
  const c = room.center();
  w.audio.play('pincushion');
  if (n <= 2) { if (rng.chance(0.5)) for (let i = 0; i < rng.int(1, 3); i++) spawnDrop(w, 'button', c.x, c.y + 30); }
  else if (n === 3) spawnDrop(w, 'chest', c.x, c.y + 30);
  else if (n === 4) { if (rng.chance(0.5)) spawnDrop(w, 'wax', c.x, c.y + 30); }
  else if (n === 6 && !room.flags.pinItem) { room.flags.pinItem = true; spawnPedestal(w, c.x, c.y + 40, w.run.pools.roll('curse'), 'deal'); }
  else if (n > 6 && rng.chance(0.3)) spawnDrop(w, rng.pick(['ink', 'page', 'sweet']), c.x, c.y + 30);
}

// ------------------------------------------------------------------ pickups
export function spawnPedestal(w: World, x: number, y: number, id: string, style: string, o: { price?: number; deal?: number; group?: number; locked?: boolean } = {}): Pickup {
  const p = new Pickup('item', x, y);
  p.data = { id, style, group: o.group, locked: o.locked };
  p.price = o.price ?? 0; p.deal = o.deal ?? 0; p.shop = (o.price ?? 0) > 0;
  w.pickups.push(p);
  w.fx.stars(x, y - 20, 8, '#ffe8a0', 40);
  return p;
}

export function touchPickup(w: World, p: Pickup): void {
  const pl = w.player, h = pl.health;
  const collect = (snd: string) => { p.collectT = 0; w.audio.play(snd, { x: p.x }); w.itemHook('onPickupCollect', p.kind); };
  // shop / deal payment gates
  if (p.kind !== 'item' && p.price > 0) {
    if (pl.buttons < p.price) return;
  }
  if (p.kind === 'item') { takeItem(w, p); return; }
  const payShop = () => { if (p.price > 0) { pl.buttons -= p.price; w.audio.play('buy', { x: p.x }); p.price = 0; p.shop = false; w.game.save.stat('purchases', 1); } };
  switch (p.kind) {
    case 'button': case 'button5': case 'button10': {
      const v = p.kind === 'button' ? 1 : p.kind === 'button5' ? 5 : 10;
      pl.buttons = Math.min(99, pl.buttons + v); w.run.stats.buttonsCollected += v; w.game.save.stat('buttons', v);
      collect(v === 1 ? 'coin' : 'coinBig'); w.fx.stars(p.x, p.y - 4, 3, '#ffd070', 30);
      break;
    }
    case 'key': case 'goldKey':
      payShop();
      if (p.kind === 'goldKey') pl.goldKey = true; else pl.keys = Math.min(99, pl.keys + 1);
      collect('key'); break;
    case 'bomb': case 'bomb2': case 'goldBomb':
      payShop();
      if (p.kind === 'goldBomb') pl.goldBomb = true; else pl.bombs = Math.min(99, pl.bombs + (p.kind === 'bomb2' ? 2 : 1));
      collect('bombPickup'); break;
    case 'heart': case 'heartHalf': {
      if (h.noRed || h.red >= h.redMax) return;
      payShop();
      pl.healRed(p.kind === 'heart' ? 2 : 1, true); collect('heal');
      w.fx.stars(pl.x, pl.y - 20, 4, '#ff6070', 30);
      break;
    }
    case 'wax': case 'waxHalf': case 'ink': {
      if (!h.canAddHeart() && !(h.extra.length && h.extra[h.extra.length - 1].h === 1)) return;
      payShop();
      h.addExtra(p.kind === 'ink' ? 'ink' : 'wax', p.kind === 'waxHalf' ? 1 : 2); collect(p.kind === 'ink' ? 'inkHeart' : 'waxHeart'); break;
    }
    case 'brass': if (h.brass >= 6) return; payShop(); h.addBrass(1); collect('brass'); break;
    case 'gilded': if (h.redMax <= h.gilded * 2) return; payShop(); h.addGilded(1); collect('coinBig'); break;
    case 'spark': case 'sparkBig': {
      const it = pl.active ? getItem(pl.active) : null;
      if (!it?.active || pl.charge >= it.active.charge) return;
      payShop();
      pl.charge = p.kind === 'sparkBig' ? it.active.charge : Math.min(it.active.charge, pl.charge + 2);
      collect('charged'); w.hud.flashActive(); break;
    }
    case 'page': case 'sweet': {
      payShop();
      if (pl.consumables.length >= pl.consumableSlots) {
        const old = pl.consumables.shift()!;
        const q = new Pickup(old.kind, pl.x, pl.y); q.data = old.kind === 'page' ? { id: old.id } : { color: Number(old.id) }; q.noCollect = 1.2; popPickup(q, 0.6);
        w.pickups.push(q);
      }
      pl.consumables.push({ kind: p.kind as 'page' | 'sweet', id: p.kind === 'page' ? p.data.id : String(p.data.color) });
      collect('pageGet');
      if (p.kind === 'page') w.hud.toast(getConsumable(p.data.id)?.name ?? 'A torn page', 1.6);
      else w.hud.toast(sweetName(w, p.data.color), 1.6);
      break;
    }
    case 'charm': {
      payShop();
      if (pl.charms.length >= pl.charmSlots) {
        const old = pl.charms.shift()!;
        const q = new Pickup('charm', pl.x, pl.y); q.data = { id: old }; q.noCollect = 1.2; popPickup(q, 0.6); w.pickups.push(q);
      }
      pl.charms.push(p.data.id); pl.recompute();
      collect('charm');
      const c = getConsumable(p.data.id);
      w.hud.banner(c?.name ?? 'Charm', c?.desc ?? '', itemIconCanvas(p.data.id));
      break;
    }
    default:
      if (p.isChest()) openChest(w, p);
  }
}

export function sweetName(w: World, color: number): string {
  const eff = SWEET_EFFECTS[w.run.sweetMap[color % 12]];
  return w.run.identified.has(eff.id) ? eff.name : 'Unmarked Sweet';
}

function openChest(w: World, p: Pickup): void {
  if (p.opened) return;
  const pl = w.player;
  const kind = p.kind.slice(6);
  if (kind === 'locked' || kind === 'reliquary') {
    if (pl.keys <= 0 && !pl.goldKey) { if (p.t > 0.5 && Math.random() < 0.05) w.audio.play('deny'); return; }
    if (!pl.goldKey) pl.keys--;
  }
  p.opened = true; p.noCollect = 999;
  w.audio.play('chestOpen', { x: p.x });
  w.fx.stars(p.x, p.y - 8, 8, '#ffe8a0', 50);
  w.room.flags.chests = (w.room.flags.chests ?? 0) + 1;
  const rng = new RNG(`${w.room.seed}:chest${w.room.flags.chests}`);
  if (kind === 'crimson') {
    const r = rng.next();
    if (r < 0.3) { w.hurtPlayer(1, 'a crimson box', { ignoreIframes: false }); w.fx.spray(p.x, p.y, 6, -Math.PI / 2, 1, 10, '#a01e2a'); }
    else if (r < 0.5) spawnPedestal(w, p.x, p.y, w.run.pools.roll('curse'), 'deal');
    else for (let i = 0; i < rng.int(2, 3); i++) spawnDrop(w, rollDropKind(rng, pl.stats.luck, 'crimson') ?? 'ink', p.x, p.y);
  } else if (kind === 'reliquary') {
    spawnPedestal(w, p.x, p.y, w.run.pools.roll(rng.chance(0.5) ? 'treasure' : 'blessing'), 'treasure');
  } else {
    const n = kind === 'locked' ? rng.int(2, 4) : rng.int(1, 3);
    if (kind === 'locked' && rng.chance(0.12)) { spawnPedestal(w, p.x, p.y, w.run.pools.roll('treasure'), 'normal'); return; }
    for (let i = 0; i < n; i++) spawnDrop(w, rollDropKind(rng, pl.stats.luck, 'chest') ?? 'button', p.x, p.y);
  }
  w.after(2.5, () => { p.dead = true; });
}

export function takeItem(w: World, p: Pickup): void {
  const pl = w.player;
  const id: string | null = p.data.id;
  if (!id || p.data.locked) return;
  const it = getItem(id);
  if (!it) return;
  // payment
  if (p.price > 0) { if (pl.buttons < p.price) return; pl.buttons -= p.price; w.audio.play('buy'); }
  if (p.deal > 0) {
    const h = pl.health;
    if (h.redMax >= p.deal * 2) h.removeContainers(p.deal);
    else if (h.extra.length >= 3) { h.extra.splice(h.extra.length - 3, 3); }
    else return;
    if (h.totalHalf() <= 0) { h.addExtra('wax', 1); }
    w.run.flags.dealsTaken++;
    w.game.save.stat('deals', 1);
    w.audio.play('dealPay');
  }
  if (w.room.type === 'blessing') w.run.flags.blessingsTaken++;
  // choice groups: taking one removes the rest
  if (p.data.group !== undefined) for (const q of w.pickups) if (q !== p && q.pedestal && q.data.group === p.data.group && q.data.id) { q.data.id = null; w.fx.smoke(q.x, q.y - 16, 6); }
  const oldActive = it.kind === 'active' ? pl.active : null;
  const storedCharge: number | undefined = p.data.charge;
  p.data.id = oldActive; p.data.charge = oldActive ? pl.charge : undefined;
  p.price = 0; p.deal = 0; p.shop = false;
  if (oldActive) { p.noCollect = 1.0; }
  grantItem(w, id, false, storedCharge);
  // present
  pl.pickupT = 1.1; pl.pickupSprite = itemIconCanvas(id, w.blindItems());
  w.hud.banner(w.blindItems() ? '???' : it.name, w.blindItems() ? '' : it.pickup, itemIconCanvas(id, w.blindItems()));
  w.audio.play(it.quality >= 3 ? 'itemGetBig' : 'itemGet');
  w.fx.stars(pl.x, pl.y - 30, 14, '#ffe8a0', 60);
  w.fx.ring(pl.x, pl.y - 20, 4, 26, '#fff0c0', 0.4);
}

/** Give an item to the player, applying every one-time grant. */
export function grantItem(w: World, id: string, silentHealth = false, charge?: number): void {
  const pl = w.player, it = getItem(id);
  if (!it) return;
  w.run.pools.markTaken(id);
  if (it.kind === 'active') {
    pl.active = id; pl.charge = charge ?? it.active?.charge ?? 0;
  } else {
    pl.items.set(id, (pl.items.get(id) ?? 0) + 1);
    if (!pl.itemOrder.includes(id)) pl.itemOrder.push(id);
  }
  const h = pl.health;
  if (it.health && !silentHealth) {
    const g = it.health;
    if (g.containers) h.addContainers(g.containers, true);
    if (g.loseContainers) h.removeContainers(g.loseContainers);
    if (g.heal) h.healRed(g.heal);
    if (g.wax) h.addExtra('wax', g.wax);
    if (g.ink) h.addExtra('ink', g.ink);
    if (g.brass) h.addBrass(g.brass);
    if (g.gilded) h.addGilded(g.gilded);
    if (h.totalHalf() <= 0) h.addExtra('wax', 1);
  }
  if (it.give) {
    pl.buttons = Math.min(99, pl.buttons + (it.give.buttons ?? 0));
    pl.keys = Math.min(99, pl.keys + (it.give.keys ?? 0));
    pl.bombs = Math.min(99, pl.bombs + (it.give.bombs ?? 0));
    for (const [k, n] of it.give.drops ?? []) for (let i = 0; i < n; i++) spawnDrop(w, k, pl.x, pl.y + 10);
  }
  if (id === 'extra_pocket') pl.consumableSlots = 2;
  if (id === 'charm_bracelet') pl.charmSlots = 2;
  it.hooks?.onPickup?.(w);
  w.run.stats.items.push(id);
  w.game.save.collectItem(id);
  pl.recompute();
  checkProgress(w);
  syncFamiliars(w);
  // transformations
  const tags = ['moth', 'ink', 'clock', 'wax', 'thread', 'bone', 'void', 'drain', 'vamp'];
  for (const t of tags) {
    if (pl.transformations.has(t)) continue;
    if (pl.tagCount(t) >= 3) {
      pl.transformations.add(t); pl.recompute();
      const T = TRANSFORM_EFFECTS[t];
      w.after(1.3, () => { w.hud.banner(T.name.toUpperCase(), T.desc); w.audio.stinger('transform'); w.whiteFlash = 0.6; }, true);
      w.game.save.unlock('transform_' + t);
    }
  }
}

void TAU; void VIEW_H;
