// Room lifecycle: entering, doors, clearing, rewards, special rooms and floor progression.
import { newCombos } from '../items/preview';
import type { World, DoorRT } from './world';
import type { Run } from './run';
import { RoomData, Side, opposite, Ob, ROOM_NAMES, DoorDef, SpawnDef } from '../rooms/room';
import { TILE, VIEW_W, VIEW_H } from '../core/constants';
import { paintRoomBackground } from '../art/roombg';
import { propsFor } from '../art/props';
import { Enemy } from '../enemies/enemy';
import { getEnemy } from '../enemies/registry';
import { Pickup, popPickup } from './pickups';
import { spawnDrop, rollDropKind } from './drops';
import { luckChance } from '../projectiles/profile';
import { RNG } from '../core/rng';
import { getItem, getConsumable } from '../items/registry';
import { makeNpc } from './npc';
import { familiarsOnRoomEnter, familiarsOnRoomClear, syncFamiliars } from '../items/familiar_rt';
import { generateFloor, pickTheme, addBargainRoom } from '../generation/floorgen';
import { rollBargain, onLeaveFloor, ticketFor } from './bargain';
import { itemIconCanvas } from '../art/items';
import { dist2, TAU } from '../core/math';
import { solidCell, lineClear } from '../rooms/collide';
import { TRANSFORM_EFFECTS } from '../player/player';
import { SWEET_EFFECTS } from '../items/data/consumables';
import { FINAL_FLOOR, MARGINS_FLOOR, LASTPAGE_FLOOR, ROOM4_FLOOR, HOSPITAL_FIRST, enemyHpMul } from '../data/floors';
import { HOSPITAL_THEMES } from '../data/notes';
import { checkProgress, onChapterCleared } from './progress';
import { BOSS_ALIASES } from '../bosses/aliases';
import { CHALLENGES } from '../data/achievements';
import { charById } from '../player/characters';
import { chapterTrack } from '../audio/music';

/** Each chapter's own recorded theme (by chapter id, so alternates never share one); its old track where it can't load. */
export function themeMusic(t: { id: string; music: string }): string {
  return chapterTrack(t.id, t.music);
}

// ------------------------------------------------------------------ floors
/** Champion bosses: a colour, a twist, and a better payout. */
export type ChampKind = 'crimson' | 'gilded' | 'inked';
export const CHAMPIONS: Record<ChampKind, { name: string; desc: string; hp: number; filter: string; glow: string }> = {
  crimson: { name: 'Crimson', desc: 'Faster and angrier. It bleeds as it moves.', hp: 1.3, filter: 'sepia(0.7) saturate(4) hue-rotate(-35deg) brightness(0.95)', glow: '#ff2030' },
  gilded: { name: 'Gilded', desc: 'Tougher, and worth a fortune.', hp: 1.55, filter: 'sepia(1) saturate(2.6) brightness(1.18)', glow: '#ffd040' },
  inked: { name: 'Inked', desc: 'It leaks ink in rings as it fights.', hp: 1.3, filter: 'grayscale(0.6) brightness(0.55) sepia(0.5) hue-rotate(200deg) saturate(2.5)', glow: '#7a5aff' },
};
/** Bosses that rewrite themselves (the Delirium-like ones): their health is set in their own definition. */
const FINAL_FORMS = new Set(['unwritten', 'author', 'patient']);
/** A floor whose boss can end the story: the Binding, the Last Page, the Foreword and Room 4. */
export function isEndingFloor(run: Run): boolean {
  const fi = run.floorIndex;
  if (run.flags.margins && fi === LASTPAGE_FLOOR) return true;
  if (run.flags.room4 && fi === ROOM4_FLOOR) return true;
  return fi === FINAL_FLOOR && run.mode !== 'endless';
}
/**
 * Each ending boss has its own theme: Last Rites at the Binding, Unwriting for the Unwritten on the
 * Last Page, The Final Draft for the Author in the Foreword. Room 4 keeps the older final theme.
 */
