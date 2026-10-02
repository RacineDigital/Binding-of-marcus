// Drop tables and helpers for spawning pickups.
import { RNG } from '../core/rng';
import type { World } from './world';
import { Pickup, popPickup } from './pickups';
import { PAGES, CHARMS } from '../items/data/consumables';
import { luckChance } from '../projectiles/profile';

export type DropTable = 'room' | 'small' | 'urn' | 'chest' | 'crimson' | 'boss';

const TABLES: Record<DropTable, [string, number][]> = {
  room: [['button', 20], ['heart', 16], ['key', 13], ['bomb', 13], ['chest', 7], ['page', 7], ['sweet', 6], ['spark', 3], ['wax', 4], ['ink', 1], ['charm', 2]],
  small: [['button', 40], ['heart', 20], ['key', 13], ['bomb', 13], ['wax', 5], ['ink', 1], ['page', 5], ['sweet', 5]],
  urn: [['button', 42], ['heart', 15], ['key', 14], ['bomb', 14], ['sweet', 8], ['page', 7]],
  chest: [['button', 32], ['key', 13], ['bomb', 13], ['heart', 15], ['page', 10], ['sweet', 9], ['spark', 3], ['ink', 1.5], ['charm', 5]],
  crimson: [['ink', 10], ['page', 20], ['sweet', 15], ['charm', 10], ['button5', 15], ['brass', 6]],
  boss: [['heart', 45], ['wax', 18], ['ink', 4], ['brass', 10], ['button5', 20]],
};

export function rollDropKind(rng: RNG, luck: number, table: DropTable): string | null {
  if (table === 'room' && rng.next() < Math.max(0.04, 0.14 - luck * 0.025)) return null;
  const e = rng.weighted(TABLES[table], (x) => x[1]);
  return e ? e[0] : null;
}

/** Resolve a generic drop name into a concrete pickup kind (+data). */
export function resolveKind(rng: RNG, kind: string, luck = 0): { kind: string; data?: any } {
  switch (kind) {
    case 'button': { const r = rng.next(); return { kind: r < luckChance(0.02, luck) ? 'button10' : r < luckChance(0.1, luck) ? 'button5' : 'button' }; }
    case 'heart': { const r = rng.next(); return { kind: r < 0.02 ? 'gilded' : r < 0.05 ? 'brass' : r < 0.065 ? 'ink' : r < 0.16 ? 'wax' : r < 0.4 ? 'heartHalf' : 'heart' }; }
    case 'key': return { kind: rng.next() < 0.025 ? 'goldKey' : 'key' };
    case 'bomb': { const r = rng.next(); return { kind: r < 0.12 ? 'bomb2' : 'bomb' }; }
    case 'chest': { const r = rng.next(); return { kind: r < 0.04 ? 'chest:crimson' : r < 0.3 ? 'chest:locked' : 'chest:tin' }; }
    case 'spark': return { kind: rng.next() < 0.2 ? 'sparkBig' : 'spark' };
    case 'page': { const opts = PAGES.filter((p) => !p.rarity || rng.next() < p.rarity); return { kind: 'page', data: { id: rng.pick(opts.length ? opts : PAGES).id } }; }
    case 'sweet': return { kind: 'sweet', data: { color: rng.int(0, 11) } };
    case 'charm': return { kind: 'charm', data: { id: rng.pick(CHARMS).id } };
    default: return { kind };
  }
}

export function spawnDrop(w: World, kind: string, x: number, y: number, pop = true, rng?: RNG): Pickup {
  const r = rng ?? new RNG(Math.random() * 1e9);
  const res = resolveKind(r, kind, w.player.stats.luck);
  if (res.kind === 'charm' && res.data) {
    // avoid duplicates of charms already held
    const owned = new Set(w.player.charms);
    const free = CHARMS.filter((c) => !owned.has(c.id) && (!c.unlock || w.game.save.isUnlocked(c.unlock)));
    if (free.length) res.data.id = r.pick(free).id;
  }
  const p = new Pickup(res.kind, x, y);
  if (res.data) p.data = res.data;
  if (pop) popPickup(p);
  w.pickups.push(p);
  return p;
}
