// Seeded item pools. Items are removed once rolled so a run never repeats an item by accident.
import { RNG } from '../core/rng';
import type { PoolId, ItemDef } from './types';
import { ALL_ITEMS, FALLBACK_ITEM, getItem } from './registry';
import { itemRole } from './choice';

/** How often an item of each quality comes up, relative to quality 2. */
export const QUALITY_WEIGHT = [2, 1.6, 1, 0.55, 0.3];

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
  /**
   * Roll an item from a pool. Quality sets how common an item is, as in the games this one grew up on:
   * the weak and odd ones turn up all the time, the great ones rarely. qualityBias raises the odds of
   * quality 3 and 4 (deals, boss rewards, upgraded shops).
   */
  roll(pool: PoolId, rng: RNG = this.rng, filter?: (i: ItemDef) => boolean, qualityBias = 0): string {
    const cands = ALL_ITEMS.filter((i) => (i.pools[pool] ?? 0) > 0 && !this.taken.has(i.id) && (!i.unlock || this.unlocked(i.unlock)) && (!filter || filter(i)));
    const pick = rng.weighted(cands, (i) => (i.pools[pool] ?? 0) * QUALITY_WEIGHT[i.quality] * (i.quality >= 3 ? 1 + qualityBias : 1));
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