export function bossMusic(run: Run): string {
  const fi = run.floorIndex;
  if (fi === FINAL_FLOOR && !run.flags.margins) return 'finalBinding';
  if (run.flags.margins && fi === LASTPAGE_FLOOR) return run.flags.light ? 'finalAuthor' : 'finalUnwritten';
  if (fi === FINAL_FLOOR || (run.flags.margins && fi === LASTPAGE_FLOOR) || (run.flags.room4 && fi === ROOM4_FLOOR)) return 'bossFinal';
  return fi >= 4 ? 'boss2' : 'boss';
}
export function startFloor(w: World): void {
  const run = w.run;
  const floor = generateFloor(run, run.floorIndex, w.game.save);
  w.floor = floor; w.theme = floor.theme; w.props = propsFor(floor.theme);
  run.flags.hitThisFloor = false; run.flags.bossHit = false; run.flags.redHit = false; run.flags.bossRedHit = false; run.flags.floorStartTime = run.stats.time;
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
  // the Blot: a 45% chance each new chapter that a real red heart grows in the ink
  if (w.player.char.id === 'blot' && run.floorIndex > 0 && !run.flags['blotHeart' + run.floorIndex]) {
    run.flags['blotHeart' + run.floorIndex] = true;
    if (new RNG(run.seed + ':blotheart:' + run.floorIndex).next() < 0.45) w.after(2.4, () => w.hud.giftHeart(), true);
  }
  // the end game announces itself: the Binding is not the Binding you remember
  const endgame = floor.theme.id === 'binding' && run.floorIndex === FINAL_FLOOR && w.game.save.isUnlocked('beat_final') && !run.challenge && run.mode !== 'endless';
  w.hud.floorCard(floor.label, endgame ? 'It remembers you.' : floor.theme.subtitle, floor.curse, endgame);
  w.audio.setMusic(themeMusic(floor.theme));
  w.audio.prepareMusic(bossMusic(w.run));
  const nextTheme = pickTheme(w.run, w.run.floorIndex + 1);
  if (nextTheme) w.audio.prepareMusic(themeMusic(nextTheme));
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
    added: w.floor.added ?? [],
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
  // rooms that were opened during play (bargain doors) aren't in the seed: open them again, in the
  // same order beside the same rooms, so their ids, doors and saved contents line up
  for (const a of st.added ?? []) { const beside = floor.rooms[a.beside]; if (beside) addBargainRoom(run, floor, beside, a.kind); }
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
  w.audio.setMusic(themeMusic(floor.theme));
  w.audio.prepareMusic(bossMusic(run));
  w.audio.setIntensity(w.enemies.length ? 1 : 0);
}

export function nextFloor(w: World): void {
  const run = w.run;
  run.stats.floorsCleared++;
  if (run.floorIndex >= FINAL_FLOOR && run.mode !== 'endless' && !run.flags.margins) { w.game.onVictory(); return; }
  onLeaveFloor(w);
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
  if (from !== null) w.hud.note = null;
  w.tasks = w.tasks.filter((t) => t.persist); w.telegraphs = []; w.corpses = [];
  w.trapdoor = room.flags.trap ? { x: room.flags.trap.x, y: room.flags.trap.y, t: 2, kind: room.flags.trap.kind ?? 'down' } : null;
  w.exitDoor = room.flags.exit ? { x: room.flags.exit.x, y: room.flags.exit.y, t: 2, kind: room.flags.exit.kind } : null;
  w.lightBeam = room.flags.beam ? { x: room.flags.beam.x, y: room.flags.beam.y, t: 2, kind: room.flags.beam.kind } : null;
  w.backStair = room.flags.stair ? { x: room.flags.stair.x, y: room.flags.stair.y, t: 2, boarded: room.flags.stair.boarded } : null;
  w.roomTime = 0; w.roomHit = false; w.stuckT = 0; w.roomRng = new RNG(room.seed + ':rt');
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
  // half a letter Marcus already carries (or has made whole) is not waiting here twice
  const pl0 = w.player;
  for (const p of w.pickups) if (p.kind === 'item' && (p.data.id === 'letter_top' || p.data.id === 'letter_bottom') && (pl0.has(p.data.id) || pl0.has('grandfathers_letter'))) p.data.id = w.run.pools.roll('secret');
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
    if (room.type === 'boss' || room.type === 'miniboss' || room.type === 'echo') startBoss(w, room);
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
    w.hud.roomName(room.flags.setName ?? VARIANT_NAMES[room.flags.variant] ?? '');
  }
  if (room.type !== 'normal' && room.type !== 'start' && room.type !== 'boss' && !room.flags.announced) {
    room.flags.announced = true;
    w.hud.roomName(ROOM_NAMES[room.type]);
    if (room.type === 'secret' || room.type === 'supersecret') w.audio.play('secret');
    if (room.type === 'supersecret') w.game.save.unlock('supersecret');
    if (room.type === 'deal') w.audio.stinger('deal');
    if (room.type === 'blessing') w.audio.stinger('blessing');
    if (room.type === 'lostfound') w.audio.stinger('lostfound');
  }
  if (room.type === 'boss' && room.cleared && prevType !== 'boss') w.audio.setMusic(themeMusic(w.theme));
  // last room's effects end first, so anything granted on entering this one lasts the room
  w.player.clearTemp((t) => !!t.room);
  w.itemHook('onRoomEnter');
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

