// Seeded item pools. Items are removed once rolled so a run never repeats an item by accident.
import { RNG } from '../core/rng';
import type { PoolId, ItemDef } from './types';
import { ALL_ITEMS, FALLBACK_ITEM, getItem } from './registry';
import { itemRole } from './choice';

export class ItemPools {
  private rng: RNG;
  private taken = new Set<string>();
  private unlocked: (id: string) => boolean;
  constructor(rng: RNG, unlocked: (id: string) => boolean) { this.rng = rng; this.unlocked = unlocked; }
  markTaken(id: string): void { this.taken.add(id); }
  isTaken(id: string): boolean { return this.taken.has(id); }
  /** Prefer an offensive passive and a different role, falling back within the same pool. */
  choice(rng: RNG): [string, string] {
    const available = () => ALL_ITEMS.filter((i) => (i.pools.treasure ?? 0) > 0 && !this.taken.has(i.id) && (!i.unlock || this.unlocked(i.unlock)));
    const offense = available().some((i) => itemRole(i) === 'offense');
    const first = this.roll('treasure', rng, offense ? (i) => itemRole(i) === 'offense' : undefined);
    const role = getItem(first) ? itemRole(getItem(first)!) : null;
    const other = available().some((i) => itemRole(i) !== role);
    const second = this.roll('treasure', rng, other ? (i) => itemRole(i) !== role : undefined);
    return [first, second];
  }
  /** Roll an item from a pool. qualityBias raises the odds of higher quality items. */
  roll(pool: PoolId, rng: RNG = this.rng, filter?: (i: ItemDef) => boolean, qualityBias = 0): string {
    const cands = ALL_ITEMS.filter((i) => (i.pools[pool] ?? 0) > 0 && !this.taken.has(i.id) && (!i.unlock || this.unlocked(i.unlock)) && (!filter || filter(i)));
    const pick = rng.weighted(cands, (i) => (i.pools[pool] ?? 0) * (i.quality >= 3 ? 1 + qualityBias : 1) * (i.quality === 4 ? 0.6 : 1));
    if (!pick) {
      // pool exhausted: borrow from the treasure pool, then fall back
      if (pool !== 'treasure') return this.roll('treasure', rng, filter, qualityBias);
      return FALLBACK_ITEM;
    }
    this.taken.add(pick.id);
    return pick.id;
  }
  serialize(): string[] { return [...this.taken]; }
  rngState(): number[] { return this.rng.snapshot(); }
  restoreRng(state?: number[]): void { if (state) this.rng.restore(state); }
  restore(ids: string[]): void { this.taken = new Set(ids); }
  exists(id: string): boolean { return !!getItem(id); }
}
