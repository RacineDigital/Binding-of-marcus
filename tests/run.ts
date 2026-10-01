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
import { generateLayout } from '../src/generation/roomgen';
import { RNG } from '../src/core/rng';
import { PixelArt } from '../src/render/pixel';
import { CHARACTERS } from '../src/player/characters';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { MAP_SIZE } from '../src/core/constants';
import { Side, Ob } from '../src/rooms/room';

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
for (const t of TEMPLATES) { ok(t.rows.length === 9 && t.rows.every((r) => r.length === 15), `template ${t.name} is 15x9`); }
{
  const rng = new RNG('layouts');
  const valid = new Set('.#@bo^~fpkuIwMFSWHTA');
  for (let i = 0; i < 2000; i++) {
    const L = generateLayout(rng, FLOORS[i % FLOORS.length], i % 8);
    ok(L.length === 9 && L.every((r) => r.length === 15 && [...r].every((ch) => valid.has(ch))), `generated layout ${i} is a valid 15x9 grid`);
    ok(L.join('').replace(/[^MFSWHTA]/g, '').length >= 2, `generated layout ${i} has enemy slots`);
  }
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
  ok(ALL_ITEMS.filter((i) => i.tags?.includes('vamp')).every((i) => homePool(i) === 'secret'), 'King Vamp lives in secret rooms');
}
{
  const { GAME_VERSION } = await import('../src/core/constants');
  const fs = await import('fs');
  ok(JSON.parse(fs.readFileSync('package.json', 'utf8')).version === GAME_VERSION, 'GAME_VERSION matches package.json');
}
console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