/** Enemies that were removed (shot-proof from the front, so effectively bomb-only), mapped to stand-ins for old saves. */
const RETIRED: Record<string, string> = { rustcrab: 'stoker', boneknight: 'gravedigger' };
export function spawnEnemy(w: World, id: string, x: number, y: number, quick: boolean): Enemy | null {
  const def = getEnemy(RETIRED[id] ?? id);
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
  const ending = room.type === 'boss' && isEndingFloor(w.run);
  // now and then a chapter boss turns up as a champion: tougher, stranger, and it pays better
  const crng = new RNG(room.seed + ':champ');
  const champ: ChampKind | null = room.type === 'boss' && !ending && w.run.floorIndex >= 1 && !room.flags.trueBoss && crng.chance(w.run.mode === 'hard' ? 0.25 : 0.15) ? crng.pick(['crimson', 'gilded', 'inked'] as ChampKind[]) : null;
  ids.forEach((id, i) => {
    const e = spawnEnemy(w, id, c.x + (ids.length > 1 ? (i - 0.5) * 80 : 0), c.y - 20, false);
    if (e) {
      e.isBoss = true;
      // the bosses you can end the story on fight at full strength: tougher, faster, and a
      // bullet-hell last stand (the Unwritten and the Author carry their own huge health)
      if (ending) { e.data.hard = true; if (!FINAL_FORMS.has(id)) { e.hp *= 1.7; e.maxHp *= 1.7; } }
      if (room.type === 'miniboss') { e.hp *= 0.6; e.maxHp *= 0.6; }
      if (champ) { e.data.champ = champ; const m = CHAMPIONS[champ].hp; e.hp *= m; e.maxHp *= m; }
      e.spawnT = room.type === 'boss' ? 2.4 : 0.9;
      w.bossList.push(e);
    }
  });
  w.lockdown = true;
  if (room.type === 'echo') {
    // your last death, come back for you
    const ec = w.game.save.data.echo, e = w.bossList[0];
    if (e && ec) {
      e.data.char = ec.char; e.data.items = ec.items;
      const extra = 1 + Math.min(1.5, ec.items.length * 0.06);
      e.hp *= extra; e.maxHp *= extra; e.spawnT = 2.2;
      const name = charById(ec.char).name;
      w.hud.bossIntro(`Echo of ${name}`, `You fell in ${ec.chapter} last time, to ${ec.cause}. It remembers how.`, e, 'echo', 'echo:' + ec.char);
      w.audio.setMusic(bossMusic(w.run));
    }
    return;
  }
  if (room.type === 'boss') {
    const def = introDef ?? w.bossList[0]?.def;
    const e0 = w.bossList[0];
    w.hud.bossIntro((champ ? CHAMPIONS[champ].name + ' ' : '') + (def?.name ?? 'Boss'), champ ? CHAMPIONS[champ].desc : def?.desc ?? '', e0,
      e0?.data?.hard ? 'final' : champ ? 'champion' : 'chapter', def?.id ?? 'boss');
    w.audio.setMusic(bossMusic(w.run));
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
    const rng = new RNG(room.seed + ':clear' + (room.flags.refights ?? ''));
    let kind = rollDropKind(rng, w.player.stats.luck, 'room');
    if (room.type === 'miniboss') kind = rng.chance(0.5) ? 'chest' : 'heart';
    // pity: low on health makes hearts much more likely
    const h = w.player.health;
    if (!h.noRed && h.red <= 2 && h.red < h.redMax && rng.chance(0.45)) kind = 'heart';
    else if (w.player.keys === 0 && rng.chance(0.3)) kind = 'key';
    else if (w.player.bombs === 0 && rng.chance(0.3)) kind = 'bomb';
    else if (w.run.mode === 'hard' && rng.chance(0.12)) kind = null;
    if (room.flags.variant === 'champions' || room.flags.variant === 'ambush') kind = rng.chance(0.5) ? 'chest' : kind ?? 'heart';
    // a set piece pays for itself: a chest (sometimes locked, so a key matters) on top of the usual drop
    if (room.flags.variant === 'setpiece') { const p2 = freeSpotNear(w, room.center().x - 26, room.center().y); spawnDrop(w, rng.chance(0.35) ? 'chest:locked' : 'chest:tin', p2.x, p2.y, true, rng); }
    if (room.flags.variant === 'dark') { const p2 = freeSpotNear(w, room.center().x + 24, room.center().y); spawnDrop(w, rng.pick(['page', 'sweet', 'key']), p2.x, p2.y, true, rng); }
    if (kind) {
      const p = freeSpotNear(w, room.center().x, room.center().y);
      spawnDrop(w, kind, p.x, p.y, true, rng);
    }
    clearBonuses(w, rng);
  }
  chargeActive(w, room.cw * room.ch >= 4 ? 2 : 1);
  checkProgress(w);
  familiarsOnRoomClear(w);
  w.itemHook('onRoomClear');
  w.player.clearTemp((t) => !!t.room);
}

