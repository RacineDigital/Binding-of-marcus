// Node test suite: seeded generation determinism and content data validation.
import { Run } from '../src/game/run';
import { generateFloor } from '../src/generation/floorgen';
import { ALL_ITEMS, CONSUMABLES } from '../src/items/registry';
import { ENEMY_DEFS, getEnemy } from '../src/enemies/registry';
import { BOSSES } from '../src/bosses/registry';
import { FLOORS, ALT_FLOORS, CHAPTER_POOL, familyOf, FINAL_FLOOR } from '../src/data/floors';
import { chapterOrder, themeAt } from '../src/generation/floorgen';
import { SONGS } from '../src/audio/songs';
import { ITEM_ACC, ITEM_OUTFIT, TRANSFORM_OUTFIT } from '../src/art/costume';
import { TRANSFORM_EFFECTS } from '../src/player/player';
import { TEMPLATES } from '../src/rooms/templates';
import { generateLayout, generateTemplate } from '../src/generation/roomgen';
import { validateTemplate } from '../src/rooms/validate';
import { SOUNDSCAPES, soundscapeFor } from '../src/audio/ambience';
import { RNG } from '../src/core/rng';
import { PixelArt } from '../src/render/pixel';
import { CHARACTERS } from '../src/player/characters';
import { Health } from '../src/player/health';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { MAP_SIZE, TILE } from '../src/core/constants';
import { beamScale, laserScale, overcharge, LASER_TIERS } from '../src/projectiles/weapons';
import { slotBreakChance } from '../src/game/npc';
import { shopLevelFor, shopPrice, shopCurios, MAX_SHOP_LEVEL } from '../src/game/shoplevel';
import { Side, Ob } from '../src/rooms/room';
import { ALL_SET_PIECES } from '../src/generation/setpieces';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0, checks = 0;
function ok(cond: boolean, msg: string): void { checks++; if (!cond) { failures++; console.error('FAIL:', msg); } }

function signature(seed: string, floors = 8): string {
  const run = new Run(seed, 'marcus', () => true);
  const parts: string[] = [];
  for (let f = 0; f < floors; f++) {
    run.floorIndex = f;
    const fl = generateFloor(run, f);
    parts.push(fl.rooms.map((r) => [r.type, r.gx, r.gy, r.cw, r.ch, r.bossId ?? '', r.spawns.map((s) => s.id).join('.'), r.pickups.map((p) => p.kind + (p.data?.id ?? '')).join('.'), Array.from(r.grid).join('')].join('|')).join('\n'));
  }
  return parts.join('\n=====\n');
}

// ------------------------------------------------------------ determinism
for (const seed of ['ABCD2345', 'MARCUS99', 'ZZZZ2222']) {
  ok(signature(seed) === signature(seed), `seed ${seed} regenerates identically`);
}
ok(signature('ABCD2345') !== signature('MARCUS99'), 'different seeds produce different runs');

// ------------------------------------------------------------ generation rules over many seeds
const typeCounts: Record<string, number> = {};
let altCount = 0;
for (let i = 0; i < 150; i++) {
  const seed = 'T' + i.toString(36).toUpperCase().padStart(7, '2');
  const run = new Run(seed, 'marcus', () => true);
  for (let f = 0; f < 8; f++) {
    run.floorIndex = f;
    const fl = generateFloor(run, f);
    if (fl.alt) altCount++;
    const rooms = fl.rooms;
    ok(rooms.filter((r) => r.type === 'boss').length === 1, `${seed} f${f}: exactly one boss room`);
    ok(rooms[0].type === 'start', `${seed} f${f}: room 0 is start`);
    if (f < 7) ok(rooms.some((r) => r.type === 'treasure'), `${seed} f${f}: has treasure room`);
    for (const r of rooms) {
      typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
      // door symmetry and alignment
      for (const d of r.doors) {
        const o = rooms[d.to];
        const back = o.doors.find((x) => x.to === r.id && x.side === ((d.side + 2) % 4));
        ok(!!back, `${seed} f${f}: door ${r.id}->${d.to} has a matching door back`);
        const n = r.doorNeighbor(d.side as Side, d.slot);
        ok(fl.map[n.my * MAP_SIZE + n.mx] === o.id, `${seed} f${f}: door ${r.id}->${d.to} lines up on the grid`);
        if (back) ok(back.hidden === d.hidden && back.locked === d.locked, `${seed} f${f}: door flags match both sides`);
      }
      if (r.type === 'treasure' || r.type === 'boss' || r.type === 'shop') ok(r.doors.filter((d) => !d.hidden).length === 1, `${seed} f${f}: ${r.type} room ${r.id} has a single entrance`);
      if (r.type === 'secret' || r.type === 'supersecret') ok(r.doors.every((d) => d.hidden), `${seed} f${f}: ${r.type} entrances are hidden`);
      for (const s of r.spawns) ok(!!getEnemy(s.id), `${seed}: spawn ${s.id} exists`);
      // walking enemies can be reached on foot from a door (no rock-sealed soft-locks)
      if (r.spawns.length && r.doors.length) {
        const walk = (k: number) => k === Ob.None || k === Ob.Spikes || k === Ob.TimedSpikes || k === Ob.Web || k === Ob.Button;
        const seen = new Uint8Array(r.cols * r.rows); const q: number[] = [];
        for (const d of r.doors) { const [c, rr] = r.doorInner(d.side, d.slot); if (r.inGrid(c, rr)) { seen[r.idx(c, rr)] = 1; q.push(r.idx(c, rr)); } }
        while (q.length) { const i = q.pop()!, c = i % r.cols, rr = (i / r.cols) | 0; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = rr + dr; if (!r.inGrid(nc, nr)) continue; const j = r.idx(nc, nr); if (!seen[j] && walk(r.at(nc, nr))) { seen[j] = 1; q.push(j); } } }
        for (const sp of r.spawns) {
          const def = getEnemy(sp.id); if (!def || def.flying || def.ghost) continue;
          const c = Math.max(0, Math.min(r.cols - 1, Math.round(sp.c))), rr = Math.max(0, Math.min(r.rows - 1, Math.round(sp.r)));
          ok(!!seen[r.idx(c, rr)], `${seed} f${f}: ${sp.id} in room ${r.id} (${r.type}) is reachable on foot`);
        }
      }
    }
    // every non-secret room reachable from the start through visible doors
    const seen = new Set([0]); const q = [0];
    while (q.length) { const u = q.pop()!; for (const d of rooms[u].doors) if (!d.hidden && !seen.has(d.to)) { seen.add(d.to); q.push(d.to); } }
    for (const r of rooms) if (r.type !== 'secret' && r.type !== 'supersecret') ok(seen.has(r.id), `${seed} f${f}: room ${r.id} (${r.type}) reachable`);
  }
}
console.log('room type frequency over 150 runs:', JSON.stringify(typeCounts));
console.log('alt floors seen:', altCount);

