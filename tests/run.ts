// Node test suite: seeded generation determinism and content data validation.
import { Run } from '../src/game/run';
import { generateFloor } from '../src/generation/floorgen';
import { ALL_ITEMS, CONSUMABLES } from '../src/items/registry';
import { ENEMY_DEFS, getEnemy } from '../src/enemies/registry';
import { BOSSES } from '../src/bosses/registry';
import { FLOORS, ALT_FLOORS } from '../src/data/floors';
import { TEMPLATES } from '../src/rooms/templates';
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
for (const f of [...FLOORS, ...Object.values(ALT_FLOORS)]) {
  for (const id of Object.keys(f.enemies)) ok(!!getEnemy(id), `floor ${f.id} enemy ${id} exists`);
  for (const id of f.bosses) ok(!!getEnemy(id), `floor ${f.id} boss ${id} exists`);
}
for (const t of TEMPLATES) { ok(t.rows.length === 9 && t.rows.every((r) => r.length === 15), `template ${t.name} is 15x9`); }
for (const c of CHARACTERS) for (const id of c.items) ok(ids.has(id), `character ${c.id} start item ${id} exists`);
const counts = {
  items: ALL_ITEMS.length, passives: ALL_ITEMS.filter((i) => i.kind === 'passive').length, actives: ALL_ITEMS.filter((i) => i.kind === 'active').length,
  familiars: ALL_ITEMS.filter((i) => i.kind === 'familiar').length, consumables: CONSUMABLES.length, enemies: ENEMY_DEFS.length,
  bosses: BOSSES.filter((b) => !['snipA', 'snipB', 'ratprince', 'blottedhalf'].includes(b.id)).length, floors: FLOORS.length, characters: CHARACTERS.length,
};
console.log('content:', JSON.stringify(counts));
console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