/**
 * Extra rewards on top of the normal clear drop: big rooms roll twice, a flawless clear (no hits)
 * builds a streak that pays out in pickups and chests, a fast clear tosses a button, and every so
 * often a room pays out a jackpot.
 */
function clearBonuses(w: World, rng: RNG): void {
  const room = w.room, luck = w.player.stats.luck;
  const c = room.center();
  const drop = (kind: string, dx = 0, dy = 0) => { const p = freeSpotNear(w, c.x + dx, c.y + dy); spawnDrop(w, kind, p.x, p.y, true, rng); };
  const say = (text: string, color: string, dy = 0) => w.fx.text(c.x, c.y - 34 + dy, text, color);
  const cells = room.cw * room.ch;
  let line = 0;
  // big rooms: one more roll from the room table
  if (cells >= 2) { const k = rollDropKind(rng, luck, 'room'); if (k) drop(k, -28, 10); }
  // flawless streak
  const fl = w.run.flags;
  if (!w.roomHit) {
    fl.cleanStreak = (fl.cleanStreak ?? 0) + 1;
    const n = fl.cleanStreak as number;
    fl.bestStreak = Math.max(fl.bestStreak ?? 0, n);
    if (n % 5 === 0) { drop(n % 10 === 0 ? 'chest:locked' : 'chest', 30, 10); say(`FLAWLESS x${n}!`, '#ffd060', line); line -= 10; w.audio.play('coinBig'); }
    else if (n >= 2 && rng.chance(Math.min(0.6, 0.18 + n * 0.06 + luck * 0.02))) {
      drop(rng.pick(['button', 'button', 'key', 'bomb', 'heart', 'sweet', 'page']), 30, -8);
      say(n >= 3 ? `FLAWLESS x${n}` : 'FLAWLESS', '#a8e8ff', line); line -= 10;
    }
  } else if ((fl.cleanStreak ?? 0) > 0) fl.cleanStreak = 0;
  // swift clear
  if (w.roomTime < 7 + cells * 4 && rng.chance(0.5)) { drop('button', -20, -14); say('SWIFT', '#c8f0a0', line); line -= 10; }
  // rare jackpot: a spray of buttons, or something special
  if (rng.chance(luckChance(0.025, luck))) {
    const r = rng.next();
    if (r < 0.5) { for (let i = 0; i < rng.int(4, 6); i++) drop(rng.chance(0.15) ? 'button5' : 'button', rng.float(-30, 30), rng.float(-18, 18)); }
    else if (r < 0.75) drop('charm', 0, 20);
    else if (r < 0.92) drop('chest:crimson', 0, 20);
    else drop('sparkBig', 0, 20);
    say('JACKPOT!', '#ffe070', line); w.audio.play('coinBig');
  }
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
  if (room.type !== 'miniboss' && room.type !== 'echo') w.after(0.5, () => w.hud.bossDown(w.hud.bossName || e.def.name), true);
  for (const x of w.enemies) if (!x.dead && !x.isBoss) w.killEnemy(x);
  w.proj.clear();
  if (room.type === 'miniboss') { w.lockdown = false; return; }
  if (room.type === 'echo') {
    // laid to rest: it leaves one of the things it was carrying, and the echo is spent
    w.lockdown = false;
    const ec = w.game.save.data.echo;
    const left = (ec?.items ?? []).filter((id) => getItem(id) && !w.player.has(id));
    const c = room.center();
    w.after(1.2, () => {
      if (w.room !== room) return;
      const id = left.length ? left[Math.floor(Math.random() * left.length)] : w.run.pools.roll('treasure');
      spawnPedestal(w, c.x, c.y - 10, id, 'treasure');
      w.hud.toast('The echo fades. It left something behind.', 3);
      w.audio.setMusic(themeMusic(w.theme));
    }, true);
    w.game.save.data.echo = null; w.game.save.markDirty();
    w.game.save.unlock('echo_rest');
    return;
  }
  // the fight is over: the boss theme gives way to the chapter's own music
  w.after(1.8, () => { if (w.room === room && w.game.scene === 'run') { w.audio.setMusic(themeMusic(w.theme)); w.audio.setIntensity(0); } }, true);
  const fi = w.run.floorIndex;
  // finished the story before? then the Binding offers a way out and a way further in
  const beyond = fi === FINAL_FLOOR && w.game.save.isUnlocked('beat_final') && !w.run.challenge && w.run.mode !== 'endless';
  w.game.save.unlock('beat_ch' + (fi + 1));
  w.game.save.unlock('beat_' + e.def.id);
  if (!w.run.flags.bossHit) {
    w.game.save.unlock('flawless_boss');
    // Bram: three chapter bosses in one run, none of which touched you
    w.run.flags.cleanBosses = (w.run.flags.cleanBosses ?? 0) + 1;
    if (w.run.flags.cleanBosses >= 3) w.game.save.unlock('unlock_bram');
  }
  // Ozzie: It Remembers, beaten with a die in hand (or in your pockets)
  const pl0 = w.player, hasDie = (id: string | null) => !!id && !!getItem(id)?.tags?.includes('dice');
  if (e.def.id === 'itremembers' && (hasDie(pl0.active) || pl0.itemOrder.some((id) => (pl0.items.get(id) ?? 0) > 0 && hasDie(id)))) w.game.save.unlock('unlock_ozzie');
  const endless = w.run.mode === 'endless' && !w.run.challenge;
  const goal = endless ? Infinity : w.run.challenge ? CHALLENGES.find((c) => c.id === w.run.challenge)?.goal ?? FINAL_FLOOR : FINAL_FLOOR;
  if (endless && fi === FINAL_FLOOR) { w.game.creditWin(); w.hud.banner('The story goes on', 'Endless: the chapters loop, and they bite harder'); }
  w.after(1.3, () => {
    if (w.room !== room) return;
    const c = room.center();
    if (w.run.flags.room4 && fi === ROOM4_FLOOR) {
      // Room 4: it was only ever Grandad. With every other ending already seen, the morning comes
      // in through the window, and he points at it.
      const sv = w.game.save;
      if (!w.run.challenge && ['morning', 'own_hand', 'for_marcus', 'the_visit'].every((id) => sv.hasEnding(id))) {
        w.lightBeam = { x: c.x + 60, y: c.y + 30, t: 0, kind: 'home' }; room.flags.beam = { x: c.x + 60, y: c.y + 30, kind: 'home' };
        w.exitDoor = { x: c.x - 60, y: c.y + 30, t: 0, kind: 'exit' }; room.flags.exit = { x: c.x - 60, y: c.y + 30, kind: 'exit' };
        w.audio.stinger('blessing');
        w.hud.banner('Morning', 'Grandad points at the window. Or you could stay a little longer.');
        return;
      }
      w.hud.toast('It was only Grandad. It was only ever Grandad.', 3);
      w.after(1.6, () => w.game.onVictory()); return;
    }
    if (w.run.flags.margins && fi === LASTPAGE_FLOOR) {
      if (w.run.flags.light) w.game.save.unlock('beat_author');
      else { w.game.save.unlock('beat_unwritten'); w.game.save.stat('unwrittenWins', 1); }
      w.game.onVictory(); return;
    }
    if (w.run.flags.margins && fi === MARGINS_FLOOR) {
      // every boss in the Margins pays out; only one opens the way to the Last Page
      spawnPedestal(w, c.x, c.y - 44, room.flags.bossItem ?? w.run.pools.roll('boss'), 'treasure');
      const rng = new RNG(room.seed + ':bossdrop');
      spawnDrop(w, rollDropKind(rng, w.player.stats.luck, 'boss') ?? 'heart', c.x - 30, c.y, true, rng);
      if (room.flags.trueBoss && w.run.flags.light) {
        w.lightBeam = { x: c.x, y: c.y + 30, t: 0 }; room.flags.beam = { x: c.x, y: c.y + 30 };
        w.audio.stinger('blessing'); w.hud.toast('The light comes down.');
      } else if (room.flags.trueBoss) {
        w.trapdoor = { x: c.x, y: c.y + 30, t: 0, kind: 'portal' };
        room.flags.trap = { x: c.x, y: c.y + 30, kind: 'portal' };
        w.audio.stinger('lostfound'); w.hud.toast('The page tears open.');
      } else w.hud.toast('Nothing beyond this one. Not this door.');
      return;
    }
    if (fi >= goal && beyond) {
      // the story can end here (EXIT), or go on through the tear
      spawnPedestal(w, c.x, c.y - 44, room.flags.bossItem ?? w.run.pools.roll('boss'), 'treasure');
      w.exitDoor = { x: c.x - 56, y: c.y + 30, t: 0 };
      room.flags.exit = { x: c.x - 56, y: c.y + 30 };
      w.trapdoor = { x: c.x + 56, y: c.y + 30, t: 0, kind: 'portal' };
      room.flags.trap = { x: c.x + 56, y: c.y + 30, kind: 'portal' };
      // the light only reaches down once the Unwritten has fallen twice
      const wins = w.game.save.data.stats.unwrittenWins ?? 0;
      if (wins >= 2) {
        w.lightBeam = { x: c.x, y: c.y + 52, t: 0 };
        room.flags.beam = { x: c.x, y: c.y + 52 };
        w.audio.stinger('blessing');
        w.hud.banner('Three ways on', 'The EXIT ends the story. The tear goes down into the ink. The light goes up.');
      } else {
        w.hud.banner('Two ways on', 'The EXIT ends the story. The tear goes further in.');
        if (wins > 0) w.after(3.2, () => w.hud.toast(`A crack of light above you, still too far to reach (${wins}/2).`, 3));
      }
      w.audio.stinger('lostfound');
      return;
    }
    if (fi >= goal) { w.game.onVictory(); return; }
    spawnPedestal(w, c.x, c.y - 44, room.flags.bossItem ?? w.run.pools.roll('boss'), 'treasure');
    const rng = new RNG(room.seed + ':bossdrop');
    spawnDrop(w, rollDropKind(rng, w.player.stats.luck, 'boss') ?? 'heart', c.x - 30, c.y, true, rng);
    // champions pay better
    const champ = e.data.champ as ChampKind | undefined;
    if (champ === 'gilded') { for (let i = 0; i < 3; i++) spawnDrop(w, 'button10', c.x + 30, c.y); spawnDrop(w, 'chest:locked', c.x + 44, c.y + 4); }
    if (champ === 'crimson') { spawnDrop(w, 'heart', c.x + 30, c.y); spawnDrop(w, 'brass', c.x + 40, c.y); }
    if (champ === 'inked') { spawnDrop(w, 'page', c.x + 30, c.y); spawnDrop(w, 'charm', c.x + 40, c.y); }
    w.trapdoor = { x: c.x, y: c.y + 26, t: 0, kind: 'down' };
    room.flags.trap = { x: c.x, y: c.y + 26 };
    w.audio.play('trapdoor');
    // once the story is finished: a boarded back stair behind Chapter II's boss, up to St. Agnes
    if (fi === HOSPITAL_FIRST - 1 && w.game.save.isUnlocked('beat_final') && !w.run.challenge && w.run.mode !== 'endless' && !w.run.flags.hospital) {
      const sx = c.x + 76, sy = c.y + 22;
      w.backStair = { x: sx, y: sy, t: 0, boarded: true }; room.flags.stair = { x: sx, y: sy, boarded: true };
    }
    // the end of the hospital: Room 4, which opens for Grandfather's letter
    if (w.run.flags.hospital && fi === ROOM4_FLOOR - 1) {
      w.exitDoor = { x: c.x - 76, y: c.y + 30, t: 0, kind: 'room4' }; room.flags.exit = { x: c.x - 76, y: c.y + 30, kind: 'room4' };
      w.after(1.5, () => w.hud.toast(w.player.has('grandfathers_letter') ? 'At the end of the ward: Room 4. The door is open a crack.' : 'At the end of the ward: Room 4. It is locked.', 3));
    }
    // a chance for a bargain door (the odds are on the HUD)
    const door = rollBargain(w, room);
    if (door) {
      const d = room.doors[room.doors.length - 1];
      const p = room.doorPos(d.side, d.slot);
      w.doors.push({ def: d, open: 0, x: p.x, y: p.y, revealed: true });
      w.audio.stinger(door.kind);
      w.hud.toast(door.kind === 'deal' ? 'An inky door has opened.' : door.kind === 'blessing' ? 'A door of wax has opened.' : 'A door with a claim ticket on it has opened.');
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
    // a trapdoor that opens under your feet waits until you've stepped off it
    const d2 = dist2(pl.x, pl.y, t.x, t.y);
    if (d2 > 18 * 18) t.armed = true;
    if (t.t > 0.8 && t.armed && d2 < (t.kind === 'portal' ? 14 : 11) ** 2 && !w.transition && w.deathT < 0 && !w.game.fading) {
      pl.controlLock = 1.5; pl.vx = pl.vy = 0;
      if (t.kind === 'portal') {
        // through the tear: past the Binding into the Margins (or on to the Last Page)
        w.run.flags.margins = true;
        w.audio.play('secret'); w.whiteFlash = 0.5;
        w.game.fadeTo(() => nextFloor(w), 1.1);
      } else {
        w.audio.play('fall');
        w.game.fadeTo(() => nextFloor(w), 0.7);
      }
    }
  }
  if (w.backStair) {
    const st = w.backStair as typeof w.backStair & { cd?: number }; st.t += dt; st.cd = (st.cd ?? 0) - dt;
    const near = Math.abs(pl.x - st.x) < 12 && Math.abs(pl.y - st.y) < 9;
    if (near && st.boarded && st.cd <= 0) { st.cd = 4; w.hud.toast('A stair, boarded over. It would take something loud.', 2.4); }
    if (near && !st.boarded && st.t > 0.6 && !w.transition && w.deathT < 0 && !w.game.fading) {
      // up the back stair: the hospital
      pl.controlLock = 1.5; pl.vx = pl.vy = 0;
      w.run.flags.hospital = true; w.game.save.unlock('back_stair');
      w.audio.play('door'); w.backStair = null;
      w.game.fadeTo(() => nextFloor(w), 1.0);
    }
  }
  if (w.lightBeam) {
    const b = w.lightBeam; b.t += dt;
    if (b.t > 1 && b.kind === 'home' && Math.abs(pl.x - b.x) < 9 && Math.abs(pl.y - b.y) < 8 && !w.transition && w.deathT < 0 && !w.game.fading) {
      // out of the window, into the morning: home
      pl.controlLock = 2; pl.vx = pl.vy = 0;
      w.run.flags.home = true;
      w.audio.stinger('blessing'); w.whiteFlash = 1;
      w.game.fadeTo(() => nextFloor(w), 1.6);
    } else if (b.t > 1 && Math.abs(pl.x - b.x) < 9 && Math.abs(pl.y - b.y) < 8 && !w.transition && w.deathT < 0 && !w.game.fading) {
      // up into the light: the Dedication, then the Foreword
      pl.controlLock = 2; pl.vx = pl.vy = 0;
      w.run.flags.margins = true; w.run.flags.light = true;
      w.audio.stinger('blessing'); w.whiteFlash = 1;
      w.game.fadeTo(() => nextFloor(w), 1.4);
    }
  }
  if (w.exitDoor) {
    const x = w.exitDoor; x.t += dt;
    x.cd = (x.cd ?? 0) - dt;
    if (x.t > 0.8 && Math.abs(pl.x - x.x) < 10 && pl.y - x.y < 6 && pl.y - x.y > -10 && !w.transition && w.deathT < 0 && !w.game.fading) {
      if (x.kind === 'room4') {
        if (!pl.has('grandfathers_letter')) {
          if (x.cd <= 0) { x.cd = 4; w.audio.play('deny'); w.hud.toast('Locked. A card on the door says: VISITORS, PLEASE BRING YOUR LETTER.', 3); }
        } else {
          pl.controlLock = 2; pl.vx = pl.vy = 0;
          w.run.flags.room4 = true; w.audio.play('door'); w.exitDoor = null;
          w.game.fadeTo(() => nextFloor(w), 1.2);
        }
      } else {
        pl.controlLock = 2; pl.vx = pl.vy = 0;
        w.audio.play('door'); w.exitDoor = null;
        w.game.onVictory();
      }
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
      pl.bombs = Math.min(99, pl.bombs + (p.kind === 'bomb2' ? 2 : p.kind === 'goldBomb' ? 5 : 1));
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

/**
 * What an Inkwell deal would actually take: heart containers, or, when Marcus can't spare enough red,
 * his last three wax/ink hearts (the ones it removes). ok is false when he can't pay either way.
 */
export function dealCost(w: World, p: Pickup): { red: number; extra: ('wax' | 'ink')[]; ok: boolean } {
  const h = w.player.health;
  if (h.redMax >= p.deal * 2) return { red: p.deal, extra: [], ok: true };
  if (h.extra.length >= 3) return { red: 0, extra: h.extra.slice(-3).map((e) => e.k), ok: true };
  if (h.redMax > 0) return { red: p.deal, extra: [], ok: false };
  const have = h.extra.map((e) => e.k);
  while (have.length < 3) have.push('wax');
  return { red: 0, extra: have, ok: false };
}
export function dealCostText(c: { red: number; extra: ('wax' | 'ink')[] }): string {
  if (c.red) return `${c.red} heart container${c.red > 1 ? 's' : ''}`;
  const n = (k: string) => c.extra.filter((x) => x === k).length;
  const parts = (['ink', 'wax'] as const).filter((k) => n(k)).map((k) => `${n(k)} ${k} heart${n(k) > 1 ? 's' : ''}`);
  return parts.join(' and ');
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
  // Lost & Found: take one, leave one. What you leave sits on the pedestal, so you can swap back.
  if (p.data.swap) {
    const ticket = ticketFor(w, p);
    const again = (w.run.flags.shelved ?? []).includes(id);
    if (ticket) { removeItem(w, ticket); w.run.flags.shelved = [...(w.run.flags.shelved ?? []), ticket]; }
    w.run.flags.swaps = (w.run.flags.swaps ?? 0) + 1;
    p.data.id = ticket; p.data.ticket = ticket ? id : undefined; p.noCollect = 1.0;
    w.audio.play('pageGet');
    grantItem(w, id, false, undefined, again);
    presentItem(w, id, it);
    if (ticket) w.hud.toast(`You left ${getItem(ticket)?.name ?? 'something'} at the counter.`, 2);
    return;
  }
  // choice groups: taking one removes the rest
  if (p.data.group !== undefined) for (const q of w.pickups) if (q !== p && q.pedestal && q.data.group === p.data.group && q.data.id) {
    (w.run.flags.lostItems ??= []).push(q.data.id);
    q.data.id = null; w.fx.smoke(q.x, q.y - 16, 6);
  }
  const oldActive = it.kind === 'active' ? pl.active : null;
  const storedCharge: number | undefined = p.data.charge;
  p.data.id = oldActive; p.data.charge = oldActive ? pl.charge : undefined;
  p.price = 0; p.deal = 0; p.shop = false;
  if (oldActive) { p.noCollect = 1.0; }
  const modesBefore = new Set<string>(pl.prof.modes);
  grantItem(w, id, false, storedCharge);
  presentItem(w, id, it, modesBefore);
}

function presentItem(w: World, id: string, it: NonNullable<ReturnType<typeof getItem>>, modesBefore?: Set<string>): void {
  const pl = w.player;
  // (under Blight of the Unread the pedestal hid it; picking it up shows what it was)
  pl.pickupT = 1.1; pl.pickupSprite = itemIconCanvas(id);
  // a new attack style meeting one you already have: say what they now do together
  const combo = modesBefore ? newCombos(modesBefore, pl.prof.modes)[0] : undefined;
  const rare = it.quality >= 4;
  w.hud.banner(it.name, it.pickup, itemIconCanvas(id), combo, rare ? 'A RARE CURIO' : undefined);
  w.audio.play(it.quality >= 3 ? 'itemGetBig' : 'itemGet');
  w.fx.stars(pl.x, pl.y - 30, 14, '#ffe8a0', 60);
  w.fx.ring(pl.x, pl.y - 20, 4, 26, '#fff0c0', 0.4);
  if (rare || combo) {
    // the big finds land with weight: a held breath, a column of light, a thump
    w.slowT = Math.max(w.slowT, 0.35); w.shake(2);
    w.fx.ring(pl.x, pl.y - 20, 6, 64, rare ? '#ffd860' : '#c8a0ff', 0.6);
    w.fx.flash(pl.x, pl.y - 24, 30, rare ? '#fff0b0' : '#e0c8ff', 0.25);
    if (combo) w.audio.play('chime', { pitch: 1.2 });
  }
}

/** Take a passive item away (the Lost & Found keeps it). Health it gave stays, like a reroll. */
export function removeItem(w: World, id: string): void {
  const pl = w.player;
  const n = (pl.items.get(id) ?? 0) - 1;
  if (n > 0) pl.items.set(id, n);
  else { pl.items.delete(id); pl.itemOrder = pl.itemOrder.filter((x) => x !== id); }
  pl.recompute();
  syncFamiliars(w);
}

/**
 * Give an item to the player, applying every one-time grant. `again` is for an item coming back
 * from the Lost & Found: its one-time health, pickups and pickup effects were already had.
 */
export function grantItem(w: World, id: string, silentHealth = false, charge?: number, again = false): void {
  const pl = w.player, it = getItem(id);
  if (!it) return;
  if (again) silentHealth = true;
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
  if (it.give && !again) {
    pl.buttons = Math.min(99, pl.buttons + (it.give.buttons ?? 0));
    pl.keys = Math.min(99, pl.keys + (it.give.keys ?? 0));
    pl.bombs = Math.min(99, pl.bombs + (it.give.bombs ?? 0));
    for (const [k, n] of it.give.drops ?? []) for (let i = 0; i < n; i++) spawnDrop(w, k, pl.x, pl.y + 10);
  }
  if (id === 'extra_pocket') pl.consumableSlots = 2;
  if (id === 'charm_bracelet') pl.charmSlots = 2;
  if (!again) {
    it.hooks?.onPickup?.(w);
    w.run.stats.items.push(id);
    w.game.save.collectItem(id);
  }
  pl.recompute();
  checkProgress(w);
  syncFamiliars(w);
  // transformations
  const tags = ['moth', 'ink', 'clock', 'wax', 'thread', 'bone', 'void', 'drain', 'vamp', 'jeffy'];
  for (const t of tags) {
    if (pl.transformations.has(t)) continue;
    if (pl.tagCount(t) >= 3) {
      pl.transformations.add(t); pl.recompute();
      const T = TRANSFORM_EFFECTS[t];
      w.after(0.9, () => {
        w.hud.transformCard(T.name, T.desc); w.audio.stinger('transform'); w.audio.play('choir', { vol: 0.6 });
        w.whiteFlash = 0.6; w.shake(3); w.fx.ring(pl.x, pl.y - 10, 6, 70, '#c890ff', 0.6);
      }, true);
      w.game.save.unlock('transform_' + t);
    }
  }
  // the Boys: not a transformation, just everything you borrowed off them at once
  if (BOYS.every((b) => pl.has(b))) w.game.save.unlock('transform_crew');
}
/** Crug's pen, Ewen's bike, Gavyn's pouch and Sam's beer. */
export const BOYS = ['crugs_pen', 'ewens_bike', 'gavyns_pouch', 'sams_beer'];

void TAU; void VIEW_H;