// ------------------------------------------------------------ data validation
const ids = new Set<string>();
for (const it of ALL_ITEMS) {
  ok(!ids.has(it.id), `unique item id ${it.id}`); ids.add(it.id);
  ok(it.name.length > 0 && it.pickup.length > 0, `item ${it.id} has name and pickup text`);
  ok(it.effect.length > 0 || !!it.stats || !!it.health || !!it.give || !!it.flight, `item ${it.id} describes what it does`);
  if (it.kind === 'active') ok(!!it.active, `active ${it.id} has an active spec`);
  if (it.kind === 'familiar') ok(!!it.familiar, `familiar ${it.id} has a familiar spec`);
  if (it.unlock) ok(ACHIEVEMENTS.some((a) => a.id === it.unlock), `item ${it.id} unlock ${it.unlock} is a real achievement`);
  const p = new PixelArt(18, 18);
  try { it.icon(p); ok(p.data.some((v) => v !== 0), `item ${it.id} icon draws something`); } catch (e) { ok(false, `item ${it.id} icon throws ${e}`); }
}
for (const c of CONSUMABLES) if (c.icon) { const p = new PixelArt(18, 18); try { c.icon(p); } catch (e) { ok(false, `charm ${c.id} icon throws`); } }
for (const f of [...FLOORS, ...Object.values(ALT_FLOORS), ...CHAPTER_POOL]) {
  ok(!!SONGS[f.music], `floor ${f.id} music ${f.music} exists`);
  for (const id of Object.keys(f.enemies)) ok(!!getEnemy(id), `floor ${f.id} enemy ${id} exists`);
  for (const id of f.bosses) ok(!!getEnemy(id), `floor ${f.id} boss ${id} exists`);
}
{
  const firsts = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const seed = 'order' + i;
    const order = chapterOrder(seed);
    ok(order.length === FINAL_FLOOR, `chapter order ${seed} has ${FINAL_FLOOR} chapters`);
    ok(new Set(order.map((t) => familyOf(t))).size === order.length, `chapter order ${seed} never repeats a family`);
    order.forEach((t, d) => ok((t.tier ?? 0) <= d + 1, `chapter order ${seed}: ${t.id} not too early at depth ${d}`));
    ok(chapterOrder(seed).map((t) => t.id).join() === order.map((t) => t.id).join(), `chapter order ${seed} is deterministic`);
    ok(themeAt(seed, FINAL_FLOOR) === FLOORS[FLOORS.length - 1], `chapter order ${seed} ends at The Binding`);
    firsts.add(order[1].id);
  }
  ok(firsts.size >= 6, `second chapter varies between runs (${firsts.size} distinct)`);
}
{
  // no regular enemy may shrug off a shot to the face while idle (that makes it bomb-only: a soft-lock risk)
  const noop: any = new Proxy(() => noop, { get: () => noop });
  for (const d of ENEMY_DEFS) {
    if (d.boss || !d.onHurt) continue;
    const e: any = { state: 'idle', data: { face: 0 }, x: 0, y: 0, t: 0 };
    for (const ang of [Math.PI, 0, Math.PI / 2]) {
      const r = d.onHurt(e, noop, 10, { ang, knock: 1, source: 'shot' });
      ok(r === undefined || (r as number) > 0, `enemy ${d.id} can be hurt by shots (angle ${ang.toFixed(2)})`);
    }
  }
}
for (const id of [...Object.keys(ITEM_ACC), ...Object.keys(ITEM_OUTFIT)]) ok(ALL_ITEMS.some((i) => i.id === id) || CONSUMABLES.some((c) => c.id === id), `costume item ${id} exists`);
for (const id of Object.keys(TRANSFORM_EFFECTS)) ok(!!TRANSFORM_OUTFIT[id], `transformation ${id} has its own look`);
for (const t of TEMPLATES) { const bad = validateTemplate(t); ok(bad.length === 0, `template ${t.name}: ${bad.join('; ')}`); }
ok(new Set(TEMPLATES.map((t) => t.name)).size === TEMPLATES.length, 'template names are unique');
{
  // generated layouts obey the same rules as authored ones: open doors, reachable floor, edge rocks
  const rng = new RNG('layout-rules');
  for (let i = 0; i < 3000; i++) { const t = generateTemplate(rng, CHAPTER_POOL[i % CHAPTER_POOL.length], i % 8); const bad = validateTemplate(t); ok(bad.length === 0, `generated layout ${i}: ${bad.join('; ')}\n${t.rows.join('\n')}`); }
}
{
  const rng = new RNG('layouts');
  const valid = new Set('.#@bo^~fpkuIwMFSWHTA');
  for (let i = 0; i < 2000; i++) {
    const L = generateLayout(rng, FLOORS[i % FLOORS.length], i % 8);
    ok(L.length === 9 && L.every((r) => r.length === 15 && [...r].every((ch) => valid.has(ch))), `generated layout ${i} is a valid 15x9 grid`);
    ok(L.join('').replace(/[^MFSWHTA]/g, '').length >= 2, `generated layout ${i} has enemy slots`);
  }
}
{
  const { HOSPITAL_FLOORS, MARGINS_FLOOR: _m, ...floorsMod } = await import('../src/data/floors');
  const themes = [...CHAPTER_POOL, ...HOSPITAL_FLOORS, ...Object.values(floorsMod).filter((v: any) => v && typeof v === 'object' && 'ambience' in v && 'id' in v)] as any[];
  for (const th of themes) ok(!!SOUNDSCAPES[soundscapeFor(th)], `floor ${th.id} has a soundscape`);
  for (const [id, sc] of Object.entries(SOUNDSCAPES)) ok(sc.level > 0 && sc.level < 0.6 && sc.events.length > 0, `soundscape ${id} is sane`);
}
for (const c of CHARACTERS) for (const id of c.items) ok(ids.has(id), `character ${c.id} start item ${id} exists`);
const counts = {
  items: ALL_ITEMS.length, passives: ALL_ITEMS.filter((i) => i.kind === 'passive').length, actives: ALL_ITEMS.filter((i) => i.kind === 'active').length,
  familiars: ALL_ITEMS.filter((i) => i.kind === 'familiar').length, consumables: CONSUMABLES.length, enemies: ENEMY_DEFS.length,
  bosses: BOSSES.filter((b) => !['snipA', 'snipB', 'ratprince', 'blottedhalf', 'bilgeseg'].includes(b.id)).length, floors: FLOORS.length, characters: CHARACTERS.length,
};
console.log('content:', JSON.stringify(counts));
// beyond the Binding: the Margins and the Last Page
{
  const { MARGINS_FLOOR, LASTPAGE_FLOOR } = await import('../src/data/floors');
  const { getEnemy } = await import('../src/enemies/registry');
  let bossTotal = 0, fives = 0;
  for (let i = 0; i < 60; i++) {
    const run = new Run('margins' + i, 'marcus', () => true);
    run.flags.margins = true;
    const fl = generateFloor(run, MARGINS_FLOOR);
    ok(fl.theme.id === 'margins', 'margins theme');
    const bosses = fl.rooms.filter((r) => r.type === 'boss');
    bossTotal += bosses.length; if (bosses.length === 5) fives++;
    ok(bosses.length >= 3, `margins has several boss rooms (${bosses.length})`);
    ok(bosses.filter((r) => r.flags.trueBoss).length === 1, 'exactly one boss room leads on');
    ok(new Set(bosses.map((r) => r.bossId)).size === bosses.length, 'no boss twice in the Margins');
    ok(bosses.every((r) => !!getEnemy(r.bossId!)), 'margins bosses exist');
    ok(bosses.every((r) => r.doors.every((d) => d.kind === 'boss') && fl.rooms.every((o) => o.doors.filter((d) => d.to === r.id).every((d) => d.kind === 'boss' && !d.locked))), 'boss doors all look the same');
    ok(fl.rooms.some((r) => r.type === 'shop'), 'margins has a shop');
    const tr = fl.rooms.filter((r) => r.type === 'treasure').length;
    ok(tr >= 1 && tr <= 3, `margins has 1-3 treasure rooms (${tr})`);
    ok(fl.rooms.length >= 24, `margins is huge (${fl.rooms.length})`);
    const lp = generateFloor(run, LASTPAGE_FLOOR);
    const arena = lp.rooms.find((r) => r.type === 'boss');
    ok(lp.theme.id === 'lastpage' && !!arena && arena.cw === 2 && arena.ch === 2 && arena.bossId === 'unwritten', 'last page arena');
    // the light path: the Dedication and the Foreword
    const lrun = new Run('light' + i, 'marcus', () => true);
    lrun.flags.margins = true; lrun.flags.light = true;
    const ded = generateFloor(lrun, MARGINS_FLOOR);
    ok(ded.theme.id === 'dedication' && ded.rooms.filter((r) => r.type === 'boss').length >= 3 && ded.rooms.filter((r) => r.flags.trueBoss).length === 1, 'dedication floor');
    ok(ded.rooms.filter((r) => r.type === 'boss').every((r) => !!getEnemy(r.bossId!)), 'dedication bosses exist');
    const fw = generateFloor(lrun, LASTPAGE_FLOOR);
    ok(fw.theme.id === 'foreword' && fw.rooms.find((r) => r.type === 'boss')?.bossId === 'author', 'foreword arena');
  }
  console.log(`margins: ${(bossTotal / 60).toFixed(1)} boss rooms on average, ${fives}/60 with five`);
}
// the back stair: St. Agnes, Room 4 and home
{
  const { HOSPITAL_FIRST, ROOM4_FLOOR, HOME_FLOOR } = await import('../src/data/floors');
  const { getEnemy } = await import('../src/enemies/registry');
  const { NOTES } = await import('../src/data/notes');
  const { ENDINGS, endingFor } = await import('../src/data/endings');
  const fakeSave: any = { isUnlocked: () => true, hasNote: () => false };
  for (let i = 0; i < 40; i++) {
    const run = new Run('stair' + i, 'marcus', () => true);
    run.flags.hospital = true;
    ['waiting', 'nightward', 'icu'].forEach((id, k) => {
      const fl = generateFloor(run, HOSPITAL_FIRST + k, fakeSave);
      ok(fl.theme.id === id, `hospital chapter ${k} is ${id} (${fl.theme.id})`);
      const deep = fl.rooms.find((r) => r.type === 'supersecret');
      ok(!!deep && deep.pickups.some((p) => p.data?.id === 'letter_bottom'), 'a deep crawlspace holds the bottom half');
      const boss = fl.rooms.find((r) => r.type === 'boss');
      ok(!!boss && !!getEnemy(boss.bossId!), `hospital boss exists (${boss?.bossId})`);
      ok(fl.rooms.some((r) => r.npcs.some((n) => n.kind === 'note')), 'a note lies somewhere in the hospital');
    });
    for (const fi of [ROOM4_FLOOR, HOME_FLOOR]) ok(!['ward', 'waiting', 'nightward', 'icu'].includes(generateFloor(run, fi).theme.id), 'no second ward after the hospital');
    run.flags.room4 = true;
    const r4 = generateFloor(run, ROOM4_FLOOR);
    ok(r4.theme.id === 'room4' && r4.rooms.find((r) => r.type === 'boss')?.bossId === 'patient', 'room 4 arena holds the Patient');
    run.flags.home = true;
    const home = generateFloor(run, HOME_FLOOR);
    ok(home.theme.id === 'home' && home.rooms.length === 1 && home.rooms[0].npcs.some((n) => n.kind === 'book'), 'home: one room and the book');
    ok(endingFor(run) === 'goodnight', 'goodnight ending');
  }
  const r = new Run('e', 'marcus', () => true);
  ok(endingFor(r) === 'morning', 'morning ending');
  r.flags.room4 = true; ok(endingFor(r) === 'the_visit', 'the visit ending');
  const ach = new Set(ACHIEVEMENTS.map((a) => a.id));
  ok(NOTES.every((n) => !n.req || ach.has(n.req)), 'every note requirement is an achievement');
  ok(new Set(NOTES.map((n) => n.id)).size === NOTES.length, 'note ids unique');
  ok(ALL_ITEMS.every((it) => !it.unlock || ach.has(it.unlock)), 'every item unlock is an achievement');
  ok(ENDINGS.length === 5 && ENDINGS.every((e, k) => e.num === k + 1), 'five endings in order');
  ok(['letter_top', 'letter_bottom', 'grandfathers_letter'].every((id) => ALL_ITEMS.find((x) => x.id === id && Object.keys(x.pools).length === 0)), 'the letter never rolls from a pool');
}
// echoes: where you died last time, a room with your echo in it (never in the Daily Run)
{
  const { getEnemy } = await import('../src/enemies/registry');
  const echoSave: any = { isUnlocked: () => false, hasNote: () => true, data: { echo: { char: 'wren', floor: 3, items: ['inkpot'], cause: 'a rat', chapter: 'The Underworks' } } };
  let found = 0;
  for (let i = 0; i < 40; i++) {
    const run = new Run('echo' + i, 'marcus', () => true);
    const plain = generateFloor(run, 3);
    const fl = generateFloor(run, 3, echoSave);
    const er = fl.rooms.filter((r) => r.type === 'echo');
    if (er.length) found++;
    ok(er.length <= 1, 'at most one echo room');
    for (const r of er) {
      ok(r.bossId === 'echo' && !!getEnemy('echo'), 'echo room holds the echo');
      ok(r.doors.length === 1 && fl.rooms[r.doors[0].to].doors.some((d) => d.to === r.id && d.kind === 'echo'), 'echo room has one door, both sides');
    }
    // everything else on the floor is exactly as the seed made it
    ok(plain.rooms.length + er.length === fl.rooms.length && plain.rooms.every((r, k) => r.type === fl.rooms[k].type && r.gx === fl.rooms[k].gx), 'echo leaves the rest of the floor alone');
    ok(generateFloor(run, 2, echoSave).rooms.every((r) => r.type !== 'echo'), 'only on the chapter you died in');
    const daily = new Run('echo' + i, 'marcus', () => true); daily.mode = 'daily';
    ok(generateFloor(daily, 3, echoSave).rooms.every((r) => r.type !== 'echo'), 'no echoes in the Daily Run');
  }
  ok(found >= 36, `echo rooms placed (${found}/40)`);
}
// 3.1: every item lives in exactly one pool, and a transformation's items all share it
{
  const { homePool } = await import('../src/items/homes');
  const { LOOKS } = await import('../src/art/look');
  for (const it of ALL_ITEMS) ok(Object.keys(it.pools).length <= 1, `${it.id} is in one pool (${Object.keys(it.pools).join(',')})`);
  for (const t of Object.keys(TRANSFORM_EFFECTS)) {
    const homes = new Set(ALL_ITEMS.filter((i) => i.tags?.includes(t) && Object.keys(i.pools).length).map((i) => homePool(i)));
    ok(homes.size === 1, `${t} items share one pool (${[...homes].join(',')})`);
  }
  ok(!TRANSFORM_EFFECTS.crew && !TRANSFORM_EFFECTS.boys, 'the Boys are a set, not a transformation');
  ok(ALL_ITEMS.filter((i) => i.tags?.includes('boys')).length === 4, 'four of the boys\' things');
  for (const it of ALL_ITEMS.filter((i) => i.tags?.includes('innate'))) ok(Object.keys(it.pools).length === 0 && !!it.tags?.includes('quest'), `${it.id} never rolls and can't be traded`);
  for (const c of CHARACTERS) { ok(LOOKS[c.look]?.hand === 'marcus', `${c.id} is drawn on Marcus's rig`); for (const id of c.items) ok(!!ALL_ITEMS.find((x) => x.id === id), `${c.id} starts with real item ${id}`); }
  for (const id of ['ink_horns', 'the_signature', 'ink_wings']) ok(homePool(ALL_ITEMS.find((x) => x.id === id)!) === 'deal', `${id} is an Inkwell item`);
  for (const id of ['black_cat', 'hex_doll', 'cracked_mirror']) ok(homePool(ALL_ITEMS.find((x) => x.id === id)!) === 'curse', `${id} is a Hexed item`);
  ok(ALL_ITEMS.filter((i) => i.tags?.includes('vamp')).every((i) => homePool(i) === 'secret'), 'Night Count items live in secret rooms');
}
{
  const { GAME_VERSION } = await import('../src/core/constants');
  const fs = await import('fs');
  ok(JSON.parse(fs.readFileSync('package.json', 'utf8')).version === GAME_VERSION, 'GAME_VERSION matches package.json');
}
// treasure rooms are dead ends: one way in (hidden doors included)
{
  const { Run } = await import('../src/game/run');
  const { generateFloor } = await import('../src/generation/floorgen');
  let bad = 0;
  for (let k = 0; k < 40; k++) for (let f = 0; f < 8; f++) { const run = new Run('TREASURE' + k, 'marcus', () => true); run.floorIndex = f; for (const r of generateFloor(run, f).rooms) if (r.type === 'treasure' && r.doors.length !== 1) bad++; }
  ok(bad === 0, 'every treasure room has exactly one entrance');
}
// no room makes you walk over spikes to get from one door to another
{
  const { Run } = await import('../src/game/run');
  const { generateFloor } = await import('../src/generation/floorgen');
  const { Ob } = await import('../src/rooms/room');
  let bad = 0;
  for (let k = 0; k < 30; k++) for (let f = 0; f < 8; f++) {
    const run = new Run('SPIKES' + k, 'marcus', () => true); run.floorIndex = f;
    for (const room of generateFloor(run, f).rooms) {
      if (room.type === 'sacrifice' || room.doors.length < 2) continue;
      const walk = (x: number) => x === Ob.None || x === Ob.TimedSpikes || x === Ob.Web || x === Ob.Button;
      const ds = room.doors.map((d) => room.doorInner(d.side, d.slot));
      const seen = new Uint8Array(room.cols * room.rows); const q = [ds[0]]; seen[room.idx(ds[0][0], ds[0][1])] = 1;
      while (q.length) { const [c, r] = q.pop()!; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (!room.inGrid(nc, nr) || seen[room.idx(nc, nr)] || !walk(room.at(nc, nr))) continue; seen[room.idx(nc, nr)] = 1; q.push([nc, nr]); } }
      if (ds.some(([c, r]) => !seen[room.idx(c, r)])) bad++;
    }
  }
  ok(bad === 0, 'every door can be reached from every other without stepping on spikes');
}
// every boss has its own sting, and the card slams its name on the sting's hit
{
  const { bossStingRecipe, STING_HIT } = await import('../src/audio/bossting');
  ok(STING_HIT > 0.2 && STING_HIT < 0.6, 'sting hit lands early in the card');
  for (const b of BOSSES) for (const k of ['chapter', 'final', 'echo', 'champion'] as const) { const r = bossStingRecipe(b.id, k); ok(r.dur >= 2.5 && typeof r.render === 'function', `${b.id} ${k} sting`); }
}
// the tainted: one per reader, each with a look, real items and an unlock earned by all five marks
{
  const { TAINTED } = await import('../src/player/characters');
  const { LOOKS } = await import('../src/art/look');
  const bases = CHARACTERS.filter((c) => !c.tainted);
  ok(TAINTED.length === bases.length, 'every reader has a tainted self');
  for (const t of TAINTED) {
    ok(!!LOOKS[t.look], `${t.id} has a look`);
    ok(t.items.every((id) => ALL_ITEMS.some((i) => i.id === id)), `${t.id}'s starting items exist`);
    ok(ACHIEVEMENTS.some((a) => a.id === t.unlock), `${t.id} unlock is an achievement`);
    ok(t.unlock === 'tainted_' + t.tainted && bases.some((b) => b.id === t.tainted), `${t.id} unlocks from ${t.tainted}'s marks`);
  }
}
// every chapter plays its own recorded theme, and every recording belongs to a chapter
{
  const F = await import('../src/data/floors');
  const { RECORDINGS } = await import('../src/audio/recorded');
  const { themeMusic } = await import('../src/game/roomflow');
  const fs = await import('fs');
  const themes = [...F.FLOORS, ...Object.values(F.ALT_FLOORS), ...F.NEW_FLOORS, F.MARGINS_THEME, F.LASTPAGE_THEME, F.DEDICATION_THEME, F.FOREWORD_THEME, ...F.HOSPITAL_FLOORS, F.ROOM4_THEME, F.HOME_THEME];
  const ids = new Set(themes.map((t) => t.id));
  for (const t of themes) ok(themeMusic(t) === 'rec_' + t.id, `${t.id} plays its own recording`);
  for (const r of RECORDINGS) ok(ids.has(r.id), `recording ${r.id} belongs to a chapter`);
  const files = fs.readdirSync('assets/music/audio').filter((f) => f.endsWith('.ogg')).map((f) => f.replace(/^\d+[-_ ]?/, '').replace(/\.ogg$/, ''));
  for (const r of RECORDINGS) ok(files.includes(r.id), `recording ${r.id} has its file`);
  ok(new Set(themes.map((t) => themeMusic(t))).size === themes.length, 'no two chapters share a theme');
}
// the ending bosses each have their own theme
{
  const { bossMusic } = await import('../src/game/roomflow');
  const { SONGS } = await import('../src/audio/songs');
  const { LASTPAGE_FLOOR, ROOM4_FLOOR } = await import('../src/data/floors');
  const r = new Run('MUSIC1', 'marcus', () => true);
  r.floorIndex = FINAL_FLOOR; ok(bossMusic(r) === 'finalBinding', 'the Binding plays Last Rites');
  r.flags.margins = true; r.floorIndex = LASTPAGE_FLOOR; ok(bossMusic(r) === 'finalUnwritten', 'the Last Page plays Unwriting');
  r.flags.light = true; ok(bossMusic(r) === 'finalAuthor', 'the Foreword plays The Final Draft');
  const h = new Run('MUSIC2', 'marcus', () => true); h.flags.room4 = true; h.floorIndex = ROOM4_FLOOR; ok(bossMusic(h) === 'bossFinal', 'Room 4 keeps the final theme');
  for (const id of ['finalBinding', 'finalUnwritten', 'finalAuthor']) ok(!!SONGS[id], `${id} is in the soundtrack`);
}
// ------------------------------------------------------------ set pieces
{
  const doors = [[7, 0], [7, 8], [0, 4], [14, 4]];
  for (const sp of ALL_SET_PIECES) {
    ok(sp.rows.length === 9 && sp.rows.every((r) => r.length === 15), `set piece ${sp.name} is 15x9`);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 15; c++) {
      const id = sp.cast[sp.rows[r][c]]; if (!id) continue;
      ok(!!getEnemy(id), `set piece ${sp.name}: ${id} exists`);
      // mirroring keeps door distances (the doors are symmetric), so one check covers every flip
      ok(doors.every(([dc, dr]) => Math.abs(dc - c) + Math.abs(dr - r) >= 3), `set piece ${sp.name}: ${id} at ${c},${r} is not on top of a door`);
    }
  }
  let withPiece = 0, floors = 0;
  for (let i = 0; i < 40; i++) {
    const run = new Run('S' + i.toString(36).toUpperCase().padStart(7, '4'), 'marcus', () => true);
    for (let f = 0; f < 7; f++) { run.floorIndex = f; const fl = generateFloor(run, f); floors++; if (fl.rooms.some((r) => r.flags.variant === 'setpiece' && r.spawns.length >= 4)) withPiece++; }
  }
  ok(withPiece >= floors * 0.95, `chapters have their set piece (${withPiece}/${floors})`);
}

