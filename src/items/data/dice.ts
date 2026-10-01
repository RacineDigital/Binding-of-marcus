// The dice: one for every die in The Binding of Isaac (and a D9, which Isaac never had: it rerolls
// your charms). The D6 ('old_dice') lives in actives.ts.
import type { ItemDef } from '../types';
import type { World } from '../../game/world';
import { ramp, hex, P } from './kit';
import { spawnDrop, rollDropKind } from '../../game/drops';
import { RNG } from '../../core/rng';
import { ALL_ITEMS, getItem } from '../registry';
import { CHARMS } from './consumables';
import { Ob } from '../../rooms/room';
import { reroll, poolForRoom } from './actives';
import { priceFor } from '../../generation/populate';
import { grantItem, removeItem, spawnEnemy } from '../../game/roomflow';

const rng = () => new RNG(Math.random() * 1e9);

/** A die icon: a rounded cube with the number of sides printed on it. */
function dieIcon(label: string, body: string, ink = '#1a1010'): (p: P) => void {
  return (p) => {
    const c = ramp(body);
    p.rect(3, 4, 12, 12, c[2]); p.rect(3, 4, 12, 2, c[4]); p.rect(14, 5, 1, 11, c[0]); p.rect(3, 15, 12, 1, c[1]);
    // a tiny pixel font for the label
    const G: Record<string, string[]> = {
      D: ['110', '101', '101', '101', '110'], '1': ['010', '110', '010', '010', '111'], '4': ['101', '101', '111', '001', '001'],
      '6': ['011', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'],
      '9': ['111', '101', '111', '001', '110'], '0': ['111', '101', '101', '101', '111'], '2': ['110', '001', '010', '100', '111'],
      E: ['111', '100', '110', '100', '111'], S: ['011', '100', '010', '001', '110'], '∞': ['000', '101', '010', '101', '000'],
    };
    const chars = [...label], w = chars.length * 4 - 1;
    let x = Math.round(9 - w / 2);
    for (const ch of chars) { const g = G[ch]; if (g) g.forEach((row, y) => [...row].forEach((b, k) => { if (b === '1') p.set(x + k, 8 + y, ink); })); x += 4; }
  };
}
const fxPoof = (w: World, x: number, y: number) => { w.audio.play('reroll', { vol: 0.5 }); w.fx.smoke(x, y - 16, 6, 'rgba(200,190,230,', 5, 0.6); w.fx.stars(x, y - 20, 6, '#ffffff'); };

/** Every passive you carry turns into a random other item (health they gave stays). */
function d4(w: World): boolean {
  const pl = w.player;
  const ids = pl.itemOrder.filter((id) => (pl.items.get(id) ?? 0) > 0 && getItem(id)?.kind !== 'active' && id !== 'moth_wings_rev');
  if (!ids.length) return false;
  for (const id of ids) {
    const n = pl.items.get(id) ?? 0;
    for (let k = 0; k < n; k++) { removeItem(w, id); grantItem(w, w.run.pools.roll('treasure', undefined, (i) => i.kind !== 'active'), true); }
  }
  w.whiteFlash = 0.4; w.hud.toast('Everything you carry is something else now.');
  return true;
}
/** Pickups in the room become other pickups. */
function d20(w: World): boolean {
  const r = rng(); let n = 0;
  // only what was already on the floor: the new pickups join the list as we go
  for (const p of [...w.pickups]) {
    if (p.pedestal || p.dead || p.collectT >= 0 || p.price > 0 || p.isChest()) continue;
    p.dead = true; fxPoof(w, p.x, p.y);
    spawnDrop(w, rollDropKind(r, w.player.stats.luck, 'chest') ?? 'button', p.x, p.y);
    n++;
  }
  return n > 0;
}
/** Item pedestals become the item listed just before them. */
function spindown(w: World): boolean {
  let n = 0;
  for (const p of w.pickups) {
    if (!p.pedestal || !p.data.id) continue;
    const list = ALL_ITEMS.filter((i) => i.id !== 'moth_wings_rev');
    const k = list.findIndex((i) => i.id === p.data.id);
    p.data.id = list[(k - 1 + list.length) % list.length].id;
    if (p.price > 0) p.price = priceFor(p.data.id);
    fxPoof(w, p.x, p.y); n++;
  }
  return n > 0;
}
/** Damage, fire rate, range and speed are rerolled (for good). */
function d8(w: World): boolean {
  const pl = w.player, r = rng();
  const f = () => Math.round((0.6 + r.next() * 1.0) * 100) / 100;
  pl.clearTemp((t) => t.id === 'd8');
  pl.addTemp({ id: 'd8', stats: { damageMult: f(), tearsMult: f(), range: Math.round((r.next() - 0.4) * 80), speed: Math.round((r.next() - 0.4) * 5) / 10 } });
  w.whiteFlash = 0.3; w.hud.toast('Your stats were rerolled.');
  return true;
}
/** The room's enemies become other enemies from this chapter. */
function d10(w: World): boolean {
  const pool = Object.keys(w.theme.enemies);
  const r = rng(); let n = 0;
  for (const e of [...w.enemies]) {
    if (e.dead || e.isBoss || e.friendly) continue;
    const id = r.pick(pool.filter((x) => x !== e.def.id)) ?? pool[0];
    const x = e.x, y = e.y; e.dead = true; w.enemies = w.enemies.filter((q) => q !== e);
    fxPoof(w, x, y + 10);
    const k = spawnEnemy(w, id, x, y, true); if (k) k.spawnT = 0.3;
    n++;
  }
  return n > 0;
}
/** Rocks and the like turn into other obstacles: sometimes better, sometimes worse. */
function d12(w: World): boolean {
  const room = w.room, r = rng(); let n = 0;
  const kinds = [Ob.Rock, Ob.Rock, Ob.Marked, Ob.Urn, Ob.Heap, Ob.Keg, Ob.Block, Ob.Fire];
  for (let i = 0; i < room.grid.length; i++) {
    const k = room.grid[i];
    if (![Ob.Rock, Ob.Marked, Ob.Urn, Ob.Heap, Ob.Keg, Ob.Block].includes(k)) continue;
    const nk = r.pick(kinds);
    room.setOb(i % room.cols, (i / room.cols) | 0, nk, nk === Ob.Heap || nk === Ob.Fire ? 12 : nk === Ob.Urn ? 3 : nk === Ob.Keg ? 5 : 0, r.int(0, 3));
    n++;
  }
  w.obstacleDirty = true; w.flow.build(w);
  return n > 0;
}
/** Fight the room again for its reward. */
function d7(w: World): boolean {
  const room = w.room;
  if (!room.cleared || room.type !== 'normal' || !room.spawns.length) return false;
  room.cleared = false; w.lockdown = true; room.flags.refights = (room.flags.refights ?? 0) + 1;
  for (const d of w.doors) d.open = 0;
  for (const s of room.spawns) { const c = room.cellCenter(s.c, s.r); const e = spawnEnemy(w, s.id, c.x, c.y, false); if (e) e.spawnT = 0.6 + Math.random() * 0.2; }
  w.audio.play('doorSlam'); w.hud.roomName('Again!');
  return true;
}
/** One random pickup on the floor is duplicated. */
function d1(w: World): boolean {
  const cands = w.pickups.filter((p) => !p.pedestal && !p.dead && p.collectT < 0 && p.price <= 0 && !p.isChest());
  if (!cands.length) return false;
  const p = cands[Math.floor(Math.random() * cands.length)];
  const q = new (p.constructor as any)(p.kind, p.x + 12, p.y + 6); q.data = { ...p.data };
  w.pickups.push(q); fxPoof(w, q.x, q.y);
  return true;
}
/** Your charms become other charms. */
function d9(w: World): boolean {
  const pl = w.player;
  if (!pl.charms.length) return false;
  const r = rng();
  pl.charms = pl.charms.map((id) => r.pick(CHARMS.filter((c) => c.id !== id)).id);
  pl.recompute(); w.hud.toast('Your charms have changed.');
  return true;
}
/** Eternal D6: rerolls pedestals, but each item has a 1 in 4 chance to vanish instead. */
function eternal(w: World): boolean {
  let n = 0;
  for (const p of w.pickups) {
    if (!p.pedestal || !p.data.id) continue;
    if (Math.random() < 0.25) { p.data.id = null; fxPoof(w, p.x, p.y); n++; continue; }
    p.data.id = w.run.pools.roll(poolForRoom(w.room.type));
    if (p.price > 0) p.price = priceFor(p.data.id);
    fxPoof(w, p.x, p.y); n++;
  }
  return n > 0;
}
const FACES: [string, (w: World) => boolean][] = [
  ['D1', d1], ['D4', d4], ['D6', reroll], ['D7', d7], ['D8', d8], ['D9', d9], ['D10', d10], ['D12', d12], ['D20', d20],
];
/** The face D Infinity is showing right now. */
export function diceFace(w: World): string { return FACES[(w.run.flags.dinf ?? 2) % FACES.length][0]; }
/** D Infinity: rolls whichever face it shows, then lands on a new face for next time. */
function dInfinity(w: World): boolean {
  const f = w.run.flags;
  const i = (f.dinf ?? 2) % FACES.length;
  const ok = FACES[i][1](w);
  if (!ok) return false;
  let j = Math.floor(Math.random() * FACES.length); if (j === i) j = (j + 1) % FACES.length;
  f.dinf = j;
  w.hud.toast(`D Infinity rolled ${FACES[i][0]}. It now shows ${FACES[j][0]}.`, 2.2);
  return true;
}

const DIE = (id: string, name: string, label: string, body: string, charge: number, q: 0 | 1 | 2 | 3 | 4, pickup: string, effect: string[], use: (w: World) => boolean, pools: ItemDef['pools']): ItemDef => ({
  id, name, kind: 'active', quality: q, pools, tags: ['dice'], pickup, effect, active: { charge, type: 'room', use }, icon: dieIcon(label, body),
});

export const DICE: ItemDef[] = [
  DIE('d1', 'D1', 'D1', '#e8dcc0', 4, 1, 'Double one', ['Duplicates a random pickup lying in the room.'], d1, { treasure: 0.5, shop: 0.5 }),
  DIE('d4', 'D4', 'D4', '#c8d8f0', 6, 3, 'Reroll yourself', ['Every passive item you carry turns into a random other item.'], d4, { treasure: 0.35, secret: 0.6 }),
  DIE('d7', 'D7', 'D7', '#f0c8c8', 3, 2, 'Again!', ['In a room you already cleared, brings its enemies back so you can clear it again for another reward.'], d7, { treasure: 0.5 }),
  DIE('d8', 'D8', 'D8', '#e0c8f0', 4, 2, 'Reroll your stats', ['Rerolls your damage and fire rate multipliers (x0.6 to x1.6), plus your range and speed. For good.'], d8, { treasure: 0.5, secret: 0.5 }),
  DIE('d9', 'D9', 'D9', '#c8f0d8', 2, 1, 'Reroll your charms', ['Each charm you carry becomes a different charm.', 'There is no D9 in Isaac. There is now.'], d9, { treasure: 0.4, shop: 0.6 }),
  DIE('d10', 'D10', 'D10', '#f0e0b0', 2, 1, 'Reroll the monsters', ['Every enemy in the room becomes a different enemy from this chapter.'], d10, { treasure: 0.5 }),
  DIE('d12', 'D12', 'D12', '#d0c0a8', 2, 1, 'Reroll the furniture', ['Rocks, urns, heaps, kegs and blocks in the room turn into other obstacles.'], d12, { treasure: 0.4, shop: 0.4 }),
  DIE('d20', 'D20', 'D20', '#b8e0e8', 4, 2, 'Reroll the floor', ['Every pickup lying in the room (not items or shop stock) turns into a different pickup.'], d20, { treasure: 0.5, shop: 0.5 }),
  DIE('d100', 'D100', '100', '#f0d070', 6, 4, 'Reroll everything', ['Rerolls your items, every item pedestal and every pickup in the room, all at once.'],
    (w) => { const a = d4(w), b = reroll(w), c = d20(w); return a || b || c; }, { secret: 0.4, deal: 0.3 }),
  DIE('eternal_d6', 'Eternal D6', 'ED6', '#f4f4f8', 2, 2, 'Reroll your fate?', ['Rerolls every item pedestal in the room, but each item has a 1 in 4 chance to vanish instead.'], eternal, { treasure: 0.5, blessing: 0.6 }),
  DIE('spindown', 'Spindown Dice', 'S', '#5a5a6a', 6, 3, 'Count down', ['Every item pedestal in the room becomes the item listed just before it in the collection.'], spindown, { secret: 0.6, shop: 0.3 }),
  DIE('d_infinity', 'D Infinity', 'D∞', '#2a2a3a', 4, 3, 'Every die at once', ['Rolls the face it shows (D1, D4, D6, D7, D8, D9, D10, D12 or D20), then lands on a new face for next time.'], dInfinity, { secret: 0.5, deal: 0.4 }),
];
void hex;