// ------------------------------------------------------------ room entrances
{
  let near = 0, total = 0;
  for (let i = 0; i < 30; i++) {
    const run = new Run('E' + i.toString(36).toUpperCase().padStart(7, '6'), 'marcus', () => true);
    for (let f = 0; f < 8; f++) { run.floorIndex = f; const fl = generateFloor(run, f);
      for (const r of fl.rooms) if (r.type === 'normal') for (const s of r.spawns) { total++;
        if (r.doors.some((d) => { const [dc, dr] = r.doorInner(d.side, d.slot); return Math.abs(dc - Math.round(s.c)) + Math.abs(dr - Math.round(s.r)) < 3; })) near++; } }
  }
  ok(near === 0, `no enemy starts within 2 tiles of a door (${near} of ${total})`);
}
// ------------------------------------------------------------ the shop: Mott, and a donation box, restock machine or beggar
{
  const count: Record<string, number> = {}; let shops = 0, nearDoor = 0, motts = 0;
  for (let i = 0; i < 60; i++) {
    const run = new Run('M' + i.toString(36).toUpperCase().padStart(7, '3'), 'marcus', () => true);
    for (let f = 0; f < 8; f++) { run.floorIndex = f; const fl = generateFloor(run, f);
      for (const r of fl.rooms) if (r.type === 'shop') { shops++;
        motts += r.npcs.filter((n) => n.kind === 'mott').length;
        for (const n of r.npcs) if (n.kind !== 'mott') { count[n.kind] = (count[n.kind] ?? 0) + 1;
          for (const side of [Side.N, Side.S, Side.W, Side.E]) { const d = r.doorPos(side, 0); if (Math.hypot(d.x - n.x, d.y - n.y) < TILE * 3) nearDoor++; } } } }
  }
  const frac = (k: string) => (count[k] ?? 0) / shops;
  ok(motts === shops, `every shop has Mott (${motts}/${shops})`);
  ok(Math.abs(frac('donation') - 0.6) < 0.08 && Math.abs(frac('restock') - 0.3) < 0.08 && Math.abs(frac('beggar') - 0.1) < 0.06, `shop fixture: donation ~60%, restock ~30%, beggar ~10% (${JSON.stringify(count)} of ${shops})`);
  ok(nearDoor === 0, `the shop's machine never stands in a doorway (${nearDoor})`);
  ok(slotBreakChance(0) === 0.05 && Math.abs(slotBreakChance(1) - 0.07) < 1e-9 && Math.abs(slotBreakChance(10) - 0.25) < 1e-9, 'slot machines: 5% to break, 2% more each pull');
  ok(shopLevelFor(0) === 0 && shopLevelFor(49) === 0 && shopLevelFor(50) === 1 && shopLevelFor(149) === 2 && shopLevelFor(9999) === MAX_SHOP_LEVEL, 'a shop level for every 50 buttons donated, capped');
  ok(shopPrice(15, 0) === 15 && shopPrice(15, 2) < 15 && shopPrice(15, 4) < shopPrice(15, 2) && shopPrice(1, 4) === 1, 'shop discounts apply and never go below a button');
  ok(shopCurios(0, 0) === 2 && shopCurios(0, 1) === 3 && shopCurios(0, 3) === 4 && shopCurios(5, 5) === 4, 'donations add curios to the shop, up to four');
}
// ------------------------------------------------------------ shot size widens every beam and laser
{
  ok(beamScale(1) === 1 && laserScale(1) === 1, 'beams and lasers are their normal width at normal shot size');
  ok(beamScale(2.6) > beamScale(2) && beamScale(2) > beamScale(1.4) && laserScale(2.6) > laserScale(2), 'bigger shots keep widening beams and lasers (no early cap)');
  ok(beamScale(0.4) > 0 && laserScale(9) <= 3 ** 1.5, 'beam and laser width stay within sane bounds');
}
// ------------------------------------------------------------ brass hearts are gone
{
  const old = Health.from({ redMax: 6, red: 6, extra: [], brass: 2, gilded: 0 });
  ok(!('brass' in old.serialize()) && old.extraHalf() === 4 && old.extra.every((e) => e.k === 'wax'), 'a saved run holding brass hearts gets wax hearts instead');
  ok(ALL_ITEMS.every((i) => !(i.health as any)?.brass), 'no item grants brass hearts');
  ok(CHARACTERS.every((c) => !(c.health as any).brass), 'no reader starts with brass hearts');
}
// ------------------------------------------------------------ the laser family
{
  const fam = ALL_ITEMS.filter((i) => i.tags?.includes('laser'));
  ok(fam.length >= 8, `there is a family of laser items (${fam.length})`);
  // the tag (Live Wire progress) and the overcharge count must always agree
  for (const it of fam) ok((it.attack as any)?.lasers === 1, `${it.id} counts once toward overcharge`);
  for (const it of ALL_ITEMS) if ((it.attack as any)?.lasers) ok(!!it.tags?.includes('laser'), `${it.id} overcharges lasers so it is tagged laser`);
  const p = (n: number) => ({ lasers: n } as any);
  ok(overcharge(p(0)) === 0 && overcharge(p(1)) === 0 && overcharge(p(2)) === 1 && overcharge(p(4)) === 3 && overcharge(p(9)) === 3, 'overcharge tiers: one per extra laser item, up to three');
  ok(LASER_TIERS.length === 4 && LASER_TIERS.slice(1).every((t) => t.name && t.color && t.perk), 'every overcharge tier has a name, a colour and a perk');
  ok(!!TRANSFORM_EFFECTS.laser, 'three laser items make Live Wire');
}
// ------------------------------------------------------------ every sound a script asks for exists
{
  const sfx = fs.readFileSync('src/audio/sfx.ts', 'utf8');
  const have = new Set([...sfx.matchAll(/^  ([a-zA-Z]+): \{ dur/gm)].map((m: RegExpMatchArray) => m[1]));
  const walk = (d: string): string[] => fs.readdirSync(d).flatMap((f: string) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
  const missing = new Set<string>();
  for (const f of walk('src')) for (const m of fs.readFileSync(f, 'utf8').matchAll(/audio\.play\('([a-zA-Z]+)'/g)) if (!have.has(m[1])) missing.add(m[1]);
  ok(missing.size === 0, `every sound played exists (${[...missing].join(', ')})`);
}
// ------------------------------------------------------------ boss extra patterns (a hang in 3.5-3.7)
{
  const { patternsFor } = await import('../src/bosses/patterns');
  for (const b of BOSSES) {
    const t0 = Date.now(), ps = patternsFor(b.id);
    ok(ps.length === 3 && new Set(ps).size === 3 && Date.now() - t0 < 50, `${b.id} is dealt three different extra patterns`);
  }
}
// ------------------------------------------------------------ item icons read at a glance
{
  const { itemIconArt } = await import('../src/art/items');
  const small: string[] = [];
  for (const it of ALL_ITEMS) {
    let art; try { art = itemIconArt(it.id); } catch { ok(false, `${it.id} icon draws`); continue; }
    let n = 0, x0 = 99, x1 = -1, y0 = 99, y1 = -1;
    for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (art.opaque(x, y)) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (n < 45 || Math.max(x1 - x0, y1 - y0) < 10) small.push(`${it.id}(${n}px)`);
  }
  ok(small.length === 0, `every item icon is big and solid enough to read (${small.join(', ')})`);
}
// ------------------------------------------------------------ choices, replay rules and saved loot
{
  const { itemRole } = await import('../src/items/choice');
  const { ItemPools } = await import('../src/items/pools');
  const { dailySeed, dailyReader, todayKey } = await import('../src/game/progress');
  const { flawlessReward } = await import('../src/game/bindings');
  for (let seed = 0; seed < 80; seed++) {
    const pools = new ItemPools(new RNG('choice:' + seed), () => false);
    const pair = pools.choice(new RNG('draft:' + seed));
    const items = pair.map((id) => ALL_ITEMS.find((i) => i.id === id)!);
    ok(pair[0] !== pair[1] && items.every(Boolean), `choice ${seed}: two different real items`);
    ok(items.every((i) => !i.unlock), `choice ${seed}: respects profile unlocks`);
    ok(itemRole(items[0]) === 'offense' && itemRole(items[1]) !== 'offense', `choice ${seed}: distinct build directions`);
  }
  const r = new Run('LOOT2222', 'marcus', () => true);
  r.lootRng().next(); r.lootRng().next();
  const restored = new Run(r.seed, r.charId, () => true); restored.flags = JSON.parse(JSON.stringify(r.flags));
  ok(r.lootRng('kill').next() === restored.lootRng('kill').next(), 'loot event sequence survives serialized flags');
  const p = new ItemPools(new RNG('savedpool'), () => true); p.roll('treasure'); p.roll('shop');
  const q = new ItemPools(new RNG('savedpool'), () => true); q.restore(p.serialize()); q.restoreRng(p.rngState());
  for (let n = 0; n < 12; n++) ok(p.roll('treasure') === q.roll('treasure'), `saved item pool preserves future reward ${n}`);
  ok(flawlessReward(3) && flawlessReward(6) && !flawlessReward(0) && !flawlessReward(2) && !flawlessReward(4), 'mastery rewards have a predictable three-room cadence');
  const dateA = new Date('2026-10-06T00:15:00+02:00'), dateB = new Date('2026-10-05T15:15:00-07:00');
  ok(todayKey(dateA) === '2026-10-05' && dailySeed(dateA) === dailySeed(dateB), 'Daily seed uses the same UTC day across timezones');
  ok(dailyReader('DAILY222').id === dailyReader('DAILY222').id, 'Daily reader is deterministic');
  const profile = { isUnlocked: () => true, data: { donated: 999, notes: [], echo: { floor: 0, items: ['split_nib'] } }, hasNote: () => false } as any;
  const a = new Run('DAILY222', 'marcus', () => true), b = new Run('DAILY222', 'marcus', () => true);
  a.mode = b.mode = 'daily'; a.floorIndex = b.floorIndex = FINAL_FLOOR;
  const sig = (f: ReturnType<typeof generateFloor>) => JSON.stringify(f.rooms.map((r) => [r.type, r.bossId, r.pickups, r.npcs]));
  ok(sig(generateFloor(a, FINAL_FLOOR)) === sig(generateFloor(b, FINAL_FLOOR, profile)), 'Daily final boss and rewards ignore completed story progress');
}
// ------------------------------------------------------------ Inklings: every creature is written in a real essence
{
  const { INKLINGS, ENEMY_INK, ANNOTATIONS } = await import('../src/game/inklings');
  for (const d of Object.values(ENEMY_DEFS) as any[]) {
    if (d.boss) continue;
    ok(!!INKLINGS[ENEMY_INK[d.id]], `${d.id} leaves a known Inkling (${ENEMY_INK[d.id]})`);
  }
  for (const [e, id] of Object.entries(ENEMY_INK)) ok((Object.values(ENEMY_DEFS) as any[]).some((d) => d.id === e) && !!INKLINGS[id], `ink mapping ${e} -> ${id} names a real creature and essence`);
  for (const d of Object.values(INKLINGS)) {
    ok(d.levels.length === 3 && d.levels.every((l) => l.length > 10), `${d.id} describes all three levels`);
    ok(Object.values(ENEMY_INK).includes(d.id), `${d.id} can be found on some creature`);
  }
  for (const a of ANNOTATIONS) ok(!!INKLINGS[a.a] && !!INKLINGS[a.b] && a.a !== a.b, `annotation ${a.name} pairs two real essences`);
  for (const id of ['ink_blotter', 'fourth_margin', 'iron_gall', 'inkhorn', 'pumice_stone']) ok(!!ALL_ITEMS.find((i) => i.id === id), `ink item ${id} exists`);
  for (const u of ['ink_first', 'ink_annotation', 'ink_mastery']) ok(!!ACHIEVEMENTS.find((a) => a.id === u) && ALL_ITEMS.some((i) => i.unlock === u), `${u} is an achievement that unlocks an item`);
}

// ------------------------------------------------------------ controller families (button names and glyphs)
{
  const { padKindFromId, padLabel, DEFAULT_PAD, PAD_BINDABLE } = await import('../src/core/input');
  const ids: [string, string][] = [
    ['Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', 'xbox'],
    ['Xbox 360 Controller (XInput STANDARD GAMEPAD)', 'xbox'],
    ['DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', 'playstation'],
    ['Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', 'playstation'],
    ['Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)', 'nintendo'],
    ['Steam Deck Controller (Vendor: 28de Product: 1205)', 'deck'],
  ];
  for (const [id, kind] of ids) ok(padKindFromId(id) === kind, `${id} is recognised as ${kind}`);
  ok(padLabel(0, 'playstation') === 'Cross' && padLabel(0, 'nintendo') === 'B' && padLabel(4, 'deck') === 'L1' && padLabel(7, 'xbox') === 'RT', 'button names follow the controller family');
  const bound = Object.values(DEFAULT_PAD).flat();
  ok(new Set(bound).size === bound.length, 'no controller button does two things by default');
  ok(!!DEFAULT_PAD.swap?.length, 'swapping pocket items has a controller button');
  ok(!PAD_BINDABLE.includes(9) && DEFAULT_PAD.pause?.[0] === 9, 'Menu always pauses (it cannot be rebound to anything else)');
  const G = globalThis as any, keep = G.bomDesktop;
  G.bomDesktop = { steam: { info: () => ({ running: true, deck: true }), padType: () => 'PS4Controller' } };
  const P = await import('../src/core/platform');
  ok(P.steamPadKind() === 'playstation', 'on Steam, a PlayStation pad seen through Steam Input shows PlayStation buttons');
  G.bomDesktop.steam.padType = () => 'SwitchProController'; ok(P.steamPadKind() === 'nintendo', 'a Switch Pro pad through Steam Input shows Switch buttons');
  G.bomDesktop.steam.padType = () => null; ok(P.steamPadKind() === 'deck', 'a Steam Deck with no other pad shows Deck buttons');
  G.bomDesktop.steam.padType = () => 'XBoxOneController'; ok(P.steamPadKind() === 'xbox', 'an Xbox pad through Steam Input shows Xbox buttons');
  G.bomDesktop = keep;
}

// ------------------------------------------------------------ third-party notices cover everything shipped
{
  const notices = fs.readFileSync('THIRD_PARTY_NOTICES.txt', 'utf8');
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const shipped = Object.entries(lock.packages as Record<string, any>).filter(([k, v]) => k.startsWith('node_modules/') && !v.dev && !v.devOptional && !k.includes('@types/') && !k.endsWith('undici-types'));
  for (const [k, v] of shipped) ok(notices.includes(`${k.replace(/^.*node_modules\//, '')} ${v.version}`), `THIRD_PARTY_NOTICES.txt lists ${k} ${v.version} (run node scripts/notices.mjs)`);
  for (const f of ['Cinzel', 'Pirata One', 'Barlow Condensed']) ok(notices.includes(`${f} (typeface)`) && notices.includes('SIL OPEN FONT LICENSE'), `THIRD_PARTY_NOTICES.txt carries the ${f} licence`);
}

// ------------------------------------------------------------ store copies never point players at GitHub for updates
{
  const { watchForUpdates, distribution } = await import('../src/core/update');
  const G = globalThis as any;
  const keep = { window: G.window, location: G.location, fetch: G.fetch, bomDesktop: G.bomDesktop };
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { webdriver: false }, configurable: true, writable: true });
  G.window = G; G.location = { search: '' };
  const fetches = (desk: unknown): number => {
    let n = 0;
    G.fetch = () => { n++; return Promise.resolve({ ok: false }); };
    G.bomDesktop = desk;
    watchForUpdates();
    return n;
  };
  for (const store of ['steam', 'itch']) {
    ok(fetches({ distribution: () => store, autoUpdates: () => false, onUpdate: () => {} }) === 0, `${store} desktop copy skips the GitHub update check`);
    ok(distribution() === store, `${store} desktop copy reports its store`);
  }
  ok(fetches({ autoUpdates: () => false }) === 1, 'GitHub portable copy (an older shell with no store channel) still checks GitHub');
  ok(fetches({ distribution: () => 'github', autoUpdates: () => false }) === 1, 'GitHub portable copy checks GitHub');
  let listened = 0;
  ok(fetches({ distribution: () => 'github', autoUpdates: () => true, onUpdate: () => { listened++; } }) === 0 && listened === 1, 'installed GitHub copy uses its own updater');
  ok(fetches(undefined) === 1 && distribution() === 'github', 'browser build checks GitHub');
  ok(fetches({ distribution: () => { throw new Error('old shell'); }, autoUpdates: () => false }) === 1, 'a shell that cannot say its store counts as GitHub');
  G.window = keep.window; G.location = keep.location; G.fetch = keep.fetch; G.bomDesktop = keep.bomDesktop;
  if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete G.navigator;
}
console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
